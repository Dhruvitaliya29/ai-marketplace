const dropArea = document.getElementById("dropArea");
const fileInput = document.getElementById("fileInput");
const uploadBtn = document.getElementById("uploadBtn");
const statusDiv = document.getElementById("status");

let selectedFile = null;

// Click to select file
dropArea.addEventListener("click", () => {
  fileInput.click();
});

// Drag over
dropArea.addEventListener("dragover", (e) => {
  e.preventDefault();
  dropArea.classList.add("border-indigo-500");
});

// Drag leave
dropArea.addEventListener("dragleave", () => {
  dropArea.classList.remove("border-indigo-500");
});

// Drop file
dropArea.addEventListener("drop", (e) => {
  e.preventDefault();
  dropArea.classList.remove("border-indigo-500");

  selectedFile = e.dataTransfer.files[0];
  showSelectedFile();
});

// File input change
fileInput.addEventListener("change", () => {
  selectedFile = fileInput.files[0];
  showSelectedFile();
});

// Show file name
function showSelectedFile() {
  if (!selectedFile) return;

  dropArea.innerHTML = `
    <p class="text-green-400 font-medium">${selectedFile.name}</p>
    <p class="text-xs text-gray-500 mt-1">Ready to upload</p>
  `;
}

// Upload button
uploadBtn.addEventListener("click", async () => {
  if (!selectedFile) {
    alert("Please select a file first");
    return;
  }

  statusDiv.innerHTML = "⏳ Uploading file...";

  const formData = new FormData();
  formData.append("document", selectedFile);

  try {
    const res = await fetch("/upload", {
      method: "POST",
      body: formData
    });

    const data = await res.json();

    statusDiv.innerHTML = `
      <div class="text-green-400 font-medium">
        ✅ File uploaded successfully
      </div>
      <div class="mt-2 text-sm">
        Task ID: <span class="text-indigo-400">${data.taskId}</span>
      </div>
      <button
        onclick="processTask(${data.taskId})"
        class="mt-4 bg-green-600 hover:bg-green-700 px-5 py-2 rounded-lg"
      >
        Process with AI
      </button>
    `;

  } catch (err) {
    statusDiv.innerHTML = "❌ Upload failed";
  }
});

// Process task
async function processTask(taskId) {
  statusDiv.innerHTML = "⚙️ Processing document with AI...";

  try {
    const res = await fetch(`/process/${taskId}`, {
      method: "POST"
    });

    const data = await res.json();

    statusDiv.innerHTML = `
      <div class="text-green-400 font-medium">
        ✅ Processing completed
      </div>
      <pre class="mt-4 bg-black/60 p-4 rounded-lg text-left text-xs overflow-x-auto">
${JSON.stringify(data.result, null, 2)}
      </pre>
    `;

  } catch (err) {
    statusDiv.innerHTML = "❌ Processing failed";
  }
}
