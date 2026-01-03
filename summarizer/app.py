from fastapi import FastAPI

app = FastAPI()

@app.get("/")
def root():
    return {"status": "Summarizer service running"}
