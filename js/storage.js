/**
 * storage.js — localStorage abstraction for journal entries
 *
 * WHY: all data stays on the user's device (no server storage).
 * The AI analysis result is saved alongside each entry so we can
 * build trends without re-calling the API.
 *
 * Entry schema:
 * {
 *   id: string (ISO timestamp),
 *   date: string (ISO date),
 *   exam: string,
 *   mood: number (1-5),
 *   sleep: number | null,
 *   journalText: string,
 *   analysis: {
 *     reflection: string,
 *     detected_triggers: string[],
 *     emotional_patterns: string[],
 *     coping_strategy: string,
 *     mindfulness_exercise: string,
 *     encouragement: string,
 *     concern_level: 'low' | 'medium' | 'high'
 *   }
 * }
 */

'use strict';

const STORAGE_KEY = 'mindease_entries_v1';

/** Load all entries from localStorage. Returns [] if none or corrupt. */
function loadEntries() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

/** Save an array of entries to localStorage. */
function saveEntries(entries) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(entries));
    return true;
  } catch {
    console.error('MindEase: could not save entry — storage full?');
    return false;
  }
}

/**
 * addEntry — prepends a new entry and persists it.
 * @param {object} entry — see schema above
 * @returns {string} the generated id
 */
function addEntry(entry) {
  const entries = loadEntries();
  const id = new Date().toISOString();
  const fullEntry = { id, ...entry };
  entries.unshift(fullEntry); // newest first
  saveEntries(entries);
  return id;
}

/** Clear all entries. Irreversible. */
function clearAllEntries() {
  localStorage.removeItem(STORAGE_KEY);
}

/**
 * getAggregatedTriggers — counts how often each AI-detected trigger
 * appears across all entries. Returns sorted array of { trigger, count }.
 */
function getAggregatedTriggers() {
  const entries = loadEntries();
  const counts = {};
  for (const entry of entries) {
    const triggers = entry.analysis?.detected_triggers ?? [];
    for (const t of triggers) {
      const key = t.toLowerCase().trim();
      counts[key] = (counts[key] || 0) + 1;
    }
  }
  return Object.entries(counts)
    .map(([trigger, count]) => ({ trigger, count }))
    .sort((a, b) => b.count - a.count)
    .slice(0, 10); // top 10 triggers
}

/**
 * getMoodHistory — returns the last N entries as {date, mood} pairs
 * for chart rendering, oldest-first.
 */
function getMoodHistory(n = 14) {
  const entries = loadEntries();
  return entries
    .slice(0, n)
    .reverse()
    .map(e => ({ date: e.date, mood: e.mood, exam: e.exam }));
}

/** Compute average mood across all entries. Returns null if no entries. */
function getAverageMood() {
  const entries = loadEntries();
  if (!entries.length) return null;
  const sum = entries.reduce((acc, e) => acc + (e.mood || 3), 0);
  return (sum / entries.length).toFixed(1);
}

/** Compute average sleep across entries that recorded sleep. */
function getAverageSleep() {
  const entries = loadEntries();
  const withSleep = entries.filter(e => e.sleep != null && e.sleep !== '');
  if (!withSleep.length) return null;
  const sum = withSleep.reduce((acc, e) => acc + Number(e.sleep), 0);
  return (sum / withSleep.length).toFixed(1);
}

/**
 * getDayStreak — counts consecutive days with at least one entry
 * ending today (or yesterday). Returns 0 if no entries.
 */
function getDayStreak() {
  const entries = loadEntries();
  if (!entries.length) return 0;
  const dates = [...new Set(entries.map(e => e.date))].sort().reverse();
  const today = new Date().toISOString().slice(0, 10);
  const yesterday = new Date(Date.now() - 86400000).toISOString().slice(0, 10);
  if (dates[0] !== today && dates[0] !== yesterday) return 0;
  let streak = 1;
  for (let i = 1; i < dates.length; i++) {
    const prev = new Date(dates[i - 1]);
    const curr = new Date(dates[i]);
    const diff = Math.round((prev - curr) / 86400000);
    if (diff === 1) { streak++; } else { break; }
  }
  return streak;
}
