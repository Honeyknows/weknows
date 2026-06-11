"""DNS intelligence: MX, TXT, NS, SPF, DMARC record lookups."""

from __future__ import annotations

import logging
from typing import Any

logger = logging.getLogger("emailtracer.dns")

try:
    import dns.resolver
    import dns.exception
    HAS_DNS = True
except ImportError:
    HAS_DNS = False


DNS_TIMEOUT = 8


def _query(name: str, rdtype: str) -> tuple[list[str], str]:
    """Run a DNS query and return (records, error)."""
    if not HAS_DNS:
        return [], "dnspython is not installed"
    try:
        answers = dns.resolver.resolve(name, rdtype, lifetime=DNS_TIMEOUT)
        records: list[str] = []
        for rdata in answers:
            if rdtype == "TXT":
                records.append(b"".join(rdata.strings).decode("utf-8", errors="replace"))
            elif rdtype == "MX":
                records.append(f"{rdata.preference} {rdata.exchange}")
            elif rdtype == "NS":
                records.append(str(rdata.target).rstrip("."))
            else:
                records.append(str(rdata))
        return records, ""
    except dns.resolver.NXDOMAIN:
        return [], "Domain does not exist (NXDOMAIN)"
    except dns.resolver.NoAnswer:
        return [], f"No {rdtype} records found"
    except dns.resolver.NoNameservers:
        return [], "No nameservers available for this domain"
    except dns.exception.Timeout:
        return [], f"DNS {rdtype} lookup timed out"
    except Exception as exc:
        return [], f"DNS {rdtype} lookup failed: {exc}"


def lookup_mx(domain: str) -> dict[str, Any]:
    """Look up MX records for a domain."""
    if not domain:
        return {"records": [], "error": "No domain provided"}
    records, error = _query(domain, "MX")
    return {
        "records": records,
        "count": len(records),
        "error": error if not records else "",
    }


def lookup_txt(domain: str) -> dict[str, Any]:
    """Look up all TXT records for a domain."""
    if not domain:
        return {"records": [], "error": "No domain provided"}
    records, error = _query(domain, "TXT")
    return {
        "records": records,
        "count": len(records),
        "error": error if not records else "",
    }


def lookup_ns(domain: str) -> dict[str, Any]:
    """Look up NS records for a domain."""
    if not domain:
        return {"records": [], "error": "No domain provided"}
    records, error = _query(domain, "NS")
    return {
        "records": records,
        "count": len(records),
        "error": error if not records else "",
    }


def lookup_spf(domain: str) -> dict[str, Any]:
    """Extract SPF record from TXT records."""
    if not domain:
        return {"exists": False, "record": "", "error": "No domain provided"}
    records, error = _query(domain, "TXT")
    spf_records = [r for r in records if r.lower().startswith("v=spf1")]
    return {
        "exists": bool(spf_records),
        "record": spf_records[0] if spf_records else "",
        "all_spf": spf_records,
        "error": error if not spf_records and error else "",
    }


def lookup_dmarc(domain: str) -> dict[str, Any]:
    """Look up DMARC record at _dmarc.domain."""
    if not domain:
        return {"exists": False, "record": "", "policy": "", "error": "No domain provided"}
    records, error = _query(f"_dmarc.{domain}", "TXT")
    dmarc_records = [r for r in records if r.lower().startswith("v=dmarc1")]

    policy = ""
    if dmarc_records:
        import re
        match = re.search(r"(?:^|;)\s*p\s*=\s*([^;\s]+)", dmarc_records[0], re.IGNORECASE)
        policy = match.group(1).strip().lower() if match else ""

    return {
        "exists": bool(dmarc_records),
        "record": dmarc_records[0] if dmarc_records else "",
        "policy": policy,
        "error": error if not dmarc_records and error else "",
    }


def lookup_dkim(domain: str, selector: str = "default") -> dict[str, Any]:
    """Look up DKIM record at selector._domainkey.domain."""
    name = f"{selector}._domainkey.{domain}"
    if not domain:
        return {"exists": False, "record": "", "selector": selector, "error": "No domain provided"}
    records, error = _query(name, "TXT")
    dkim_records = [
        r for r in records
        if "v=dkim1" in r.lower() or r.lower().startswith("k=") or "p=" in r
    ]
    return {
        "exists": bool(dkim_records),
        "record": dkim_records[0] if dkim_records else "",
        "record_name": name,
        "selector": selector,
        "error": error if not dkim_records and error else "",
    }


def full_dns_intelligence(domain: str) -> dict[str, Any]:
    """Run all DNS lookups for a domain and return consolidated results."""
    if not domain:
        return {"error": "No domain provided for DNS intelligence"}

    mx = lookup_mx(domain)
    txt = lookup_txt(domain)
    ns = lookup_ns(domain)
    spf = lookup_spf(domain)
    dmarc = lookup_dmarc(domain)

    return {
        "domain": domain,
        "mx": mx,
        "txt": txt,
        "ns": ns,
        "spf": spf,
        "dmarc": dmarc,
    }
