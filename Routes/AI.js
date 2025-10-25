// ============================
// AI Library Chat Module (Smart Book Recommender + Service Awareness)
// ============================

const express = require('express');
const pool = require('../SQL/conn.js'); // Database connection
const router = express.Router();

// ------------------------
// INTENT PARSER
// ------------------------
function parseIntent(message) {
  const text = String(message || '').toLowerCase();

  const sortPopular = /\b(popular|top|trending|best|most\s+viewed|sikat|pinaka(?:popular|sikat)|pinakamarami|trending)\b/.test(text);

  const yearAfter = (() => {
    const m = text.match(/\b(?:after|since|from|pagkatapos\s+ng|mula|simula)\s+(19|20)\d{2}\b/);
    return m ? Number(m[0].match(/(19|20)\d{2}/)[0]) : null;
  })();

  const yearBefore = (() => {
    const m = text.match(/\b(?:before|until|prior\s+to|bago\s+ang)\s+(19|20)\d{2}\b/);
    return m ? Number(m[0].match(/(19|20)\d{2}/)[0]) : null;
  })();

  const author = (() => {
    const by = text.match(/\bby\s+([a-z][a-z .'-]+)\b/i);
    const ni = text.match(/\b(?:ni|akda\s+ni)\s+([a-z][a-z .'-]+)\b/i);
    return (by?.[1] || ni?.[1] || '').trim();
  })();

  const synonyms = {
    horror: ['horror','nakakatakot','thriller','katatakutan'],
    romance: ['romance','romantic','pag-ibig','romansa','love','kilig'],
    fantasy: ['fantasy','pantasiya','magic','wizard','dragon','epic'],
    mystery: ['mystery','misteryo','detective','krimen','crime'],
    science: ['science','sci-fi','agham','technology','ai','robot'],
    historical: ['historical','kasaysayan','history'],
    adventure: ['adventure','pakikipagsapalaran','journey','quest'],
    biography: ['biography','talambuhay','memoir'],
    selfhelp: ['self-help','self help','productivity','habits']
  };

  const terms = new Set();
  for (const [genre, list] of Object.entries(synonyms)) {
    if (list.some(w => text.includes(w))) list.forEach(w => terms.add(genre));
  }

  text.split(/\s+/).forEach(w => {
    const clean = w.replace(/[^a-z0-9-ñáéíóúü]/g, '').trim();
    if (clean.length > 2) terms.add(clean);
  });

  const filipinoHints = [' ang ', ' ng ', ' sa ', ' ni ', ' ito ', ' iyon ', ' ako ', ' mo ', ' mga '];
  const likelyFilipino = filipinoHints.some(h => text.includes(h.trim()));
  const lang = likelyFilipino ? 'fil' : 'en';

  return { author, yearAfter, yearBefore, sortPopular, terms: Array.from(terms), lang };
}

// ------------------------
// DATABASE SEARCH
// ------------------------
async function searchBooks(conn, intent, limit = 10) {
  const { author, yearAfter, yearBefore, sortPopular, terms } = intent;
  const whereParts = [];
  const params = [];

  if (terms.length > 0) {
    const like = `%${terms.join('%')}%`;
    whereParts.push(`
      (LOWER(book_title) LIKE ? OR
       LOWER(book_description) LIKE ? OR
       LOWER(book_author) LIKE ? OR
       LOWER(book_publisher) LIKE ?)
    `);
    params.push(like, like, like, like);
  }

  if (author) {
    whereParts.push(`LOWER(book_author) LIKE ?`);
    params.push(`%${author.toLowerCase()}%`);
  }

  if (yearAfter) {
    whereParts.push(`book_year_publish >= ?`);
    params.push(yearAfter);
  }

  if (yearBefore) {
    whereParts.push(`book_year_publish <= ?`);
    params.push(yearBefore);
  }

  const whereSql = whereParts.length ? `WHERE ${whereParts.join(' AND ')}` : '';
  const orderSql = sortPopular ? `ORDER BY book_view_count DESC, book_title ASC` : `ORDER BY book_title ASC`;

  const [rows] = await conn.query(`
    SELECT book_id, book_title, book_author, book_description, book_publisher, book_year_publish, book_view_count
    FROM book_table
    ${whereSql}
    ${orderSql}
    LIMIT ?`, [...params, limit]);

  return rows;
}

// ------------------------
// SMART RECOMMENDATION (Fallback)
// ------------------------
async function smartRecommendation(conn, limit = 5) {
  const [rows] = await conn.query(`
    SELECT book_id, book_title, book_author, book_description, book_publisher, book_year_publish
    FROM book_table
    ORDER BY book_view_count DESC
    LIMIT ?`, [limit]);
  return rows;
}

// ------------------------
// FIND SIMILAR BOOKS
// ------------------------
async function findSimilarBooks(conn, keyword, limit = 5) {
  const like = `%${keyword}%`;
  const [rows] = await conn.query(`
    SELECT book_id, book_title, book_author, book_description, book_publisher, book_year_publish
    FROM book_table
    WHERE LOWER(book_title) LIKE ? OR LOWER(book_description) LIKE ?
    ORDER BY book_view_count DESC
    LIMIT ?`, [like, like, limit]);
  return rows;
}

// ------------------------
// LIBRARY SERVICE REPLIES
// ------------------------
function checkForServices(message, lang = 'en') {
  const text = message.toLowerCase();
  const serviceKeywords = ['service', 'services', 'library service', 'anong serbisyo', 'mga serbisyo'];
  if (!serviceKeywords.some(k => text.includes(k))) return null;

  const services = [
    '📚 Books',
    '📖 Fiction',
    '🕮 Special Collection',
    '🎓 Library Orientation',
    '📰 Periodicals',
    '🤝 Reading Buddy',
    '💡 Tutorial(s)',
    '🏛️ Use of Library Space',
    '💻 Computer User',
    '🌐 Computer With Internet',
    '📘 E-Books',
    '🏛️ E-Gov User',
    '📚 E-Resources',
    '📶 Digital Literacy',
    '📡 Wi-Fi User'
  ];

  if (lang === 'fil') {
    return `Narito ang mga serbisyo na inaalok ng aming aklatan:\n\n${services.join('\n')}`;
  }
  return `Here are the available library services:\n\n${services.join('\n')}`;
}

// ------------------------
// GREETING & BEHAVIOR
// ------------------------
function checkForGreeting(message, lang = 'en') {
  const greetings = ['hi', 'hello', 'good morning', 'good afternoon', 'good evening', 'hey'];
  const lower = message.toLowerCase();
  if (greetings.some(g => lower.includes(g))) {
    return lang === 'fil'
      ? 'Magandang araw! Ako ang iyong Library Assistant. Maaari mo akong tanungin tungkol sa mga libro o serbisyo ng aklatan.'
      : '👋 Hi there! I\'m your Library Assistant at the Manila City Library. You can ask me about books, library services, or get reading recommendations.';
  }
  return null;
}

// ------------------------
// REPLY BUILDERS
// ------------------------
function buildReply(message, books, lang = 'en') {
  const intro = lang === 'fil'
    ? `Narito ang ilang libro na maaari mong magustuhan batay sa "${message}":`
    : `Here are some books you might enjoy based on "${message}":`;

  const list = books.map(
    b => ` **${b.book_title}** by *${b.book_author}* (${b.book_publisher || 'N/A'}, ${b.book_year_publish || '—'})`
  );

  return `${intro}\n\n${list.join('\n')}`;
}

function noResultsReply(message, lang = 'en') {
  if (lang === 'fil')
    return `Walang eksaktong tugma para sa "${message}". Subukang baguhin ang iyong query.`;
  return `I couldn't find exact matches for "${message}". Try rephrasing your question.`;
}

// ------------------------
// /chat ENDPOINT
// ------------------------
router.post('/chat', async (req, res) => {
  const { message } = req.body;
  if (!message) return res.status(400).json({ error: 'Message required' });

  let conn;
  try {
    conn = await pool.getConnection();
    const intent = parseIntent(message);

    // ✅ Library Service Detection (run first)
    const serviceReply = checkForServices(message, intent.lang);
    if (serviceReply) {
      conn.release();
      return res.json({ reply: serviceReply, books: [] });
    }

    // 👋 Greeting Detection (run second)
    const greetingReply = checkForGreeting(message, intent.lang);
    if (greetingReply) {
      conn.release();
      return res.json({ reply: greetingReply, books: [] });
    }

    // 📚 Book Search
    let books = await searchBooks(conn, intent, 10);

    // 🔍 If no results, try similar books
    if (books.length === 0 && intent.terms.length > 0) {
      const similarBooks = await findSimilarBooks(conn, intent.terms[0], 5);
      if (similarBooks.length > 0) {
        const similarReply = intent.lang === 'fil'
          ? `Walang eksaktong tugma, ngunit maaaring magustuhan mo ang mga librong ito na may parehong tema:`
          : `No exact matches found, but you might enjoy these similar books:`;
        conn.release();
        return res.json({ reply: `${similarReply}\n\n${buildReply(message, similarBooks, intent.lang)}`, books: similarBooks });
      }
    }

    // 🧠 Fallback: recommend popular books
    if (books.length === 0) {
      books = await smartRecommendation(conn, 5);
    }

    conn.release();
    const reply = books.length
      ? buildReply(message, books, intent.lang)
      : noResultsReply(message, intent.lang);

    return res.json({ reply, books });
  } catch (err) {
    if (conn) conn.release();
    console.error('AI /chat error:', err);
    return res.status(500).json({ error: 'Server error: ' + err.message });
  }
});

module.exports = router;
