import express from "express";
import cors from "cors";
import multer from "multer";
import fs from "fs";
import path from "path";
import pdf from "pdf-parse";
import Tesseract from "tesseract.js";
import { fileURLToPath } from "url";

// --------------------
// App setup
// --------------------
const app = express();
app.use(cors());
app.use(express.json());

// --------------------
// __dirname (ESM)
// --------------------
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// --------------------
// Ensure uploads directory EXISTS (CRITICAL)
// --------------------
const UPLOAD_DIR = path.join(__dirname, "uploads");

if (!fs.existsSync(UPLOAD_DIR)) {
  fs.mkdirSync(UPLOAD_DIR, { recursive: true });
}

// --------------------
// Multer setup (FIXED)
// --------------------
const upload = multer({
  dest: UPLOAD_DIR,
  limits: { fileSize: 10 * 1024 * 1024 } // 10MB
});

// --------------------
// Serve frontend
// --------------------
app.use(express.static(path.join(__dirname, "public")));

app.get("/", (req, res) => {
  res.sendFile(path.join(__dirname, "public", "index.html"));
});

// --------------------
// Tasks storage
// --------------------
const TASKS_FILE = path.join(__dirname, "tasks.json");

if (!fs.existsSync(TASKS_FILE)) {
  fs.writeFileSync(TASKS_FILE, JSON.stringify([]));
}

// --------------------
// Upload document
// --------------------
app.post("/upload", upload.single("document"), (req, res) => {
  if (!req.file) {
    return res.status(400).json({
      error: "Upload failed – no file received"
    });
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

  res.json({
    message: "Uploaded",
    taskId: task.id
  });
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

  const filePath = path.join(UPLOAD_DIR, task.storedFile);

  if (!fs.existsSync(filePath)) {
    return res.status(500).json({
      error: "Uploaded file missing on server"
    });
  }

  let extractedText = "";

  try {
    const buffer = fs.readFileSync(filePath);

    // Try PDF text
    const pdfData = await pdf(buffer);
    extractedText = pdfData.text.trim();

    // OCR fallback
    if (!extractedText) {
      const ocr = await Tesseract.recognize(filePath, "eng");
      extractedText = ocr.data.text;
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

  // AI call
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
    message: "Processed",
    result: aiData
  });
});

// --------------------
// Start server
// --------------------
const PORT = process.env.PORT || 8080;
app.listen(PORT, () => {
  console.log("Task platform running on", PORT);
});
