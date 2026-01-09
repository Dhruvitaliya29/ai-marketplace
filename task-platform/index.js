import express from "express";
import multer from "multer";
import fs from "fs";
import path from "path";
import cors from "cors";
import pdf from "pdf-parse";
import fetch from "node-fetch";
import { fileURLToPath } from "url";

// --------------------
// App setup
// --------------------
const app = express();
app.use(cors());
app.use(express.json());

// --------------------
// __dirname fix (ESM)
// --------------------
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// --------------------
// Ensure required folders/files
// --------------------
const UPLOAD_DIR = path.join(__dirname, "uploads");
if (!fs.existsSync(UPLOAD_DIR)) fs.mkdirSync(UPLOAD_DIR);

const TASKS_FILE = path.join(__dirname, "tasks.json");
if (!fs.existsSync(TASKS_FILE)) fs.writeFileSync(TASKS_FILE, "[]");

// --------------------
// Serve frontend
// --------------------
app.use(express.static(path.join(__dirname, "public")));

app.get("/", (req, res) => {
  res.sendFile(path.join(__dirname, "public", "index.html"));
});

// --------------------
// Multer config
// --------------------
const upload = multer({
  dest: UPLOAD_DIR,
  limits: { fileSize: 10 * 1024 * 1024 } // 10MB
});

// --------------------
// Upload document
// --------------------
app.post("/upload", upload.single("document"), (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: "No file uploaded" });
    }

    const tasks = JSON.parse(fs.readFileSync(TASKS_FILE, "utf-8"));

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

    res.json({ success: true, taskId: task.id });
  } catch (err) {
    res.status(500).json({
      error: "Upload failed",
      details: err.message
    });
  }
});

// --------------------
// Process document with AI
// --------------------
app.post("/process/:id", async (req, res) => {
  try {
    const tasks = JSON.parse(fs.readFileSync(TASKS_FILE, "utf-8"));
    const task = tasks.find(t => t.id == req.params.id);

    if (!task) {
      return res.status(404).json({ error: "Task not found" });
    }

    const filePath = path.join(UPLOAD_DIR, task.storedFile);
    const buffer = fs.readFileSync(filePath);

    // Extract text from PDF
    const pdfData = await pdf(buffer);

    if (!pdfData.text || pdfData.text.trim().length === 0) {
      return res.status(400).json({
        error: "No readable text found in document"
      });
    }

    // 🔥 REAL AI PROMPT (NO ROLE PLAY, NO ASSUMPTIONS)
    const aiPrompt = `
Analyze the following document carefully.

Instructions:
- Identify the document type automatically (resume, invoice, legal, report, note, other).
- Extract ONLY information that is explicitly present.
- Do NOT assume professions, roles, or titles.
- If something is missing, respond with "Not found".
- Do NOT hallucinate.

Return clear, factual, structured text.

Document content:
${pdfData.text}
`;

    const aiResponse = await fetch(
      "https://ai-marketplace--DhruvItaliya.replit.app/infer",
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          model: "summarizer",
          text: aiPrompt
        })
      }
    );

    if (!aiResponse.ok) {
      throw new Error("AI service failed");
    }

    const aiResult = await aiResponse.json();

    task.status = "completed";
    task.result = aiResult;

    fs.writeFileSync(TASKS_FILE, JSON.stringify(tasks, null, 2));

    res.json({ success: true, result: aiResult });

  } catch (err) {
    res.status(500).json({
      error: "Processing failed",
      details: err.message
    });
  }
});

// --------------------
// Start server (Railway compatible)
// --------------------
const PORT = process.env.PORT || 8080;
app.listen(PORT, () => {
  console.log("Task platform running on", PORT);
});
