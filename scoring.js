function calculatePoints(predHome, predAway, realHome, realAway, params) {
  if (!params) return 0;
  let points = 0;

  // Layer 1: Match result (1/X/2)
  const predResult = predHome > predAway ? '1' : predHome < predAway ? '2' : 'X';
  const realResult = realHome > realAway ? '1' : realHome < realAway ? '2' : 'X';
  if (predResult === realResult) {
    points += params.correct_result_pts;
  }

  // Layer 2: Exact score
  if (predHome === realHome && predAway === realAway) {
    points += params.correct_score_pts;
  }

  // Layer 3: Over/Under
  const predTotal = predHome + predAway;
  const realTotal = realHome + realAway;
  const threshold = params.ou_threshold;
  const predOU = predTotal > threshold ? 'over' : 'under';
  const realOU = realTotal > threshold ? 'over' : 'under';
  if (predOU === realOU) {
    points += params.correct_ou_pts;
  }

  return points;
}

function processMatchResults(db, matchId) {
  const match = db.prepare('SELECT * FROM matches WHERE id = ?').get(matchId);
  if (!match || match.real_home_score === null || match.real_away_score === null) return;

  const params = db.prepare('SELECT * FROM scoring_params WHERE stage = ?').get(match.stage);
  const predictions = db.prepare('SELECT * FROM predictions WHERE match_id = ?').all(matchId);

  const affectedUsers = new Set();
  for (const pred of predictions) {
    const pts = calculatePoints(
      pred.pred_home, pred.pred_away,
      match.real_home_score, match.real_away_score,
      params
    );
    db.prepare('UPDATE predictions SET points_earned = ? WHERE id = ?').run(pts, pred.id);
    affectedUsers.add(pred.user_id);
  }
  for (const userId of affectedUsers) {
    db.prepare(
      'UPDATE users SET total_points = (SELECT COALESCE(SUM(points_earned), 0) FROM predictions WHERE user_id = ?) WHERE id = ?'
    ).run(userId, userId);
  }
}

module.exports = { calculatePoints, processMatchResults };
