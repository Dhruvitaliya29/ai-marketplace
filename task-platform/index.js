import express from "express";
import cors from "cors";
import multer from "multer";
import fs from "fs";
import path from "path";
import pdf from "pdf-parse";
import Tesseract from "tesseract.js";
import { fileURLToPath } from "url";

// --------------------
// Setup
// --------------------
const app = express();
app.use(cors());
app.use(express.json());

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Serve frontend
app.use(express.static(path.join(__dirname, "public")));

// Upload config
const upload = multer({ dest: "uploads/" });
const TASKS_FILE = path.join(__dirname, "tasks.json");

// Init storage
if (!fs.existsSync(TASKS_FILE)) {
  fs.writeFileSync(TASKS_FILE, JSON.stringify([]));
}

// --------------------
// Health check
// --------------------
app.get("/", (req, res) => {
  res.send("Task Platform Running with OCR + AI");
});

// --------------------
// Upload document
// --------------------
app.post("/upload", upload.single("document"), (req, res) => {
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

  res.json({ message: "Uploaded", taskId: task.id });
});

// --------------------
// List tasks
// --------------------
app.get("/tasks", (req, res) => {
  const tasks = JSON.parse(fs.readFileSync(TASKS_FILE));
  res.json(tasks);
});

// --------------------
// Process task (OCR + AI)
// --------------------
app.post("/process/:id", async (req, res) => {
  const tasks = JSON.parse(fs.readFileSync(TASKS_FILE));
  const task = tasks.find(t => t.id == req.params.id);

  if (!task) {
    return res.status(404).json({ error: "Task not found" });
  }

  const filePath = path.join(__dirname, "uploads", task.storedFile);
  let extractedText = "";

  try {
    // 1️⃣ Try PDF text extraction
    const buffer = fs.readFileSync(filePath);
    const pdfData = await pdf(buffer);
    extractedText = pdfData.text.trim();

    // 2️⃣ If PDF has no text → OCR fallback
    if (!extractedText) {
      const ocrResult = await Tesseract.recognize(filePath, "eng");
      extractedText = ocrResult.data.text;
    }

  } catch (err) {
    return res.status(500).json({
      error: "Text extraction failed",
      details: err.message
    });
  }

  if (!extractedText || extractedText.length < 10) {
    return res.status(400).json({
      error: "No readable text found"
    });
  }

  // 3️⃣ Send to AI Marketplace
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

  const aiData = await aiResponse.json();

  task.status = "completed";
  task.result = aiData;

  fs.writeFileSync(TASKS_FILE, JSON.stringify(tasks, null, 2));

  res.json({
    message: "Processed with OCR + AI",
    summary: aiData
  });
});

// --------------------
// Start server
// --------------------
const PORT = process.env.PORT || 8080;
app.listen(PORT, () => {
  console.log("Task platform running on", PORT);
});
