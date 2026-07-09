const fs = require('fs');
const path = require('path');

const frontendDir = path.join(__dirname, '..', '..', 'frontend');

function walk(dir) {
  let results = [];
  const list = fs.readdirSync(dir);
  list.forEach(file => {
    const fullPath = path.join(dir, file);
    const stat = fs.statSync(fullPath);
    if (stat && stat.isDirectory()) {
      if (file !== 'node_modules' && file !== '.git') {
        results = results.concat(walk(fullPath));
      }
    } else if (file.endsWith('.html')) {
      results.push(fullPath);
    }
  });
  return results;
}

function fixFile(filePath) {
  const content = fs.readFileSync(filePath, 'utf8');
  
  // Regex to look for transform: rotate(180deg) !important; followed directly by whitespace and </style>
  // without the closing brace }
  const regex = /(transform:\s*rotate\(180deg\)\s*!important;)(\r?\n\s*<\/style>)/g;
  
  if (regex.test(content)) {
    const fixedContent = content.replace(regex, (match, p1, p2) => {
      // Find indentation of </style> to format the closing brace nicely
      const matchIndent = p2.match(/\r?\n(\s*)/);
      const indent = matchIndent ? matchIndent[1] : '  ';
      return `${p1}\n${indent}  }\n${indent}</style>`;
    });
    fs.writeFileSync(filePath, fixedContent, 'utf8');
    console.log(`Fixed: ${filePath}`);
    return true;
  }
  return false;
}

function main() {
  console.log(`Scanning HTML files in: ${frontendDir}`);
  const htmlFiles = walk(frontendDir);
  console.log(`Found ${htmlFiles.length} HTML files.`);
  
  let fixedCount = 0;
  htmlFiles.forEach(file => {
    if (fixFile(file)) {
      fixedCount++;
    }
  });
  console.log(`Done. Fixed ${fixedCount} files.`);
}

main();
