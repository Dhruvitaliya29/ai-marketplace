async function upload() {
  const file = document.getElementById("file").files[0];
  const status = document.getElementById("status");

  if (!file) {
    status.innerText = "Select a file first";
    return;
  }

  const formData = new FormData();
  formData.append("document", file);

  try {
    const res = await fetch("/upload", {
      method: "POST",
      body: formData
    });

    const data = await res.json();

    if (!res.ok) throw new Error(data.error);

    const processRes = await fetch(`/process/${data.taskId}`, {
      method: "POST"
    });

    const result = await processRes.json();
    status.style.color = "#22c55e";
    status.innerText = result.result.summary || "Processed";
  } catch (err) {
    status.style.color = "#f87171";
    status.innerText = "Upload failed";
  }
}
