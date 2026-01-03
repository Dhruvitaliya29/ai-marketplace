import express from "express";
import fetch from "node-fetch";

const app = express();
app.use(express.json());

// MODEL ROUTES (marketplace catalog)
const MODELS = {
  summarizer: process.env.SUMMARIZER_URL,
  sentiment: process.env.SENTIMENT_URL,
};

app.get("/", (req, res) => {
  res.send("AI Marketplace Backend Running");
});

// Marketplace inference endpoint
app.post("/infer", async (req, res) => {
  const { model, text } = req.body;

  if (!text || !model) {
    return res.status(400).json({ error: "model and text required" });
  }

  let targetUrl;

  if (model === "summarizer") {
    targetUrl = "https://ai-marketplace-1-x1p6.onrender.com/infer";
  } else if (model === "sentiment") {
    targetUrl = "https://ai-marketplace-2-xxxx.onrender.com/infer";
  } else {
    return res.status(400).json({ error: "Invalid model" });
  }

  try {
    const response = await fetch(targetUrl, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ text }),
    });

    const data = await response.json();
    res.json({ model, result: data });

  } catch (err) {
    res.status(500).json({ error: "Upstream model failed", details: err.message });
  }
});
