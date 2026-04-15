const nodemailer = require('nodemailer');

const transporter = nodemailer.createTransport({
  host: process.env.SMTP_HOST || 'smtp.gmail.com',
  port: parseInt(process.env.SMTP_PORT || '587'),
  secure: false,
  auth: {
    user: process.env.SMTP_USER,
    pass: process.env.SMTP_PASS,
  },
});

const APP_URL = process.env.APP_URL || 'http://localhost:3000';
const FROM_EMAIL = process.env.SMTP_FROM || process.env.SMTP_USER || 'noreply@worldcup.com';

async function sendVerificationEmail(email, token) {
  const link = `${APP_URL}/verify?token=${token}`;
  try {
    await transporter.sendMail({
      from: `"Dunya Kupasi 2026" <${FROM_EMAIL}>`,
      to: email,
      subject: 'E-posta Dogrulama - Dunya Kupasi Tahmin',
      html: `
        <div style="font-family:Arial,sans-serif;max-width:480px;margin:0 auto;padding:24px;background:#f8f9fa;border-radius:12px">
          <h2 style="color:#8B1538;text-align:center">Dunya Kupasi 2026 Tahmin</h2>
          <p>Merhaba,</p>
          <p>Kaydinizi tamamlamak icin asagidaki butona tiklayin:</p>
          <div style="text-align:center;margin:24px 0">
            <a href="${link}" style="background:#8B1538;color:white;padding:12px 32px;border-radius:8px;text-decoration:none;font-weight:bold;display:inline-block">E-postami Dogrula</a>
          </div>
          <p style="font-size:12px;color:#666">Bu link 24 saat gecerlidir. Eger siz kayit olmadiysiniz bu e-postayi gormezden gelin.</p>
        </div>
      `,
    });
    console.log(`[EMAIL] Dogrulama maili gonderildi: ${email}`);
    return true;
  } catch (err) {
    console.error(`[EMAIL] Gonderilemedi (${email}):`, err.message);
    return false;
  }
}

async function sendResetEmail(email, token) {
  const link = `${APP_URL}/reset-password?token=${token}`;
  try {
    await transporter.sendMail({
      from: `"Dunya Kupasi 2026" <${FROM_EMAIL}>`,
      to: email,
      subject: 'Sifre Sifirlama - Dunya Kupasi Tahmin',
      html: `
        <div style="font-family:Arial,sans-serif;max-width:480px;margin:0 auto;padding:24px;background:#f8f9fa;border-radius:12px">
          <h2 style="color:#8B1538;text-align:center">Sifre Sifirlama</h2>
          <p>Merhaba,</p>
          <p>Sifrenizi sifirlamak icin asagidaki butona tiklayin:</p>
          <div style="text-align:center;margin:24px 0">
            <a href="${link}" style="background:#8B1538;color:white;padding:12px 32px;border-radius:8px;text-decoration:none;font-weight:bold;display:inline-block">Sifremi Sifirla</a>
          </div>
          <p style="font-size:12px;color:#666">Bu link 1 saat gecerlidir. Eger siz talep etmediyseniz bu e-postayi gormezden gelin.</p>
        </div>
      `,
    });
    console.log(`[EMAIL] Sifre sifirlama maili gonderildi: ${email}`);
    return true;
  } catch (err) {
    console.error(`[EMAIL] Reset gonderilemedi (${email}):`, err.message);
    throw err;
  }
}

module.exports = { sendVerificationEmail, sendResetEmail };
