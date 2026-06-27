/**
 * app.js — Main application logic
 *
 * Handles:
 * 1. Journal form submission and input validation
 * 2. Crisis check (before API call — always synchronous)
 * 3. Secure API call to /api/analyze (serverless proxy)
 * 4. Defensive JSON parsing of Gemini response
 * 5. Results rendering
 * 6. Navigation between sections
 * 7. UI helpers (mood label, char count)
 */

'use strict';

/* ---- Mood label data ---- */
const MOOD_LABELS = {
  1: '😔 Very low',
  2: '😕 Low',
  3: '😐 Neutral',
  4: '🙂 Good',
  5: '😊 Great'
};

/* ---- Navigation ---- */
/**
 * showSection — switches between journal and dashboard views.
 * Updates nav button states and ARIA current page.
 * @param {'journal'|'dashboard'} name
 */
function showSection(name) {
  const sections = ['journal', 'dashboard'];
  sections.forEach(s => {
    const section = document.getElementById(`section-${s}`);
    const btn = document.getElementById(`nav-${s}`);
    if (!section || !btn) return;
    const isActive = s === name;
    section.hidden = !isActive;
    btn.classList.toggle('active', isActive);
    btn.setAttribute('aria-current', isActive ? 'page' : 'false');
  });
  if (name === 'dashboard') renderDashboard();
  window.scrollTo({ top: 0, behavior: 'smooth' });
}

/* ---- Form helpers ---- */
/** updateMoodLabel — updates the live mood emoji label next to slider. */
function updateMoodLabel(value) {
  const label = document.getElementById('mood-label');
  if (label) label.textContent = MOOD_LABELS[value] || '😐 Neutral';
}

/** updateCharCount — updates the character count display. */
function updateCharCount(textarea) {
  const counter = document.getElementById('char-count');
  if (counter && textarea) {
    counter.textContent = `${textarea.value.length} / 2000`;
  }
}

/* ---- Input validation ---- */
/**
 * validateForm — checks all required fields before submission.
 * Returns { valid: boolean, message: string }
 */
function validateForm(exam, journalText, mood) {
  if (!exam || exam.trim() === '') {
    return { valid: false, message: 'Please select the exam you are preparing for.' };
  }
  const text = journalText ? journalText.trim() : '';
  if (text.length < 30) {
    return { valid: false, message: 'Please write at least 30 characters in your journal entry.' };
  }
  if (text.length > 2000) {
    return { valid: false, message: 'Your entry exceeds 2000 characters. Please shorten it.' };
  }
  const moodNum = Number(mood);
  if (isNaN(moodNum) || moodNum < 1 || moodNum > 5) {
    return { valid: false, message: 'Please set your mood using the slider.' };
  }
  return { valid: true, message: '' };
}

/* ---- State management ---- */
function showLoading() {
  document.getElementById('journal-form').hidden = true;
  document.getElementById('loading-state').hidden = false;
  document.getElementById('error-state').hidden = true;
  document.getElementById('results-card').hidden = true;
}

function showError(message) {
  document.getElementById('loading-state').hidden = true;
  document.getElementById('error-state').hidden = false;
  const msgEl = document.getElementById('error-message');
  if (msgEl) msgEl.textContent = message || 'Something went wrong. Please try again.';
}

function resetForm() {
  document.getElementById('journal-form').hidden = false;
  document.getElementById('loading-state').hidden = true;
  document.getElementById('error-state').hidden = true;
  document.getElementById('results-card').hidden = true;
  document.getElementById('journal-text').value = '';
  updateCharCount(document.getElementById('journal-text'));
}

/* ---- Safe text rendering helper ---- */
/**
 * safeSetText — uses textContent (never innerHTML) to prevent XSS.
 * @param {string} id — element ID
 * @param {string} text — text to set
 */
function safeSetText(id, text) {
  const el = document.getElementById(id);
  if (el) el.textContent = text || '—';
}

/**
 * safeSetList — renders a list of strings as <li> elements.
 * Uses textContent to prevent XSS.
 */
function safeSetList(id, items) {
  const el = document.getElementById(id);
  if (!el) return;
  el.innerHTML = '';
  if (!items || !items.length) {
    const li = document.createElement('li');
    li.textContent = 'None detected in this entry.';
    el.appendChild(li);
    return;
  }
  items.forEach(item => {
    const li = document.createElement('li');
    li.textContent = String(item);
    el.appendChild(li);
  });
}

/* ---- Defensive JSON parser ---- */
/**
 * parseGeminiResponse — tries to extract valid JSON from Gemini's response.
 * Gemini sometimes wraps JSON in markdown code blocks — we strip those.
 * Returns null if parsing fails.
 * @param {string} raw — raw text from the API
 * @returns {object|null}
 */
function parseGeminiResponse(raw) {
  if (!raw || typeof raw !== 'string') return null;
  try {
    // Strip markdown code fences if present
    const stripped = raw
      .replace(/^```json\s*/i, '')
      .replace(/^```\s*/i, '')
      .replace(/\s*```$/, '')
      .trim();
    const parsed = JSON.parse(stripped);
    // Validate expected fields
    if (typeof parsed !== 'object' || parsed === null) return null;
    return parsed;
  } catch {
    return null;
  }
}

/* ---- Results rendering ---- */
/**
 * renderResults — populates the results card with AI analysis.
 * All text is rendered via textContent — no innerHTML with user/AI data.
 */
function renderResults(analysis, journalText, mood, exam) {
  // Date
  const dateEl = document.getElementById('results-date');
  if (dateEl) {
    dateEl.textContent = new Date().toLocaleDateString('en-IN', {
      weekday: 'long', day: 'numeric', month: 'long', year: 'numeric'
    });
  }

  safeSetText('result-reflection', analysis.reflection);
  safeSetList('result-triggers', analysis.detected_triggers);
  safeSetList('result-patterns', analysis.emotional_patterns);
  safeSetText('result-coping', analysis.coping_strategy);
  safeSetText('result-mindfulness', analysis.mindfulness_exercise);
  safeSetText('result-encouragement', analysis.encouragement);

  // Show results, hide loading
  document.getElementById('loading-state').hidden = true;
  document.getElementById('results-card').hidden = false;
  document.getElementById('results-card').scrollIntoView({ behavior: 'smooth' });

  // Show crisis banner if Gemini flags high concern (secondary check)
  if (analysis.concern_level === 'high') {
    showCrisisBanner();
  }

  // Persist to localStorage
  addEntry({
    date: new Date().toISOString().slice(0, 10),
    exam,
    mood: Number(mood),
    sleep: Number(document.getElementById('sleep-hours')?.value) || null,
    journalText,
    analysis,
  });
}

/* ---- API Call ---- */
/**
 * callAnalyzeAPI — sends journal data to the serverless /api/analyze endpoint.
 * The API key is never in client code — it lives in Vercel env vars server-side.
 *
 * @param {object} payload
 * @returns {Promise<object>} parsed analysis object
 * @throws {Error} with a user-facing message on failure
 */
async function callAnalyzeAPI(payload) {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 30000); // 30s timeout

  try {
    const response = await fetch('/api/analyze', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
      signal: controller.signal,
    });

    clearTimeout(timeout);

    if (!response.ok) {
      if (response.status === 429) throw new Error('Too many requests. Please wait a moment and try again.');
      if (response.status === 503) throw new Error('AI service temporarily unavailable. Please try again in a moment.');
      const errorData = await response.json().catch(() => ({}));
      throw new Error(errorData.error || `Server error (${response.status}). Please try again.`);
    }

    const data = await response.json();
    if (!data || !data.analysis) throw new Error('Unexpected response from server. Please try again.');
    return data.analysis;

  } catch (err) {
    clearTimeout(timeout);
    if (err.name === 'AbortError') throw new Error('Request timed out. Please check your connection and try again.');
    throw err;
  }
}

/* ---- Form submission ---- */
document.addEventListener('DOMContentLoaded', () => {
  const form = document.getElementById('journal-form');
  if (!form) return;

  form.addEventListener('submit', async (event) => {
    event.preventDefault();

    const exam = document.getElementById('exam-select')?.value?.trim() || '';
    const journalText = document.getElementById('journal-text')?.value || '';
    const mood = document.getElementById('mood-slider')?.value || '3';
    const sleep = document.getElementById('sleep-hours')?.value || '';

    // 1. Validate inputs
    const { valid, message } = validateForm(exam, journalText, mood);
    if (!valid) {
      alert(message);
      return;
    }

    // 2. Crisis check — deterministic, runs before any API call
    handleCrisisIfNeeded(journalText);

    // 3. Show loading state
    showLoading();

    try {
      // 4. Call the secure serverless API
      const analysis = await callAnalyzeAPI({
        exam,
        journalText: journalText.trim(),
        mood: Number(mood),
        sleep: sleep !== '' ? Number(sleep) : null,
      });

      // 5. Render results
      renderResults(analysis, journalText.trim(), mood, exam);

    } catch (err) {
      console.error('MindEase API error:', err);
      showError(err.message || 'Could not reach the AI service. Please check your connection and try again.');
    }
  });

  // Initialise mood label on page load
  updateMoodLabel(document.getElementById('mood-slider')?.value || 3);
});
