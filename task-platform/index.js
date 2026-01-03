import express from "express";
import cors from "cors";
import multer from "multer";
import fs from "fs";
import path from "path";
import pdf from "pdf-parse";
import { fileURLToPath } from "url";

// --------------------
// App setup
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
// Ensure folders exist
// --------------------
const UPLOAD_DIR = path.join(__dirname, "uploads");
const TASKS_FILE = path.join(__dirname, "tasks.json");

if (!fs.existsSync(UPLOAD_DIR)) fs.mkdirSync(UPLOAD_DIR);
if (!fs.existsSync(TASKS_FILE)) fs.writeFileSync(TASKS_FILE, "[]");

// --------------------
// Serve frontend
// --------------------
app.use(express.static(path.join(__dirname, "public")));

app.get("/", (req, res) => {
  res.sendFile(path.join(__dirname, "public/index.html"));
});

// --------------------
// Multer config (CRITICAL FIX)
// --------------------
const storage = multer.diskStorage({
  destination: (_, __, cb) => cb(null, UPLOAD_DIR),
  filename: (_, file, cb) =>
    cb(null, Date.now() + "-" + file.originalname)
});

const upload = multer({ storage });

// --------------------
// Upload document
// --------------------
app.post("/upload", upload.single("document"), (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: "No file received" });
    }

    const tasks = JSON.parse(fs.readFileSync(TASKS_FILE));

    const task = {
      id: Date.now(),
      originalFile: req.file.originalname,
      storedFile: req.file.filename,
      status: "pending",
      result: null,
      createdAt: new Date().toISOString()
    };

    tasks.push(task);
    fs.writeFileSync(TASKS_FILE, JSON.stringify(tasks, null, 2));

    res.json({ message: "Uploaded", taskId: task.id });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// --------------------
// List tasks
// --------------------
app.get("/tasks", (req, res) => {
  res.json(JSON.parse(fs.readFileSync(TASKS_FILE)));
});

// --------------------
// Process task
// --------------------
app.post("/process/:id", async (req, res) => {
  const tasks = JSON.parse(fs.readFileSync(TASKS_FILE));
  const task = tasks.find(t => t.id == req.params.id);

  if (!task) return res.status(404).json({ error: "Task not found" });

  const filePath = path.join(UPLOAD_DIR, task.storedFile);
  const buffer = fs.readFileSync(filePath);

  let extractedText = "";

  try {
    const pdfData = await pdf(buffer);
    extractedText = pdfData.text;
  } catch {
    return res.status(400).json({ error: "PDF text extraction failed" });
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

  const result = await aiRes.json();

  task.status = "completed";
  task.result = result;

  fs.writeFileSync(TASKS_FILE, JSON.stringify(tasks, null, 2));

  res.json({ message: "Processed", result });
});

// --------------------
// Start server
// --------------------
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log("Task platform running on", PORT);
});
