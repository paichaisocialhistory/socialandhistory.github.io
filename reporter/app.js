(function () {
  'use strict';

  const CONFIG = window.REPORTER_CONFIG || {};
  const DATA = window.WAR_DATA;
  const MIN_PEOPLE = CONFIG.MIN_PEOPLE || 3;
  const MIN_Q = CONFIG.MIN_QUESTIONS_PER_PERSON || 3;
  const MIN_COMMON = CONFIG.MIN_COMMON_TOPICS || 5;
  const MIN_LEN = CONFIG.MIN_ARTICLE_LENGTH || 200;
  const AI_URL = (CONFIG.AI_URL || '').trim().replace(/\/+$/, '');
  const SHEET_URL = (CONFIG.SHEET_URL || '').trim();
  const SHARE_ENABLED = CONFIG.SHARE_ENABLED !== false;
  const STORAGE_KEY = 'war-reporter-v1';

  const $ = (sel) => document.querySelector(sel);
  const peopleById = Object.fromEntries(DATA.people.map((p) => [p.id, p]));
  // 공통 인터뷰(모든 학생이 먼저 하는 인터뷰)와 현장 취재 인물
  const COMMON = DATA.people.find((p) => p.common) || null;
  const FIELD = DATA.people.filter((p) => !p.common);

  // ---------- 상태 (이 기기의 브라우저에 자동 저장) ----------
  function freshState() {
    return {
      student: null,
      screen: 'login',
      currentPid: null,
      chats: {},   // pid -> [{ from: 'me'|'them'|'system', text, mid?, basis?, ai? }]
      asked: {},   // pid -> [자료 id] (대답에 쓰인 역사 자료 = 취재한 주제, 중복 없이)
      notes: [],   // [{ pid, mid, text }]
      fact: {},    // pid -> { choice, correct }
      article: { headline: '', body: '', learned: '', think: '' },
      submittedAt: null,
    };
  }

  let state = load();

  function load() {
    try {
      const saved = JSON.parse(localStorage.getItem(STORAGE_KEY));
      if (saved && typeof saved === 'object') return Object.assign(freshState(), saved);
    } catch (e) { /* 저장소를 못 쓰는 환경이면 새로 시작 */ }
    return freshState();
  }

  function save() {
    try { localStorage.setItem(STORAGE_KEY, JSON.stringify(state)); } catch (e) { /* 무시 */ }
  }

  // ---------- 공통 ----------
  function el(tag, attrs, ...children) {
    const node = document.createElement(tag);
    for (const [k, v] of Object.entries(attrs || {})) {
      if (k === 'class') node.className = v;
      else if (k.startsWith('on')) node.addEventListener(k.slice(2), v);
      else if (v !== false && v != null) node.setAttribute(k, v === true ? '' : v);
    }
    for (const c of children.flat()) {
      if (c == null || c === false) continue;
      node.append(c instanceof Node ? c : document.createTextNode(String(c)));
    }
    return node;
  }

  function show(screen) {
    state.screen = screen;
    save();
    document.querySelectorAll('.screen').forEach((s) => { s.hidden = s.id !== 'screen-' + screen; });
    const s = state.student;
    $('#who').hidden = !s;
    if (s) $('#whoText').textContent = `${s.grade}학년 ${s.classNo}반 ${s.studentNo}번 ${s.name} 기자`;
    window.scrollTo(0, 0);
    const render = { briefing: renderBriefing, map: renderMap, interview: renderInterview, article: renderArticle, done: renderDone, share: renderShare }[screen];
    if (render) render();
  }

  const askedCount = (pid) => (state.asked[pid] || []).length;
  const questionCount = (pid) => (state.chats[pid] || []).filter((m) => m.from === 'me').length;
  const needed = (pid) => (peopleById[pid] && peopleById[pid].common ? MIN_COMMON : MIN_Q);
  const isDone = (pid) => askedCount(pid) >= needed(pid) && !!state.fact[pid];
  const commonDone = () => !COMMON || isDone(COMMON.id);
  const donePeople = () => FIELD.filter((p) => isDone(p.id));
  const canWrite = () => commonDone() && donePeople().length >= MIN_PEOPLE;

  // ---------- 1. 로그인 ----------
  $('#loginForm').addEventListener('submit', (e) => {
    e.preventDefault();
    const f = new FormData(e.target);
    const student = {
      grade: Number(f.get('grade')),
      classNo: Number(f.get('classNo')),
      studentNo: Number(f.get('studentNo')),
      name: String(f.get('name') || '').trim().replace(/\s+/g, ' '),
    };
    const err = $('#loginError');
    if (!student.classNo || !student.studentNo || student.name.length < 2) {
      err.textContent = '반, 번호, 이름(2글자 이상)을 모두 입력하세요.';
      err.hidden = false;
      return;
    }
    err.hidden = true;
    state = freshState();
    state.student = student;
    show('briefing');
  });

  $('#logoutBtn').addEventListener('click', () => {
    const msg = state.submittedAt
      ? '로그아웃하면 이 기기에 저장된 취재 기록이 지워집니다. (제출한 기사는 선생님께 이미 전달되었어요)'
      : '아직 제출하지 않았어요. 로그아웃하면 이 기기에 저장된 취재 기록이 모두 지워집니다. 계속할까요?';
    if (!confirm(msg)) return;
    state = freshState();
    save();
    $('#loginForm').reset();
    show('login');
  });

  // ---------- 2. 브리핑 ----------
  function renderBriefing() {
    $('#warPeriod').textContent = `${DATA.title} (${DATA.period})`;
    $('#briefTitle').textContent = `${DATA.title} 종군기자 임무`;
    $('#missionText').textContent = DATA.mission;
    $('#timeline').replaceChildren(...DATA.timeline.map((t) =>
      el('li', null, el('span', { class: 'date' }, t.date), ' ', t.text)));
    $('#tips').replaceChildren(...DATA.questionTips.map((t) =>
      el('div', { class: 'tip' }, el('b', null, t.label), el('span', null, t.example))));
    $('#startBtn').textContent = COMMON && !commonDone() ? '공통 인터뷰 시작하기 →' : '취재 목록으로 →';
    $('#answerNote').textContent = AI_URL
      ? '인물들의 대답은 AI가 실제 역사 자료를 바탕으로 만듭니다. AI도 틀릴 수 있으니, 대답마다 📜 근거를 열어 실제 역사적 사실과 비교해 보세요.'
      : '인물들은 실제 역사 자료로 준비된 대답만 합니다. 대답마다 📜 근거를 열어 실제 역사적 사실을 확인할 수 있어요.';
  }
  $('#startBtn').addEventListener('click', () => {
    if (COMMON && !commonDone()) openInterview(COMMON.id);
    else show('map');
  });
  $('#briefAgainBtn').addEventListener('click', () => show('briefing'));

  // ---------- 3. 취재 목록 ----------
  function personCard(p, locked) {
    const n = askedCount(p.id);
    const badge = locked
      ? el('span', { class: 'badge' }, '🔒 공통 인터뷰를 마치면 만날 수 있어요')
      : isDone(p.id) ? el('span', { class: 'badge done' }, `✔ 취재 완료 · 주제 ${n}가지`)
      : questionCount(p.id) > 0 ? el('span', { class: 'badge going' }, `취재 중 · 주제 ${n} / ${needed(p.id)}가지`)
      : el('span', { class: 'badge' }, '아직 만나지 않음');
    return el('button', { class: 'person' + (p.common ? ' common' : ''), type: 'button', disabled: locked, onclick: () => openInterview(p.id) },
      el('div', { class: 'top' },
        el('span', { class: 'emoji' }, p.emoji),
        el('div', null, el('div', { class: 'name' }, p.name), el('div', { class: 'role' }, p.role))),
      el('div', { class: 'place' }, `📍 ${p.when} · ${p.where}`),
      el('div', { class: 'desc' }, p.intro),
      badge);
  }

  function renderMap() {
    const locked = !commonDone();
    $('#goalText').textContent = (COMMON ? `먼저 공통 인터뷰에서 서로 다른 주제 ${MIN_COMMON}가지 이상을 묻고 사실 확인을 마치세요. 그다음 ` : '') +
      `현장 사람 최소 ${MIN_PEOPLE}명에게서 각각 서로 다른 주제로 ${MIN_Q}가지 이상 취재하고 사실 확인까지 마치면 기사를 쓸 수 있어요.`;
    const parts = [];
    if (COMMON) {
      parts.push(el('h2', { class: 'section-title list-title' }, '① 공통 인터뷰 · 전쟁의 큰 흐름'));
      parts.push(el('div', { class: 'people' }, personCard(COMMON, false)));
      parts.push(el('h2', { class: 'section-title list-title' }, '② 현장 취재 · 전쟁 속 사람들'));
    }
    parts.push(el('div', { class: 'people' }, ...FIELD.map((p) => personCard(p, locked))));
    $('#peopleList').replaceChildren(...parts);
    const done = donePeople().length;
    $('#progressText').textContent =
      (COMMON ? `공통 인터뷰 ${commonDone() ? '완료 ✔' : '아직'} · ` : '') +
      `현장 취재 완료 ${done} / ${MIN_PEOPLE}명 · 수첩에 담은 말 ${state.notes.length}개` +
      (canWrite() ? ' — 기사를 쓸 준비가 되었어요!' : '');
    $('#toArticleBtn').disabled = !canWrite();
  }
  $('#toArticleBtn').addEventListener('click', () => { if (canWrite()) show('article'); });
  $('#notebookBtn').addEventListener('click', openNotebook);

  // ---------- 4. 인터뷰 ----------
  function openInterview(pid) {
    if (!peopleById[pid].common && !commonDone()) return;
    state.currentPid = pid;
    if (!state.chats[pid]) {
      const p = peopleById[pid];
      state.chats[pid] = [
        { from: 'system', text: `${p.when}, ${p.where}에서 ${p.name} 님을 만났습니다.` },
        { from: 'them', text: p.greeting },
      ];
    }
    show('interview');
    $('#askInput').focus();
  }

  function renderInterview() {
    const p = peopleById[state.currentPid];
    if (!p) return show('map');
    $('#ivEmoji').textContent = p.emoji;
    $('#ivName').textContent = p.name;
    $('#ivMeta').textContent = `${p.role} · ${p.when} · ${p.where}`;
    $('#chat').replaceChildren(...state.chats[p.id].map((m) => messageNode(p, m)));
    renderSuggestions(p);
    updateInterviewFooter(p);
    scrollChat();
  }

  function messageNode(p, m) {
    if (m.from === 'system') return el('div', { class: 'msg system' }, m.text);
    if (m.from === 'me') return el('div', { class: 'msg me' }, m.text);
    const node = el('div', { class: 'msg them' }, el('div', null, m.text));
    if (!m.mid) return node; // 인사말 등
    const tools = el('div', { class: 'tools' });
    const noted = state.notes.some((n) => n.mid === m.mid);
    const noteBtn = el('button', { type: 'button', disabled: noted }, noted ? '📌 수첩에 담음' : '📌 수첩에 담기');
    noteBtn.addEventListener('click', () => {
      if (!state.notes.some((n) => n.mid === m.mid)) {
        state.notes.push({ pid: p.id, mid: m.mid, text: m.text });
        save();
      }
      noteBtn.textContent = '📌 수첩에 담음';
      noteBtn.disabled = true;
    });
    tools.append(noteBtn);

    // 대답에 쓰인 역사 자료 (AI가 고른 번호를 data.js의 실제 자료로 바꿔서 보여 줌)
    const srcs = (m.basis || []).map((id) => p.questions.find((q) => q.id === id)).filter(Boolean);
    if (srcs.length) {
      const srcBox = el('div', { class: 'src', hidden: true },
        ...srcs.map((q) => el('div', null, `📜 ${q.src}`)));
      const srcBtn = el('button', { type: 'button' }, '📜 근거 보기');
      srcBtn.addEventListener('click', () => {
        srcBox.hidden = !srcBox.hidden;
        srcBtn.textContent = srcBox.hidden ? '📜 근거 보기' : '📜 근거 닫기';
      });
      tools.append(srcBtn);
      node.append(tools, srcBox);
    } else {
      node.append(tools);
    }
    if (m.ai) node.append(el('div', { class: 'ai-tag' }, srcs.length
      ? '🤖 AI가 역사 자료를 바탕으로 만든 대답이에요. 근거와 비교해 보세요.'
      : '🤖 AI 대답 · 자료에 없는 내용이라 근거가 없어요.'));
    return node;
  }

  function renderSuggestions(p) {
    const asked = new Set(state.asked[p.id] || []);
    // 아직 묻지 않은 질문을 앞에 보여 줌
    const qs = [...p.questions].sort((a, b) => asked.has(a.id) - asked.has(b.id));
    $('#suggestions').replaceChildren(...qs.map((q) =>
      el('button', {
        class: 'chip' + (asked.has(q.id) ? ' asked' : ''), type: 'button',
        onclick: () => { const i = $('#askInput'); i.value = q.q; i.focus(); },
      }, q.q)));
  }

  function updateInterviewFooter(p) {
    const n = askedCount(p.id);
    const need = needed(p.id);
    const f = state.fact[p.id];
    $('#ivCount').textContent = f
      ? `취재한 주제 ${n}가지 · 사실 확인 ${f.correct ? '정답 ✔' : '완료'}`
      : n >= need ? `취재한 주제 ${n}가지 · 이제 사실 확인을 할 수 있어요` : `취재한 주제 ${n} / ${need}가지`;
    const btn = $('#factBtn');
    btn.disabled = n < need;
    btn.textContent = f ? '✅ 사실 확인 다시 보기' : '✅ 사실 확인하고 취재 마치기';
  }

  function scrollChat() {
    const c = $('#chat');
    c.scrollTop = c.scrollHeight;
  }

  // 질문 → 가장 알맞은 대답 찾기 (띄어쓰기·문장부호 무시, 들어 있는 낱말이 길고 많을수록 높은 점수)
  const normalize = (s) => String(s).toLowerCase().replace(/[\s?!.,~"'“”‘’…()\[\]{}:;-]/g, '');

  function findAnswer(p, text) {
    const t = normalize(text);
    const exact = p.questions.find((q) => normalize(q.q) === t);
    if (exact) return exact;
    const asked = new Set(state.asked[p.id] || []);
    let best = null;
    let bestScore = 0;
    for (const q of p.questions) {
      let score = 0;
      for (const k of q.keys) if (t.includes(normalize(k))) score += normalize(k).length;
      // 점수가 같으면 아직 묻지 않은 질문을 고름
      if (score > bestScore || (score === bestScore && score > 0 && best && asked.has(best.id) && !asked.has(q.id))) {
        best = q;
        bestScore = score;
      }
    }
    return best;
  }

  // 준비된 대답 (AI를 쓰지 않거나 AI가 대답하지 못했을 때)
  function preparedReply(p, text) {
    const match = findAnswer(p, text);
    if (match) return { text: match.a, basis: [match.id] };
    const asked = new Set(state.asked[p.id] || []);
    const hints = p.questions.filter((q) => !asked.has(q.id)).slice(0, 2).map((q) => `"${q.q}"`);
    return { text: p.fallback + (hints.length ? ` 차라리 ${hints.join(' 또는 ')} 같은 걸 물어봐 주세요.` : ''), basis: [] };
  }

  // AI 대답: 인물 정보와 data.js의 역사 자료, 최근 대화를 함께 보낸다
  async function aiReply(p, text, history) {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), 30000);
    try {
      const s = state.student;
      const res = await fetch(AI_URL + '/api/reporter/ask', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        signal: controller.signal,
        body: JSON.stringify({
          studentId: `${s.grade}-${s.classNo}-${s.studentNo}-${s.name}`,
          person: { name: p.name, role: p.role, when: p.when, where: p.where, intro: p.intro },
          sources: p.questions.map((q) => ({ id: q.id, topic: q.q, testimony: q.a, fact: q.src })),
          history,
          question: text,
        }),
      });
      if (!res.ok) return null;
      const json = await res.json();
      return json.answer ? { text: json.answer, basis: json.basis || [], ai: true } : null;
    } catch (e) {
      return null;
    } finally {
      clearTimeout(timer);
    }
  }

  let busy = false;
  $('#askForm').addEventListener('submit', async (e) => {
    e.preventDefault();
    if (busy) return;
    const p = peopleById[state.currentPid];
    const input = $('#askInput');
    const text = input.value.trim();
    if (!p || !text) return;
    if (text.length < 2) { input.placeholder = '질문을 조금 더 자세히 써 보세요'; return; }
    input.value = '';

    const chat = state.chats[p.id];
    // AI에게 보여 줄 최근 대화 (이번 질문 전까지)
    const history = chat.filter((m) => m.from !== 'system').slice(-10)
      .map((m) => ({ speaker: m.from === 'me' ? 'reporter' : 'interviewee', text: m.text.slice(0, 800) }));
    const mine = { from: 'me', text };
    chat.push(mine);
    $('#chat').append(messageNode(p, mine));

    const typing = el('div', { class: 'msg them typing' }, `${p.name} 님이 대답하는 중…`);
    $('#chat').append(typing);
    scrollChat();
    busy = true;
    $('#askForm button').disabled = true;

    const started = Date.now();
    let answer = AI_URL ? await aiReply(p, text, history) : null;
    if (AI_URL && !answer && !state.aiDownNoticed) {
      state.aiDownNoticed = true;
      const note = { from: 'system', text: '(AI 연결이 원활하지 않아 잠시 준비된 대답으로 이어 갑니다.)' };
      chat.push(note);
      typing.before(messageNode(p, note));
    }
    if (answer) state.aiDownNoticed = false;
    if (!answer) answer = preparedReply(p, text);

    const reply = { from: 'them', mid: `${Date.now()}-${chat.length}`, text: answer.text, basis: answer.basis, ai: !!answer.ai };
    const asked = state.asked[p.id] || (state.asked[p.id] = []);
    reply.basis.forEach((id) => { if (!asked.includes(id)) asked.push(id); });
    chat.push(reply);
    save();

    // 준비된 대답은 바로 나오므로 대답하는 척 잠깐 기다림
    const wait = Math.max(0, 500 + Math.min(1200, reply.text.length * 8) - (Date.now() - started));
    setTimeout(() => {
      typing.replaceWith(messageNode(p, reply));
      renderSuggestions(p);
      updateInterviewFooter(p);
      scrollChat();
      busy = false;
      $('#askForm button').disabled = false;
      input.focus();
    }, answer.ai ? 0 : wait);
  });

  $('#backToMapBtn').addEventListener('click', () => show('map'));

  // 사실 확인
  $('#factBtn').addEventListener('click', () => {
    const p = peopleById[state.currentPid];
    const fc = p.factCheck;
    const prev = state.fact[p.id];
    $('#factQ').textContent = fc.q;
    $('#factOptions').replaceChildren(...fc.options.map((o, i) =>
      el('label', null,
        el('input', { type: 'radio', name: 'fact', value: i, checked: prev && prev.choice === i, disabled: !!prev }),
        el('span', null, o))));
    const result = $('#factResult');
    result.hidden = !prev;
    if (prev) showFactResult(fc, prev.correct);
    $('#factSubmit').hidden = !!prev;
    $('#factDialog').showModal();
  });

  function showFactResult(fc, correct) {
    const r = $('#factResult');
    r.className = 'fact-result ' + (correct ? 'ok' : 'no');
    r.textContent = (correct ? '⭕ 정답입니다! ' : `❌ 아쉬워요. 정답은 "${fc.options[fc.answer]}"입니다. `) + fc.explain;
    r.hidden = false;
  }

  $('#factSubmit').addEventListener('click', () => {
    const p = peopleById[state.currentPid];
    const picked = document.querySelector('#factOptions input:checked');
    if (!picked) return;
    const choice = Number(picked.value);
    const correct = choice === p.factCheck.answer;
    state.fact[p.id] = { choice, correct };
    save();
    document.querySelectorAll('#factOptions input').forEach((i) => { i.disabled = true; });
    $('#factSubmit').hidden = true;
    showFactResult(p.factCheck, correct);
    state.chats[p.id].push({ from: 'system', text: p.common
      ? '공통 인터뷰를 마쳤습니다. 이제 [← 취재 목록]으로 가서 전쟁 현장의 사람들을 만나 보세요.'
      : `${p.name} 님 취재를 마쳤습니다. 취재 목록에서 다른 사람을 만나 보세요.` });
    save();
    renderInterview();
  });

  // ---------- 취재 수첩 ----------
  function noteLabel(n) {
    const p = peopleById[n.pid];
    return `${p.name}(${p.role})`;
  }

  function openNotebook() {
    const list = $('#notebookList');
    if (!state.notes.length) {
      list.replaceChildren(el('p', { class: 'empty' }, '아직 담은 말이 없어요.'));
    } else {
      list.replaceChildren(...state.notes.map((n, i) =>
        el('div', { class: 'quote-row' },
          el('div', { class: 'quote' }, el('b', null, noteLabel(n)), ' ', n.text),
          el('button', {
            class: 'btn-link', type: 'button',
            onclick: () => { state.notes.splice(i, 1); save(); openNotebook(); renderMap(); },
          }, '빼기'))));
    }
    if (!$('#notebookDialog').open) $('#notebookDialog').showModal();
  }

  // ---------- 5. 기사 쓰기 ----------
  const form = $('#articleForm');

  function renderArticle() {
    const a = state.article;
    form.headline.value = a.headline;
    form.body.value = a.body;
    $('#reflectionFields').replaceChildren(...DATA.reflections.map((r) =>
      el('label', null, r.label,
        el('textarea', { name: r.id, rows: 4, required: true, placeholder: r.placeholder }))));
    DATA.reflections.forEach((r) => { form[r.id].value = a[r.id] || ''; });

    const list = $('#quoteList');
    list.replaceChildren(...(state.notes.length
      ? state.notes.map((n) => el('button', { class: 'quote', type: 'button', onclick: () => insertQuote(n) },
          el('b', null, noteLabel(n)), ' ', n.text))
      : [el('p', { class: 'empty' }, '취재 수첩이 비어 있어요. 인터뷰에서 📌 수첩에 담기를 눌러 보세요.')]));
    updateCount();
    $('#articleError').hidden = true;
  }

  function insertQuote(n) {
    const p = peopleById[n.pid];
    const ta = form.body;
    const quote = `${p.name} 씨는 "${n.text}"라고 말했다.`;
    const start = ta.selectionStart ?? ta.value.length;
    const end = ta.selectionEnd ?? ta.value.length;
    const before = ta.value.slice(0, start);
    const glue = before && !/\s$/.test(before) ? ' ' : '';
    ta.value = before + glue + quote + ' ' + ta.value.slice(end);
    const pos = (before + glue + quote + ' ').length;
    ta.focus();
    ta.setSelectionRange(pos, pos);
    collectArticle();
  }

  function collectArticle() {
    state.article.headline = form.headline.value;
    state.article.body = form.body.value;
    DATA.reflections.forEach((r) => { if (form[r.id]) state.article[r.id] = form[r.id].value; });
    save();
    updateCount();
  }

  function updateCount() {
    const len = form.body.value.replace(/\s/g, '').length;
    $('#bodyCount').textContent = `(${len}자 / 최소 ${MIN_LEN}자, 띄어쓰기 제외)`;
  }

  form.addEventListener('input', collectArticle);
  $('#articleBackBtn').addEventListener('click', () => { collectArticle(); show('map'); });
  $('#downloadBtn').addEventListener('click', () => { collectArticle(); download(); });
  $('#downloadBtn2').addEventListener('click', download);
  $('#editAgainBtn').addEventListener('click', () => show('article'));

  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    collectArticle();
    const a = state.article;
    const err = $('#articleError');
    const problems = [];
    if (!a.headline.trim()) problems.push('기사 제목을 쓰세요.');
    if (a.body.replace(/\s/g, '').length < MIN_LEN) problems.push(`기사 본문을 ${MIN_LEN}자 이상 쓰세요.`);
    DATA.reflections.forEach((r) => { if ((a[r.id] || '').trim().length < 10) problems.push(`"${r.label}"에 10자 이상 답하세요.`); });
    if (problems.length) {
      err.textContent = problems.join(' ');
      err.hidden = false;
      return;
    }
    err.hidden = true;
    if (!confirm('선생님께 제출할까요? 제출한 뒤에도 고쳐서 다시 제출할 수 있어요.')) return;

    const btn = $('#submitBtn');
    btn.disabled = true;
    btn.textContent = '제출하는 중…';
    const result = await submit();
    btn.disabled = false;
    btn.textContent = '선생님께 제출하기';
    state.lastResult = result;
    if (result === 'ok' || result === 'unconfirmed') state.submittedAt = new Date().toISOString();
    save();
    show('done');
  });

  // ---------- 제출 ----------
  function transcriptText() {
    return DATA.people
      .filter((p) => (state.chats[p.id] || []).some((m) => m.from === 'me'))
      .map((p) => {
        const lines = state.chats[p.id]
          .filter((m) => m.from !== 'system')
          .map((m) => (m.from === 'me' ? 'Q. ' : 'A. ') + m.text);
        return `[${p.name} · ${p.role}]\n${lines.join('\n')}`;
      }).join('\n\n');
  }

  function payload() {
    const s = state.student;
    const met = DATA.people.filter((p) => questionCount(p.id) > 0);
    const factDone = Object.keys(state.fact).length;
    const factRight = Object.values(state.fact).filter((f) => f.correct).length;
    const totalQuestions = DATA.people.reduce((sum, p) => sum + questionCount(p.id), 0);
    return {
      studentId: `${s.grade}-${s.classNo}-${s.studentNo}-${s.name}`,
      grade: s.grade,
      classNo: s.classNo,
      studentNo: s.studentNo,
      name: s.name,
      war: DATA.title,
      people: met.map((p) => `${p.name}(${questionCount(p.id)})`).join(', '),
      questionCount: totalQuestions,
      factCheck: `${factRight}/${factDone}`,
      headline: state.article.headline.trim(),
      body: state.article.body.trim(),
      quotes: state.notes.map((n) => `${peopleById[n.pid].name}: ${n.text}`).join('\n'),
      learned: (state.article.learned || '').trim(),
      think: (state.article.think || '').trim(),
      transcript: transcriptText(),
    };
  }

  async function submit() {
    const url = SHEET_URL;
    if (!url) return 'no-url';
    const body = JSON.stringify(payload());
    const headers = { 'Content-Type': 'text/plain;charset=utf-8' }; // 단순 요청으로 보내야 Apps Script가 받음
    try {
      const res = await fetch(url, { method: 'POST', body, headers });
      const json = await res.json();
      return json.success ? 'ok' : 'error';
    } catch (e) {
      // 응답을 읽지 못한 경우: 확인 없이 한 번 더 보냄 (시트는 같은 학생의 줄을 덮어써서 중복되지 않음)
      try {
        await fetch(url, { method: 'POST', body, headers, mode: 'no-cors' });
        return 'unconfirmed';
      } catch (e2) {
        return 'fail';
      }
    }
  }

  function download() {
    const d = payload();
    const text = [
      `${DATA.title} 종군기자 기사`,
      `${d.grade}학년 ${d.classNo}반 ${d.studentNo}번 ${d.name}`,
      '',
      `■ 제목: ${d.headline}`,
      '',
      d.body,
      '',
      ...DATA.reflections.map((r) => `■ ${r.label}\n${d[r.id] || ''}\n`),
      `■ 사실 확인: ${d.factCheck}`,
      '',
      '■ 인터뷰 기록',
      d.transcript,
    ].join('\n');
    const blob = new Blob(['﻿' + text], { type: 'text/plain;charset=utf-8' });
    const a = el('a', { href: URL.createObjectURL(blob), download: `${d.grade}-${d.classNo}-${d.studentNo}_${d.name}_기사.txt` });
    document.body.append(a);
    a.click();
    a.remove();
    setTimeout(() => URL.revokeObjectURL(a.href), 1000);
  }

  // ---------- 6. 제출 결과 ----------
  function renderDone() {
    const r = state.lastResult;
    const box = $('#doneStatus');
    const msgs = {
      ok: ['ok', '✅ 선생님께 제출되었습니다. 수고했어요, 기자님!'],
      unconfirmed: ['ok', '✅ 제출을 보냈습니다. (혹시 모르니 💾 파일로 저장도 해 두세요.)'],
      'no-url': ['warn', '⚠️ 선생님이 아직 제출 주소를 설정하지 않았어요. 💾 파일로 저장해서 선생님께 보내 주세요.'],
      error: ['err', '❌ 시트에 저장하지 못했어요. 잠시 뒤 [기사 고치기] → 다시 제출하거나, 💾 파일로 저장해서 선생님께 보내 주세요.'],
      fail: ['err', '❌ 인터넷 연결을 확인해 주세요. 잠시 뒤 다시 제출하거나, 💾 파일로 저장해서 선생님께 보내 주세요.'],
    };
    const [cls, text] = msgs[r] || msgs.ok;
    box.className = 'status ' + cls;
    box.textContent = text;
    $('#doneKicker').textContent = `호외 · ${DATA.title} 특별 취재`;

    $('#toShareBtn').hidden = !canShare();
    const d = payload();
    $('#printed').replaceChildren(
      el('div', { class: 'p-meta' }, `${d.grade}학년 ${d.classNo}반 ${d.name} 기자 · 취재원: ${d.people}`),
      el('h2', null, d.headline),
      el('div', { class: 'p-body' }, d.body),
      ...DATA.reflections.map((ref) => [el('h3', null, ref.label), el('div', { class: 'p-ref' }, d[ref.id])]).flat(),
    );
  }

  // ---------- 7. 공유: 우리 반 기사 읽고 댓글 달기 ----------
  const canShare = () => SHARE_ENABLED && !!SHEET_URL && (state.lastResult === 'ok' || state.lastResult === 'unconfirmed');
  const opened = new Set(); // 펼쳐 둔 기사

  async function sheetCall(body) {
    try {
      const res = await fetch(SHEET_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'text/plain;charset=utf-8' },
        body: JSON.stringify(body),
      });
      return await res.json();
    } catch (e) {
      return { success: false, error: '연결하지 못했어요. 잠시 뒤 다시 해 보세요.' };
    }
  }

  function shareStatus(text, cls) {
    const p = $('#shareStatus');
    p.hidden = !text;
    p.className = 'share-status' + (cls ? ' ' + cls : '');
    p.textContent = text || '';
  }

  function whoAmI() {
    const s = state.student;
    return { grade: s.grade, classNo: s.classNo, name: s.name, studentId: `${s.grade}-${s.classNo}-${s.studentNo}-${s.name}`, classCode: state.classCode || '' };
  }

  function renderShare() {
    $('#classCodeInput').value = state.classCode || '';
    if (state.classCode) loadArticles();
    else { $('#articleList').replaceChildren(); shareStatus('선생님이 알려 준 반 코드를 넣고 [기사 불러오기]를 누르세요.'); }
  }

  let loading = false;
  async function loadArticles() {
    if (loading) return;
    loading = true;
    shareStatus('기사를 불러오는 중…');
    const res = await sheetCall({ action: 'list', ...whoAmI() });
    loading = false;
    if (!res.success) { shareStatus(res.error || '기사를 불러오지 못했어요.', 'err'); return; }
    const articles = [...res.articles].sort((a, b) => b.mine - a.mine);
    shareStatus(articles.length ? `우리 반 기사 ${articles.length}편` : '아직 제출된 기사가 없어요.');
    $('#articleList').replaceChildren(...articles.map(articleCard));
  }

  function articleCard(a) {
    const approved = a.comments.filter((c) => !c.pending).length;
    const detail = el('div', { class: 'article-detail', hidden: !opened.has(a.id) },
      el('div', { class: 'p-body' }, a.body),
      el('div', { class: 'comments' },
        a.comments.length
          ? a.comments.map((c) => el('div', { class: 'comment' + (c.pending ? ' pending' : '') },
              el('div', { class: 'c-meta' }, `${c.author} · ${c.time}${c.pending ? ' · ⏳ 선생님 승인 대기 (나만 보여요)' : ''}`),
              el('div', null, c.text)))
          : el('p', { class: 'empty' }, '아직 승인된 댓글이 없어요.')),
      a.mine ? null : commentForm(a));
    const head = el('button', { class: 'article-head', type: 'button' },
      el('span', { class: 'a-title' }, a.headline),
      el('span', { class: 'a-meta' }, `${a.mine ? '📌 내 기사 · ' : ''}${a.reporter} · 취재원: ${a.people} · 💬 ${approved}`));
    head.addEventListener('click', () => {
      detail.hidden = !detail.hidden;
      if (detail.hidden) opened.delete(a.id); else opened.add(a.id);
    });
    return el('article', { class: 'article-card' + (a.mine ? ' mine' : '') }, head, detail);
  }

  function commentForm(a) {
    const ta = el('textarea', { rows: 3, maxlength: 200, placeholder: '잘 쓴 점 한 가지 + 궁금한 점이나 제안 한 가지 (예: 흥남 철수 장면이 생생했어. 피란민이 왜 남쪽으로 왔는지도 써 주면 좋겠어.)' });
    const count = el('span', null, '0 / 200자');
    const btn = el('button', { class: 'btn primary', type: 'submit' }, '댓글 보내기');
    const msg = el('p', { class: 'share-status', hidden: true });
    ta.addEventListener('input', () => { count.textContent = `${ta.value.length} / 200자`; });
    const form = el('form', { class: 'comment-form' }, ta, el('div', { class: 'row' }, count, btn), msg);
    form.addEventListener('submit', async (e) => {
      e.preventDefault();
      const text = ta.value.trim();
      if (text.length < 5) { msg.hidden = false; msg.className = 'share-status err'; msg.textContent = '댓글을 5글자 이상 써 주세요.'; return; }
      btn.disabled = true;
      const res = await sheetCall({ action: 'comment', ...whoAmI(), articleId: a.id, text });
      btn.disabled = false;
      msg.hidden = false;
      if (res.success) {
        opened.add(a.id);
        loadArticles();
      } else {
        msg.className = 'share-status err';
        msg.textContent = res.error || '댓글을 보내지 못했어요.';
      }
    });
    return form;
  }

  $('#codeForm').addEventListener('submit', (e) => {
    e.preventDefault();
    state.classCode = $('#classCodeInput').value.trim();
    save();
    loadArticles();
  });
  $('#shareRefreshBtn').addEventListener('click', () => { if (state.classCode) loadArticles(); });
  $('#shareBackBtn').addEventListener('click', () => show('done'));
  $('#toShareBtn').addEventListener('click', () => show('share'));

  // ---------- 시작 ----------
  // 무료 서버는 쉬고 있으면 깨어나는 데 시간이 걸리므로, 사이트를 열 때 미리 깨워 둔다
  if (AI_URL) fetch(AI_URL + '/', { mode: 'no-cors' }).catch(() => {});
  if (!state.student) show('login');
  else if (state.screen === 'interview' && !peopleById[state.currentPid]) show('map');
  else if ((state.screen === 'done' || state.screen === 'share') && !state.lastResult) show('article');
  else show(state.screen === 'login' ? 'briefing' : state.screen);
})();
