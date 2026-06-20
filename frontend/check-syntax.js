import fs from 'fs';
import path from 'path';
import { execFileSync } from 'child_process';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const projectRoot = __dirname;

function walk(dir, callback) {
  const files = fs.readdirSync(dir);
  for (const file of files) {
    const fullPath = path.join(dir, file);
    const stat = fs.statSync(fullPath);
    if (stat.isDirectory()) {
      if (file !== 'node_modules' && file !== 'dist' && file !== '.git') {
        walk(fullPath, callback);
      }
    } else if (file.endsWith('.js') && file !== 'check-syntax.js') {
      callback(fullPath);
    }
  }
}

let hasError = false;
let fileCount = 0;

console.log('Starting syntax check for JavaScript files...');

walk(projectRoot, (filePath) => {
  fileCount++;
  const relativePath = path.relative(projectRoot, filePath);
  try {
    execFileSync('node', ['-c', filePath], { stdio: 'pipe' });
  } catch (err) {
    hasError = true;
    console.error(`\x1b[31mSyntax error in file: ${relativePath}\x1b[0m`);
    if (err.stderr) {
      console.error(err.stderr.toString().trim());
    } else {
      console.error(err.message);
    }
  }
});

if (hasError) {
  console.error('\x1b[31mSyntax check failed! Aborting build.\x1b[0m');
  process.exit(1);
} else {
  console.log(`\x1b[32mSuccessfully checked ${fileCount} JavaScript files. All clean!\x1b[0m`);
  process.exit(0);
}
