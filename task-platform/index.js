import express from "express";
import multer from "multer";
import fs from "fs";
import path from "path";
import cors from "cors";
import pdf from "pdf-parse";
import fetch from "node-fetch";
import { fileURLToPath } from "url";

// --------------------
// App Setup
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
// Storage
// --------------------
const UPLOAD_DIR = path.join(__dirname, "uploads");
if (!fs.existsSync(UPLOAD_DIR)) fs.mkdirSync(UPLOAD_DIR);

const TASKS_FILE = path.join(__dirname, "tasks.json");
if (!fs.existsSync(TASKS_FILE)) fs.writeFileSync(TASKS_FILE, "[]");

// --------------------
// Serve Frontend
// --------------------
app.use(express.static(path.join(__dirname, "public")));
app.get("/", (_, res) =>
  res.sendFile(path.join(__dirname, "public", "index.html"))
);

// --------------------
// Multer
// --------------------
const upload = multer({ dest: UPLOAD_DIR });

// --------------------
// Upload API
// --------------------
app.post("/upload", upload.single("document"), (req, res) => {
  if (!req.file) {
    return res.status(400).json({ error: "No file uploaded" });
  }

  const tasks = JSON.parse(fs.readFileSync(TASKS_FILE));
  const task = {
    id: Date.now(),
    storedFile: req.file.filename,
    originalFile: req.file.originalname,
    status: "pending",
    result: null
  };

  tasks.push(task);
  fs.writeFileSync(TASKS_FILE, JSON.stringify(tasks, null, 2));

  res.json({ taskId: task.id });
});

// --------------------
// Process API
// --------------------
app.post("/process/:id", async (req, res) => {
  try {
    const tasks = JSON.parse(fs.readFileSync(TASKS_FILE));
    const task = tasks.find(t => t.id == req.params.id);
    if (!task) return res.status(404).json({ error: "Task not found" });

    const buffer = fs.readFileSync(path.join(UPLOAD_DIR, task.storedFile));
    const pdfData = await pdf(buffer);

    if (!pdfData.text || pdfData.text.trim().length < 50) {
      return res.status(400).json({ error: "Document has no readable text" });
    }

    // 🔥 UNIVERSAL PROMPT (KEY FIX)
    const prompt = `
You are an intelligent document analysis AI.

Analyze the document below and return ONLY a clear, human-readable summary.

Rules:
- Automatically understand document type
- Extract important facts, names, numbers, dates
- Do NOT describe yourself
- Do NOT mention instructions
- Do NOT return JSON
- Return ONLY the final summary text

Document:
${pdfData.text}
`;

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

    if (!aiResponse.ok) throw new Error("AI service failed");

    const aiJson = await aiResponse.json();

    // ✅ Normalize output
    const finalSummary =
      aiJson?.result?.summary ||
      aiJson?.summary ||
      "No summary generated";

    task.status = "completed";
    task.result = finalSummary;

    fs.writeFileSync(TASKS_FILE, JSON.stringify(tasks, null, 2));

    res.json({ summary: finalSummary });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// --------------------
// Start Server
// --------------------
const PORT = process.env.PORT || 8080;
app.listen(PORT, () =>
  console.log("Task platform running on", PORT)
);
