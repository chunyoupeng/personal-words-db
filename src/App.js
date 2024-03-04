import React, { useState } from 'react';
import axios from 'axios';

function App() {
  const [word, setWord] = useState('');
  const [text, setText] = useState('');
  const [wordInfo, setWordInfo] = useState(null);
  const [unknownWords, setUnknownWords] = useState([]);

  const handleWordSubmit = async () => {
    try {
      const lowerCaseWord = word.toLowerCase();
      setWord(lowerCaseWord);
      console.log(lowerCaseWord)
      const response = await axios.post('/api/words', { word: lowerCaseWord });
      setWordInfo(response.data);
      setWord('');
    } catch (error) {
      console.error('Error fetching word info:', error);
    }
  };

  const handleTextSubmit = async () => {
    try {
      setWord(text.toLowerCase());
      const response = await axios.post('/api/text', { text });
      setUnknownWords(response.data);
      setText('');
    } catch (error) {
      console.error('Error processing text:', error);
    }
  };

  return (
    <div className="max-w-xl mx-auto p-4">
  <div className="mb-4">
    <input
      className="shadow appearance-none border rounded w-full py-2 px-3 text-gray-700 leading-tight focus:outline-none focus:shadow-outline"
      value={word}
      onChange={(e) => setWord(e.target.value)}
      placeholder="Enter a word"
    />
    <button
      className="mt-2 bg-blue-500 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded focus:outline-none focus:shadow-outline"
      onClick={handleWordSubmit}
    >
      Submit Word
    </button>
  </div>
  {wordInfo && (
    <div className="p-4 mb-4 bg-white rounded shadow-lg">
      <p className="font-semibold text-xl mb-2">Word: {wordInfo.word}</p>
      <p className="text-gray-700 text-base mb-2">Meaning: {wordInfo.meaning}</p>
      <p className="text-gray-600 text-sm">Count: {wordInfo.count}</p>
    </div>
  )}
  <div className="mb-4">
    <textarea
      className="shadow appearance-none border rounded w-full py-2 px-3 text-gray-700 leading-tight focus:outline-none focus:shadow-outline"
      value={text}
      onChange={(e) => setText(e.target.value)}
      placeholder="Paste your text"
    />
    <button
      className="mt-2 bg-green-500 hover:bg-green-700 text-white font-bold py-2 px-4 rounded focus:outline-none focus:shadow-outline"
      onClick={handleTextSubmit}
    >
      Analyze Text
    </button>
  </div>
  {unknownWords.length > 0 && (
    <ul className="list-disc pl-5">
      {unknownWords.map((info, index) => (
        <li key={index} className="mb-2">
          <span className="font-semibold">{info.word}</span>
          <span> - Count: {info.count}, Meaning: {info.meaning}</span>
        </li>
      ))}
    </ul>
  )}
</div>

  );
}

export default App;