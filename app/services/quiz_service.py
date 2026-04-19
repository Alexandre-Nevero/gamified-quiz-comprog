import re


def normalize_answer(s: str) -> str:
    """Normalize a fill-in-the-blank answer for lenient comparison.

    Steps applied in order:
        1. Strip leading/trailing whitespace
        2. Convert to lowercase
        3. Collapse multiple consecutive spaces into a single space
        4. Strip trailing semicolons (and any whitespace that follows them)

    The function is pure (no side effects) and idempotent:
        normalize_answer(normalize_answer(s)) == normalize_answer(s)

    Examples:
        >>> normalize_answer("  Hello  World;  ")
        'hello world'
        >>> normalize_answer('printf( "hello" );')
        'printf( "hello" )'
        >>> normalize_answer("  INT  ")
        'int'
    """
    s = s.strip()
    s = s.lower()
    s = re.sub(r" {2,}", " ", s)
    s = s.rstrip(";")
    return s
