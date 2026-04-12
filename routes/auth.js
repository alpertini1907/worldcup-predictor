const express = require('express');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { v4: uuid } = require('uuid');
const { generateToken, JWT_SECRET } = require('../middleware/auth');

const router = express.Router();

// ==================== KAYIT ====================
router.post('/register', (req, res) => {
  const db = req.db;
  const { full_name, email, phone, password } = req.body;
  if (!full_name || !email || !phone || !password) {
    return res.status(400).json({ error: 'Tum alanlar zorunludur' });
  }
  if (password.length < 6) {
    return res.status(400).json({ error: 'Sifre en az 6 karakter olmali' });
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

  res.status(201).json({ message: 'Kayit basarili. Odeme onayi bekleniyor.' });
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
    },
  });
});

// ==================== SIFREMI UNUTTUM ====================
router.post('/forgot-password', async (req, res) => {
  const db = req.db;
  const { email } = req.body;
  if (!email) return res.status(400).json({ error: 'E-posta gerekli' });

  const user = db.prepare('SELECT id FROM users WHERE email = ?').get(email.trim().toLowerCase());
  if (user) {
    try {
      const resetToken = jwt.sign({ id: user.id, purpose: 'reset' }, JWT_SECRET, { expiresIn: '1h' });
      // SMTP ayarlaninca email gonderilecek
      if (process.env.SMTP_USER) {
        const { sendResetEmail } = require('../email');
        await sendResetEmail(email.trim().toLowerCase(), resetToken);
      } else {
        console.log(`[FORGOT] Reset token (SMTP yok): ${resetToken}`);
      }
    } catch (e) {
      console.error('[FORGOT] Email gonderilemedi:', e.message);
    }
  }
  res.json({ message: 'Eger bu e-posta kayitliysa sifre sifirlama linki gonderildi.' });
});

// ==================== SIFRE SIFIRLAMA ====================
router.post('/reset-password', (req, res) => {
  const { token, password } = req.body;
  if (!token || !password) {
    return res.status(400).json({ error: 'Token ve yeni sifre gerekli' });
  }
  if (password.length < 6) {
    return res.status(400).json({ error: 'Sifre en az 6 karakter olmali' });
  }
  try {
    const decoded = jwt.verify(token, JWT_SECRET);
    if (decoded.purpose !== 'reset') {
      return res.status(400).json({ error: 'Gecersiz token' });
    }
    const db = req.db;
    const user = db.prepare('SELECT id FROM users WHERE id = ?').get(decoded.id);
    if (!user) {
      return res.status(404).json({ error: 'Kullanici bulunamadi' });
    }
    const hashedPassword = bcrypt.hashSync(password, 10);
    db.prepare('UPDATE users SET password = ? WHERE id = ?').run(hashedPassword, decoded.id);
    res.json({ message: 'Sifreniz basariyla degistirildi! Artik yeni sifrenizle giris yapabilirsiniz.' });
  } catch (err) {
    res.status(400).json({ error: 'Gecersiz veya suresi dolmus token' });
  }
});

module.exports = router;
