def calculate_level(xp: int) -> int:
    """Return the level (1–5) corresponding to the given XP value.

    Thresholds:
        Level 1:    0 –  99 XP
        Level 2:  100 – 249 XP
        Level 3:  250 – 499 XP
        Level 4:  500 – 999 XP
        Level 5: 1000+    XP
    """
    if xp >= 1000:
        return 5
    if xp >= 500:
        return 4
    if xp >= 250:
        return 3
    if xp >= 100:
        return 2
    return 1
