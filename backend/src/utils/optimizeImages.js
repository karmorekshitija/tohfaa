const fs = require('fs');
const path = require('path');
const sharp = require('sharp');

async function processDirectory(dirPath) {
  if (!fs.existsSync(dirPath)) return;
  const entries = fs.readdirSync(dirPath, { withFileTypes: true });

  for (const entry of entries) {
    const fullPath = path.join(dirPath, entry.name);
    if (entry.isDirectory()) {
      await processDirectory(fullPath);
    } else if (entry.isFile()) {
      const ext = path.extname(entry.name).toLowerCase();
      if (['.jpg', '.jpeg', '.png', '.webp'].includes(ext) && !entry.name.includes('_thumb')) {
        try {
          const stats = fs.statSync(fullPath);
          const thumbPath = fullPath.replace(/(\.\w+)$/, '_thumb$1');

          // Generate thumbnail if missing or outdated
          if (!fs.existsSync(thumbPath)) {
            let pipeline = sharp(fullPath).resize(480, 480, { fit: 'inside', withoutEnlargement: true });
            if (ext === '.png') pipeline = pipeline.png({ quality: 75, compressionLevel: 8 });
            else if (ext === '.webp') pipeline = pipeline.webp({ quality: 75 });
            else pipeline = pipeline.jpeg({ quality: 75, progressive: true });
            await pipeline.toFile(thumbPath);
            console.log(`Generated thumbnail: ${thumbPath}`);
          }

          // Compress original image if size > 500KB
          if (stats.size > 500 * 1024) {
            const tempPath = fullPath + '_tmp';
            let pipeline = sharp(fullPath);
            if (ext === '.png') pipeline = pipeline.png({ quality: 80, compressionLevel: 8 });
            else if (ext === '.webp') pipeline = pipeline.webp({ quality: 80 });
            else pipeline = pipeline.jpeg({ quality: 80, progressive: true });

            await pipeline.toFile(tempPath);
            const tempStats = fs.statSync(tempPath);
            if (tempStats.size < stats.size) {
              fs.unlinkSync(fullPath);
              fs.renameSync(tempPath, fullPath);
              console.log(`Optimized ${entry.name}: reduced from ${(stats.size/1024).toFixed(1)}KB to ${(tempStats.size/1024).toFixed(1)}KB`);
            } else {
              fs.unlinkSync(tempPath);
            }
          }
        } catch (err) {
          console.error(`Error processing ${fullPath}:`, err.message);
        }
      }
    }
  }
}

async function run() {
  console.log('Starting image compression & thumbnail generation...');
  const uploadsDir = path.join(__dirname, '..', '..', 'uploads');
  const imgDir = path.join(__dirname, '..', '..', '..', 'frontend', 'public', 'img');

  await processDirectory(uploadsDir);
  await processDirectory(imgDir);
  console.log('Image optimization complete.');
}

if (require.main === module) {
  run();
}

module.exports = { run, processDirectory };
