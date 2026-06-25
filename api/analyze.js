export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { resumeText, targetField } = req.body;

    const GROQ_API_KEY = process.env.GROQ_API_KEY;

    if (!resumeText || !resumeText.trim()) {
      return res.status(400).json({ error: 'No resume text provided' });
    }

    const targetFieldLine = targetField && targetField.trim()
      ? `The applicant says they are applying for this specific field: "${targetField.trim()}". You MUST fill target_field_score, target_field_score_label, target_field_score_summary, and target_field_suggestions based on how well this resume fits THAT field.`
      : `The applicant did NOT specify a target field. Set target_field_score, target_field_score_label, and target_field_score_summary to null, and target_field_suggestions to an empty array [].`;

    const prompt = `You are an expert resume reviewer and career-field classifier. Analyze the resume below and respond ONLY with a valid JSON object — no markdown, no backticks, no explanation outside the JSON.

JSON structure:
{
  "score": <integer 0-100>,
  "score_label": "<Poor|Fair|Good|Excellent>",
  "score_summary": "<one honest sentence about overall quality>",

  "detected_field": "<specific career field>",
  "field_confidence": "<High|Medium|Low>",
  "field_score": <integer 0-100>,
  "field_score_label": "<Poor|Fair|Good|Excellent>",
  "field_score_summary": "<one honest sentence>",
  "suggested_roles": ["role1","role2","role3"],

  "field_suggestions": [],

  "target_field": ${targetField && targetField.trim() ? `"${targetField.trim()}"` : 'null'},

  "target_field_score": <integer 0-100 or null>,
  "target_field_score_label": "<Poor|Fair|Good|Excellent|null>",
  "target_field_score_summary": "<summary or null>",
  "target_field_suggestions": [],

  "ats_score": <integer 0-100>,

  "ats_checks": [],

  "technical_skills": [],
  "soft_skills": [],
  "tools": [],

  "suggestions": []
}

Rules:
- ${targetFieldLine}

Resume:
---
${resumeText.slice(0, 4000)}`;

    const response = await fetch(
      'https://api.groq.com/openai/v1/chat/completions',
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${GROQ_API_KEY}`
        },
        body: JSON.stringify({
          model: 'llama-3.3-70b-versatile',
          temperature: 0.3,
          max_tokens: 1800,
          messages: [
            {
              role: 'user',
              content: prompt
            }
          ]
        })
      }
    );

    const data = await response.json();

    if (data.error) {
      return res.status(500).json({
        error: data.error.message
      });
    }

    const rawText =
      data.choices?.[0]?.message?.content || '';

    const cleaned = rawText
      .replace(/```json|```/g, '')
      .trim();

    const result = JSON.parse(cleaned);

    return res.status(200).json(result);

  } catch (err) {
    return res.status(500).json({
      error: err.message
    });
  }
}
