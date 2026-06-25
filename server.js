
// server.js — Resume Analyzer Backend
// Uses Groq API (free, no billing needed!)
// Run: node server.js

const express = require('express');
const cors    = require('cors');
const path    = require('path');

const app  = express();
const PORT = 3000;

// ── PUT YOUR GROQ API KEY HERE ─────────────────────────────
// NOTE: your old key was hardcoded here and got shared in plain text —
// regenerate it at console.groq.com, then either paste the new one
// below OR (safer) set it as an environment variable: GROQ_API_KEY=xxxx
const GROQ_API_KEY = process.env.GROQ_API_KEY;

if (!GROQ_API_KEY) {
  console.error('⚠️  GROQ_API_KEY environment variable is not set!');
}// ──────────────────────────────────────────────────────────

app.use(cors());
app.use(express.json());

app.use(express.static(path.join(__dirname, 'public')));

app.post('/analyze', async (req, res) => {
  try {
    const { resumeText, targetField } = req.body;

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

  "detected_field": "<specific career field this resume best fits, e.g. 'Frontend Development', 'Data Science', 'Digital Marketing', 'Mechanical Engineering', 'Accounting & Finance', 'Sales', 'Human Resources', 'Graphic Design', 'Nursing', 'Project Management'>",
  "field_confidence": "<High|Medium|Low>",
  "field_score": <integer 0-100, how well this resume meets expectations/standards FOR THAT DETECTED FIELD>,
  "field_score_label": "<Poor|Fair|Good|Excellent>",
  "field_score_summary": "<one honest sentence about fit/readiness for that detected field>",
  "suggested_roles": ["<job title 1>", "<job title 2>", "<job title 3>"],
  "field_suggestions": [
    { "type": "good", "text": "<something that matches what THIS FIELD's hiring managers look for>" },
    { "type": "warn", "text": "<a field-specific gap, e.g. missing a key tool/certification/keyword for that field>" },
    { "type": "bad",  "text": "<a clear field-specific weakness>" }
  ],

  "target_field": ${targetField && targetField.trim() ? `"${targetField.trim()}"` : 'null'},
  "target_field_score": <integer 0-100 or null — see rule below>,
  "target_field_score_label": "<Poor|Fair|Good|Excellent|null>",
  "target_field_score_summary": "<one honest sentence on fit for the TARGET field the applicant chose, or null>",
  "target_field_suggestions": [
    { "type": "good", "text": "<matches what hiring managers in the TARGET field want>" },
    { "type": "warn", "text": "<gap vs the TARGET field's expectations>" },
    { "type": "bad",  "text": "<clear mismatch or missing requirement for the TARGET field>" }
  ],

  "ats_score": <integer 0-100, overall ATS (applicant tracking system) compatibility>,
  "ats_checks": [
    { "label": "Contact info findable", "passed": <true|false> },
    { "label": "Quantifiable achievements", "passed": <true|false> },
    { "label": "Strong action verbs", "passed": <true|false> },
    { "label": "Appropriate length", "passed": <true|false> },
    { "label": "Avoids generic clichés", "passed": <true|false> },
    { "label": "Field-relevant keywords", "passed": <true|false> }
  ],

  "technical_skills": ["skill1", "skill2"],
  "soft_skills": ["skill1", "skill2"],
  "tools": ["tool1", "tool2"],
  "suggestions": [
    { "type": "good", "text": "<what is done well>" },
    { "type": "warn", "text": "<something to improve>" },
    { "type": "bad",  "text": "<clear weakness or missing element>" }
  ]
}

Rules:
- score = honest 0-100 overall quality rating (writing, structure, impact, clarity — field-agnostic)
- detected_field = pick ONE specific field based on the dominant experience/skills in the resume, not a vague category
- field_score = a SEPARATE rating that judges this resume specifically against what's expected in "detected_field". This number can differ meaningfully from "score".
- suggested_roles = 2-4 realistic job titles this resume is currently a good fit for
- field_suggestions = 3-4 items mixing good/warn/bad, ONLY about detected-field-fit
- ${targetFieldLine}
- ats_score = rate how well an Applicant Tracking System (keyword/parsing software used by recruiters) would handle this resume; ats_checks = exactly 6 checks as listed above with true/false based on actual resume content
- technical_skills: languages, frameworks, hard skills
- soft_skills: leadership, communication, etc.
- tools: software, databases, platforms
- suggestions: 4-6 items mixing good/warn/bad, about general resume quality
- Be direct and specific

Resume:
---
${resumeText.slice(0, 4000)}`;

    // Call Groq API
    const response = await fetch('https://api.groq.com/openai/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type':  'application/json',
        'Authorization': `Bearer ${GROQ_API_KEY}`
      },
      body: JSON.stringify({
        model:       'llama-3.3-70b-versatile',
        temperature: 0.3,
        max_tokens:  1800,
        messages: [
          {
            role:    'user',
            content: prompt
          }
        ]
      })
    });

    const data = await response.json();

    if (data.error) {
      return res.status(500).json({ error: data.error.message });
    }

    const rawText = data.choices?.[0]?.message?.content || '';

    if (!rawText) {
      return res.status(500).json({ error: 'Empty response from Groq' });
    }

    const cleaned = rawText.replace(/```json|```/g, '').trim();
    const result  = JSON.parse(cleaned);

    res.json(result);

  } catch (err) {
    console.error('Server error:', err.message);
    res.status(500).json({ error: 'Server error: ' + err.message });
  }
});

app.listen(PORT, () => {
  console.log('\n✅ Resume Analyzer running at http://localhost:' + PORT + '\n');
});