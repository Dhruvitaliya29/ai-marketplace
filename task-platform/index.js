import express from "express";
import multer from "multer";
import fs from "fs";
import path from "path";
import cors from "cors";
import pdf from "pdf-parse";
import fetch from "node-fetch";
import { fileURLToPath } from "url";

/* ================================
   BASIC SETUP
================================ */
const app = express();
app.use(cors());
app.use(express.json());

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

/* ================================
   STORAGE SETUP
================================ */
const UPLOAD_DIR = path.join(__dirname, "uploads");
if (!fs.existsSync(UPLOAD_DIR)) fs.mkdirSync(UPLOAD_DIR);

const TASKS_FILE = path.join(__dirname, "tasks.json");
if (!fs.existsSync(TASKS_FILE)) fs.writeFileSync(TASKS_FILE, "[]");

/* ================================
   FRONTEND
================================ */
app.use(express.static(path.join(__dirname, "public")));

app.get("/", (req, res) => {
  res.sendFile(path.join(__dirname, "public", "index.html"));
});

/* ================================
   FILE UPLOAD
================================ */
const upload = multer({ dest: UPLOAD_DIR });

app.post("/upload", upload.single("document"), (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: "No file uploaded" });
    }

    const tasks = JSON.parse(fs.readFileSync(TASKS_FILE));

    const task = {
      id: Date.now(),
      originalFile: req.file.originalname,
      storedFile: req.file.filename,
      taskType: req.body.taskType || "general",
      status: "pending",
      createdAt: new Date().toISOString(),
      result: null
    };

    tasks.push(task);
    fs.writeFileSync(TASKS_FILE, JSON.stringify(tasks, null, 2));

    res.json({ success: true, taskId: task.id });
  } catch (err) {
    res.status(500).json({ error: "Upload failed", details: err.message });
  }
});

/* ================================
   PROCESS DOCUMENT (AI)
================================ */
app.post("/process/:id", async (req, res) => {
  try {
    const tasks = JSON.parse(fs.readFileSync(TASKS_FILE));
    const task = tasks.find(t => t.id == req.params.id);
    if (!task) return res.status(404).json({ error: "Task not found" });

    const filePath = path.join(UPLOAD_DIR, task.storedFile);
    const buffer = fs.readFileSync(filePath);

    const pdfData = await pdf(buffer);
    const rawText = pdfData.text || "";

    if (!rawText.trim()) {
      return res.status(400).json({ error: "No readable text found" });
    }

    /* -------- AI INSTRUCTIONS -------- */
    let instruction = "";

    if (task.taskType === "resume") {
      instruction = `
You are an expert HR analyst.
Extract:
- Candidate name
- Skills
- Experience
- Education
- Strengths
Return concise structured output.
`;
    } else if (task.taskType === "invoice") {
      instruction = `
You are a finance assistant.
Extract:
- Vendor name
- Invoice number
- Total amount
- Due date
`;
    } else {
      instruction = `
You are an AI document analyst.
Summarize clearly.
Extract:
- Purpose
- Key points
- Actionable insights
`;
    }

    /* -------- CHUNKING (ACCURACY BOOST) -------- */
    const CHUNK_SIZE = 2000;
    const chunks = [];
    for (let i = 0; i < rawText.length; i += CHUNK_SIZE) {
      chunks.push(rawText.slice(i, i + CHUNK_SIZE));
    }

    let finalSummary = "";

    for (const chunk of chunks) {
      const prompt = `
${instruction}

Document content:
${chunk}
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

      if (!aiResponse.ok) {
        throw new Error("AI service failed");
      }

      const data = await aiResponse.json();
      finalSummary += "\n" + (data?.result?.summary || "");
    }

    task.status = "completed";
    task.result = {
      summary: finalSummary.trim()
    };

    fs.writeFileSync(TASKS_FILE, JSON.stringify(tasks, null, 2));

    res.json({ success: true, result: task.result });

  } catch (err) {
    res.status(500).json({
      error: "Processing failed",
      details: err.message
    });
  }
});

/* ================================
   SERVER START
================================ */
const PORT = process.env.PORT || 8080;
app.listen(PORT, () => {
  console.log("Task platform running on", PORT);
});
