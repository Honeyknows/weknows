"""Explainable risk scoring engine with evidence-based indicators.

Risk levels:
    0–10   = INFORMATIONAL
    11–24  = LOW
    25–49  = MEDIUM
    50–74  = HIGH
    75–100 = CRITICAL
"""

from __future__ import annotations

from typing import Any


def _level_from_score(score: int) -> str:
    if score >= 75:
        return "CRITICAL"
    if score >= 50:
        return "HIGH"
    if score >= 25:
        return "MEDIUM"
    if score >= 11:
        return "LOW"
    return "INFORMATIONAL"


def _flag(
    indicator: str,
    severity: str,
    score: int,
    message: str,
    evidence: str,
) -> dict[str, Any]:
    """Create a standardized risk flag with full evidence."""
    return {
        "indicator": indicator,
        "severity": severity,
        "score": score,
        "message": message,
        "evidence": evidence,
    }


def calculate_risk(analysis: dict[str, Any]) -> dict[str, Any]:
    """Calculate risk score from all analysis sections.

    Every indicator includes: code, severity, score contribution,
    human-readable explanation, and supporting evidence.
    """
    flags: list[dict[str, Any]] = []
    total_score = 0

    # ── Authentication flags ───────────────────────────────────────────
    auth = analysis.get("authentication", {})
    if not isinstance(auth, dict) or "error" in auth:
        flags.append(_flag(
            "AUTH_UNAVAILABLE", "MEDIUM", 15,
            "Authentication analysis could not be completed",
            str(auth.get("error", "Unknown error")),
        ))
        total_score += 15
    else:
        observed = auth.get("observed", {})

        # SPF
        spf_status = observed.get("spf", "unknown")
        spf_data = auth.get("spf", {})
        if spf_status == "fail":
            flags.append(_flag(
                "SPF_FAIL", "HIGH", 25,
                "SPF authentication failed — sender IP is not authorized",
                spf_data.get("evidence", f"SPF observed: {spf_status}"),
            ))
            total_score += 25
        elif spf_status == "softfail":
            flags.append(_flag(
                "SPF_SOFTFAIL", "MEDIUM", 15,
                "SPF soft fail — sender IP is not explicitly authorized",
                spf_data.get("evidence", f"SPF observed: {spf_status}"),
            ))
            total_score += 15
        elif spf_status in ("none", "unknown") and not spf_data.get("exists"):
            flags.append(_flag(
                "SPF_MISSING", "LOW", 5,
                "No SPF record found for sender domain",
                spf_data.get("evidence", "No SPF DNS record"),
            ))
            total_score += 5

        # DKIM
        dkim_status = observed.get("dkim", "unknown")
        dkim_data = auth.get("dkim", {})
        if dkim_status == "fail":
            flags.append(_flag(
                "DKIM_FAIL", "HIGH", 25,
                "DKIM signature verification failed",
                dkim_data.get("evidence", f"DKIM observed: {dkim_status}"),
            ))
            total_score += 25
        elif dkim_status in ("none", "unknown") and not dkim_data.get("exists"):
            flags.append(_flag(
                "DKIM_MISSING", "MEDIUM", 10,
                "No DKIM signature or DNS record found",
                dkim_data.get("evidence", "No DKIM DNS record found"),
            ))
            total_score += 10

        # DMARC
        dmarc_status = observed.get("dmarc", "unknown")
        dmarc_data = auth.get("dmarc", {})
        if dmarc_status == "fail":
            flags.append(_flag(
                "DMARC_FAIL", "HIGH", 25,
                "DMARC policy check failed",
                dmarc_data.get("evidence", f"DMARC observed: {dmarc_status}"),
            ))
            total_score += 25
        elif not dmarc_data.get("exists"):
            flags.append(_flag(
                "DMARC_MISSING", "LOW", 5,
                "No DMARC record found for sender domain",
                dmarc_data.get("evidence", "No DMARC DNS record"),
            ))
            total_score += 5

    # ── Mismatch flags ─────────────────────────────────────────────────
    mismatch = analysis.get("mismatch", {})
    if isinstance(mismatch, dict) and mismatch.get("has_mismatch"):
        for issue in mismatch.get("issues", []):
            if issue.get("type") == "REPLY_TO_MISMATCH":
                flags.append(_flag(
                    "REPLY_TO_MISMATCH", "HIGH", 20,
                    issue.get("message", "Reply-To domain does not match From domain"),
                    issue.get("evidence", ""),
                ))
                total_score += 20
            elif issue.get("type") == "RETURN_PATH_MISMATCH":
                flags.append(_flag(
                    "RETURN_PATH_MISMATCH", "MEDIUM", 10,
                    issue.get("message", "Return-Path domain does not match From domain"),
                    issue.get("evidence", ""),
                ))
                total_score += 10

    # ── Message-ID flags ───────────────────────────────────────────────
    msgid = analysis.get("message_id_analysis", {})
    if isinstance(msgid, dict) and msgid.get("mismatch"):
        flags.append(_flag(
            "MESSAGE_ID_MISMATCH", "MEDIUM", 10,
            msgid.get("message", "Message-ID domain does not match From domain"),
            msgid.get("evidence", ""),
        ))
        total_score += 10

    # ── Unicode spoofing ───────────────────────────────────────────────
    unicode = analysis.get("unicode_spoofing", {})
    if isinstance(unicode, dict) and unicode.get("detected"):
        count = unicode.get("count", 0)
        chars = ", ".join(
            f"{f['character']} ({f['codepoint']})"
            for f in unicode.get("findings", [])[:5]
        )
        flags.append(_flag(
            "UNICODE_SPOOFING", "HIGH", 30,
            f"Found {count} non-ASCII character(s) in sender headers — possible homograph attack",
            f"Characters: {chars}",
        ))
        total_score += 30

    # ── Suspicious X-Mailer ────────────────────────────────────────────
    xmailer = analysis.get("x_mailer", {})
    if isinstance(xmailer, dict) and xmailer.get("suspicious"):
        flags.append(_flag(
            "SUSPICIOUS_XMAILER", "MEDIUM", 15,
            f"Suspicious mail client detected: {xmailer.get('value', 'unknown')}",
            xmailer.get("evidence", f"X-Mailer: {xmailer.get('value', '')}"),
        ))
        total_score += 15

    # ── Domain age flags ───────────────────────────────────────────────
    domain_intel = analysis.get("domain_intelligence", {})
    if isinstance(domain_intel, dict):
        age_analysis = domain_intel.get("age_analysis", {})
        for flag_item in age_analysis.get("flags", []):
            severity = flag_item.get("severity", "MEDIUM")
            score_val = {"CRITICAL": 30, "HIGH": 25, "MEDIUM": 15, "LOW": 5}.get(severity, 10)
            flags.append(_flag(
                flag_item.get("type", "DOMAIN_FLAG"),
                severity,
                score_val,
                flag_item.get("message", "Domain age flag"),
                flag_item.get("evidence", ""),
            ))
            total_score += score_val

        # Domain comparison mismatch
        domain_cmp = domain_intel.get("domain_comparison", {})
        if domain_cmp.get("mismatch"):
            flags.append(_flag(
                "FROM_RETURNPATH_MISMATCH", "MEDIUM", 15,
                f"From domain ({domain_cmp.get('from_domain')}) ≠ Return-Path domain ({domain_cmp.get('return_path_domain')})",
                domain_cmp.get("evidence", ""),
            ))
            total_score += 15

    # ── Lookalike domain ───────────────────────────────────────────────
    lookalike = analysis.get("lookalike_check", {})
    if isinstance(lookalike, dict) and lookalike.get("warning"):
        detections = lookalike.get("detections", [])
        detail = "; ".join(d.get("detail", "") for d in detections[:3])
        flags.append(_flag(
            "LOOKALIKE_DOMAIN", "HIGH", 30,
            f"Lookalike domain detected: {lookalike.get('from_domain')} resembles {lookalike.get('expected_domain')}",
            detail or f"Levenshtein distance: {lookalike.get('distance')}",
        ))
        total_score += 30

    # ── Brand impersonation ────────────────────────────────────────────
    brand = analysis.get("brand_impersonation", {})
    if isinstance(brand, dict) and brand.get("detected"):
        for detection in brand.get("detections", [])[:3]:
            severity = detection.get("severity", "HIGH")
            score_val = 25 if severity == "HIGH" else 15
            flags.append(_flag(
                "BRAND_IMPERSONATION",
                severity,
                score_val,
                detection.get("message", "Possible brand impersonation"),
                f"Legitimate domains: {', '.join(detection.get('legitimate_domains', [])[:3])}",
            ))
            total_score += score_val

    # ── Punycode domain ────────────────────────────────────────────────
    punycode = analysis.get("punycode_detection", {})
    if isinstance(punycode, dict) and punycode.get("is_punycode"):
        flags.append(_flag(
            "PUNYCODE_DOMAIN", "HIGH", 25,
            f"Sender domain uses punycode encoding: {punycode.get('encoded')} → {punycode.get('decoded')}",
            f"Domain: {punycode.get('encoded')}",
        ))
        total_score += 25

    # ── IP flags ───────────────────────────────────────────────────────
    ip_data = analysis.get("ip_analysis", {})
    if isinstance(ip_data, dict) and "error" not in ip_data:
        for ip_detail in ip_data.get("ip_details", []):
            ip_addr = ip_detail.get("ip", "")

            if ip_detail.get("is_proxy"):
                flags.append(_flag(
                    "PROXY_IP", "MEDIUM", 15,
                    f"IP {ip_addr} is flagged as a proxy/VPN",
                    f"Geolocation data for {ip_addr}",
                ))
                total_score += 15

            if ip_detail.get("is_datacenter"):
                flags.append(_flag(
                    "DATACENTER_IP", "LOW", 5,
                    f"IP {ip_addr} belongs to a datacenter/hosting provider",
                    f"ISP: {ip_detail.get('geo', {}).get('isp', 'unknown')}",
                ))
                total_score += 5

            # AbuseIPDB score
            abuse = ip_detail.get("abuse", {})
            if abuse.get("status") == "success":
                abuse_score = abuse.get("abuse_confidence_score", 0)
                if abuse_score > 75:
                    flags.append(_flag(
                        "HIGH_ABUSE_SCORE", "HIGH", 25,
                        f"IP {ip_addr} has high abuse score: {abuse_score}/100",
                        f"AbuseIPDB: {abuse.get('total_reports', 0)} reports, last: {abuse.get('last_reported_at', 'N/A')}",
                    ))
                    total_score += 25
                elif abuse_score > 25:
                    flags.append(_flag(
                        "MODERATE_ABUSE_SCORE", "MEDIUM", 10,
                        f"IP {ip_addr} has moderate abuse score: {abuse_score}/100",
                        f"AbuseIPDB: {abuse.get('total_reports', 0)} reports",
                    ))
                    total_score += 10

    # ── URL intelligence flags ─────────────────────────────────────────
    url_intel = analysis.get("url_intelligence", {})
    if isinstance(url_intel, dict):
        for finding in url_intel.get("summary_findings", [])[:5]:
            f_type = finding.get("type", "URL_SUSPICIOUS")
            severity = finding.get("severity", "MEDIUM")
            score_val = {"HIGH": 15, "MEDIUM": 10, "LOW": 3}.get(severity, 5)
            flags.append(_flag(
                f_type,
                severity,
                score_val,
                finding.get("message", "Suspicious URL detected"),
                finding.get("evidence", ""),
            ))
            total_score += score_val

    # ── Cap score ──────────────────────────────────────────────────────
    total_score = min(total_score, 100)
    level = _level_from_score(total_score)

    return {
        "score": total_score,
        "level": level,
        "flags": flags,
        "flag_count": len(flags),
        "scoring_model": {
            "INFORMATIONAL": "0–10",
            "LOW": "11–24",
            "MEDIUM": "25–49",
            "HIGH": "50–74",
            "CRITICAL": "75–100",
        },
    }
