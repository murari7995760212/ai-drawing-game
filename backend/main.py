import random
import string
from pathlib import Path
from typing import Optional

from fastapi import FastAPI, Depends, HTTPException
from fastapi.responses import FileResponse
from fastapi.staticfiles import StaticFiles
from pydantic import BaseModel
from sqlalchemy.orm import Session

from backend.database import init_db, get_db
from backend.models import User, GameHistory
from backend.security import hash_password, verify_password
from ml.predict import predict_category


BASE_DIR = Path(__file__).resolve().parent.parent

app = FastAPI(
    title="AI Drawing Game Backend",
    description="Backend for AI-enhanced collaborative drawing game",
    version="1.0.0"
)

app.mount(
    "/static",
    StaticFiles(directory=BASE_DIR / "frontend"),
    name="static"
)


class RegisterRequest(BaseModel):
    username: str
    password: str


class LoginRequest(BaseModel):
    username: str
    password: str


class RoomRequest(BaseModel):
    category: str
    difficulty: str


class PredictRequest(BaseModel):
    strokes: list


class HistoryRequest(BaseModel):
    room_code: str
    username: str
    score: int
    prompt: Optional[str] = None
    predicted_category: Optional[str] = None


@app.on_event("startup")
def startup_event():
    init_db()


@app.get("/")
def home():
    return FileResponse(BASE_DIR / "frontend" / "index.html")


@app.get("/api/health")
def health_check():
    return {
        "status": "Backend running successfully"
    }


@app.post("/api/register")
def register(data: RegisterRequest, db: Session = Depends(get_db)):
    username = data.username.strip()

    if len(username) < 3:
        raise HTTPException(status_code=400, detail="Username must be at least 3 characters")

    if len(data.password) < 4:
        raise HTTPException(status_code=400, detail="Password must be at least 4 characters")

    existing_user = db.query(User).filter(User.username == username).first()

    if existing_user:
        raise HTTPException(status_code=400, detail="Username already exists")

    new_user = User(
        username=username,
        password_hash=hash_password(data.password)
    )

    db.add(new_user)
    db.commit()
    db.refresh(new_user)

    return {
        "message": "Registration successful",
        "username": new_user.username
    }


@app.post("/api/login")
def login(data: LoginRequest, db: Session = Depends(get_db)):
    username = data.username.strip()

    user = db.query(User).filter(User.username == username).first()

    if not user:
        raise HTTPException(status_code=401, detail="Invalid username or password")

    if not verify_password(data.password, user.password_hash):
        raise HTTPException(status_code=401, detail="Invalid username or password")

    return {
        "message": "Login successful",
        "username": user.username,
        "user_id": user.id
    }


def create_room_code():
    letters = string.ascii_uppercase + string.digits
    code = ""

    for _ in range(6):
        code += random.choice(letters)

    return code


def generate_demo_prompt(category: str, difficulty: str):
    prompts = {
        "Animals": [
            "Draw a cat sitting near a window.",
            "Draw an elephant using simple shapes.",
            "Draw a bird flying over a tree.",
            "Draw a dog playing with a ball."
        ],
        "Objects": [
            "Draw a mobile phone with apps on screen.",
            "Draw a school bag with books.",
            "Draw a chair using simple lines.",
            "Draw a table lamp."
        ],
        "Food": [
            "Draw a pizza slice with toppings.",
            "Draw an ice cream cone.",
            "Draw an apple with a leaf.",
            "Draw a burger with cheese."
        ],
        "Vehicles": [
            "Draw a car on a road.",
            "Draw a bicycle with two wheels.",
            "Draw a bus near a stop.",
            "Draw an airplane in the sky."
        ],
        "Nature": [
            "Draw mountains with a sun.",
            "Draw a tree with birds.",
            "Draw clouds and rain.",
            "Draw a river flowing through hills."
        ]
    }

    category_prompts = prompts.get(category, prompts["Objects"])
    selected_prompt = random.choice(category_prompts)

    return f"{difficulty}: {selected_prompt}"


@app.post("/api/rooms/create")
def create_room(data: RoomRequest):
    room_code = create_room_code()
    prompt = generate_demo_prompt(data.category, data.difficulty)

    return {
        "message": "Room created successfully",
        "room_code": room_code,
        "category": data.category,
        "difficulty": data.difficulty,
        "prompt": prompt
    }


@app.post("/api/prompt")
def create_prompt(data: RoomRequest):
    prompt = generate_demo_prompt(data.category, data.difficulty)

    return {
        "prompt": prompt
    }


@app.post("/api/predict")
def predict_drawing(data: PredictRequest):
    result = predict_category(data.strokes)

    return result


@app.post("/api/history")
def save_history(data: HistoryRequest, db: Session = Depends(get_db)):
    record = GameHistory(
        room_code=data.room_code,
        username=data.username,
        score=data.score,
        prompt=data.prompt,
        predicted_category=data.predicted_category
    )

    db.add(record)
    db.commit()
    db.refresh(record)

    return {
        "message": "Game history saved",
        "history_id": record.id
    }


@app.get("/api/history/{username}")
def get_history(username: str, db: Session = Depends(get_db)):
    records = (
        db.query(GameHistory)
        .filter(GameHistory.username == username)
        .order_by(GameHistory.created_at.desc())
        .limit(20)
        .all()
    )

    return [
        {
            "id": record.id,
            "room_code": record.room_code,
            "username": record.username,
            "score": record.score,
            "prompt": record.prompt,
            "predicted_category": record.predicted_category,
            "created_at": record.created_at.strftime("%Y-%m-%d %H:%M")
        }
        for record in records
    ]