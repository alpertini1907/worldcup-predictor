const express = require('express');
const cors = require('cors');
const cron = require('node-cron');
const path = require('path');
const { getDb } = require('./db');

const app = express();
const PORT = process.env.PORT || 3000;

app.use(cors());
app.set('trust proxy', 1);
app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

// Make db available to routes via middleware
app.use(async (req, res, next) => {
  try {
    req.db = await getDb();
    next();
  } catch (err) {
    res.status(500).json({ error: 'Veritabanı hatası' });
  }
});

app.use('/api/auth', require('./routes/auth'));
app.use('/api/matches', require('./routes/matches'));
app.use('/api/predictions', require('./routes/predictions'));
app.use('/api/leaderboard', require('./routes/leaderboard'));
app.use('/api/admin', require('./routes/admin'));
app.use('/api/push', require('./routes/push'));
app.use('/api/admin/push', require('./routes/push'));

app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// Cron: Her dakika maçları kilitle
cron.schedule('* * * * *', async () => {
  try {
    const db = await getDb();
    const cutoff = new Date(Date.now() + 5 * 60 * 1000).toISOString();
    const result = db.prepare(
      "UPDATE matches SET status = 'locked' WHERE status = 'open' AND kickoff_at <= ?"
    ).run(cutoff);
    if (result.changes > 0) {
      console.log(`[CRON] ${result.changes} mac kilitlendi`);
    }
  } catch (e) {
    console.error('[CRON] Hata:', e.message);
  }
});

// Cron: Her 10 dakikada biten maçların skorunu çek
cron.schedule('*/10 * * * *', async () => {
  try {
    const db = await getDb();
    const { autoFetchScores } = require('./autoScore');
    await autoFetchScores(db);
  } catch (e) {
    console.error('[AUTO-SCORE] Cron hatasi:', e.message);
  }
});

async function autoSeed() {
  try {
    console.log('[AUTO-SEED] Seed çalıştırılıyor...');
    const { seed } = require('./seed');
    await seed();
    console.log('[AUTO-SEED] Tamamlandı.');
  } catch (e) {
    console.error('[AUTO-SEED] Hata:', e.message);
  }
}

async function start() {
  await getDb();
  await autoSeed();
  app.listen(PORT, () => {
    console.log(`Server çalışıyor: http://localhost:${PORT}`);
  });
}

start().catch(console.error);
