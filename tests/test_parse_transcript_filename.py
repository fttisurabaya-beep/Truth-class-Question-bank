import sys
import os
sys.path.insert(0, os.path.join(os.path.dirname(__file__), "..", "scripts"))

from parse_transcript_filename import parse_transcript_filename


def test_parses_full_title_with_trainer():
    result = parse_transcript_filename("TRUTH CLASS JULDES 2026 R7 - SBY (PAULUS O)")
    assert result == {
        "period": "JULDES 2026",
        "week": 7,
        "campus": "SBY",
        "trainer": "PAULUS O",
    }


def test_parses_title_without_trainer():
    result = parse_transcript_filename("TRUTH CLASS JULDES 2026 R3 - SENTUL")
    assert result == {
        "period": "JULDES 2026",
        "week": 3,
        "campus": "SENTUL",
        "trainer": None,
    }


def test_rejects_unrecognized_title():
    try:
        parse_transcript_filename("some random file name")
        assert False, "expected ValueError"
    except ValueError:
        pass


def test_parses_shared_instance_with_no_campus_token():
    result = parse_transcript_filename("TRUTH CLASS JULDES 2026 R3 - ISAAC KWOON")
    assert result == {
        "period": "JULDES 2026",
        "week": 3,
        "campus": "SHARED",
        "trainer": "ISAAC KWOON",
    }


def test_parses_full_title_with_trainer_regression():
    result = parse_transcript_filename("TRUTH CLASS JULDES 2026 R7 - SBY (PAULUS O)")
    assert result == {
        "period": "JULDES 2026",
        "week": 7,
        "campus": "SBY",
        "trainer": "PAULUS O",
    }


def test_parses_bare_campus_without_trainer_regression():
    result = parse_transcript_filename("TRUTH CLASS JULDES 2026 R3 - SENTUL")
    assert result == {
        "period": "JULDES 2026",
        "week": 3,
        "campus": "SENTUL",
        "trainer": None,
    }
