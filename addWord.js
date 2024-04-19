// Import necessary modules
import { ChatOllama } from "@langchain/community/chat_models/ollama";
import { StringOutputParser } from "@langchain/core/output_parsers";
import { ChatPromptTemplate } from "@langchain/core/prompts";
import { readFile } from "fs/promises"; // Note the change here to use fs.promises
import pg from 'pg';
const { Pool } = pg;

const pool = new Pool({
  user: 'postgres',
  host: 'localhost',
  database: 'words_db',
  password: '119900',
  port: 5432,
});

async function getMeaning(input_word) {

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
    const model = new ChatOllama({
      baseUrl: "http://localhost:11434",
      model: "mixtral",
      num_predict:-1,
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
    return ''; // Ensure we always return a string, even in case of error
  }
}

async function insert(word) {
  try {
    let result = await pool.query('SELECT * FROM words WHERE word = $1', [word]);
    if (result.rows.length > 0) {
      // Word exists, increase the count
      // await pool.query('UPDATE words SET count = count + 1 WHERE word = $1', [word]);
    } else {
      // Insert new word with count 1
      let meaning = await getMeaning(word);
      await pool.query(
        'INSERT INTO words(word, count, meaning) VALUES($1, $2, $3)',
        [word, 1, meaning] // Assuming default count to be 1 for new words
      );
    }
  } catch (error) {
    console.error('Error handling word submission:', error);
  }
}

async function processWordsFromFile(filePath) {
  try {
    const data = await readFile(filePath, 'utf8');
    const words = data.split('\n');
    for (let word of words) {
      await insert(word.trim()); // Ensure whitespace is trimmed
    }
  } catch (err) {
    console.error('Error reading the file:', err);
  }
}

async function main() {
  const filePath = 'words.txt';
  await processWordsFromFile(filePath);
}

main();