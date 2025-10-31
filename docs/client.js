// public/client.js

const promptEl = document.getElementById("userPrompt");
const generateBtn = document.getElementById("generateBtn");
const statusEl = document.getElementById("status");

const iframeEl = document.getElementById("previewFrame");

const htmlCodeEl = document.getElementById("htmlCode");
const cssCodeEl = document.getElementById("cssCode");
const jsCodeEl = document.getElementById("jsCode");
const notesEl = document.getElementById("notesText");

generateBtn.addEventListener("click", async () => {
  const prompt = promptEl.value.trim();
  if (!prompt) {
    statusEl.textContent = "Please enter a prompt first.";
    return;
  }

  statusEl.textContent = "Generating with Gemini 2.5 Flash... ⏳";

  try {
    const API_BASE = "https://aibackend-g72b.onrender.com/"; // <--- the Render URL

const res = await fetch(`${API_BASE}/api/generate`, {
  method: "POST",
  headers: { "Content-Type": "application/json" },
  body: JSON.stringify({ prompt }),
});

    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.error || "Server error");
    }

    const data = await res.json();
    const { html, css, js, notes } = data;

    // Put code into the side panels
    htmlCodeEl.value = html || "";
    cssCodeEl.value = css || "";
    jsCodeEl.value = js || "";
    notesEl.value = notes || "";

    // Build a full HTML doc to preview inside iframe
    const fullDoc = `
<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8"/>
<meta name="viewport" content="width=device-width,initial-scale=1.0"/>
<style>
${css || ""}
</style>
</head>
<body>
${html || ""}

<script>
${js || ""}
// Prevent this script from escaping the iframe sandbox.
</script>
</body>
</html>`.trim();

    // Render inside iframe using srcdoc
    iframeEl.setAttribute("srcdoc", fullDoc);

    statusEl.textContent = "Done ✅";
  } catch (err) {
    console.error(err);
    statusEl.textContent = "❌ Generation failed. Check console / server.";
  }
});
