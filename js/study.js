// Deck home (start buttons + progress), study sessions, and the answer autocomplete.
let currentDeckId = ALL_DECK_ID;
let queue = [], idx = 0, current = null, answered = false, right = 0, wrong = 0;

const currentDeck = () => getDeck(currentDeckId) || allDeck();
const currentPool = () => deckCountries(currentDeck());

/* ---- deck home ---- */
function openDeck(id) {
  currentDeckId = getDeck(id) ? id : ALL_DECK_ID;
  const deck = currentDeck(), n = deckCountries(deck).length;
  $('deckTitle').textContent = deck.name;
  $('editDeck').classList.toggle('hidden', !!deck.builtin);
  $('count').max = n;
  $('count').value = Math.min(20, n);
  renderStats();
  show('home');
}

function renderStats() {
  const pool = currentPool();
  const missed = pool.filter(c => peek(c.code).score > 0).length;
  $('missedCount').textContent = missed; $('startMissed').disabled = !missed;
  $('start').disabled = $('startAll').disabled = !pool.length;
  const seen = pool.filter(c => peek(c.code).views).length;
  $('seenCount').textContent = `${seen}/${pool.length} seen`;
  const rows = pool.map(c => ({ c, s: peek(c.code) }))
    .sort((a, b) => b.s.score - a.s.score || a.s.views - b.s.views || a.c.name.localeCompare(b.c.name));
  $('stats').innerHTML = rows.map(r => `<tr><td>${esc(r.c.name)}</td><td>${r.s.views}</td><td>${r.s.score}</td></tr>`).join('');
}

/* ---- session ---- */
function startSession(all, missedOnly) {
  const pool = currentPool();
  if (!pool.length) return;
  const n = all === true ? pool.length : Math.max(1, Math.min(pool.length, parseInt($('count').value) || 20));
  if (missedOnly) {
    queue = pool.filter(c => peek(c.code).score > 0)
      .sort((a, b) => stats[b.code].score - stats[a.code].score || Math.random() - .5);
    if (!queue.length) return;
  } else {
    queue = shuffle(pool.slice()).sort((a, b) => {
      const sa = peek(a.code), sb = peek(b.code);
      return sa.views - sb.views || sb.score - sa.score; // fewest views, then highest score
    }).slice(0, n);
  }
  idx = 0; right = wrong = 0;
  show('study'); nextQuestion();
}

function nextQuestion() {
  if (idx >= queue.length) return endSession(false);
  current = queue[idx]; answered = false;
  $('img').src = current.file;
  $('progress').textContent = `${idx + 1} / ${queue.length}`;
  $('answer').value = ''; $('answer').disabled = false;
  $('result').textContent = ''; $('result').className = 'result';
  $('next').classList.add('hidden');
  $('answer').focus({ preventScroll: true });
  $('img').scrollIntoView({ block: 'start' });
  renderList();
}

function submit(country) {
  if (answered) return;
  answered = true;
  const s = get(current.code);
  s.views++;
  if (country.code === current.code) {
    s.score = Math.max(0, s.score - 1); right++;
    $('result').textContent = '✓ Correct: ' + current.name; $('result').className = 'result good';
  } else {
    s.score += 5; wrong++;
    $('result').textContent = `✗ Wrong — it's ${current.name}`; $('result').className = 'result bad';
  }
  saveStats(); idx++;
  $('answer').disabled = true; closeList();
  $('next').textContent = idx >= queue.length ? 'Finish' : 'Next';
  $('next').classList.remove('hidden'); $('next').focus();
}

function endSession(early) {
  const skipped = early ? queue.length - idx : 0;
  $('doneTitle').textContent = early ? 'Session finished early' : 'Session complete';
  $('summary').textContent = `Correct: ${right}, wrong: ${wrong}` + (early ? `, skipped: ${skipped}` : '') + '.';
  show('done');
}

/* ---- autocomplete (offers every country, so the deck doesn't give away the answer) ---- */
let matches = [], active = -1;
function filterNames(q) {
  q = q.trim().toLowerCase();
  const cmp = (a, b) => a.name.localeCompare(b.name);
  if (!q) return COUNTRIES.slice().sort(cmp);
  const starts = [], contains = [];
  for (const c of COUNTRIES) {
    const i = c.name.toLowerCase().indexOf(q);
    if (i === 0) starts.push(c); else if (i > 0) contains.push(c);
  }
  return starts.sort(cmp).concat(contains.sort(cmp));
}
function renderList() {
  const input = $('answer');
  if (answered || input.disabled) return closeList();
  matches = filterNames(input.value); active = matches.length ? 0 : -1;
  const ul = $('list');
  ul.innerHTML = matches.length
    ? matches.map((c, i) => `<li role="option" data-i="${i}" class="${i === active ? 'active' : ''}">${esc(c.name)}</li>`).join('')
    : '<li class="empty">No matches</li>';
  ul.classList.remove('hidden'); input.setAttribute('aria-expanded', 'true');
  ul.scrollTop = 0;
}
function closeList() { $('list').classList.add('hidden'); $('answer').setAttribute('aria-expanded', 'false'); }
function setActive(i) {
  if (!matches.length) return;
  active = (i + matches.length) % matches.length;
  [...$('list').children].forEach((li, k) => li.classList.toggle('active', k === active));
  $('list').children[active].scrollIntoView({ block: 'nearest' });
}

function initStudy() {
  $('answer').addEventListener('input', renderList);
  $('answer').addEventListener('focus', renderList);
  $('answer').addEventListener('keydown', e => {
    if (e.key === 'ArrowDown') { e.preventDefault(); if ($('list').classList.contains('hidden')) renderList(); else setActive(active + 1); }
    else if (e.key === 'ArrowUp') { e.preventDefault(); setActive(active - 1); }
    else if (e.key === 'Enter') { e.preventDefault(); if (matches[active]) submit(matches[active]); }
    else if (e.key === 'Escape') closeList();
  });
  $('list').addEventListener('mousedown', e => {
    const li = e.target.closest('li[data-i]'); if (!li) return;
    e.preventDefault(); submit(matches[+li.dataset.i]);
  });
  document.addEventListener('click', e => { if (!e.target.closest('.combo') && document.activeElement !== $('answer')) closeList(); });

  $('start').onclick = () => startSession();
  $('startAll').onclick = () => startSession(true);
  $('startMissed').onclick = () => startSession(false, true);
  $('next').onclick = nextQuestion;
  $('finish').onclick = () => endSession(true);
  $('again').onclick = () => openDeck(currentDeckId);
  $('backToDecks').onclick = showDecks;
}
