"""Report generation: JSON export, PDF report, and investigation summary."""

from __future__ import annotations

import io
import json
import logging
from datetime import datetime, timezone
from typing import Any

logger = logging.getLogger("emailtracer.report")

NA = "Not Available"


# ── Investigation summary (plain English narrative) ────────────────────

def generate_investigation_summary(analysis: dict[str, Any]) -> str:
    """Generate a human-readable investigation summary."""
    lines: list[str] = []
    lines.append("=" * 60)
    lines.append("  EMAILTRACER — INVESTIGATION SUMMARY")
    lines.append("=" * 60)
    lines.append(f"  Generated: {analysis.get('timestamp', 'Unknown')}")
    lines.append("")

    # Header summary
    header = analysis.get("header_analysis", {})
    lines.append("─── SENDER INFORMATION ───")
    lines.append(f"  From:        {header.get('from', NA)}")
    lines.append(f"  Reply-To:    {header.get('reply_to', NA) or 'Not set'}")
    lines.append(f"  Return-Path: {header.get('return_path', NA) or 'Not set'}")
    lines.append(f"  Subject:     {header.get('subject', NA)}")
    lines.append(f"  Date:        {header.get('date', NA)}")
    lines.append(f"  Provider:    {header.get('provider', 'Unknown')}")
    lines.append("")

    # Risk assessment
    risk = analysis.get("risk_assessment", {})
    level = risk.get("level", "UNKNOWN")
    score = risk.get("score", 0)
    lines.append("─── RISK ASSESSMENT ───")
    lines.append(f"  Level: {level}  |  Score: {score}/100")
    flags = risk.get("flags", [])
    if flags:
        lines.append(f"  Indicators: {len(flags)} finding(s)")
        for f in flags:
            lines.append(f"    [{f.get('severity', '?'):>8}] {f.get('indicator', '')}: {f.get('message', '')}")
            if f.get("evidence"):
                lines.append(f"             Evidence: {f['evidence'][:120]}")
    else:
        lines.append("  No suspicious indicators found.")
    lines.append("")

    # Authentication
    auth = analysis.get("authentication", {})
    if isinstance(auth, dict) and "error" not in auth:
        lines.append("─── AUTHENTICATION ───")
        passed = auth.get("passed", {})
        lines.append(f"  SPF:   {'PASS' if passed.get('spf') else 'FAIL'}  (observed: {auth.get('observed', {}).get('spf', '?')})")
        lines.append(f"  DKIM:  {'PASS' if passed.get('dkim') else 'FAIL'}  (observed: {auth.get('observed', {}).get('dkim', '?')})")
        lines.append(f"  DMARC: {'PASS' if passed.get('dmarc') else 'FAIL'}  (observed: {auth.get('observed', {}).get('dmarc', '?')})")
        lines.append(f"  Verdict: {auth.get('overall_verdict', 'Unknown')}")
        lines.append("")

    # IP analysis
    ip_data = analysis.get("ip_analysis", {})
    if isinstance(ip_data, dict) and "error" not in ip_data:
        ip_details = ip_data.get("ip_details", [])
        lines.append("─── IP ANALYSIS ───")
        lines.append(f"  Total IPs found: {ip_data.get('total_ips_found', 0)}")
        if not ip_details:
            lines.append("  All IPs belong to mail infrastructure — real sender IP not exposed.")
        for detail in ip_details:
            geo = detail.get("geo", {})
            lines.append(f"  {detail.get('ip', '?')} ({detail.get('source', 'Received')})")
            if geo.get("status") == "success":
                lines.append(f"    Location: {geo.get('city', '?')}, {geo.get('country', '?')}")
                lines.append(f"    ISP: {geo.get('isp', '?')}  |  ASN: {geo.get('asn', '?')}")
            abuse = detail.get("abuse", {})
            if abuse.get("status") == "success":
                lines.append(f"    AbuseIPDB: {abuse.get('abuse_confidence_score', 0)}/100, {abuse.get('total_reports', 0)} reports")
        lines.append("")

    # Domain intelligence
    domain_intel = analysis.get("domain_intelligence", {})
    if isinstance(domain_intel, dict) and "error" not in domain_intel:
        whois_data = domain_intel.get("whois", {})
        lines.append("─── DOMAIN INTELLIGENCE ───")
        lines.append(f"  Domain:    {domain_intel.get('domain', NA)}")
        if whois_data.get("status") == "success":
            lines.append(f"  Registrar: {whois_data.get('registrar', NA)}")
            lines.append(f"  Created:   {whois_data.get('creation_date', NA)}")
            lines.append(f"  Expires:   {whois_data.get('expiration_date', NA)}")
            lines.append(f"  Org:       {whois_data.get('registrant_org', NA)}")
            age = whois_data.get("age_days")
            if age is not None:
                lines.append(f"  Age:       {age} days")
        elif whois_data.get("status") == "error":
            lines.append(f"  WHOIS Error: {whois_data.get('message', 'Unknown error')}")
        lines.append("")

    # Lookalike check
    lookalike = analysis.get("lookalike_check", {})
    if isinstance(lookalike, dict) and lookalike.get("checked"):
        lines.append("─── LOOKALIKE DOMAIN CHECK ───")
        lines.append(f"  {lookalike.get('message', 'No result')}")
        if lookalike.get("warning"):
            for d in lookalike.get("detections", []):
                lines.append(f"    [{d.get('method', '?')}] {d.get('detail', '')}")
        lines.append("")

    # Brand impersonation
    brand = analysis.get("brand_impersonation", {})
    if isinstance(brand, dict) and brand.get("detected"):
        lines.append("─── BRAND IMPERSONATION ───")
        for det in brand.get("detections", []):
            lines.append(f"  [{det.get('severity', '?')}] {det.get('message', '')}")
        lines.append("")

    # Recommended actions
    lines.append("─── RECOMMENDED ACTIONS ───")
    if level == "CRITICAL":
        lines.append("  ⛔ BLOCK this email. Do not click links, open attachments, or reply.")
        lines.append("  Report to your security team immediately.")
    elif level == "HIGH":
        lines.append("  ⚠ Treat as suspicious. Do not click links or open attachments.")
        lines.append("  Verify the sender through a trusted channel before taking action.")
    elif level == "MEDIUM":
        lines.append("  ⚡ Exercise caution. Verify links and sender identity before acting.")
    elif level == "LOW":
        lines.append("  ✓ Low risk but maintain normal caution with links and attachments.")
    else:
        lines.append("  ✓ No significant risks detected. Standard email hygiene applies.")

    lines.append("")
    lines.append("=" * 60)
    lines.append("  End of EmailTracer Report")
    lines.append("=" * 60)

    return "\n".join(lines)


# ── JSON report builder ───────────────────────────────────────────────

def build_json_report(analysis: dict[str, Any]) -> dict[str, Any]:
    """Build a clean JSON report from the full analysis. Strips internal fields."""
    report = {
        "report_metadata": {
            "tool": "EmailTracer",
            "version": analysis.get("version", "2.0.0"),
            "generated_at": analysis.get("timestamp", datetime.now(timezone.utc).isoformat()),
        },
        "risk_assessment": analysis.get("risk_assessment", {}),
        "header_analysis": _clean_header_report(analysis.get("header_analysis", {})),
        "authentication": analysis.get("authentication", {}),
        "ip_analysis": analysis.get("ip_analysis", {}),
        "domain_intelligence": analysis.get("domain_intelligence", {}),
        "dns_intelligence": analysis.get("dns_intelligence", {}),
        "mismatch_detection": analysis.get("mismatch", {}),
        "message_id_analysis": analysis.get("message_id_analysis", {}),
        "unicode_spoofing": analysis.get("unicode_spoofing", {}),
        "x_mailer_analysis": analysis.get("x_mailer", {}),
        "punycode_detection": analysis.get("punycode_detection", {}),
        "lookalike_check": analysis.get("lookalike_check", {}),
        "brand_impersonation": analysis.get("brand_impersonation", {}),
        "url_intelligence": analysis.get("url_intelligence", {}),
        "ioc_extraction": analysis.get("iocs", {}),
        "timeline": analysis.get("timeline", {}),
        "investigation_summary": analysis.get("investigation_summary", ""),
    }
    return report


def _clean_header_report(header: dict[str, Any]) -> dict[str, Any]:
    """Strip bulky all_headers from report to keep it clean."""
    if not isinstance(header, dict):
        return header
    cleaned = dict(header)
    cleaned.pop("all_headers", None)
    return cleaned


# ── PDF report generation ─────────────────────────────────────────────

def generate_pdf_report(analysis: dict[str, Any]) -> bytes:
    """Generate a PDF report from the analysis. Returns PDF as bytes."""
    try:
        from reportlab.lib.pagesizes import A4
        from reportlab.lib.units import mm
        from reportlab.lib.colors import HexColor
        from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
        from reportlab.platypus import (
            SimpleDocTemplate, Paragraph, Spacer, Table, TableStyle,
            HRFlowable,
        )
        from reportlab.lib.enums import TA_LEFT, TA_CENTER
    except ImportError:
        raise RuntimeError("reportlab is not installed. Install with: pip install reportlab")

    buffer = io.BytesIO()
    doc = SimpleDocTemplate(
        buffer, pagesize=A4,
        leftMargin=20 * mm, rightMargin=20 * mm,
        topMargin=20 * mm, bottomMargin=20 * mm,
    )

    # Colors
    bg_dark = HexColor("#0D0D0D")
    accent = HexColor("#E05C3A")
    success = HexColor("#2A9D3F")
    warning = HexColor("#E0A020")
    text_primary = HexColor("#333333")
    text_muted = HexColor("#666666")

    # Styles
    styles = getSampleStyleSheet()
    title_style = ParagraphStyle(
        "CustomTitle", parent=styles["Title"],
        fontName="Courier-Bold", fontSize=18,
        textColor=accent, spaceAfter=6,
    )
    h2_style = ParagraphStyle(
        "CustomH2", parent=styles["Heading2"],
        fontName="Courier-Bold", fontSize=13,
        textColor=text_primary, spaceBefore=14, spaceAfter=6,
    )
    body_style = ParagraphStyle(
        "CustomBody", parent=styles["Normal"],
        fontName="Helvetica", fontSize=9,
        textColor=text_primary, spaceAfter=4,
    )
    mono_style = ParagraphStyle(
        "Mono", parent=styles["Normal"],
        fontName="Courier", fontSize=8,
        textColor=text_muted, spaceAfter=2,
    )
    flag_style = ParagraphStyle(
        "Flag", parent=styles["Normal"],
        fontName="Courier", fontSize=8,
        textColor=HexColor("#991B1B"), spaceAfter=2,
    )

    elements: list[Any] = []

    # Title
    elements.append(Paragraph("EmailTracer — Forensics Report", title_style))
    elements.append(Paragraph(
        f"Generated: {analysis.get('timestamp', 'Unknown')}",
        mono_style,
    ))
    elements.append(Spacer(1, 8))
    elements.append(HRFlowable(width="100%", color=accent, thickness=2))
    elements.append(Spacer(1, 10))

    # Risk Assessment
    risk = analysis.get("risk_assessment", {})
    level = risk.get("level", "UNKNOWN")
    score = risk.get("score", 0)
    risk_color = {
        "CRITICAL": "#991B1B", "HIGH": "#DC2626",
        "MEDIUM": "#D97706", "LOW": "#2A9D3F",
        "INFORMATIONAL": "#6B7280",
    }.get(level, "#333333")

    elements.append(Paragraph("RISK ASSESSMENT", h2_style))
    elements.append(Paragraph(
        f'Risk Level: <font color="{risk_color}"><b>{level}</b></font> — Score: {score}/100',
        body_style,
    ))

    flags = risk.get("flags", [])
    if flags:
        flag_data = [["Indicator", "Severity", "Score", "Description"]]
        for f in flags:
            flag_data.append([
                f.get("indicator", ""),
                f.get("severity", ""),
                str(f.get("score", 0)),
                f.get("message", "")[:80],
            ])
        t = Table(flag_data, colWidths=[90, 60, 40, 280])
        t.setStyle(TableStyle([
            ("FONTNAME", (0, 0), (-1, 0), "Courier-Bold"),
            ("FONTSIZE", (0, 0), (-1, -1), 7),
            ("BACKGROUND", (0, 0), (-1, 0), HexColor("#F3F4F6")),
            ("GRID", (0, 0), (-1, -1), 0.5, HexColor("#D1D5DB")),
            ("VALIGN", (0, 0), (-1, -1), "TOP"),
            ("TOPPADDING", (0, 0), (-1, -1), 3),
            ("BOTTOMPADDING", (0, 0), (-1, -1), 3),
        ]))
        elements.append(t)
    elements.append(Spacer(1, 8))

    # Header Summary
    header_data = analysis.get("header_analysis", {})
    if header_data and "error" not in header_data:
        elements.append(Paragraph("HEADER ANALYSIS", h2_style))
        fields = [
            ("From", header_data.get("from", NA)),
            ("Reply-To", header_data.get("reply_to", "") or "Not set"),
            ("Return-Path", header_data.get("return_path", "") or "Not set"),
            ("Subject", header_data.get("subject", NA)),
            ("Date", header_data.get("date", NA)),
            ("Provider", header_data.get("provider", "Unknown")),
        ]
        for label, value in fields:
            elements.append(Paragraph(f"<b>{label}:</b> {_escape(value)}", body_style))
        elements.append(Spacer(1, 6))

    # Authentication
    auth = analysis.get("authentication", {})
    if isinstance(auth, dict) and "error" not in auth:
        elements.append(Paragraph("AUTHENTICATION", h2_style))
        passed = auth.get("passed", {})
        observed = auth.get("observed", {})

        auth_data = [["Check", "Observed", "DNS Record", "Result"]]
        for check_name in ["spf", "dkim", "dmarc"]:
            check_data = auth.get(check_name, {})
            auth_data.append([
                check_name.upper(),
                observed.get(check_name, "?"),
                (check_data.get("record", "") or "Not found")[:60],
                "PASS" if passed.get(check_name) else "FAIL",
            ])

        t = Table(auth_data, colWidths=[50, 60, 260, 50])
        t.setStyle(TableStyle([
            ("FONTNAME", (0, 0), (-1, 0), "Courier-Bold"),
            ("FONTNAME", (0, 1), (-1, -1), "Courier"),
            ("FONTSIZE", (0, 0), (-1, -1), 7),
            ("BACKGROUND", (0, 0), (-1, 0), HexColor("#F3F4F6")),
            ("GRID", (0, 0), (-1, -1), 0.5, HexColor("#D1D5DB")),
            ("TOPPADDING", (0, 0), (-1, -1), 3),
            ("BOTTOMPADDING", (0, 0), (-1, -1), 3),
        ]))
        elements.append(t)
        elements.append(Paragraph(f"Verdict: {auth.get('overall_verdict', '?')}", body_style))
        elements.append(Spacer(1, 6))

    # Domain Intelligence
    domain_intel = analysis.get("domain_intelligence", {})
    if isinstance(domain_intel, dict) and "error" not in domain_intel:
        whois_data = domain_intel.get("whois", {})
        elements.append(Paragraph("DOMAIN INTELLIGENCE", h2_style))
        if whois_data.get("status") == "success":
            for label, key in [
                ("Domain", "domain"), ("Registrar", "registrar"),
                ("Created", "creation_date"), ("Expires", "expiration_date"),
                ("Organization", "registrant_org"), ("Country", "registrant_country"),
            ]:
                elements.append(Paragraph(
                    f"<b>{label}:</b> {_escape(str(whois_data.get(key, NA)))}",
                    body_style,
                ))
        elif whois_data.get("status") == "error":
            elements.append(Paragraph(
                f"WHOIS lookup failed: {whois_data.get('message', 'Unknown')}",
                flag_style,
            ))
        elements.append(Spacer(1, 6))

    # IP Analysis
    ip_data = analysis.get("ip_analysis", {})
    if isinstance(ip_data, dict) and "error" not in ip_data:
        elements.append(Paragraph("IP ANALYSIS", h2_style))
        ip_details = ip_data.get("ip_details", [])
        if ip_details:
            ip_table_data = [["IP", "Source", "Location", "ISP", "Proxy", "Datacenter"]]
            for detail in ip_details[:10]:
                geo = detail.get("geo", {})
                ip_table_data.append([
                    detail.get("ip", "?"),
                    detail.get("source", "?"),
                    f"{geo.get('city', '?')}, {geo.get('country', '?')}" if geo.get("status") == "success" else "Lookup failed",
                    (geo.get("isp", "?") or "?")[:30] if geo.get("status") == "success" else "-",
                    "Yes" if detail.get("is_proxy") else "No",
                    "Yes" if detail.get("is_datacenter") else "No",
                ])
            t = Table(ip_table_data, colWidths=[80, 65, 110, 100, 35, 50])
            t.setStyle(TableStyle([
                ("FONTNAME", (0, 0), (-1, 0), "Courier-Bold"),
                ("FONTNAME", (0, 1), (-1, -1), "Courier"),
                ("FONTSIZE", (0, 0), (-1, -1), 7),
                ("BACKGROUND", (0, 0), (-1, 0), HexColor("#F3F4F6")),
                ("GRID", (0, 0), (-1, -1), 0.5, HexColor("#D1D5DB")),
                ("TOPPADDING", (0, 0), (-1, -1), 3),
                ("BOTTOMPADDING", (0, 0), (-1, -1), 3),
            ]))
            elements.append(t)
        else:
            elements.append(Paragraph(
                "All IPs belong to mail infrastructure. Real sender IP not exposed.",
                body_style,
            ))
        elements.append(Spacer(1, 6))

    # DNS Intelligence
    dns_data = analysis.get("dns_intelligence", {})
    if isinstance(dns_data, dict) and "error" not in dns_data:
        elements.append(Paragraph("DNS INTELLIGENCE", h2_style))
        for rtype in ["mx", "ns", "spf", "dmarc"]:
            section = dns_data.get(rtype, {})
            if isinstance(section, dict):
                if rtype in ("spf", "dmarc"):
                    record = section.get("record", "")
                    status = "Found" if section.get("exists") else section.get("error", "Not found")
                    elements.append(Paragraph(
                        f"<b>{rtype.upper()}:</b> {_escape(record or status)}", mono_style
                    ))
                else:
                    records = section.get("records", [])
                    rec_str = ", ".join(records[:5]) if records else section.get("error", "Not found")
                    elements.append(Paragraph(
                        f"<b>{rtype.upper()}:</b> {_escape(rec_str)}", mono_style
                    ))
        elements.append(Spacer(1, 6))

    # Timeline
    timeline = analysis.get("timeline", {})
    if isinstance(timeline, dict):
        events = timeline.get("events", [])
        if events:
            elements.append(Paragraph("INVESTIGATION TIMELINE", h2_style))
            for event in events[:15]:
                ts = event.get("timestamp", "?")
                desc = event.get("description", "?")
                ip_str = f" [{event.get('ip', '')}]" if event.get("ip") else ""
                elements.append(Paragraph(
                    f"{ts}{ip_str} — {desc}", mono_style
                ))
                if event.get("delay_warning"):
                    elements.append(Paragraph(f"  ⚠ {event['delay_warning']}", flag_style))
            elements.append(Spacer(1, 6))

    # IOC Extraction
    iocs = analysis.get("iocs", {})
    if isinstance(iocs, dict) and iocs.get("total_count", 0) > 0:
        elements.append(Paragraph("IOC EXTRACTION", h2_style))
        for ioc_type, label in [
            ("urls", "URLs"), ("domains", "Domains"),
            ("ipv4_addresses", "IPv4"), ("email_addresses", "Emails"),
        ]:
            items = iocs.get(ioc_type, [])
            if items:
                elements.append(Paragraph(f"<b>{label} ({len(items)}):</b>", body_style))
                for item in items[:10]:
                    elements.append(Paragraph(f"  {_escape(item)}", mono_style))
        elements.append(Spacer(1, 6))

    # Investigation summary
    summary = analysis.get("investigation_summary", "")
    if summary:
        elements.append(Paragraph("INVESTIGATION SUMMARY", h2_style))
        for line in summary.split("\n"):
            elements.append(Paragraph(_escape(line), mono_style))

    # Build PDF
    doc.build(elements)
    return buffer.getvalue()


def _escape(text: str) -> str:
    """Escape XML/HTML special characters for reportlab Paragraphs."""
    return (
        str(text)
        .replace("&", "&amp;")
        .replace("<", "&lt;")
        .replace(">", "&gt;")
        .replace('"', "&quot;")
    )
