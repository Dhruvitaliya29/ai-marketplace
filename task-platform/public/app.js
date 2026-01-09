const uploadForm = document.getElementById("uploadForm");
const fileInput = document.getElementById("document");
const taskTypeSelect = document.getElementById("taskType");
const statusText = document.getElementById("status");
const summaryBox = document.getElementById("summary");

uploadForm.addEventListener("submit", async (e) => {
  e.preventDefault();

  statusText.innerText = "Uploading...";
  summaryBox.innerText = "";

  if (!fileInput.files.length) {
    statusText.innerText = "Please select a file";
    return;
  }

  const formData = new FormData();
  formData.append("document", fileInput.files[0]);
  formData.append("taskType", taskTypeSelect.value);

  try {
    // ----------------------
    // 1️⃣ Upload file
    // ----------------------
    const uploadRes = await fetch("/upload", {
      method: "POST",
      body: formData
    });

    const uploadData = await uploadRes.json();

    if (!uploadData.success) {
      statusText.innerText = "Upload failed";
      return;
    }

    const taskId = uploadData.taskId;
    statusText.innerText = "Processing with AI...";

    // ----------------------
    // 2️⃣ Process document
    // ----------------------
    const processRes = await fetch(`/process/${taskId}`, {
      method: "POST"
    });

    const processData = await processRes.json();

    if (!processData.success) {
      statusText.innerText = "Processing failed";
      return;
    }

    // ----------------------
    // 3️⃣ Show result ✅
    // ----------------------
    statusText.innerText = "Completed";

    // 🔥 THIS WAS THE BUG FIX
    summaryBox.innerText =
      processData.result?.summary || "No summary generated";

  } catch (err) {
    console.error(err);
    statusText.innerText = "Server error";
  }
});
