console.log("app.js loaded ✅");

const form = document.getElementById("uploadForm");
const fileInput = document.getElementById("document");
const taskType = document.getElementById("taskType");
const statusText = document.getElementById("status");
const summaryBox = document.getElementById("summary");

form.addEventListener("submit", async (e) => {
  e.preventDefault();

  statusText.innerText = "Uploading...";
  summaryBox.innerText = "";

  if (!fileInput.files.length) {
    statusText.innerText = "Please select a file";
    return;
  }

  const formData = new FormData();
  formData.append("document", fileInput.files[0]);
  formData.append("taskType", taskType.value);

  try {
    // 1️⃣ Upload
    const uploadRes = await fetch("/upload", {
      method: "POST",
      body: formData
    });

    const uploadData = await uploadRes.json();

    if (!uploadData.success) {
      statusText.innerText = "Upload failed";
      return;
    }

    statusText.innerText = "Processing with AI...";

    // 2️⃣ Process
    const processRes = await fetch(`/process/${uploadData.taskId}`, {
      method: "POST"
    });

    const processData = await processRes.json();

    if (!processData.success) {
      statusText.innerText = "Processing failed";
      return;
    }

    // 3️⃣ Display
    statusText.innerText = "Completed ✅";
    summaryBox.innerText =
      processData.result?.summary || "No summary generated";

  } catch (err) {
    console.error(err);
    statusText.innerText = "Server error";
  }
});
