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
  // GERÇEK 2026 FIFA DÜNYA KUPASI GRUP MAÇLARI
  // Tüm saatler UTC
  // =====================================================
  const matches = [
    // ===== MATCHDAY 1 =====
    // June 11 - Group A
    { home: 'Meksika', away: 'Güney Afrika', kickoff: '2026-06-11T19:00:00Z', stage: 'group', group: 'A' },
    { home: 'Güney Kore', away: 'Çekya', kickoff: '2026-06-12T02:00:00Z', stage: 'group', group: 'A' },
    // June 12 - Group B, D
    { home: 'Kanada', away: 'Bosna Hersek', kickoff: '2026-06-12T19:00:00Z', stage: 'group', group: 'B' },
    { home: 'ABD', away: 'Paraguay', kickoff: '2026-06-13T01:00:00Z', stage: 'group', group: 'D' },
    // June 13 - Group B, C, D
    { home: 'Katar', away: 'İsviçre', kickoff: '2026-06-13T19:00:00Z', stage: 'group', group: 'B' },
    { home: 'Brezilya', away: 'Fas', kickoff: '2026-06-13T22:00:00Z', stage: 'group', group: 'C' },
    { home: 'Haiti', away: 'İskoçya', kickoff: '2026-06-14T01:00:00Z', stage: 'group', group: 'C' },
    { home: 'Avustralya', away: 'Türkiye', kickoff: '2026-06-14T04:00:00Z', stage: 'group', group: 'D' },
    // June 14 - Group E, F
    { home: 'Almanya', away: 'Curaçao', kickoff: '2026-06-14T17:00:00Z', stage: 'group', group: 'E' },
    { home: 'Hollanda', away: 'Japonya', kickoff: '2026-06-14T20:00:00Z', stage: 'group', group: 'F' },
    { home: 'Fildişi Sahili', away: 'Ekvador', kickoff: '2026-06-14T23:00:00Z', stage: 'group', group: 'E' },
    { home: 'İsveç', away: 'Tunus', kickoff: '2026-06-15T02:00:00Z', stage: 'group', group: 'F' },
    // June 15 - Group G, H
    { home: 'İspanya', away: 'Yeşil Burun Adaları', kickoff: '2026-06-15T17:00:00Z', stage: 'group', group: 'H' },
    { home: 'Belçika', away: 'Mısır', kickoff: '2026-06-15T22:00:00Z', stage: 'group', group: 'G' },
    { home: 'Suudi Arabistan', away: 'Uruguay', kickoff: '2026-06-15T22:00:00Z', stage: 'group', group: 'H' },
    { home: 'İran', away: 'Yeni Zelanda', kickoff: '2026-06-16T04:00:00Z', stage: 'group', group: 'G' },
    // June 16 - Group I, J
    { home: 'Fransa', away: 'Senegal', kickoff: '2026-06-16T19:00:00Z', stage: 'group', group: 'I' },
    { home: 'Irak', away: 'Norveç', kickoff: '2026-06-16T22:00:00Z', stage: 'group', group: 'I' },
    { home: 'Arjantin', away: 'Cezayir', kickoff: '2026-06-17T01:00:00Z', stage: 'group', group: 'J' },
    { home: 'Avusturya', away: 'Ürdün', kickoff: '2026-06-17T04:00:00Z', stage: 'group', group: 'J' },
    // June 17 - Group K, L
    { home: 'Portekiz', away: 'DR Kongo', kickoff: '2026-06-17T17:00:00Z', stage: 'group', group: 'K' },
    { home: 'İngiltere', away: 'Hırvatistan', kickoff: '2026-06-17T20:00:00Z', stage: 'group', group: 'L' },
    { home: 'Gana', away: 'Panama', kickoff: '2026-06-17T23:00:00Z', stage: 'group', group: 'L' },
    { home: 'Özbekistan', away: 'Kolombiya', kickoff: '2026-06-18T02:00:00Z', stage: 'group', group: 'K' },

    // ===== MATCHDAY 2 =====
    // June 18 - Group A, B
    { home: 'Çekya', away: 'Güney Afrika', kickoff: '2026-06-18T16:00:00Z', stage: 'group', group: 'A' },
    { home: 'İsviçre', away: 'Bosna Hersek', kickoff: '2026-06-18T19:00:00Z', stage: 'group', group: 'B' },
    { home: 'Kanada', away: 'Katar', kickoff: '2026-06-18T22:00:00Z', stage: 'group', group: 'B' },
    { home: 'Meksika', away: 'Güney Kore', kickoff: '2026-06-19T03:00:00Z', stage: 'group', group: 'A' },
    // June 19 - Group C, D
    { home: 'ABD', away: 'Avustralya', kickoff: '2026-06-19T19:00:00Z', stage: 'group', group: 'D' },
    { home: 'İskoçya', away: 'Fas', kickoff: '2026-06-19T22:00:00Z', stage: 'group', group: 'C' },
    { home: 'Brezilya', away: 'Haiti', kickoff: '2026-06-20T01:00:00Z', stage: 'group', group: 'C' },
    { home: 'Türkiye', away: 'Paraguay', kickoff: '2026-06-20T04:00:00Z', stage: 'group', group: 'D' },
    // June 20 - Group E, F
    { home: 'Hollanda', away: 'İsveç', kickoff: '2026-06-20T17:00:00Z', stage: 'group', group: 'F' },
    { home: 'Almanya', away: 'Fildişi Sahili', kickoff: '2026-06-20T20:00:00Z', stage: 'group', group: 'E' },
    { home: 'Ekvador', away: 'Curaçao', kickoff: '2026-06-21T00:00:00Z', stage: 'group', group: 'E' },
    { home: 'Tunus', away: 'Japonya', kickoff: '2026-06-21T04:00:00Z', stage: 'group', group: 'F' },
    // June 21 - Group G, H
    { home: 'İspanya', away: 'Suudi Arabistan', kickoff: '2026-06-21T16:00:00Z', stage: 'group', group: 'H' },
    { home: 'Belçika', away: 'İran', kickoff: '2026-06-21T19:00:00Z', stage: 'group', group: 'G' },
    { home: 'Uruguay', away: 'Yeşil Burun Adaları', kickoff: '2026-06-21T22:00:00Z', stage: 'group', group: 'H' },
    { home: 'Yeni Zelanda', away: 'Mısır', kickoff: '2026-06-22T01:00:00Z', stage: 'group', group: 'G' },
    // June 22 - Group I, J
    { home: 'Arjantin', away: 'Avusturya', kickoff: '2026-06-22T17:00:00Z', stage: 'group', group: 'J' },
    { home: 'Fransa', away: 'Irak', kickoff: '2026-06-22T21:00:00Z', stage: 'group', group: 'I' },
    { home: 'Norveç', away: 'Senegal', kickoff: '2026-06-23T00:00:00Z', stage: 'group', group: 'I' },
    { home: 'Ürdün', away: 'Cezayir', kickoff: '2026-06-23T03:00:00Z', stage: 'group', group: 'J' },
    // June 23 - Group K, L
    { home: 'Portekiz', away: 'Özbekistan', kickoff: '2026-06-23T17:00:00Z', stage: 'group', group: 'K' },
    { home: 'İngiltere', away: 'Gana', kickoff: '2026-06-23T20:00:00Z', stage: 'group', group: 'L' },
    { home: 'Panama', away: 'Hırvatistan', kickoff: '2026-06-23T23:00:00Z', stage: 'group', group: 'L' },
    { home: 'Kolombiya', away: 'DR Kongo', kickoff: '2026-06-24T02:00:00Z', stage: 'group', group: 'K' },

    // ===== MATCHDAY 3 (eşzamanlı) =====
    // June 24 - Group A, B, C
    { home: 'İsviçre', away: 'Kanada', kickoff: '2026-06-24T19:00:00Z', stage: 'group', group: 'B' },
    { home: 'Bosna Hersek', away: 'Katar', kickoff: '2026-06-24T19:00:00Z', stage: 'group', group: 'B' },
    { home: 'İskoçya', away: 'Brezilya', kickoff: '2026-06-24T22:00:00Z', stage: 'group', group: 'C' },
    { home: 'Fas', away: 'Haiti', kickoff: '2026-06-24T22:00:00Z', stage: 'group', group: 'C' },
    { home: 'Çekya', away: 'Meksika', kickoff: '2026-06-25T01:00:00Z', stage: 'group', group: 'A' },
    { home: 'Güney Afrika', away: 'Güney Kore', kickoff: '2026-06-25T01:00:00Z', stage: 'group', group: 'A' },
    // June 25 - Group D, E, F
    { home: 'Ekvador', away: 'Almanya', kickoff: '2026-06-25T20:00:00Z', stage: 'group', group: 'E' },
    { home: 'Curaçao', away: 'Fildişi Sahili', kickoff: '2026-06-25T20:00:00Z', stage: 'group', group: 'E' },
    { home: 'Japonya', away: 'İsveç', kickoff: '2026-06-25T23:00:00Z', stage: 'group', group: 'F' },
    { home: 'Tunus', away: 'Hollanda', kickoff: '2026-06-25T23:00:00Z', stage: 'group', group: 'F' },
    { home: 'Türkiye', away: 'ABD', kickoff: '2026-06-26T02:00:00Z', stage: 'group', group: 'D' },
    { home: 'Paraguay', away: 'Avustralya', kickoff: '2026-06-26T02:00:00Z', stage: 'group', group: 'D' },
    // June 26 - Group G, H, I
    { home: 'Norveç', away: 'Fransa', kickoff: '2026-06-26T19:00:00Z', stage: 'group', group: 'I' },
    { home: 'Senegal', away: 'Irak', kickoff: '2026-06-26T19:00:00Z', stage: 'group', group: 'I' },
    { home: 'Yeşil Burun Adaları', away: 'Suudi Arabistan', kickoff: '2026-06-27T00:00:00Z', stage: 'group', group: 'H' },
    { home: 'Uruguay', away: 'İspanya', kickoff: '2026-06-27T00:00:00Z', stage: 'group', group: 'H' },
    { home: 'Mısır', away: 'İran', kickoff: '2026-06-27T03:00:00Z', stage: 'group', group: 'G' },
    { home: 'Yeni Zelanda', away: 'Belçika', kickoff: '2026-06-27T03:00:00Z', stage: 'group', group: 'G' },
    // June 27 - Group J, K, L
    { home: 'Panama', away: 'İngiltere', kickoff: '2026-06-27T21:00:00Z', stage: 'group', group: 'L' },
    { home: 'Hırvatistan', away: 'Gana', kickoff: '2026-06-27T21:00:00Z', stage: 'group', group: 'L' },
    { home: 'Kolombiya', away: 'Portekiz', kickoff: '2026-06-27T23:30:00Z', stage: 'group', group: 'K' },
    { home: 'DR Kongo', away: 'Özbekistan', kickoff: '2026-06-27T23:30:00Z', stage: 'group', group: 'K' },
    { home: 'Cezayir', away: 'Avusturya', kickoff: '2026-06-28T02:00:00Z', stage: 'group', group: 'J' },
    { home: 'Ürdün', away: 'Arjantin', kickoff: '2026-06-28T02:00:00Z', stage: 'group', group: 'J' },
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
  console.log('\nSunucuyu başlatmak için: node server.js');
}

seed().catch(console.error);
