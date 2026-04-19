# Design Document: CompProg 2 Quiz App

## Overview

The CompProg 2 Quiz App is a gamified web application for practicing C-language concepts. It is a single-service deployment: a FastAPI application that serves both a REST API and static HTML/JS frontend files. SQLite is the sole database. The app supports guest play (no account needed) and registered-user play (XP, levels, leaderboard).

**Design philosophy:** Keep it simple. This is a beginner-friendly codebase. Each component does one job. No frameworks beyond FastAPI and vanilla JS. Patterns are chosen for readability over cleverness.

### High-Level User Flows

```
Guest:
  Visit → Select Topic + Difficulty → Answer 10 Questions → See Summary (XP displayed, not saved)
    └─ Optional: Register or Login with guest_xp → XP transferred to account

Registered User:
  Register / Login → Select Topic + Difficulty → Answer 10 Questions → See Summary + XP update → Leaderboard
```

### Key Constraints

- 10 questions per quiz session
- XP per correct answer: Easy = 10, Medium = 20, Hard = 30
- Levels are cosmetic (Level 1–5 based on XP thresholds)
- Leaderboard: top 10 by XP, alphabetical tiebreak
- Fill-in-the-blank: lenient normalization (trim, lowercase, collapse spaces, strip trailing semicolons)
- Hard difficulty: drag-and-drop code arrangement (no code execution)

---

## Architecture

The application follows a simple three-layer architecture that a beginner can reason about easily.

```
┌─────────────────────────────────────────────────────┐
│                    Browser (Client)                  │
│         HTML + Vanilla JS (retro-modern UI)          │
└──────────────────────┬──────────────────────────────┘
                       │ HTTP (JSON API + static files)
┌──────────────────────▼──────────────────────────────┐
│               FastAPI Application                    │
│  ┌──────────┐ ┌────────────┐ ┌────────────────────┐ │
│  │  Auth    │ │Quiz Engine │ │ Leaderboard/XP     │ │
│  │  Router  │ │  Router    │ │     Router         │ │
│  └────┬─────┘ └─────┬──────┘ └────────┬───────────┘ │
│       │             │                 │              │
│  ┌────▼─────────────▼─────────────────▼───────────┐ │
│  │              Service Layer                      │ │
│  │  auth_service  quiz_service  xp_service         │ │
│  │  leaderboard_service                            │ │
│  └────────────────────┬────────────────────────────┘ │
│                       │                              │
│  ┌────────────────────▼────────────────────────────┐ │
│  │           SQLite Database (via SQLAlchemy)       │ │
│  └─────────────────────────────────────────────────┘ │
└─────────────────────────────────────────────────────┘
```

**Layers:**

1. **Routers** — FastAPI route handlers. Thin: validate input, call a service, return a response. *Beginner note: think of these as the "front door" for each feature.*
2. **Services** — Business logic (password hashing, XP calculation, answer normalization, question selection). Pure Python functions where possible. *Beginner note: this is where the real work happens.*
3. **Database** — SQLAlchemy ORM models + a single SQLite file. *Beginner note: SQLAlchemy lets you write Python classes instead of raw SQL.*

**Static files** are served by FastAPI's `StaticFiles` mount. A catch-all route returns `index.html` for any non-API path, enabling client-side navigation.

---

## Components and Interfaces

### Auth Component

Handles registration, login, logout, and session validation.

**Endpoints:**

| Method | Path | Auth Required | Description |
|--------|------|---------------|-------------|
| POST | `/api/auth/register` | No | Create a new user account |
| POST | `/api/auth/login` | No | Log in and receive a session token |
| POST | `/api/auth/logout` | Yes | Invalidate the current session token |

**Session tokens:** Simple random tokens (e.g., `secrets.token_hex(32)`) stored in the `sessions` table with a user reference. No JWT needed — a database lookup on each request is fine for this scale. *Beginner note: JWT is more complex; a stored token is easier to understand and debug.*

**Password hashing:** `passlib` with `bcrypt`. Passwords are never stored in plaintext.

**Auth dependency:** A FastAPI dependency `get_current_user(token: str)` that looks up the token in the sessions table and returns the user, or raises HTTP 401. An optional variant `get_optional_user` returns `None` for guests instead of raising.

**Guest XP transfer:** Both `/api/auth/register` and `/api/auth/login` accept an optional `guest_xp` field (non-negative integer, defaults to 0) in the request body. If provided and valid, the value is added to the user's stored XP immediately after successful registration or login. This allows the frontend to pass accumulated client-side guest XP so it is not lost when the guest authenticates.

---

### Quiz Component

Handles session creation, question delivery, and answer evaluation.

**Endpoints:**

| Method | Path | Auth Required | Description |
|--------|------|---------------|-------------|
| POST | `/api/quiz/start` | No (optional) | Start a new quiz session |
| GET | `/api/quiz/{session_id}/question/{n}` | No | Get question n (0-indexed) |
| POST | `/api/quiz/{session_id}/answer/{n}` | No | Submit answer for question n |
| GET | `/api/quiz/{session_id}/summary` | No | Get session summary |

**Quiz session lifecycle:**

```
start → [question 0..9] → summary
         ↑ answer each question before advancing
```

A `quiz_sessions` table tracks the session state: which questions were selected, which answers were submitted, and whether the session belongs to a registered user.

**Question selection:** On `start`, the service queries the `questions` table filtered by topic + difficulty, shuffles the results, and picks 10. The selected question IDs are stored in the session. *Beginner note: Python's `random.sample` handles the shuffle.*

**Answer evaluation logic (service layer):**

- *Multiple Choice / True/False:* Compare submitted answer ID or string directly against `correct_answer`.
- *Fill-in-the-Blank:* Normalize both sides (trim → lowercase → collapse spaces → strip trailing `;`) then compare.
- *Code Arrangement:* Compare submitted list of `code_block` IDs (in order) against the stored `correct_order` list.

**XP award:** After a correct answer, if the session belongs to a registered user, call `xp_service.award_xp(user_id, difficulty)`. For guest sessions, XP is not awarded server-side; instead, the session summary always includes an `xp_earned` field so the frontend can display it and optionally store it client-side (localStorage) for later transfer on registration/login.

---

### XP and Level Component

Tracks cumulative XP and derives the cosmetic level.

**Endpoints:**

| Method | Path | Auth Required | Description |
|--------|------|---------------|-------------|
| GET | `/api/users/me` | Yes | Get current user's XP, level, username |

XP is stored directly on the `users` table. Level is computed on the fly (not stored) using a pure function:

```python
def calculate_level(xp: int) -> int:
    if xp >= 1000: return 5
    if xp >= 500:  return 4
    if xp >= 250:  return 3
    if xp >= 100:  return 2
    return 1
```

*Beginner note: storing level separately would create a risk of it going out of sync with XP. Computing it from XP is simpler and always correct.*

**Guest XP (client-side only):** Guest XP is never written to the database. The frontend calculates it locally from the session summary's `xp_earned` field and stores it in `localStorage` (key: `guest_xp`). When the guest registers or logs in, the frontend reads `guest_xp` from `localStorage`, passes it as the `guest_xp` field in the register/login request body, and clears the `localStorage` key after a successful response. If the guest leaves without authenticating, the value is simply lost when the browser storage is cleared.

---

### Leaderboard Component

Returns the top 10 users by XP.

**Endpoints:**

| Method | Path | Auth Required | Description |
|--------|------|---------------|-------------|
| GET | `/api/leaderboard` | No | Top 10 users by XP |

The query is a simple `SELECT ... ORDER BY xp DESC, username ASC LIMIT 10`. The response includes `username`, `xp`, and `level` (computed). No caching needed at this scale.

---

### Frontend (Static Files)

Plain HTML + Vanilla JS. No build step, no framework. Files are served from a `static/` directory.

**Pages / views (single-page app with JS routing):**

| View | Description |
|------|-------------|
| `index.html` | Shell page; JS swaps content |
| Home | Topic + difficulty selector |
| Quiz | Question display + answer input |
| Summary | Score + XP earned |
| Leaderboard | Top 10 table |
| Login / Register | Auth forms |
| Profile | Username, XP, level badge |

**Retro aesthetic implementation:**
- Font: [Press Start 2P](https://fonts.google.com/specimen/Press+Start+2P) (Google Fonts, free)
- Color palette: `#00ff41` (terminal green) on `#0d0d0d` (near-black)
- Scanline effect: a CSS `::before` pseudo-element with a repeating linear gradient overlay on the body
- Drag-and-drop for Code Arrangement: HTML5 native drag-and-drop API (no library needed) *Beginner note: the HTML5 drag-and-drop API is built into the browser — no extra dependencies.*

---

## Data Models

All models use SQLAlchemy ORM. The SQLite file is created at startup if it does not exist.

### `users` table

```
users
├── id          INTEGER  PRIMARY KEY AUTOINCREMENT
├── username    TEXT     NOT NULL UNIQUE
├── password    TEXT     NOT NULL          -- bcrypt hash
└── xp          INTEGER  NOT NULL DEFAULT 0
```

*Level is derived from `xp` at query time — not stored.*

---

### `sessions` table

```
sessions
├── id          INTEGER  PRIMARY KEY AUTOINCREMENT
├── token       TEXT     NOT NULL UNIQUE   -- secrets.token_hex(32)
├── user_id     INTEGER  NOT NULL REFERENCES users(id)
└── created_at  TEXT     NOT NULL          -- ISO 8601 timestamp
```

*Beginner note: no expiry logic for now — tokens are valid until logout. This is fine for a learning project.*

---

### `questions` table

```
questions
├── id              INTEGER  PRIMARY KEY AUTOINCREMENT
├── topic           TEXT     NOT NULL   -- e.g. "Arrays"
├── difficulty      TEXT     NOT NULL   -- "Easy" | "Medium" | "Hard"
├── question_type   TEXT     NOT NULL   -- "multiple_choice" | "true_false" | "fill_blank" | "code_arrangement"
├── question_text   TEXT     NOT NULL
└── correct_answer  TEXT     NOT NULL   -- see notes below
```

**`correct_answer` encoding by type:**
- `multiple_choice`: the letter of the correct option, e.g. `"B"`
- `true_false`: `"True"` or `"False"`
- `fill_blank`: the expected answer string (normalization applied at eval time)
- `code_arrangement`: not used directly — see `code_blocks` table

---

### `choices` table (Multiple Choice options)

```
choices
├── id           INTEGER  PRIMARY KEY AUTOINCREMENT
├── question_id  INTEGER  NOT NULL REFERENCES questions(id)
├── label        TEXT     NOT NULL   -- "A" | "B" | "C" | "D"
└── text         TEXT     NOT NULL
```

---

### `code_blocks` table (Code Arrangement blocks)

```
code_blocks
├── id            INTEGER  PRIMARY KEY AUTOINCREMENT
├── question_id   INTEGER  NOT NULL REFERENCES questions(id)
└── correct_index INTEGER  NOT NULL   -- 0-based position in correct order
└── content       TEXT     NOT NULL   -- the line/block of C code
```

The correct order is reconstructed by sorting blocks by `correct_index`. When serving a question, blocks are shuffled before sending to the client.

---

### `quiz_sessions` table

```
quiz_sessions
├── id              INTEGER  PRIMARY KEY AUTOINCREMENT
├── user_id         INTEGER  NULLABLE REFERENCES users(id)  -- NULL for guests
├── topic           TEXT     NOT NULL
├── difficulty      TEXT     NOT NULL
├── question_ids    TEXT     NOT NULL   -- JSON array of 10 question IDs
├── answers         TEXT     NOT NULL DEFAULT '[]'  -- JSON array of submitted answers
└── completed       INTEGER  NOT NULL DEFAULT 0     -- 0 = in progress, 1 = done
```

*Beginner note: storing `question_ids` and `answers` as JSON strings in SQLite is a pragmatic shortcut. For a larger app you'd use a join table, but this is simpler to start with.*

---

### Seed Script

A standalone `seed.py` script populates the `questions`, `choices`, and `code_blocks` tables. It is idempotent (checks for existing data before inserting). Run once after deployment or after wiping the database.

---

## Correctness Properties

*A property is a characteristic or behavior that should hold true across all valid executions of a system — essentially, a formal statement about what the system should do. Properties serve as the bridge between human-readable specifications and machine-verifiable correctness guarantees.*


### Property 1: Registration creates a user with a hashed password and initialized XP

*For any* valid username (3–32 characters) and valid password (6+ characters) that does not already exist in the database, calling the registration endpoint should create a user record where the stored password field is a bcrypt hash (not equal to the plaintext password) and the user's XP is initialized to 0 (Level 1).

**Validates: Requirements 1.2, 1.6, 1.7**

---

### Property 2: Registration rejects all invalid inputs

*For any* registration request where the username is shorter than 3 or longer than 32 characters, or the password is shorter than 6 characters, or the username already exists in the database, the registration endpoint should return an error response and no new user record should be created.

**Validates: Requirements 1.3, 1.4, 1.5**

---

### Property 3: Login/logout token lifecycle

*For any* registered user, logging in with correct credentials should return a non-empty session token; using that token on a protected endpoint should succeed (HTTP 200); after logging out, using the same token on a protected endpoint should return HTTP 401. Logging in with incorrect credentials should return an error and no token.

**Validates: Requirements 2.2, 2.3, 2.4, 2.5**

---

### Property 4: Question types in a session match the selected difficulty

*For any* quiz session started with a given difficulty level, every question in that session should have a question type that is permitted for that difficulty: Easy sessions contain only `multiple_choice` and `true_false`; Medium sessions contain only `multiple_choice`, `true_false`, and `fill_blank`; Hard sessions contain only `multiple_choice`, `true_false`, `fill_blank`, and `code_arrangement`.

**Validates: Requirements 3.5, 3.6, 3.7**

---

### Property 5: Quiz session always contains exactly 10 questions

*For any* valid topic and difficulty combination, starting a quiz session should result in exactly 10 questions being selected and stored for that session.

**Validates: Requirements 4.1**

---

### Property 6: Answer evaluation is correct for all question types

*For any* Multiple Choice, True/False, or Code Arrangement question, submitting the stored correct answer should return `correct = True`; submitting any other valid but incorrect answer should return `correct = False`.

**Validates: Requirements 4.3, 4.5**

---

### Property 7: Fill-in-the-blank normalization is idempotent and lenient

*For any* answer string `s`, `normalize(normalize(s)) == normalize(s)` (idempotence). Additionally, *for any* correct answer string, submitting it with leading/trailing whitespace, mixed case, multiple internal spaces, or a trailing semicolon should still be evaluated as correct.

**Validates: Requirements 4.4**

---

### Property 8: Session summary accurately reflects answers given

*For any* completed quiz session where a known number of questions were answered correctly, the session summary should report exactly that number as the correct count, the total as 10, and the XP earned as the sum of XP for each correct answer at the session's difficulty level.

**Validates: Requirements 4.8**

---

### Property 9: Guest sessions never persist XP to the database

*For any* quiz session completed by a guest (unauthenticated user), no user's XP value in the database should change as a result of that session completing. The session summary response should still include an `xp_earned` field reflecting the XP the guest would have earned.

**Validates: Requirements 4.9, 5.9**

---

### Property 10: XP awarded matches difficulty

*For any* registered user answering a question correctly, the XP awarded should be exactly 10 for Easy, 20 for Medium, and 30 for Hard. For any incorrect answer, the XP awarded should be 0.

**Validates: Requirements 5.1, 5.2, 5.3, 5.4**

---

### Property 11: Cumulative XP accumulates correctly across answers

*For any* sequence of correct answers by a registered user across one or more sessions, the user's total XP should equal the sum of all individual XP awards from those answers.

**Validates: Requirements 5.5**

---

### Property 12: Level is correctly derived from XP at all thresholds

*For any* XP value, `calculate_level(xp)` should return: 1 for 0–99, 2 for 100–249, 3 for 250–499, 4 for 500–999, 5 for 1000+. When an XP update causes a level increase, the XP award response should include the new level value.

**Validates: Requirements 5.6, 5.7, 5.8**

---

### Property 13: Leaderboard is correctly ordered and complete

*For any* set of registered users with varying XP values, the leaderboard endpoint should return at most 10 entries ordered by XP descending; users with equal XP should be ordered alphabetically by username; every entry should contain `username`, `xp`, and `level` fields.

**Validates: Requirements 6.1, 6.2, 6.3**

---

### Property 14: Question retrieval respects topic and difficulty filters

*For any* topic and difficulty, all questions returned by the quiz engine for a session should have exactly that topic and that difficulty — no questions from other topics or difficulties should appear.

**Validates: Requirements 7.7**

---

### Property 15: Code arrangement correct order round-trip

*For any* Code Arrangement question, sorting its stored `code_blocks` by `correct_index` ascending should reconstruct the original correct sequence of code lines.

**Validates: Requirements 8.2, 8.4**

---

### Property 16: Guest XP transfer on registration/login

*For any* guest session with accumulated XP (a non-negative integer `guest_xp`), registering a new account or logging in to an existing account with that `guest_xp` value should result in the user's stored XP increasing by exactly `guest_xp`. The increase should be atomic: the final XP should equal the user's XP before the request plus `guest_xp`.

**Validates: Requirements 5.11**

---

## Error Handling

### HTTP Error Responses

All API errors return JSON with a consistent shape:

```json
{ "detail": "Human-readable error message" }
```

This is FastAPI's default `HTTPException` format — no custom error wrapper needed. *Beginner note: FastAPI handles this automatically when you `raise HTTPException(status_code=..., detail=...)`.*

### Error Scenarios and Responses

| Scenario | HTTP Status | Detail message |
|----------|-------------|----------------|
| Username already taken | 400 | "Username already taken" |
| Username too short/long | 422 | FastAPI validation error |
| Password too short | 422 | FastAPI validation error |
| Invalid credentials | 401 | "Invalid username or password" |
| Missing/invalid token | 401 | "Not authenticated" |
| Quiz session not found | 404 | "Session not found" |
| Question index out of range | 404 | "Question not found" |
| Not enough questions in bank | 400 | "Not enough questions available for this topic and difficulty" |
| Invalid topic or difficulty | 422 | FastAPI validation error |
| Invalid `guest_xp` value (negative) | 422 | FastAPI validation error |

### Input Validation

FastAPI + Pydantic handle most validation automatically via request schemas. Enum types for `topic` and `difficulty` ensure only valid values are accepted. Username and password length constraints are declared in the Pydantic model with `min_length`/`max_length`.

### Database Errors

SQLAlchemy exceptions are caught at the service layer and re-raised as `HTTPException(500)` with a generic message. The original exception is logged server-side. *Beginner note: never expose raw database error messages to the client — they can leak schema details.*

### Guest vs. Registered User

The `get_optional_user` dependency returns `None` for unauthenticated requests instead of raising 401. Services check `if user is None` to decide whether to skip XP persistence.

---

## Testing Strategy

### Overview

Two complementary layers of testing:

1. **Unit tests** — test individual functions (normalization, level calculation, XP award logic) with specific examples and edge cases.
2. **Property-based tests** — test universal properties across many generated inputs using [Hypothesis](https://hypothesis.readthedocs.io/), the standard Python property-based testing library.

*Beginner note: Hypothesis generates hundreds of random inputs automatically and shrinks failing cases to the smallest example. You write the property; it finds the bugs.*

### Property-Based Testing Setup

```python
# Install
pip install hypothesis pytest

# Minimum iterations per property test
# Hypothesis default is 100 — keep it at default or increase with:
# @settings(max_examples=200)
```

Each property test is tagged with a comment referencing the design property:

```python
# Feature: comprog2-quiz-app, Property 7: Fill-in-the-blank normalization is idempotent and lenient
@given(st.text())
def test_normalize_idempotent(s):
    assert normalize(normalize(s)) == normalize(s)
```

### Property Tests (one per design property)

| Property | Test focus | Hypothesis strategy |
|----------|-----------|---------------------|
| P1: Registration creates hashed user | `register_user()` service function | `st.text(min_size=3, max_size=32)` for username, `st.text(min_size=6)` for password |
| P2: Registration rejects invalid inputs | Validation in `register_user()` | `st.text(max_size=2)` and `st.text(min_size=33)` for bad usernames; `st.text(max_size=5)` for bad passwords |
| P3: Login/logout token lifecycle | `login()`, `logout()`, auth dependency | Fixed valid user + generated credentials |
| P4: Question types match difficulty | `select_questions()` service | `st.sampled_from(["Easy","Medium","Hard"])` |
| P5: Session has exactly 10 questions | `start_session()` service | `st.sampled_from(topics)`, `st.sampled_from(difficulties)` |
| P6: Answer evaluation correctness | `evaluate_answer()` service | Generated question fixtures + correct/incorrect answers |
| P7: Normalization idempotence + leniency | `normalize_answer()` pure function | `st.text()` for idempotence; generated variants for leniency |
| P8: Summary accuracy | `get_summary()` service | Generated answer sequences with known correct counts |
| P9: Guest sessions don't persist XP | Full session flow with `user_id=None`; verify DB unchanged and `xp_earned` present in summary | Generated guest sessions |
| P10: XP matches difficulty | `award_xp()` service | `st.sampled_from(["Easy","Medium","Hard"])` |
| P11: Cumulative XP accumulation | `award_xp()` called multiple times | `st.lists(st.sampled_from(["Easy","Medium","Hard"]))` |
| P12: Level calculation | `calculate_level()` pure function | `st.integers(min_value=0)` |
| P13: Leaderboard ordering | `get_leaderboard()` service | `st.lists(st.builds(User, ...))` |
| P14: Question retrieval filtering | `get_questions_for_session()` | `st.sampled_from(topics)`, `st.sampled_from(difficulties)` |
| P15: Code arrangement round-trip | `reconstruct_correct_order()` | Generated code block lists with shuffled order |
| P16: Guest XP transfer on register/login | `register_user()` and `login_user()` with `guest_xp` param | `st.integers(min_value=0)` for `guest_xp`; generated user fixtures |

### Unit Tests (example-based)

Focus on specific scenarios not covered by property tests:

- Registration endpoint returns correct HTTP status codes
- Login with wrong password returns 401
- Leaderboard accessible without auth token (HTTP 200)
- Session summary shows correct XP for a known answer sequence
- `index.html` is served for non-API routes
- Database schema is created on startup
- Seed script is idempotent (running twice doesn't duplicate questions)

### Test Structure

```
tests/
├── test_auth.py          # Auth service unit + property tests
├── test_quiz.py          # Quiz engine unit + property tests
├── test_xp.py            # XP/level unit + property tests
├── test_leaderboard.py   # Leaderboard unit + property tests
├── test_normalization.py # Fill-in-the-blank normalization property tests
└── conftest.py           # Shared fixtures (in-memory SQLite DB, test client)
```

*Beginner note: `conftest.py` is a pytest file where you put shared setup code. The `TestClient` from FastAPI lets you make HTTP requests to your app in tests without running a real server.*

### Running Tests

```bash
# Run all tests (single execution, no watch mode)
pytest --tb=short

# Run only property tests
pytest -k "property" --tb=short

# Run with verbose Hypothesis output
pytest --hypothesis-show-statistics
```
