import re

_PATTERN = re.compile(
    r'^TRUTH CLASS (?P<period>[A-Z]+ \d{4}) R(?P<week>\d+) - (?P<campus>[A-Z]+)'
    r'(?: \((?P<trainer>[^)]+)\))?$'
)


def parse_transcript_filename(title):
    """Parse a Truth Class transcript document title into its parts.

    Expected format: "TRUTH CLASS <PERIOD> R<week> - <CAMPUS> (<trainer>)"
    The trainer group is optional (omitted when not present in the title).
    Raises ValueError if the title doesn't match the expected format.
    """
    match = _PATTERN.match(title.strip())
    if not match:
        raise ValueError(f"unrecognized transcript filename: {title!r}")
    return {
        "period": match.group("period"),
        "week": int(match.group("week")),
        "campus": match.group("campus"),
        "trainer": match.group("trainer"),
    }
