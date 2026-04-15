const { getDb } = require('./db');
const bcrypt = require('bcryptjs');
const { v4: uuid } = require('uuid');

async function seed() {
  const db = await getDb();

  // Create admin user
  const adminPassword = bcrypt.hashSync('admin123', 10);
  try {
    db.prepare(
      "INSERT INTO users (id, full_name, email, phone, password, role, status) VALUES (?, ?, ?, ?, ?, 'admin', 'active')"
    ).run(uuid(), 'Admin', 'admin@worldcup.com', '05001234567', adminPassword);
    console.log('Admin oluşturuldu: admin@worldcup.com / admin123');
  } catch (e) {
    console.log('admin@worldcup.com zaten mevcut.');
  }

  // alpertini admin
  try {
    db.prepare(
      "INSERT INTO users (id, full_name, email, phone, password, role, status) VALUES (?, ?, ?, ?, ?, 'admin', 'active')"
    ).run(uuid(), 'Alper Tini', 'alpertini@gmail.com', '00000000000', bcrypt.hashSync('admin123', 10));
    console.log('Alper admin oluşturuldu: alpertini@gmail.com / admin123');
  } catch (e) {
    db.prepare("UPDATE users SET role = 'admin', status = 'active' WHERE email = 'alpertini@gmail.com'").run();
    console.log('alpertini@gmail.com admin olarak güncellendi.');
  }

  // Test user
  try {
    db.prepare(
      "INSERT INTO users (id, full_name, email, phone, password, role, status) VALUES (?, ?, ?, ?, ?, 'user', 'active')"
    ).run(uuid(), 'Test Kullanıcı', 'test@worldcup.com', '05009876543', bcrypt.hashSync('test123', 10));
    console.log('Test kullanıcı: test@worldcup.com / test123');
  } catch (e) {
    console.log('test@worldcup.com zaten mevcut.');
  }

  // Eski maçları ve tahminleri temizle
  db.prepare('DELETE FROM predictions').run();
  db.prepare('DELETE FROM matches').run();
  console.log('Eski maçlar temizlendi.');

  // =====================================================
  // AVRUPA KUPALARI - DENEME MAÇLARI
  // Tüm saatler UTC
  // =====================================================
  const matches = [
    // === ŞAMPİYONLAR LİGİ - 15 Nisan 2026 (Çeyrek Final Rövanş) ===
    { home: 'Arsenal', away: 'Sporting CP', kickoff: '2026-04-15T19:00:00Z', stage: 'qf', group: 'CL' },
    { home: 'Bayern Münih', away: 'Real Madrid', kickoff: '2026-04-15T19:00:00Z', stage: 'qf', group: 'CL' },

    // === AVRUPA LİGİ - 16 Nisan 2026 (Çeyrek Final Rövanş) ===
    { home: 'Celta Vigo', away: 'Freiburg', kickoff: '2026-04-16T16:45:00Z', stage: 'qf', group: 'EL' },
    { home: 'Aston Villa', away: 'Bologna', kickoff: '2026-04-16T19:00:00Z', stage: 'qf', group: 'EL' },
    { home: 'Nottingham Forest', away: 'Porto', kickoff: '2026-04-16T19:00:00Z', stage: 'qf', group: 'EL' },
    { home: 'Real Betis', away: 'Braga', kickoff: '2026-04-16T19:00:00Z', stage: 'qf', group: 'EL' },

    // === KONFERANS LİGİ - 16 Nisan 2026 (Çeyrek Final Rövanş) ===
    { home: 'AZ Alkmaar', away: 'Shakhtar Donetsk', kickoff: '2026-04-16T16:45:00Z', stage: 'qf', group: 'ECL' },
    { home: 'Fiorentina', away: 'Crystal Palace', kickoff: '2026-04-16T19:00:00Z', stage: 'qf', group: 'ECL' },
    { home: 'AEK Athens', away: 'Rayo Vallecano', kickoff: '2026-04-16T19:00:00Z', stage: 'qf', group: 'ECL' },
    { home: 'Strasbourg', away: 'Mainz', kickoff: '2026-04-16T19:00:00Z', stage: 'qf', group: 'ECL' },
  ];

  let added = 0;
  for (const m of matches) {
    try {
      db.prepare(
        'INSERT INTO matches (id, home_team, away_team, kickoff_at, stage, group_name) VALUES (?, ?, ?, ?, ?, ?)'
      ).run(uuid(), m.home, m.away, m.kickoff, m.stage, m.group);
      added++;
    } catch (e) { /* duplicate - UNIQUE constraint */ }
  }

  console.log(`\n${added} maç eklendi (toplam ${matches.length} maç tanımlı).`);

  // Saati geçmiş maçları hemen kilitle (5 dk öncesi dahil)
  const cutoff = new Date(Date.now() + 5 * 60 * 1000).toISOString();
  const locked = db.prepare(
    "UPDATE matches SET status = 'locked' WHERE status = 'open' AND kickoff_at <= ?"
  ).run(cutoff);
  if (locked.changes > 0) {
    console.log(`${locked.changes} maç otomatik kilitlendi (saat geçmiş).`);
  }

  console.log('\nSunucuyu başlatmak için: node server.js');
}

// Doğrudan çalıştırılırsa seed'i başlat
if (require.main === module) {
  seed().catch(console.error);
}

module.exports = { seed };
