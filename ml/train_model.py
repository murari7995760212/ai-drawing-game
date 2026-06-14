from pathlib import Path

import joblib
import numpy as np
from sklearn.metrics import accuracy_score
from sklearn.model_selection import train_test_split
from sklearn.neighbors import KNeighborsClassifier


MODEL_DIR = Path(__file__).resolve().parent / "model"
MODEL_DIR.mkdir(exist_ok=True)

rng = np.random.default_rng(42)

category_centers = {
    "Animals": [8, 90, 1.2, 18, 20],
    "Objects": [5, 60, 1.0, 12, 10],
    "Food": [6, 70, 1.1, 14, 14],
    "Vehicles": [7, 80, 1.7, 20, 12],
    "Nature": [10, 100, 1.3, 22, 25],
}

X = []
y = []

for category, center in category_centers.items():
    center = np.array(center, dtype=float)

    for _ in range(150):
        noise = rng.normal(0, [2, 15, 0.25, 4, 5])
        sample = center + noise
        sample = np.maximum(sample, [1, 5, 0.2, 1, 0])

        X.append(sample)
        y.append(category)

X = np.array(X)
y = np.array(y)

X_train, X_test, y_train, y_test = train_test_split(
    X,
    y,
    test_size=0.2,
    random_state=42,
    stratify=y
)

model = KNeighborsClassifier(n_neighbors=5)
model.fit(X_train, y_train)

predictions = model.predict(X_test)
accuracy = accuracy_score(y_test, predictions)

model_path = MODEL_DIR / "drawing_knn.joblib"
joblib.dump(model, model_path)

print("KNN model trained successfully.")
print(f"Accuracy: {accuracy:.2f}")
print(f"Model saved at: {model_path}")