/**
 * api/analyze.js — Vercel Serverless Function (Gemini Proxy)
 *
 * Security: Gemini API key is read ONLY from server-side env var.
 * It is never sent to the client or stored in the repo.
 */

export default async function handler(req, res) {
  // Security headers
  res.setHeader('Content-Type', 'application/json');
  res.setHeader('X-Content-Type-Options', 'nosniff');

  // Only allow POST
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed.' });
  }

  // Read and validate request body
  const { exam, journalText, mood, sleep } = req.body || {};

  if (!journalText || typeof journalText !== 'string' || journalText.trim().length < 10) {
    return res.status(400).json({ error: 'Journal entry is too short.' });
  }
  if (journalText.length > 2000) {
    return res.status(400).json({ error: 'Journal entry too long.' });
  }
  if (!exam || typeof exam !== 'string') {
    return res.status(400).json({ error: 'Exam field is required.' });
  }
  const moodNum = Number(mood);
  if (isNaN(moodNum) || moodNum < 1 || moodNum > 5) {
    return res.status(400).json({ error: 'Mood must be 1-5.' });
  }

  // Get API key from environment variable (set in Vercel dashboard)
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    console.error('GEMINI_API_KEY environment variable is not set.');
    return res.status(503).json({ error: 'AI service not configured.' });
  }

  // Build the system instruction
  const systemInstruction = `You are MindEase, an empathetic mental wellness companion for Indian students preparing for high-stakes competitive exams like NEET, JEE, CUET, CAT, GATE, UPSC, and Board exams.

STRICT RULES:
1. You are NOT a doctor or therapist. NEVER diagnose any condition.
2. NEVER recommend medication or clinical treatment.
3. NEVER invent statistics or facts. Only use well-established wellness techniques.
4. If the student expresses suicidal ideation or self-harm, set concern_level to "high" and mention Tele-MANAS (14416) in encouragement.
5. Base ALL analysis ONLY on what the student wrote. Do not fabricate.
6. Keep tone warm, non-judgmental, and encouraging.
7. Return ONLY valid JSON — no markdown, no explanation outside the JSON.

Return exactly this JSON structure:
{
  "reflection": "2-3 warm empathetic sentences showing you understood their specific situation",
  "detected_triggers": ["trigger 1", "trigger 2", "trigger 3"],
  "emotional_patterns": ["pattern 1", "pattern 2"],
  "coping_strategy": "One specific actionable personalised coping strategy",
  "mindfulness_exercise": "One short concrete mindfulness exercise they can do right now",
  "encouragement": "2-3 warm specific motivational sentences tailored to their exam and situation",
  "concern_level": "low"
}

concern_level must be exactly one of: "low", "medium", or "high"
detected_triggers: 2-4 specific stressors visible in their text
emotional_patterns: 1-3 broader emotional themes`;

  // Build the user prompt
  const moodDesc = ['', 'very low (1/5)', 'low (2/5)', 'neutral (3/5)', 'good (4/5)', 'great (5/5)'];
  const sleepStr = (sleep != null && sleep !== '') ? `${sleep} hours` : 'not recorded';

  const userPrompt = `Student context:
- Exam preparing for: ${exam}
- Self-reported mood today: ${moodDesc[Math.round(moodNum)] || moodNum}
- Sleep last night: ${sleepStr}

Journal entry:
"${journalText.trim()}"

Analyse this entry and return the JSON response.`;

  // Call Gemini API
  const geminiUrl = `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${apiKey}`;

  const geminiPayload = {
    system_instruction: {
      parts: [{ text: systemInstruction }]
    },
    contents: [{
      role: 'user',
      parts: [{ text: userPrompt }]
    }],
    generationConfig: {
      temperature: 0.4,
      topP: 0.9,
      maxOutputTokens: 1024,
      responseMimeType: 'application/json'
    },
    safetySettings: [
      { category: 'HARM_CATEGORY_HARASSMENT', threshold: 'BLOCK_MEDIUM_AND_ABOVE' },
      { category: 'HARM_CATEGORY_HATE_SPEECH', threshold: 'BLOCK_MEDIUM_AND_ABOVE' },
      { category: 'HARM_CATEGORY_SEXUALLY_EXPLICIT', threshold: 'BLOCK_MEDIUM_AND_ABOVE' },
      { category: 'HARM_CATEGORY_DANGEROUS_CONTENT', threshold: 'BLOCK_MEDIUM_AND_ABOVE' }
    ]
  };

  try {
    const geminiRes = await fetch(geminiUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(geminiPayload)
    });

    const geminiData = await geminiRes.json();

    if (!geminiRes.ok) {
      console.error('Gemini error:', geminiRes.status, JSON.stringify(geminiData));
      if (geminiRes.status === 429) {
        return res.status(429).json({ error: 'Too many requests. Please wait a moment and try again.' });
      }
      return res.status(502).json({ error: 'AI service error. Please try again.' });
    }

    // Extract text from Gemini response
    const rawText = geminiData?.candidates?.[0]?.content?.parts?.[0]?.text;
    if (!rawText) {
      console.error('Empty Gemini response:', JSON.stringify(geminiData));
      return res.status(502).json({ error: 'Empty response from AI. Please try again.' });
    }

    // Parse JSON from response
    let analysis;
    try {
      const cleaned = rawText
        .replace(/^```json\s*/i, '')
        .replace(/^```\s*/i, '')
        .replace(/\s*```$/i, '')
        .trim();
      analysis = JSON.parse(cleaned);
    } catch (e) {
      console.error('JSON parse failed. Raw:', rawText);
      return res.status(502).json({ error: 'AI returned unexpected format. Please try again.' });
    }

    // Ensure all required fields exist
    const defaults = {
      reflection: 'Thank you for sharing. Your feelings are valid.',
      detected_triggers: [],
      emotional_patterns: [],
      coping_strategy: 'Take 5 deep breaths: inhale for 4 counts, hold for 4, exhale for 6.',
      mindfulness_exercise: 'Close your eyes, take 3 slow breaths, and notice 3 things you can feel right now.',
      encouragement: 'You are doing your best in a challenging situation. Keep going.',
      concern_level: 'low'
    };

    for (const [key, val] of Object.entries(defaults)) {
      if (!analysis[key]) analysis[key] = val;
    }

    return res.status(200).json({ analysis });

  } catch (err) {
    console.error('Network error:', err.message);
    return res.status(503).json({ error: 'Could not reach AI service. Please check your connection.' });
  }
}
