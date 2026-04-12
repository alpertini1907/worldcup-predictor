const fs = require('fs');
const path = require('path');
const dbPath = path.join(__dirname, 'worldcup.db');
console.log('DB path:', dbPath);
console.log('Exists:', fs.existsSync(dbPath));

// Also check CWD
const cwdPath = path.join(process.cwd(), 'worldcup.db');
console.log('CWD DB path:', cwdPath);
console.log('CWD Exists:', fs.existsSync(cwdPath));

// Delete both if exist
for (const p of [dbPath, cwdPath]) {
  if (fs.existsSync(p)) {
    fs.unlinkSync(p);
    console.log('DELETED:', p);
  }
}

// List all .db files in __dirname
const files = fs.readdirSync(__dirname).filter(f => f.endsWith('.db'));
console.log('DB files in __dirname:', files);
