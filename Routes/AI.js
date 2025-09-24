const express = require('express');
const pool = require('../SQL/conn.js'); // reuse your existing MySQL pool
const router = express.Router();

/* =========================
   Intent parsing (EN + FIL)
   ========================= */
function parseIntent(message) {
  const text = String(message || '').toLowerCase();

  // popularity keywords (en + fil)
  const sortPopular = /\b(popular|top|trending|best|most\s+viewed|sikat|pinaka(?:popular|sikat)|pinakamarami|trending)\b/.test(text);

  // year filters (en + fil)
  const yearAfter = (() => {
    const m = text.match(/\b(?:after|since|from|pagkatapos\s+ng|mula|simula)\s+(19|20)\d{2}\b/);
    return m ? Number(m[0].match(/(19|20)\d{2}/)[0]) : null;
  })();
  const yearBefore = (() => {
    const m = text.match(/\b(?:before|until|prior\s+to|bago\s+ang)\s+(19|20)\d{2}\b/);
    return m ? Number(m[0].match(/(19|20)\d{2}/)[0]) : null;
  })();

  // author (en + fil)
  const author = (() => {
    const by = text.match(/\bby\s+([a-z][a-z .'-]+)\b/i);
    const ni = text.match(/\b(?:ni|akda\s+ni)\s+([a-z][a-z .'-]+)\b/i);
    return (by?.[1] || ni?.[1] || '').trim();
  })();

  // genre/semantic hints (en + fil)
  const synonyms = {
    horror: ['horror','nakakatakot','takot','thriller','katatakutan'],
    romance: ['romance','romantic','pag-ibig','pag ibig','romansa','nakakakilig','love'],
    fantasy: ['fantasy','pantasiya','magic','mahika','wizard','dragon','epic'],
    mystery: ['mystery','hiwaga','misteryo','detective','detektib','krimen','crime','whodunit'],
    science: ['science','sci-fi','sci fi','agham','siyensiya','space','teknolohiya','technology','ai','robot'],
    historical: ['historical','kasaysayan','history'],
    adventure: ['adventure','pakikipagsapalaran','paglalakbay','journey','quest'],
    biography: ['biography','talambuhay','memoir'],
    selfhelp: ['self-help','self help','tulong-sarili','tulong sarili','productivity','gawi','habits']
  };

  const terms = new Set();
  for (const list of Object.values(synonyms)) {
    if (list.some(w => text.includes(w))) list.forEach(w => terms.add(w));
  }
  text.split(/\s+/).forEach(w => {
    const t = w.replace(/[^a-z0-9-ñáéíóúü]/g, '').trim();
    if (t.length > 2) terms.add(t);
  });

  // crude Filipino detection to pick reply language
  const filipinoHints = [' ang ',' ng ',' sa ',' ni ',' ako ',' ikaw ',' ito ',' iyon ',' pag-ibig ',' mahika ',' pantasiya ',' hiwaga ',' pakikipagsapalaran ',' sikat ',' trending ',' talambuhay ',' tulong-sarili '];
  const likelyFilipino = filipinoHints.some(h => text.includes(h.trim()));

  return {
    author: author || null,
    yearAfter,
    yearBefore,
    sortPopular,
    terms: Array.from(terms),
    lang: likelyFilipino ? 'fil' : 'en'
  };
}

/* =========================
   SQL builders
   ========================= */
function buildLikeClauses(terms, fieldPrefix = 'b') {
  const clauses = [];
  const params = [];
  for (const t of terms) {
    const like = `%${t}%`;
    clauses.push(`LOWER(${fieldPrefix}.book_title) LIKE ?`);       params.push(like);
    clauses.push(`LOWER(${fieldPrefix}.book_description) LIKE ?`); params.push(like);
    clauses.push(`LOWER(${fieldPrefix}.book_author) LIKE ?`);      params.push(like);
    clauses.push(`LOWER(${fieldPrefix}.book_publisher) LIKE ?`);   params.push(like);
  }
  return { clauses, params };
}

/* =========================
   Search core (FULLTEXT + fallback)
   ========================= */
async function searchBooks(conn, intent, limit = 10) {
  const { author, yearAfter, yearBefore, sortPopular, terms } = intent;

  // Detect FULLTEXT index
  let useFulltext = false;
  try {
    const [idx] = await conn.query(`SHOW INDEX FROM book_table WHERE Key_name = 'ft_books'`);
    useFulltext = Array.isArray(idx) && idx.length > 0;
  } catch {}

  const whereParts = [];
  const params = [];

  if (useFulltext && terms.length > 0) {
    whereParts.push(`MATCH (b.book_title, b.book_description, b.book_author, b.book_publisher)
                     AGAINST (? IN NATURAL LANGUAGE MODE)`);
    params.push(terms.join(' '));
  } else if (terms.length > 0) {
    const { clauses, params: likeParams } = buildLikeClauses(terms, 'b');
    whereParts.push(`(${clauses.join(' OR ')})`);
    params.push(...likeParams);
  }

  if (author) {
    whereParts.push(`LOWER(b.book_author) LIKE ?`);
    params.push(`%${author.toLowerCase()}%`);
  }
  if (yearAfter) {
    whereParts.push(`b.book_year_publish >= ?`);
    params.push(yearAfter);
  }
  if (yearBefore) {
    whereParts.push(`b.book_year_publish <= ?`);
    params.push(yearBefore);
  }

  const whereSql = whereParts.length ? `WHERE ${whereParts.join(' AND ')}` : '';
  const orderSql = useFulltext
    ? (sortPopular
        ? `ORDER BY MATCH (b.book_title, b.book_description, b.book_author, b.book_publisher)
                 AGAINST (? IN NATURAL LANGUAGE MODE) DESC,
                 b.book_view_count DESC, b.book_title ASC`
        : `ORDER BY MATCH (b.book_title, b.book_description, b.book_author, b.book_publisher)
                 AGAINST (? IN NATURAL LANGUAGE MODE) DESC, b.book_title ASC`)
    : (sortPopular
        ? `ORDER BY b.book_view_count DESC, b.book_title ASC`
        : `ORDER BY b.book_title ASC`);

  if (useFulltext) params.push(terms.join(' '));

  const sql = `
    SELECT DISTINCT
      b.book_id,
      b.book_title,
      b.book_author,
      b.book_description,
      b.book_publisher,
      b.book_year_publish,
      b.book_status,
      b.book_inventory,
      b.book_view_count
    FROM book_table b
    ${whereSql}
    ${orderSql}
    LIMIT ?
  `;
  params.push(limit);

  const [rows] = await conn.query(sql, params);
  return rows;
}

/* =========================
   Related Search (Fallback)
   ========================= */
async function relatedSearch(conn, intent, limit = 5) {
  const { terms } = intent;

  // If no terms, fallback to top viewed
  if (!terms.length) {
    const [rows] = await conn.query(`
      SELECT book_id, book_title, book_author, book_description, book_publisher, 
             book_year_publish, book_view_count
      FROM book_table
      ORDER BY book_view_count DESC
      LIMIT ?
    `, [limit]);
    return rows;
  }

  // Try with just the first keyword for a broader match
  const keyword = `%${terms[0]}%`;
  const [rows] = await conn.query(`
    SELECT book_id, book_title, book_author, book_description, book_publisher, 
           book_year_publish, book_view_count
    FROM book_table
    WHERE LOWER(book_title) LIKE ? 
       OR LOWER(book_description) LIKE ?
       OR LOWER(book_author) LIKE ?
       OR LOWER(book_publisher) LIKE ?
    ORDER BY book_view_count DESC
    LIMIT ?
  `, [keyword, keyword, keyword, keyword, limit]);

  return rows;
}

/* =========================
   Reply builders (EN + FIL)
   ========================= */
function formatReply(message, books, lang = 'en') {
  const lines = books.map(
    b => `📖 ${b.book_title} by ${b.book_author} (${b.book_publisher || 'Publisher N/A'}, ${b.book_year_publish || '—'})`
  );
  if (lang === 'fil') {
    return `Narito ang ilang rekomendasyon batay sa “${message}”:\n\n` + lines.join('\n');
  }
  return `Here are some recommendations based on “${message}”:\n\n` + lines.join('\n');
}
function noResultsReply(message, lang = 'en') {
  if (lang === 'fil') {
    return `Walang nahanap para sa “${message}”. Subukang magdagdag ng awtor (hal., “ni Sarah Lee”) o taon (hal., “pagkatapos ng 2015”).`;
  }
  return `I couldn't find matches for “${message}”. Try adding an author (e.g., “by Sarah Lee”) or a year (e.g., “after 2015”).`;
}

/* =========================
   Endpoint
   ========================= */
router.post('/chat', async (req, res) => {
  const { message } = req.body;
  if (!message) return res.status(400).json({ error: 'message required' });

  // ===== Custom message feature =====
  const specialInputs = {
    "nongni": "Ezra Lantin",
    "johan malibog": "Omsim. Ito ang aking recommendation para kay Johan Malibog:",
    "jm": "Asim Datu Puti Yakee"
  };
  const lowerMessage = message.trim().toLowerCase();
  if (specialInputs[lowerMessage]) {
    return res.json({ reply: specialInputs[lowerMessage], books: [] });
  }

  let conn;
  try {
    conn = await pool.getConnection();

    const intent = parseIntent(message);
    let books = await searchBooks(conn, intent, 10);

    // 🔹 If no exact matches, try related search
    if (books.length === 0) {
      books = await relatedSearch(conn, intent, 5);
    }

    conn.release();

    const reply = books.length
      ? formatReply(message, books, intent.lang)
      : noResultsReply(message, intent.lang);

    return res.json({ reply, books });
  } catch (err) {
    if (conn) try { conn.release(); } catch {}
    console.error('AI /chat error:', err);
    return res.status(500).json({ error: 'Server error: ' + err.message });
  }
});

module.exports = router;
