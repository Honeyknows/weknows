"""Email header parsing, unicode spoofing, X-Mailer detection, and IOC extraction."""

from __future__ import annotations

import re
import unicodedata
from email import policy
from email.parser import Parser
from email.utils import parseaddr
from typing import Any

# ── Regex patterns ─────────────────────────────────────────────────────
IPV4_RE = re.compile(
    r"(?<![\w.])(?:25[0-5]|2[0-4]\d|1?\d?\d)"
    r"(?:\.(?:25[0-5]|2[0-4]\d|1?\d?\d)){3}(?![\w.])"
)
IPV6_RE = re.compile(r"(?<![\w:])(?:[A-Fa-f0-9]{1,4}:){2,}[A-Fa-f0-9:.]+(?![\w:])")
DOMAIN_RE = re.compile(r"@([A-Za-z0-9.-]+\.[A-Za-z]{2,})")
URL_RE = re.compile(
    r"https?://[A-Za-z0-9\-._~:/?#\[\]@!$&'()*+,;=%]+"
)
EMAIL_RE = re.compile(r"[A-Za-z0-9._%+\-]+@[A-Za-z0-9.\-]+\.[A-Za-z]{2,}")

SUSPICIOUS_MAILERS = [
    "phpmailer", "sendmail", "mass mailer", "massmailer",
    "bulk mailer", "bulkmailer", "mail merge", "mailmerge",
    "swiftmailer", "phpmail", "leaf phpmailer",
    "turbo mailer", "atompark", "group mail",
    "gammadyne", "mailking", "sendy", "emailchemy",
    "campaign enterprise", "direct mail", "maxbulk",
]

# Known enterprise mailers that should NOT be flagged
ENTERPRISE_MAILERS = [
    "microsoft outlook", "apple mail", "thunderbird",
    "gmail", "yahoo", "postfix", "exim",
    "exchange", "lotus notes", "zimbra",
]


def _clean_header(value: Any) -> str:
    """Normalize a header value to a single-line string."""
    if value is None:
        return ""
    return " ".join(str(value).replace("\r", " ").replace("\n", " ").split())


def _all_headers_as_dict(message: Any) -> dict[str, list[str]]:
    """Return every header as a dict mapping name → list of values."""
    headers: dict[str, list[str]] = {}
    for key, value in message.items():
        headers.setdefault(key, []).append(_clean_header(value))
    return headers


def _first(message: Any, name: str) -> str:
    return _clean_header(message.get(name, ""))


def extract_domain_from_header(value: str) -> str:
    """Extract the domain part from an email-like header value."""
    if not value:
        return ""
    _, address = parseaddr(value)
    address = address or value.strip("<> ")
    if "@" in address:
        return address.rsplit("@", 1)[1].strip(">. ").lower()
    match = DOMAIN_RE.search(value)
    return match.group(1).lower() if match else ""


def extract_email_from_header(value: str) -> str:
    """Extract the email address from a header value."""
    if not value:
        return ""
    _, address = parseaddr(value)
    return address.lower() if address else ""


def extract_display_name(value: str) -> str:
    """Extract the display name from a header value."""
    if not value:
        return ""
    name, _ = parseaddr(value)
    return name.strip() if name else ""


def extract_message_id_domain(message_id: str) -> str:
    match = DOMAIN_RE.search(message_id or "")
    return match.group(1).lower() if match else ""


def extract_dkim_selectors(signatures: list[str]) -> list[dict[str, str]]:
    """Return DKIM selector/domain pairs from DKIM-Signature headers."""
    selectors: list[dict[str, str]] = []
    seen: set[tuple[str, str]] = set()
    for signature in signatures or []:
        selector = ""
        domain = ""
        for part in signature.split(";"):
            if "=" not in part:
                continue
            key, value = part.split("=", 1)
            key = key.strip().lower()
            value = value.strip()
            if key == "s":
                selector = value
            elif key == "d":
                domain = value.lower()
        if selector and domain and (selector, domain) not in seen:
            seen.add((selector, domain))
            selectors.append({"selector": selector, "domain": domain})
    return selectors


# ── Provider detection ─────────────────────────────────────────────────

PROVIDER_PATTERNS = [
    ("Gmail / Google Workspace", ["x-google-dkim-signature", "google.com", "gmail.com", "gmail-smtp"]),
    ("Outlook / Microsoft 365", ["x-ms-exchange", "x-microsoft", "protection.outlook.com", "outlook.com"]),
    ("Yahoo Mail", ["x-yahoo", "ymail", "yahoodns.net", "yahoo.com"]),
    ("Zoho Mail", ["x-zoho", "zoho.com", "zohomail.com"]),
    ("Proton Mail", ["protonmail", "proton.me"]),
    ("Amazon SES", ["amazonses.com", "x-ses-", "amazonses"]),
    ("SendGrid", ["sendgrid.net", "x-sg-", "x-sendgrid"]),
    ("Mailgun", ["mailgun.org", "mailgun.net", "x-mailgun"]),
    ("Mailchimp / Mandrill", ["mandrillapp.com", "mailchimpapp.net", "x-mandrill"]),
    ("SparkPost", ["sparkpostmail.com", "sparkpost"]),
    ("Postmark", ["postmarkapp.com", "x-pm-"]),
    ("Fastmail", ["fastmail.com", "messagingengine.com"]),
]


def detect_provider(all_headers: dict[str, list[str]]) -> str:
    """Fingerprint the sending provider from header patterns."""
    keys = " ".join(all_headers.keys()).lower()
    values = " ".join(
        v.lower() for vals in all_headers.values() for v in vals if isinstance(v, str)
    )
    haystack = f"{keys} {values}"

    for provider, patterns in PROVIDER_PATTERNS:
        if any(p in haystack for p in patterns):
            return provider

    return "Unknown / Self-hosted"


# ── Main parser ────────────────────────────────────────────────────────

def parse_headers(raw_text: str) -> dict[str, Any]:
    """Parse raw email headers into a structured analysis dict."""
    raw_text = raw_text or ""
    message = Parser(policy=policy.default).parsestr(raw_text)
    all_headers = _all_headers_as_dict(message)

    from_raw = _first(message, "From")
    reply_to_raw = _first(message, "Reply-To")
    return_path_raw = _first(message, "Return-Path")

    headers: dict[str, Any] = {
        "from": from_raw,
        "from_email": extract_email_from_header(from_raw),
        "from_display_name": extract_display_name(from_raw),
        "reply_to": reply_to_raw,
        "reply_to_email": extract_email_from_header(reply_to_raw),
        "return_path": return_path_raw,
        "return_path_email": extract_email_from_header(return_path_raw),
        "message_id": _first(message, "Message-ID"),
        "subject": _first(message, "Subject"),
        "date": _first(message, "Date"),
        "received": [_clean_header(v) for v in message.get_all("Received", [])],
        "x_originating_ip": [_clean_header(v) for v in message.get_all("X-Originating-IP", [])],
        "authentication_results": [
            _clean_header(v) for v in message.get_all("Authentication-Results", [])
        ],
        "arc_authentication_results": [
            _clean_header(v) for v in message.get_all("ARC-Authentication-Results", [])
        ],
        "arc_message_signature": [
            _clean_header(v) for v in message.get_all("ARC-Message-Signature", [])
        ],
        "arc_seal": [
            _clean_header(v) for v in message.get_all("ARC-Seal", [])
        ],
        "received_spf": [_clean_header(v) for v in message.get_all("Received-SPF", [])],
        "dkim_signatures": [_clean_header(v) for v in message.get_all("DKIM-Signature", [])],
        "all_headers": all_headers,
        "header_count": len(message.items()),
    }

    headers["domains"] = {
        "from": extract_domain_from_header(from_raw),
        "reply_to": extract_domain_from_header(reply_to_raw),
        "return_path": extract_domain_from_header(return_path_raw),
        "message_id": extract_message_id_domain(headers["message_id"]),
    }
    headers["provider"] = detect_provider(all_headers)
    headers["dkim_selectors"] = extract_dkim_selectors(headers["dkim_signatures"])

    return headers


# ── Mismatch detection ─────────────────────────────────────────────────

def check_mismatch(parsed: dict[str, Any]) -> dict[str, Any]:
    """Compare visible sender fields and flag domain mismatches."""
    domains = parsed.get("domains", {})
    from_domain = domains.get("from", "")
    reply_to_domain = domains.get("reply_to", "")
    return_path_domain = domains.get("return_path", "")

    issues: list[dict[str, str]] = []

    if from_domain and reply_to_domain and from_domain != reply_to_domain:
        issues.append({
            "type": "REPLY_TO_MISMATCH",
            "message": f"Reply-To domain ({reply_to_domain}) differs from From domain ({from_domain})",
            "evidence": f"From: {parsed.get('from', '')} | Reply-To: {parsed.get('reply_to', '')}",
        })

    if from_domain and return_path_domain and from_domain != return_path_domain:
        issues.append({
            "type": "RETURN_PATH_MISMATCH",
            "message": f"Return-Path domain ({return_path_domain}) differs from From domain ({from_domain})",
            "evidence": f"From: {parsed.get('from', '')} | Return-Path: {parsed.get('return_path', '')}",
        })

    return {
        "has_mismatch": bool(issues),
        "issues": issues,
        "domains": {
            "from": from_domain or "N/A",
            "reply_to": reply_to_domain or "N/A",
            "return_path": return_path_domain or "N/A",
        },
    }


# ── Unicode spoofing detection ─────────────────────────────────────────

def detect_unicode_spoofing(*header_values: str) -> dict[str, Any]:
    """Scan header values for non-ASCII characters that could be used for spoofing."""
    findings: list[dict[str, Any]] = []

    for value in header_values:
        if not value:
            continue
        for i, char in enumerate(value):
            code = ord(char)
            if code > 127:
                try:
                    name = unicodedata.name(char, "UNKNOWN")
                except ValueError:
                    name = "UNKNOWN"
                findings.append({
                    "character": char,
                    "codepoint": f"U+{code:04X}",
                    "unicode_name": name,
                    "context": value[max(0, i - 10):i + 10],
                    "position": i,
                    "source_header": value[:60],
                })

    return {
        "detected": len(findings) > 0,
        "count": len(findings),
        "findings": findings,
    }


# ── Suspicious X-Mailer detection ─────────────────────────────────────

def detect_suspicious_xmailer(all_headers: dict[str, list[str]]) -> dict[str, Any]:
    """Flag suspicious X-Mailer values."""
    x_mailer_values = all_headers.get("X-Mailer", [])
    user_agent_values = all_headers.get("User-Agent", [])
    all_mailer_values = x_mailer_values + user_agent_values

    if not all_mailer_values:
        return {"present": False, "suspicious": False, "value": None, "reason": None}

    value = all_mailer_values[0]
    value_lower = value.lower()

    # Check if it's a known enterprise mailer first
    for enterprise in ENTERPRISE_MAILERS:
        if enterprise in value_lower:
            return {
                "present": True,
                "suspicious": False,
                "value": value,
                "reason": None,
            }

    # Check against suspicious patterns
    for pattern in SUSPICIOUS_MAILERS:
        if pattern in value_lower:
            return {
                "present": True,
                "suspicious": True,
                "value": value,
                "reason": f"Matched suspicious mailer pattern: '{pattern}'",
                "evidence": f"X-Mailer: {value}",
            }

    return {"present": True, "suspicious": False, "value": value, "reason": None}


# ── IOC extraction ─────────────────────────────────────────────────────

def extract_iocs(raw_headers: str) -> dict[str, Any]:
    """Extract Indicators of Compromise: URLs, domains, IPs, emails from headers."""
    urls = list(set(URL_RE.findall(raw_headers)))
    emails = list(set(EMAIL_RE.findall(raw_headers)))
    ipv4s = list(set(IPV4_RE.findall(raw_headers)))

    # Extract domains from URLs and emails
    domains_from_urls = set()
    for url in urls:
        match = re.search(r"https?://([^/:?#]+)", url)
        if match:
            domains_from_urls.add(match.group(1).lower())
    for email in emails:
        parts = email.split("@")
        if len(parts) == 2:
            domains_from_urls.add(parts[1].lower())

    domains = list(domains_from_urls)

    return {
        "urls": urls[:50],  # cap to prevent abuse
        "domains": domains[:50],
        "ipv4_addresses": ipv4s[:50],
        "email_addresses": emails[:50],
        "total_count": len(urls) + len(domains) + len(ipv4s) + len(emails),
    }
