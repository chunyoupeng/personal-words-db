const express = require('express');
const bodyParser = require('body-parser');
const { Pool } = require('pg');

const app = express();
const port = process.env.PORT || 3001;

const pool = new Pool({
  user: 'postgres',
  host: 'localhost',
  database: 'words_db',
  password: '119900',
  port: 5432,
});

app.use(bodyParser.json());

// Endpoint to handle word submissions
app.post('/api/words', async (req, res) => {
  const { word } = req.body;
  try {
    let result = await pool.query('SELECT * FROM words WHERE word = $1', [word]);
    if (result.rows.length > 0) {
      // Word exists, increase the count
      const updateResult = await pool.query('UPDATE words SET count = count + 1 WHERE word = $1 RETURNING *', [word]);
      res.json(updateResult.rows[0]);
    } else {
      // Insert new word with count 1
      const insertResult = await pool.query(
        'INSERT INTO words(word, count, meaning) VALUES($1, $2, $3) RETURNING *',
        [word, 1, word + ' meaning is']
      );
      res.json(insertResult.rows[0]);
      console.log(res);
    }
  } catch (error) {
    console.error('Error handling word submission:', error);
    res.sendStatus(500);
  }
});

// Endpoint to analyze text
app.post('/api/text', async (req, res) => {
  const { text } = req.body;
  const words = text.split(/\s+/);
  const unknownWords = [];

  for (const word of words) {
    const result = await pool.query('SELECT * FROM words WHERE word = $1', [word]);
    if (result.rows.length === 0) {
      unknownWords.push({ word, count: 1, meaning: word + ' meaning is' });
    }
  }

  res.json(unknownWords);
});

app.listen(port, () => {
  console.log(`Server listening on port ${port}`);
});