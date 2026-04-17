// ==================== STATE ====================
let token = localStorage.getItem('token');
let currentUser = JSON.parse(localStorage.getItem('user') || 'null');
let currentPage = 'matches';
const API = '';

// ==================== API HELPERS ====================
async function api(path, options = {}) {
  const headers = { 'Content-Type': 'application/json' };
  if (token) headers['Authorization'] = `Bearer ${token}`;
  const res = await fetch(`${API}${path}`, { ...options, headers });
  const data = await res.json();
  if (res.status === 401) {
    // Token gecersiz veya DB sifirlandi - cikis yap
    logout();
    return;
  }
  if (!res.ok) {
    const err = new Error(data.error || 'Bir hata olustu');
    err.data = data;
    throw err;
  }
  return data;
}

// ==================== AUTH PAGES ====================
function hideAllAuthPages() {
  ['loginPage', 'registerPage'].forEach(id => {
    document.getElementById(id).classList.add('hidden');
  });
  clearAlerts();
}

function showLogin() {
  hideAllAuthPages();
  document.getElementById('loginPage').classList.remove('hidden');
}

function showRegister() {
  hideAllAuthPages();
  document.getElementById('registerPage').classList.remove('hidden');
}

function clearAlerts() {
  document.querySelectorAll('.alert').forEach(el => el.classList.add('hidden'));
}

// ==================== LOGIN ====================
async function handleLogin(e) {
  e.preventDefault();
  clearAlerts();
  try {
    const data = await api('/api/auth/login', {
      method: 'POST',
      body: JSON.stringify({
        email: document.getElementById('loginEmail').value,
        password: document.getElementById('loginPassword').value,
      }),
    });
    token = data.token;
    currentUser = data.user;
    localStorage.setItem('token', token);
    localStorage.setItem('user', JSON.stringify(currentUser));
    initApp();
  } catch (err) {
    const el = document.getElementById('loginError');
    el.textContent = err.message;
    el.classList.remove('hidden');
  }
}

// ==================== REGISTER ====================
async function handleRegister(e) {
  e.preventDefault();
  clearAlerts();
  const password = document.getElementById('regPassword').value;
  const passwordConfirm = document.getElementById('regPasswordConfirm').value;
  if (password !== passwordConfirm) {
    const el = document.getElementById('registerError');
    el.textContent = 'Sifreler eslesmiyor';
    el.classList.remove('hidden');
    return;
  }
  try {
    const data = await api('/api/auth/register', {
      method: 'POST',
      body: JSON.stringify({
        full_name: document.getElementById('regName').value,
        email: document.getElementById('regEmail').value,
        phone: document.getElementById('regPhone').value,
        password: password,
        password_confirm: passwordConfirm,
      }),
    });
    const el = document.getElementById('registerSuccess');
    el.textContent = data.message;
    el.classList.remove('hidden');
    document.getElementById('registerForm').reset();
  } catch (err) {
    const el = document.getElementById('registerError');
    el.textContent = err.message;
    el.classList.remove('hidden');
  }
}

// ==================== ZORUNLU SIFRE DEGISTIR ====================
async function handleMustChangePassword() {
  const newPw = document.getElementById('mcNewPassword').value;
  const newPwConfirm = document.getElementById('mcNewPasswordConfirm').value;
  const resultDiv = document.getElementById('mustChangeResult');

  if (!newPw || !newPwConfirm) {
    resultDiv.innerHTML = '<div class="alert alert-error">Tum alanlari doldurun</div>';
    return;
  }
  if (newPw.length < 6) {
    resultDiv.innerHTML = '<div class="alert alert-error">Sifre en az 6 karakter olmali</div>';
    return;
  }
  if (newPw !== newPwConfirm) {
    resultDiv.innerHTML = '<div class="alert alert-error">Sifreler eslesmiyor</div>';
    return;
  }
  try {
    // Sifre degistirmek icin mevcut (gecici) sifreyi bilmiyoruz
    // Ozel endpoint kullanalim
    await api('/api/auth/set-new-password', {
      method: 'POST',
      body: JSON.stringify({ new_password: newPw, new_password_confirm: newPwConfirm }),
    });
    currentUser.must_change_password = false;
    localStorage.setItem('user', JSON.stringify(currentUser));
    document.getElementById('mustChangePage').classList.add('hidden');
    initApp();
  } catch (err) {
    resultDiv.innerHTML = `<div class="alert alert-error">${err.message}</div>`;
  }
}

// ==================== SIFRE DEGISTIR ====================
function showChangePassword() {
  const modal = document.getElementById('modalContent');
  modal.innerHTML = `
    <h3 class="modal-title">Sifre Degistir</h3>
    <div id="changePwResult"></div>
    <div class="form-group">
      <label>Mevcut Sifre</label>
      <input type="password" class="form-control" id="cpCurrent" placeholder="••••••">
    </div>
    <div class="form-group">
      <label>Yeni Sifre (en az 6 karakter)</label>
      <input type="password" class="form-control" id="cpNew" placeholder="••••••">
    </div>
    <div class="form-group">
      <label>Yeni Sifre Tekrar</label>
      <input type="password" class="form-control" id="cpNewConfirm" placeholder="••••••">
    </div>
    <div class="modal-actions">
      <button class="btn" onclick="closeModal()">Iptal</button>
      <button class="btn btn-primary" onclick="changePassword()">Degistir</button>
    </div>
  `;
  document.getElementById('modalOverlay').classList.remove('hidden');
}

async function changePassword() {
  const current = document.getElementById('cpCurrent').value;
  const newPw = document.getElementById('cpNew').value;
  const newPwConfirm = document.getElementById('cpNewConfirm').value;
  const resultDiv = document.getElementById('changePwResult');

  if (!current || !newPw || !newPwConfirm) {
    resultDiv.innerHTML = '<div class="alert alert-error">Tum alanlari doldurun</div>';
    return;
  }
  if (newPw !== newPwConfirm) {
    resultDiv.innerHTML = '<div class="alert alert-error">Yeni sifreler eslesmiyor</div>';
    return;
  }
  try {
    const data = await api('/api/auth/change-password', {
      method: 'POST',
      body: JSON.stringify({ current_password: current, new_password: newPw, new_password_confirm: newPwConfirm }),
    });
    resultDiv.innerHTML = `<div class="alert alert-success">${data.message}</div>`;
    document.getElementById('cpCurrent').value = '';
    document.getElementById('cpNew').value = '';
    document.getElementById('cpNewConfirm').value = '';
  } catch (err) {
    resultDiv.innerHTML = `<div class="alert alert-error">${err.message}</div>`;
  }
}

// ==================== LOGOUT ====================
function logout() {
  token = null;
  currentUser = null;
  localStorage.removeItem('token');
  localStorage.removeItem('user');
  document.getElementById('authPage').classList.remove('hidden');
  document.getElementById('appPage').classList.add('hidden');
  document.getElementById('navbar').classList.add('hidden');
  // Mobil menüyü kapat
  document.getElementById('navLinks').classList.remove('mobile-open');
  window.history.replaceState({}, '', '/');
  showLogin();
}

// ==================== MOBILE MENU ====================
function toggleMobileMenu() {
  const nav = document.getElementById('navLinks');
  nav.classList.toggle('mobile-open');
}

// ==================== NAVIGATION ====================
function navigate(page) {
  currentPage = page;
  ['matchesPage', 'predictionsPage', 'leaderboardPage', 'adminPage', 'waitingPage', 'mustChangePage'].forEach(id => {
    document.getElementById(id).classList.add('hidden');
  });
  document.querySelectorAll('.navbar-nav a').forEach(a => a.classList.remove('active'));
  const navLink = document.querySelector(`[data-page="${page}"]`);
  if (navLink) navLink.classList.add('active');

  if (currentUser.status !== 'active' && currentUser.role !== 'admin') {
    document.getElementById('waitingPage').classList.remove('hidden');
    return;
  }

  document.getElementById(`${page}Page`).classList.remove('hidden');

  switch (page) {
    case 'matches': loadMatches(); break;
    case 'predictions': loadPredictions(); break;
    case 'leaderboard': loadLeaderboard(); break;
    case 'admin': loadAdminUsers(); break;
  }
}

// ==================== INIT ====================
function initApp() {
  document.getElementById('authPage').classList.add('hidden');
  document.getElementById('appPage').classList.remove('hidden');
  document.getElementById('navbar').classList.remove('hidden');

  // Sifre degistirmesi zorunluysa
  if (currentUser.must_change_password) {
    document.getElementById('mustChangePage').classList.remove('hidden');
    return;
  }

  document.getElementById('userInfo').textContent = `${currentUser.full_name} (${currentUser.total_points} puan)`;

  if (currentUser.role === 'admin') {
    document.getElementById('adminNavItem').classList.remove('hidden');
  } else {
    document.getElementById('adminNavItem').classList.add('hidden');
  }

  document.querySelectorAll('.navbar-nav a').forEach(a => {
    a.addEventListener('click', (e) => {
      e.preventDefault();
      document.getElementById('navLinks').classList.remove('mobile-open');
      navigate(a.dataset.page);
    });
  });

  navigate('matches');

  // Push bildirimleri baslat (arka planda)
  if (currentUser.status === 'active') {
    setTimeout(() => initPush(), 2000);
  }
}

// ==================== MATCHES ====================
const stageNames = {
  group: 'Süper Lig', r16: 'Son 16', qf: 'Çeyrek Final', sf: 'Yarı Final', final: 'Final',
};

const stageOrder = ['group', 'r16', 'qf', 'sf', 'final'];

function formatDate(dateStr) {
  const d = new Date(dateStr);
  return d.toLocaleDateString('tr-TR', { day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' });
}

async function loadMatches() {
  const list = document.getElementById('matchList');
  const empty = document.getElementById('matchEmpty');
  list.innerHTML = '<div class="spinner"></div>';
  empty.classList.add('hidden');

  try {
    const matches = await api('/api/matches');
    if (matches.length === 0) {
      list.innerHTML = '';
      empty.classList.remove('hidden');
      return;
    }

    const stages = [...new Set(matches.map(m => m.stage))];
    stages.sort((a, b) => stageOrder.indexOf(a) - stageOrder.indexOf(b));
    const tabsEl = document.getElementById('matchTabs');
    tabsEl.innerHTML = `<button class="tab active" onclick="filterMatches('all')">Tumu</button>` +
      stages.map(s => `<button class="tab" onclick="filterMatches('${s}')">${stageNames[s]}</button>`).join('');

    window._allMatches = matches;
    renderMatches(matches);
  } catch (err) {
    list.innerHTML = `<div class="alert alert-error">${err.message}</div>`;
  }
}

function filterMatches(stage) {
  document.querySelectorAll('#matchTabs .tab').forEach(t => t.classList.remove('active'));
  event.target.classList.add('active');
  if (stage === 'all') {
    renderMatches(window._allMatches);
  } else {
    renderMatches(window._allMatches.filter(m => m.stage === stage));
  }
}

function renderMatches(matches) {
  const list = document.getElementById('matchList');
  list.innerHTML = matches.map(m => {
    const statusBadge = `<span class="badge badge-${m.status}">${m.status === 'open' ? 'Acik' : m.status === 'locked' ? 'Kilitli' : 'Tamamlandi'}</span>`;
    const stageBadge = `<span class="match-stage">${stageNames[m.stage]}${m.group_name ? ' ' + m.group_name : ''}</span>`;

    let scoreCol = '';
    let actionCol = '';

    if (m.status === 'done') {
      // Tamamlanmis mac: gercek skor + kullanicinin tahmini + puan
      scoreCol = `
        <div class="row-score-result">
          <span class="row-real-score">${m.real_home_score} - ${m.real_away_score}</span>
          ${m.pred_home !== null
            ? `<span class="row-pred">Tahmin: ${m.pred_home}-${m.pred_away}</span>`
            : '<span class="row-pred">Tahmin yok</span>'}
        </div>`;
      actionCol = `
        ${m.pred_home !== null ? `<span class="prediction-result ${m.points_earned > 0 ? 'earned' : 'zero'}" style="margin:0;padding:4px 10px">${m.points_earned > 0 ? '+' + m.points_earned : '0'} p</span>` : ''}
        <button class="btn btn-accent btn-sm" onclick="showMatchPredictions('${m.id}', '${m.home_team}', '${m.away_team}')" style="margin-left:4px">Tahminler</button>
      `;
    } else if (m.status === 'locked') {
      // Kilitli mac: kullanicinin tahmini (varsa) + herkesin tahminlerini gor butonu
      scoreCol = m.pred_home !== null
        ? `<span class="row-pred-locked">Tahmin: ${m.pred_home} - ${m.pred_away}</span>`
        : `<span class="row-pred-locked">Tahmin yok</span>`;
      actionCol = `<button class="btn btn-accent btn-sm" onclick="showMatchPredictions('${m.id}', '${m.home_team}', '${m.away_team}')">Tahminler</button>`;
    } else if (m.pred_home !== null) {
      // Acik mac, tahmin var: guncelleme
      scoreCol = `
        <div class="row-input-group">
          <input type="number" class="row-score-input" id="home_${m.id}" min="0" max="20" value="${m.pred_home}">
          <span class="row-sep">-</span>
          <input type="number" class="row-score-input" id="away_${m.id}" min="0" max="20" value="${m.pred_away}">
        </div>`;
      actionCol = `<button class="btn btn-primary btn-sm" onclick="submitPrediction('${m.id}')">Guncelle</button>`;
    } else {
      // Acik mac, tahmin yok: yeni tahmin
      scoreCol = `
        <div class="row-input-group">
          <input type="number" class="row-score-input" id="home_${m.id}" min="0" max="20" value="0">
          <span class="row-sep">-</span>
          <input type="number" class="row-score-input" id="away_${m.id}" min="0" max="20" value="0">
        </div>`;
      actionCol = `<button class="btn btn-primary btn-sm" onclick="submitPrediction('${m.id}')">Kaydet</button>`;
    }

    return `
      <div class="match-row" data-stage="${m.stage}">
        <div class="match-row-info">
          <span class="match-row-date">${formatDate(m.kickoff_at)}</span>
          ${stageBadge} ${statusBadge}
        </div>
        <div class="match-row-teams">
          <span class="match-row-home">${m.home_team}</span>
          <span class="match-row-vs">vs</span>
          <span class="match-row-away">${m.away_team}</span>
        </div>
        <div class="match-row-score">${scoreCol}</div>
        <div class="match-row-action">${actionCol}</div>
      </div>
    `;
  }).join('');

  const saveAllBtn = `<div class="save-all-bar"><button class="btn btn-primary" onclick="saveAllPredictions()">Tum Tahminleri Kaydet</button></div>`;
  const hasOpenInputs = matches.some(m => m.status === 'open');
  if (hasOpenInputs) {
    list.innerHTML = saveAllBtn + list.innerHTML + saveAllBtn;
  }
}

async function saveAllPredictions() {
  const inputs = document.querySelectorAll('.match-row .row-score-input[id^="home_"]');
  let saved = 0, errors = 0;

  for (const homeEl of inputs) {
    const matchId = homeEl.id.replace('home_', '');
    const awayEl = document.getElementById(`away_${matchId}`);
    if (!awayEl) continue;

    const predHome = parseInt(homeEl.value);
    const predAway = parseInt(awayEl.value);
    if (isNaN(predHome) || isNaN(predAway) || predHome < 0 || predAway < 0) continue;

    try {
      await api('/api/predictions', {
        method: 'POST',
        body: JSON.stringify({ match_id: matchId, pred_home: predHome, pred_away: predAway }),
      });
      saved++;
    } catch (err) {
      errors++;
    }
  }

  alert(`${saved} tahmin kaydedildi` + (errors > 0 ? `, ${errors} atlandi (kilitli/hatali)` : ''));
  loadMatches();
}

async function submitPrediction(matchId) {
  const homeEl = document.getElementById(`home_${matchId}`);
  const awayEl = document.getElementById(`away_${matchId}`);
  const predHome = parseInt(homeEl.value);
  const predAway = parseInt(awayEl.value);

  if (isNaN(predHome) || isNaN(predAway) || predHome < 0 || predAway < 0) {
    alert('Lutfen gecerli bir skor giriniz');
    return;
  }

  try {
    await api('/api/predictions', {
      method: 'POST',
      body: JSON.stringify({ match_id: matchId, pred_home: predHome, pred_away: predAway }),
    });
    loadMatches();
  } catch (err) {
    alert(err.message);
  }
}

// ==================== PREDICTIONS ====================
async function loadPredictions() {
  const list = document.getElementById('predictionList');
  const empty = document.getElementById('predEmpty');
  const stats = document.getElementById('myStats');
  list.innerHTML = '<div class="spinner"></div>';
  empty.classList.add('hidden');

  try {
    const preds = await api('/api/predictions/me');
    if (preds.length === 0) {
      list.innerHTML = '';
      empty.classList.remove('hidden');
      stats.innerHTML = '';
      return;
    }

    const totalPts = preds.reduce((s, p) => s + (p.points_earned || 0), 0);
    const completed = preds.filter(p => p.match_status === 'done');
    const correct = completed.filter(p => p.points_earned > 0);

    stats.innerHTML = `
      <div class="stat-card"><div class="stat-value">${preds.length}</div><div class="stat-label">Toplam Tahmin</div></div>
      <div class="stat-card"><div class="stat-value">${totalPts}</div><div class="stat-label">Toplam Puan</div></div>
      <div class="stat-card"><div class="stat-value">${completed.length > 0 ? Math.round(correct.length / completed.length * 100) : 0}%</div><div class="stat-label">Basari Orani</div></div>
    `;

    list.innerHTML = '<div class="match-grid">' + preds.map(p => {
      const stageBadge = `<span class="match-stage">${stageNames[p.stage]}</span>`;
      const statusBadge = `<span class="badge badge-${p.match_status}">${p.match_status === 'open' ? 'Acik' : p.match_status === 'locked' ? 'Kilitli' : 'Bitti'}</span>`;

      let scoreCol = '';
      if (p.match_status === 'done') {
        scoreCol = `
          <div class="row-score-result">
            <span class="row-real-score">${p.real_home_score} - ${p.real_away_score}</span>
            <span class="row-pred">Tahmin: ${p.pred_home}-${p.pred_away}</span>
          </div>`;
      } else {
        scoreCol = `<span class="row-pred-locked">${p.pred_home} - ${p.pred_away}</span>`;
      }

      const pointsCol = p.match_status === 'done'
        ? `<span class="prediction-result ${p.points_earned > 0 ? 'earned' : 'zero'}" style="margin:0;padding:4px 10px">${p.points_earned > 0 ? '+' + p.points_earned : '0'} p</span>`
        : '';

      return `
        <div class="match-row">
          <div class="match-row-info">
            <span class="match-row-date">${formatDate(p.kickoff_at)}</span>
            ${stageBadge} ${statusBadge}
          </div>
          <div class="match-row-teams">
            <span class="match-row-home">${p.home_team}</span>
            <span class="match-row-vs">vs</span>
            <span class="match-row-away">${p.away_team}</span>
          </div>
          <div class="match-row-score">${scoreCol}</div>
          <div class="match-row-action">${pointsCol}</div>
        </div>
      `;
    }).join('') + '</div>';
  } catch (err) {
    list.innerHTML = `<div class="alert alert-error">${err.message}</div>`;
  }
}

// ==================== LEADERBOARD ====================
async function loadLeaderboard() {
  const list = document.getElementById('leaderboardList');
  const empty = document.getElementById('lbEmpty');
  list.innerHTML = '<div class="spinner"></div>';
  empty.classList.add('hidden');

  try {
    const lb = await api('/api/leaderboard');
    if (lb.length === 0) {
      list.innerHTML = '';
      empty.classList.remove('hidden');
      return;
    }

    list.innerHTML = lb.map(u => {
      const rankClass = u.rank <= 3 ? `rank-${u.rank}` : 'rank-default';
      const isMe = u.id === currentUser.id ? 'leaderboard-me' : '';
      return `
        <div class="leaderboard-item ${isMe}">
          <div class="leaderboard-rank ${rankClass}">${u.rank}</div>
          <div class="leaderboard-name">${u.full_name}${u.id === currentUser.id ? ' (Sen)' : ''}</div>
          <div class="leaderboard-predictions">${u.prediction_count} tahmin</div>
          <div class="leaderboard-points">${u.total_points}</div>
        </div>
      `;
    }).join('');
  } catch (err) {
    list.innerHTML = `<div class="alert alert-error">${err.message}</div>`;
  }
}

// ==================== ADMIN ====================
function showAdminTab(tab) {
  document.querySelectorAll('#adminPage .tabs .tab').forEach(t => t.classList.remove('active'));
  event.target.classList.add('active');
  ['adminUsers', 'adminMatches', 'adminScoring', 'adminAdmins', 'adminNotify'].forEach(id => document.getElementById(id).classList.add('hidden'));

  if (tab === 'users') { document.getElementById('adminUsers').classList.remove('hidden'); loadAdminUsers(); }
  if (tab === 'matches') { document.getElementById('adminMatches').classList.remove('hidden'); loadAdminMatches(); }
  if (tab === 'scoring') { document.getElementById('adminScoring').classList.remove('hidden'); loadScoringParams(); }
  if (tab === 'admins') { document.getElementById('adminAdmins').classList.remove('hidden'); loadAdmins(); }
  if (tab === 'notify') { document.getElementById('adminNotify').classList.remove('hidden'); }
}

async function loadAdminUsers() {
  const tbody = document.getElementById('adminUserList');
  try {
    const users = await api('/api/admin/users');
    tbody.innerHTML = users.map(u => `
      <tr>
        <td><strong>${u.full_name}</strong></td>
        <td>${u.email}</td>
        <td>${u.phone}</td>
        <td><span class="badge badge-${u.status}">${u.status === 'waiting' ? 'Beklemede' : u.status === 'active' ? 'Aktif' : 'Pasif'}</span></td>
        <td>${u.prediction_count}</td>
        <td><strong>${u.total_points}</strong></td>
        <td>
          <select class="form-control" style="width:auto;padding:4px 8px;font-size:12px;display:inline-block" onchange="changeUserStatus('${u.id}', this.value)">
            <option value="waiting" ${u.status === 'waiting' ? 'selected' : ''}>Beklemede</option>
            <option value="active" ${u.status === 'active' ? 'selected' : ''}>Aktif</option>
            <option value="passive" ${u.status === 'passive' ? 'selected' : ''}>Pasif</option>
          </select>
          <button class="btn btn-accent btn-sm" style="margin-left:4px" onclick="resetUserPassword('${u.id}', '${u.full_name}')">Sifre Sifirla</button>
        </td>
      </tr>
    `).join('');
  } catch (err) {
    tbody.innerHTML = `<tr><td colspan="7" class="alert alert-error">${err.message}</td></tr>`;
  }
}

async function resetUserPassword(userId, fullName) {
  if (!confirm(`${fullName} icin sifre sifirlanacak. Emin misiniz?`)) return;
  try {
    const data = await api(`/api/admin/users/${userId}/reset-password`, { method: 'POST' });
    alert(`${fullName} icin yeni sifre:\n\n${data.newPassword}\n\nBu sifreyi kullaniciya iletin.`);
  } catch (err) {
    alert(err.message);
  }
}

async function changeUserStatus(userId, status) {
  try {
    await api(`/api/admin/users/${userId}/status`, {
      method: 'PATCH',
      body: JSON.stringify({ status }),
    });
    loadAdminUsers();
  } catch (err) {
    alert(err.message);
  }
}

async function loadAdminMatches() {
  const tbody = document.getElementById('adminMatchList');
  try {
    const matches = await api('/api/admin/matches');
    tbody.innerHTML = matches.map(m => `
      <tr>
        <td><strong>${m.home_team}</strong> vs <strong>${m.away_team}</strong></td>
        <td>${formatDate(m.kickoff_at)}</td>
        <td><span class="match-stage">${stageNames[m.stage]}</span></td>
        <td><span class="badge badge-${m.status}">${m.status === 'open' ? 'Acik' : m.status === 'locked' ? 'Kilitli' : 'Tamamlandi'}</span></td>
        <td>${m.status === 'done' ? `<strong>${m.real_home_score} - ${m.real_away_score}</strong>` : '-'}</td>
        <td>${m.prediction_count}</td>
        <td>
          ${m.status !== 'done' ? `<button class="btn btn-success btn-sm" onclick="showResultModal('${m.id}', '${m.home_team}', '${m.away_team}')">Sonuc Gir</button>` : ''}
          ${m.status !== 'done' ? `<button class="btn btn-danger btn-sm" onclick="deleteMatch('${m.id}')" style="margin-left:4px">Sil</button>` : ''}
        </td>
      </tr>
    `).join('');
  } catch (err) {
    tbody.innerHTML = `<tr><td colspan="7" class="alert alert-error">${err.message}</td></tr>`;
  }
}

function showAddMatchModal() {
  const modal = document.getElementById('modalContent');
  modal.innerHTML = `
    <h3 class="modal-title">Yeni Mac Ekle</h3>
    <div class="form-group">
      <label>Ev Sahibi Takim</label>
      <input type="text" class="form-control" id="mHome" placeholder="Orn: Turkiye">
    </div>
    <div class="form-group">
      <label>Deplasman Takimi</label>
      <input type="text" class="form-control" id="mAway" placeholder="Orn: Brezilya">
    </div>
    <div class="form-group">
      <label>Baslama Tarihi/Saati (UTC)</label>
      <input type="datetime-local" class="form-control" id="mKickoff">
    </div>
    <div class="form-group">
      <label>Asama</label>
      <select class="form-control" id="mStage">
        <option value="group">Süper Lig</option>
        <option value="r16">Son 16</option>
        <option value="qf">Çeyrek Final</option>
        <option value="sf">Yarı Final</option>
        <option value="final">Final</option>
      </select>
    </div>
    <div class="form-group">
      <label>Grup Adi (opsiyonel)</label>
      <input type="text" class="form-control" id="mGroup" placeholder="Orn: A">
    </div>
    <div class="modal-actions">
      <button class="btn" onclick="closeModal()">Iptal</button>
      <button class="btn btn-primary" onclick="addMatch()">Ekle</button>
    </div>
  `;
  document.getElementById('modalOverlay').classList.remove('hidden');
}

async function addMatch() {
  const home = document.getElementById('mHome').value;
  const away = document.getElementById('mAway').value;
  const kickoff = document.getElementById('mKickoff').value;
  const stage = document.getElementById('mStage').value;
  const group = document.getElementById('mGroup').value;

  if (!home || !away || !kickoff) { alert('Zorunlu alanlari doldurun'); return; }

  try {
    await api('/api/admin/matches', {
      method: 'POST',
      body: JSON.stringify({
        home_team: home,
        away_team: away,
        kickoff_at: new Date(kickoff).toISOString(),
        stage,
        group_name: group || null,
      }),
    });
    closeModal();
    loadAdminMatches();
  } catch (err) {
    alert(err.message);
  }
}

function showResultModal(matchId, home, away) {
  const modal = document.getElementById('modalContent');
  modal.innerHTML = `
    <h3 class="modal-title">Sonuc Gir</h3>
    <p style="margin-bottom:16px"><strong>${home}</strong> vs <strong>${away}</strong></p>
    <div class="score-input-group">
      <div>
        <label style="font-size:12px;text-align:center;display:block">${home}</label>
        <input type="number" class="score-input" id="rHome" min="0" value="0">
      </div>
      <span class="score-separator">-</span>
      <div>
        <label style="font-size:12px;text-align:center;display:block">${away}</label>
        <input type="number" class="score-input" id="rAway" min="0" value="0">
      </div>
    </div>
    <div class="modal-actions">
      <button class="btn" onclick="closeModal()">Iptal</button>
      <button class="btn btn-success" onclick="submitResult('${matchId}')">Kaydet & Puanla</button>
    </div>
  `;
  document.getElementById('modalOverlay').classList.remove('hidden');
}

async function submitResult(matchId) {
  const home = parseInt(document.getElementById('rHome').value);
  const away = parseInt(document.getElementById('rAway').value);
  if (isNaN(home) || isNaN(away) || home < 0 || away < 0) { alert('Gecerli skor girin'); return; }

  try {
    await api(`/api/admin/matches/${matchId}/result`, {
      method: 'PATCH',
      body: JSON.stringify({ real_home_score: home, real_away_score: away }),
    });
    closeModal();
    loadAdminMatches();
  } catch (err) {
    alert(err.message);
  }
}

async function deleteMatch(matchId) {
  if (!confirm('Bu maci silmek istediginize emin misiniz?')) return;
  try {
    await api(`/api/admin/matches/${matchId}`, { method: 'DELETE' });
    loadAdminMatches();
  } catch (err) {
    alert(err.message);
  }
}

async function loadScoringParams() {
  const container = document.getElementById('scoringParams');
  try {
    const params = await api('/api/admin/scoring-params');
    container.innerHTML = `
      <div class="table-wrapper">
        <table>
          <thead>
            <tr>
              <th>Asama</th>
              <th>Dogru Sonuc (1/X/2)</th>
              <th>Dogru Tam Skor</th>
              <th>Dogru Alt/Ust</th>
              <th>Alt/Ust Esigi</th>
              <th>Islem</th>
            </tr>
          </thead>
          <tbody>
            ${params.map(p => `
              <tr>
                <td><strong>${stageNames[p.stage]}</strong></td>
                <td><input type="number" class="form-control" style="width:80px" id="sp_result_${p.stage}" value="${p.correct_result_pts}" min="0"></td>
                <td><input type="number" class="form-control" style="width:80px" id="sp_score_${p.stage}" value="${p.correct_score_pts}" min="0"></td>
                <td><input type="number" class="form-control" style="width:80px" id="sp_ou_${p.stage}" value="${p.correct_ou_pts}" min="0"></td>
                <td><input type="number" class="form-control" style="width:80px" id="sp_threshold_${p.stage}" value="${p.ou_threshold}" min="0" step="0.5"></td>
                <td><button class="btn btn-primary btn-sm" onclick="saveScoringParam('${p.stage}')">Kaydet</button></td>
              </tr>
            `).join('')}
          </tbody>
        </table>
      </div>
    `;
  } catch (err) {
    container.innerHTML = `<div class="alert alert-error">${err.message}</div>`;
  }
}

async function saveScoringParam(stage) {
  const result = parseInt(document.getElementById(`sp_result_${stage}`).value);
  const score = parseInt(document.getElementById(`sp_score_${stage}`).value);
  const ou = parseInt(document.getElementById(`sp_ou_${stage}`).value);
  const threshold = parseFloat(document.getElementById(`sp_threshold_${stage}`).value);

  try {
    await api(`/api/admin/scoring-params/${stage}`, {
      method: 'PUT',
      body: JSON.stringify({
        correct_result_pts: result,
        correct_score_pts: score,
        correct_ou_pts: ou,
        ou_threshold: threshold,
      }),
    });
    alert('Parametreler guncellendi');
  } catch (err) {
    alert(err.message);
  }
}

// ==================== MATCH PREDICTIONS (PUBLIC) ====================
async function showMatchPredictions(matchId, home, away) {
  const modal = document.getElementById('modalContent');
  modal.innerHTML = '<div class="spinner"></div>';
  document.getElementById('modalOverlay').classList.remove('hidden');

  try {
    const preds = await api(`/api/matches/${matchId}/predictions`);
    if (preds.length === 0) {
      modal.innerHTML = `
        <h3 class="modal-title">${home} vs ${away}</h3>
        <div class="empty-state">Henuz kimse tahmin yapmamis.</div>
        <div class="modal-actions"><button class="btn" onclick="closeModal()">Kapat</button></div>
      `;
      return;
    }

    modal.innerHTML = `
      <h3 class="modal-title">${home} vs ${away} - Tahminler</h3>
      <div class="table-wrapper">
        <table>
          <thead>
            <tr>
              <th>Kullanici</th>
              <th style="text-align:center">Tahmin</th>
              <th style="text-align:center">Puan</th>
            </tr>
          </thead>
          <tbody>
            ${preds.map(p => `
              <tr>
                <td><strong>${p.full_name}</strong></td>
                <td style="text-align:center">${p.pred_home} - ${p.pred_away}</td>
                <td style="text-align:center">${p.points_earned !== null ? `<span class="${p.points_earned > 0 ? 'badge badge-active' : 'badge badge-passive'}">${p.points_earned} puan</span>` : '<span class="badge badge-locked">Bekliyor</span>'}</td>
              </tr>
            `).join('')}
          </tbody>
        </table>
      </div>
      <div class="modal-actions"><button class="btn" onclick="closeModal()">Kapat</button></div>
    `;
  } catch (err) {
    modal.innerHTML = `
      <h3 class="modal-title">${home} vs ${away}</h3>
      <div class="alert alert-error">${err.message}</div>
      <div class="modal-actions"><button class="btn" onclick="closeModal()">Kapat</button></div>
    `;
  }
}

// ==================== EXPORT ====================
function exportCSV(type) {
  fetch(`/api/admin/export/${type}`, {
    headers: { 'Authorization': `Bearer ${token}` }
  })
  .then(res => {
    if (!res.ok) throw new Error('Export basarisiz');
    return res.blob();
  })
  .then(blob => {
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = type === 'predictions' ? 'tahminler.csv' : 'siralama.csv';
    a.click();
    URL.revokeObjectURL(url);
  })
  .catch(err => alert(err.message));
}

// ==================== ADMIN MANAGEMENT ====================
async function loadAdmins() {
  const tbody = document.getElementById('adminAdminList');
  try {
    const admins = await api('/api/admin/admins');
    tbody.innerHTML = admins.map(a => `
      <tr>
        <td><strong>${a.full_name}</strong></td>
        <td>${a.email}</td>
        <td>${a.phone}</td>
        <td>${formatDate(a.created_at)}</td>
        <td>
          ${a.id !== currentUser.id
            ? `<button class="btn btn-danger btn-sm" onclick="removeAdmin('${a.id}')">Yetkiyi Kaldir</button>`
            : '<span class="badge badge-active">Sen</span>'}
        </td>
      </tr>
    `).join('');
  } catch (err) {
    tbody.innerHTML = `<tr><td colspan="5" class="alert alert-error">${err.message}</td></tr>`;
  }
}

async function addAdmin() {
  const email = document.getElementById('newAdminEmail').value.trim();
  const resultDiv = document.getElementById('adminAddResult');
  if (!email) { alert('E-posta giriniz'); return; }
  try {
    const data = await api('/api/admin/admins', {
      method: 'POST',
      body: JSON.stringify({ email }),
    });
    resultDiv.innerHTML = `<div class="alert alert-success">${data.message}</div>`;
    document.getElementById('newAdminEmail').value = '';
    loadAdmins();
  } catch (err) {
    resultDiv.innerHTML = `<div class="alert alert-error">${err.message}</div>`;
  }
}

async function removeAdmin(adminId) {
  if (!confirm('Bu kullanicinin admin yetkisini kaldirmak istediginize emin misiniz?')) return;
  try {
    await api(`/api/admin/admins/${adminId}`, { method: 'DELETE' });
    loadAdmins();
  } catch (err) {
    alert(err.message);
  }
}

// ==================== MODAL ====================
function closeModal(e) {
  if (e && e.target !== e.currentTarget) return;
  document.getElementById('modalOverlay').classList.add('hidden');
}

// ==================== PUSH NOTIFICATIONS ====================
async function initPush() {
  if (!('serviceWorker' in navigator) || !('PushManager' in window)) return;
  try {
    // Service worker kaydet
    const reg = await navigator.serviceWorker.register('/sw.js');

    // VAPID key al
    let vapidResp;
    try { vapidResp = await api('/api/push/vapid-key'); } catch(e) { return; }
    const vapidKey = vapidResp.publicKey;

    // Mevcut aboneliği kontrol et
    const existingSub = await reg.pushManager.getSubscription();
    if (existingSub) {
      // Zaten abone, backend'e bildiriyoruz (token yenilenmiş olabilir)
      await api('/api/push/subscribe', { method: 'POST', body: JSON.stringify({ subscription: existingSub }) });
      return;
    }

    // İzin iste
    const permission = await Notification.requestPermission();
    if (permission !== 'granted') return;

    // Abone ol
    const sub = await reg.pushManager.subscribe({
      userVisibleOnly: true,
      applicationServerKey: urlBase64ToUint8Array(vapidKey),
    });

    await api('/api/push/subscribe', { method: 'POST', body: JSON.stringify({ subscription: sub }) });
  } catch(e) {
    console.log('[PUSH] Bildirim hatasi:', e.message);
  }
}

function urlBase64ToUint8Array(base64String) {
  const padding = '='.repeat((4 - base64String.length % 4) % 4);
  const base64 = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/');
  const rawData = atob(base64);
  const outputArray = new Uint8Array(rawData.length);
  for (let i = 0; i < rawData.length; i++) outputArray[i] = rawData.charCodeAt(i);
  return outputArray;
}

async function sendPushNotification() {
  const title = document.getElementById('pushTitle').value.trim();
  const body = document.getElementById('pushBody').value.trim();
  const resultDiv = document.getElementById('pushResult');
  if (!title || !body) {
    resultDiv.innerHTML = '<div class="alert alert-error">Başlık ve mesaj zorunludur</div>';
    return;
  }
  try {
    const data = await api('/api/admin/push/notify', {
      method: 'POST',
      body: JSON.stringify({ title, body }),
    });
    resultDiv.innerHTML = `<div class="alert alert-success">${data.message}</div>`;
    document.getElementById('pushTitle').value = '';
    document.getElementById('pushBody').value = '';
  } catch(err) {
    resultDiv.innerHTML = `<div class="alert alert-error">${err.message}</div>`;
  }
}

// ==================== INIT ====================
document.addEventListener('DOMContentLoaded', () => {
  if (token && currentUser) {
    initApp();
  } else {
    showLogin();
  }
});
