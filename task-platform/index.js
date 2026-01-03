import express from "express";
import path from "path";
import { fileURLToPath } from "url";
import multer from "multer";
import fs from "fs";
import cors from "cors";
import pdf from "pdf-parse";

// --------------------
// App setup
// --------------------
const app = express();
app.use(cors());
app.use(express.json());

// --------------------
// __dirname fix (ES modules)
// --------------------
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// --------------------
// Serve frontend
// --------------------
app.use(express.static(path.join(__dirname, "public")));

app.get("/", (req, res) => {
  res.sendFile(path.join(__dirname, "public", "index.html"));
});

// --------------------
// File upload setup
// --------------------
const upload = multer({
  dest: path.join(__dirname, "uploads")
});

const TASKS_FILE = path.join(__dirname, "tasks.json");

// init storage
if (!fs.existsSync(TASKS_FILE)) {
  fs.writeFileSync(TASKS_FILE, JSON.stringify([]));
}

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
// Process task using AI
// --------------------
app.post("/process/:id", async (req, res) => {
  const tasks = JSON.parse(fs.readFileSync(TASKS_FILE));
  const task = tasks.find(t => t.id == req.params.id);

  if (!task) {
    return res.status(404).json({ error: "Task not found" });
  }

  const filePath = path.join(__dirname, "uploads", task.storedFile);
  const fileBuffer = fs.readFileSync(filePath);

  let extractedText = "";

  // Handle PDF or text
  if (task.originalFile.toLowerCase().endsWith(".pdf")) {
    try {
      const pdfData = await pdf(fileBuffer);
      extractedText = pdfData.text;
    } catch (err) {
      return res.status(500).json({
        error: "Failed to extract text from PDF",
        details: err.message
      });
    }
  } else {
    extractedText = fileBuffer.toString("utf-8");
  }

  if (!extractedText || extractedText.trim().length === 0) {
    return res.status(400).json({
      error: "No readable text found in document"
    });
  }

  // Call AI engine (PUBLIC URL)
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

  const data = await aiResponse.json();

  task.status = "completed";
  task.result = data;

  fs.writeFileSync(TASKS_FILE, JSON.stringify(tasks, null, 2));

  res.json({ message: "Processed", result: data });
});

// --------------------
// Start server
// --------------------
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log("Task platform running on", PORT);
});
