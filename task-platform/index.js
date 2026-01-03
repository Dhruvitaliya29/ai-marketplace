import pdf from "pdf-parse";
import express from "express";
import path from "path";
import { fileURLToPath } from "url";
import multer from "multer";
import fs from "fs";
import cors from "cors";

// --------------------
// App setup
// --------------------
const app = express();
app.use(cors());
app.use(express.json());

// --------------------
// __dirname fix for ES modules
// --------------------
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// --------------------
// Serve frontend (VERY IMPORTANT)
// --------------------
app.use(express.static(path.join(__dirname, "public")));

app.get("/", (req, res) => {
  res.sendFile(path.join(__dirname, "public", "index.html"));
});

// --------------------
// File upload setup
// --------------------
const upload = multer({ dest: "uploads/" });
const TASKS_FILE = path.join(__dirname, "tasks.json");

// init storage
if (!fs.existsSync(TASKS_FILE)) {
  fs.writeFileSync(TASKS_FILE, JSON.stringify([]));
}

// --------------------
// Upload document (customer)
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
// Process task using AI engine
// --------------------
app.post("/process/:id", async (req, res) => {
  const tasks = JSON.parse(fs.readFileSync(TASKS_FILE));
  const task = tasks.find(t => t.id == req.params.id);

  if (!task) {
    return res.status(404).json({ error: "Task not found" });
  }

  // MOCK extracted text (later OCR)
  const extractedText = "Invoice total is 4500 rupees";

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
