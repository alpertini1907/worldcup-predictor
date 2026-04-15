const express = require('express');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { v4: uuid } = require('uuid');
const { generateToken, JWT_SECRET } = require('../middleware/auth');
const { sendVerificationEmail, sendResetEmail } = require('../email');

const router = express.Router();

// ==================== KAYIT ====================
router.post('/register', async (req, res) => {
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
    'INSERT INTO users (id, full_name, email, phone, password, email_verified) VALUES (?, ?, ?, ?, ?, 0)'
  ).run(id, full_name.trim(), cleanEmail, phone.trim(), hashedPassword);

  // Dogrulama maili gonder
  try {
    const verifyToken = jwt.sign({ id, purpose: 'verify' }, JWT_SECRET, { expiresIn: '24h' });
    await sendVerificationEmail(cleanEmail, verifyToken);
    res.status(201).json({ message: 'Kayit basarili! E-posta adresinize dogrulama linki gonderildi. Lutfen mailinizi kontrol edin.' });
  } catch (e) {
    console.error('[REGISTER] Mail hatasi:', e.message);
    res.status(201).json({ message: 'Kayit basarili! Dogrulama maili gonderilemedi, admin ile iletisime gecin.' });
  }
});

// ==================== E-POSTA DOGRULAMA ====================
router.get('/verify', (req, res) => {
  const { token } = req.query;
  if (!token) {
    return res.status(400).json({ error: 'Token gerekli' });
  }
  try {
    const decoded = jwt.verify(token, JWT_SECRET);
    if (decoded.purpose !== 'verify') {
      return res.status(400).json({ error: 'Gecersiz token' });
    }
    const db = req.db;
    const user = db.prepare('SELECT id, email_verified FROM users WHERE id = ?').get(decoded.id);
    if (!user) {
      return res.status(404).json({ error: 'Kullanici bulunamadi' });
    }
    if (user.email_verified) {
      return res.json({ message: 'E-posta zaten dogrulanmis' });
    }
    db.prepare('UPDATE users SET email_verified = 1 WHERE id = ?').run(decoded.id);
    res.json({ message: 'E-posta basariyla dogrulandi! Artik giris yapabilirsiniz.' });
  } catch (err) {
    res.status(400).json({ error: 'Gecersiz veya suresi dolmus token' });
  }
});

// ==================== DOGRULAMA MAILI TEKRAR GONDER ====================
router.post('/resend-verification', async (req, res) => {
  const db = req.db;
  const { email } = req.body;
  if (!email) return res.status(400).json({ error: 'E-posta gerekli' });

  const cleanEmail = email.trim().toLowerCase();
  const user = db.prepare('SELECT id, email_verified FROM users WHERE email = ?').get(cleanEmail);
  if (!user) return res.json({ message: 'Eger bu e-posta kayitliysa dogrulama maili gonderildi.' });
  if (user.email_verified) return res.json({ message: 'E-posta zaten dogrulanmis.' });

  const verifyToken = jwt.sign({ id: user.id, purpose: 'verify' }, JWT_SECRET, { expiresIn: '24h' });
  await sendVerificationEmail(cleanEmail, verifyToken);
  res.json({ message: 'Dogrulama maili tekrar gonderildi. Lutfen mailinizi kontrol edin.' });
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
  // Admin'ler dogrulamaya tabi degil
  if (!user.email_verified && user.role !== 'admin') {
    return res.status(403).json({ error: 'E-posta adresiniz henuz dogrulanmamis. Lutfen mailinizi kontrol edin.', needsVerification: true, email: user.email });
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
      const sent = await sendResetEmail(email.trim().toLowerCase(), resetToken);
      if (!sent) {
        return res.json({ message: 'Sifre sifirlama maili gonderilemedi. SMTP ayarlarini kontrol edin.' });
      }
    } catch (e) {
      console.error('[FORGOT] Hata:', e);
      return res.json({ message: 'Mail hatasi: ' + e.message });
    }
  }
  res.json({ message: 'Sifre sifirlama linki e-posta adresinize gonderildi.' });
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
