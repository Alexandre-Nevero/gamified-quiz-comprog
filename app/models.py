from sqlalchemy import Column, Integer, Text, ForeignKey
from app.database import Base


class User(Base):
    __tablename__ = "users"

    id = Column(Integer, primary_key=True, autoincrement=True)
    username = Column(Text, nullable=False, unique=True)
    password = Column(Text, nullable=False)  # bcrypt hash
    xp = Column(Integer, nullable=False, default=0)


class Session(Base):
    __tablename__ = "sessions"

    id = Column(Integer, primary_key=True, autoincrement=True)
    token = Column(Text, nullable=False, unique=True)  # secrets.token_hex(32)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    created_at = Column(Text, nullable=False)  # ISO 8601 timestamp


class Question(Base):
    __tablename__ = "questions"

    id = Column(Integer, primary_key=True, autoincrement=True)
    topic = Column(Text, nullable=False)
    difficulty = Column(Text, nullable=False)  # "Easy" | "Medium" | "Hard"
    question_type = Column(Text, nullable=False)  # "multiple_choice" | "true_false" | "fill_blank" | "code_arrangement"
    question_text = Column(Text, nullable=False)
    correct_answer = Column(Text, nullable=False)


class Choice(Base):
    __tablename__ = "choices"

    id = Column(Integer, primary_key=True, autoincrement=True)
    question_id = Column(Integer, ForeignKey("questions.id"), nullable=False)
    label = Column(Text, nullable=False)  # "A" | "B" | "C" | "D"
    text = Column(Text, nullable=False)


class CodeBlock(Base):
    __tablename__ = "code_blocks"

    id = Column(Integer, primary_key=True, autoincrement=True)
    question_id = Column(Integer, ForeignKey("questions.id"), nullable=False)
    correct_index = Column(Integer, nullable=False)  # 0-based position in correct order
    content = Column(Text, nullable=False)


class QuizSession(Base):
    __tablename__ = "quiz_sessions"

    id = Column(Integer, primary_key=True, autoincrement=True)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=True)  # NULL for guests
    topic = Column(Text, nullable=False)
    difficulty = Column(Text, nullable=False)
    question_ids = Column(Text, nullable=False)  # JSON array of 10 question IDs
    answers = Column(Text, nullable=False, default="[]")  # JSON array of submitted answers
    completed = Column(Integer, nullable=False, default=0)  # 0 = in progress, 1 = done
