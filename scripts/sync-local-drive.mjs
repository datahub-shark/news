import fs from 'node:fs';
import path from 'node:path';

const gDriveBase = 'G:\\My Drive\\Robot Ideas Articles';
if (!fs.existsSync(gDriveBase)) {
  console.log('Google Drive path not mounted');
  process.exit(0);
}

// 1. Copy published
const pubDir = path.resolve('published');
for (const d of fs.readdirSync(pubDir)) {
  const src = path.join(pubDir, d, 'index.html');
  const targetDir = path.join(gDriveBase, d);
  const target = path.join(targetDir, 'index.html');
  if (fs.existsSync(src) && fs.existsSync(targetDir)) {
    fs.copyFileSync(src, target);
    console.log(`[SYNC PUBLISHED] ${d}/index.html`);
  }
}

// 2. Copy drafts
const draftsDir = path.resolve('drafts');
for (const d of fs.readdirSync(draftsDir)) {
  const src = path.join(draftsDir, d, 'index.html');
  const targetDir = path.join(gDriveBase, d);
  const target = path.join(targetDir, 'index.html');
  if (fs.existsSync(src)) {
    if (!fs.existsSync(targetDir)) fs.mkdirSync(targetDir, { recursive: true });
    // Don't overwrite if published already copied
    if (!fs.existsSync(path.join(pubDir, d))) {
      fs.copyFileSync(src, target);
      console.log(`[SYNC DRAFT] ${d}/index.html`);
    }
  }
}

console.log('Sync to Google Drive complete.');
