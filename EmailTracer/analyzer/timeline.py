"""Investigation timeline construction from email headers."""

from __future__ import annotations

import re
from datetime import datetime
from email.utils import parsedate_to_datetime
from typing import Any


def _parse_timestamp(raw: str) -> str | None:
    """Try to parse a date string into ISO format. Returns None on failure."""
    raw = raw.strip()
    if not raw:
        return None

    # Try email-style date parsing first (RFC 2822)
    try:
        dt = parsedate_to_datetime(raw)
        return dt.isoformat()
    except Exception:
        pass

    # Try common formats
    for fmt in (
        "%a, %d %b %Y %H:%M:%S %z",
        "%d %b %Y %H:%M:%S %z",
        "%Y-%m-%d %H:%M:%S %z",
        "%a, %d %b %Y %H:%M:%S",
        "%d %b %Y %H:%M:%S",
    ):
        try:
            dt = datetime.strptime(raw, fmt)
            return dt.isoformat()
        except ValueError:
            continue

    return None


def _extract_received_event(header: str, index: int) -> dict[str, Any]:
    """Parse a single Received header into a timeline event."""
    event: dict[str, Any] = {
        "type": "relay",
        "hop": index,
    }

    # Extract 'from' hostname
    from_match = re.search(r"from\s+(\S+)", header, re.IGNORECASE)
    if from_match:
        event["from_host"] = from_match.group(1)

    # Extract 'by' hostname
    by_match = re.search(r"by\s+(\S+)", header, re.IGNORECASE)
    if by_match:
        event["by_host"] = by_match.group(1)
        event["hostname"] = by_match.group(1)

    # Extract IP
    ip_match = re.search(r"\[(\d{1,3}\.\d{1,3}\.\d{1,3}\.\d{1,3})\]", header)
    if ip_match:
        event["ip"] = ip_match.group(1)

    # Extract protocol
    proto_match = re.search(r"with\s+(\S+)", header, re.IGNORECASE)
    if proto_match:
        event["protocol"] = proto_match.group(1)

    # Extract timestamp (after semicolon)
    ts_match = re.search(r";\s*(.+)$", header)
    if ts_match:
        raw_ts = ts_match.group(1).strip()
        parsed = _parse_timestamp(raw_ts)
        event["timestamp"] = parsed or raw_ts
        event["timestamp_raw"] = raw_ts
        event["timestamp_parsed"] = parsed is not None

    # Build description
    from_part = event.get("from_host", "unknown")
    by_part = event.get("by_host", "unknown")
    proto = event.get("protocol", "")
    proto_str = f" via {proto}" if proto else ""
    event["description"] = f"Relayed from {from_part} to {by_part}{proto_str}"

    return event


def build_timeline(
    date_header: str,
    received_headers: list[str],
    subject: str = "",
) -> dict[str, Any]:
    """Build a chronological investigation timeline from email headers.

    Received headers are listed newest-first in the raw email, so we
    reverse them for chronological order. The Date header represents
    when the message was composed.
    """
    events: list[dict[str, Any]] = []

    # Event 0: Email composition (from Date header)
    if date_header:
        composed_ts = _parse_timestamp(date_header)
        events.append({
            "type": "composed",
            "hop": 0,
            "timestamp": composed_ts or date_header,
            "timestamp_raw": date_header,
            "timestamp_parsed": composed_ts is not None,
            "hostname": "sender",
            "description": f"Email composed{f': {subject[:80]}' if subject else ''}",
        })

    # Parse Received headers in chronological order (reversed)
    reversed_received = list(reversed(received_headers or []))
    for i, header in enumerate(reversed_received):
        event = _extract_received_event(header, i + 1)

        # Label first and last hops specially
        if i == 0:
            event["type"] = "first_relay"
            event["description"] = f"First relay: {event.get('description', '')}"
        elif i == len(reversed_received) - 1:
            event["type"] = "final_delivery"
            event["description"] = f"Final delivery: {event.get('description', '')}"
        else:
            event["type"] = "intermediate_relay"

        events.append(event)

    # Calculate transit times between hops
    _calculate_delays(events)

    return {
        "events": events,
        "total_hops": len(received_headers or []),
        "has_timestamps": any(e.get("timestamp_parsed") for e in events),
    }


def _calculate_delays(events: list[dict[str, Any]]) -> None:
    """Calculate delay between consecutive events with valid timestamps."""
    prev_dt: datetime | None = None

    for event in events:
        if not event.get("timestamp_parsed"):
            event["delay_seconds"] = None
            prev_dt = None
            continue

        try:
            current_dt = datetime.fromisoformat(event["timestamp"])
            if prev_dt is not None:
                delta = (current_dt - prev_dt).total_seconds()
                event["delay_seconds"] = delta
                if delta > 3600:
                    event["delay_warning"] = f"Unusual delay: {delta / 3600:.1f} hours"
                elif delta < 0:
                    event["delay_warning"] = f"Timestamp went backwards by {abs(delta):.0f}s — possible clock skew"
            else:
                event["delay_seconds"] = None
            prev_dt = current_dt
        except (ValueError, TypeError):
            event["delay_seconds"] = None
            prev_dt = None
