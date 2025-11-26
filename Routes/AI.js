// Routes/aiRoute.js
// Replaces previous hard-coded route: uses DB for facts + GPT-4 for friendly phrasing.
// Requires: npm install openai axios dotenv
require('dotenv').config();

const express = require('express');
const pool = require('../SQL/conn.js'); // <-- your existing MySQL pool
const OpenAI = require('openai');
const router = express.Router();

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY
});
const MODEL = process.env.OPENAI_MODEL || 'gpt-4';

// ------------------------
// Domain restriction
// ------------------------
function isLibraryRelated(text) {
  if (!text) return false;
  const s = text.toLowerCase();
  const allowed = [
    'book','books','author','publisher','genre','borrow','return','reserve',
    'library','opac','nfc','wifi','wi-fi','e-book','ebook','periodical','magazine',
    'journal','special collection','orientation','tutorial','reading buddy',
    'computer','internet','e-resources','e-gov','egov','services','availability',
    'title','isbn'
  ];
  return allowed.some(k => s.includes(k));
}

// ------------------------
// Intent parsing (simple)
// ------------------------
function detectLanguage(text) {
  const filipinoHints = [' ang ', ' ng ', ' sa ', 'ni ', 'paano', 'ano', 'meron', 'kamusta', 'po'];
  return filipinoHints.some(h => text.toLowerCase().includes(h)) ? 'fil' : 'en';
}

// ------------------------
// Search DB (your existing logic adapted)
// ------------------------
async function searchBooks(conn, message, limit = 10) {
  const terms = message.toLowerCase().split(/\s+/).filter(t => t.length > 2);
  if (!terms.length) return [];

  // build like pattern from terms, but keep simple to avoid huge queries
  const q = `%${terms.join('%')}%`;
  const [rows] = await conn.query(
    `SELECT book_id, book_title, book_author, book_description, book_publisher, book_year_publish, book_view_count
     FROM book_table
     WHERE LOWER(book_title) LIKE ?
        OR LOWER(book_description) LIKE ?
        OR LOWER(book_author) LIKE ?
        OR LOWER(book_publisher) LIKE ?
     ORDER BY book_view_count DESC
     LIMIT ?`,
    [q, q, q, q, limit]
  );
  return rows;
}

// ------------------------
// Smart fallback: similar by keyword (for missing specific title)
// ------------------------
async function findSimilarByTitle(conn, title, limit = 5) {
  const words = title.toLowerCase().split(/\s+/).filter(w => w.length > 3);
  if (words.length === 0) return [];
  const keyword = `%${words[0]}%`;
  const [rows] = await conn.query(
    `SELECT book_id, book_title, book_author, book_description, book_publisher, book_year_publish
     FROM book_table
     WHERE LOWER(book_title) LIKE ? OR LOWER(book_description) LIKE ?
     ORDER BY book_view_count DESC
     LIMIT ?`,
    [keyword, keyword, limit]
  );
  return rows;
}

// ------------------------
// Services list (static)
// ------------------------
const SERVICES_LIST = [
  'Books',
  'Fiction',
  'Special Collection',
  'Library Orientation',
  'Periodicals',
  'Reading Buddy',
  'Tutorial(s)',
  'Use of Library Space',
  'Computer User',
  'Computer With Internet',
  'E-Books',
  'E-Gov User',
  'E-Resources',
  'Digital Literacy',
  'Wi-Fi User'
];

function servicesReply(lang = 'en') {
  if (lang === 'fil') {
    return `Narito ang mga serbisyong inaalok ng aming aklatan:\n\n${SERVICES_LIST.map(s => '• ' + s).join('\n')}`;
  }
  return `Here are the available library services:\n\n${SERVICES_LIST.map(s => '• ' + s).join('\n')}`;
}

// ------------------------
// GPT helper — send DB facts + instructions (no hallucination)
// ------------------------
async function askGPTForReply(userMessage, books, lang = 'en') {
  // Build a safe prompt: include explicit instruction to NOT invent titles.
  const booksListText = (books && books.length)
    ? books.map(b => `${b.book_title} — ${b.book_author}`).join('\n')
    : 'NO_BOOKS_FOUND';

  const systemPrompt = `
You are LATA — a polite, rule-following library assistant for the Manila City Library.
Rules:
- Only answer library-related queries. If the question is not about library services, books, availability, borrowing, or related topics, politely refuse.
- When you present book titles, use only the list of books provided in "BooksFound". Do NOT invent or hallucinate book titles or authors.
- If BooksFound is "NO_BOOKS_FOUND", do NOT invent books; instead suggest genres, authors, or how the patron can request acquisition.
- Keep replies concise (2-4 sentences), helpful, and friendly.
- Prefer to ask a single follow-up question when it helps (e.g. "Would you like me to reserve one?").
`;

  const userPrompt = `
User message:
"""${userMessage}"""

BooksFound:
${booksListText}

Respond in ${lang === 'fil' ? 'Filipino' : 'English'}.
Format: Plain text. If you list books, use bullet points and the exact titles from BooksFound.
`;

  try {
    // Use the Chat Completions API
    const response = await openai.chat.completions.create({
      model: MODEL,
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: userPrompt }
      ],
      temperature: 0.2,
      max_tokens: 400
    });

    // Different SDKs return slightly different shapes; handle common ones:
    const choice = response?.choices?.[0];
    if (!choice) return null;

    // If the SDK returns message object:
    if (choice.message && choice.message.content) {
      return choice.message.content.trim();
    }
    // Fallback: older shape
    if (choice.text) {
      return choice.text.trim();
    }
    return null;
  } catch (err) {
    console.error('OpenAI call failed:', err?.message || err);
    return null;
  }
}

// ------------------------
// /chat Endpoint — FULL FLOW
// ------------------------
router.post('/chat', async (req, res) => {
  const message = (req.body.message || '').trim();
  if (!message) return res.status(400).json({ error: 'message required' });

  // 1) domain restriction locally (quick guard)
  if (!isLibraryRelated(message)) {
    return res.json({ reply: "Sorry — I can only help with library-related questions (books, services, borrowing, etc.).", books: [] });
  }

  const lang = detectLanguage(message);

  let conn;
  try {
    conn = await pool.getConnection();

    // 2) service question detection: if user asks about services, respond immediately (no GPT)
    const svcKeywords = ['service', 'services', 'mga serbisyo', 'ano ang serbisyo', 'what services', 'do you offer'];
    if (svcKeywords.some(k => message.toLowerCase().includes(k))) {
      conn.release();
      return res.json({ reply: servicesReply(lang), books: [] });
    }

    // 3) Try to find books from DB (primary knowledge source)
    let books = await searchBooks(conn, message, 10);

    // 4) If nothing and user mentions a quoted title -> try similar
    if (books.length === 0) {
      const quoted = message.match(/["“”](.+?)["“”]/);
      if (quoted && quoted[1]) {
        const similar = await findSimilarByTitle(conn, quoted[1], 5);
        if (similar.length > 0) {
          conn.release();
          // Ask GPT to phrase it nicely while giving the similar list — but to be safe, we can format local reply (no GPT) or attempt GPT
          const safeReply = lang === 'fil'
            ? `Walang eksaktong kopya ng "${quoted[1]}" sa talaan namin. Baka magustuhan mo ang mga sumusunod:\n\n${similar.map(b => `• ${b.book_title} by ${b.book_author}`).join('\n')}`
            : `We currently don't have "${quoted[1]}" in our records. You might like these instead:\n\n${similar.map(b => `• ${b.book_title} by ${b.book_author}`).join('\n')}`;

          // Attempt to make it friendlier with GPT (optional)
          const gptText = await askGPTForReply(message, similar, lang);
          return res.json({ reply: gptText || safeReply, books: similar });
        }
      }
    }

    // 5) Now we have books (maybe empty). Ask GPT to compose the reply (but only if OpenAI key present)
    const localFallbackReply = (() => {
      if (books.length > 0) {
        return (lang === 'fil')
          ? `Narito ang mga librong may kaugnayan sa \"${message}\":\n\n${books.map(b => `• ${b.book_title} by ${b.book_author}`).join('\n')}`
          : `Here are some books related to "${message}":\n\n${books.map(b => `• ${b.book_title} by ${b.book_author}`).join('\n')}`;
      } else {
        return (lang === 'fil')
          ? `Paumanhin — walang eksaktong tumutugmang aklat sa aming talaan. Maaari kang mag-request ng acquisition o subukang maghanap ng ibang keyword.`
          : `Sorry — I couldn't find exact matches in our catalog. You can request acquisition or try different keywords.`;
      }
    })();

    // 6) If OPENAI_API_KEY is set, try to use GPT for a friendly phrasing; otherwise use local fallback
    let finalReply = localFallbackReply;
    if (process.env.OPENAI_API_KEY) {
      const gptText = await askGPTForReply(message, books, lang);
      if (gptText) finalReply = gptText;
    }

    conn.release();
    return res.json({ reply: finalReply, books });

  } catch (err) {
    if (conn) try { conn.release(); } catch {}
    console.error('AI /chat error:', err);
    return res.status(500).json({ error: 'Server error: ' + err.message });
  }
});

module.exports = router;
