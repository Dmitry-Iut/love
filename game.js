// МИНИ-ИГРА «Товары на полках». Открывается кнопкой «Играть» после стихотворения.
// Правила: коснись товара, потом пустого места на полке. Собери по 3 одинаковых — они исчезнут.
// Убрать все товары до конца таймера = победа (салют + приз). Не успела = «Ничего страшного».
(() => {
  // ====== НАСТРОЙКИ ======
  const CFG = {
    cols: 3, rows: 4,                                              // 12 полок по 3 места
    goods: ['🥤', '🧃', '🍎', '🍑', '🍇', '🥛', '🍒', '🍌', '🍓'],  // 9 видов x3 = 27 товаров (сложность)
    time: 90,                                                      // секунд на игру
    bonus: 2,                                                      // +секунды за каждую тройку
    comboWindow: 5000                                              // мс для комбо
  };
  // =======================

  const SHELVES = CFG.cols * CFG.rows;
  const $ = id => document.getElementById(id);
  const mk = (tag, cls) => { const e = document.createElement(tag); if (cls) e.className = cls; return e; };
  const wait = ms => new Promise(r => setTimeout(r, ms));
  const fmt = s => { s = Math.max(0, Math.ceil(s)); return Math.floor(s / 60) + ':' + String(s % 60).padStart(2, '0'); };
  const sfx = (n, ...a) => { try { window.SFX[n](...a); } catch (e) {} };
  const music = (n, ...a) => { try { window.Music[n](...a); } catch (e) {} };

  // ---------- разметка ----------
  const root = mk('div'); root.id = 'game'; root.className = 'hidden';
  root.innerHTML =
    '<div class="g-top">' +
      '<button class="g-icon" id="gClose" aria-label="Закрыть">✕</button>' +
      '<div class="g-timer" id="gTimer"><div class="g-fill" id="gFill"></div><span id="gTime">1:30</span></div>' +
      '<div class="g-score">⭐ <b id="gScore">0</b></div>' +
    '</div>' +
    '<div class="g-sub"><span id="gLeft"></span><span id="gCombo" class="g-combo"></span></div>' +
    '<div class="g-stage"><div id="gBoard" class="board"></div></div>' +
    '<div class="g-hint">Коснись товара, потом пустого места на полке.<br>Собери по 3 одинаковых 🛒</div>' +
    '<div class="g-count hidden" id="gCount"></div>';
  document.body.appendChild(root);

  const modal = mk('div', 'g-modal hidden'); modal.id = 'gModal';
  modal.innerHTML =
    '<div class="g-card"><div class="g-emoji" id="mEmoji"></div><h2 id="mTitle"></h2><p id="mText"></p>' +
    '<div class="g-stats" id="mStats"></div>' +
    '<button class="g-btn" id="mBtn"></button><button class="g-link hidden" id="mBtn2"></button></div>';
  document.body.appendChild(modal);

  const board = $('gBoard');

  // ---------- состояние ----------
  let shelves = [], slotEls = [], selected = null, running = false, moving = false;
  let score = 0, left = 0, combo = 0, lastMatch = 0, endAt = 0, lastSec = -1, pausedAt = 0, token = 0, tickTimer = null;
  const clearing = new Set();

  // ---------- уровень ----------
  function generate() {
    const total = SHELVES * 3;
    do {
      const cells = [];
      CFG.goods.forEach(g => { for (let k = 0; k < 3; k++) cells.push(g); });
      while (cells.length < total) cells.push(null);
      for (let i = cells.length - 1; i > 0; i--) { const j = (Math.random() * (i + 1)) | 0; [cells[i], cells[j]] = [cells[j], cells[i]]; }
      shelves = [];
      for (let s = 0; s < SHELVES; s++) shelves.push(cells.slice(s * 3, s * 3 + 3));
    } while (shelves.some(sh => sh[0] && sh[0] === sh[1] && sh[1] === sh[2]));   // без готовых троек на старте
    left = CFG.goods.length * 3;
  }

  function buildBoard() {
    board.innerHTML = ''; slotEls = [];
    for (let s = 0; s < SHELVES; s++) {
      const sh = mk('div', 'shelf'); sh.dataset.s = s;
      const row = mk('div', 'slots'); slotEls[s] = [];
      for (let i = 0; i < 3; i++) {
        const sl = mk('div', 'slot'); sl.dataset.i = i;
        sl.appendChild(mk('span', 'item'));
        row.appendChild(sl); slotEls[s][i] = sl;
      }
      sh.appendChild(row); sh.appendChild(mk('div', 'plank'));
      board.appendChild(sh);
    }
  }

  function render() {
    shelves.forEach((sh, s) => sh.forEach((v, i) => {
      const sl = slotEls[s][i], it = sl.firstChild;
      if (it.textContent !== (v || '')) it.textContent = v || '';
      sl.classList.toggle('empty', !v);
      sl.classList.toggle('sel', !!selected && selected.s === s && selected.i === i);
      it.classList.toggle('clearing', clearing.has(s));
    }));
    board.classList.toggle('has-sel', !!selected);
    $('gLeft').textContent = 'Осталось товаров: ' + left;
  }

  // ---------- ввод ----------
  board.addEventListener('pointerdown', e => {
    e.preventDefault();
    const shEl = e.target.closest('.shelf'); if (!shEl) return;
    const slEl = e.target.closest('.slot');
    onTap(+shEl.dataset.s, slEl ? +slEl.dataset.i : null);
  });

  function onTap(s, i) {
    if (!running || moving || clearing.has(s)) return;
    const cell = i !== null ? shelves[s][i] : null;
    if (cell) {                                     // нажали на товар
      if (selected && selected.s === s && selected.i === i) { selected = null; render(); sfx('deselect'); }
      else { selected = { s, i }; render(); sfx('select'); }
      return;
    }
    if (!selected) return;                          // пустое место, но ничего не выбрано
    let target = null;
    if (i !== null) target = { s, i };
    else { const f = shelves[s].indexOf(null); if (f >= 0) target = { s, i: f }; }
    if (!target) { sfx('error'); shake(s); return; } // полка занята
    if (target.s === selected.s) { selected = null; render(); sfx('deselect'); return; }
    moveItem(selected, target);
  }

  function shake(s) {
    const el = board.children[s];
    if (el && el.animate) el.animate([{ transform: 'translateX(0)' }, { transform: 'translateX(-5px)' }, { transform: 'translateX(5px)' }, { transform: 'translateX(0)' }], { duration: 220 });
  }

  function moveItem(from, to) {
    const my = token;
    moving = true;
    const emoji = shelves[from.s][from.i];
    shelves[from.s][from.i] = null;
    selected = null;
    render();
    fly(emoji, slotEls[from.s][from.i], slotEls[to.s][to.i], () => {
      if (my !== token) return;
      shelves[to.s][to.i] = emoji;
      moving = false;
      render();
      sfx('place');
      checkMatch(to.s);
    });
  }

  // полёт товара с полки на полку
  function fly(emoji, fromEl, toEl, done) {
    const f = mk('div', 'fly');
    f.textContent = emoji;
    const fs = getComputedStyle(fromEl.firstChild).fontSize;
    f.style.fontSize = fs;
    if (!f.animate) { done(); return; }
    document.body.appendChild(f);
    const px = parseFloat(fs) || 30;
    const a = fromEl.getBoundingClientRect(), b = toEl.getBoundingClientRect();
    const x0 = a.left + a.width / 2, y0 = a.bottom - px * 0.55;
    const x1 = b.left + b.width / 2, y1 = b.bottom - px * 0.55;
    const tr = (x, y, sc) => 'translate(' + x + 'px,' + y + 'px) translate(-50%,-50%) scale(' + sc + ')';
    const an = f.animate([
      { transform: tr(x0, y0, 1.2) },
      { transform: tr((x0 + x1) / 2, Math.min(y0, y1) - 40, 1.3), offset: 0.5 },
      { transform: tr(x1, y1, 1) }
    ], { duration: 280, easing: 'cubic-bezier(.35,.1,.3,1)', fill: 'forwards' });
    an.onfinish = () => { f.remove(); done(); };
  }

  // ---------- тройки ----------
  function checkMatch(s) {
    const sh = shelves[s];
    if (sh[0] && sh[0] === sh[1] && sh[1] === sh[2]) clearShelf(s);
  }

  function clearShelf(s) {
    const my = token, now = performance.now();
    clearing.add(s);
    combo = now - lastMatch < CFG.comboWindow ? combo + 1 : 1;
    lastMatch = now;
    [0, 1, 2].forEach(i => { slotEls[s][i].firstChild.style.animationDelay = i * 70 + 'ms'; });
    render();
    sfx('match', combo);
    [0, 1, 2].forEach(i => setTimeout(() => sfx('pop', i), 120 + i * 90));

    const r = board.children[s].getBoundingClientRect();
    sparks(r.left + r.width / 2, r.top + r.height / 2);

    score += 100 * combo;
    $('gScore').textContent = score;
    endAt = Math.min(endAt + CFG.bonus * 1000, now + CFG.time * 1000);
    const tr = $('gTimer').getBoundingClientRect();
    floatText('+' + CFG.bonus + 'с', tr.left + tr.width / 2, tr.bottom + 6);
    setTimeout(() => sfx('bonus'), 300);
    if (combo > 1) {
      const cb = $('gCombo'); cb.textContent = 'Комбо ×' + combo + '! 🔥';
      cb.style.animation = 'none'; void cb.offsetWidth; cb.style.animation = '';
    }

    setTimeout(() => {
      if (my !== token) return;
      [0, 1, 2].forEach(i => { slotEls[s][i].firstChild.style.animationDelay = ''; });
      shelves[s] = [null, null, null];
      clearing.delete(s);
      left -= 3;
      render();
      if (left <= 0 && running) win();
    }, 560);
  }

  function sparks(x, y) {
    for (let k = 0; k < 9; k++) {
      const sp = mk('span', 'spark');
      sp.textContent = ['✨', '⭐', '💖'][k % 3];
      const a = (k / 9) * Math.PI * 2 + Math.random() * 0.5, d = 40 + Math.random() * 40;
      sp.style.left = x + 'px'; sp.style.top = y + 'px';
      sp.style.setProperty('--dx', Math.cos(a) * d + 'px');
      sp.style.setProperty('--dy', Math.sin(a) * d + 'px');
      sp.addEventListener('animationend', () => sp.remove());
      document.body.appendChild(sp);
    }
  }
  function floatText(txt, x, y) {
    const t = mk('div', 'g-float'); t.textContent = txt;
    t.style.left = x + 'px'; t.style.top = y + 'px';
    t.addEventListener('animationend', () => t.remove());
    document.body.appendChild(t);
  }

  // ---------- таймер ----------
  function updateTimer(rem) {
    $('gFill').style.transform = 'scaleX(' + Math.max(0, Math.min(1, rem / CFG.time)) + ')';
    $('gTime').textContent = fmt(rem);
    $('gTimer').classList.toggle('danger', rem <= 15);
  }
  function tick() {
    if (!running) return;
    const rem = (endAt - performance.now()) / 1000;
    if (rem <= 0) { updateTimer(0); lose(); return; }
    updateTimer(rem);
    const sec = Math.ceil(rem);
    if (sec !== lastSec) { lastSec = sec; if (sec <= 10) sfx('tick', sec <= 5); }
  }
  document.addEventListener('visibilitychange', () => {
    if (!running) return;
    if (document.hidden) pausedAt = performance.now();
    else if (pausedAt) { endAt += performance.now() - pausedAt; pausedAt = 0; }
  });

  // ---------- старт / конец ----------
  function showCount(txt) {
    const c = $('gCount'); c.classList.remove('hidden'); c.innerHTML = '';
    const s = mk('span', typeof txt === 'number' ? '' : 'go'); s.textContent = txt; c.appendChild(s);
  }

  async function begin() {
    const my = ++token;
    hideModal();
    if (window.Fireworks) Fireworks.stop();
    clearInterval(tickTimer);
    running = false; moving = false; selected = null; clearing.clear();
    score = 0; combo = 0; lastMatch = 0; lastSec = -1;
    generate(); buildBoard(); render();
    $('gScore').textContent = '0'; $('gCombo').textContent = '';
    updateTimer(CFG.time);
    music('duck', 1);
    for (const n of [3, 2, 1, 'Поехали!']) {
      if (my !== token) return;
      showCount(n);
      sfx('countdown', n === 'Поехали!');
      await wait(n === 'Поехали!' ? 600 : 700);
    }
    if (my !== token) return;
    $('gCount').classList.add('hidden');
    sfx('start');
    running = true;
    endAt = performance.now() + CFG.time * 1000;
    tickTimer = setInterval(tick, 200);
  }

  function win() {
    running = false; clearInterval(tickTimer);
    const rem = Math.max(0, (endAt - performance.now()) / 1000);
    sfx('win'); music('duck', 0.35);
    if (window.Fireworks) Fireworks.start();
    const my = token;
    setTimeout(() => {
      if (my !== token) return;
      showModal({
        cls: 'win', emoji: '🥰', title: 'Ты ж моя умница!',
        text: 'Поздравляю, Леночка! Ты справилась, и у меня для тебя есть приз 🎁',
        stats: '⭐ ' + score + '  ·  ⏱ осталось ' + fmt(rem),
        btn: 'Приз 🎁',
        onBtn: () => { if (window.Fireworks) Fireworks.stop(); hideModal(); prize(); }
      });
    }, 1100);
  }

  function lose() {
    running = false; clearInterval(tickTimer);
    selected = null; render();
    sfx('lose'); music('duck', 0.4);
    showModal({
      cls: 'lose', emoji: '🤍', title: 'Ничего страшного!',
      text: 'Попробуй ещё раз, у тебя обязательно получится 💗',
      stats: '⭐ ' + score,
      btn: 'Ещё раз 🔄', onBtn: begin,
      btn2: 'Выйти', onBtn2: close
    });
  }

  function prize() {
    if (window.Kiss) Kiss.show(close);
    else close();
  }

  // ---------- окно ----------
  function showModal(o) {
    modal.className = 'g-modal hidden ' + (o.cls || '');
    $('mEmoji').textContent = o.emoji; $('mTitle').textContent = o.title;
    $('mText').textContent = o.text; $('mStats').textContent = o.stats || '';
    const b1 = $('mBtn'), b2 = $('mBtn2');
    b1.textContent = o.btn;
    b1.onclick = () => { sfx('button'); o.onBtn && o.onBtn(); };
    if (o.btn2) { b2.textContent = o.btn2; b2.classList.remove('hidden'); b2.onclick = () => { sfx('button'); o.onBtn2 && o.onBtn2(); }; }
    else b2.classList.add('hidden');
    modal.classList.remove('hidden');
    requestAnimationFrame(() => requestAnimationFrame(() => modal.classList.add('show')));
  }
  function hideModal() { modal.classList.remove('show'); modal.classList.add('hidden'); }

  // ---------- открыть / закрыть ----------
  function open() {
    if (!root.classList.contains('hidden')) return;
    root.classList.remove('hidden');
    requestAnimationFrame(() => requestAnimationFrame(() => root.classList.add('show')));
    if (window.HeartScene) HeartScene.paused = true;
    music('setTrack', 'shop');
    begin();
  }
  function close() {
    token++; running = false; clearInterval(tickTimer);
    if (window.Fireworks) Fireworks.stop();
    hideModal();
    root.classList.remove('show');
    setTimeout(() => root.classList.add('hidden'), 350);
    if (window.HeartScene) HeartScene.paused = false;
    music('setTrack', 'love'); music('duck', 1);
  }

  $('gClose').addEventListener('pointerdown', e => { e.preventDefault(); sfx('button'); close(); });

  window.Game = { open, close };
})();
