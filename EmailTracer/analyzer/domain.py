"""Domain intelligence: WHOIS, lookalike detection, homoglyphs, brand impersonation."""

from __future__ import annotations

import logging
import re
from datetime import datetime, timezone
from email.utils import parseaddr
from typing import Any

logger = logging.getLogger("emailtracer.domain")

try:
    from Levenshtein import distance as levenshtein_distance
except ImportError:
    def levenshtein_distance(a: str, b: str) -> int:  # type: ignore[misc]
        """Fallback Levenshtein distance when python-Levenshtein is unavailable."""
        if len(a) < len(b):
            return levenshtein_distance(b, a)
        if len(b) == 0:
            return len(a)
        prev = list(range(len(b) + 1))
        for i, ca in enumerate(a):
            curr = [i + 1]
            for j, cb in enumerate(b):
                curr.append(min(prev[j + 1] + 1, curr[j] + 1, prev[j] + (ca != cb)))
            prev = curr
        return prev[len(b)]

try:
    import whois as whois_lib
except ImportError:
    whois_lib = None  # type: ignore[assignment]

NA = "Not Available"
EMAIL_DOMAIN_RE = re.compile(
    r"(?:<)?[A-Za-z0-9._%+\-]+@([A-Za-z0-9][A-Za-z0-9.\-]*\.[A-Za-z]{2,})(?:>)?",
    re.IGNORECASE,
)

# ── Homoglyph substitution map ─────────────────────────────────────────
HOMOGLYPHS: dict[str, list[str]] = {
    "a": ["а", "ɑ", "α"],       # Cyrillic a, Latin alpha, Greek alpha
    "c": ["с", "ϲ"],             # Cyrillic es, Greek lunate sigma
    "d": ["ԁ", "ɗ"],             # Cyrillic de
    "e": ["е", "ё", "ε"],        # Cyrillic ie, Greek epsilon
    "g": ["ɡ", "ɢ"],
    "h": ["һ", "ʜ"],             # Cyrillic shha
    "i": ["і", "ι", "1", "l"],   # Cyrillic i, Greek iota
    "j": ["ј"],                   # Cyrillic je
    "k": ["κ", "к"],             # Greek kappa, Cyrillic ka
    "l": ["1", "і", "|"],
    "m": ["rn", "ⅿ"],
    "n": ["ո", "η"],             # Armenian, Greek eta
    "o": ["о", "ο", "0"],        # Cyrillic o, Greek omicron, zero
    "p": ["р", "ρ"],             # Cyrillic er, Greek rho
    "q": ["ԛ"],
    "s": ["ѕ", "ꜱ"],            # Cyrillic dze
    "t": ["τ", "т"],             # Greek tau, Cyrillic te
    "u": ["υ", "ʋ"],
    "v": ["ν", "ⅴ"],            # Greek nu
    "w": ["ω", "ⅳ"],
    "x": ["х", "χ"],            # Cyrillic kha, Greek chi
    "y": ["у", "γ"],            # Cyrillic u, Greek gamma
    "z": ["ᴢ"],
}

# Common typosquatting substitutions
TYPOSQUAT_SUBS: list[tuple[str, str]] = [
    ("rn", "m"), ("m", "rn"),
    ("0", "o"), ("o", "0"),
    ("1", "l"), ("l", "1"),
    ("vv", "w"), ("w", "vv"),
    ("d", "cl"), ("cl", "d"),
    ("nn", "m"),
]

# ── Commonly impersonated brands ───────────────────────────────────────
BRAND_DOMAINS: dict[str, list[str]] = {
    "Google": ["google.com", "gmail.com", "googlemail.com"],
    "Microsoft": ["microsoft.com", "outlook.com", "hotmail.com", "live.com", "office365.com", "office.com"],
    "Apple": ["apple.com", "icloud.com"],
    "Amazon": ["amazon.com", "amazonaws.com"],
    "PayPal": ["paypal.com"],
    "Facebook/Meta": ["facebook.com", "meta.com", "fb.com"],
    "Netflix": ["netflix.com"],
    "LinkedIn": ["linkedin.com"],
    "Twitter/X": ["twitter.com", "x.com"],
    "Dropbox": ["dropbox.com"],
    "DocuSign": ["docusign.com", "docusign.net"],
    "DHL": ["dhl.com"],
    "FedEx": ["fedex.com"],
    "Bank of America": ["bankofamerica.com", "bofa.com"],
    "Chase": ["chase.com", "jpmorgan.com"],
    "Wells Fargo": ["wellsfargo.com"],
    "USPS": ["usps.com"],
    "IRS": ["irs.gov"],
    "WhatsApp": ["whatsapp.com"],
    "Instagram": ["instagram.com"],
    "Spotify": ["spotify.com"],
    "Zoom": ["zoom.us"],
}


def detect_punycode(domain: str) -> dict[str, Any]:
    """Detect if the domain uses punycode encoding (xn--)."""
    if not domain:
        return {"is_punycode": False, "encoded": "", "decoded": ""}

    is_punycode = "xn--" in domain.lower()
    decoded = domain
    if is_punycode:
        try:
            parts = domain.split(".")
            decoded_parts = []
            for part in parts:
                if part.lower().startswith("xn--"):
                    decoded_parts.append(part.encode("ascii").decode("punycode"))
                else:
                    decoded_parts.append(part)
            decoded = ".".join(decoded_parts)
        except Exception:
            pass

    return {
        "is_punycode": is_punycode,
        "encoded": domain,
        "decoded": decoded,
    }


def _safe(value: Any) -> str:
    """Convert a whois field value to a safe display string."""
    if value is None or value == "":
        return NA
    if isinstance(value, list):
        if not value:
            return NA
        items = [_safe(item) for item in value if item is not None]
        return ", ".join(items) if items else NA
    if isinstance(value, datetime):
        return value.strftime("%Y-%m-%d %H:%M:%S UTC")
    return str(value)


def _first_date(value: Any) -> datetime | None:
    """Extract the earliest datetime from a whois field."""
    def _normalize(dt: datetime) -> datetime:
        return dt if dt.tzinfo else dt.replace(tzinfo=timezone.utc)

    if isinstance(value, list):
        dates = [_normalize(d) for d in value if isinstance(d, datetime)]
        return min(dates) if dates else None
    return _normalize(value) if isinstance(value, datetime) else None


def _extract_domain(email_str: str) -> str:
    """Extract domain from an email header value."""
    match = EMAIL_DOMAIN_RE.search(email_str or "")
    if match:
        return match.group(1).strip().lower()
    _, addr = parseaddr(email_str or "")
    if addr and "@" in addr:
        return addr.rsplit("@", 1)[1].strip(">. ").lower()
    return ""


# ── WHOIS ──────────────────────────────────────────────────────────────

def whois_lookup(domain: str) -> dict[str, Any]:
    """Run WHOIS lookup. Never fabricates data — returns error on failure."""
    if not domain:
        return {"status": "error", "message": "No domain provided", "domain": ""}

    if whois_lib is None:
        return {"status": "error", "message": "python-whois is not installed", "domain": domain}

    try:
        record = whois_lib.whois(domain)

        creation_date = _first_date(getattr(record, "creation_date", None))
        expiration_date = _first_date(getattr(record, "expiration_date", None))
        now = datetime.now(timezone.utc)

        age_days = (now - creation_date).days if creation_date else None

        # Check for privacy protection
        emails_raw = _safe(getattr(record, "emails", None))
        registrant_name = _safe(getattr(record, "name", None))
        privacy_terms = ("privacy", "protect", "guard", "proxy", "whoisguard", "redacted")
        is_privacy_protected = any(
            t in (emails_raw + registrant_name).lower() for t in privacy_terms
        )

        name_servers = getattr(record, "name_servers", None)
        if isinstance(name_servers, list):
            name_servers = [ns.lower() for ns in name_servers if ns]
        else:
            name_servers = []

        return {
            "status": "success",
            "domain": domain,
            "registrar": _safe(getattr(record, "registrar", None)),
            "creation_date": _safe(getattr(record, "creation_date", None)),
            "expiration_date": _safe(getattr(record, "expiration_date", None)),
            "updated_date": _safe(getattr(record, "updated_date", None)),
            "name_servers": name_servers,
            "registrant_email": _safe(getattr(record, "emails", None)),
            "registrant_name": registrant_name,
            "registrant_org": _safe(getattr(record, "org", None)),
            "registrant_country": _safe(getattr(record, "country", None)),
            "dnssec": _safe(getattr(record, "dnssec", None)),
            "age_days": age_days,
            "is_privacy_protected": is_privacy_protected,
        }
    except Exception as exc:
        logger.warning("WHOIS lookup failed for %s: %s", domain, exc)
        return {
            "status": "error",
            "domain": domain,
            "message": f"WHOIS lookup failed: {exc}",
        }


def analyze_domain_age(whois_data: dict[str, Any]) -> dict[str, Any]:
    """Analyze domain age and return risk flags."""
    flags: list[dict[str, str]] = []
    age_days = whois_data.get("age_days")

    if whois_data.get("status") == "error":
        return {"flags": [], "age_days": None, "error": whois_data.get("message")}

    if age_days is not None:
        if age_days < 7:
            flags.append({
                "type": "VERY_NEW_DOMAIN",
                "severity": "CRITICAL",
                "message": f"Domain is only {age_days} days old — extremely suspicious",
                "evidence": f"WHOIS creation date: {whois_data.get('creation_date', NA)}",
            })
        elif age_days < 30:
            flags.append({
                "type": "NEW_DOMAIN",
                "severity": "HIGH",
                "message": f"Domain is only {age_days} days old",
                "evidence": f"WHOIS creation date: {whois_data.get('creation_date', NA)}",
            })

    if whois_data.get("is_privacy_protected"):
        flags.append({
            "type": "PRIVACY_PROTECTED",
            "severity": "LOW",
            "message": "Registrant identity hidden behind privacy/proxy service",
            "evidence": f"Registrant: {whois_data.get('registrant_name', NA)}",
        })

    return {"flags": flags, "age_days": age_days}


def compare_domains(from_header: str, return_path: str) -> dict[str, Any]:
    """Compare From and Return-Path domains."""
    from_domain = _extract_domain(from_header)
    return_path_domain = _extract_domain(return_path)

    if from_domain and return_path_domain and from_domain != return_path_domain:
        return {
            "mismatch": True,
            "from_domain": from_domain,
            "return_path_domain": return_path_domain,
            "evidence": f"From: {from_header} | Return-Path: {return_path}",
        }

    return {
        "mismatch": False,
        "from_domain": from_domain or NA,
        "return_path_domain": return_path_domain or NA,
    }


# ── Lookalike domain detection ─────────────────────────────────────────

def check_lookalike(from_domain: str, expected_domain: str) -> dict[str, Any]:
    """Check if the sender domain is a lookalike of the expected domain."""
    if not expected_domain:
        return {"checked": False, "message": "No expected domain provided for comparison"}

    if not from_domain:
        return {"checked": True, "warning": False, "message": "No sender domain found"}

    from_lower = from_domain.lower().strip()
    expected_lower = expected_domain.lower().strip()

    if from_lower == expected_lower:
        return {
            "checked": True,
            "match": True,
            "warning": False,
            "distance": 0,
            "from_domain": from_lower,
            "expected_domain": expected_lower,
            "message": "Domains match exactly",
        }

    distance = levenshtein_distance(from_lower, expected_lower)
    detections: list[dict[str, str]] = []

    # Levenshtein distance check
    if distance <= 2:
        detections.append({
            "method": "levenshtein",
            "detail": f"Edit distance is {distance} (threshold: 2)",
        })

    # Homoglyph check
    homoglyph_hits = _check_homoglyphs(from_lower, expected_lower)
    if homoglyph_hits:
        detections.extend(homoglyph_hits)

    # Typosquatting substitution check
    typo_hits = _check_typosquatting(from_lower, expected_lower)
    if typo_hits:
        detections.extend(typo_hits)

    is_lookalike = len(detections) > 0

    return {
        "checked": True,
        "match": False,
        "warning": is_lookalike,
        "distance": distance,
        "from_domain": from_lower,
        "expected_domain": expected_lower,
        "detections": detections,
        "message": (
            f"LOOKALIKE DOMAIN DETECTED — {len(detections)} indicator(s) found"
            if is_lookalike
            else f"No lookalike detected (edit distance: {distance})"
        ),
    }


def _check_homoglyphs(candidate: str, reference: str) -> list[dict[str, str]]:
    """Check if candidate uses homoglyph characters to mimic reference."""
    hits: list[dict[str, str]] = []
    for ref_char, glyph_list in HOMOGLYPHS.items():
        for glyph in glyph_list:
            if glyph in candidate and ref_char in reference:
                hits.append({
                    "method": "homoglyph",
                    "detail": f"Character '{glyph}' (U+{ord(glyph):04X}) mimics '{ref_char}'",
                })
    return hits


def _check_typosquatting(candidate: str, reference: str) -> list[dict[str, str]]:
    """Check if candidate uses common typosquatting substitutions."""
    hits: list[dict[str, str]] = []
    for old, new in TYPOSQUAT_SUBS:
        if old in candidate:
            modified = candidate.replace(old, new, 1)
            if modified == reference:
                hits.append({
                    "method": "typosquatting",
                    "detail": f"Substituting '{old}' → '{new}' produces '{reference}'",
                })
    return hits


# ── Brand impersonation ────────────────────────────────────────────────

def detect_brand_impersonation(from_domain: str, from_header: str) -> dict[str, Any]:
    """Check if the sender appears to impersonate a well-known brand."""
    if not from_domain:
        return {"detected": False, "checks": []}

    from_lower = from_domain.lower()
    display_name = ""
    if from_header:
        name, _ = parseaddr(from_header)
        display_name = (name or "").lower()

    detections: list[dict[str, Any]] = []

    for brand, domains in BRAND_DOMAINS.items():
        # Check if domain is the real brand domain
        if from_lower in domains:
            continue  # Legitimate sender

        # Check if brand name appears in the domain
        brand_lower = brand.lower().split("/")[0].strip()
        if brand_lower in from_lower:
            detections.append({
                "brand": brand,
                "type": "DOMAIN_CONTAINS_BRAND",
                "severity": "HIGH",
                "message": f"Domain '{from_domain}' contains brand name '{brand}' but is not an official domain",
                "legitimate_domains": domains,
            })
            continue

        # Check Levenshtein distance to each brand domain
        for legit in domains:
            dist = levenshtein_distance(from_lower, legit)
            if 0 < dist <= 2:
                detections.append({
                    "brand": brand,
                    "type": "LOOKALIKE_BRAND_DOMAIN",
                    "severity": "HIGH",
                    "message": f"Domain '{from_domain}' is {dist} edit(s) from '{legit}'",
                    "legitimate_domains": domains,
                })
                break

        # Check if brand name appears in display name but domain doesn't match
        if brand_lower in display_name and from_lower not in domains:
            detections.append({
                "brand": brand,
                "type": "DISPLAY_NAME_IMPERSONATION",
                "severity": "MEDIUM",
                "message": f"Display name contains '{brand}' but sender domain is '{from_domain}'",
                "legitimate_domains": domains,
            })

    return {
        "detected": len(detections) > 0,
        "count": len(detections),
        "detections": detections,
    }
