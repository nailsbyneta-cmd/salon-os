#!/usr/bin/env python3
"""Extract plain text from an iMessage attributedBody NSAttributedString typedstream blob.

Usage:
    python3 decode-attributed-body.py <hex-string>
    or
    cat blob.hex | python3 decode-attributed-body.py

Background:
    Modern macOS / iOS iMessages store the message body in `message.attributedBody`
    (Apple typedstream / NSArchiver) instead of `message.text`. A naive
    COALESCE(text, attributedBody) returns the binary blob as bytes, which leaks
    `streamtyped...NSAttributedString` markers when written to a text file.

    The typedstream format encodes NSString instances as:
        ... NSString-class-ref ... 0x2B ('+') <length-varint> <utf8-bytes>

    Length encoding:
        single byte 0x00..0x80 → that value
        0x81 <hi> <lo>          → uint16 big-endian
        0x82 <b3> <b2> <b1> <b0>→ uint32 big-endian

    We scan for every `+`-prefixed length-prefix string in the blob, decode each
    as UTF-8, filter out class-name strings, and return the longest remaining
    candidate (which is reliably the message body).
"""

from __future__ import annotations

import sys

METADATA_MARKERS = (
    "NSString",
    "NSDictionary",
    "NSAttributedString",
    "NSMutableString",
    "NSConcreteAttributedString",
    "NSMutableAttributedString",
    "NSObject",
    "NSValue",
    "NSNumber",
    "NSArray",
    "NSMutableArray",
    "NSColor",
    "NSFont",
    "NSParagraphStyle",
    "streamtyped",
    "__kIM",
)

MAX_REASONABLE_STRING_LEN = 65536


def _parse_length(blob: bytes, pos: int) -> tuple[int, int] | None:
    """Parse a typedstream length prefix. Returns (length, text_start) or None."""
    if pos >= len(blob):
        return None
    first = blob[pos]
    if first <= 0x80:
        return first, pos + 1
    if first == 0x81:
        if pos + 3 > len(blob):
            return None
        return int.from_bytes(blob[pos + 1 : pos + 3], "big"), pos + 3
    if first == 0x82:
        if pos + 5 > len(blob):
            return None
        return int.from_bytes(blob[pos + 1 : pos + 5], "big"), pos + 5
    # 0x83 and beyond are unusual for message lengths — skip
    return None


def extract(blob: bytes) -> str:
    if not blob:
        return ""

    candidates: list[str] = []
    pos = 0

    while pos < len(blob):
        plus = blob.find(b"+", pos)
        if plus == -1:
            break
        pos = plus + 1

        parsed = _parse_length(blob, pos)
        if parsed is None:
            continue
        length, text_start = parsed

        if length == 0 or length > MAX_REASONABLE_STRING_LEN:
            continue
        if text_start + length > len(blob):
            continue

        chunk = blob[text_start : text_start + length]

        try:
            text = chunk.decode("utf-8")
        except UnicodeDecodeError:
            continue

        text = text.strip()
        if not text:
            continue

        # Filter out class-identifier strings — they have the same `+` framing
        if any(marker in text for marker in METADATA_MARKERS):
            continue

        candidates.append(text)

    if not candidates:
        return ""

    # The message body is reliably the longest remaining candidate.
    return max(candidates, key=len)


def main() -> int:
    if len(sys.argv) > 1:
        hex_str = sys.argv[1].strip()
    else:
        hex_str = sys.stdin.read().strip()

    if not hex_str:
        return 0

    try:
        data = bytes.fromhex(hex_str)
    except ValueError:
        # Not hex — assume already plain text and pass through.
        print(hex_str)
        return 0

    text = extract(data)
    if text:
        print(text)
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
