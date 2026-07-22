"""EmailTracer analyzer package — email forensics analysis engine."""

from __future__ import annotations

import logging
from datetime import datetime, timezone
from typing import Any

from .headers import (
    parse_headers, check_mismatch, detect_unicode_spoofing,
    detect_suspicious_xmailer, extract_iocs, extract_domain_from_header,
    extract_message_id_domain,
)
from .ip_analysis import analyze_ips
from .domain import (
    whois_lookup, analyze_domain_age, compare_domains,
    check_lookalike, detect_brand_impersonation, detect_punycode,
)
from .auth import full_auth_check
from .dns_intel import full_dns_intelligence
from .url_intel import full_url_intelligence
from .timeline import build_timeline
from .risk import calculate_risk
from .report import generate_investigation_summary, build_json_report

logger = logging.getLogger("emailtracer")


def _analyze_message_id(parsed: dict[str, Any]) -> dict[str, Any]:
    """Compare Message-ID domain against From domain."""
    msg_id = parsed.get("message_id", "")
    msg_id_domain = extract_message_id_domain(msg_id)
    from_domain = parsed.get("domains", {}).get("from", "")

    if not msg_id_domain:
        return {"domain": "", "mismatch": False, "message": "No Message-ID domain found"}

    if not from_domain:
        return {
            "domain": msg_id_domain,
            "mismatch": False,
            "message": "No From domain to compare against",
        }

    mismatch = msg_id_domain != from_domain
    return {
        "domain": msg_id_domain,
        "from_domain": from_domain,
        "message_id": msg_id,
        "mismatch": mismatch,
        "message": (
            f"Message-ID domain ({msg_id_domain}) does not match From domain ({from_domain})"
            if mismatch
            else f"Message-ID domain matches From domain ({from_domain})"
        ),
        "evidence": f"Message-ID: {msg_id}" if mismatch else "",
    }


def run_full_analysis(
    raw_headers: str,
    expected_domain: str = "",
    abuseipdb_key: str = "",
) -> dict[str, Any]:
    """Orchestrate a complete email forensics analysis.

    Every sub-analysis is wrapped so that a failure in one section never
    prevents the remaining sections from completing.  If a lookup fails
    the result dict for that section will carry an ``error`` key with the
    real reason — data is **never** fabricated.
    """
    timestamp = datetime.now(timezone.utc).isoformat()
    result: dict[str, Any] = {"timestamp": timestamp, "version": "2.0.0"}

    # ── 1. Header parsing ──────────────────────────────────────────────
    try:
        parsed = parse_headers(raw_headers)
    except Exception as exc:
        logger.exception("Header parsing failed")
        return {**result, "error": f"Header parsing failed: {exc}"}

    result["header_analysis"] = parsed

    from_domain = parsed.get("domains", {}).get("from", "")
    auth_results_headers = parsed.get("authentication_results", [])
    arc_auth_headers = parsed.get("arc_authentication_results", [])
    arc_message_sigs = parsed.get("arc_message_signature", [])
    arc_seals = parsed.get("arc_seal", [])
    received_spf_headers = parsed.get("received_spf", [])
    dkim_selectors = parsed.get("dkim_selectors", [])

    # ── 2. Mismatch detection ──────────────────────────────────────────
    try:
        result["mismatch"] = check_mismatch(parsed)
    except Exception as exc:
        logger.exception("Mismatch check failed")
        result["mismatch"] = {"error": str(exc)}

    # ── 3. Message-ID analysis ─────────────────────────────────────────
    try:
        result["message_id_analysis"] = _analyze_message_id(parsed)
    except Exception as exc:
        logger.exception("Message-ID analysis failed")
        result["message_id_analysis"] = {"error": str(exc)}

    # ── 4. Unicode spoofing ────────────────────────────────────────────
    try:
        result["unicode_spoofing"] = detect_unicode_spoofing(
            parsed.get("from", ""),
            parsed.get("reply_to", ""),
        )
    except Exception as exc:
        logger.exception("Unicode spoofing detection failed")
        result["unicode_spoofing"] = {"error": str(exc)}

    # ── 5. Suspicious X-Mailer ─────────────────────────────────────────
    try:
        result["x_mailer"] = detect_suspicious_xmailer(parsed.get("all_headers", {}))
    except Exception as exc:
        logger.exception("X-Mailer check failed")
        result["x_mailer"] = {"error": str(exc)}

    # ── 6. Punycode detection ──────────────────────────────────────────
    try:
        result["punycode_detection"] = detect_punycode(from_domain)
    except Exception as exc:
        logger.exception("Punycode detection failed")
        result["punycode_detection"] = {"error": str(exc)}

    # ── 7. IOC extraction ──────────────────────────────────────────────
    try:
        result["iocs"] = extract_iocs(raw_headers)
    except Exception as exc:
        logger.exception("IOC extraction failed")
        result["iocs"] = {"error": str(exc)}

    # ── 8. URL intelligence ────────────────────────────────────────────
    try:
        result["url_intelligence"] = full_url_intelligence(raw_headers)
    except Exception as exc:
        logger.exception("URL intelligence failed")
        result["url_intelligence"] = {"error": str(exc)}

    # ── 9. IP analysis ─────────────────────────────────────────────────
    try:
        result["ip_analysis"] = analyze_ips(
            parsed.get("received", []),
            parsed.get("x_originating_ip", []),
            abuseipdb_key=abuseipdb_key,
        )
    except Exception as exc:
        logger.exception("IP analysis failed")
        result["ip_analysis"] = {"error": str(exc)}

    # ── 10. Domain intelligence ────────────────────────────────────────
    try:
        whois_data = whois_lookup(from_domain)
        domain_age = analyze_domain_age(whois_data)
        domain_compare = compare_domains(
            parsed.get("from", ""), parsed.get("return_path", "")
        )
        result["domain_intelligence"] = {
            "domain": from_domain,
            "whois": whois_data,
            "age_analysis": domain_age,
            "domain_comparison": domain_compare,
        }
    except Exception as exc:
        logger.exception("Domain intelligence failed")
        result["domain_intelligence"] = {"error": str(exc)}

    # ── 11. Lookalike domain ───────────────────────────────────────────
    try:
        result["lookalike_check"] = check_lookalike(from_domain, expected_domain)
    except Exception as exc:
        logger.exception("Lookalike check failed")
        result["lookalike_check"] = {"error": str(exc)}

    # ── 12. Brand impersonation ────────────────────────────────────────
    try:
        result["brand_impersonation"] = detect_brand_impersonation(
            from_domain, parsed.get("from", "")
        )
    except Exception as exc:
        logger.exception("Brand impersonation check failed")
        result["brand_impersonation"] = {"error": str(exc)}

    # ── 13. Authentication ─────────────────────────────────────────────
    try:
        result["authentication"] = full_auth_check(
            from_domain,
            auth_results_headers + arc_auth_headers,
            received_spf_headers,
            dkim_selectors,
            arc_auth_results=arc_auth_headers,
            arc_message_sigs=arc_message_sigs,
            arc_seals=arc_seals,
        )
    except Exception as exc:
        logger.exception("Authentication check failed")
        result["authentication"] = {"error": str(exc)}

    # ── 14. DNS intelligence ───────────────────────────────────────────
    try:
        result["dns_intelligence"] = full_dns_intelligence(from_domain)
    except Exception as exc:
        logger.exception("DNS intelligence failed")
        result["dns_intelligence"] = {"error": str(exc)}

    # ── 15. Investigation timeline ─────────────────────────────────────
    try:
        result["timeline"] = build_timeline(
            parsed.get("date", ""),
            parsed.get("received", []),
            parsed.get("subject", ""),
        )
    except Exception as exc:
        logger.exception("Timeline construction failed")
        result["timeline"] = {"error": str(exc)}

    # ── 16. Risk assessment ────────────────────────────────────────────
    try:
        result["risk_assessment"] = calculate_risk(result)
    except Exception as exc:
        logger.exception("Risk scoring failed")
        result["risk_assessment"] = {
            "error": str(exc), "level": "UNKNOWN", "score": 0, "flags": [],
        }

    # ── 17. Investigation summary ──────────────────────────────────────
    try:
        result["investigation_summary"] = generate_investigation_summary(result)
    except Exception as exc:
        logger.exception("Summary generation failed")
        result["investigation_summary"] = f"Summary generation failed: {exc}"

    return result
