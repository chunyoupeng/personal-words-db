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
  const _template = `Your task is to mimic the following interpretation style by giving explanations based on the given word. Only output the interpretation. 
  
  Word: Obstetrician 
  
  Interpretation: Obstetrician derives from Latin obstetrix, midwife, which in turn has its source in a Latin verb meaning to stand—midwives stand in front of the woman in labor to aid in the delivery of the infant. The suffix -ician, as in obstetrician, physician, musician, magician, electrician, etc., means expert. Obstetrics has only within the last 150 years become a respectable specialty. No further back than 1834, Professor William P. Dewees assumed the first chair of obstetrics at the University of Pennsylvania and had to brave considerable medical contempt and ridicule as a result—the delivery of children was then considered beneath the dignity of the medical profession. Adjective: obstetric or obstetrical.
  
  Word: {word} 
  
  Interpretation: `;
  try {
    console.log("Beging to get meaning of: " + input_word);
    const prompt = ChatPromptTemplate.fromMessages([
      ["human", _template],
    ]);
    const model = new ChatOllama({
      baseUrl: "http://localhost:11434",
      model: "mixtral"
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
      await pool.query('UPDATE words SET count = count + 1 WHERE word = $1', [word]);
    } else {
      // Insert new word with count 1
      let meaning = await getMeaning(word);
      await pool.query(
        'INSERT INTO words(word, count, meaning) VALUES($1, $2, $3)',
        [word, 5, meaning] // Assuming default count to be 1 for new words
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