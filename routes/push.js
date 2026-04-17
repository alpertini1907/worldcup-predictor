const express = require('express');
const webpush = require('web-push');
const { v4: uuid } = require('uuid');
const { authenticate, requireAdmin, requireActive } = require('../middleware/auth');

const router = express.Router();

// VAPID anahtarları env'den al
function getVapid() {
  const pub = process.env.VAPID_PUBLIC_KEY;
  const priv = process.env.VAPID_PRIVATE_KEY;
  const email = process.env.VAPID_EMAIL || 'mailto:admin@worldcup.com';
  if (!pub || !priv) return null;
  return { pub, priv, email };
}

// GET /api/push/vapid-key - frontend vapid public key alır
router.get('/vapid-key', (req, res) => {
  const vapid = getVapid();
  if (!vapid) return res.status(503).json({ error: 'Push bildirimleri henüz ayarlanmadı' });
  res.json({ publicKey: vapid.pub });
});

// POST /api/push/subscribe - kullanıcı aboneliğini kaydet
router.post('/subscribe', authenticate, requireActive, (req, res) => {
  const db = req.db;
  const { subscription } = req.body;
  if (!subscription) return res.status(400).json({ error: 'Abonelik verisi eksik' });

  const subStr = JSON.stringify(subscription);
  const existing = db.prepare('SELECT id FROM push_subscriptions WHERE user_id = ?').get(req.user.id);
  if (existing) {
    db.prepare('UPDATE push_subscriptions SET subscription = ? WHERE user_id = ?').run(subStr, req.user.id);
  } else {
    db.prepare('INSERT INTO push_subscriptions (id, user_id, subscription) VALUES (?, ?, ?)').run(uuid(), req.user.id, subStr);
  }
  res.json({ message: 'Bildirimler aktif edildi' });
});

// POST /api/push/unsubscribe - aboneliği kaldır
router.post('/unsubscribe', authenticate, (req, res) => {
  const db = req.db;
  db.prepare('DELETE FROM push_subscriptions WHERE user_id = ?').run(req.user.id);
  res.json({ message: 'Bildirimler kapatıldı' });
});

// POST /api/admin/push-notify - admin bildirim gönder
router.post('/notify', authenticate, requireAdmin, async (req, res) => {
  const db = req.db;
  const { title, body } = req.body;
  if (!title || !body) return res.status(400).json({ error: 'Başlık ve mesaj zorunludur' });

  const vapid = getVapid();
  if (!vapid) return res.status(503).json({ error: 'VAPID anahtarları ayarlanmamış' });

  webpush.setVapidDetails(vapid.email, vapid.pub, vapid.priv);

  const subs = db.prepare('SELECT * FROM push_subscriptions').all();
  if (subs.length === 0) return res.json({ message: 'Bildirim abonesi yok', sent: 0 });

  const payload = JSON.stringify({ title, body, icon: '/icon.png', url: '/' });

  let sent = 0, failed = 0;
  const deadSubs = [];

  for (const row of subs) {
    try {
      const sub = JSON.parse(row.subscription);
      await webpush.sendNotification(sub, payload);
      sent++;
    } catch (e) {
      failed++;
      // 410 Gone = abonelik süresi dolmuş, sil
      if (e.statusCode === 410 || e.statusCode === 404) {
        deadSubs.push(row.id);
      }
    }
  }

  // Süresi dolmuş abonelikleri temizle
  for (const id of deadSubs) {
    db.prepare('DELETE FROM push_subscriptions WHERE id = ?').run(id);
  }

  res.json({ message: `${sent} kişiye bildirim gönderildi`, sent, failed });
});

module.exports = router;
