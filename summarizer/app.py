from fastapi import FastAPI
from pydantic import BaseModel

app = FastAPI()

class Input(BaseModel):
    text: str

@app.get("/")
def root():
    return {"status": "Summarizer service running"}

@app.post("/infer")
def infer(data: Input):
    # simple placeholder logic
    return {
        "summary": data.text[:100] + "..."
    }
