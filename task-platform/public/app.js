async function upload() {
  const fileInput = document.getElementById("file");
  const status = document.getElementById("status");

  if (!fileInput.files.length) {
    status.innerText = "Please select a file";
    return;
  }

  status.innerText = "Uploading...";

  const formData = new FormData();
  formData.append("document", fileInput.files[0]);

  try {
    const uploadRes = await fetch("/upload", {
      method: "POST",
      body: formData
    });

    const uploadData = await uploadRes.json();

    if (!uploadData.success) {
      status.innerText = "Upload failed";
      return;
    }

    status.innerText = "Processing...";

    const processRes = await fetch(`/process/${uploadData.taskId}`, {
      method: "POST"
    });

    const processData = await processRes.json();

    status.innerText =
      "Summary:\n" + processData.result?.result?.summary;
  } catch (err) {
    status.innerText = "Something went wrong";
  }
}
