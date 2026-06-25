export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { resumeText, targetField } = req.body;

    const GROQ_API_KEY = process.env.GROQ_API_KEY;

    if (!GROQ_API_KEY) {
      return res.status(500).json({
        error: 'GROQ_API_KEY environment variable is not set'
      });
    }

    if (!resumeText || !resumeText.trim()) {
      return res.status(400).json({
        error: 'No resume text provided'
      });
    }

    const targetFieldLine =
      targetField && targetField.trim()
        ? `The applicant says they are applying for this specific field: "${targetField.trim()}". You MUST fill target_field_score, target_field_score_label, target_field_score_summary, and target_field_suggestions based on how well this resume fits THAT field.`
        : `The applicant did NOT specify a target field. Set target_field_score, target_field_score_label, and target_field_score_summary to null, and target_field_suggestions to an empty array [].`;

    const prompt = `You are an expert resume reviewer and career-field classifier. Analyze the resume below and respond ONLY with a valid JSON object — no markdown, no backticks, no explanation outside the JSON.

JSON structure:
{
  "score": <integer 0-100>,
  "score_label": "<Poor|Fair|Good|Excellent>",
  "score_summary": "<one honest sentence about overall quality>",

  "detected_field": "<specific career field this resume best fits>",
  "field_confidence": "<High|Medium|Low>",
  "field_score": <integer 0-100>,
  "field_score_label": "<Poor|Fair|Good|Excellent>",
  "field_score_summary": "<one honest sentence>",
  "suggested_roles": ["<job title 1>", "<job title 2>", "<job title 3>"],

  "field_suggestions": [
    { "type": "good", "text": "<text>" },
    { "type": "warn", "text": "<text>" },
    { "type": "bad", "text": "<text>" }
  ],

  "target_field": ${
    targetField && targetField.trim()
      ? `"${targetField.trim()}"`
      : 'null'
  },

  "target_field_score": <integer 0-100 or null>,
  "target_field_score_label": "<Poor|Fair|Good|Excellent|null>",
  "target_field_score_summary": "<summary>",
  "target_field_suggestions": [
    { "type": "good", "text": "<text>" },
    { "type": "warn", "text": "<text>" },
    { "type": "bad", "text": "<text>" }
  ],

  "ats_score": <integer 0-100>,

  "ats_checks": [
    { "label": "Contact info findable", "passed": true },
    { "label": "Quantifiable achievements", "passed": false },
    { "label": "Strong action verbs", "passed": true },
    { "label": "Appropriate length", "passed": true },
    { "label": "Avoids generic clichés", "passed": false },
    { "label": "Field-relevant keywords", "passed": true }
  ],

  "technical_skills": ["skill1", "skill2"],
  "soft_skills": ["skill1", "skill2"],
  "tools": ["tool1", "tool2"],

  "suggestions": [
    { "type": "good", "text": "<what is done well>" },
    { "type": "warn", "text": "<something to improve>" },
    { "type": "bad", "text": "<clear weakness>" }
  ]
}

Rules:
- score = honest 0-100 overall quality rating
- detected_field = pick ONE specific field
- field_score = score specifically for the detected field
- suggested_roles = 2-4 realistic job titles
- field_suggestions MUST be array of objects with type and text
- target_field_suggestions MUST be array of objects with type and text
- suggestions MUST be array of objects with type and text
- ats_checks MUST contain EXACTLY 6 objects with label and passed fields
- ats_score = ATS compatibility score
- technical_skills = hard skills
- soft_skills = soft skills
- tools = software/platforms
- Return ONLY valid JSON

Resume:
---
${resumeText.slice(0, 4000)}`;

    const response = await fetch(
      'https://api.groq.com/openai/v1/chat/completions',
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: \`Bearer \${GROQ_API_KEY}\`
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
      data?.choices?.[0]?.message?.content || '';

    if (!rawText) {
      return res.status(500).json({
        error: 'Empty response from Groq'
      });
    }

    const cleaned = rawText
      .replace(/```json/g, '')
      .replace(/```/g, '')
      .trim();

    const result = JSON.parse(cleaned);

    return res.status(200).json(result);

  } catch (err) {
    console.error(err);

    return res.status(500).json({
      error: err.message
    });
  }
}
