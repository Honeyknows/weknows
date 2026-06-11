"""SPF, DKIM, DMARC, and ARC authentication analysis."""

from __future__ import annotations

import logging
import re
from typing import Any

logger = logging.getLogger("emailtracer.auth")

try:
    import dns.resolver
    import dns.exception
    HAS_DNS = True
except ImportError:
    HAS_DNS = False

COMMON_DKIM_SELECTORS = [
    "default", "google", "mail", "dkim", "k1",
    "selector1", "selector2", "s1", "s2",
]
AUTH_STATUSES = {"pass", "fail", "softfail", "temperror", "permerror", "neutral", "none"}


def _txt_records(name: str) -> tuple[list[str], str]:
    """Query DNS TXT records. Returns (records, error_message)."""
    if not HAS_DNS:
        return [], "dnspython is not installed"
    try:
        answers = dns.resolver.resolve(name, "TXT", lifetime=8)
        records = []
        for rdata in answers:
            records.append(b"".join(rdata.strings).decode("utf-8", errors="replace"))
        return records, ""
    except dns.resolver.NXDOMAIN:
        return [], "Domain does not exist (NXDOMAIN)"
    except dns.resolver.NoAnswer:
        return [], "No TXT records found"
    except dns.resolver.NoNameservers:
        return [], "No nameservers available"
    except dns.exception.Timeout:
        return [], "DNS lookup timed out"
    except Exception as exc:
        return [], f"DNS lookup failed: {exc}"


def _normalize_status(value: str | None) -> str:
    value = (value or "").lower().strip()
    return value if value in AUTH_STATUSES else "unknown"


# ── Parse Authentication-Results ───────────────────────────────────────

def parse_authentication_results(
    authentication_results: list[str] | None = None,
    received_spf: list[str] | None = None,
) -> dict[str, Any]:
    """Extract observed SPF, DKIM, DMARC results from authentication headers."""
    observed: dict[str, list[str]] = {"spf": [], "dkim": [], "dmarc": []}

    for header in authentication_results or []:
        for mechanism in observed:
            for match in re.finditer(
                rf"\b{mechanism}\s*=\s*([a-zA-Z]+)", header, flags=re.IGNORECASE
            ):
                observed[mechanism].append(_normalize_status(match.group(1)))

    for header in received_spf or []:
        match = re.search(
            r"\b(pass|fail|softfail|temperror|permerror|neutral|none)\b",
            header, flags=re.IGNORECASE,
        )
        if match:
            observed["spf"].append(_normalize_status(match.group(1)))

    def choose_status(values: list[str]) -> str:
        if not values:
            return "unknown"
        fail_set = {"fail", "softfail", "permerror"}
        for v in values:
            if v in fail_set:
                return v
        if "pass" in values:
            return "pass"
        return values[0]

    return {
        "spf": choose_status(observed["spf"]),
        "dkim": choose_status(observed["dkim"]),
        "dmarc": choose_status(observed["dmarc"]),
        "raw": observed,
    }


# ── Individual checks ─────────────────────────────────────────────────

def check_spf(domain: str, observed_result: str | None = None) -> dict[str, Any]:
    """Check SPF DNS record and return result with evidence."""
    records, error = _txt_records(domain)
    spf_records = [r for r in records if r.lower().startswith("v=spf1")]
    return {
        "exists": bool(spf_records),
        "record": spf_records[0] if spf_records else "",
        "all_records": spf_records,
        "pass_fail": _normalize_status(observed_result) if observed_result else "unknown",
        "error": "" if spf_records else error,
        "evidence": f"DNS TXT {domain}: {spf_records[0]}" if spf_records else f"DNS TXT {domain}: {error}",
    }


def check_dkim(domain: str, selector: str = "default") -> dict[str, Any]:
    """Check DKIM DNS record for given selector."""
    record_name = f"{selector}._domainkey.{domain}"
    records, error = _txt_records(record_name)
    dkim_records = [
        r for r in records
        if "v=dkim1" in r.lower() or r.lower().startswith("k=") or "p=" in r
    ]
    return {
        "selector": selector,
        "domain": domain,
        "record_name": record_name,
        "exists": bool(dkim_records),
        "record": dkim_records[0] if dkim_records else "",
        "error": "" if dkim_records else error,
        "evidence": f"DNS TXT {record_name}: {dkim_records[0][:100]}" if dkim_records else f"DNS TXT {record_name}: {error}",
    }


def check_dmarc(domain: str, observed_result: str | None = None) -> dict[str, Any]:
    """Check DMARC DNS record."""
    dmarc_name = f"_dmarc.{domain}"
    records, error = _txt_records(dmarc_name)
    dmarc_records = [r for r in records if r.lower().startswith("v=dmarc1")]

    policy = ""
    if dmarc_records:
        match = re.search(r"(?:^|;)\s*p\s*=\s*([^;\s]+)", dmarc_records[0], flags=re.IGNORECASE)
        policy = match.group(1).strip().lower() if match else ""

    return {
        "exists": bool(dmarc_records),
        "policy": policy,
        "record": dmarc_records[0] if dmarc_records else "",
        "pass_fail": _normalize_status(observed_result) if observed_result else "unknown",
        "error": "" if dmarc_records else error,
        "evidence": f"DNS TXT {dmarc_name}: {dmarc_records[0]}" if dmarc_records else f"DNS TXT {dmarc_name}: {error}",
    }


# ── ARC chain analysis ────────────────────────────────────────────────

def parse_arc_chain(
    arc_auth_results: list[str],
    arc_message_sigs: list[str],
    arc_seals: list[str],
) -> dict[str, Any]:
    """Parse ARC (Authenticated Received Chain) headers."""
    if not arc_auth_results and not arc_message_sigs and not arc_seals:
        return {"present": False, "sets": []}

    # Extract ARC set instance numbers and results
    arc_sets: list[dict[str, Any]] = []

    for header in arc_auth_results:
        instance_match = re.search(r"i\s*=\s*(\d+)", header)
        instance = int(instance_match.group(1)) if instance_match else 0

        # Extract auth results from this ARC set
        spf_match = re.search(r"spf\s*=\s*(\w+)", header, re.IGNORECASE)
        dkim_match = re.search(r"dkim\s*=\s*(\w+)", header, re.IGNORECASE)
        dmarc_match = re.search(r"dmarc\s*=\s*(\w+)", header, re.IGNORECASE)

        arc_sets.append({
            "instance": instance,
            "spf": _normalize_status(spf_match.group(1)) if spf_match else "unknown",
            "dkim": _normalize_status(dkim_match.group(1)) if dkim_match else "unknown",
            "dmarc": _normalize_status(dmarc_match.group(1)) if dmarc_match else "unknown",
            "raw": header[:200],
        })

    # Check ARC-Seal validation status
    arc_seal_results: list[dict[str, Any]] = []
    for header in arc_seals:
        cv_match = re.search(r"cv\s*=\s*(\w+)", header, re.IGNORECASE)
        instance_match = re.search(r"i\s*=\s*(\d+)", header)
        arc_seal_results.append({
            "instance": int(instance_match.group(1)) if instance_match else 0,
            "cv": cv_match.group(1).lower() if cv_match else "unknown",
        })

    # Overall ARC status
    overall = "none"
    if arc_seal_results:
        last_seal = max(arc_seal_results, key=lambda s: s["instance"])
        overall = last_seal.get("cv", "unknown")

    return {
        "present": True,
        "sets": sorted(arc_sets, key=lambda s: s["instance"]),
        "seals": sorted(arc_seal_results, key=lambda s: s["instance"]),
        "overall_status": overall,
        "chain_length": len(arc_sets),
    }


# ── Auth verdict helpers ──────────────────────────────────────────────

def _auth_passed(observed_status: str, configured: bool) -> bool:
    if observed_status == "pass":
        return True
    if observed_status in {"fail", "softfail", "permerror"}:
        return False
    return configured


# ── Main auth orchestrator ────────────────────────────────────────────

def full_auth_check(
    domain: str,
    authentication_results: list[str] | None = None,
    received_spf: list[str] | None = None,
    dkim_selectors: list[dict[str, str]] | None = None,
    arc_auth_results: list[str] | None = None,
    arc_message_sigs: list[str] | None = None,
    arc_seals: list[str] | None = None,
) -> dict[str, Any]:
    """Run SPF, DKIM, DMARC, and ARC checks with observed header results."""
    observed = parse_authentication_results(authentication_results, received_spf)

    if not domain:
        return {
            "observed": observed,
            "spf": {"exists": False, "record": "", "pass_fail": "unknown", "error": "No domain found", "evidence": "No domain available for DNS lookup"},
            "dkim": {"exists": False, "record": "", "pass_fail": "unknown", "error": "No domain found", "evidence": "No domain available for DNS lookup", "selectors_checked": []},
            "dmarc": {"exists": False, "record": "", "policy": "", "pass_fail": "unknown", "error": "No domain found", "evidence": "No domain available for DNS lookup"},
            "arc": {"present": False, "sets": []},
            "overall_verdict": "Suspicious",
            "explanation": "No sender domain was available for authentication checks.",
            "passed": {"spf": False, "dkim": False, "dmarc": False},
        }

    # SPF
    spf = check_spf(domain, observed["spf"])

    # DMARC
    dmarc = check_dmarc(domain, observed["dmarc"])

    # DKIM — try selectors from headers first, then common selectors
    selector_pairs: list[tuple[str, str]] = []
    for item in dkim_selectors or []:
        s = item.get("selector")
        d = item.get("domain") or domain
        if s:
            selector_pairs.append((s, d))
    selector_pairs.extend((s, domain) for s in COMMON_DKIM_SELECTORS)

    seen: set[tuple[str, str]] = set()
    dkim_checks: list[dict[str, Any]] = []
    for selector, selector_domain in selector_pairs:
        pair = (selector, selector_domain)
        if pair in seen:
            continue
        seen.add(pair)
        check = check_dkim(selector_domain, selector)
        dkim_checks.append(check)
        if check["exists"]:
            break

    dkim_exists = any(c["exists"] for c in dkim_checks)
    dkim_record = next((c["record"] for c in dkim_checks if c["exists"]), "")
    dkim_evidence = next((c["evidence"] for c in dkim_checks if c["exists"]), "No DKIM record found for any checked selector")
    dkim = {
        "exists": dkim_exists,
        "record": dkim_record,
        "pass_fail": observed["dkim"],
        "selectors_checked": [c["record_name"] for c in dkim_checks],
        "checks": dkim_checks,
        "error": "" if dkim_exists else "No DKIM record found for checked selectors",
        "evidence": dkim_evidence,
    }

    # ARC
    arc = parse_arc_chain(
        arc_auth_results or [],
        arc_message_sigs or [],
        arc_seals or [],
    )

    # Determine pass/fail
    passed = {
        "spf": _auth_passed(observed["spf"], spf["exists"]),
        "dkim": _auth_passed(observed["dkim"], dkim["exists"]),
        "dmarc": _auth_passed(observed["dmarc"], dmarc["exists"] and dmarc.get("policy") not in {"", "none"}),
    }

    # Verdict
    failed_observed = [
        name for name, status in observed.items()
        if name != "raw" and status in {"fail", "softfail", "permerror"}
    ]

    if observed["dmarc"] == "fail" or (not passed["spf"] and not passed["dkim"] and not passed["dmarc"]):
        verdict = "Likely Spoofed"
        explanation = "Authentication failed or no usable SPF, DKIM, or DMARC evidence. This email may be spoofed."
    elif failed_observed or not dmarc["exists"]:
        verdict = "Suspicious"
        explanation = "Some authentication evidence is missing or failed. Review the sender carefully."
    else:
        verdict = "Likely Legitimate"
        explanation = "Authentication records are present and observed results show no failure."

    return {
        "observed": observed,
        "spf": spf,
        "dkim": dkim,
        "dmarc": dmarc,
        "arc": arc,
        "overall_verdict": verdict,
        "explanation": explanation,
        "passed": passed,
    }
