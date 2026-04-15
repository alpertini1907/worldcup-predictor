const https = require('https');

const RESEND_API_KEY = process.env.RESEND_API_KEY;
const APP_URL = process.env.APP_URL || 'http://localhost:3000';
const FROM_EMAIL = process.env.FROM_EMAIL || 'onboarding@resend.dev';

function sendEmail(to, subject, html) {
  return new Promise((resolve, reject) => {
    const data = JSON.stringify({ from: `Dunya Kupasi 2026 <${FROM_EMAIL}>`, to: [to], subject, html });
    const options = {
      hostname: 'api.resend.com',
      port: 443,
      path: '/emails',
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${RESEND_API_KEY}`,
        'Content-Type': 'application/json',
        'Content-Length': Buffer.byteLength(data),
      },
    };
    const req = https.request(options, (res) => {
      let body = '';
      res.on('data', (chunk) => body += chunk);
      res.on('end', () => {
        if (res.statusCode >= 200 && res.statusCode < 300) {
          console.log(`[EMAIL] Gonderildi: ${to} (${subject})`);
          resolve(true);
        } else {
          console.error(`[EMAIL] Hata (${res.statusCode}): ${body}`);
          reject(new Error(`Resend hatasi (${res.statusCode}): ${body}`));
        }
      });
    });
    req.on('error', (e) => {
      console.error(`[EMAIL] Baglanti hatasi: ${e.message}`);
      reject(e);
    });
    req.write(data);
    req.end();
  });
}

async function sendVerificationEmail(email, token) {
  const link = `${APP_URL}/verify?token=${token}`;
  return sendEmail(email, 'E-posta Dogrulama - Dunya Kupasi Tahmin', `
    <div style="font-family:Arial,sans-serif;max-width:480px;margin:0 auto;padding:24px;background:#f8f9fa;border-radius:12px">
      <h2 style="color:#8B1538;text-align:center">Dunya Kupasi 2026 Tahmin</h2>
      <p>Merhaba,</p>
      <p>Kaydinizi tamamlamak icin asagidaki butona tiklayin:</p>
      <div style="text-align:center;margin:24px 0">
        <a href="${link}" style="background:#8B1538;color:white;padding:12px 32px;border-radius:8px;text-decoration:none;font-weight:bold;display:inline-block">E-postami Dogrula</a>
      </div>
      <p style="font-size:12px;color:#666">Bu link 24 saat gecerlidir.</p>
    </div>
  `);
}

async function sendResetEmail(email, token) {
  const link = `${APP_URL}/reset-password?token=${token}`;
  return sendEmail(email, 'Sifre Sifirlama - Dunya Kupasi Tahmin', `
    <div style="font-family:Arial,sans-serif;max-width:480px;margin:0 auto;padding:24px;background:#f8f9fa;border-radius:12px">
      <h2 style="color:#8B1538;text-align:center">Sifre Sifirlama</h2>
      <p>Merhaba,</p>
      <p>Sifrenizi sifirlamak icin asagidaki butona tiklayin:</p>
      <div style="text-align:center;margin:24px 0">
        <a href="${link}" style="background:#8B1538;color:white;padding:12px 32px;border-radius:8px;text-decoration:none;font-weight:bold;display:inline-block">Sifremi Sifirla</a>
      </div>
      <p style="font-size:12px;color:#666">Bu link 1 saat gecerlidir.</p>
    </div>
  `);
}

module.exports = { sendVerificationEmail, sendResetEmail };
