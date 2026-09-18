import express from "express";
import path from "path";
import { fileURLToPath } from "url";

const app = express();
app.use(express.json());

const PORT = process.env.PORT || 8080;

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

app.use(express.static(__dirname));

app.get("/", (req, res) => {
  res.sendFile(path.join(__dirname, "index.html"));
});

app.get("/api/health", (req, res) => {
  res.json({ ok: true, status: "running" });
});

//================ MsemwaFX Signal Endpoint ================

app.post("/api/signal", async (req, res) => {
  try {
    const { symbol, signal, score } = req.body;

    console.log("Signal received:", symbol, signal, score);

    res.json({
      ok: true,
      received: true,
      symbol,
      signal,
      score
    });

  } catch (err) {
    console.error(err);
    res.status(500).json({ ok: false });
  }
});

app.post("/chat", async (req, res) => {
  try {
    const { message } = req.body;

    if (!message?.trim()) {
      return res.status(400).json({ reply: "Andika ujumbe kwanza." });
    }

    const response = await fetch(
      "https://generativelanguage.googleapis.com/v1beta/models/gemini-3.6-flash:generateContent",
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-goog-api-key": process.env.GEMINI_API_KEY
        },
        body: JSON.stringify({
          contents: [
            {
              parts: [{ text: message }]
            }
          ]
        })
      }
    );

   const data = await response.json();

if (!response.ok) {
  console.error("Gemini Error:", data);
  return res.status(response.status).json({
    reply: data.error?.message || "Gemini API Error."
  });
}

const reply =
  data.candidates?.[0]?.content?.parts
    ?.map(p => p.text)
    .filter(Boolean)
    .join("\n") || "Samahani, sijapata jibu.";

return res.json({ reply }); 

  } catch (err) {
    console.error(err);
    res.status(500).json({ reply: "Server Error." });
  }
});

app.listen(PORT, () => {
  console.log(`Msemwa AI School running on port ${PORT}`);
});
