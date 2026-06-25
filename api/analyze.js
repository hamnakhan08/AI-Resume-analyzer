export default async function handler(req, res) {
  try {
    const apiKey = process.env.GROQ_API_KEY;

    const response = await fetch(
      "https://api.groq.com/openai/v1/chat/completions",
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${apiKey}`
        },
        body: JSON.stringify({
          model: "llama-3.3-70b-versatile",
          messages: [
            {
              role: "user",
              content: "Reply with only this JSON: {\"score\":85,\"score_label\":\"Good\"}"
            }
          ]
        })
      }
    );

    const data = await response.json();

    const text = data.choices?.[0]?.message?.content || "{}";

    res.status(200).send(text);

  } catch (err) {
    res.status(500).json({
      error: err.message
    });
  }
}
