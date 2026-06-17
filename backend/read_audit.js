const fs = require('fs');
const path = require('path');

const transcriptPath = 'C:\\Users\\ACER\\.gemini\\antigravity\\brain\\5c660e98-e4db-4679-95c9-f1faa289c914\\.system_generated\\logs\\transcript_full.jsonl';

const fileStream = fs.createReadStream(transcriptPath);
const readline = require('readline');

const rl = readline.createInterface({
  input: fileStream,
  crlfDelay: Infinity
});

rl.on('line', (line) => {
  try {
    const obj = JSON.parse(line);
    if (obj.source === 'MODEL' && obj.type === 'PLANNER_RESPONSE') {
      // Print first 100 chars of thinking and response to see what occurred
      console.log(`Step ${obj.step_index}:`);
      console.log('Thinking:', (obj.thinking || '').substring(0, 150));
      if (obj.content) {
        console.log('Content preview:', obj.content.substring(0, 200));
      }
      console.log('--------------------------------------');
    }
  } catch (err) {}
});
