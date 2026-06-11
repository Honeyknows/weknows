"""URL intelligence: extraction, shortener detection, suspicious TLD, punycode, IP-based URLs."""

from __future__ import annotations

import re
from typing import Any
from urllib.parse import urlparse

# ── URL extraction regex ───────────────────────────────────────────────
URL_RE = re.compile(
    r"https?://[A-Za-z0-9\-._~:/?#\[\]@!$&'()*+,;=%]+",
    re.IGNORECASE,
)

# ── Known URL shorteners ──────────────────────────────────────────────
URL_SHORTENERS = {
    "bit.ly", "tinyurl.com", "t.co", "goo.gl", "ow.ly",
    "is.gd", "buff.ly", "j.mp", "lnkd.in", "db.tt",
    "qr.ae", "adf.ly", "cutt.ly", "rb.gy", "shorturl.at",
    "tiny.cc", "bc.vc", "s.id", "v.gd", "clck.ru",
    "rebrand.ly", "bl.ink", "short.io", "t.ly", "surl.li",
    "x.co", "su.pr", "u.to", "shrtco.de",
}

# ── Suspicious TLDs ────────────────────────────────────────────────────
SUSPICIOUS_TLDS = {
    ".tk", ".ml", ".ga", ".cf", ".gq",       # Freenom free domains
    ".buzz", ".top", ".xyz", ".club",          # cheap/abused TLDs
    ".work", ".click", ".link", ".surf",
    ".rest", ".icu", ".cam", ".fit",
    ".monster", ".quest", ".cyou", ".cfd",
    ".sbs", ".autos", ".beauty",
}

# ── IPv4 in URL host detection ─────────────────────────────────────────
IPV4_HOST_RE = re.compile(r"^(\d{1,3}\.){3}\d{1,3}$")


def extract_urls(text: str) -> list[str]:
    """Extract all URLs from the provided text."""
    return list(set(URL_RE.findall(text or "")))


def analyze_url(url: str) -> dict[str, Any]:
    """Analyze a single URL for suspicious indicators."""
    findings: list[dict[str, str]] = []

    try:
        parsed = urlparse(url)
    except Exception:
        return {"url": url, "error": "Failed to parse URL", "findings": []}

    hostname = (parsed.hostname or "").lower()
    scheme = (parsed.scheme or "").lower()

    # Check for URL shortener
    if hostname in URL_SHORTENERS or any(hostname.endswith(f".{s}") for s in URL_SHORTENERS):
        findings.append({
            "type": "URL_SHORTENER",
            "severity": "MEDIUM",
            "message": f"URL uses shortener service: {hostname}",
            "evidence": url,
        })

    # Check for IP-based URL
    if IPV4_HOST_RE.match(hostname):
        findings.append({
            "type": "IP_BASED_URL",
            "severity": "HIGH",
            "message": f"URL uses raw IP address instead of domain: {hostname}",
            "evidence": url,
        })

    # Check for suspicious TLD
    for tld in SUSPICIOUS_TLDS:
        if hostname.endswith(tld):
            findings.append({
                "type": "SUSPICIOUS_TLD",
                "severity": "MEDIUM",
                "message": f"URL uses suspicious TLD: {tld}",
                "evidence": url,
            })
            break

    # Check for punycode domain
    if hostname.startswith("xn--") or ".xn--" in hostname:
        decoded = _decode_punycode(hostname)
        findings.append({
            "type": "PUNYCODE_URL",
            "severity": "HIGH",
            "message": f"URL uses punycode-encoded domain: {hostname} → {decoded}",
            "evidence": url,
        })

    # Check for HTTP (not HTTPS)
    if scheme == "http":
        findings.append({
            "type": "INSECURE_URL",
            "severity": "LOW",
            "message": "URL uses HTTP instead of HTTPS",
            "evidence": url,
        })

    # Check for unusual port
    if parsed.port and parsed.port not in (80, 443, None):
        findings.append({
            "type": "UNUSUAL_PORT",
            "severity": "MEDIUM",
            "message": f"URL uses non-standard port: {parsed.port}",
            "evidence": url,
        })

    # Check for @ in URL (credential phishing)
    if "@" in (parsed.netloc or ""):
        findings.append({
            "type": "CREDENTIAL_IN_URL",
            "severity": "HIGH",
            "message": "URL contains @ symbol — may be attempting to disguise the real destination",
            "evidence": url,
        })

    return {
        "url": url,
        "hostname": hostname,
        "scheme": scheme,
        "findings": findings,
        "suspicious": len(findings) > 0,
    }


def _decode_punycode(hostname: str) -> str:
    """Attempt to decode a punycode hostname to unicode."""
    try:
        return hostname.encode("ascii").decode("idna")
    except (UnicodeError, UnicodeDecodeError):
        try:
            parts = hostname.split(".")
            decoded = []
            for part in parts:
                if part.startswith("xn--"):
                    decoded.append(part.encode("ascii").decode("punycode"))
                else:
                    decoded.append(part)
            return ".".join(decoded)
        except Exception:
            return hostname


def full_url_intelligence(raw_text: str) -> dict[str, Any]:
    """Extract and analyze all URLs from email headers/content."""
    urls = extract_urls(raw_text)

    if not urls:
        return {
            "total_urls": 0,
            "suspicious_urls": 0,
            "url_analyses": [],
            "summary_findings": [],
        }

    analyses: list[dict[str, Any]] = []
    all_findings: list[dict[str, str]] = []
    suspicious_count = 0

    for url in urls[:100]:  # cap to prevent abuse
        result = analyze_url(url)
        analyses.append(result)
        if result.get("suspicious"):
            suspicious_count += 1
            all_findings.extend(result["findings"])

    return {
        "total_urls": len(urls),
        "suspicious_urls": suspicious_count,
        "url_analyses": analyses,
        "summary_findings": all_findings,
    }
