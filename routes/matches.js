const express = require('express');
const { authenticate, requireActive } = require('../middleware/auth');

const router = express.Router();

router.get('/', authenticate, requireActive, (req, res) => {
  const db = req.db;
  const matches = db.prepare(`
    SELECT m.*,
      p.pred_home, p.pred_away, p.points_earned
    FROM matches m
    LEFT JOIN predictions p ON p.match_id = m.id AND p.user_id = ?
    ORDER BY m.kickoff_at ASC
  `).all(req.user.id);
  res.json(matches);
});

// GET /api/matches/:id/predictions - All predictions for a locked/done match
router.get('/:id/predictions', authenticate, requireActive, (req, res) => {
  const db = req.db;
  const match = db.prepare('SELECT * FROM matches WHERE id = ?').get(req.params.id);
  if (!match) return res.status(404).json({ error: 'Maç bulunamadı' });

  // Only show predictions after match is locked or done
  if (match.status === 'open') {
    return res.status(403).json({ error: 'Maç başlamadan tahminler görüntülenemez' });
  }

  const matchPreds = db.prepare(`
    SELECT u.full_name, p.pred_home, p.pred_away, p.points_earned
    FROM predictions p
    JOIN users u ON u.id = p.user_id
    WHERE p.match_id = ?
    ORDER BY p.points_earned DESC, u.full_name ASC
  `).all(req.params.id);

  res.json(matchPreds);
});

module.exports = router;
