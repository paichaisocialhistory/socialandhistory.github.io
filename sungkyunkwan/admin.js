// 성균관 역사 투어 - 선생님(관리자) 화면
(() => {
  'use strict';

  const CFG = window.TOUR_CONFIG || {};
  const T = window.TOUR;
  const API = String(CFG.SCRIPT_URL || '').trim();
  const PW_KEY = 'skk-admin-pw';
  const $ = (id) => document.getElementById(id);
  const esc = (s) => String(s == null ? '' : s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));

  const MISSIONS = T.stops.flatMap((s) => s.missions.map((m) => Object.assign({ stop: s }, m)));
  const SHORT_IDS = MISSIONS.filter((m) => m.stop.short).map((m) => m.id);
  const missionById = Object.fromEntries(MISSIONS.map((m) => [m.id, m]));

  let password = '';
  try { password = sessionStorage.getItem(PW_KEY) || ''; } catch (e) { /* 무시 */ }
  let data = null;
  let view = 'students';
  let tiles = []; // 라이트박스에서 넘겨 볼 순서
  let lbIndex = -1;
  const fullCache = new Map();

  async function api(action, payload) {
    if (!API) throw new Error('config.js의 SCRIPT_URL이 비어 있어요. SUNGKYUNKWAN.md를 보고 Apps Script를 연결해 주세요.');
    const res = await fetch(API, {
      method: 'POST',
      headers: { 'Content-Type': 'text/plain;charset=utf-8' },
      body: JSON.stringify(Object.assign({ action, password }, payload)),
    });
    const json = await res.json();
    if (!json.success) {
      const err = new Error(json.error || '서버 오류');
      err.auth = json.auth === false;
      throw err;
    }
    return json;
  }

  let toastTimer;
  function toast(msg) {
    const el = $('toast');
    el.textContent = msg;
    el.hidden = false;
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => { el.hidden = true; }, 2800);
  }

  // ---------- 로그인 ----------
  function showLogin(msg) {
    $('loginView').hidden = false;
    $('mainView').hidden = true;
    $('who').hidden = true;
    const err = $('loginError');
    err.textContent = msg || '';
    err.hidden = !msg;
  }

  $('loginForm').addEventListener('submit', async (e) => {
    e.preventDefault();
    password = e.target.password.value;
    const btn = e.target.querySelector('button');
    btn.disabled = true;
    try {
      await load();
      try { sessionStorage.setItem(PW_KEY, password); } catch (e2) { /* 무시 */ }
    } catch (err) {
      showLogin(err.message);
    }
    btn.disabled = false;
  });

  $('logoutBtn').addEventListener('click', () => {
    try { sessionStorage.removeItem(PW_KEY); } catch (e) { /* 무시 */ }
    password = '';
    data = null;
    showLogin();
  });

  // ---------- 불러오기 ----------
  let loading = false;
  async function load() {
    if (loading) return;
    loading = true;
    $('refreshBtn').disabled = true;
    $('refreshBtn').textContent = '불러오는 중…';
    try {
      data = await api('admin_list', {});
      $('loginView').hidden = true;
      $('mainView').hidden = false;
      $('who').hidden = false;
      $('folderLink').href = data.folderUrl;
      $('sheetLink').href = data.sheetUrl;
      $('updated').textContent = `${data.now} 기준 · 학생 ${data.students.length}명`;
      fillClassFilter();
      render();
    } finally {
      loading = false;
      $('refreshBtn').disabled = false;
      $('refreshBtn').textContent = '↻ 새로고침';
    }
  }

  // ---------- 계산 ----------
  function classOf(no) {
    const s = String(no);
    if (s.length === 4) return `${s[0]}-${Number(s[1])}`;
    if (s.length >= 5) return `${s[0]}-${Number(s.slice(1, 3))}`;
    return '기타';
  }
  function expectedOf(st) {
    let course = CFG.COURSE === 'short' ? 'short' : 'full';
    if (st.quiz && st.quiz.course === '30분') course = 'short';
    else if (st.quiz && st.quiz.course === '60분') course = 'full';
    else if (Object.keys(st.photos).some((id) => SHORT_IDS.indexOf(id) === -1)) course = 'full';
    return course === 'short' ? MISSIONS.filter((m) => m.stop.short) : MISSIONS;
  }
  const okCount = (st) => expectedOf(st).filter((m) => st.photos[m.id] && st.photos[m.id].status !== '다시찍기').length;

  function fillClassFilter() {
    const sel = $('classFilter');
    const cur = sel.value;
    const classes = [...new Set(data.students.map((s) => classOf(s.studentNo)))].sort((a, b) => a.localeCompare(b, 'ko', { numeric: true }));
    sel.innerHTML = '<option value="">모든 반</option>' + classes.map((c) => `<option value="${esc(c)}">${esc(c.replace('-', '학년 '))}반</option>`).join('');
    if (classes.indexOf(cur) !== -1) sel.value = cur;
  }

  function filtered() {
    const cls = $('classFilter').value;
    const q = $('search').value.trim();
    return data.students.filter((s) => (!cls || classOf(s.studentNo) === cls) && (!q || s.name.indexOf(q) !== -1 || s.studentNo.indexOf(q) !== -1));
  }
  const statusMatch = (p) => { const f = $('statusFilter').value; return !f || (p && p.status === f); };

  // ---------- 그리기 ----------
  function render() {
    if (!data) return;
    const list = filtered();
    renderStats(list);
    tiles = [];
    $('list').innerHTML = view === 'students' ? renderStudents(list) : renderMissions(list);
  }

  function renderStats(list) {
    const photos = list.flatMap((s) => Object.values(s.photos));
    const allDone = list.filter((s) => okCount(s) === expectedOf(s).length).length;
    const quizzed = list.filter((s) => s.quiz);
    const avg = quizzed.length ? Math.round(quizzed.reduce((n, s) => n + (Number(s.quiz.best) / (Number(s.quiz.total) || 1)), 0) / quizzed.length * 100) : null;
    const stat = (label, value, note) => `<div class="stat"><span>${label}</span><b>${value}</b>${note ? `<small>${note}</small>` : ''}</div>`;
    $('stats').innerHTML = [
      stat('접속한 학생', `${list.length}명`),
      stat('사진 미션 완료', `${allDone}명`),
      stat('확인 전 사진', `${photos.filter((p) => p.status === '제출').length}장`, `전체 ${photos.length}장`),
      stat('다시 찍기 요청', `${photos.filter((p) => p.status === '다시찍기').length}장`),
      stat('퀴즈 푼 학생', `${quizzed.length}명`, avg == null ? '' : `최고점 평균 ${avg}%`),
    ].join('');
  }

  function tile(st, m, showName) {
    const p = st.photos[m.id];
    if (!p) return `<div class="tile empty"><span>${esc(showName ? `${st.studentNo} ${st.name}` : m.label)}</span><small>미제출</small></div>`;
    const i = tiles.push({ st, m }) - 1;
    const badge = p.status === '확인' ? '<i class="badge ok">✅</i>' : p.status === '다시찍기' ? '<i class="badge redo">🔁</i>' : '<i class="badge new">새 사진</i>';
    return `
      <button class="tile st-${esc(p.status)}" type="button" data-tile="${i}" title="${esc(m.title)} · ${esc(p.time)}">
        ${p.thumb ? `<img src="${p.thumb}" alt="${esc(st.name)} ${esc(m.label)}" loading="lazy">` : '<span class="nothumb">미리보기 없음<br>눌러서 원본 보기</span>'}
        ${badge}
        <span class="cap">${esc(showName ? `${st.studentNo} ${st.name}` : m.label)} <small>${esc(p.time)}</small></span>
      </button>`;
  }

  function renderStudents(list) {
    const rows = list.filter((st) => !$('statusFilter').value || Object.values(st.photos).some(statusMatch));
    if (!rows.length) return '<p class="empty-msg">조건에 맞는 학생이 없어요.</p>';
    return rows.map((st) => {
      const exp = expectedOf(st);
      const ok = okCount(st);
      const q = st.quiz;
      const extra = MISSIONS.filter((m) => exp.indexOf(m) === -1 && st.photos[m.id]);
      return `
        <section class="student card">
          <div class="student-head">
            <h2 class="h2">${esc(st.studentNo)} ${esc(st.name)}</h2>
            <span class="pill ${ok === exp.length ? 'ok' : ''}">사진 ${ok}/${exp.length}</span>
            <span class="pill ${q ? 'gold' : ''}" ${q && q.wrong ? `title="최근 틀린 문제: ${esc(q.wrong)}"` : ''}>${q ? `퀴즈 최고 ${esc(q.best)}/${esc(q.total)} · 첫 ${esc(q.first)} · ${esc(q.attempts)}회` : '퀴즈 전'}</span>
          </div>
          <div class="tiles">${exp.concat(extra).filter((m) => statusMatch(st.photos[m.id])).map((m) => tile(st, m, false)).join('')}</div>
        </section>`;
    }).join('');
  }

  function renderMissions(list) {
    return MISSIONS.map((m) => {
      const withPhoto = list.filter((st) => st.photos[m.id] && statusMatch(st.photos[m.id]));
      const missing = $('statusFilter').value ? [] : list.filter((st) => !st.photos[m.id] && (expectedOf(st).indexOf(m) !== -1));
      return `
        <section class="card">
          <div class="student-head">
            <h2 class="h2">${m.stop.icon} ${esc(m.title)}</h2>
            <span class="pill">${withPhoto.length}장</span>
          </div>
          <p class="muted">${esc(m.guide)}</p>
          <div class="tiles">${withPhoto.map((st) => tile(st, m, true)).join('') || '<p class="muted">아직 없어요.</p>'}</div>
          ${missing.length ? `<p class="muted missing">미제출: ${missing.map((st) => esc(`${st.studentNo} ${st.name}`)).join(', ')}</p>` : ''}
        </section>`;
    }).join('');
  }

  // ---------- 라이트박스 ----------
  async function openTile(i) {
    lbIndex = i;
    const { st, m } = tiles[i];
    const p = st.photos[m.id];
    $('lightbox').hidden = false;
    document.body.style.overflow = 'hidden';
    $('lbMission').textContent = `${m.stop.name} · ${m.title}`;
    $('lbStudent').textContent = `${st.studentNo} ${st.name}`;
    $('lbTime').textContent = `${p.time} 제출 · 상태: ${p.status === '제출' ? '확인 전' : p.status}`;
    $('lbGuide').textContent = `미션: ${m.guide}`;
    $('lbMemo').value = p.memo || '';
    $('lbMsg').textContent = '';
    $('lbPrev').disabled = i === 0;
    $('lbNext').disabled = i === tiles.length - 1;
    document.querySelectorAll('[data-review]').forEach((b) => b.classList.toggle('on', b.dataset.review === p.status));
    const img = $('lbImg');
    img.src = p.thumb || '';
    img.alt = `${st.name} ${m.title}`;
    $('lbDownload').hidden = true;
    $('lbLoading').hidden = false;
    try {
      let url = fullCache.get(p.fileId);
      if (!url) {
        const res = await api('admin_photo', { fileId: p.fileId });
        url = `data:${res.mimeType || 'image/jpeg'};base64,${res.data}`;
        fullCache.set(p.fileId, url);
      }
      if (lbIndex !== i) return; // 그 사이 다른 사진으로 넘어감
      img.src = url;
      const dl = $('lbDownload');
      dl.href = url;
      dl.download = `${st.studentNo}_${st.name}_${m.label}.jpg`;
      dl.hidden = false;
    } catch (e) {
      if (lbIndex === i) $('lbMsg').textContent = `원본을 불러오지 못했어요: ${e.message}`;
    }
    if (lbIndex === i) $('lbLoading').hidden = true;
  }

  function closeLightbox() {
    $('lightbox').hidden = true;
    document.body.style.overflow = '';
    lbIndex = -1;
  }

  async function review(status) {
    const { st, m } = tiles[lbIndex];
    const p = st.photos[m.id];
    const memo = $('lbMemo').value.trim();
    $('lbMsg').textContent = '저장하는 중…';
    try {
      await api('admin_review', { key: st.key, missionId: m.id, status, memo });
      p.status = status;
      p.memo = memo;
      toast(status === '확인' ? `✅ ${st.name} · ${m.label} 확인` : `🔁 ${st.name}에게 다시 찍기 요청`);
      const cur = lbIndex;
      render();
      // 같은 사진의 새 위치를 찾아 다음 사진으로
      const idx = tiles.findIndex((t) => t.st === st && t.m === m);
      const next = idx === -1 ? Math.min(cur, tiles.length - 1) : idx + 1;
      if (next >= 0 && next < tiles.length) openTile(next);
      else closeLightbox();
    } catch (e) {
      $('lbMsg').textContent = `저장하지 못했어요: ${e.message}`;
    }
  }

  // ---------- 이벤트 ----------
  $('list').addEventListener('click', (e) => {
    const t = e.target.closest('[data-tile]');
    if (t) openTile(Number(t.dataset.tile));
  });
  document.querySelectorAll('[data-view]').forEach((b) => b.addEventListener('click', () => {
    view = b.dataset.view;
    document.querySelectorAll('[data-view]').forEach((x) => x.classList.toggle('on', x === b));
    render();
  }));
  ['classFilter', 'statusFilter'].forEach((id) => $(id).addEventListener('change', render));
  $('search').addEventListener('input', render);
  $('refreshBtn').addEventListener('click', () => load().catch((e) => toast(e.message)));
  $('lbClose').addEventListener('click', closeLightbox);
  $('lbPrev').addEventListener('click', () => lbIndex > 0 && openTile(lbIndex - 1));
  $('lbNext').addEventListener('click', () => lbIndex < tiles.length - 1 && openTile(lbIndex + 1));
  $('lightbox').addEventListener('click', (e) => { if (e.target.id === 'lightbox') closeLightbox(); });
  document.querySelectorAll('[data-review]').forEach((b) => b.addEventListener('click', () => review(b.dataset.review)));
  document.addEventListener('keydown', (e) => {
    if ($('lightbox').hidden || e.target.tagName === 'TEXTAREA') return;
    if (e.key === 'Escape') closeLightbox();
    if (e.key === 'ArrowLeft') $('lbPrev').click();
    if (e.key === 'ArrowRight') $('lbNext').click();
  });
  setInterval(() => {
    if ($('autoRefresh').checked && data && $('lightbox').hidden && !document.hidden) load().catch(() => {});
  }, 60000);

  // ---------- 시작 ----------
  if (!API) showLogin('config.js의 SCRIPT_URL이 비어 있어요. SUNGKYUNKWAN.md를 보고 Apps Script를 먼저 연결해 주세요.');
  else if (password) load().catch((e) => showLogin(e.auth ? '' : e.message));
  else showLogin();
})();
