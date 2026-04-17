const https = require('https');
const { processMatchResults } = require('./scoring');

const API_KEY = () => process.env.FOOTBALL_API_KEY;

// Türkçe karakter dahil normalize
function normalize(name) {
  return name
    .toLowerCase()
    .replace(/ü/g, 'u').replace(/ö/g, 'o').replace(/ç/g, 'c')
    .replace(/ş/g, 's').replace(/ı/g, 'i').replace(/ğ/g, 'g')
    .normalize('NFD').replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9\s]/g, '').trim();
}

function firstWord(name) {
  return normalize(name).split(/\s+/)[0];
}

// İki takım adının eşleşip eşleşmediğini kontrol et
function teamsMatch(dbHome, dbAway, apiHome, apiAway) {
  const dbH = firstWord(dbHome);
  const dbA = firstWord(dbAway);
  const apiH = firstWord(apiHome);
  const apiA = firstWord(apiAway);

  const homeOk = dbH === apiH || dbH.includes(apiH) || apiH.includes(dbH);
  const awayOk = dbA === apiA || dbA.includes(apiA) || apiA.includes(dbA);
  return homeOk && awayOk;
}

// API-Football'dan belirli bir tarih için maçları çek
function fetchFixtures(dateStr) {
  return new Promise((resolve, reject) => {
    const options = {
      hostname: 'v3.football.api-sports.io',
      path: `/fixtures?date=${dateStr}`,
      headers: {
        'x-apisports-key': API_KEY(),
        'Accept': 'application/json',
      }
    };

    https.get(options, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        try {
          const parsed = JSON.parse(data);
          if (parsed.errors && Object.keys(parsed.errors).length > 0) {
            console.error('[AUTO-SCORE] API hatasi:', JSON.stringify(parsed.errors));
            resolve([]);
          } else {
            resolve(parsed.response || []);
          }
        } catch (e) {
          reject(new Error('API yaniti ayristirilamadi: ' + e.message));
        }
      });
    }).on('error', reject);
  });
}

// Asıl skorlama fonksiyonu - cron tarafından çağrılır
async function autoFetchScores(db) {
  if (!API_KEY()) return; // API key yoksa sessizce atla

  // 2.5 saat öncesinden önce başlamış, hâlâ kilitli maçları bul
  const cutoff = new Date(Date.now() - 2.5 * 60 * 60 * 1000).toISOString();
  const pending = db.prepare(
    "SELECT * FROM matches WHERE status = 'locked' AND kickoff_at <= ?"
  ).all(cutoff);

  if (pending.length === 0) return;

  // Tarihe göre grupla (UTC tarih)
  const byDate = {};
  for (const m of pending) {
    const date = m.kickoff_at.substring(0, 10); // YYYY-MM-DD
    if (!byDate[date]) byDate[date] = [];
    byDate[date].push(m);
  }

  for (const [date, matches] of Object.entries(byDate)) {
    let fixtures;
    try {
      fixtures = await fetchFixtures(date);
    } catch (e) {
      console.error(`[AUTO-SCORE] ${date} tarihli maçlar alinamadi:`, e.message);
      continue;
    }

    // Sadece bitmiş maçlar
    const finished = fixtures.filter(f =>
      ['FT', 'AET', 'PEN'].includes(f.fixture?.status?.short)
    );

    for (const dbMatch of matches) {
      const found = finished.find(f =>
        teamsMatch(dbMatch.home_team, dbMatch.away_team, f.teams?.home?.name, f.teams?.away?.name)
      );

      if (!found) continue;

      // Berabere bitip uzayan maçlarda 90. dk skorunu al (fulltime)
      // FT → goals zaten 90. dk, AET/PEN → score.fulltime'a bak
      const status = found.fixture.status.short;
      let homeScore, awayScore;

      if (status === 'FT') {
        homeScore = found.goals.home;
        awayScore = found.goals.away;
      } else {
        // AET veya PEN - 90 dk skoru
        homeScore = found.score?.fulltime?.home ?? found.goals.home;
        awayScore = found.score?.fulltime?.away ?? found.goals.away;
      }

      if (homeScore === null || awayScore === null) continue;

      // DB'ye yaz ve puanları hesapla
      db.prepare(
        "UPDATE matches SET real_home_score = ?, real_away_score = ?, status = 'done' WHERE id = ?"
      ).run(homeScore, awayScore, dbMatch.id);

      processMatchResults(db, dbMatch.id);

      console.log(
        `[AUTO-SCORE] ${dbMatch.home_team} ${homeScore}-${awayScore} ${dbMatch.away_team}` +
        (status !== 'FT' ? ` (${status}, 90dk skoru alindi)` : '')
      );
    }
  }
}

module.exports = { autoFetchScores };
