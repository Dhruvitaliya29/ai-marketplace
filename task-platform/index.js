import express from "express";
import multer from "multer";
import cors from "cors";
import fs from "fs";
import path from "path";
import pdf from "pdf-parse";
import fetch from "node-fetch";
import { fileURLToPath } from "url";

// ---------------- SETUP ----------------
const app = express();
app.use(cors());
app.use(express.json());

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// ---------------- STATIC FRONTEND ----------------
app.use(express.static(path.join(__dirname, "public")));
app.get("/", (req, res) => {
  res.sendFile(path.join(__dirname, "public", "index.html"));
});

// ---------------- STORAGE ----------------
const upload = multer({ dest: "uploads/" });
const TASKS_FILE = path.join(__dirname, "tasks.json");

if (!fs.existsSync("uploads")) fs.mkdirSync("uploads");
if (!fs.existsSync(TASKS_FILE)) fs.writeFileSync(TASKS_FILE, "[]");

// ---------------- UPLOAD ----------------
app.post("/upload", upload.single("document"), (req, res) => {
  if (!req.file) {
    return res.status(400).json({ error: "No file uploaded" });
  }

  const tasks = JSON.parse(fs.readFileSync(TASKS_FILE));
  const task = {
    id: Date.now(),
    originalFile: req.file.originalname,
    storedFile: req.file.filename,
    status: "uploaded",
    result: null
  };

  tasks.push(task);
  fs.writeFileSync(TASKS_FILE, JSON.stringify(tasks, null, 2));

  res.json({ taskId: task.id });
});

// ---------------- PROCESS ----------------
app.post("/process/:id", async (req, res) => {
  const tasks = JSON.parse(fs.readFileSync(TASKS_FILE));
  const task = tasks.find(t => t.id == req.params.id);
  if (!task) return res.status(404).json({ error: "Task not found" });

  const filePath = path.join(__dirname, "uploads", task.storedFile);
  const buffer = fs.readFileSync(filePath);

  let extractedText = "";
  try {
    const pdfData = await pdf(buffer);
    extractedText = pdfData.text;
  } catch (e) {
    return res.status(500).json({ error: "PDF read failed" });
  }

  const aiRes = await fetch(
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

  const aiData = await aiRes.json();

  task.status = "completed";
  task.result = aiData;
  fs.writeFileSync(TASKS_FILE, JSON.stringify(tasks, null, 2));

  res.json(aiData);
});

// ---------------- START ----------------
const PORT = process.env.PORT || 8080;
app.listen(PORT, () =>
  console.log("✅ Task platform running on", PORT)
);
