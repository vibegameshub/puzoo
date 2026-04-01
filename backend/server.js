require('dotenv').config();
const express = require('express');
const cors = require('cors');
const { Pool } = require('pg');

const app = express();
const PORT = process.env.PORT || 3000;

// CORS
const allowedOrigins = process.env.ALLOWED_ORIGIN
  ? process.env.ALLOWED_ORIGIN.split(',').map(s => s.trim())
  : ['http://localhost:5500', 'http://127.0.0.1:5500'];

app.use(cors({
  origin: (origin, callback) => {
    if (!origin || allowedOrigins.includes(origin)) {
      callback(null, true);
    } else {
      callback(null, true); // 개발 편의상 모두 허용, 프로덕션에서는 제한
    }
  }
}));

app.use(express.json());

// PostgreSQL
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: process.env.DATABASE_URL && process.env.DATABASE_URL.includes('neon')
    ? { rejectUnauthorized: false }
    : false
});

// 테이블 생성
async function initDB() {
  try {
    await pool.query(`
      CREATE TABLE IF NOT EXISTS scores (
        id SERIAL PRIMARY KEY,
        nickname VARCHAR(20) NOT NULL,
        score INTEGER NOT NULL,
        level INTEGER NOT NULL,
        lines INTEGER NOT NULL,
        difficulty VARCHAR(10) NOT NULL,
        created_at TIMESTAMP DEFAULT NOW()
      )
    `);
    console.log('Database initialized');
  } catch (err) {
    console.error('DB init error:', err.message);
  }
}

// 헬스체크
app.get('/health', (req, res) => {
  res.json({ status: 'ok' });
});

// 점수 등록 (upsert - 동일 닉네임은 최고 점수만)
app.post('/api/scores', async (req, res) => {
  try {
    const { nickname, score, level, lines, difficulty } = req.body;

    if (!nickname || score == null || !level || lines == null || !difficulty) {
      return res.status(400).json({ error: 'Missing required fields' });
    }

    const sanitizedNickname = String(nickname).slice(0, 20).trim();
    if (!sanitizedNickname) {
      return res.status(400).json({ error: 'Invalid nickname' });
    }

    // 기존 기록 확인
    const existing = await pool.query(
      'SELECT id, score FROM scores WHERE nickname = $1 ORDER BY score DESC LIMIT 1',
      [sanitizedNickname]
    );

    if (existing.rows.length > 0 && existing.rows[0].score >= score) {
      return res.json({ message: 'Existing high score is higher', score: existing.rows[0].score });
    }

    if (existing.rows.length > 0) {
      // 업데이트
      await pool.query(
        'UPDATE scores SET score = $1, level = $2, lines = $3, difficulty = $4, created_at = NOW() WHERE id = $5',
        [score, level, lines, difficulty, existing.rows[0].id]
      );
    } else {
      // 새 레코드
      await pool.query(
        'INSERT INTO scores (nickname, score, level, lines, difficulty) VALUES ($1, $2, $3, $4, $5)',
        [sanitizedNickname, score, level, lines, difficulty]
      );
    }

    res.json({ message: 'Score saved', score });
  } catch (err) {
    console.error('Score save error:', err.message);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// 점수 조회
app.get('/api/scores', async (req, res) => {
  try {
    const { type = 'global', limit = 10 } = req.query;
    const safeLimit = Math.min(Math.max(parseInt(limit) || 10, 1), 100);

    let query;
    if (type === 'daily') {
      query = `
        SELECT nickname, score, level, lines, difficulty, created_at
        FROM scores
        WHERE created_at >= CURRENT_DATE
        ORDER BY score DESC
        LIMIT $1
      `;
    } else {
      query = `
        SELECT nickname, score, level, lines, difficulty, created_at
        FROM scores
        ORDER BY score DESC
        LIMIT $1
      `;
    }

    const result = await pool.query(query, [safeLimit]);
    res.json(result.rows);
  } catch (err) {
    console.error('Score fetch error:', err.message);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// 서버 시작
initDB().then(() => {
  app.listen(PORT, () => {
    console.log(`Animal Tetris server running on port ${PORT}`);
  });
});
