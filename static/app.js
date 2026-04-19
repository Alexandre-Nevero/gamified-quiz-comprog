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

    const topics = [
        { value: 'Arrays',                    icon: '[ ]', desc: 'Indexing, traversal & memory layout' },
        { value: 'Multidimensional Arrays',    icon: '[ ][ ]', desc: '2D grids, matrices & nested loops' },
        { value: 'Basic Sorting Algorithms',   icon: '↕',  desc: 'Bubble, selection & insertion sort' },
        { value: 'Binary Search',              icon: '⌕',  desc: 'Divide & conquer search strategies' },
        { value: 'Functions',                  icon: 'ƒ',  desc: 'Scope, recursion & function pointers' },
        { value: 'Pointers',                   icon: '*',  desc: 'Memory addresses, dereferencing & malloc' },
    ];

    const difficulties = [
        { value: 'Easy',   label: 'Easy',   color: 'diff-easy',   desc: 'Multiple Choice & True/False' },
        { value: 'Medium', label: 'Medium', color: 'diff-medium', desc: 'Adds Fill-in-the-Blank' },
        { value: 'Hard',   label: 'Hard',   color: 'diff-hard',   desc: 'Adds Code Arrangement' },
    ];

    app.innerHTML = `
        <div class="home-hero">
            <div class="home-hero-badge">10 questions · C Programming</div>
            <h1 class="home-hero-title">Test Your C Knowledge</h1>
            <p class="home-hero-sub">Pick a topic and difficulty to start a quiz session. Earn XP for every correct answer.</p>
        </div>

        <div class="home-section">
            <div class="home-section-label">Choose a Topic</div>
            <div class="topic-grid">
                ${topics.map(t => `
                    <button class="topic-card" data-topic="${t.value}">
                        <span class="topic-icon">${t.icon}</span>
                        <span class="topic-name">${t.value}</span>
                        <span class="topic-desc">${t.desc}</span>
                    </button>
                `).join('')}
            </div>
        </div>

        <div class="home-section">
            <div class="home-section-label">Choose Difficulty</div>
            <div class="diff-pills">
                ${difficulties.map(d => `
                    <button class="diff-pill ${d.color}" data-difficulty="${d.value}">
                        <span class="diff-label">${d.label}</span>
                        <span class="diff-desc">${d.desc}</span>
                    </button>
                `).join('')}
            </div>
        </div>

        <div class="home-start-row">
            <button id="start-quiz-btn" class="btn-primary btn-start" disabled>
                Select a topic &amp; difficulty to begin
            </button>
            <div id="home-error" class="error-msg hidden"></div>
        </div>

        <!-- ── Flashcard Section ── -->
        <div class="flashcard-section">
            <div class="home-section-label" style="margin-top:2.5rem;">Quick Review — Flashcards</div>
            <p class="flashcard-section-sub">Click a card to reveal the answer. Use these to warm up before your quiz.</p>

            <!-- Topic tabs -->
            <div class="fc-tabs" id="fc-tabs">
                <button class="fc-tab active" data-topic="Arrays">Arrays</button>
                <button class="fc-tab" data-topic="Multidimensional Arrays">Multi Arrays</button>
                <button class="fc-tab" data-topic="Basic Sorting Algorithms">Sorting</button>
                <button class="fc-tab" data-topic="Binary Search">Binary Search</button>
                <button class="fc-tab" data-topic="Functions">Functions</button>
                <button class="fc-tab" data-topic="Pointers">Pointers</button>
            </div>

            <!-- Card deck -->
            <div class="fc-deck" id="fc-deck"></div>

            <!-- Navigation -->
            <div class="fc-nav">
                <button class="btn-secondary fc-prev" id="fc-prev">← Prev</button>
                <span class="fc-counter" id="fc-counter">1 / 5</span>
                <button class="btn-secondary fc-next" id="fc-next">Next →</button>
            </div>
        </div>
    `;

    let selectedTopic = null;
    let selectedDifficulty = null;

    // ── Flashcard data ──
    const flashcards = {
        'Arrays': [
            { q: 'What index does the first element of a C array have?', a: '0 — C arrays are zero-indexed.' },
            { q: 'How do you declare an integer array of 5 elements?', a: 'int arr[5];' },
            { q: 'What is the valid index range for int arr[10]?', a: '0 to 9 — accessing arr[10] is undefined behavior.' },
            { q: 'How do you find the number of elements in a static array?', a: 'sizeof(arr) / sizeof(arr[0])' },
            { q: 'What does the array name represent in C?', a: 'A pointer to the first element — arr == &arr[0].' },
            { q: 'What happens when you access an out-of-bounds index?', a: 'Undefined behavior — C does not perform bounds checking.' },
            { q: 'How do you initialize all elements of an array to 0?', a: 'int arr[10] = {0}; — remaining elements default to 0.' },
        ],
        'Multidimensional Arrays': [
            { q: 'How do you declare a 3×4 integer matrix in C?', a: 'int matrix[3][4];' },
            { q: 'How are 2D arrays stored in memory in C?', a: 'Row-major order — all elements of row 0, then row 1, etc.' },
            { q: 'What is the linear index of element a[i][j] in int a[R][C]?', a: 'i * C + j' },
            { q: 'What does a[1] refer to in int a[3][4]?', a: 'A pointer to the second row (4 integers starting at a[1][0]).' },
            { q: 'How do you pass a 2D array to a function?', a: 'Specify the column count: void f(int a[][4]) or void f(int a[3][4]).' },
            { q: 'Is a[i][j] equivalent to *(*(a+i)+j)?', a: 'Yes — both access the element at row i, column j.' },
        ],
        'Basic Sorting Algorithms': [
            { q: 'What is the worst-case time complexity of Bubble Sort?', a: 'O(n²) — n-1 passes, each comparing adjacent pairs.' },
            { q: 'Which sort finds the minimum and places it at the front each pass?', a: 'Selection Sort.' },
            { q: 'Which sort is most efficient for nearly-sorted data?', a: 'Insertion Sort — best case O(n) when data is almost sorted.' },
            { q: 'Is Bubble Sort stable?', a: 'Yes — equal elements maintain their relative order.' },
            { q: 'How many swaps does Selection Sort make in the worst case?', a: 'n-1 swaps — one per pass.' },
            { q: 'What optimization makes Bubble Sort adaptive?', a: 'Stop early if no swaps occur in a pass — indicates the array is sorted.' },
            { q: 'What is the space complexity of Insertion Sort?', a: 'O(1) — it sorts in-place with no extra memory.' },
        ],
        'Binary Search': [
            { q: 'What is the prerequisite for Binary Search?', a: 'The array must be sorted.' },
            { q: 'What is the time complexity of Binary Search?', a: 'O(log n) — the search space halves each step.' },
            { q: 'What is the safe formula to compute mid without overflow?', a: 'mid = low + (high - low) / 2' },
            { q: 'What is the space complexity of iterative Binary Search?', a: 'O(1) — no extra memory needed.' },
            { q: 'How many comparisons does Binary Search need for 1024 elements?', a: 'At most 10 — log₂(1024) = 10.' },
            { q: 'What does lower bound Binary Search return?', a: 'The first index where the element is ≥ target.' },
            { q: 'What is the space complexity of recursive Binary Search?', a: 'O(log n) — due to the call stack.' },
        ],
        'Functions': [
            { q: 'What does a void function return?', a: 'Nothing — void means no return value.' },
            { q: 'What is a function prototype?', a: 'A declaration of the function before its definition, telling the compiler its signature.' },
            { q: 'How do you pass a variable by reference in C?', a: 'Pass a pointer to it: void f(int *x)' },
            { q: 'What does the static keyword do on a local variable?', a: 'Preserves its value between function calls — initialized only once.' },
            { q: 'What is the base case of a recursive factorial function?', a: 'n == 0 or n == 1, returning 1.' },
            { q: 'Can a function return a pointer to a local variable?', a: 'No — local variables are destroyed when the function returns (dangling pointer).' },
            { q: 'How do you declare a pointer to a function int f(int, int)?', a: 'int (*fp)(int, int);' },
        ],
        'Pointers': [
            { q: 'What does a pointer store?', a: 'The memory address of another variable.' },
            { q: 'What operator gives the address of a variable?', a: '& — the address-of operator.' },
            { q: 'What operator dereferences a pointer?', a: '* — gives the value at the address the pointer holds.' },
            { q: 'What is a NULL pointer?', a: 'A pointer that points to nothing — address 0. Always check before dereferencing.' },
            { q: 'What does pointer arithmetic p+1 do for int *p?', a: 'Advances by sizeof(int) bytes — points to the next integer.' },
            { q: 'What is a dangling pointer?', a: 'A pointer that points to freed or out-of-scope memory — dereferencing it is undefined behavior.' },
            { q: 'What does malloc() return on failure?', a: 'NULL — always check the return value before using the pointer.' },
        ],
    };

    // ── Flashcard state ──
    let fcTopic = 'Arrays';
    let fcIndex = 0;

    function renderFlashcards() {
        const cards = flashcards[fcTopic] || [];
        const deck = document.getElementById('fc-deck');
        const counter = document.getElementById('fc-counter');
        if (!deck) return;

        const card = cards[fcIndex];
        deck.innerHTML = `
            <div class="fc-card" id="fc-card">
                <div class="fc-card-inner">
                    <div class="fc-front">
                        <span class="fc-label">Question</span>
                        <p class="fc-text">${card.q}</p>
                        <span class="fc-hint">Click to reveal answer</span>
                    </div>
                    <div class="fc-back">
                        <span class="fc-label">Answer</span>
                        <p class="fc-text">${card.a}</p>
                    </div>
                </div>
            </div>
        `;
        counter.textContent = `${fcIndex + 1} / ${cards.length}`;

        document.getElementById('fc-card').addEventListener('click', () => {
            document.getElementById('fc-card').classList.toggle('flipped');
        });
    }

    // Tab switching
    document.querySelectorAll('.fc-tab').forEach(tab => {
        tab.addEventListener('click', () => {
            document.querySelectorAll('.fc-tab').forEach(t => t.classList.remove('active'));
            tab.classList.add('active');
            fcTopic = tab.dataset.topic;
            fcIndex = 0;
            renderFlashcards();
        });
    });

    // Prev / Next
    document.getElementById('fc-prev').addEventListener('click', () => {
        const cards = flashcards[fcTopic] || [];
        fcIndex = (fcIndex - 1 + cards.length) % cards.length;
        renderFlashcards();
    });
    document.getElementById('fc-next').addEventListener('click', () => {
        const cards = flashcards[fcTopic] || [];
        fcIndex = (fcIndex + 1) % cards.length;
        renderFlashcards();
    });

    renderFlashcards();

    function updateStartBtn() {
        const btn = document.getElementById('start-quiz-btn');
        if (selectedTopic && selectedDifficulty) {
            btn.disabled = false;
            btn.textContent = `Start ${selectedDifficulty} Quiz — ${selectedTopic}`;
            btn.classList.add('btn-start-ready');
        } else if (selectedTopic) {
            btn.disabled = true;
            btn.textContent = 'Now pick a difficulty';
            btn.classList.remove('btn-start-ready');
        } else if (selectedDifficulty) {
            btn.disabled = true;
            btn.textContent = 'Now pick a topic';
            btn.classList.remove('btn-start-ready');
        } else {
            btn.disabled = true;
            btn.textContent = 'Select a topic & difficulty to begin';
            btn.classList.remove('btn-start-ready');
        }
    }

    // Topic card selection
    document.querySelectorAll('.topic-card').forEach(card => {
        card.addEventListener('click', () => {
            document.querySelectorAll('.topic-card').forEach(c => c.classList.remove('selected'));
            card.classList.add('selected');
            selectedTopic = card.dataset.topic;
            updateStartBtn();
        });
    });

    // Difficulty pill selection
    document.querySelectorAll('.diff-pill').forEach(pill => {
        pill.addEventListener('click', () => {
            document.querySelectorAll('.diff-pill').forEach(p => p.classList.remove('selected'));
            pill.classList.add('selected');
            selectedDifficulty = pill.dataset.difficulty;
            updateStartBtn();
        });
    });

    // Start quiz
    document.getElementById('start-quiz-btn').addEventListener('click', async () => {
        if (!selectedTopic || !selectedDifficulty) return;

        const errorEl = document.getElementById('home-error');
        const btn = document.getElementById('start-quiz-btn');

        errorEl.classList.add('hidden');
        btn.disabled = true;
        btn.textContent = 'Starting...';

        try {
            const headers = { 'Content-Type': 'application/json' };
            const token = getToken();
            if (token) headers['Authorization'] = `Bearer ${token}`;

            const res = await fetch('/api/quiz/start', {
                method: 'POST',
                headers,
                body: JSON.stringify({ topic: selectedTopic, difficulty: selectedDifficulty })
            });

            const data = await res.json();
            if (!res.ok) throw new Error(data.detail || 'Failed to start quiz.');

            window.currentSessionId = data.session_id;
            window.currentQuestionIndex = 0;
            window.currentDifficulty = selectedDifficulty;
            window.location.hash = '#quiz';
        } catch (err) {
            errorEl.textContent = err.message;
            errorEl.classList.remove('hidden');
            btn.disabled = false;
            btn.textContent = `Start ${selectedDifficulty} Quiz — ${selectedTopic}`;
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
        const visualLabels = ['A', 'B', 'C', 'D'];
        answersHTML = choices.map((choice, idx) => {
            const displayLabel = visualLabels[idx] || choice.label;
            return `
            <button class="answer-btn" data-answer="${choice.label}">
                <span class="choice-label">${displayLabel}.</span> ${choice.text}
            </button>
        `}).join('');
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
            feedbackArea.innerHTML = '✓ Correct!';
            feedbackArea.className = 'feedback-area feedback-correct';
        } else {
            // For code arrangement: correct_answer is a list of block IDs.
            // Map them back to code content using the blocks rendered on the page.
            let correctDisplay;
            if (Array.isArray(result.correct_answer)) {
                // Build an id→content map from the rendered code blocks
                const blockMap = {};
                document.querySelectorAll('#code-blocks-container [data-id]').forEach(el => {
                    blockMap[parseInt(el.dataset.id)] = el.textContent.trim();
                });
                const orderedLines = result.correct_answer.map(id => blockMap[id] || `(block ${id})`);
                correctDisplay = `
                    <div class="correct-code-label">Correct order:</div>
                    <ol class="correct-code-list">
                        ${orderedLines.map(line => `<li><code>${line.replace(/</g, '&lt;').replace(/>/g, '&gt;')}</code></li>`).join('')}
                    </ol>`;
            } else {
                correctDisplay = `<span class="correct-answer-text">${result.correct_answer}</span>`;
            }
            feedbackArea.innerHTML = `✗ Incorrect. ${correctDisplay}`;
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
        { level: 1, start: 0,   next: 50  },
        { level: 2, start: 50,  next: 120 },
        { level: 3, start: 120, next: 250 },
        { level: 4, start: 250, next: 500 },
        { level: 5, start: 500, next: null },
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
