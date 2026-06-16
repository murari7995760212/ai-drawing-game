import os
import random

from dotenv import load_dotenv

load_dotenv()


def fallback_prompt(category: str, difficulty: str) -> str:
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

    selected_prompt = random.choice(prompts.get(category, prompts["Objects"]))
    return f"{difficulty}: {selected_prompt}"


def generate_ai_prompt(category: str, difficulty: str) -> str:
    api_key = os.getenv("OPENAI_API_KEY")

    if not api_key or api_key == "your_real_openai_api_key_here":
        return fallback_prompt(category, difficulty)

    try:
        from openai import OpenAI

        client = OpenAI(api_key=api_key)

        response = client.responses.create(
            model="gpt-4.1-mini",
            instructions="You generate short, fun drawing prompts for a collaborative drawing game.",
            input=f"""
Generate one drawing prompt.

Category: {category}
Difficulty: {difficulty}

Rules:
- Keep it under 18 words.
- Make it clear and drawable.
- Do not include numbering.
- Do not include quotation marks.
"""
        )

        prompt = response.output_text.strip()

        if not prompt:
            return fallback_prompt(category, difficulty)

        return f"{difficulty}: {prompt}"

    except Exception:
        return fallback_prompt(category, difficulty)
