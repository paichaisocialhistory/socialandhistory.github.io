// 성균관 역사 투어 - 학생 화면
(() => {
  'use strict';

  const CFG = window.TOUR_CONFIG || {};
  const T = window.TOUR;
  const API = String(CFG.SCRIPT_URL || '').trim();
  const STORE = 'skk-tour-v1';
  const app = document.getElementById('app');
  const params = new URLSearchParams(location.search);
  const urlCourse = params.get('course') === 'short' ? 'short' : params.get('course') === 'full' ? 'full' : null;

  const esc = (s) => String(s == null ? '' : s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));

  // ---------- 저장 ----------
  let state = load();
  function load() {
    try { return JSON.parse(localStorage.getItem(STORE)) || null; } catch (e) { return null; }
  }
  function save() {
    try { localStorage.setItem(STORE, JSON.stringify(state)); } catch (e) {
      // 저장 공간이 꽉 찼으면 미리보기 사진을 빼고 다시 저장
      try {
        const slim = JSON.parse(JSON.stringify(state));
        Object.values(slim.photos || {}).forEach((p) => { delete p.thumb; });
        localStorage.setItem(STORE, JSON.stringify(slim));
      } catch (e2) { /* 저장 못 해도 화면은 계속 */ }
    }
  }

  // ---------- 코스·미션 ----------
  const course = () => (state && state.course) || urlCourse || (CFG.COURSE === 'short' ? 'short' : 'full');
  const stops = () => T.stops.filter((s) => course() === 'full' || s.short);
  const missions = () => stops().flatMap((s) => s.missions.map((m) => Object.assign({ stop: s }, m)));
  const photoOf = (id) => (state && state.photos && state.photos[id]) || null;
  const isDone = (id) => { const p = photoOf(id); return !!(p && p.uploaded && p.status !== '다시찍기'); };
  const doneCount = () => missions().filter((m) => isDone(m.id)).length;
  const allDone = () => missions().length > 0 && doneCount() === missions().length;
  const stopDone = (s) => s.missions.length > 0 && s.missions.every((m) => isDone(m.id));

  // 올리는 중이거나 실패한 사진 (메모리에만)
  const pending = {};

  // ---------- 서버 ----------
  async function api(action, payload) {
    const res = await fetch(API, {
      method: 'POST',
      headers: { 'Content-Type': 'text/plain;charset=utf-8' }, // 단순 요청이어야 Apps Script가 받음
      body: JSON.stringify(Object.assign({ action }, payload)),
    });
    const json = await res.json();
    if (!json.success) throw new Error(json.error || '서버 오류');
    return json;
  }
  const who = () => ({ studentNo: state.studentNo, name: state.name });

  let lastSync = 0;
  async function sync(force) {
    if (!API || !state) return;
    if (!force && Date.now() - lastSync < 15000) return;
    lastSync = Date.now();
    try {
      const res = await api('status', who());
      state.photos = state.photos || {};
      Object.entries(res.photos || {}).forEach(([id, p]) => {
        const local = state.photos[id] || {};
        const changed = local.status !== p.status || local.memo !== p.memo;
        state.photos[id] = Object.assign(local, { uploaded: true, status: p.status, memo: p.memo, time: p.time });
        if (changed && p.status === '다시찍기') toast('선생님이 다시 찍어 달라고 한 사진이 있어요.');
      });
      if (res.quiz && (!state.quiz || (Number(res.quiz.attempts) || 0) > (state.quiz.attempts || 0))) {
        state.quiz = { first: res.quiz.first, best: res.quiz.best, last: res.quiz.last, total: res.quiz.total, attempts: Number(res.quiz.attempts) || 1 };
      }
      save();
      render();
    } catch (e) { /* 연결이 안 되면 기기에 저장된 상태로 계속 */ }
  }

  // ---------- 화면 공통 ----------
  let toastTimer;
  function toast(msg) {
    const el = document.getElementById('toast');
    el.textContent = msg;
    el.hidden = false;
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => { el.hidden = true; }, 3200);
  }

  function header() {
    const whoEl = document.getElementById('who');
    whoEl.hidden = !state;
    if (state) document.getElementById('whoText').textContent = `${state.studentNo} ${state.name}`;
    document.getElementById('demoBanner').hidden = !!API;
  }

  function route() {
    const h = location.hash.replace(/^#\/?/, '');
    const [page, id] = h.split('/');
    return { page: page || 'home', id };
  }
  const go = (hash) => { if (location.hash !== hash) location.hash = hash; else render(); };

  function render() {
    header();
    if (!state) return renderLogin();
    const r = route();
    if (r.page === 'stop' && T.stops.some((s) => s.id === r.id)) return renderStop(r.id);
    if (r.page === 'quiz') return allDone() ? renderQuiz() : go('#/');
    if (r.page === 'result' && lastResult) return renderResult();
    return renderHome();
  }

  // ---------- 1. 로그인 ----------
  function renderLogin() {
    const c = urlCourse || (CFG.COURSE === 'short' ? 'short' : 'full');
    app.innerHTML = `
      <section class="card narrow">
        <p class="kicker">현장 학습 · ${c === 'short' ? '30분' : '60분'} 코스</p>
        <h1 class="title">${esc(T.title)}</h1>
        <p class="lead">${esc(T.intro)}</p>
        <form id="loginForm" class="form" autocomplete="off" novalidate>
          <label>학번
            <input name="studentNo" inputmode="numeric" pattern="[0-9]*" maxlength="6" required placeholder="30105">
            <small>${esc(CFG.STUDENT_NO_HINT || '')}</small>
          </label>
          <label>이름
            <input name="name" type="text" maxlength="20" required placeholder="이름">
          </label>
          <p id="loginError" class="error" hidden></p>
          <button class="btn primary big" type="submit">투어 시작하기</button>
        </form>
      </section>
      <section class="card narrow rules">
        <h2 class="h2">관람 예절</h2>
        <ul>${T.rules.map((r) => `<li>${esc(r)}</li>`).join('')}</ul>
      </section>`;
    document.getElementById('loginForm').addEventListener('submit', (e) => {
      e.preventDefault();
      const f = e.target;
      const no = f.studentNo.value.replace(/\D/g, '');
      const name = f.name.value.replace(/\s+/g, ' ').trim();
      const err = document.getElementById('loginError');
      if (!/^\d{4,6}$/.test(no)) { err.textContent = '학번을 숫자 4~6자리로 써 주세요.'; err.hidden = false; return; }
      if (name.length < 2) { err.textContent = '이름을 정확하게 써 주세요.'; err.hidden = false; return; }
      state = { studentNo: no, name, course: c, photos: {}, quiz: null };
      save();
      lastSync = 0;
      go('#/');
      sync(true);
    });
  }

  // ---------- 2. 장소 목록 ----------
  function renderHome() {
    const total = missions().length;
    const done = doneCount();
    const pct = total ? Math.round((done / total) * 100) : 0;
    const redo = missions().filter((m) => (photoOf(m.id) || {}).status === '다시찍기');
    const q = state.quiz;
    app.innerHTML = `
      <section class="hero">
        <p class="kicker">${course() === 'short' ? '30분' : '60분'} 코스 · 사진 미션 ${total}개</p>
        <h1 class="title">${esc(T.subtitle)}</h1>
        <div class="progress" role="progressbar" aria-valuemin="0" aria-valuemax="${total}" aria-valuenow="${done}">
          <div class="bar" style="width:${pct}%"></div>
        </div>
        <p class="progress-text"><b>${done}</b> / ${total} 사진 완료 ${allDone() ? '· 퀴즈가 열렸어요!' : '· 모두 찍으면 퀴즈가 열려요'}</p>
      </section>
      ${redo.length ? `<div class="notice warn">🔁 선생님이 다시 찍어 달라고 했어요: ${redo.map((m) => `<a href="#/stop/${m.stop.id}">${esc(m.title)}</a>`).join(', ')}</div>` : ''}
      <ol class="stops">
        ${stops().map((s) => stopCard(s)).join('')}
      </ol>
      <section class="card quiz-card ${allDone() ? '' : 'locked'}">
        <div>
          <p class="kicker">마지막 단계</p>
          <h2 class="h2">${allDone() ? '📜 퀴즈 풀기' : '🔒 퀴즈'}</h2>
          <p class="muted">${allDone()
            ? '장소 설명을 떠올리며 풀어요. 모를 때는 💡 힌트로 설명을 다시 볼 수 있어요.'
            : `사진 미션을 모두 마치면 열려요. (${total - done}개 남음)`}</p>
          ${q ? `<p class="score-line">내 점수: 최고 <b>${esc(q.best)}</b> / ${esc(q.total)} · ${esc(q.attempts)}번 풀었어요</p>` : ''}
        </div>
        <a class="btn primary big ${allDone() ? '' : 'disabled'}" ${allDone() ? 'href="#/quiz"' : 'aria-disabled="true"'}>${q ? '다시 풀기' : '퀴즈 시작'}</a>
      </section>`;
    sync();
  }

  function stopCard(s) {
    const chips = s.missions.map((m) => {
      const p = photoOf(m.id) || {};
      const cls = pending[m.id] ? 'wait' : p.status === '다시찍기' ? 'redo' : isDone(m.id) ? 'ok' : '';
      const mark = pending[m.id] ? '⏳' : p.status === '다시찍기' ? '🔁' : isDone(m.id) ? '✔' : '📷';
      return `<span class="chip ${cls}">${mark} ${esc(m.label)}</span>`;
    }).join('');
    const done = stopDone(s);
    return `
      <li>
        <a class="stop ${done ? 'done' : ''}" href="#/stop/${s.id}">
          <span class="stop-no">${done ? '✔' : s.no}</span>
          <span class="stop-body">
            <span class="stop-name">${s.icon} ${esc(s.name)} <small>${esc(s.time[course()] || '')}</small></span>
            <span class="stop-q">${esc(s.question)}</span>
            <span class="chips">${chips || '<span class="chip">📖 읽기</span>'}</span>
          </span>
          <span class="arrow" aria-hidden="true">›</span>
        </a>
      </li>`;
  }

  // ---------- 3. 장소 ----------
  function renderStop(id) {
    const list = stops();
    const s = T.stops.find((x) => x.id === id);
    const i = list.indexOf(s);
    const prev = list[i - 1];
    const next = list[i + 1];
    app.innerHTML = `
      <a class="back" href="#/">‹ 장소 목록</a>
      <article class="card">
        <p class="kicker">${s.no}번째 장소 · ${esc(s.name)}</p>
        <h1 class="title">${s.icon} ${esc(s.title)}</h1>
        <p class="key-q">❓ ${esc(s.question)}</p>
        <ul class="story">${s.story.map((t) => `<li>${esc(t)}</li>`).join('')}</ul>
        ${s.sources.length ? `<details class="sources"><summary>근거 자료</summary><ul>${s.sources.map(([t, u]) => `<li><a href="${esc(u)}" target="_blank" rel="noopener">${esc(t)}</a></li>`).join('')}</ul></details>` : ''}
      </article>
      ${s.missions.map((m) => missionBox(m)).join('')}
      ${!s.missions.length ? `<div class="card soft"><p>이곳은 사진 미션이 없어요. 이야기를 읽고 ${allDone() ? '<a href="#/quiz">퀴즈</a>를 풀어 봐요!' : '남은 사진 미션을 마저 해결해요.'}</p></div>` : ''}
      <nav class="pager">
        ${prev ? `<a class="btn" href="#/stop/${prev.id}">‹ ${esc(prev.name)}</a>` : '<span></span>'}
        ${next ? `<a class="btn" href="#/stop/${next.id}">${esc(next.name)} ›</a>` : `<a class="btn ${allDone() ? 'primary' : ''}" href="${allDone() ? '#/quiz' : '#/'}">${allDone() ? '퀴즈 풀기 ›' : '장소 목록 ›'}</a>`}
      </nav>`;
    app.querySelectorAll('input[type=file]').forEach((input) => {
      input.addEventListener('change', () => {
        const file = input.files && input.files[0];
        input.value = '';
        if (file) handlePhoto(input.dataset.mission, file);
      });
    });
    app.querySelectorAll('[data-retry]').forEach((b) => b.addEventListener('click', () => uploadPending(b.dataset.retry)));
  }

  function missionBox(m) {
    const p = photoOf(m.id) || {};
    const pend = pending[m.id];
    const thumb = (pend && pend.thumb) || p.thumb;
    let status = '';
    if (pend && pend.state === 'uploading') status = '<p class="st wait">⏳ 선생님께 보내는 중…</p>';
    else if (pend && pend.state === 'error') status = `<p class="st err">⚠️ 보내지 못했어요. ${esc(pend.msg || '')}</p><button class="btn" type="button" data-retry="${m.id}">다시 보내기</button>`;
    else if (p.status === '다시찍기') status = `<p class="st redo">🔁 선생님이 다시 찍어 달래요.${p.memo ? ` <b>"${esc(p.memo)}"</b>` : ''}</p>`;
    else if (p.status === '확인') status = `<p class="st ok">✅ 선생님이 확인했어요.${p.memo ? ` "${esc(p.memo)}"` : ''}</p>`;
    else if (p.uploaded) status = `<p class="st ok">✔ 제출 완료${p.time ? ` (${esc(p.time)})` : ''}</p>`;
    const busy = pend && pend.state === 'uploading';
    return `
      <section class="card mission ${isDone(m.id) ? 'done' : ''}">
        <p class="kicker">📷 사진 미션</p>
        <h2 class="h2">${esc(m.title)}</h2>
        <p class="guide">${esc(m.guide)}</p>
        ${thumb ? `<img class="preview" src="${thumb}" alt="${esc(m.title)} 사진">` : p.uploaded ? '<div class="preview empty">제출한 사진은 선생님께 저장되어 있어요</div>' : ''}
        ${status}
        <label class="btn ${p.uploaded && p.status !== '다시찍기' ? '' : 'primary'} big camera ${busy ? 'disabled' : ''}">
          ${p.uploaded || thumb ? '📷 다시 찍기' : '📷 사진 찍기'}
          <input type="file" accept="image/*" capture="environment" data-mission="${m.id}" ${busy ? 'disabled' : ''} hidden>
        </label>
      </section>`;
  }

  // ---------- 사진 처리 ----------
  function loadImage(file) {
    return new Promise((resolve, reject) => {
      const url = URL.createObjectURL(file);
      const img = new Image();
      img.onload = () => { URL.revokeObjectURL(url); resolve(img); };
      img.onerror = () => { URL.revokeObjectURL(url); reject(new Error('사진을 열 수 없어요. 카메라로 다시 찍어 보세요.')); };
      img.src = url;
    });
  }
  function toJpeg(img, maxSide, quality) {
    const w = img.naturalWidth, h = img.naturalHeight;
    const scale = Math.min(1, maxSide / Math.max(w, h));
    const canvas = document.createElement('canvas');
    canvas.width = Math.max(1, Math.round(w * scale));
    canvas.height = Math.max(1, Math.round(h * scale));
    const ctx = canvas.getContext('2d');
    ctx.fillStyle = '#fff';
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
    return canvas.toDataURL('image/jpeg', quality);
  }

  async function handlePhoto(missionId, file) {
    try {
      const img = await loadImage(file);
      const full = toJpeg(img, 1600, 0.8);
      let thumb = toJpeg(img, 360, 0.6);
      if (thumb.length > 45000) thumb = toJpeg(img, 280, 0.5);
      pending[missionId] = { state: 'uploading', full, thumb };
      render();
      await uploadPending(missionId);
    } catch (e) {
      toast(e.message || '사진을 처리하지 못했어요.');
    }
  }

  async function uploadPending(missionId) {
    const pend = pending[missionId];
    if (!pend) return;
    const m = missions().find((x) => x.id === missionId) || T.stops.flatMap((s) => s.missions.map((mm) => Object.assign({ stop: s }, mm))).find((x) => x.id === missionId);
    pend.state = 'uploading';
    render();
    try {
      let time = new Date().toLocaleTimeString('ko-KR', { hour: '2-digit', minute: '2-digit' });
      if (API) {
        const res = await api('upload', Object.assign(who(), {
          missionId, missionTitle: m.title, stopName: m.stop.name,
          image: pend.full.split(',')[1], thumb: pend.thumb,
        }));
        time = res.time || time;
      } else {
        await new Promise((r) => setTimeout(r, 500)); // 체험 모드
      }
      state.photos[missionId] = { uploaded: true, status: '제출', memo: '', time, thumb: pend.thumb };
      delete pending[missionId];
      save();
      toast(allDone() ? '🎉 사진 미션 완료! 이제 퀴즈를 풀 수 있어요.' : '✔ 사진을 제출했어요.');
    } catch (e) {
      pend.state = 'error';
      pend.msg = navigator.onLine === false ? '인터넷 연결을 확인해 주세요.' : (e.message || '');
    }
    render();
  }

  // ---------- 4. 퀴즈 ----------
  let quiz = null;
  let lastResult = null;

  function shuffle(a) {
    const arr = a.slice();
    for (let i = arr.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [arr[i], arr[j]] = [arr[j], arr[i]];
    }
    return arr;
  }

  // 장소마다 돌아가며 한 문제씩 뽑아 고르게
  function pickQuestions() {
    const ids = stops().map((s) => s.id);
    const pools = ids.map((id) => shuffle(T.quiz.filter((q) => q.place === id)));
    const all = pools.reduce((n, p) => n + p.length, 0);
    const want = CFG.QUIZ_COUNT > 0 ? Math.min(CFG.QUIZ_COUNT, all) : all;
    const picked = [];
    while (picked.length < want) {
      pools.forEach((p) => { if (p.length && picked.length < want) picked.push(p.shift()); });
    }
    // 장소 순서대로 내기
    picked.sort((a, b) => ids.indexOf(a.place) - ids.indexOf(b.place));
    return picked.map((q) => {
      const options = shuffle(q.options);
      return { src: q, options, answer: options.indexOf(q.options[0]), picked: null, hint: false };
    });
  }

  function renderQuiz() {
    if (!quiz) quiz = { items: pickQuestions(), i: 0 };
    const it = quiz.items[quiz.i];
    const s = T.stops.find((x) => x.id === it.src.place);
    const answered = it.picked !== null;
    const last = quiz.i === quiz.items.length - 1;
    app.innerHTML = `
      <a class="back" href="#/">‹ 장소 목록</a>
      <section class="card quiz">
        <div class="quiz-head">
          <span class="kicker">${s.icon} ${esc(s.name)}</span>
          <span class="count">${quiz.i + 1} / ${quiz.items.length}</span>
        </div>
        <div class="progress thin"><div class="bar" style="width:${(quiz.i / quiz.items.length) * 100}%"></div></div>
        <h1 class="q">${esc(it.src.q)}</h1>
        <div class="options">
          ${it.options.map((o, k) => {
            let cls = '';
            if (answered) cls = k === it.answer ? 'right' : k === it.picked ? 'wrong' : 'dim';
            return `<button class="option ${cls}" type="button" data-k="${k}" ${answered ? 'disabled' : ''}><span class="mark">${'①②③④'[k]}</span>${esc(o)}</button>`;
          }).join('')}
        </div>
        ${answered ? `
          <div class="feedback ${it.picked === it.answer ? 'right' : 'wrong'}">
            <b>${it.picked === it.answer ? '⭕ 정답!' : '❌ 아쉬워요'}</b> ${esc(it.src.explain)}
          </div>
          <button class="btn primary big" type="button" id="nextBtn">${last ? '결과 보기' : '다음 문제 ›'}</button>
        ` : `
          <button class="btn-link hint-btn" type="button" id="hintBtn">💡 ${it.hint ? '힌트 닫기' : `힌트: '${esc(s.name)}' 설명 다시 보기`}</button>
          ${it.hint ? `<ul class="story hint">${s.story.map((t) => `<li>${esc(t)}</li>`).join('')}</ul>` : ''}
        `}
      </section>`;
    app.querySelectorAll('.option').forEach((b) => b.addEventListener('click', () => {
      it.picked = Number(b.dataset.k);
      renderQuiz();
    }));
    const hint = document.getElementById('hintBtn');
    if (hint) hint.addEventListener('click', () => { it.hint = !it.hint; renderQuiz(); });
    const next = document.getElementById('nextBtn');
    if (next) next.addEventListener('click', () => {
      if (last) finishQuiz();
      else { quiz.i += 1; renderQuiz(); window.scrollTo(0, 0); }
    });
  }

  async function finishQuiz() {
    const items = quiz.items;
    const score = items.filter((it) => it.picked === it.answer).length;
    const wrong = items.filter((it) => it.picked !== it.answer).map((it) => it.src.q);
    const prev = state.quiz || {};
    state.quiz = {
      first: prev.first != null ? prev.first : score,
      best: Math.max(Number(prev.best) || 0, score),
      last: score,
      total: items.length,
      attempts: (prev.attempts || 0) + 1,
    };
    save();
    lastResult = { score, total: items.length, items, send: API ? 'sending' : 'demo' };
    quiz = null;
    go('#/result');
    if (API) {
      try {
        await api('quiz', Object.assign(who(), { score, total: items.length, course: course(), wrong: wrong.join(' / ') }));
        lastResult.send = 'ok';
      } catch (e) {
        lastResult.send = 'fail';
      }
      if (route().page === 'result') renderResult();
    }
  }

  function renderResult() {
    const r = lastResult;
    const ratio = r.score / r.total;
    const msg = ratio === 1 ? '만점! 성균관 박사 인정 🎓' : ratio >= 0.7 ? '훌륭해요! 유생 합격 📜' : ratio >= 0.4 ? '좋아요! 틀린 문제의 설명을 다시 읽어 봐요' : '장소 설명을 다시 읽고 한 번 더 도전해 봐요';
    const send = { sending: '⏳ 점수를 선생님께 보내는 중…', ok: '✔ 점수를 선생님께 보냈어요.', fail: '⚠️ 점수를 보내지 못했어요. 인터넷 연결을 확인하고 다시 풀어 주세요.', demo: '체험 모드라 점수는 전송되지 않았어요.' }[r.send];
    app.innerHTML = `
      <section class="card result">
        <p class="kicker">퀴즈 결과</p>
        <p class="big-score"><b>${r.score}</b> / ${r.total}</p>
        <p class="lead">${msg}</p>
        <p class="st ${r.send === 'fail' ? 'err' : 'ok'}">${send}</p>
        <div class="actions">
          <a class="btn primary" href="#/quiz">다시 풀기 (새 문제)</a>
          <a class="btn" href="#/">장소 목록</a>
        </div>
      </section>
      <section class="card">
        <h2 class="h2">문제 돌아보기</h2>
        <ol class="review">
          ${r.items.map((it) => `
            <li class="${it.picked === it.answer ? 'right' : 'wrong'}">
              <p class="rq">${it.picked === it.answer ? '⭕' : '❌'} ${esc(it.src.q)}</p>
              <p class="ra">정답: <b>${esc(it.options[it.answer])}</b>${it.picked !== it.answer ? ` · 내 답: ${esc(it.options[it.picked])}` : ''}</p>
              <p class="muted">${esc(it.src.explain)}</p>
            </li>`).join('')}
        </ol>
      </section>`;
  }

  // ---------- 시작 ----------
  document.getElementById('logoutBtn').addEventListener('click', () => {
    if (Object.keys(pending).length && !confirm('아직 보내지 못한 사진이 있어요. 그래도 로그아웃할까요?')) return;
    if (!confirm('로그아웃할까요? 제출한 사진은 선생님께 그대로 남아 있어요.')) return;
    try { localStorage.removeItem(STORE); } catch (e) { /* 무시 */ }
    state = null;
    quiz = null;
    lastResult = null;
    Object.keys(pending).forEach((k) => delete pending[k]);
    go('#/');
  });
  window.addEventListener('hashchange', () => {
    render();
    window.scrollTo(0, 0);
  });
  document.addEventListener('visibilitychange', () => { if (!document.hidden) sync(); });
  window.addEventListener('beforeunload', (e) => {
    if (Object.values(pending).some((p) => p.state === 'uploading')) { e.preventDefault(); e.returnValue = ''; }
  });

  // 주소에 코스가 있으면 로그인한 학생의 코스도 맞춤
  if (state && urlCourse && state.course !== urlCourse) { state.course = urlCourse; save(); }
  render();
  sync(true);
})();
