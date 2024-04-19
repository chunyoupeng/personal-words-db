import { ChatOpenAI } from "@langchain/openai";
import { ChatPromptTemplate } from "@langchain/core/prompts";
import { ChatOllama } from "@langchain/community/chat_models/ollama";
import { StringOutputParser } from "@langchain/core/output_parsers";
import express from 'express';
import bodyParser from 'body-parser';
import pg from 'pg';
const { Pool } = pg;

const app = express();
app.use(bodyParser.json({ limit: '100mb' }));
app.use(bodyParser.urlencoded({ limit: '100mb', extended: true }));
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
  Your task is to mimic the following interpretation style by giving explanations of the  word and its related words like below based on the given word.Only output the interpretation, markdown format.

  Word: Pediatrician 

  Interpretation:

  **Pediatrician** is a combination of Greek *paidos*, child; *iatreia*, medical healing; and *-ician*, expert.

  **Pediatrics** (pee-dee-AT′-riks), is by etymology the medical healing of a child. Adjective: pediatric (pee-dee-AT′-rik). (The *ped-* you see in words like pedestal, pedal, and pedestrian is from the Latin *pedis*, foot, and despite the identical spelling in English has no relationship to Greek *paidos*.)
  
  **Pedagogy** (PED-Ə-gō′-jee), which combines *paidos* with *agogos*, leading, is, etymologically, the leading of children. And to what do you lead them? To learning, to development, to growth, to maturity. pedagogy, which by derivation means the leading of a child, refers actually to the principles and methods of teaching. Adjective: pedagogical (ped-Ə-GOJ′-Ə-kƏl).
  
  A **pedagogue** (PED′-Ə-gog) is versed in pedagogy. But pedagogue has an unhappy history. From its original, neutral meaning of teacher, it has deteriorated to the point where it refers, today, to a narrow-minded, strait-laced, old-fashioned, dogmatic teacher. It is a word of contempt and should be used with caution.
  
  Like pedagogue, **demagogue** (DEM′-Ə-gog) has also deteriorated in meaning. By derivation a leader (*agogos*) of the people (*demos*), a demagogue today is actually one who attempts, in essence, to mislead the people, a politician who foments discontent among the masses. Many “leaders” of the past and present, in countries around the world, have been accused of **demagoguery** (dem-Ə-GOG′-Ə-ree). Adjective: demagogic.
  
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
      // const model = new ChatOllama({
      //   baseUrl: "http://localhost:11434",
      //   model: "mixtral"
      // });
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
  const words = text.toLowerCase().match(/\b(\w+)\b/g);
  const unknownWords = [];

  for (const word of words) {
    const result = await pool.query('SELECT * FROM words WHERE word = $1', [word]);
    if (result.rows.length === 0) {
      let meaning = await getMeaning(word);
      unknownWords.push({ word, count: 1, meaning });
      await pool.query(
        'INSERT INTO words(word, count, meaning) VALUES($1, $2, $3) RETURNING *',
        [word, 1, meaning]
      );
    } else if (result.rows[0].count < 5) {
      await pool.query('UPDATE words SET count = count + 1 WHERE word = $1', [word]);
      unknownWords.push({ word, count: result.rows[0].count + 1, meaning: result.rows[0].meaning });
    }
  }

  res.json(unknownWords);
});

app.listen(port, () => {
  console.log(`Server listening on port ${port}`);
});
