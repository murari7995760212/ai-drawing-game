from pathlib import Path

import joblib
import numpy as np


MODEL_PATH = Path(__file__).resolve().parent / "model" / "drawing_knn.joblib"


def extract_features(strokes):
    valid_strokes = []
    all_points = []

    for stroke in strokes:
        clean_stroke = []

        for point in stroke:
            if "x" in point and "y" in point:
                clean_point = {
                    "x": float(point["x"]),
                    "y": float(point["y"])
                }
                clean_stroke.append(clean_point)
                all_points.append(clean_point)

        if clean_stroke:
            valid_strokes.append(clean_stroke)

    stroke_count = len(valid_strokes)
    point_count = len(all_points)

    if point_count < 2:
        return np.array([[0, 0, 1, 0, 0]])

    xs = [p["x"] for p in all_points]
    ys = [p["y"] for p in all_points]

    width = max(xs) - min(xs) + 1
    height = max(ys) - min(ys) + 1
    aspect_ratio = width / height

    total_length = 0
    direction_changes = 0

    for stroke in valid_strokes:
        previous_angle = None

        for i in range(1, len(stroke)):
            x1 = stroke[i - 1]["x"]
            y1 = stroke[i - 1]["y"]
            x2 = stroke[i]["x"]
            y2 = stroke[i]["y"]

            dx = x2 - x1
            dy = y2 - y1

            distance = (dx ** 2 + dy ** 2) ** 0.5
            total_length += distance

            angle = np.arctan2(dy, dx)

            if previous_angle is not None:
                if abs(angle - previous_angle) > 0.8:
                    direction_changes += 1

            previous_angle = angle

    total_length_scaled = total_length / 100

    return np.array([[
        stroke_count,
        point_count,
        aspect_ratio,
        total_length_scaled,
        direction_changes
    ]])


def predict_category(strokes):
    if not MODEL_PATH.exists():
        return {
            "predicted_category": "model_not_trained",
            "confidence": 0
        }

    model = joblib.load(MODEL_PATH)
    features = extract_features(strokes)

    prediction = model.predict(features)[0]

    confidence = 80

    if hasattr(model, "predict_proba"):
        probabilities = model.predict_proba(features)[0]
        confidence = int(max(probabilities) * 100)

    return {
        "predicted_category": str(prediction),
        "confidence": confidence
    }