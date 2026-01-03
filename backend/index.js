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

  if (!MODELS[model]) {
    return res.status(400).json({ error: "Invalid model" });
  }

  try {
    const response = await fetch(MODELS[model], {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ text }),
    });

    const result = await response.json();
    res.json({ model, result });

  } catch (err) {
    res.status(500).json({ error: "Model service unavailable" });
  }
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Marketplace backend running on port ${PORT}`);
});
