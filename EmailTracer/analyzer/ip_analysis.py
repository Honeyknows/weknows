"""IP extraction, geolocation, relay chain analysis, and infrastructure filtering."""

from __future__ import annotations

import ipaddress
import logging
import re
from typing import Any

import requests

logger = logging.getLogger("emailtracer.ip")

HTTP_TIMEOUT = 10
NA = "Not Available"

# ── Regex ──────────────────────────────────────────────────────────────
IPV4_RE = re.compile(
    r"(?<![\w.])(?:25[0-5]|2[0-4]\d|1?\d?\d)"
    r"(?:\.(?:25[0-5]|2[0-4]\d|1?\d?\d)){3}(?![\w.])"
)

# ── Known mail infrastructure providers ────────────────────────────────
MAIL_INFRASTRUCTURE_TERMS = (
    "google llc", "google", "microsoft corporation", "microsoft",
    "yahoo", "oath inc", "amazon.com", "amazon", "aws",
    "cloudflare", "mailchimp", "rocket science group",
    "sendgrid", "twilio", "mimecast", "proofpoint",
    "barracuda", "sophos", "forcepoint",
)


def _is_public_ipv4(value: str) -> bool:
    """Return True if the string is a valid, routable public IPv4 address."""
    try:
        ip = ipaddress.ip_address(value)
    except ValueError:
        return False
    if ip.version != 4:
        return False
    return not (
        ip.is_private or ip.is_loopback or ip.is_link_local
        or ip.is_multicast or ip.is_reserved or ip.is_unspecified
    )


def extract_public_ips(received_headers: list[str], x_originating_ips: list[str]) -> dict[str, list[str]]:
    """Extract unique public IPs from Received and X-Originating-IP headers."""
    seen: set[str] = set()
    received_ips: list[str] = []
    originating_ips: list[str] = []

    # X-Originating-IP first (these are higher value)
    for header in x_originating_ips or []:
        for candidate in IPV4_RE.findall(header):
            try:
                norm = str(ipaddress.ip_address(candidate))
            except ValueError:
                continue
            if norm not in seen and _is_public_ipv4(norm):
                seen.add(norm)
                originating_ips.append(norm)

    # Received headers
    for header in received_headers or []:
        for candidate in IPV4_RE.findall(header):
            try:
                norm = str(ipaddress.ip_address(candidate))
            except ValueError:
                continue
            if norm not in seen and _is_public_ipv4(norm):
                seen.add(norm)
                received_ips.append(norm)

    return {
        "x_originating": originating_ips,
        "received": received_ips,
        "all": originating_ips + received_ips,
    }


def geolocate_ip(ip: str) -> dict[str, Any]:
    """Geolocate a public IP via ip-api.com. Never fabricates data."""
    try:
        response = requests.get(
            f"http://ip-api.com/json/{ip}",
            params={
                "fields": (
                    "status,message,query,country,regionName,city,"
                    "isp,org,as,lat,lon,timezone,reverse,proxy,hosting"
                )
            },
            timeout=HTTP_TIMEOUT,
        )
        response.raise_for_status()
        data = response.json()

        if data.get("status") != "success":
            return {
                "status": "error",
                "ip": ip,
                "message": data.get("message", "Geolocation lookup failed"),
            }

        return {
            "status": "success",
            "ip": data.get("query", ip),
            "country": data.get("country") or NA,
            "region": data.get("regionName") or NA,
            "city": data.get("city") or NA,
            "isp": data.get("isp") or NA,
            "org": data.get("org") or NA,
            "asn": data.get("as") or NA,
            "lat": data.get("lat"),
            "lon": data.get("lon"),
            "timezone": data.get("timezone") or NA,
            "reverse_dns": data.get("reverse") or NA,
            "is_proxy": bool(data.get("proxy")),
            "is_datacenter": bool(data.get("hosting")),
        }
    except requests.Timeout:
        return {"status": "error", "ip": ip, "message": "Geolocation request timed out"}
    except requests.ConnectionError:
        return {"status": "error", "ip": ip, "message": "Could not connect to geolocation service"}
    except Exception as exc:
        return {"status": "error", "ip": ip, "message": f"Geolocation failed: {exc}"}


def is_mail_infrastructure_ip(geo_data: dict[str, Any]) -> bool:
    """Return True when ip-api identifies a major mail provider or relay."""
    if geo_data.get("status") != "success":
        return False
    org = str(geo_data.get("org", "") or "").lower()
    isp = str(geo_data.get("isp", "") or "").lower()
    return any(term in org or term in isp for term in MAIL_INFRASTRUCTURE_TERMS)


def check_abuseipdb(ip: str, api_key: str) -> dict[str, Any]:
    """Check AbuseIPDB reputation. Skips when no key is supplied."""
    if not api_key:
        return {"status": "skipped", "message": "No AbuseIPDB API key provided"}

    try:
        response = requests.get(
            "https://api.abuseipdb.com/api/v2/check",
            params={"ipAddress": ip, "maxAgeInDays": 90},
            headers={"Key": api_key, "Accept": "application/json"},
            timeout=HTTP_TIMEOUT,
        )
        response.raise_for_status()
        data = response.json().get("data", {})
        return {
            "status": "success",
            "abuse_confidence_score": data.get("abuseConfidenceScore", 0),
            "total_reports": data.get("totalReports", 0),
            "last_reported_at": data.get("lastReportedAt") or NA,
            "is_tor": data.get("isTor", False),
            "usage_type": data.get("usageType") or NA,
            "domain": data.get("domain") or NA,
            "country_code": data.get("countryCode") or NA,
        }
    except requests.HTTPError as exc:
        status = exc.response.status_code if exc.response is not None else "unknown"
        return {"status": "error", "message": f"AbuseIPDB returned HTTP {status}"}
    except Exception as exc:
        return {"status": "error", "message": f"AbuseIPDB lookup failed: {exc}"}


def build_relay_chain(received_headers: list[str]) -> list[dict[str, Any]]:
    """Parse Received headers into a hop-by-hop relay chain.

    Received headers are listed top-to-bottom (newest first), so we
    reverse them to get chronological order.
    """
    hops: list[dict[str, Any]] = []

    for i, header in enumerate(reversed(received_headers or [])):
        hop: dict[str, Any] = {"hop": i + 1}

        # Extract 'from' server
        from_match = re.search(r"from\s+(\S+)", header, re.IGNORECASE)
        if from_match:
            hop["from_server"] = from_match.group(1)

        # Extract 'by' server
        by_match = re.search(r"by\s+(\S+)", header, re.IGNORECASE)
        if by_match:
            hop["by_server"] = by_match.group(1)

        # Extract protocol (with ... SMTP/ESMTP/etc)
        proto_match = re.search(r"with\s+(\S+)", header, re.IGNORECASE)
        if proto_match:
            hop["protocol"] = proto_match.group(1)

        # Extract IP in brackets
        ip_match = re.search(r"\[(\d{1,3}\.\d{1,3}\.\d{1,3}\.\d{1,3})\]", header)
        if ip_match:
            hop["ip"] = ip_match.group(1)

        # Extract timestamp after semicolon
        ts_match = re.search(r";\s*(.+)$", header)
        if ts_match:
            hop["timestamp"] = ts_match.group(1).strip()

        hop["raw"] = header[:300]  # truncate for display
        hops.append(hop)

    return hops


# ── Main IP analysis orchestrator ──────────────────────────────────────

def analyze_ips(
    received_headers: list[str],
    x_originating_ips: list[str],
    abuseipdb_key: str = "",
) -> dict[str, Any]:
    """Run full IP analysis: extraction, geolocation, abuse check, relay chain."""
    ip_sets = extract_public_ips(received_headers, x_originating_ips)
    all_ips = ip_sets["all"]

    ip_details: list[dict[str, Any]] = []
    infrastructure_ips: list[dict[str, Any]] = []

    for ip in all_ips:
        geo = geolocate_ip(ip)
        source = "X-Originating-IP" if ip in ip_sets["x_originating"] else "Received"

        if is_mail_infrastructure_ip(geo):
            infrastructure_ips.append({"ip": ip, "geo": geo, "source": source})
            continue

        entry: dict[str, Any] = {
            "ip": ip,
            "source": source,
            "geo": geo,
            "is_proxy": geo.get("is_proxy", False),
            "is_datacenter": geo.get("is_datacenter", False),
        }

        if abuseipdb_key:
            entry["abuse"] = check_abuseipdb(ip, abuseipdb_key)

        ip_details.append(entry)

    relay_chain = build_relay_chain(received_headers)

    return {
        "total_ips_found": len(all_ips),
        "ip_details": ip_details,
        "infrastructure_ips": infrastructure_ips,
        "relay_chain": relay_chain,
        "relay_hops": len(relay_chain),
    }
