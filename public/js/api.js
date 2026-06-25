// api.js — calls YOUR server at /analyze

async function callClaudeAPI(resumeText, targetField) {
  const response = await fetch('/api/analyze', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      resumeText,
      targetField: targetField || ''
    })
  });

  const text = await response.text();

  try {
    const data = JSON.parse(text);

    if (data.error) {
      throw new Error(data.error);
    }

    return data;
  } catch (e) {
    console.error('Server returned:', text);
    throw new Error(text);
  }
}
