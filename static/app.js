/* ============================================================
   CompProg 2 Quiz App — Frontend Router & Auth Helpers
   Hash-based SPA router with stub view functions.
   Views are filled in by tasks 13–15.
   ============================================================ */

'use strict';

// ---- Auth State Helpers ----

function getToken() {
    return localStorage.getItem('token');
}

function setToken(t) {
    localStorage.setItem('token', t);
}

function clearToken() {
    localStorage.removeItem('token');
}

function getGuestXP() {
    return parseInt(localStorage.getItem('guest_xp') || '0', 10);
}

function addGuestXP(xp) {
    const current = getGuestXP();
    localStorage.setItem('guest_xp', String(current + xp));
}

function clearGuestXP() {
    localStorage.removeItem('guest_xp');
}

// ---- Nav Update ----

/**
 * Show/hide nav links based on whether the user is logged in.
 * Also updates the XP/level display in #nav-xp when logged in.
 */
async function updateNav() {
    const token = getToken();
    const navLogin = document.getElementById('nav-login');
    const navRegister = document.getElementById('nav-register');
    const navProfile = document.getElementById('nav-profile');
    const navLogout = document.getElementById('nav-logout');
    const navXp = document.getElementById('nav-xp');

    if (token) {
        // Logged in: show Profile & Logout, hide Login & Register
        navLogin.classList.add('hidden');
        navRegister.classList.add('hidden');
        navProfile.classList.remove('hidden');
        navLogout.classList.remove('hidden');

        // Fetch and display XP/level
        try {
            const res = await fetch('/api/users/me', {
                headers: { 'Authorization': `Bearer ${token}` }
            });
            if (res.ok) {
                const data = await res.json();
                navXp.textContent = `LVL ${data.level}  XP: ${data.xp}`;
                navXp.classList.remove('hidden');
            } else {
                // Token is invalid — clear it
                clearToken();
                updateNav();
            }
        } catch (_) {
            navXp.classList.add('hidden');
        }
    } else {
        // Guest: show Login & Register, hide Profile & Logout
        navLogin.classList.remove('hidden');
        navRegister.classList.remove('hidden');
        navProfile.classList.add('hidden');
        navLogout.classList.add('hidden');
        navXp.classList.add('hidden');
        navXp.textContent = '';
    }
}

// Wire up the Logout link
document.addEventListener('DOMContentLoaded', () => {
    const navLogout = document.getElementById('nav-logout');
    navLogout.addEventListener('click', async (e) => {
        e.preventDefault();
        const token = getToken();
        if (token) {
            try {
                await fetch('/api/auth/logout', {
                    method: 'POST',
                    headers: { 'Authorization': `Bearer ${token}` }
                });
            } catch (_) { /* ignore network errors on logout */ }
            clearToken();
        }
        window.location.hash = '#home';
    });
});

// ---- Stub View Functions ----
// These will be replaced with full implementations in tasks 13–15.

async function renderHome() {
    const app = document.getElementById('app');
    app.innerHTML = `
        <div class="card">
            <h2 class="card-title">CompProg 2 Quiz</h2>
            <p class="welcome-msg">Welcome! Test your C programming knowledge.<br>Select a topic and difficulty, then start your quiz.</p>

            <div class="form-group">
                <label for="topic-select">Topic</label>
                <select id="topic-select">
                    <option value="Arrays">Arrays</option>
                    <option value="Multidimensional Arrays">Multidimensional Arrays</option>
                    <option value="Basic Sorting Algorithms">Basic Sorting Algorithms</option>
                    <option value="Binary Search">Binary Search</option>
                    <option value="Functions">Functions</option>
                    <option value="Pointers">Pointers</option>
                </select>
            </div>

            <div class="form-group">
                <label for="difficulty-select">Difficulty</label>
                <select id="difficulty-select">
                    <option value="Easy">Easy</option>
                    <option value="Medium">Medium</option>
                    <option value="Hard">Hard</option>
                </select>
            </div>

            <div class="instructions">
                <p>&gt; 10 questions per session</p>
                <p>&gt; Easy: Multiple Choice &amp; True/False</p>
                <p>&gt; Medium: + Fill-in-the-Blank</p>
                <p>&gt; Hard: + Code Arrangement</p>
            </div>

            <button id="start-quiz-btn" class="btn-primary">Start Quiz</button>
            <div id="home-error" class="error-msg hidden"></div>
        </div>
    `;

    document.getElementById('start-quiz-btn').addEventListener('click', async () => {
        const topic = document.getElementById('topic-select').value;
        const difficulty = document.getElementById('difficulty-select').value;
        const errorEl = document.getElementById('home-error');
        const btn = document.getElementById('start-quiz-btn');

        errorEl.classList.add('hidden');
        errorEl.textContent = '';
        btn.disabled = true;
        btn.textContent = 'Starting...';

        try {
            const headers = { 'Content-Type': 'application/json' };
            const token = getToken();
            if (token) {
                headers['Authorization'] = `Bearer ${token}`;
            }

            const res = await fetch('/api/quiz/start', {
                method: 'POST',
                headers,
                body: JSON.stringify({ topic, difficulty })
            });

            const data = await res.json();

            if (!res.ok) {
                throw new Error(data.detail || 'Failed to start quiz.');
            }

            window.currentSessionId = data.session_id;
            window.currentQuestionIndex = 0;
            window.currentDifficulty = difficulty;

            window.location.hash = '#quiz';
        } catch (err) {
            errorEl.textContent = err.message;
            errorEl.classList.remove('hidden');
            btn.disabled = false;
            btn.textContent = 'Start Quiz';
        }
    });
}

async function renderQuiz() {
    const app = document.getElementById('app');

    // Guard: must have an active session
    if (!window.currentSessionId) {
        window.location.hash = '#home';
        return;
    }

    const sessionId = window.currentSessionId;
    const n = window.currentQuestionIndex;

    // Show a loading state while fetching
    app.innerHTML = `
        <div class="card">
            <p class="progress-indicator">Loading question ${n + 1} of 10...</p>
        </div>
    `;

    // Build headers (include auth token if logged in)
    const headers = {};
    const token = getToken();
    if (token) {
        headers['Authorization'] = `Bearer ${token}`;
    }

    let question;
    try {
        const res = await fetch(`/api/quiz/${sessionId}/question/${n}`, { headers });
        if (!res.ok) {
            const err = await res.json();
            throw new Error(err.detail || 'Failed to load question.');
        }
        question = await res.json();
    } catch (err) {
        app.innerHTML = `
            <div class="card">
                <p class="error-msg">Error: ${err.message}</p>
                <button class="btn-primary" onclick="window.location.hash='#home'">Go Home</button>
            </div>
        `;
        return;
    }

    // ---- Build the answer options HTML ----
    let answersHTML = '';

    if (question.question_type === 'multiple_choice') {
        const choices = question.choices || [];
        answersHTML = choices.map(choice => `
            <button class="answer-btn" data-answer="${choice.label}">
                <span class="choice-label">${choice.label}.</span> ${choice.text}
            </button>
        `).join('');
    } else if (question.question_type === 'true_false') {
        answersHTML = `
            <button class="answer-btn" data-answer="True">True</button>
            <button class="answer-btn" data-answer="False">False</button>
        `;
    } else if (question.question_type === 'fill_blank') {
        answersHTML = `
            <div class="fill-blank-container">
                <input type="text" id="fill-blank-input" class="fill-blank-input" placeholder="Type your answer..." autofocus />
                <button id="fill-blank-submit" class="btn-primary">Submit Answer</button>
            </div>
        `;
    } else if (question.question_type === 'code_arrangement') {
        const blocks = question.code_blocks || [];
        const blocksHTML = blocks.map(block => `
            <div class="code-block" draggable="true" data-id="${block.id}">${block.content}</div>
        `).join('');
        answersHTML = `
            <div id="code-blocks-container">
                ${blocksHTML}
            </div>
            <button id="code-submit-btn" class="btn-primary">Submit Order</button>
        `;
    }

    // ---- Render the full question card ----
    app.innerHTML = `
        <div class="card quiz-card">
            <p class="progress-indicator">Question ${n + 1} of 10</p>
            <p class="question-text">${question.question_text}</p>
            <div class="answers-container" id="answers-container">
                ${answersHTML}
            </div>
            <div id="feedback-area" class="feedback-area hidden"></div>
            <div id="next-btn-area" class="next-btn-area hidden"></div>
        </div>
    `;

    // ---- Wire up code arrangement drag-and-drop ----

    const codeContainer = document.getElementById('code-blocks-container');
    if (codeContainer) {
        let dragSrcEl = null;

        codeContainer.addEventListener('dragstart', (e) => {
            dragSrcEl = e.target.closest('[data-id]');
            dragSrcEl.classList.add('dragging');
            e.dataTransfer.effectAllowed = 'move';
        });

        codeContainer.addEventListener('dragover', (e) => {
            e.preventDefault();
            e.dataTransfer.dropEffect = 'move';
            const target = e.target.closest('[data-id]');
            if (target && target !== dragSrcEl) {
                target.classList.add('drag-over');
            }
        });

        codeContainer.addEventListener('dragleave', (e) => {
            const target = e.target.closest('[data-id]');
            if (target) target.classList.remove('drag-over');
        });

        codeContainer.addEventListener('drop', (e) => {
            e.preventDefault();
            const target = e.target.closest('[data-id]');
            if (target && target !== dragSrcEl) {
                target.classList.remove('drag-over');
                const rect = target.getBoundingClientRect();
                const midY = rect.top + rect.height / 2;
                if (e.clientY < midY) {
                    codeContainer.insertBefore(dragSrcEl, target);
                } else {
                    codeContainer.insertBefore(dragSrcEl, target.nextSibling);
                }
            }
            dragSrcEl.classList.remove('dragging');
        });

        codeContainer.addEventListener('dragend', (e) => {
            document.querySelectorAll('.drag-over').forEach(el => el.classList.remove('drag-over'));
            if (dragSrcEl) dragSrcEl.classList.remove('dragging');
        });

        const codeSubmitBtn = document.getElementById('code-submit-btn');
        codeSubmitBtn.addEventListener('click', () => {
            const orderedIds = Array.from(codeContainer.children).map(el => parseInt(el.dataset.id));
            submitAnswer(orderedIds);
            codeSubmitBtn.disabled = true;
        });
    }

    // ---- Wire up answer submission ----

    /**
     * Submit an answer string to the API and show feedback.
     * @param {string|Array} selectedAnswer
     */
    async function submitAnswer(selectedAnswer) {
        // Disable all answer buttons to prevent double-submission
        const answerBtns = document.querySelectorAll('.answer-btn');
        answerBtns.forEach(btn => { btn.disabled = true; });

        const submitHeaders = { 'Content-Type': 'application/json' };
        if (token) {
            submitHeaders['Authorization'] = `Bearer ${token}`;
        }

        let result;
        try {
            const res = await fetch(`/api/quiz/${sessionId}/answer/${n}`, {
                method: 'POST',
                headers: submitHeaders,
                body: JSON.stringify({ answer: selectedAnswer })
            });
            if (!res.ok) {
                const err = await res.json();
                throw new Error(err.detail || 'Failed to submit answer.');
            }
            result = await res.json();
        } catch (err) {
            const feedbackArea = document.getElementById('feedback-area');
            feedbackArea.textContent = `Error: ${err.message}`;
            feedbackArea.className = 'feedback-area feedback-error';
            feedbackArea.classList.remove('hidden');
            return;
        }

        // ---- Show feedback ----
        const feedbackArea = document.getElementById('feedback-area');

        if (result.correct) {
            feedbackArea.innerHTML = ' Correct!';
            feedbackArea.className = 'feedback-area feedback-correct';
        } else {
            feedbackArea.innerHTML = ` Incorrect. Correct answer: <span class="correct-answer-text">${result.correct_answer}</span>`;
            feedbackArea.className = 'feedback-area feedback-incorrect';
        }
        feedbackArea.classList.remove('hidden');

        // Highlight the clicked button
        answerBtns.forEach(btn => {
            if (btn.dataset.answer === selectedAnswer) {
                btn.classList.add(result.correct ? 'answer-correct' : 'answer-incorrect');
            }
        });

        // ---- Show Next / See Results button ----
        const nextBtnArea = document.getElementById('next-btn-area');
        const isLastQuestion = (n === 9);

        if (isLastQuestion) {
            nextBtnArea.innerHTML = `<button id="see-results-btn" class="btn-primary">See Results</button>`;
            nextBtnArea.classList.remove('hidden');
            document.getElementById('see-results-btn').addEventListener('click', () => {
                window.location.hash = '#summary';
            });
        } else {
            nextBtnArea.innerHTML = `<button id="next-question-btn" class="btn-primary">Next Question</button>`;
            nextBtnArea.classList.remove('hidden');
            document.getElementById('next-question-btn').addEventListener('click', () => {
                window.currentQuestionIndex += 1;
                renderQuiz();
            });
        }
    }

    // Attach click handlers to Multiple Choice / True/False buttons
    document.querySelectorAll('.answer-btn').forEach(btn => {
        btn.addEventListener('click', () => {
            submitAnswer(btn.dataset.answer);
        });
    });

    // Fill-in-the-blank: wire submit button, Enter key, and auto-focus
    const fillSubmitBtn = document.getElementById('fill-blank-submit');
    if (fillSubmitBtn) {
        const fillInput = document.getElementById('fill-blank-input');

        const doFillSubmit = () => {
            const val = fillInput.value;
            submitAnswer(val);
            // Disable input and button after submission to prevent double-submit
            fillInput.disabled = true;
            fillSubmitBtn.disabled = true;
        };

        fillSubmitBtn.addEventListener('click', doFillSubmit);
        fillInput.addEventListener('keydown', (e) => {
            if (e.key === 'Enter') doFillSubmit();
        });

        // Auto-focus the input so the user can start typing immediately
        fillInput.focus();
    }
}

async function renderSummary() {
    const app = document.getElementById('app');

    // Guard: must have an active session
    if (!window.currentSessionId) {
        window.location.hash = '#home';
        return;
    }

    const sessionId = window.currentSessionId;

    // Show loading state while fetching
    app.innerHTML = `
        <div class="card">
            <p class="progress-indicator">Loading results...</p>
        </div>
    `;

    // Build headers (include auth token if logged in)
    const headers = {};
    const token = getToken();
    if (token) {
        headers['Authorization'] = `Bearer ${token}`;
    }

    let data;
    try {
        const res = await fetch(`/api/quiz/${sessionId}/summary`, { headers });
        if (!res.ok) {
            const err = await res.json();
            throw new Error(err.detail || 'Failed to load summary.');
        }
        data = await res.json();
    } catch (err) {
        app.innerHTML = `
            <div class="card">
                <p class="error-msg">Error: ${err.message}</p>
                <button class="btn-primary" onclick="window.location.hash='#home'">Go Home</button>
            </div>
        `;
        return;
    }

    // Clear the session ID now that we have the data
    window.currentSessionId = null;

    // For guests: accumulate XP in localStorage
    if (!token) {
        addGuestXP(data.xp_earned);
    }

    // Build action buttons based on auth state
    let actionsHTML = '';
    if (!token) {
        // Guest: show Register and Login links
        actionsHTML = `
            <div class="summary-actions">
                <p class="summary-cta">&gt; Save your XP — create an account!</p>
                <a href="#register" class="btn-primary">Create Account</a>
                <a href="#login" class="btn-secondary">Log In</a>
            </div>
        `;
    } else {
        // Logged-in: show Leaderboard link
        actionsHTML = `
            <div class="summary-actions">
                <a href="#leaderboard" class="btn-secondary">Leaderboard</a>
            </div>
        `;
    }

    // Play Again is shown for all users
    actionsHTML += `<a href="#home" class="btn-primary">Play Again</a>`;

    app.innerHTML = `
        <div class="card">
            <h2 class="card-title">Quiz Complete!</h2>
            <div class="summary-score">
                <p class="score-line">${data.correct} / ${data.total} correct</p>
                <p class="xp-line">XP earned: ${data.xp_earned}</p>
            </div>
            ${actionsHTML}
        </div>
    `;
}

async function renderLeaderboard() {
    const app = document.getElementById('app');

    // Show loading state while fetching
    app.innerHTML = `
        <div class="card">
            <p class="progress-indicator">Loading leaderboard...</p>
        </div>
    `;

    let data;
    try {
        const res = await fetch('/api/leaderboard');
        if (!res.ok) {
            const err = await res.json();
            throw new Error(err.detail || 'Failed to load leaderboard.');
        }
        data = await res.json();
    } catch (err) {
        app.innerHTML = `
            <div class="card">
                <p class="error-msg">Error: ${err.message}</p>
                <a href="#home" class="btn-primary">Go Home</a>
            </div>
        `;
        return;
    }

    // Build table rows or empty state
    let tableHTML;
    if (data.length === 0) {
        tableHTML = `<p class="welcome-msg">No players yet  be the first!</p>`;
    } else {
        const rows = data.map((entry, index) => `
            <tr>
                <td>${index + 1}</td>
                <td>${entry.username}</td>
                <td>${entry.xp}</td>
                <td>${entry.level}</td>
            </tr>
        `).join('');

        tableHTML = `
            <table>
                <thead>
                    <tr>
                        <th>Rank</th>
                        <th>Username</th>
                        <th>XP</th>
                        <th>Level</th>
                    </tr>
                </thead>
                <tbody>
                    ${rows}
                </tbody>
            </table>
        `;
    }

    app.innerHTML = `
        <div class="card">
            <h2 class="card-title">Leaderboard</h2>
            ${tableHTML}
            <div class="profile-actions">
                <a href="#home" class="btn-primary">Play Quiz</a>
            </div>
        </div>
    `;
}

function renderLogin() {
    const app = document.getElementById('app');
    app.innerHTML = `
        <div class="card">
            <h2 class="card-title">Log In</h2>
            <form id="login-form">
                <div class="form-group">
                    <label for="login-username">Username</label>
                    <input type="text" id="login-username" autocomplete="username" required />
                </div>
                <div class="form-group">
                    <label for="login-password">Password</label>
                    <input type="password" id="login-password" autocomplete="current-password" required />
                </div>
                <div id="login-error" class="alert alert-error hidden"></div>
                <button type="submit" id="login-btn" class="btn">Log In</button>
            </form>
        </div>
    `;

    document.getElementById('login-form').addEventListener('submit', async (e) => {
        e.preventDefault();
        const username = document.getElementById('login-username').value.trim();
        const password = document.getElementById('login-password').value;
        const errorEl = document.getElementById('login-error');
        const btn = document.getElementById('login-btn');

        errorEl.classList.add('hidden');
        errorEl.textContent = '';
        btn.disabled = true;
        btn.textContent = 'Logging in...';

        try {
            const guest_xp = getGuestXP();
            const res = await fetch('/api/auth/login', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ username, password, guest_xp })
            });
            const data = await res.json();

            if (!res.ok) {
                throw new Error(data.detail || 'Login failed.');
            }

            setToken(data.token);
            clearGuestXP();
            await updateNav();
            window.location.hash = '#home';
        } catch (err) {
            errorEl.textContent = err.message;
            errorEl.classList.remove('hidden');
            btn.disabled = false;
            btn.textContent = 'Log In';
        }
    });
}

function renderRegister() {
    const app = document.getElementById('app');
    app.innerHTML = `
        <div class="card">
            <h2 class="card-title">Create Account</h2>
            <form id="register-form">
                <div class="form-group">
                    <label for="register-username">Username</label>
                    <input type="text" id="register-username" autocomplete="username" required />
                </div>
                <div class="form-group">
                    <label for="register-password">Password</label>
                    <input type="password" id="register-password" autocomplete="new-password" required />
                </div>
                <div id="register-error" class="alert alert-error hidden"></div>
                <button type="submit" id="register-btn" class="btn">Create Account</button>
            </form>
        </div>
    `;

    document.getElementById('register-form').addEventListener('submit', async (e) => {
        e.preventDefault();
        const username = document.getElementById('register-username').value.trim();
        const password = document.getElementById('register-password').value;
        const errorEl = document.getElementById('register-error');
        const btn = document.getElementById('register-btn');

        errorEl.classList.add('hidden');
        errorEl.textContent = '';
        btn.disabled = true;
        btn.textContent = 'Creating account...';

        try {
            const guest_xp = getGuestXP();

            // Step 1: Register
            const regRes = await fetch('/api/auth/register', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ username, password, guest_xp })
            });
            const regData = await regRes.json();

            if (!regRes.ok) {
                throw new Error(regData.detail || 'Registration failed.');
            }

            // Step 2: Auto-login
            const loginRes = await fetch('/api/auth/login', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ username, password, guest_xp: 0 })
            });
            const loginData = await loginRes.json();

            if (!loginRes.ok) {
                throw new Error(loginData.detail || 'Auto-login after registration failed.');
            }

            setToken(loginData.token);
            clearGuestXP();
            await updateNav();
            window.location.hash = '#home';
        } catch (err) {
            errorEl.textContent = err.message;
            errorEl.classList.remove('hidden');
            btn.disabled = false;
            btn.textContent = 'Create Account';
        }
    });
}

async function renderProfile() {
    const app = document.getElementById('app');

    // Guard: must be logged in
    const token = getToken();
    if (!token) {
        window.location.hash = '#login';
        return;
    }

    // Show loading state while fetching
    app.innerHTML = `
        <div class="card">
            <p class="progress-indicator">Loading profile...</p>
        </div>
    `;

    let data;
    try {
        const res = await fetch('/api/users/me', {
            headers: { 'Authorization': `Bearer ${token}` }
        });
        if (!res.ok) {
            const err = await res.json();
            throw new Error(err.detail || 'Failed to load profile.');
        }
        data = await res.json();
    } catch (err) {
        app.innerHTML = `
            <div class="card">
                <p class="error-msg">Error: ${err.message}</p>
                <a href="#home" class="btn-primary">Go Home</a>
            </div>
        `;
        return;
    }

    // ---- Compute XP progress bar ----
    // Thresholds: L1=0-99, L2=100-249, L3=250-499, L4=500-999, L5=1000+
    const xp = data.xp;
    const level = data.level;

    const levelThresholds = [
        { level: 1, start: 0,    next: 100  },
        { level: 2, start: 100,  next: 250  },
        { level: 3, start: 250,  next: 500  },
        { level: 4, start: 500,  next: 1000 },
        { level: 5, start: 1000, next: null },
    ];

    const threshold = levelThresholds.find(t => t.level === level) || levelThresholds[4];
    let progressPercent;
    let progressLabel;

    if (threshold.next === null) {
        // Max level — full bar
        progressPercent = 100;
        progressLabel = 'MAX LEVEL';
    } else {
        const earned = xp - threshold.start;
        const needed = threshold.next - threshold.start;
        progressPercent = Math.min(100, Math.floor((earned / needed) * 100));
        progressLabel = `${xp} / ${threshold.next} XP`;
    }

    app.innerHTML = `
        <div class="card">
            <h2 class="card-title">Profile</h2>

            <div class="profile-info">
                <p class="profile-username">${data.username}</p>
                <p class="profile-xp">Total XP: ${xp}</p>
                <span class="level-badge">LVL ${level}</span>
            </div>

            <div class="profile-progress">
                <p class="xp-progress-label">Progress to next level: ${progressLabel}</p>
                <div class="xp-bar-container">
                    <div class="xp-bar-fill" style="width: ${progressPercent}%;"></div>
                </div>
            </div>

            <div class="profile-actions">
                <a href="#home" class="btn-primary">Play Quiz</a>
            </div>
        </div>
    `;
}

// ---- Router ----

/**
 * Map a view name to its render function and call it.
 * View functions may be async — we call them and let the Promise resolve
 * in the background (fire-and-forget is fine here since each view manages
 * its own DOM updates).
 * @param {string} viewName
 */
function renderView(viewName) {
    const views = {
        home:        renderHome,
        quiz:        renderQuiz,
        summary:     renderSummary,
        leaderboard: renderLeaderboard,
        login:       renderLogin,
        register:    renderRegister,
        profile:     renderProfile,
    };

    const render = views[viewName] || renderHome;
    // Call the render function; if it returns a Promise (async), ignore it —
    // the view handles its own DOM updates asynchronously.
    render();
    updateNav();
}

/**
 * Derive the current view name from window.location.hash and render it.
 */
function route() {
    // Strip the leading '#' and any leading '/'
    const hash = window.location.hash.replace(/^#\/?/, '').toLowerCase();

    // Supported routes
    const validRoutes = ['home', 'quiz', 'summary', 'leaderboard', 'login', 'register', 'profile'];

    const viewName = validRoutes.includes(hash) ? hash : 'home';
    renderView(viewName);
}

// ---- Bootstrap ----

window.addEventListener('hashchange', route);
document.addEventListener('DOMContentLoaded', route);
