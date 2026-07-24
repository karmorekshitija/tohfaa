const fs = require('fs');
const path = require('path');

const targetDirs = [
  path.join(__dirname, '..', '..', 'frontend')
];

// Regex to find: <li><a ...>Help Center</a></li> (allowing whitespace inside/around tags)
const helpCenterRegex = /\s*<li>\s*<a\b[^>]*>Help Center<\/a>\s*<\/li>/gi;

// Stats tracking
let processedFiles = 0;
let filesModified = 0;
const deadContactUsFiles = [];
const deadRefundsFiles = [];

function checkDeadLinks(content, filePath) {
  const relPath = path.relative(path.join(__dirname, '..', '..'), filePath);
  
  // Look for Contact Us with href="#"
  // Pattern: href="#" or href='#' with Contact Us inside the <a> tag
  const contactUsMatch = /<a\b[^>]*href=["']#["'][^>]*>\s*Contact Us\s*<\/a>/gi.test(content);
  if (contactUsMatch) {
    deadContactUsFiles.push(relPath);
  }

  // Look for Refunds & Disputes with href="#"
  // Handle both & and &amp;
  const refundsMatch = /<a\b[^>]*href=["']#["'][^>]*>\s*Refunds\s*(?:&|&amp;)\s*Disputes\s*<\/a>/gi.test(content);
  if (refundsMatch) {
    deadRefundsFiles.push(relPath);
  }
}

function processDirectory(dir) {
  const files = fs.readdirSync(dir);
  for (const file of files) {
    const filePath = path.join(dir, file);
    const stat = fs.statSync(filePath);
    
    if (stat.isDirectory()) {
      if (file !== 'node_modules' && file !== 'dist' && !file.startsWith('.')) {
        processDirectory(filePath);
      }
    } else if (file.endsWith('.html') || file.endsWith('.js')) {
      processedFiles++;
      let content = fs.readFileSync(filePath, 'utf8');
      
      checkDeadLinks(content, filePath);

      if (helpCenterRegex.test(content)) {
        // Remove Help Center
        const newContent = content.replace(helpCenterRegex, '');
        fs.writeFileSync(filePath, newContent, 'utf8');
        filesModified++;
        console.log(`Modified: ${path.relative(path.join(__dirname, '..', '..'), filePath)}`);
      }
    }
  }
}

for (const dir of targetDirs) {
  if (fs.existsSync(dir)) {
    processDirectory(dir);
  }
}

console.log("\n=== SUMMARY ===");
console.log(`Processed files: ${processedFiles}`);
console.log(`Modified files (Help Center removed): ${filesModified}`);
console.log(`\nDead "Contact Us" links (href="#") count: ${deadContactUsFiles.length}`);
console.log('Pages containing dead "Contact Us" links:');
console.log(JSON.stringify(deadContactUsFiles, null, 2));

console.log(`\nDead "Refunds & Disputes" links (href="#") count: ${deadRefundsFiles.length}`);
console.log('Pages containing dead "Refunds & Disputes" links:');
console.log(JSON.stringify(deadRefundsFiles, null, 2));
