import pytest
from analyzer.headers import parse_headers, check_mismatch, detect_unicode_spoofing
from analyzer.domain import detect_brand_impersonation, check_lookalike
from analyzer.risk import calculate_risk

def test_header_parsing():
    raw = (
        "From: Alice <alice@example.com>\n"
        "To: Bob <bob@example.com>\n"
        "Message-ID: <123@example.com>\n"
        "Date: Thu, 11 Jun 2026 12:00:00 +0000"
    )
    parsed = parse_headers(raw)
    assert parsed["from"] == "Alice <alice@example.com>"
    assert parsed["domains"]["from"] == "example.com"
    assert parsed["date"] == "Thu, 11 Jun 2026 12:00:00 +0000"

def test_mismatch_detection():
    parsed = {
        "from": "Alice <alice@example.com>",
        "reply_to": "Hacker <hacker@evil.com>",
        "return_path": "<bounce@evil.com>",
        "domains": {
            "from": "example.com",
            "reply_to": "evil.com",
            "return_path": "evil.com"
        }
    }
    mismatch = check_mismatch(parsed)
    assert mismatch["has_mismatch"] is True
    assert len(mismatch["issues"]) == 2

def test_unicode_spoofing():
    # Cyrillic 'a' looks like Latin 'a'
    spoofed = "аdmin@example.com" 
    result = detect_unicode_spoofing(spoofed)
    assert result["detected"] is True
    assert result["findings"][0]["character"] == "а"

def test_brand_impersonation():
    # Typo of google
    result = detect_brand_impersonation("g00gle.com", "Google Support <support@g00gle.com>")
    assert result["detected"] is True
    assert result["detections"][0]["brand"] == "Google"

def test_lookalike():
    result = check_lookalike("paypa1.com", "paypal.com")
    assert result["warning"] is True
    assert result["distance"] <= 2
