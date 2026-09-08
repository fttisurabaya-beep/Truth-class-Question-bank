import re

KNOWN_CAMPUSES = {"SBY", "SENTUL"}

_PATTERN = re.compile(
    r'^TRUTH CLASS (?P<period>[A-Z]+ \d{4}) R(?P<week>\d+) - (?P<tail>.+)$'
)

_TRAINER_SUFFIX = re.compile(r'^(?P<name>[A-Z]+) \((?P<trainer>[^)]+)\)$')


def parse_transcript_filename(title):
    """Parse a Truth Class transcript document title into its parts.

    Supported formats:
      - "TRUTH CLASS <PERIOD> R<week> - <CAMPUS> (<trainer>)"
        A known campus token (see KNOWN_CAMPUSES) followed by an optional
        trainer name in parentheses, e.g.
        "TRUTH CLASS JULDES 2026 R7 - SBY (PAULUS O)".
      - "TRUTH CLASS <PERIOD> R<week> - <CAMPUS>"
        A known campus token with no trainer, e.g.
        "TRUTH CLASS JULDES 2026 R3 - SENTUL". trainer is None.
      - "TRUTH CLASS <PERIOD> R<week> - <NAME>"
        No known campus token (no parens, no recognized single-word
        campus) — this is a shared instance, meaning one recording
        applies to both campuses because the trainer is international
        and teaches both identically, e.g.
        "TRUTH CLASS JULDES 2026 R3 - ISAAC KWOON". campus is the
        literal string "SHARED" and trainer is the full name.

    Raises ValueError if the title doesn't match any expected format.
    """
    match = _PATTERN.match(title.strip())
    if not match:
        raise ValueError(f"unrecognized transcript filename: {title!r}")

    period = match.group("period")
    week = int(match.group("week"))
    tail = match.group("tail")

    suffix_match = _TRAINER_SUFFIX.match(tail)
    if suffix_match and suffix_match.group("name") in KNOWN_CAMPUSES:
        return {
            "period": period,
            "week": week,
            "campus": suffix_match.group("name"),
            "trainer": suffix_match.group("trainer"),
        }

    if tail in KNOWN_CAMPUSES:
        return {
            "period": period,
            "week": week,
            "campus": tail,
            "trainer": None,
        }

    if "(" in tail or ")" in tail:
        raise ValueError(f"unrecognized transcript filename: {title!r}")

    return {
        "period": period,
        "week": week,
        "campus": "SHARED",
        "trainer": tail,
    }
