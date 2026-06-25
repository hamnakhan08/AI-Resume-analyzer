/* ============================================
   ui.js — DOM rendering & UI helpers
   Everything that touches the HTML lives here.
   ============================================ */

/**
 * Returns color config based on score value.
 * @param {number} score
 */
function getScoreColor(score) {
  if (score >= 80) return {
    stroke: '#34d399',
    bg: 'rgba(52, 211, 153, 0.15)',
    text: '#34d399',
    label: 'excellent'
  };
  if (score >= 65) return {
    stroke: '#a78bfa',
    bg: 'rgba(167, 139, 250, 0.15)',
    text: '#a78bfa',
    label: 'solid'
  };
  if (score >= 45) return {
    stroke: '#fbbf24',
    bg: 'rgba(251, 191, 36, 0.15)',
    text: '#fbbf24',
    label: 'needs work'
  };
  return {
    stroke: '#f87171',
    bg: 'rgba(248, 113, 113, 0.15)',
    text: '#f87171',
    label: 'oof...'
  };
}

/**
 * Builds an SVG circular progress ring for the score.
 * @param {number} score  0-100
 * @param {Object} color  from getScoreColor()
 * @returns {string} SVG markup
 */
function buildScoreRing(score, color) {
  const r    = 36;
  const cx   = 46;
  const cy   = 46;
  const sw   = 6;
  const circ = 2 * Math.PI * r;
  const pct  = Math.max(0, Math.min(100, score)) / 100;
  const dash = (pct * circ).toFixed(1);
  const gap  = (circ - pct * circ).toFixed(1);

  return `
    <svg class="score-ring" width="92" height="92" viewBox="0 0 92 92" aria-hidden="true">
      <circle cx="${cx}" cy="${cy}" r="${r}"
        fill="none"
        stroke="rgba(255,255,255,0.06)"
        stroke-width="${sw}" />
      <circle cx="${cx}" cy="${cy}" r="${r}"
        fill="none"
        stroke="${color.stroke}"
        stroke-width="${sw}"
        stroke-dasharray="${dash} ${gap}"
        stroke-linecap="round"
        transform="rotate(-90 ${cx} ${cy})" />
      <text x="${cx}" y="${cy - 5}"
        text-anchor="middle"
        font-family="Space Grotesk"
        font-size="18"
        font-weight="700"
        fill="${color.stroke}">${score}</text>
      <text x="${cx}" y="${cy + 12}"
        text-anchor="middle"
        font-family="Space Grotesk"
        font-size="10"
        fill="rgba(255,255,255,0.4)">/100</text>
    </svg>`;
}

/**
 * Renders a group of skill pills.
 * @param {string[]} arr   list of skills
 * @param {string}   cls   CSS modifier class ('', 'soft', 'tool')
 * @param {string}   label display label
 */
function buildSkillGroup(arr, cls, label) {
  if (!arr || arr.length === 0) return '';
  const pills = arr.map(s => `<span class="skill-pill ${cls}">${s}</span>`).join('');
  return `
    <div class="skills-group">
      <div class="skills-type">${label}</div>
      <div class="skills-wrap">${pills}</div>
    </div>`;
}

/**
 * Renders all suggestion items.
 * @param {Array} suggestions from API response
 */
function buildSuggestions(suggestions) {
  if (!suggestions || suggestions.length === 0) return '';

  const iconMap  = { good: '✓', warn: '!', bad: '✕' };
  const tagMap   = { good: 'looking good', warn: 'heads up', bad: 'needs fixing' };

  const items = suggestions.map(s => `
    <div class="sug-item">
      <div class="sug-icon ${s.type}">${iconMap[s.type] || '·'}</div>
      <div>
        <div class="sug-tag ${s.type}">${tagMap[s.type] || s.type}</div>
        <div class="sug-text">${s.text}</div>
      </div>
    </div>`).join('');

  return `
    <div class="card">
      <div class="section-label">✦ feedback</div>
      ${items}
    </div>`;
}

/**
 * Renders the field-detection card: detected field, confidence,
 * a field-specific score ring, summary, and suggested job roles.
 * @param {Object} data  parsed API response
 */
function buildFieldCard(data) {
  if (!data.detected_field) return '';

  const fScore = (typeof data.field_score === 'number') ? data.field_score : data.score;
  const color  = getScoreColor(fScore);

  const roles = (data.suggested_roles || [])
    .map(r => `<span class="role-pill">${r}</span>`).join('');

  const confidence = data.field_confidence
    ? `<span class="field-confidence">${data.field_confidence.toLowerCase()} confidence</span>`
    : '';

  return `
    <div class="card field-card">
      <div class="section-label">🎯 field match</div>
      <div class="field-header">
        <div class="field-header-text">
          <div class="field-name">${data.detected_field}</div>
          ${confidence}
        </div>
        <div class="score-ring-wrap field-ring-wrap" aria-hidden="true">
          ${buildScoreRing(fScore, color)}
        </div>
      </div>
      <div class="field-summary">${data.field_score_summary || ''}</div>
      ${roles ? `
        <div class="roles-wrap">
          <div class="skills-type">you're a fit for</div>
          <div class="skills-wrap">${roles}</div>
        </div>` : ''}
    </div>`;
}

/**
 * Renders field-specific suggestion items (separate from general feedback).
 * @param {Array} suggestions from API response
 */
function buildFieldSuggestions(suggestions) {
  if (!suggestions || suggestions.length === 0) return '';

  const iconMap = { good: '✓', warn: '!', bad: '✕' };
  const tagMap  = { good: 'looking good', warn: 'heads up', bad: 'needs fixing' };

  const items = suggestions.map(s => `
    <div class="sug-item">
      <div class="sug-icon ${s.type}">${iconMap[s.type] || '·'}</div>
      <div>
        <div class="sug-tag ${s.type}">${tagMap[s.type] || s.type}</div>
        <div class="sug-text">${s.text}</div>
      </div>
    </div>`).join('');

  return `
    <div class="card">
      <div class="section-label">🧭 field-specific feedback</div>
      ${items}
    </div>`;
}

/**
 * Renders the user-chosen target-field card (separate from the
 * AI auto-detected field). Only shown if target_field was provided.
 * @param {Object} data  parsed API response
 */
function buildTargetFieldCard(data) {
  if (!data.target_field || typeof data.target_field_score !== 'number') return '';

  const color = getScoreColor(data.target_field_score);

  return `
    <div class="card field-card target-field-card">
      <div class="section-label">🧭 your target: ${data.target_field}</div>
      <div class="field-header">
        <div class="field-header-text">
          <div class="field-name">${data.target_field_score_label || 'fit score'}</div>
        </div>
        <div class="score-ring-wrap field-ring-wrap" aria-hidden="true">
          ${buildScoreRing(data.target_field_score, color)}
        </div>
      </div>
      <div class="field-summary">${data.target_field_score_summary || ''}</div>
      ${buildFieldSuggestionsBlock(data.target_field_suggestions)}
    </div>`;
}

/**
 * Shared renderer for a list of suggestion items, used by general,
 * field, and target-field suggestion blocks alike.
 * @param {Array} suggestions
 */
function buildFieldSuggestionsBlock(suggestions) {
  if (!suggestions || suggestions.length === 0) return '';
  const iconMap = { good: '✓', warn: '!', bad: '✕' };
  const tagMap  = { good: 'looking good', warn: 'heads up', bad: 'needs fixing' };

  return suggestions.map(s => `
    <div class="sug-item">
      <div class="sug-icon ${s.type}">${iconMap[s.type] || '·'}</div>
      <div>
        <div class="sug-tag ${s.type}">${tagMap[s.type] || s.type}</div>
        <div class="sug-text">${s.text}</div>
      </div>
    </div>`).join('');
}

/**
 * Renders the ATS (Applicant Tracking System) compatibility card —
 * a score ring plus a pass/fail checklist.
 * @param {Object} data  parsed API response
 */
function buildAtsCard(data) {
  if (typeof data.ats_score !== 'number') return '';

  const color  = getScoreColor(data.ats_score);
  const checks = data.ats_checks || [];

  const items = checks.map(c => `
    <div class="ats-check ${c.passed ? 'pass' : 'fail'}">
      <span class="ats-check-icon">${c.passed ? '✓' : '✕'}</span>
      <span class="ats-check-label">${c.label}</span>
    </div>`).join('');

  return `
    <div class="card ats-card">
      <div class="field-header">
        <div class="section-label" style="margin-bottom:0;">🛡️ ATS compatibility</div>
        <div class="score-ring-wrap field-ring-wrap" aria-hidden="true">
          ${buildScoreRing(data.ats_score, color)}
        </div>
      </div>
      <div class="ats-checklist">${items}</div>
    </div>`;
}

/**
 * Renders the full results section into #results.
 * @param {Object} data  parsed API response
 */
function renderResults(data) {
  const color = getScoreColor(data.score);

  const allSkillsEmpty =
    !data.technical_skills?.length &&
    !data.soft_skills?.length &&
    !data.tools?.length;

  const skillsCard = allSkillsEmpty ? '' : `
    <div class="card">
      <div class="section-label">⬡ skills detected</div>
      ${buildSkillGroup(data.technical_skills, '',     'technical skills')}
      ${buildSkillGroup(data.soft_skills,      'soft', 'soft skills')}
      ${buildSkillGroup(data.tools,            'tool', 'tools & platforms')}
    </div>`;

  document.getElementById('results').innerHTML = `
    <div class="score-wrap" role="region" aria-label="Resume score">
      <div class="score-ring-wrap" aria-hidden="true">
        ${buildScoreRing(data.score, color)}
      </div>
      <div>
        <span class="score-label"
          style="background:${color.bg}; color:${color.text}">
          ${color.label}
        </span>
        <div class="score-title">${data.score_label || 'resume score'}</div>
        <div class="score-desc">${data.score_summary || ''}</div>
      </div>
    </div>

    ${buildTargetFieldCard(data)}
    ${buildFieldCard(data)}
    ${buildAtsCard(data)}
    ${skillsCard}
    ${buildSuggestions(data.suggestions)}
    ${buildFieldSuggestions(data.field_suggestions)}

    <button class="reset-btn" onclick="resetApp()">
      ← analyze another resume
    </button>`;
}

/**
 * Shows an error message under the input for 5 seconds.
 * @param {string} msg
 */
function showError(msg) {
  const wrap = document.getElementById('error-wrap');
  wrap.innerHTML = `<div class="error-box">⚠ ${msg}</div>`;
  setTimeout(() => { wrap.innerHTML = ''; }, 5000);
}

/**
 * Shows a file chip with the uploaded filename.
 * @param {string} name
 */
function showFileChip(name) {
  document.getElementById('file-chip-wrap').innerHTML = `
    <div class="file-chip">
      ✓ ${name}
      <span class="remove" onclick="clearFile()" title="Remove file">×</span>
    </div>`;
}

/**
 * Updates character count display.
 */
function updateCount() {
  const len = document.getElementById('resume-text').value.length;
  document.getElementById('char-count').textContent = len.toLocaleString();
}

/**
 * Sets the analyze button to loading state.
 */
function setLoading(isLoading) {
  const btn = document.getElementById('analyze-btn');
  btn.disabled = isLoading;
  btn.innerHTML = isLoading
    ? '<div class="spinner"></div> reading your vibe...'
    : '✦ analyze my resume';
}


/* ── Parse status helpers (added for PDF/DOCX support) ── */

/**
 * Shows a loading message while parsing a file.
 */
function showParseStatus(msg) {
  document.getElementById('parse-status').innerHTML = `
    <div class="parse-status">
      <div class="spinner-sm"></div> ${msg}
    </div>`;
}

function clearParseStatus() {
  document.getElementById('parse-status').innerHTML = '';
}