const jwt = require('jsonwebtoken');

const JWT_SECRET = process.env.JWT_SECRET || 'worldcup-secret-key-2026';
const JWT_EXPIRES = '7d';

function generateToken(user) {
  return jwt.sign(
    { id: user.id, role: user.role, status: user.status },
    JWT_SECRET,
    { expiresIn: JWT_EXPIRES }
  );
}

function authenticate(req, res, next) {
  const header = req.headers.authorization;
  if (!header || !header.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'Token gerekli' });
  }
  try {
    const decoded = jwt.verify(header.split(' ')[1], JWT_SECRET);
    const db = req.db;
    const user = db.prepare('SELECT id, full_name, email, role, status, total_points FROM users WHERE id = ?').get(decoded.id);
    if (!user) return res.status(401).json({ error: 'Kullanıcı bulunamadı' });
    req.user = user;
    next();
  } catch {
    return res.status(401).json({ error: 'Geçersiz token' });
  }
}

function requireActive(req, res, next) {
  if (req.user.status !== 'active') {
    return res.status(403).json({ error: 'Hesabınız aktif değil' });
  }
  next();
}

function requireAdmin(req, res, next) {
  if (req.user.role !== 'admin') {
    return res.status(403).json({ error: 'Admin yetkisi gerekli' });
  }
  next();
}

module.exports = { JWT_SECRET, generateToken, authenticate, requireActive, requireAdmin };
