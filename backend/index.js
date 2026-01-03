import express from "express";
import fetch from "node-fetch";

const app = express();
app.use(express.json());

// Health check route
app.get("/", (req, res) => {
  res.send("AI Marketplace Backend Running");
});

// Marketplace inference endpoint
app.post("/infer", async (req, res) => {
  const { model, text } = req.body;

  if (!model || !text) {
    return res.status(400).json({ error: "model and text required" });
  }

  let targetUrl;

  // HARD-CODED ROUTING (for guaranteed correctness)
  if (model === "summarizer") {
    targetUrl = "https://ai-marketplace-1-x1p6.onrender.com/infer";
  } else if (model === "sentiment") {
    targetUrl = "https://ai-marketplace-2.onrender.com/infer";
  } else {
    return res.status(400).json({ error: "Invalid model" });
  }

  try {
    const response = await fetch(targetUrl, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ text }),
    });

    const data = await response.json();

    return res.json({
      model,
      result: data,
    });
  } catch (err) {
    return res.status(500).json({
      error: "Upstream model failed",
      details: err.message,
    });
  }
});

// 🚨 VERY IMPORTANT: Render port binding
const PORT = process.env.PORT || 3000;

app.listen(PORT, () => {
  console.log(`Marketplace backend running on port ${PORT}`);
});
