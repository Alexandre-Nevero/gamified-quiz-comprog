# Implementation Plan: CompProg 2 Quiz App

## Overview

Build a gamified C-language quiz web app using FastAPI (backend), SQLite via SQLAlchemy (database), and plain HTML + Vanilla JS (frontend). The implementation follows a three-layer architecture (Routers → Services → Database) and is ordered from foundational to complex so a beginner can build confidence incrementally.

Tasks marked `*` are optional (property-based or unit tests) and can be skipped for a faster MVP.

---

## Tasks

- [x] 1. Set up project structure and database foundation
  - Create the directory layout: `app/`, `app/routers/`, `app/services/`, `static/`, `tests/`
  - Create `requirements.txt` with pinned versions: `fastapi`, `uvicorn`, `sqlalchemy`, `passlib[bcrypt]`, `hypothesis`, `pytest`, `pytest-asyncio`
  - Create `app/database.py`: SQLAlchemy engine pointed at `quiz.db`, `SessionLocal` factory, `Base` declarative base, and a `get_db` dependency
  - Create `app/models.py`: define all six ORM models (`User`, `Session`, `Question`, `Choice`, `CodeBlock`, `QuizSession`) matching the schema in the design
  - Create `app/main.py`: initialize FastAPI app, call `Base.metadata.create_all()` on startup, mount `static/` with `StaticFiles`, register routers (stubs for now), and add a catch-all route that returns `index.html`
  - _Requirements: 7.1, 7.2, 7.3, 7.4, 7.5, 10.1, 10.2, 10.3_

- [x] 2. Implement pure utility functions
  - [x] 2.1 Implement `calculate_level(xp: int) -> int` in `app/services/xp_service.py`
    - Return 1/2/3/4/5 based on XP thresholds (0–99, 100–249, 250–499, 500–999, 1000+)
    - _Requirements: 5.6, 5.7_

  - [ ]* 2.2 Write property test for `calculate_level` (Property 12)
    - **Property 12: Level is correctly derived from XP at all thresholds**
    - Use `@given(st.integers(min_value=0))` to verify all threshold boundaries
    - **Validates: Requirements 5.6, 5.7, 5.8**

  - [x] 2.3 Implement `normalize_answer(s: str) -> str` in `app/services/quiz_service.py`
    - Strip leading/trailing whitespace → lowercase → collapse multiple spaces → strip trailing semicolons
    - _Requirements: 4.4_

  - [ ]* 2.4 Write property tests for `normalize_answer` (Property 7)
    - **Property 7: Fill-in-the-blank normalization is idempotent and lenient**
    - Sub-task A: `@given(st.text())` — assert `normalize(normalize(s)) == normalize(s)`
    - Sub-task B: generated variants with extra whitespace, mixed case, trailing `;` — assert all evaluate as correct
    - **Validates: Requirements 4.4**

- [x] 3. Implement the seed script
  - Create `seed.py` at the project root
  - Add at least 15 questions per topic per difficulty (covering all 6 topics × 3 difficulties)
  - Include `choices` rows for every Multiple Choice question (4 choices each, one marked correct)
  - Include `code_blocks` rows for every Code Arrangement question with correct `correct_index` values
  - Make the script idempotent: check for existing data before inserting
  - _Requirements: 7.1, 7.2, 7.3, 7.4, 7.5, 8.1, 8.2, 8.3_

- [x] 4. Implement the Auth service and router
  - [x] 4.1 Implement `register_user` in `app/services/auth_service.py`
    - Validate username length (3–32) and password length (6+); raise `HTTPException(400/422)` on failure
    - Hash password with `passlib` bcrypt; create `User` record with `xp=0`
    - Accept optional `guest_xp: int = 0`; add it to the new user's XP atomically
    - Return the created user
    - _Requirements: 1.1, 1.2, 1.3, 1.4, 1.5, 1.6, 1.7, 5.11_

  - [ ]* 4.2 Write property test for `register_user` — valid inputs (Property 1)
    - **Property 1: Registration creates a user with a hashed password and initialized XP**
    - Use `st.text(min_size=3, max_size=32)` for username, `st.text(min_size=6)` for password
    - Assert stored password ≠ plaintext and `user.xp == 0` (or `== guest_xp` when provided)
    - **Validates: Requirements 1.2, 1.6, 1.7**

  - [ ]* 4.3 Write property test for `register_user` — invalid inputs (Property 2)
    - **Property 2: Registration rejects all invalid inputs**
    - Use `st.text(max_size=2)` and `st.text(min_size=33)` for bad usernames; `st.text(max_size=5)` for bad passwords
    - Assert an `HTTPException` is raised and no user record is created
    - **Validates: Requirements 1.3, 1.4, 1.5**

  - [x] 4.4 Implement `login_user` and `logout_user` in `app/services/auth_service.py`
    - `login_user`: verify password with bcrypt; create a `Session` record with `secrets.token_hex(32)`; add `guest_xp` to user XP if provided; return token
    - `logout_user`: delete the `Session` record for the given token
    - _Requirements: 2.1, 2.2, 2.3, 2.5, 5.11_

  - [ ]* 4.5 Write property test for login/logout token lifecycle (Property 3)
    - **Property 3: Login/logout token lifecycle**
    - Assert login with correct credentials returns a non-empty token; token works on protected endpoint; after logout, same token returns 401; wrong credentials return error
    - **Validates: Requirements 2.2, 2.3, 2.4, 2.5**

  - [x] 4.6 Implement `get_current_user` and `get_optional_user` FastAPI dependencies in `app/dependencies.py`
    - `get_current_user`: look up token in `sessions` table; raise `HTTPException(401)` if not found
    - `get_optional_user`: same lookup but return `None` instead of raising
    - _Requirements: 2.4, 2.6_

  - [x] 4.7 Create `app/routers/auth.py` with POST `/api/auth/register`, `/api/auth/login`, `/api/auth/logout`
    - Thin handlers: validate Pydantic request body, call service, return response
    - Register and login bodies: `username`, `password`, optional `guest_xp` (non-negative int, default 0)
    - _Requirements: 1.1, 2.1, 2.5_

- [x] 5. Checkpoint — Auth layer complete
  - Run `pytest tests/test_auth.py --tb=short` and ensure all tests pass
  - Manually test register + login + logout via `curl` or a REST client
  - Ensure all tests pass, ask the user if questions arise.

- [x] 6. Implement the Quiz service and router
  - [x] 6.1 Implement `select_questions` in `app/services/quiz_service.py`
    - Query `questions` filtered by topic + difficulty; raise `HTTPException(400)` if fewer than 10 found
    - Use `random.sample` to pick exactly 10; return their IDs
    - _Requirements: 3.1, 3.2, 3.3, 4.1, 7.7_

  - [ ]* 6.2 Write property test for `select_questions` — count (Property 5)
    - **Property 5: Quiz session always contains exactly 10 questions**
    - Use `st.sampled_from(topics)` and `st.sampled_from(difficulties)` with a seeded DB
    - Assert `len(result) == 10`
    - **Validates: Requirements 4.1**

  - [ ]* 6.3 Write property test for `select_questions` — topic/difficulty filter (Property 14)
    - **Property 14: Question retrieval respects topic and difficulty filters**
    - Assert every returned question has exactly the requested topic and difficulty
    - **Validates: Requirements 7.7**

  - [x] 6.4 Implement `start_session` in `app/services/quiz_service.py`
    - Call `select_questions`; create a `QuizSession` record with `question_ids` as JSON, `answers='[]'`, `completed=0`
    - Associate `user_id` if a registered user is present; leave `NULL` for guests
    - Return the new session ID
    - _Requirements: 3.4, 3.5, 3.6, 3.7, 4.1_

  - [x] 6.5 Implement `get_question` in `app/services/quiz_service.py`
    - Load the session; parse `question_ids`; fetch question n (0-indexed); raise 404 if out of range
    - For Multiple Choice: include shuffled choices
    - For Code Arrangement: include shuffled code blocks (shuffle before sending, never expose `correct_index`)
    - _Requirements: 4.2, 7.6, 8.4_

  - [ ]* 6.6 Write property test for question type filtering per difficulty (Property 4)
    - **Property 4: Question types in a session match the selected difficulty**
    - Use `st.sampled_from(["Easy","Medium","Hard"])` and assert allowed types per difficulty
    - **Validates: Requirements 3.5, 3.6, 3.7**

  - [x] 6.7 Implement `evaluate_answer` in `app/services/quiz_service.py`
    - Multiple Choice / True/False: direct string comparison against `correct_answer`
    - Fill-in-the-Blank: normalize both sides then compare
    - Code Arrangement: compare submitted list of block IDs against `correct_index` order from DB
    - Append result to session's `answers` JSON array; mark session `completed=1` after question 9
    - If registered user and correct: call `xp_service.award_xp(user_id, difficulty)`
    - Return `{"correct": bool, "correct_answer": ..., "xp_earned": int}`
    - _Requirements: 4.3, 4.4, 4.5, 4.6, 4.7, 5.1, 5.2, 5.3, 5.4_

  - [ ]* 6.8 Write property test for answer evaluation correctness (Property 6)
    - **Property 6: Answer evaluation is correct for all question types**
    - For MC, T/F, Code Arrangement: submitting the stored correct answer returns `correct=True`; any other valid answer returns `correct=False`
    - **Validates: Requirements 4.3, 4.5**

  - [x] 6.9 Implement `get_summary` in `app/services/quiz_service.py`
    - Parse `answers` JSON; count correct answers; compute `xp_earned` as sum of per-answer XP
    - Return `{"correct": int, "total": 10, "xp_earned": int}`
    - Always include `xp_earned` even for guest sessions (frontend uses it for localStorage)
    - _Requirements: 4.8, 4.9, 5.9_

  - [ ]* 6.10 Write property test for session summary accuracy (Property 8)
    - **Property 8: Session summary accurately reflects answers given**
    - Generate answer sequences with known correct counts; assert summary fields match exactly
    - **Validates: Requirements 4.8**

  - [ ]* 6.11 Write property test for guest sessions not persisting XP (Property 9)
    - **Property 9: Guest sessions never persist XP to the database**
    - Run a full guest session; assert no `User.xp` value changed; assert `xp_earned` is present in summary
    - **Validates: Requirements 4.9, 5.9**

  - [x] 6.12 Create `app/routers/quiz.py` with all four quiz endpoints
    - POST `/api/quiz/start` — call `start_session`; use `get_optional_user`
    - GET `/api/quiz/{session_id}/question/{n}` — call `get_question`
    - POST `/api/quiz/{session_id}/answer/{n}` — call `evaluate_answer`
    - GET `/api/quiz/{session_id}/summary` — call `get_summary`
    - _Requirements: 4.1, 4.2, 4.3, 4.8_

- [x] 7. Checkpoint — Quiz engine complete
  - Run `pytest tests/test_quiz.py tests/test_normalization.py --tb=short`
  - Ensure all tests pass, ask the user if questions arise.

- [x] 8. Implement the XP service and user profile router
  - [x] 8.1 Implement `award_xp` in `app/services/xp_service.py`
    - Map difficulty → XP amount (Easy=10, Medium=20, Hard=30); add to `user.xp`; return new XP and level
    - Include `level_up: bool` in return value when level increases
    - _Requirements: 5.1, 5.2, 5.3, 5.4, 5.5, 5.6, 5.8_

  - [ ]* 8.2 Write property test for XP award matching difficulty (Property 10)
    - **Property 10: XP awarded matches difficulty**
    - Use `st.sampled_from(["Easy","Medium","Hard"])` — assert exact XP delta per difficulty; 0 for incorrect
    - **Validates: Requirements 5.1, 5.2, 5.3, 5.4**

  - [ ]* 8.3 Write property test for cumulative XP accumulation (Property 11)
    - **Property 11: Cumulative XP accumulates correctly across answers**
    - Use `st.lists(st.sampled_from(["Easy","Medium","Hard"]))` — assert total XP equals sum of individual awards
    - **Validates: Requirements 5.5**

  - [x] 8.4 Create `app/routers/users.py` with GET `/api/users/me`
    - Require `get_current_user`; return `{"username": ..., "xp": ..., "level": calculate_level(xp)}`
    - _Requirements: 5.6, 5.7, 9.4_

- [x] 9. Implement the Leaderboard service and router
  - [x] 9.1 Implement `get_leaderboard` in `app/services/leaderboard_service.py`
    - Query top 10 users `ORDER BY xp DESC, username ASC LIMIT 10`
    - Return list of `{"username": ..., "xp": ..., "level": calculate_level(xp)}`
    - _Requirements: 6.1, 6.2, 6.3, 6.4, 6.5_

  - [ ]* 9.2 Write property test for leaderboard ordering (Property 13)
    - **Property 13: Leaderboard is correctly ordered and complete**
    - Use `st.lists(st.builds(User, ...))` — assert at most 10 entries, XP descending, alphabetical tiebreak, all required fields present
    - **Validates: Requirements 6.1, 6.2, 6.3**

  - [x] 9.3 Create `app/routers/leaderboard.py` with GET `/api/leaderboard`
    - No auth required; call `get_leaderboard`; return list
    - _Requirements: 6.1, 6.4_

- [x] 10. Implement guest XP transfer on register/login
  - Verify `register_user` and `login_user` already handle `guest_xp` (added in tasks 4.1 and 4.4)
  - Add integration test: register with `guest_xp=50`, assert `user.xp == 50`; login with `guest_xp=30`, assert XP increases by 30
  - _Requirements: 5.11_

  - [ ]* 10.1 Write property test for guest XP transfer (Property 16)
    - **Property 16: Guest XP transfer on registration/login**
    - Use `st.integers(min_value=0)` for `guest_xp` — assert final XP equals pre-request XP plus `guest_xp` exactly
    - **Validates: Requirements 5.11**

- [x] 11. Checkpoint — Backend complete
  - Run `pytest --tb=short` (all test files)
  - Verify `GET /api/leaderboard` returns HTTP 200 without a token
  - Verify `GET /api/users/me` without a token returns HTTP 401
  - Ensure all tests pass, ask the user if questions arise.

- [-] 12. Build the frontend shell and routing
  - Create `static/index.html`: shell page with a `<div id="app">` mount point, link to `style.css` and `app.js`
  - Create `static/style.css`: apply retro theme — Press Start 2P font (Google Fonts), `#00ff41` on `#0d0d0d`, scanline `::before` pseudo-element with repeating linear gradient
  - Create `static/app.js`: implement a minimal JS router that reads `window.location.hash` (or `pathname`) and renders the correct view into `#app`
  - _Requirements: 9.1, 9.2, 10.1, 10.4_

- [ ] 13. Build the Home, Login, and Register views
  - [ ] 13.1 Implement the Home view in `static/app.js`
    - Render topic dropdown (6 topics) and difficulty dropdown (Easy/Medium/Hard)
    - "Start Quiz" button calls `POST /api/quiz/start` and navigates to the Quiz view
    - _Requirements: 3.1, 3.2, 3.3, 3.4_

  - [ ] 13.2 Implement the Login and Register views in `static/app.js`
    - Forms post to `/api/auth/login` and `/api/auth/register`
    - On success: store token in `localStorage`; read `guest_xp` from `localStorage`, pass it in the request body, then clear it
    - On failure: display error message from `detail` field
    - _Requirements: 1.1, 2.1, 5.11_

- [ ] 14. Build the Quiz view
  - [ ] 14.1 Implement question rendering for Multiple Choice and True/False
    - Fetch `GET /api/quiz/{session_id}/question/{n}`; render question text and answer options as buttons
    - On answer submit: call `POST /api/quiz/{session_id}/answer/{n}`; show correct/incorrect feedback and correct answer
    - Advance to next question or navigate to Summary when done
    - _Requirements: 4.2, 4.3, 4.6, 4.7_

  - [ ] 14.2 Implement Fill-in-the-Blank rendering
    - Render a text input; submit on Enter or button click
    - _Requirements: 4.4_

  - [ ] 14.3 Implement Code Arrangement drag-and-drop rendering
    - Render shuffled code blocks as draggable `<div>` elements using the HTML5 native drag-and-drop API (`draggable`, `dragstart`, `dragover`, `drop` events)
    - On submit: collect block IDs in current visual order and post to answer endpoint
    - _Requirements: 4.5, 7.6, 9.3_

- [ ] 15. Build the Summary, Profile, and Leaderboard views
  - [ ] 15.1 Implement the Summary view
    - Fetch `GET /api/quiz/{session_id}/summary`; display correct count, total (10), and XP earned
    - For guests: add `xp_earned` to `localStorage` key `guest_xp` (accumulate, don't overwrite)
    - Show "Register" / "Login" prompt for guests; show "Play Again" and "Leaderboard" links for all
    - _Requirements: 4.8, 4.9, 5.9, 9.6_

  - [ ] 15.2 Implement the Profile view
    - Fetch `GET /api/users/me` (requires token); display username, XP, and level badge
    - Display XP and level in the nav/header at all times when logged in
    - Show level-up notification if the answer response includes `level_up: true`
    - _Requirements: 5.6, 5.7, 5.8, 9.4, 9.5_

  - [ ] 15.3 Implement the Leaderboard view
    - Fetch `GET /api/leaderboard`; render a top-10 table with rank, username, XP, and level
    - Accessible without login
    - _Requirements: 6.1, 6.2, 6.3, 6.4_

- [ ] 16. Wire everything together and validate deployment readiness
  - [ ] 16.1 Register all routers in `app/main.py` with the `/api` prefix
    - Confirm catch-all route returns `index.html` for all non-`/api` paths
    - _Requirements: 10.1, 10.4_

  - [ ] 16.2 Write a `Procfile` or `render.yaml` for Render deployment
    - Start command: `uvicorn app.main:app --host 0.0.0.0 --port $PORT`
    - Document that `seed.py` must be run once after first deploy
    - _Requirements: 10.1, 10.2_

  - [ ]* 16.3 Write unit tests for deployment-critical behaviors
    - Test: `index.html` is served for a non-API route (e.g., `GET /quiz`)
    - Test: database schema is created on startup (tables exist after `create_all`)
    - Test: seed script is idempotent (running twice does not duplicate questions)
    - _Requirements: 10.3, 10.4_

- [ ] 17. Final checkpoint — Full stack complete
  - Run `pytest --tb=short` — all tests must pass
  - Run the app locally with `uvicorn app.main:app --reload`, run `python seed.py`, and manually walk through a full guest quiz session and a registered user quiz session
  - Ensure all tests pass, ask the user if questions arise.

---

## Notes

- Tasks marked `*` are optional and can be skipped for a faster MVP
- Tasks marked 🟢 are beginner-friendly — attempt them independently before asking for help
- Each task references specific requirements for traceability
- Property tests use Hypothesis and validate the 16 correctness properties defined in the design document
- Unit tests validate specific examples and edge cases not covered by property tests
- Checkpoints ensure incremental validation at each architectural layer
- The `conftest.py` in `tests/` should set up an in-memory SQLite database and a FastAPI `TestClient` — this is shared scaffolding for all test files