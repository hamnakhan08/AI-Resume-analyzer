// app.js — event handlers & main controller

if (typeof pdfjsLib !== 'undefined') {
  pdfjsLib.GlobalWorkerOptions.workerSrc =
    'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js';
}

function handleDrop(event) {
  event.preventDefault();
  document.getElementById('upload-zone').classList.remove('drag');
  const file = event.dataTransfer.files[0];
  if (file) readFile(file);
}

function handleFile(event) {
  const file = event.target.files[0];
  if (file) readFile(file);
}

function readFile(file) {
  const name = file.name.toLowerCase();
  if      (name.endsWith('.pdf'))                           parsePDF(file);
  else if (name.endsWith('.docx') || name.endsWith('.doc')) parseDOCX(file);
  else if (name.endsWith('.txt'))                           parseTXT(file);
  else    showError('unsupported file — use PDF, DOCX, or TXT');
}

async function parsePDF(file) {
  showParseStatus('reading your PDF...');
  try {
    const buf = await file.arrayBuffer();
    const pdf = await pdfjsLib.getDocument({ data: buf }).promise;
    let text  = '';
    for (let i = 1; i <= pdf.numPages; i++) {
      const page    = await pdf.getPage(i);
      const content = await page.getTextContent();
      text += content.items.map(item => item.str).join(' ') + '\n';
    }
    if (!text.trim()) {
      showError('no text found — PDF might be scanned. try copy-pasting instead.');
      clearParseStatus(); return;
    }
    populateTextarea(text, file.name);
  } catch (err) {
    showError('could not read PDF — try copy-pasting your resume');
    clearParseStatus();
  }
}

async function parseDOCX(file) {
  showParseStatus('reading your Word doc...');
  try {
    const buf    = await file.arrayBuffer();
    const result = await mammoth.extractRawText({ arrayBuffer: buf });
    if (!result.value.trim()) {
      showError('could not extract text — try copy-pasting instead.');
      clearParseStatus(); return;
    }
    populateTextarea(result.value, file.name);
  } catch (err) {
    showError('could not read DOCX — try copy-pasting your resume');
    clearParseStatus();
  }
}

function parseTXT(file) {
  showParseStatus('reading your file...');
  const reader   = new FileReader();
  reader.onload  = (e) => populateTextarea(e.target.result, file.name);
  reader.onerror = ()  => { showError('could not read file'); clearParseStatus(); };
  reader.readAsText(file);
}

function populateTextarea(text, filename) {
  document.getElementById('resume-text').value = text;
  updateCount();
  showFileChip(filename);
  clearParseStatus();
}

function clearFile() {
  document.getElementById('file-chip-wrap').innerHTML = '';
  document.getElementById('resume-text').value        = '';
  document.getElementById('file-input').value         = '';
  clearParseStatus();
  updateCount();
}

/**
 * Toggles the custom text input when "Other" is picked from the
 * target-field dropdown.
 */
function handleTargetFieldChange() {
  const select = document.getElementById('target-field-select');
  const custom = document.getElementById('target-field-custom');
  if (select.value === '__other__') {
    custom.style.display = 'block';
    custom.focus();
  } else {
    custom.style.display = 'none';
    custom.value = '';
  }
}

/**
 * Returns the field the user wants to apply for, or '' if they
 * left it on auto-detect.
 */
function getTargetField() {
  const select = document.getElementById('target-field-select');
  if (!select) return '';
  if (select.value === '__other__') {
    return document.getElementById('target-field-custom').value.trim();
  }
  return select.value;
}

async function analyzeResume() {
  const text = document.getElementById('resume-text').value.trim();
  if (!text) {
    showError('upload a PDF/DOCX/TXT or paste your resume first!');
    return;
  }

  const targetField = getTargetField();

  document.getElementById('results').innerHTML    = '';
  document.getElementById('error-wrap').innerHTML = '';
  setLoading(true);

  try {
    const result = await callClaudeAPI(text, targetField);
    document.getElementById('input-section').style.display = 'none';
    renderResults(result);
    document.getElementById('results').scrollIntoView({ behavior: 'smooth', block: 'start' });
  } catch (error) {
    showError('something went wrong: ' + error.message);
  } finally {
    setLoading(false);
  }
}

function resetApp() {
  clearFile();
  document.getElementById('results').innerHTML            = '';
  document.getElementById('input-section').style.display = '';
  document.getElementById('target-field-select').value    = '';
  document.getElementById('target-field-custom').style.display = 'none';
  document.getElementById('target-field-custom').value     = '';
  window.scrollTo({ top: 0, behavior: 'smooth' });
}