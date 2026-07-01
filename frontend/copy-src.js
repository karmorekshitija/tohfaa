import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const srcDir = path.join(__dirname, 'src');
const destDir = path.join(__dirname, 'dist', 'src');

try {
  if (fs.existsSync(srcDir)) {
    fs.cpSync(srcDir, destDir, { recursive: true });
    console.log('Successfully copied src/ directory to dist/src/');
  } else {
    console.warn('src/ directory does not exist, skipping copy.');
  }
} catch (err) {
  console.error('Error copying src directory:', err);
}
