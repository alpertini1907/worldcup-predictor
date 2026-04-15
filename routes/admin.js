const express = require('express');
const bcrypt = require('bcryptjs');
const { v4: uuid } = require('uuid');
const { authenticate, requireAdmin } = require('../middleware/auth');
const { processMatchResults } = require('../scoring');

const router = express.Router();

router.use(authenticate, requireAdmin);

// GET /api/admin/users
router.get('/users', (req, res) => {
  const db = req.db;
  const users = db.prepare(`
    SELECT u.id, u.full_name, u.email, u.phone, u.status, u.total_points, u.created_at,
      (SELECT COUNT(*) FROM predictions WHERE user_id = u.id) as prediction_count
    FROM users u
    WHERE u.role = 'user'
    ORDER BY u.created_at DESC
  `).all();
  res.json(users);
});

// PATCH /api/admin/users/:id/status
router.patch('/users/:id/status', (req, res) => {
  const db = req.db;
  const { status } = req.body;
  if (!['waiting', 'active', 'passive'].includes(status)) {
    return res.status(400).json({ error: 'Geçersiz durum' });
  }
  const user = db.prepare("SELECT id FROM users WHERE id = ? AND role = 'user'").get(req.params.id);
  if (!user) return res.status(404).json({ error: 'Kullanıcı bulunamadı' });
  db.prepare('UPDATE users SET status = ? WHERE id = ?').run(status, req.params.id);
  res.json({ message: 'Durum güncellendi' });
});

// GET /api/admin/matches
router.get('/matches', (req, res) => {
  const db = req.db;
  const matches = db.prepare(`
    SELECT m.*,
      (SELECT COUNT(*) FROM predictions WHERE match_id = m.id) as prediction_count
    FROM matches m
    ORDER BY m.kickoff_at ASC
  `).all();
  res.json(matches);
});

// POST /api/admin/matches
router.post('/matches', (req, res) => {
  const db = req.db;
  const { home_team, away_team, kickoff_at, stage, group_name } = req.body;
  if (!home_team || !away_team || !kickoff_at || !stage) {
    return res.status(400).json({ error: 'Zorunlu alanlar eksik' });
  }
  if (!['group', 'r16', 'qf', 'sf', 'final'].includes(stage)) {
    return res.status(400).json({ error: 'Geçersiz aşama' });
  }
  const id = uuid();
  db.prepare(
    'INSERT INTO matches (id, home_team, away_team, kickoff_at, stage, group_name) VALUES (?, ?, ?, ?, ?, ?)'
  ).run(id, home_team.trim(), away_team.trim(), kickoff_at, stage, group_name || null);
  res.status(201).json({ id, home_team, away_team, kickoff_at, stage });
});

// PATCH /api/admin/matches/:id/result
router.patch('/matches/:id/result', (req, res) => {
  const db = req.db;
  const { real_home_score, real_away_score } = req.body;
  if (!Number.isInteger(real_home_score) || !Number.isInteger(real_away_score)
      || real_home_score < 0 || real_away_score < 0) {
    return res.status(400).json({ error: 'Geçerli skor giriniz' });
  }
  const match = db.prepare('SELECT * FROM matches WHERE id = ?').get(req.params.id);
  if (!match) return res.status(404).json({ error: 'Maç bulunamadı' });
  db.prepare(
    "UPDATE matches SET real_home_score = ?, real_away_score = ?, status = 'done' WHERE id = ?"
  ).run(real_home_score, real_away_score, req.params.id);
  processMatchResults(db, req.params.id);
  res.json({ message: 'Sonuç kaydedildi ve puanlar hesaplandı' });
});

// DELETE /api/admin/matches/:id
router.delete('/matches/:id', (req, res) => {
  const db = req.db;
  const match = db.prepare('SELECT * FROM matches WHERE id = ?').get(req.params.id);
  if (!match) return res.status(404).json({ error: 'Maç bulunamadı' });
  if (match.status === 'done') {
    return res.status(400).json({ error: 'Tamamlanmış maç silinemez' });
  }
  db.prepare('DELETE FROM predictions WHERE match_id = ?').run(req.params.id);
  db.prepare('DELETE FROM matches WHERE id = ?').run(req.params.id);
  res.json({ message: 'Maç silindi' });
});

// ============ ADMIN MANAGEMENT ============

// GET /api/admin/admins - list all admins
router.get('/admins', (req, res) => {
  const db = req.db;
  const admins = db.prepare(`
    SELECT id, full_name, email, phone, created_at
    FROM users WHERE role = 'admin'
    ORDER BY created_at ASC
  `).all();
  res.json(admins);
});

// POST /api/admin/admins - promote a user to admin by email
router.post('/admins', (req, res) => {
  const db = req.db;
  const { email } = req.body;
  if (!email) return res.status(400).json({ error: 'E-posta gerekli' });
  const user = db.prepare('SELECT id, role FROM users WHERE email = ?').get(email.trim().toLowerCase());
  if (!user) return res.status(404).json({ error: 'Bu e-posta ile kayıtlı kullanıcı bulunamadı' });
  if (user.role === 'admin') return res.status(409).json({ error: 'Bu kullanıcı zaten admin' });
  db.prepare("UPDATE users SET role = 'admin', status = 'active' WHERE id = ?").run(user.id);
  res.json({ message: 'Kullanıcı admin olarak tanımlandı' });
});

// DELETE /api/admin/admins/:id - demote admin back to user
router.delete('/admins/:id', (req, res) => {
  const db = req.db;
  if (req.params.id === req.user.id) {
    return res.status(400).json({ error: 'Kendinizi admin olmaktan çıkaramazsınız' });
  }
  const user = db.prepare("SELECT id FROM users WHERE id = ? AND role = 'admin'").get(req.params.id);
  if (!user) return res.status(404).json({ error: 'Admin bulunamadı' });
  db.prepare("UPDATE users SET role = 'user' WHERE id = ?").run(req.params.id);
  res.json({ message: 'Admin yetkisi kaldırıldı' });
});

// POST /api/admin/users/:id/reset-password - Admin sifre sifirlama
router.post('/users/:id/reset-password', (req, res) => {
  const db = req.db;
  const user = db.prepare('SELECT id, full_name FROM users WHERE id = ?').get(req.params.id);
  if (!user) return res.status(404).json({ error: 'Kullanici bulunamadi' });

  // Rastgele 8 haneli sifre olustur
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnpqrstuvwxyz23456789';
  let newPassword = '';
  for (let i = 0; i < 8; i++) {
    newPassword += chars.charAt(Math.floor(Math.random() * chars.length));
  }

  const hashedPassword = bcrypt.hashSync(newPassword, 10);
  db.prepare('UPDATE users SET password = ? WHERE id = ?').run(hashedPassword, req.params.id);
  res.json({ message: `${user.full_name} icin yeni sifre: ${newPassword}`, newPassword });
});

// GET /api/admin/scoring-params
router.get('/scoring-params', (req, res) => {
  const db = req.db;
  const params = db.prepare(`SELECT * FROM scoring_params ORDER BY
    CASE stage WHEN 'group' THEN 1 WHEN 'r16' THEN 2 WHEN 'qf' THEN 3 WHEN 'sf' THEN 4 WHEN 'final' THEN 5 END
  `).all();
  res.json(params);
});

// PUT /api/admin/scoring-params/:stage
router.put('/scoring-params/:stage', (req, res) => {
  const db = req.db;
  const { stage } = req.params;
  if (!['group', 'r16', 'qf', 'sf', 'final'].includes(stage)) {
    return res.status(400).json({ error: 'Geçersiz aşama' });
  }
  const { correct_result_pts, correct_score_pts, correct_ou_pts, ou_threshold } = req.body;
  if ([correct_result_pts, correct_score_pts, correct_ou_pts].some(v => !Number.isInteger(v) || v < 0)) {
    return res.status(400).json({ error: 'Puan değerleri pozitif tam sayı olmalı' });
  }
  if (typeof ou_threshold !== 'number' || ou_threshold <= 0) {
    return res.status(400).json({ error: 'Alt/üst eşiği pozitif sayı olmalı' });
  }
  db.prepare(`
    UPDATE scoring_params
    SET correct_result_pts = ?, correct_score_pts = ?, correct_ou_pts = ?, ou_threshold = ?, updated_at = datetime('now')
    WHERE stage = ?
  `).run(correct_result_pts, correct_score_pts, correct_ou_pts, ou_threshold, stage);
  res.json({ message: 'Parametreler güncellendi' });
});

// ============ EXPORT ============

// GET /api/admin/export/predictions - Export all predictions as CSV
router.get('/export/predictions', (req, res) => {
  const db = req.db;
  const rows = db.prepare(`
    SELECT
      u.full_name as kullanici,
      u.email,
      m.home_team as ev_sahibi,
      m.away_team as deplasman,
      m.kickoff_at as mac_tarihi,
      m.stage as asama,
      m.group_name as grup,
      p.pred_home as tahmin_ev,
      p.pred_away as tahmin_dep,
      m.real_home_score as gercek_ev,
      m.real_away_score as gercek_dep,
      m.status as mac_durumu,
      p.points_earned as kazanilan_puan,
      p.created_at as tahmin_tarihi
    FROM predictions p
    JOIN users u ON u.id = p.user_id
    JOIN matches m ON m.id = p.match_id
    ORDER BY u.full_name ASC, m.kickoff_at ASC
  `).all();

  // BOM for Turkish characters in Excel
  const BOM = '\uFEFF';
  const headers = ['Kullanıcı', 'E-posta', 'Ev Sahibi', 'Deplasman', 'Maç Tarihi', 'Aşama', 'Grup', 'Tahmin Ev', 'Tahmin Dep', 'Gerçek Ev', 'Gerçek Dep', 'Maç Durumu', 'Kazanılan Puan', 'Tahmin Tarihi'];

  const csvRows = [headers.join(';')];
  for (const r of rows) {
    const stageMap = { group: 'Grup', r16: 'Son 16', qf: 'Çeyrek Final', sf: 'Yarı Final', final: 'Final' };
    const statusMap = { open: 'Açık', locked: 'Kilitli', done: 'Tamamlandı' };
    csvRows.push([
      r.kullanici,
      r.email,
      r.ev_sahibi,
      r.deplasman,
      r.mac_tarihi,
      stageMap[r.asama] || r.asama,
      r.grup || '',
      r.tahmin_ev,
      r.tahmin_dep,
      r.gercek_ev !== null ? r.gercek_ev : '',
      r.gercek_dep !== null ? r.gercek_dep : '',
      statusMap[r.mac_durumu] || r.mac_durumu,
      r.kazanilan_puan !== null ? r.kazanilan_puan : '',
      r.tahmin_tarihi
    ].join(';'));
  }

  const csv = BOM + csvRows.join('\n');
  res.setHeader('Content-Type', 'text/csv; charset=utf-8');
  res.setHeader('Content-Disposition', 'attachment; filename="tahminler.csv"');
  res.send(csv);
});

// GET /api/admin/export/leaderboard - Export leaderboard as CSV
router.get('/export/leaderboard', (req, res) => {
  const db = req.db;
  const rows = db.prepare(`
    SELECT u.full_name, u.email, u.phone, u.total_points,
      (SELECT COUNT(*) FROM predictions WHERE user_id = u.id) as tahmin_sayisi,
      (SELECT COUNT(*) FROM predictions p JOIN matches m ON m.id = p.match_id WHERE p.user_id = u.id AND m.status = 'done' AND p.points_earned > 0) as basarili_tahmin
    FROM users u
    WHERE u.status = 'active' AND u.role = 'user'
    ORDER BY u.total_points DESC, u.created_at ASC
  `).all();

  const BOM = '\uFEFF';
  const headers = ['Sıra', 'Ad Soyad', 'E-posta', 'Telefon', 'Toplam Puan', 'Tahmin Sayısı', 'Başarılı Tahmin'];
  const csvRows = [headers.join(';')];
  rows.forEach((r, i) => {
    csvRows.push([i + 1, r.full_name, r.email, r.phone, r.total_points, r.tahmin_sayisi, r.basarili_tahmin].join(';'));
  });

  const csv = BOM + csvRows.join('\n');
  res.setHeader('Content-Type', 'text/csv; charset=utf-8');
  res.setHeader('Content-Disposition', 'attachment; filename="siralama.csv"');
  res.send(csv);
});

module.exports = router;
