/**
 * dashboard.js — Populates the My Trends dashboard
 *
 * WHY separate: keeps dashboard logic decoupled from journal logic.
 * Reads everything from localStorage via storage.js — no extra API calls.
 */

'use strict';

/** renderDashboard — entry point called when the dashboard tab is shown. */
function renderDashboard() {
  const entries = loadEntries();
  const empty = document.getElementById('dashboard-empty');
  const content = document.getElementById('dashboard-content');

  if (!entries.length) {
    if (empty) empty.hidden = false;
    if (content) content.hidden = true;
    return;
  }

  if (empty) empty.hidden = true;
  if (content) content.hidden = false;

  renderStats(entries);
  renderMoodChart(entries);
  renderTriggerBars();
  renderRecentEntries(entries);
}

/** renderStats — fills the 4 summary stat cards. */
function renderStats(entries) {
  const setEl = (id, val) => {
    const el = document.getElementById(id);
    if (el) el.textContent = val ?? '—';
  };

  setEl('stat-entries', entries.length);

  const avg = getAverageMood();
  const moodLabels = { 1: '😔', 2: '😕', 3: '😐', 4: '🙂', 5: '😊' };
  if (avg !== null) {
    const rounded = Math.round(Number(avg));
    setEl('stat-avg-mood', `${moodLabels[rounded] || '😐'} ${avg}`);
  }

  setEl('stat-streak', getDayStreak() + ' day' + (getDayStreak() !== 1 ? 's' : ''));

  const sleep = getAverageSleep();
  setEl('stat-avg-sleep', sleep !== null ? `${sleep} hrs` : '—');
}

/** renderMoodChart — draws the canvas mood trend. */
function renderMoodChart(entries) {
  const history = getMoodHistory(14);
  drawMoodChart('mood-chart', history);
}

/** renderTriggerBars — horizontal bar chart for top triggers. */
function renderTriggerBars() {
  const container = document.getElementById('triggers-bars');
  if (!container) return;

  const triggers = getAggregatedTriggers();
  if (!triggers.length) {
    container.innerHTML = '<p style="color:#9B968F;font-size:0.875rem;">No triggers detected yet. Keep journaling.</p>';
    return;
  }

  const max = triggers[0].count;
  container.innerHTML = triggers.map(({ trigger, count }) => {
    const pct = Math.round((count / max) * 100);
    const capitalized = trigger.charAt(0).toUpperCase() + trigger.slice(1);
    return `
      <div class="trigger-row">
        <span class="trigger-name" title="${escapeHtml(trigger)}">${escapeHtml(capitalized)}</span>
        <div class="trigger-bar-wrap" role="progressbar" aria-valuenow="${count}" aria-valuemin="0" aria-valuemax="${max}" aria-label="${escapeHtml(trigger)}: ${count} time${count !== 1 ? 's' : ''}">
          <div class="trigger-bar" style="width:${pct}%"></div>
        </div>
        <span class="trigger-count">${count}</span>
      </div>`;
  }).join('');
}

/** renderRecentEntries — shows up to 7 recent entries as a list. */
function renderRecentEntries(entries) {
  const list = document.getElementById('entries-list');
  if (!list) return;

  const moodColors = ['', '#EF4444', '#F97316', '#EAB308', '#84CC16', '#22C55E'];
  const moodEmoji = ['', '😔', '😕', '😐', '🙂', '😊'];
  const recent = entries.slice(0, 7);

  list.innerHTML = recent.map(e => {
    const preview = escapeHtml((e.journalText || '').slice(0, 80));
    const dotColor = moodColors[e.mood] || '#9B968F';
    const dateStr = formatDate(e.date);
    return `
      <li class="entry-item">
        <span class="entry-mood-dot" style="background:${dotColor}" aria-label="Mood: ${moodEmoji[e.mood] || '—'}"></span>
        <div class="entry-body">
          <p class="entry-date">${escapeHtml(dateStr)}</p>
          <p class="entry-preview">${preview}${e.journalText && e.journalText.length > 80 ? '…' : ''}</p>
        </div>
        <span class="entry-exam">${escapeHtml(e.exam || '')}</span>
      </li>`;
  }).join('');
}

/** confirmClearData — asks for confirmation before clearing. */
function confirmClearData() {
  if (window.confirm('Delete all journal entries? This cannot be undone.')) {
    clearAllEntries();
    renderDashboard();
  }
}

/* ---- Helpers ---- */

/** escapeHtml — prevents XSS when inserting text into innerHTML. */
function escapeHtml(str) {
  if (!str) return '';
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

/** formatDate — turns ISO date string into readable format. */
function formatDate(isoDate) {
  if (!isoDate) return '';
  try {
    const d = new Date(isoDate);
    return d.toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' });
  } catch {
    return isoDate;
  }
}
