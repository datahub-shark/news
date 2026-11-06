import fs from 'node:fs';
import path from 'node:path';

const gDriveBase = 'G:\\My Drive\\Robot Ideas Articles';
if (!fs.existsSync(gDriveBase)) {
  console.log('Google Drive path not mounted');
  process.exit(0);
}

function copyFolderRecursive(srcDir, destDir) {
  if (!fs.existsSync(destDir)) fs.mkdirSync(destDir, { recursive: true });
  const entries = fs.readdirSync(srcDir, { withFileTypes: true });
  for (const entry of entries) {
    const srcPath = path.join(srcDir, entry.name);
    const destPath = path.join(destDir, entry.name);
    if (entry.isDirectory()) {
      copyFolderRecursive(srcPath, destPath);
    } else {
      // Copy or update if file doesn't exist or size differs
      if (!fs.existsSync(destPath) || fs.statSync(srcPath).size !== fs.statSync(destPath).size) {
        fs.copyFileSync(srcPath, destPath);
        console.log(`[SYNC FILE] ${path.relative(path.resolve('.'), srcPath)} -> ${entry.name}`);
      }
    }
  }
}

// 1. Sync published
const pubDir = path.resolve('published');
for (const d of fs.readdirSync(pubDir)) {
  copyFolderRecursive(path.join(pubDir, d), path.join(gDriveBase, d));
}

// 2. Sync drafts
const draftsDir = path.resolve('drafts');
for (const d of fs.readdirSync(draftsDir)) {
  copyFolderRecursive(path.join(draftsDir, d), path.join(gDriveBase, d));
}

console.log('Finished full sync to Google Drive.');
