import express from "express";
import cors from "cors";
import multer from "multer";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import fetch from "node-fetch";
import pdf from "pdf-parse";

/* -------------------- */
/* Basic setup */
/* -------------------- */
const app = express();
app.use(cors());
app.use(express.json());

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

/* -------------------- */
/* Serve frontend */
/* -------------------- */
app.use(express.static(path.join(__dirname, "public")));

app.get("/", (req, res) => {
  res.sendFile(path.join(__dirname, "public", "index.html"));
});

/* -------------------- */
/* Storage setup */
/* -------------------- */
const UPLOAD_DIR = path.join(__dirname, "uploads");
const TASKS_FILE = path.join(__dirname, "tasks.json");

if (!fs.existsSync(UPLOAD_DIR)) {
  fs.mkdirSync(UPLOAD_DIR);
}

if (!fs.existsSync(TASKS_FILE)) {
  fs.writeFileSync(TASKS_FILE, JSON.stringify([]));
}

/* -------------------- */
/* Multer (IMPORTANT FIX) */
/* -------------------- */
const upload = multer({
  storage: multer.diskStorage({
    destination: (req, file, cb) => {
      cb(null, UPLOAD_DIR);
    },
    filename: (req, file, cb) => {
      const unique =
        Date.now() + "-" + Math.round(Math.random() * 1e9);
      cb(null, unique + path.extname(file.originalname));
    }
  }),
  limits: { fileSize: 10 * 1024 * 1024 } // 10MB
});

/* -------------------- */
/* Health check */
/* -------------------- */
app.get("/health", (req, res) => {
  res.json({ status: "Task platform running" });
});

/* -------------------- */
/* Upload document */
/* -------------------- */
app.post("/upload", upload.any(), (req, res) => {
  console.log("FILES:", req.files);

  if (!req.files || req.files.length === 0) {
    return res.status(400).json({
      error: "Upload failed",
      reason: "No file received"
    });
  }

  const file = req.files[0];
  const tasks = JSON.parse(fs.readFileSync(TASKS_FILE));

  const task = {
    id: Date.now(),
    originalFile: file.originalname,
    storedFile: file.filename,
    status: "pending",
    createdAt: new Date().toISOString(),
    result: null
  };

  tasks.push(task);
  fs.writeFileSync(TASKS_FILE, JSON.stringify(tasks, null, 2));

  res.json({
    message: "Uploaded",
    taskId: task.id
  });
});

/* -------------------- */
/* List tasks */
/* -------------------- */
app.get("/tasks", (req, res) => {
  const tasks = JSON.parse(fs.readFileSync(TASKS_FILE));
  res.json(tasks);
});

/* -------------------- */
/* Process task (PDF → OCR → AI) */
/* -------------------- */
app.post("/process/:id", async (req, res) => {
  const tasks = JSON.parse(fs.readFileSync(TASKS_FILE));
  const task = tasks.find(t => t.id == req.params.id);

  if (!task) {
    return res.status(404).json({ error: "Task not found" });
  }

  const filePath = path.join(UPLOAD_DIR, task.storedFile);

  if (!fs.existsSync(filePath)) {
    return res.status(404).json({
      error: "Uploaded file missing on server"
    });
  }

  let extractedText = "";

  try {
    const buffer = fs.readFileSync(filePath);
    const pdfData = await pdf(buffer);
    extractedText = pdfData.text;
  } catch (err) {
    return res.status(500).json({
      error: "PDF text extraction failed",
      details: err.message
    });
  }

  if (!extractedText || extractedText.trim().length === 0) {
    return res.status(400).json({
      error: "No readable text found in document"
    });
  }

  /* ---- Call AI Marketplace ---- */
  let aiResult;

  try {
    const aiResponse = await fetch(
      "https://ai-marketplace--DhruvItaliya.replit.app/infer",
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          model: "summarizer",
          text: extractedText
        })
      }
    );

    aiResult = await aiResponse.json();
  } catch (err) {
    return res.status(500).json({
      error: "AI service failed",
      details: err.message
    });
  }

  task.status = "completed";
  task.result = aiResult;

  fs.writeFileSync(TASKS_FILE, JSON.stringify(tasks, null, 2));

  res.json({
    message: "Processed",
    result: aiResult
  });
});

/* -------------------- */
/* Start server */
/* -------------------- */
const PORT = process.env.PORT || 8080;
app.listen(PORT, () => {
  console.log("Task platform running on", PORT);
});
