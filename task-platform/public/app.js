async function upload() {
  const fileInput = document.getElementById("file");
  const output = document.getElementById("output");

  if (!fileInput.files.length) {
    output.innerText = "Select a file first";
    return;
  }

  const formData = new FormData();
  formData.append("document", fileInput.files[0]); // ✅ MUST MATCH BACKEND

  const uploadRes = await fetch("/upload", {
    method: "POST",
    body: formData
  });

  const uploadData = await uploadRes.json();
  if (!uploadData.taskId) {
    output.innerText = "Upload failed";
    return;
  }

  const processRes = await fetch(`/process/${uploadData.taskId}`, {
    method: "POST"
  });

  const result = await processRes.json();
  output.innerText = JSON.stringify(result, null, 2);
}
