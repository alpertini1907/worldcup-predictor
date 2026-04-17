const fs = require('fs');
const path = require('path');
const https = require('https');

const DB_PATH = path.join(__dirname, 'worldcup.db');

function githubRequest(method, filePath, body = null) {
  const token = process.env.GITHUB_TOKEN;
  const repo = process.env.GITHUB_REPO; // "owner/repo"

  if (!token || !repo) {
    return Promise.reject(new Error('GITHUB_TOKEN veya GITHUB_REPO env degiskeni eksik'));
  }

  return new Promise((resolve, reject) => {
    const bodyStr = body ? JSON.stringify(body) : null;
    const options = {
      hostname: 'api.github.com',
      path: `/repos/${repo}/contents/${filePath}`,
      method,
      headers: {
        'Authorization': `token ${token}`,
        'User-Agent': 'worldcup-predictor-app',
        'Content-Type': 'application/json',
        'Accept': 'application/vnd.github.v3+json',
      }
    };
    if (bodyStr) options.headers['Content-Length'] = Buffer.byteLength(bodyStr);

    const req = https.request(options, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        try {
          const parsed = JSON.parse(data);
          resolve({ status: res.statusCode, data: parsed });
        } catch (e) {
          reject(new Error('GitHub API yaniti ayristirilamadi'));
        }
      });
    });

    req.on('error', reject);
    if (bodyStr) req.write(bodyStr);
    req.end();
  });
}

function downloadUrl(url) {
  return new Promise((resolve, reject) => {
    https.get(url, { headers: { 'User-Agent': 'worldcup-predictor-app' } }, (res) => {
      const chunks = [];
      res.on('data', chunk => chunks.push(chunk));
      res.on('end', () => resolve(Buffer.concat(chunks)));
    }).on('error', reject);
  });
}

async function backupDb() {
  if (!fs.existsSync(DB_PATH)) {
    throw new Error('Veritabani dosyasi bulunamadi');
  }

  const content = fs.readFileSync(DB_PATH);
  const base64Content = content.toString('base64');

  // Mevcut SHA'yi al (guncelleme icin gerekli)
  let sha = null;
  const getResult = await githubRequest('GET', 'worldcup.db');
  if (getResult.status === 200 && getResult.data.sha) {
    sha = getResult.data.sha;
  }

  const body = {
    message: `DB backup ${new Date().toISOString()}`,
    content: base64Content,
  };
  if (sha) body.sha = sha;

  const putResult = await githubRequest('PUT', 'worldcup.db', body);
  if (putResult.status !== 200 && putResult.status !== 201) {
    throw new Error(putResult.data.message || 'GitHub push basarisiz');
  }

  console.log('[BACKUP] Veritabani GitHub\'a kaydedildi.');
  return { message: 'Veritabani GitHub\'a basariyla kaydedildi' };
}

async function restoreDb() {
  const token = process.env.GITHUB_TOKEN;
  const repo = process.env.GITHUB_REPO;
  if (!token || !repo) {
    console.log('[BACKUP] GITHUB_TOKEN/GITHUB_REPO tanimli degil, atlaniyor.');
    return false;
  }

  try {
    const result = await githubRequest('GET', 'worldcup.db');
    if (result.status === 404) {
      console.log('[BACKUP] GitHub\'da veritabani yok, sifirdan baslanacak.');
      return false;
    }
    if (result.status !== 200) {
      console.log('[BACKUP] GitHub API hatasi:', result.status);
      return false;
    }

    let fileBuffer;
    if (result.data.content) {
      // 1MB alti: inline base64
      fileBuffer = Buffer.from(result.data.content.replace(/\n/g, ''), 'base64');
    } else if (result.data.download_url) {
      // 1MB ustu: download_url
      fileBuffer = await downloadUrl(result.data.download_url);
    } else {
      return false;
    }

    fs.writeFileSync(DB_PATH, fileBuffer);
    console.log('[BACKUP] Veritabani GitHub\'dan geri yuklendi (' + fileBuffer.length + ' byte).');
    return true;
  } catch (e) {
    console.log('[BACKUP] Geri yukleme hatasi:', e.message);
    return false;
  }
}

module.exports = { backupDb, restoreDb };
