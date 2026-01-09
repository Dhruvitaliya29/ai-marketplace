const uploadBtn = document.getElementById("uploadBtn");
const fileInput = document.getElementById("fileInput");
const statusEl = document.getElementById("status");
const resultEl = document.getElementById("result");

uploadBtn.addEventListener("click", async () => {
  if (!fileInput.files.length) {
    alert("Please select a file");
    return;
  }

  statusEl.innerText = "Uploading...";
  resultEl.innerText = "";

  try {
    // ---------- Upload ----------
    const formData = new FormData();
    formData.append("document", fileInput.files[0]);

    const uploadRes = await fetch("/upload", {
      method: "POST",
      body: formData
    });

    const uploadData = await uploadRes.json();

    if (!uploadData.success) {
      throw new Error("Upload failed");
    }

    statusEl.innerText = "Processing...";

    // ---------- Process ----------
    const processRes = await fetch(`/process/${uploadData.taskId}`, {
      method: "POST"
    });

    const processData = await processRes.json();

    if (!processData.success) {
      throw new Error("Processing failed");
    }

    // ---------- Display result ----------
    const aiResult = processData.result;

    let outputText = "";

    if (typeof aiResult === "string") {
      outputText = aiResult;
    } else if (aiResult.summary) {
      outputText = aiResult.summary;
    } else if (aiResult.text) {
      outputText = aiResult.text;
    } else {
      outputText = JSON.stringify(aiResult, null, 2);
    }

    statusEl.innerText = "Completed ✅";
    resultEl.innerText = outputText;

  } catch (err) {
    statusEl.innerText = "Error ❌";
    resultEl.innerText = err.message;
  }
});
