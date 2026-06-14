from datetime import datetime
from sqlalchemy import Column, Integer, String, DateTime, Text
from backend.database import Base


class User(Base):
    __tablename__ = "users"

    id = Column(Integer, primary_key=True, index=True)
    username = Column(String(100), unique=True, index=True, nullable=False)
    password_hash = Column(String(255), nullable=False)


class GameHistory(Base):
    __tablename__ = "game_history"

    id = Column(Integer, primary_key=True, index=True)
    room_code = Column(String(20), nullable=False)
    username = Column(String(100), nullable=False)
    score = Column(Integer, default=0)
    prompt = Column(Text, nullable=True)
    predicted_category = Column(String(100), nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow)