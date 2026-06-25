// api.js — calls YOUR server at /analyze
// No API key here. Key lives in server.js only.

async function callClaudeAPI(resumeText, targetField) {
  const response = await fetch('/api/analyze', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ resumeText, targetField: targetField || '' })
  });

  const data = await response.json();

  if (data.error) throw new Error(data.error);

  return data;
}