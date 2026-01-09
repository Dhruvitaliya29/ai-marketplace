const fileInput = document.getElementById("fileInput");
const uploadBtn = document.getElementById("uploadBtn");
const statusEl = document.getElementById("status");
const outputEl = document.getElementById("output");

uploadBtn.onclick = async () => {
  if (!fileInput.files.length) {
    statusEl.textContent = "Please select a PDF file.";
    return;
  }

  outputEl.style.display = "none";
  outputEl.textContent = "";
  uploadBtn.disabled = true;

  try {
    statusEl.textContent = "Uploading document...";

    const formData = new FormData();
    formData.append("document", fileInput.files[0]);

    const uploadRes = await fetch("/upload", {
      method: "POST",
      body: formData
    });

    const uploadData = await uploadRes.json();
    statusEl.textContent = "Analyzing document with AI...";

    const processRes = await fetch(`/process/${uploadData.taskId}`, {
      method: "POST"
    });

    const result = await processRes.json();

    statusEl.textContent = "Completed ✓";
    outputEl.textContent = result.summary;
    outputEl.style.display = "block";

  } catch (err) {
    statusEl.textContent = "Error: " + err.message;
  } finally {
    uploadBtn.disabled = false;
  }
};
