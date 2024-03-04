import { ChatOpenAI } from "@langchain/openai";
import { ChatPromptTemplate } from "@langchain/core/prompts";
import { StringOutputParser } from "@langchain/core/output_parsers";
import express from 'express';
import bodyParser from 'body-parser';
import pg from 'pg';
const { Pool } = pg;

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
      let meaning = await getMeaning(word);
      const insertResult = await pool.query(
        'INSERT INTO words(word, count, meaning) VALUES($1, $2, $3) RETURNING *',
        [word, 1, meaning]
      );
      res.json(insertResult.rows[0]);
      console.log(meaning);
    }
  } catch (error) {
    console.error('Error handling word submission:', error);
    res.sendStatus(500);
  }
});


async function getMeaning(input_word){

    const _template = `
    Your task is to mimic the following interpretation style by giving explanations based on the given word.Only output the interpretation.

    Word: Obstetrician 

    Interpretation: 
    Obstetrician derives from Latin obstetrix, midwife, which in turn has its
    source in a Latin verb meaning to stand—midwives stand in front of the
    woman in labor to aid in the delivery of the infant. 
    The suffix -ician, as in obstetrician, physician, musician, magician,
    electrician, etc., means expert. 
    Obstetrics has only within the last 150 years become a
    respectable specialty. No further back than 1834, Professor William P.
    Dewees assumed the first chair of obstetrics at the University of
    Pennsylvania and had to brave considerable medical contempt and
    ridicule as a result—the delivery of children was then considered beneath
    the dignity of the medical profession. 
    Adjective: obstetric or obstetrical 

    Word: {word}

    Interpretation:
    `;
    try {

    console.log("Beging to get meaning of: " + input_word);
    const prompt = ChatPromptTemplate.fromMessages([
        ["human", _template],
      ]);
      const model = new ChatOpenAI({
        openAIApiKey: "sk-zmfy7bJcsifeLNhaB0215d03FbE14e1cB102Df492d4231D8",
        modelName: "gpt-4-1106-preview",
        configuration: {
          baseURL: "https://aiapi.xing-yun.cn/v1/",
        }
      });
      const outputParser = new StringOutputParser();
      
      const chain = prompt.pipe(model).pipe(outputParser);
      
      const response = await chain.invoke({
        word: input_word,
      });
      console.log(response);
      return response;
    } catch (error) {
      console.error('Error getting meaning:', error);
    }
}
// Endpoint to analyze text
app.post('/api/text', async (req, res) => {
  const { text } = req.body;
  const words = text.split(/\s+/);
  const unknownWords = [];

  for (const word of words) {
    const result = await pool.query('SELECT * FROM words WHERE word = $1', [word]);
    if (result.rows.length === 0) {
      let meaning = await getMeaning(word);
      unknownWords.push({ word, count: 1, meaning });
    }
  }

  res.json(unknownWords);
});

app.listen(port, () => {
  console.log(`Server listening on port ${port}`);
});