app.post("/chat", async (req, res) => {
  try {
    const { message } = req.body;

    if (!message?.trim()) {
      return res.status(400).json({ reply: "Andika ujumbe kwanza." });
    }

    const response = await fetch(
      "https://generativelanguage.googleapis.com/v1beta/models/gemini-3.5-flash:generateContent",
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
      console.error(data);
      return res.json({ reply: "Hitilafu ya Gemini API." });
    }

    const reply =
      data?.candidates?.[0]?.content?.parts?.[0]?.text ||
      "Samahani, sijapata jibu.";

    return res.json({ reply });

  } catch (err) {
    console.error(err);
    return res.status(500).json({ reply: "Server Error." });
  }
});
