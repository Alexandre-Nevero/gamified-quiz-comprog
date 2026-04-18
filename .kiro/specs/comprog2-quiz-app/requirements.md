# Requirements Document

## Introduction

A gamified quiz web application focused on CompProg 2 (C language) concepts. The app allows students to take quizzes across multiple topics and difficulty levels without requiring registration. Registration is optional and only needed to save progress and appear on the leaderboard. Registered users earn XP and level up as they answer questions correctly; levels are cosmetic and do not gate access to any difficulty. A public leaderboard ranks the top 10 users by XP. The application is built with a FastAPI backend serving both the REST API and static frontend files, using SQLite for persistence, and deployed on Render. The frontend uses a retro-modern aesthetic (pixel fonts, terminal-green palette, scanline effects).

---

## Glossary

- **System**: The CompProg 2 Quiz Web Application as a whole.
- **Auth_Service**: The component responsible for user registration, login, and session management.
- **Quiz_Engine**: The component that selects questions, evaluates answers, and calculates scores.
- **Question_Bank**: The SQLite-backed store of all quiz questions, organized by topic and difficulty.
- **XP_Service**: The component that tracks and updates user experience points and levels.
- **Leaderboard_Service**: The component that computes and serves the ranked list of users by XP.
- **User**: A registered person who interacts with the quiz application.
- **Guest**: An unauthenticated visitor who takes quizzes without registering; progress is not saved and the Guest does not appear on the Leaderboard.
- **Session**: An authenticated context established after a successful login, identified by a token.
- **Question**: A single quiz item belonging to a topic, difficulty level, and question type.
- **Topic**: A subject area covered by the quiz. Valid topics: Arrays, Multidimensional Arrays, Basic Sorting Algorithms, Binary Search, Functions, Pointers.
- **Difficulty**: The difficulty tier of a question. Valid values: Easy, Medium, Hard.
- **Question_Type**: The format of a question. Valid types: Multiple Choice, True/False, Fill-in-the-Blank, Code Arrangement.
- **XP**: Experience points earned by a User for correctly answering questions.
- **Level**: A numeric rank derived from a User's total accumulated XP, used for cosmetic display and leaderboard tracking only. Level does not restrict access to any Difficulty.
- **Leaderboard**: A publicly visible ranked list of the top 10 Users ordered by XP descending.
- **Code_Block**: A single line or logical unit of C code used in a Code Arrangement question.
- **Correct_Order**: The stored sequence of Code_Blocks that represents the correct solution for a Code Arrangement question.

---

## Requirements

### Requirement 1: User Registration

**User Story:** As a new visitor, I want to create an account with a username and password, so that I can access the quiz application and have my progress saved.

#### Acceptance Criteria

1. THE Auth_Service SHALL provide a registration endpoint that accepts a username and a password.
2. WHEN a registration request is received with a username that does not already exist in the database, THE Auth_Service SHALL create a new User record with the provided username and a securely hashed password.
3. WHEN a registration request is received with a username that already exists, THE Auth_Service SHALL return an error response indicating the username is taken.
4. WHEN a registration request is received with a username shorter than 3 characters or longer than 32 characters, THE Auth_Service SHALL return an error response indicating the username length requirement.
5. WHEN a registration request is received with a password shorter than 6 characters, THE Auth_Service SHALL return an error response indicating the password length requirement.
6. THE Auth_Service SHALL store passwords as hashed values and SHALL NOT store plaintext passwords.
7. WHEN a new User is successfully created, THE XP_Service SHALL initialize that User's XP to 0 and Level to 1.

---

### Requirement 2: User Login and Session Management

**User Story:** As a registered user, I want to log in with my username and password, so that I can access my account and quiz features.

#### Acceptance Criteria

1. THE Auth_Service SHALL provide a login endpoint that accepts a username and a password.
2. WHEN a login request is received with a username and password that match a stored User record, THE Auth_Service SHALL return a Session token to the client.
3. WHEN a login request is received with a username that does not exist or a password that does not match, THE Auth_Service SHALL return an error response indicating invalid credentials.
4. WHILE a User holds a valid Session token, THE System SHALL grant that User access to protected quiz and profile endpoints.
5. THE Auth_Service SHALL provide a logout endpoint that invalidates the current Session token.
6. WHEN a request to a protected endpoint is received without a valid Session token, THE System SHALL return an unauthorized error response.

---

### Requirement 3: Quiz Topic and Difficulty Selection

**User Story:** As a visitor (guest or registered user), I want to choose a topic and difficulty level before starting a quiz, so that I can practice the concepts I need at the right challenge level.

#### Acceptance Criteria

1. THE Quiz_Engine SHALL present the available Topics and Difficulty levels for selection to any visitor, whether authenticated or unauthenticated.
2. THE Quiz_Engine SHALL support the following Topics: Arrays, Multidimensional Arrays, Basic Sorting Algorithms, Binary Search, Functions, Pointers.
3. THE Quiz_Engine SHALL support the following Difficulty levels: Easy, Medium, Hard.
4. THE Quiz_Engine SHALL allow any visitor to select any Difficulty level regardless of their Level or authentication status.
5. WHEN a User selects Easy difficulty, THE Quiz_Engine SHALL include only Multiple Choice and True/False question types in the quiz session.
6. WHEN a User selects Medium difficulty, THE Quiz_Engine SHALL include Multiple Choice, True/False, and Fill-in-the-Blank question types in the quiz session.
7. WHEN a User selects Hard difficulty, THE Quiz_Engine SHALL include Multiple Choice, True/False, Fill-in-the-Blank, and Code Arrangement question types in the quiz session.

---

### Requirement 4: Quiz Session Execution

**User Story:** As a visitor (guest or registered user), I want to answer a series of questions in a quiz session, so that I can test my knowledge and, if registered, earn XP.

#### Acceptance Criteria

1. WHEN a visitor starts a quiz session for a given Topic and Difficulty, THE Quiz_Engine SHALL retrieve exactly 10 questions from the Question_Bank matching that Topic and Difficulty.
2. THE Quiz_Engine SHALL present one question at a time to the visitor.
3. WHEN a visitor submits an answer for a Multiple Choice or True/False question, THE Quiz_Engine SHALL immediately evaluate the answer as correct or incorrect.
4. WHEN a visitor submits an answer for a Fill-in-the-Blank question, THE Quiz_Engine SHALL normalize both the submitted answer and the stored correct answer before comparing them; normalization SHALL include trimming leading and trailing whitespace, collapsing multiple consecutive spaces into a single space, converting to lowercase, and stripping any trailing semicolons.
5. WHEN a visitor submits an answer for a Code Arrangement question, THE Quiz_Engine SHALL evaluate the submitted sequence of Code_Blocks against the stored Correct_Order.
6. WHEN a visitor answers a question correctly, THE Quiz_Engine SHALL record the result as correct and display a correct-answer confirmation to the visitor.
7. WHEN a visitor answers a question incorrectly, THE Quiz_Engine SHALL record the result as incorrect and display the correct answer to the visitor.
8. WHEN all 10 questions in a quiz session have been answered, THE Quiz_Engine SHALL display a session summary showing the number of correct answers, total questions, and XP earned.
9. WHEN a Guest completes a quiz session, THE Quiz_Engine SHALL display the session summary but SHALL NOT persist the results or award XP.

---

### Requirement 5: Scoring and XP System

**User Story:** As a user, I want to earn XP for correct answers based on difficulty, so that harder questions reward me more and I can level up over time.

#### Acceptance Criteria

1. WHEN a User answers a question correctly at Easy difficulty, THE XP_Service SHALL award 10 XP to that User.
2. WHEN a User answers a question correctly at Medium difficulty, THE XP_Service SHALL award 20 XP to that User.
3. WHEN a User answers a question correctly at Hard difficulty, THE XP_Service SHALL award 30 XP to that User.
4. WHEN a User answers a question incorrectly, THE XP_Service SHALL award 0 XP to that User for that question.
5. THE XP_Service SHALL maintain a cumulative total XP value for each User that persists across sessions.
6. WHEN a User's total XP is updated, THE XP_Service SHALL recalculate that User's Level according to the defined XP-to-Level thresholds.
7. THE XP_Service SHALL define Level thresholds as follows: Level 1 = 0–99 XP, Level 2 = 100–249 XP, Level 3 = 250–499 XP, Level 4 = 500–999 XP, Level 5 = 1000+ XP. Levels are cosmetic and do not restrict access to any Difficulty.
8. WHEN a User's Level increases as a result of an XP update, THE XP_Service SHALL include the new Level in the response so the frontend can display a level-up notification.

---

### Requirement 6: Leaderboard

**User Story:** As a visitor, I want to see a public leaderboard showing the top 10 users ranked by XP, so that I can compare progress with the best players.

#### Acceptance Criteria

1. THE Leaderboard_Service SHALL provide an endpoint that returns the top 10 Users ordered by total XP descending.
2. WHEN two or more Users have equal XP, THE Leaderboard_Service SHALL order those Users alphabetically by username as a tiebreaker.
3. THE Leaderboard_Service SHALL include each User's username, total XP, and Level in the leaderboard response.
4. THE Leaderboard_Service SHALL make the leaderboard endpoint accessible to both authenticated and unauthenticated visitors.
5. WHEN the leaderboard is requested, THE Leaderboard_Service SHALL return the current standings reflecting all XP earned up to the moment of the request.

---

### Requirement 7: Question Bank Structure and Storage

**User Story:** As an administrator, I want questions stored in a structured database format, so that the quiz engine can reliably retrieve and serve them.

#### Acceptance Criteria

1. THE Question_Bank SHALL store each Question with the following attributes: unique identifier, topic, difficulty, question type, question text, and correct answer.
2. THE Question_Bank SHALL store Multiple Choice questions with exactly four answer options and one designated correct option.
3. THE Question_Bank SHALL store True/False questions with a correct answer value of either "True" or "False".
4. THE Question_Bank SHALL store Fill-in-the-Blank questions with a question text containing a blank placeholder and a correct answer string.
5. THE Question_Bank SHALL store Code Arrangement questions as an ordered list of Code_Blocks, where the Correct_Order is the stored sequence index of each block.
6. WHEN a Code Arrangement question is served to a User, THE Quiz_Engine SHALL shuffle the Code_Blocks into a randomized order before presenting them.
7. THE Question_Bank SHALL enforce that each Question belongs to exactly one Topic and exactly one Difficulty level.

---

### Requirement 8: Code Arrangement Question Authoring

**User Story:** As an administrator, I want to provide complete C code and have it decomposed into draggable blocks with the correct order stored, so that Code Arrangement questions can be created efficiently.

#### Acceptance Criteria

1. WHEN complete C source code is provided for a Code Arrangement question, THE Question_Bank SHALL store each logical line or block of that code as a separate Code_Block record.
2. THE Question_Bank SHALL store the Correct_Order as the original sequential index of each Code_Block within the complete code.
3. THE Question_Bank SHALL associate all Code_Blocks for a single question with that question's unique identifier.
4. WHEN a Code Arrangement question is retrieved, THE Quiz_Engine SHALL be able to reconstruct the Correct_Order from the stored Code_Block records.

---

### Requirement 9: Frontend UI and Retro Aesthetic

**User Story:** As a user, I want a visually engaging retro-style interface, so that the quiz experience feels unique and enjoyable.

#### Acceptance Criteria

1. THE System SHALL serve the frontend as static HTML and JavaScript files from the FastAPI application.
2. THE System SHALL apply a retro-modern visual theme using pixel-style fonts, a terminal-green color palette, and scanline visual effects across all pages.
3. THE System SHALL present the Code Arrangement question type using a drag-and-drop interface where the User can reorder Code_Blocks.
4. THE System SHALL display the User's current XP and Level on the authenticated user's interface at all times during a session.
5. WHEN a User's Level increases, THE System SHALL display a level-up notification to the User.
6. THE System SHALL display the quiz session summary screen after all questions in a session are answered, showing correct count, total questions, and XP earned in that session.

---

### Requirement 10: Application Hosting and Deployment

**User Story:** As a developer, I want the application deployed as a single service on Render, so that maintenance is simple and there is no need to manage separate frontend and backend deployments.

#### Acceptance Criteria

1. THE System SHALL expose all REST API routes and serve all static frontend files from a single FastAPI application process.
2. THE System SHALL use SQLite as the sole database, with the database file stored on the Render instance's persistent disk.
3. WHEN the FastAPI application starts, THE System SHALL initialize the SQLite database schema if the schema does not already exist.
4. THE System SHALL serve the frontend entry point (index.html) for all non-API routes to support client-side navigation.
