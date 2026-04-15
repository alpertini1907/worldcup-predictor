const express = require('express');
const bcrypt = require('bcryptjs');
const { v4: uuid } = require('uuid');
const { generateToken, authenticate } = require('../middleware/auth');

const router = express.Router();

// ==================== KAYIT ====================
router.post('/register', (req, res) => {
  const db = req.db;
  const { full_name, email, phone, password, password_confirm } = req.body;
  if (!full_name || !email || !phone || !password || !password_confirm) {
    return res.status(400).json({ error: 'Tum alanlar zorunludur' });
  }
  if (password.length < 6) {
    return res.status(400).json({ error: 'Sifre en az 6 karakter olmali' });
  }
  if (password !== password_confirm) {
    return res.status(400).json({ error: 'Sifreler eslesmiyor' });
  }
  const cleanEmail = email.trim().toLowerCase();
  const existing = db.prepare('SELECT id FROM users WHERE email = ?').get(cleanEmail);
  if (existing) {
    return res.status(409).json({ error: 'Bu e-posta zaten kayitli' });
  }
  const id = uuid();
  const hashedPassword = bcrypt.hashSync(password, 10);
  db.prepare(
    'INSERT INTO users (id, full_name, email, phone, password) VALUES (?, ?, ?, ?, ?)'
  ).run(id, full_name.trim(), cleanEmail, phone.trim(), hashedPassword);

  res.status(201).json({ message: 'Kayit basarili! Uyeliginiz kontrollerden sonra aktif edilecektir.' });
});

// ==================== GIRIS ====================
router.post('/login', (req, res) => {
  const db = req.db;
  const { email, password } = req.body;
  if (!email || !password) {
    return res.status(400).json({ error: 'E-posta ve sifre gerekli' });
  }
  const user = db.prepare('SELECT * FROM users WHERE email = ?').get(email.trim().toLowerCase());
  if (!user || !bcrypt.compareSync(password, user.password)) {
    return res.status(401).json({ error: 'E-posta veya sifre hatali' });
  }
  const token = generateToken(user);
  res.json({
    token,
    user: {
      id: user.id,
      full_name: user.full_name,
      email: user.email,
      role: user.role,
      status: user.status,
      total_points: user.total_points,
      must_change_password: user.must_change_password === 1,
    },
  });
});

// ==================== ZORUNLU SIFRE BELIRLEME (admin sifirlama sonrasi) ====================
router.post('/set-new-password', authenticate, (req, res) => {
  const db = req.db;
  const { new_password, new_password_confirm } = req.body;
  if (!new_password || !new_password_confirm) {
    return res.status(400).json({ error: 'Tum alanlar zorunludur' });
  }
  if (new_password.length < 6) {
    return res.status(400).json({ error: 'Yeni sifre en az 6 karakter olmali' });
  }
  if (new_password !== new_password_confirm) {
    return res.status(400).json({ error: 'Sifreler eslesmiyor' });
  }
  const user = db.prepare('SELECT * FROM users WHERE id = ?').get(req.user.id);
  if (!user) {
    return res.status(404).json({ error: 'Kullanici bulunamadi' });
  }
  const hashedPassword = bcrypt.hashSync(new_password, 10);
  db.prepare('UPDATE users SET password = ?, must_change_password = 0 WHERE id = ?').run(hashedPassword, req.user.id);
  res.json({ message: 'Sifreniz basariyla belirlendi' });
});

// ==================== SIFRE DEGISTIR (giris yapmis kullanici) ====================
router.post('/change-password', authenticate, (req, res) => {
  const db = req.db;
  const { current_password, new_password, new_password_confirm } = req.body;
  if (!current_password || !new_password || !new_password_confirm) {
    return res.status(400).json({ error: 'Tum alanlar zorunludur' });
  }
  if (new_password.length < 6) {
    return res.status(400).json({ error: 'Yeni sifre en az 6 karakter olmali' });
  }
  if (new_password !== new_password_confirm) {
    return res.status(400).json({ error: 'Yeni sifreler eslesmiyor' });
  }
  const user = db.prepare('SELECT * FROM users WHERE id = ?').get(req.user.id);
  if (!bcrypt.compareSync(current_password, user.password)) {
    return res.status(401).json({ error: 'Mevcut sifre hatali' });
  }
  const hashedPassword = bcrypt.hashSync(new_password, 10);
  db.prepare('UPDATE users SET password = ?, must_change_password = 0 WHERE id = ?').run(hashedPassword, req.user.id);
  res.json({ message: 'Sifreniz basariyla degistirildi' });
});

module.exports = router;
