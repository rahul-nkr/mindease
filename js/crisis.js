/**
 * crisis.js — Deterministic crisis keyword detector
 * Runs BEFORE and INDEPENDENTLY of the AI call.
 * If triggered, shows real Indian helpline numbers immediately.
 *
 * WHY this file exists separately:
 * Safety must never depend on an API call succeeding.
 * This check is synchronous and works offline.
 */

'use strict';

/* ---- Crisis keyword list ---- */
const CRISIS_KEYWORDS = [
  'suicide', 'suicidal', 'kill myself', 'killing myself', 'end my life',
  'end it all', 'want to die', 'better off dead', 'no reason to live',
  'can\'t go on', 'cannot go on', 'give up on life', 'harm myself',
  'hurt myself', 'self harm', 'self-harm', 'overdose', 'cut myself',
  'not worth living', 'nobody cares if i die', 'don\'t want to exist',
  'disappear forever', 'مرنا चाहता', 'जीना नहीं चाहता'
];

/**
 * checkForCrisis — scans journal text for crisis signals.
 * @param {string} text — the raw journal entry text
 * @returns {boolean} true if crisis keyword detected
 */
function checkForCrisis(text) {
  if (!text || typeof text !== 'string') return false;
  const lower = text.toLowerCase().trim();
  return CRISIS_KEYWORDS.some(keyword => lower.includes(keyword));
}

/**
 * showCrisisBanner — displays the crisis support banner.
 * Calm, warm tone. Does NOT interrogate the user.
 */
function showCrisisBanner() {
  const banner = document.getElementById('crisis-banner');
  if (banner) {
    banner.hidden = false;
    banner.scrollIntoView({ behavior: 'smooth', block: 'start' });
    banner.focus();
  }
}

/**
 * dismissCrisis — hides the crisis banner.
 * The banner can be dismissed but remains accessible.
 */
function dismissCrisis() {
  const banner = document.getElementById('crisis-banner');
  if (banner) banner.hidden = true;
}

/**
 * handleCrisisIfNeeded — central entry point.
 * Call this with journal text before submitting to AI.
 * @param {string} text
 * @returns {boolean} whether crisis was detected
 */
function handleCrisisIfNeeded(text) {
  if (checkForCrisis(text)) {
    showCrisisBanner();
    return true;
  }
  return false;
}
