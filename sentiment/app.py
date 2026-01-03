from fastapi import FastAPI
from pydantic import BaseModel

app = FastAPI()

class Input(BaseModel):
    text: str

@app.get("/")
def root():
    return {"status": "Sentiment service running"}

@app.post("/infer")
def infer(data: Input):
    text = data.text.lower()

    if "good" in text or "great" in text or "excellent" in text:
        sentiment = "positive"
    elif "bad" in text or "poor" in text or "worst" in text:
        sentiment = "negative"
    else:
        sentiment = "neutral"

    return {
        "sentiment": sentiment
    }
