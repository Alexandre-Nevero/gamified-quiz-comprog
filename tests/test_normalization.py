"""Unit tests for normalize_answer in app/services/quiz_service.py."""
import pytest

from app.services.quiz_service import normalize_answer


# ---------------------------------------------------------------------------
# Whitespace stripping
# ---------------------------------------------------------------------------

def test_strips_leading_whitespace():
    """Leading whitespace is removed."""
    assert normalize_answer("   hello") == "hello"


def test_strips_trailing_whitespace():
    """Trailing whitespace is removed."""
    assert normalize_answer("hello   ") == "hello"


def test_strips_both_ends():
    """Both leading and trailing whitespace are removed."""
    assert normalize_answer("  hello  ") == "hello"


def test_strips_tabs_and_newlines():
    """Tabs and newlines at the edges are stripped."""
    assert normalize_answer("\t hello \n") == "hello"


# ---------------------------------------------------------------------------
# Lowercase conversion
# ---------------------------------------------------------------------------

def test_converts_to_lowercase():
    """All characters are converted to lowercase."""
    assert normalize_answer("Hello World") == "hello world"


def test_all_uppercase():
    """All-uppercase input is lowercased."""
    assert normalize_answer("INT") == "int"


def test_mixed_case():
    """Mixed-case input is fully lowercased."""
    assert normalize_answer("Printf") == "printf"


# ---------------------------------------------------------------------------
# Collapsing multiple spaces
# ---------------------------------------------------------------------------

def test_collapses_double_spaces():
    """Two consecutive spaces are collapsed to one."""
    assert normalize_answer("hello  world") == "hello world"


def test_collapses_many_spaces():
    """Many consecutive spaces are collapsed to one."""
    assert normalize_answer("a     b") == "a b"


def test_collapses_spaces_after_strip():
    """Internal multiple spaces are collapsed even when edges are also stripped."""
    assert normalize_answer("  hello   world  ") == "hello world"


# ---------------------------------------------------------------------------
# Trailing semicolon stripping
# ---------------------------------------------------------------------------

def test_strips_trailing_semicolon():
    """A trailing semicolon is removed."""
    assert normalize_answer("return 0;") == "return 0"


def test_strips_trailing_semicolon_with_whitespace():
    """Trailing semicolon after whitespace is removed (whitespace stripped first)."""
    assert normalize_answer('printf( "hello" );') == 'printf( "hello" )'


def test_no_semicolon_unchanged():
    """Input without a trailing semicolon is not modified."""
    assert normalize_answer("return 0") == "return 0"


def test_semicolon_in_middle_preserved():
    """A semicolon in the middle of the string is preserved."""
    result = normalize_answer("a; b")
    assert result == "a; b"


# ---------------------------------------------------------------------------
# Idempotency
# ---------------------------------------------------------------------------

def test_idempotent_plain_string():
    """normalize(normalize(s)) == normalize(s) for a plain string."""
    s = "Hello World"
    assert normalize_answer(normalize_answer(s)) == normalize_answer(s)


def test_idempotent_with_semicolon():
    """normalize is idempotent when input has a trailing semicolon."""
    s = "return 0;"
    assert normalize_answer(normalize_answer(s)) == normalize_answer(s)


def test_idempotent_with_extra_spaces():
    """normalize is idempotent when input has extra internal spaces."""
    s = "  hello   world  "
    assert normalize_answer(normalize_answer(s)) == normalize_answer(s)


def test_idempotent_with_mixed_case_and_semicolon():
    """normalize is idempotent for mixed-case input with trailing semicolon."""
    s = '  Printf( "Hello" );  '
    assert normalize_answer(normalize_answer(s)) == normalize_answer(s)


def test_idempotent_empty_string():
    """normalize is idempotent for an empty string."""
    s = ""
    assert normalize_answer(normalize_answer(s)) == normalize_answer(s)


def test_idempotent_already_normalized():
    """normalize is idempotent when input is already normalized."""
    s = "int main"
    assert normalize_answer(normalize_answer(s)) == normalize_answer(s)
