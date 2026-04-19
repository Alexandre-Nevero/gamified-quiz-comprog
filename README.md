# CompProg 2 Quiz App

A gamified quiz web application focused on C language (CompProg 2) concepts. Students can take quizzes across multiple topics and difficulty levels, earn XP, level up, and compete on a public leaderboard.

## Quick Start

```bash
pip install -r requirements.txt
python seed.py          # run once to populate the question bank
uvicorn app.main:app --reload
```

Open `http://localhost:8000` in your browser.

## Running Tests

```bash
pytest --tb=short
```

## Deployment

See [DEPLOYMENT.md](DEPLOYMENT.md) for full instructions on deploying to Render.
