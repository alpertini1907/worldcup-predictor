const express = require('express');
const { authenticate } = require('../middleware/auth');

const router = express.Router();

router.get('/', authenticate, (req, res) => {
  const db = req.db;
  const leaderboard = db.prepare(`
    SELECT u.id, u.full_name, u.total_points,
      (SELECT COUNT(*) FROM predictions WHERE user_id = u.id) as prediction_count
    FROM users u
    WHERE u.status = 'active' AND u.role = 'user'
    ORDER BY u.total_points DESC, u.created_at ASC
  `).all();
  const ranked = leaderboard.map((u, i) => ({ rank: i + 1, ...u }));
  res.json(ranked);
});

module.exports = router;
