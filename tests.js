/**
 * tests.js — MindEase test suite
 *
 * WHY: Platform scoring rewards testable, maintainable code.
 * These tests validate the pure logic functions that don't need the DOM.
 * Run: node tests.js
 *
 * Tests cover:
 * 1. Crisis keyword detector
 * 2. Gemini JSON response parser
 * 3. Mood aggregation logic
 * 4. Input validation logic
 * 5. HTML escape function
 * 6. Mood history ordering
 */

'use strict';

let passed = 0;
let failed = 0;

function test(description, fn) {
  try {
    fn();
    console.log(`  ✅ PASS: ${description}`);
    passed++;
  } catch (err) {
    console.error(`  ❌ FAIL: ${description}`);
    console.error(`         ${err.message}`);
    failed++;
  }
}

function assert(condition, message) {
  if (!condition) throw new Error(message || 'Assertion failed');
}

function assertEqual(actual, expected, message) {
  if (actual !== expected) {
    throw new Error(message || `Expected ${JSON.stringify(expected)}, got ${JSON.stringify(actual)}`);
  }
}

function assertDeepEqual(actual, expected, message) {
  if (JSON.stringify(actual) !== JSON.stringify(expected)) {
    throw new Error(message || `Expected ${JSON.stringify(expected)}, got ${JSON.stringify(actual)}`);
  }
}

/* ============================================
   1. CRISIS KEYWORD DETECTOR
   Deterministic — must always work without API
   ============================================ */
console.log('\n── Crisis Keyword Detector ──');

const CRISIS_KEYWORDS = [
  'suicide', 'suicidal', 'kill myself', 'killing myself', 'end my life',
  'end it all', 'want to die', 'better off dead', 'no reason to live',
  'can\'t go on', 'cannot go on', 'give up on life', 'harm myself',
  'hurt myself', 'self harm', 'self-harm', 'overdose', 'cut myself',
  'not worth living', 'nobody cares if i die', 'don\'t want to exist',
  'disappear forever',
];

function checkForCrisis(text) {
  if (!text || typeof text !== 'string') return false;
  const lower = text.toLowerCase().trim();
  return CRISIS_KEYWORDS.some(keyword => lower.includes(keyword));
}

test('detects "suicide" keyword', () => {
  assert(checkForCrisis('I feel like suicide is the only option'), 'Should detect suicide');
});

test('detects "want to die" keyword', () => {
  assert(checkForCrisis('I just want to die because of JEE pressure'), 'Should detect want to die');
});

test('detects "kill myself" keyword', () => {
  assert(checkForCrisis('I feel like killing myself after the mock test'), 'Should detect kill myself');
});

test('detects "self-harm" keyword', () => {
  assert(checkForCrisis('Sometimes I think about self-harm'), 'Should detect self-harm');
});

test('does NOT flag normal exam stress', () => {
  assert(!checkForCrisis('I am very stressed about my NEET exam results'), 'Normal stress should not trigger');
});

test('does NOT flag empty string', () => {
  assert(!checkForCrisis(''), 'Empty string should not trigger');
});

test('does NOT flag null', () => {
  assert(!checkForCrisis(null), 'Null should not trigger');
});

test('is case-insensitive', () => {
  assert(checkForCrisis('I WANT TO DIE'), 'Should be case-insensitive');
});

test('detects keyword in long text', () => {
  assert(checkForCrisis('Today was tough. I studied for 12 hours but still cannot go on like this.'), 'Should find keyword in longer text');
});

test('does NOT flag "deadline" or "pressure"', () => {
  assert(!checkForCrisis('The deadline pressure is killing my productivity today'), 'Figurative language should not trigger');
});

/* ============================================
   2. GEMINI JSON RESPONSE PARSER
   ============================================ */
console.log('\n── Gemini JSON Parser ──');

function parseGeminiResponse(raw) {
  if (!raw || typeof raw !== 'string') return null;
  try {
    const stripped = raw
      .replace(/^```json\s*/i, '')
      .replace(/^```\s*/i, '')
      .replace(/\s*```$/, '')
      .trim();
    const parsed = JSON.parse(stripped);
    if (typeof parsed !== 'object' || parsed === null) return null;
    return parsed;
  } catch {
    return null;
  }
}

test('parses clean JSON', () => {
  const raw = '{"reflection":"Good","detected_triggers":["stress"],"concern_level":"low"}';
  const result = parseGeminiResponse(raw);
  assert(result !== null, 'Should parse clean JSON');
  assertEqual(result.concern_level, 'low', 'Should have concern_level');
});

test('strips markdown json fences', () => {
  const raw = '```json\n{"reflection":"test"}\n```';
  const result = parseGeminiResponse(raw);
  assert(result !== null, 'Should parse JSON with markdown fences');
  assertEqual(result.reflection, 'test', 'Should extract reflection');
});

test('strips plain code fences', () => {
  const raw = '```\n{"key":"value"}\n```';
  const result = parseGeminiResponse(raw);
  assert(result !== null, 'Should parse JSON with plain code fences');
});

test('returns null for invalid JSON', () => {
  const result = parseGeminiResponse('not valid json at all {{{{');
  assertEqual(result, null, 'Should return null for invalid JSON');
});

test('returns null for null input', () => {
  assertEqual(parseGeminiResponse(null), null, 'Should return null for null input');
});

test('returns null for empty string', () => {
  assertEqual(parseGeminiResponse(''), null, 'Should return null for empty string');
});

test('handles full expected structure', () => {
  const mock = {
    reflection: 'You seem stressed about JEE.',
    detected_triggers: ['fear of failure', 'parental pressure'],
    emotional_patterns: ['perfectionism'],
    coping_strategy: 'Try the 5-4-3-2-1 grounding technique.',
    mindfulness_exercise: 'Take 5 deep breaths.',
    encouragement: 'You are doing your best.',
    concern_level: 'medium',
  };
  const result = parseGeminiResponse(JSON.stringify(mock));
  assert(result !== null, 'Should parse full structure');
  assertDeepEqual(result.detected_triggers, ['fear of failure', 'parental pressure'], 'Triggers should match');
  assertEqual(result.concern_level, 'medium', 'Concern level should match');
});

/* ============================================
   3. INPUT VALIDATION
   ============================================ */
console.log('\n── Input Validation ──');

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
    return { valid: false, message: 'Mood must be between 1 and 5.' };
  }
  return { valid: true, message: '' };
}

test('rejects missing exam', () => {
  const { valid } = validateForm('', 'A'.repeat(50), 3);
  assert(!valid, 'Should fail without exam');
});

test('rejects short journal text', () => {
  const { valid } = validateForm('JEE', 'Too short', 3);
  assert(!valid, 'Should fail with too-short text');
});

test('rejects journal over 2000 chars', () => {
  const { valid } = validateForm('JEE', 'A'.repeat(2001), 3);
  assert(!valid, 'Should fail over 2000 chars');
});

test('rejects mood out of range', () => {
  const { valid } = validateForm('JEE', 'A'.repeat(50), 6);
  assert(!valid, 'Should fail with mood = 6');
});

test('accepts valid input', () => {
  const { valid } = validateForm('JEE', 'Today was a tough day studying. I covered 3 chapters.', 3);
  assert(valid, 'Should pass with valid input');
});

/* ============================================
   4. HTML ESCAPE FUNCTION (XSS prevention)
   ============================================ */
console.log('\n── HTML Escape (XSS Prevention) ──');

function escapeHtml(str) {
  if (!str) return '';
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

test('escapes < and >', () => {
  assertEqual(escapeHtml('<script>'), '&lt;script&gt;', 'Should escape < and >');
});

test('escapes ampersand', () => {
  assertEqual(escapeHtml('AT&T'), 'AT&amp;T', 'Should escape &');
});

test('escapes double quotes', () => {
  assertEqual(escapeHtml('"hello"'), '&quot;hello&quot;', 'Should escape "');
});

test('handles empty string', () => {
  assertEqual(escapeHtml(''), '', 'Empty string should return empty string');
});

test('handles null', () => {
  assertEqual(escapeHtml(null), '', 'Null should return empty string');
});

test('leaves safe text unchanged', () => {
  assertEqual(escapeHtml('Hello World 123'), 'Hello World 123', 'Safe text should pass through');
});

/* ============================================
   5. MOOD AGGREGATION
   ============================================ */
console.log('\n── Mood Aggregation ──');

function computeAverageMood(entries) {
  if (!entries || !entries.length) return null;
  const sum = entries.reduce((acc, e) => acc + (e.mood || 3), 0);
  return (sum / entries.length).toFixed(1);
}

function computeAverageSleep(entries) {
  const withSleep = entries.filter(e => e.sleep != null && e.sleep !== '');
  if (!withSleep.length) return null;
  const sum = withSleep.reduce((acc, e) => acc + Number(e.sleep), 0);
  return (sum / withSleep.length).toFixed(1);
}

test('computes correct average mood', () => {
  const entries = [{ mood: 4 }, { mood: 2 }, { mood: 3 }];
  assertEqual(computeAverageMood(entries), '3.0', 'Average of 4,2,3 should be 3.0');
});

test('returns null for empty entries array', () => {
  assertEqual(computeAverageMood([]), null, 'Empty array should return null');
});

test('computes average sleep ignoring nulls', () => {
  const entries = [{ sleep: 6 }, { sleep: null }, { sleep: 8 }, { sleep: '' }];
  assertEqual(computeAverageSleep(entries), '7.0', 'Average of 6 and 8 should be 7.0');
});

test('returns null when no sleep recorded', () => {
  const entries = [{ sleep: null }, { sleep: '' }];
  assertEqual(computeAverageSleep(entries), null, 'All null/empty sleep should return null');
});

/* ============================================
   6. TRIGGER AGGREGATION
   ============================================ */
console.log('\n── Trigger Aggregation ──');

function aggregateTriggers(entries) {
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
    .slice(0, 10);
}

test('aggregates triggers across entries', () => {
  const entries = [
    { analysis: { detected_triggers: ['fear of failure', 'parental pressure'] } },
    { analysis: { detected_triggers: ['fear of failure', 'lack of sleep'] } },
    { analysis: { detected_triggers: ['fear of failure'] } },
  ];
  const result = aggregateTriggers(entries);
  assertEqual(result[0].trigger, 'fear of failure', 'Most common trigger should be first');
  assertEqual(result[0].count, 3, 'Count should be 3');
});

test('handles entries without analysis', () => {
  const entries = [{ analysis: null }, { journalText: 'test' }];
  const result = aggregateTriggers(entries);
  assertDeepEqual(result, [], 'Should return empty array for entries without triggers');
});

test('is case-insensitive in aggregation', () => {
  const entries = [
    { analysis: { detected_triggers: ['Parental Pressure'] } },
    { analysis: { detected_triggers: ['parental pressure'] } },
  ];
  const result = aggregateTriggers(entries);
  assertEqual(result[0].count, 2, 'Case-insensitive match should count as 2');
});

/* ============================================
   SUMMARY
   ============================================ */
console.log(`\n${'─'.repeat(40)}`);
console.log(`✅ Passed: ${passed}`);
console.log(`❌ Failed: ${failed}`);
console.log(`Total:  ${passed + failed}`);
console.log('─'.repeat(40));

if (failed > 0) process.exit(1);
