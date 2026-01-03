import express from "express";
import multer from "multer";
import fs from "fs";
import path from "path";
import cors from "cors";
import fetch from "node-fetch";

const app = express();
app.use(cors());
app.use(express.json());

const upload = multer({ dest: "uploads/" });
const TASKS_FILE = "./tasks.json";

// init storage
if (!fs.existsSync(TASKS_FILE)) {
  fs.writeFileSync(TASKS_FILE, JSON.stringify([]));
}

// health check
app.get("/", (req, res) => {
  res.send("Task Platform Running");
});

// upload document (customer)
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

// list tasks (admin)
app.get("/tasks", (req, res) => {
  const tasks = JSON.parse(fs.readFileSync(TASKS_FILE));
  res.json(tasks);
});

// process task using AI engine
app.post("/process/:id", async (req, res) => {
  const tasks = JSON.parse(fs.readFileSync(TASKS_FILE));
  const task = tasks.find(t => t.id == req.params.id);

  if (!task) return res.status(404).json({ error: "Task not found" });

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

// bind port
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log("Task platform running on", PORT);
});

