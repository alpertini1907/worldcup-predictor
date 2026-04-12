const express = require('express');
const { v4: uuid } = require('uuid');
const { authenticate, requireActive } = require('../middleware/auth');

const router = express.Router();

router.post('/', authenticate, requireActive, (req, res) => {
  const db = req.db;
  const { match_id, pred_home, pred_away } = req.body;
  if (!match_id || pred_home === undefined || pred_away === undefined) {
    return res.status(400).json({ error: 'Tüm alanlar zorunludur' });
  }
  if (!Number.isInteger(pred_home) || !Number.isInteger(pred_away) || pred_home < 0 || pred_away < 0) {
    return res.status(400).json({ error: 'Skor 0 veya pozitif tam sayı olmalı' });
  }
  const match = db.prepare('SELECT * FROM matches WHERE id = ?').get(match_id);
  if (!match) return res.status(404).json({ error: 'Maç bulunamadı' });
  if (match.status !== 'open') {
    return res.status(403).json({ error: 'Bu maç için tahmin süresi kapanmıştır' });
  }
  if (new Date(match.kickoff_at) <= new Date()) {
    return res.status(403).json({ error: 'Maç başlamış, tahmin yapılamaz' });
  }
  const existing = db.prepare('SELECT id FROM predictions WHERE user_id = ? AND match_id = ?')
    .get(req.user.id, match_id);
  if (existing) {
    // Update existing prediction
    db.prepare('UPDATE predictions SET pred_home = ?, pred_away = ? WHERE id = ?')
      .run(pred_home, pred_away, existing.id);
    return res.json({ id: existing.id, match_id, pred_home, pred_away, updated: true });
  }
  const id = uuid();
  db.prepare(
    'INSERT INTO predictions (id, user_id, match_id, pred_home, pred_away) VALUES (?, ?, ?, ?, ?)'
  ).run(id, req.user.id, match_id, pred_home, pred_away);
  res.status(201).json({ id, match_id, pred_home, pred_away });
});

router.get('/me', authenticate, requireActive, (req, res) => {
  const db = req.db;
  const predictions = db.prepare(`
    SELECT p.*, m.home_team, m.away_team, m.kickoff_at, m.stage, m.status as match_status,
           m.real_home_score, m.real_away_score
    FROM predictions p
    JOIN matches m ON m.id = p.match_id
    WHERE p.user_id = ?
    ORDER BY m.kickoff_at ASC
  `).all(req.user.id);
  res.json(predictions);
});

module.exports = router;
