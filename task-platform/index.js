import express from "express";
import multer from "multer";
import fs from "fs";
import path from "path";
import cors from "cors";
import pdf from "pdf-parse";
import fetch from "node-fetch";
import { fileURLToPath } from "url";

/* =====================
   SETUP
===================== */
const app = express();
app.use(cors());
app.use(express.json());

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

/* =====================
   STORAGE
===================== */
const UPLOAD_DIR = path.join(__dirname, "uploads");
if (!fs.existsSync(UPLOAD_DIR)) fs.mkdirSync(UPLOAD_DIR);

const TASKS_FILE = path.join(__dirname, "tasks.json");
if (!fs.existsSync(TASKS_FILE)) fs.writeFileSync(TASKS_FILE, "[]");

/* =====================
   FRONTEND
===================== */
app.use(express.static(path.join(__dirname, "public")));
app.get("/", (_, res) =>
  res.sendFile(path.join(__dirname, "public", "index.html"))
);

/* =====================
   UPLOAD
===================== */
const upload = multer({ dest: UPLOAD_DIR });

app.post("/upload", upload.single("document"), (req, res) => {
  if (!req.file) return res.status(400).json({ error: "No file uploaded" });

  const tasks = JSON.parse(fs.readFileSync(TASKS_FILE));
  const task = {
    id: Date.now(),
    file: req.file.filename,
    status: "pending"
  };

  tasks.push(task);
  fs.writeFileSync(TASKS_FILE, JSON.stringify(tasks, null, 2));

  res.json({ taskId: task.id });
});

/* =====================
   PROCESS DOCUMENT
===================== */
app.post("/process/:id", async (req, res) => {
  try {
    const tasks = JSON.parse(fs.readFileSync(TASKS_FILE));
    const task = tasks.find(t => t.id == req.params.id);
    if (!task) return res.status(404).json({ error: "Task not found" });

    const buffer = fs.readFileSync(path.join(UPLOAD_DIR, task.file));
    const pdfData = await pdf(buffer);

    const documentText = (pdfData.text || "").replace(/\s+/g, " ").trim();
    if (documentText.length < 100) {
      return res.status(400).json({ error: "Insufficient readable text" });
    }

    // 🔥 CLEAN PROMPT (NO ROLE, NO INSTRUCTIONS RETURNED)
    const prompt = `
Return ONLY the final analysis.

FORMAT STRICTLY AS:

Document Type:
<type>

Key Points:
- point 1
- point 2
- point 3

Summary:
<concise paragraph>

DOCUMENT:
"""${documentText}"""
`;

    const aiRes = await fetch(
      "https://ai-marketplace--DhruvItaliya.replit.app/infer",
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ model: "summarizer", text: prompt })
      }
    );

    if (!aiRes.ok) throw new Error("AI service error");

    const aiData = await aiRes.json();

    // ✅ SAFE EXTRACTION
    let summary =
      aiData?.result?.summary ||
      aiData?.summary ||
      "";

    // 🚿 FINAL SANITIZATION (extra safety)
    summary = summary
      .replace(/Analyze the document below[\s\S]*?DOCUMENT:/i, "")
      .trim();

    task.status = "completed";
    task.result = summary;

    fs.writeFileSync(TASKS_FILE, JSON.stringify(tasks, null, 2));

    res.json({ summary });

  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

/* =====================
   SERVER
===================== */
const PORT = process.env.PORT || 8080;
app.listen(PORT, () =>
  console.log("Task platform running on", PORT)
);
