import express from "express";
import multer from "multer";
import fs from "fs";
import path from "path";
import cors from "cors";
import pdf from "pdf-parse";
import fetch from "node-fetch";
import { fileURLToPath } from "url";

// --------------------
// App setup
// --------------------
const app = express();
app.use(cors());
app.use(express.json());

// --------------------
// __dirname fix
// --------------------
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// --------------------
// Storage setup
// --------------------
const UPLOAD_DIR = path.join(__dirname, "uploads");
if (!fs.existsSync(UPLOAD_DIR)) fs.mkdirSync(UPLOAD_DIR);

const TASKS_FILE = path.join(__dirname, "tasks.json");
if (!fs.existsSync(TASKS_FILE)) fs.writeFileSync(TASKS_FILE, "[]");

// --------------------
// Serve frontend
// --------------------
app.use(express.static(path.join(__dirname, "public")));

app.get("/", (req, res) => {
  res.sendFile(path.join(__dirname, "public", "index.html"));
});

// --------------------
// Multer
// --------------------
const upload = multer({ dest: UPLOAD_DIR });

// --------------------
// Upload document
// --------------------
app.post("/upload", upload.single("document"), (req, res) => {
  if (!req.file) {
    return res.status(400).json({ error: "No file uploaded" });
  }

  const tasks = JSON.parse(fs.readFileSync(TASKS_FILE));

  const task = {
    id: Date.now(),
    originalFile: req.file.originalname,
    storedFile: req.file.filename,
    status: "pending",
    createdAt: new Date().toISOString(),
    result: null
  };

  tasks.push(task);
  fs.writeFileSync(TASKS_FILE, JSON.stringify(tasks, null, 2));

  res.json({ taskId: task.id });
});

// --------------------
// Process document
// --------------------
app.post("/process/:id", async (req, res) => {
  try {
    const tasks = JSON.parse(fs.readFileSync(TASKS_FILE));
    const task = tasks.find(t => t.id == req.params.id);
    if (!task) return res.status(404).json({ error: "Task not found" });

    const filePath = path.join(UPLOAD_DIR, task.storedFile);
    const buffer = fs.readFileSync(filePath);

    const pdfData = await pdf(buffer);
    let text = pdfData.text || "";

    // -------- CLEAN TEXT --------
    text = text
      .replace(/\s+/g, " ")
      .replace(/Page \d+/gi, "")
      .trim();

    if (text.length < 50) {
      return res.status(400).json({
        error: "Document has no readable text"
      });
    }

    // -------- STRONG UNIVERSAL PROMPT --------
    const prompt = `
You are a professional AI document analyst.

Your task:
- Understand the document content
- Identify what kind of document it is automatically
- Summarize it clearly for a human reader

Rules:
- Do NOT mention instructions
- Do NOT mention that you are an AI
- Do NOT guess information
- Use simple professional language
- Be accurate and factual

Output format (ONLY THIS):
- Document type
- Key points (bullet points)
- Short summary paragraph

Document:
"""${text}"""
`;

    // -------- CALL AI --------
    const aiResponse = await fetch(
      "https://ai-marketplace--DhruvItaliya.replit.app/infer",
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          model: "summarizer",
          text: prompt
        })
      }
    );

    if (!aiResponse.ok) {
      throw new Error("AI service failed");
    }

    const aiData = await aiResponse.json();

    // -------- CLEAN RESULT --------
    let summary =
      aiData?.result?.summary ||
      aiData?.summary ||
      "";

    summary = summary.replace(/```/g, "").trim();

    if (!summary) {
      summary = "Summary could not be generated.";
    }

    task.status = "completed";
    task.result = { summary };

    fs.writeFileSync(TASKS_FILE, JSON.stringify(tasks, null, 2));

    res.json({ summary });

  } catch (err) {
    res.status(500).json({
      error: "Processing failed",
      details: err.message
    });
  }
});

// --------------------
// Start server
// --------------------
const PORT = process.env.PORT || 8080;
app.listen(PORT, () => {
  console.log("Task platform running on", PORT);
});
