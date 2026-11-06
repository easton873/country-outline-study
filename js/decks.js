// Deck list screen and the create/edit deck screen.
let editingId = null;          // null while creating a new deck
let selected = new Set();      // country codes checked in the editor

/* ---- deck list ---- */
function showDecks() {
  $('deckItems').innerHTML = allDecks().map(d => {
    const pool = deckCountries(d);
    const missed = pool.filter(c => peek(c.code).score > 0).length;
    return `<button class="deck-btn" data-id="${esc(d.id)}"><strong>${esc(d.name)}</strong>` +
      `<span class="muted">${pool.length} countries · ${missed} missed</span></button>`;
  }).join('');
  show('decks');
}

/* ---- editor ---- */
function openEditor(id) {
  editingId = id;
  const deck = id ? getDeck(id) : null;
  selected = new Set(deck ? deck.codes : []);
  $('editorTitle').textContent = deck ? 'Edit deck' : 'New deck';
  $('edName').value = deck ? deck.name : '';
  $('edFilter').value = '';
  $('edScore').value = 1;
  $('edDelete').classList.toggle('hidden', !deck);
  $('edError').textContent = '';
  renderPicker(); updateAutoInfo();
  show('deckEditor');
}

function scoreCutoff() { return Math.max(0, parseInt($('edScore').value) || 0); }
function scoreMatches() { const n = scoreCutoff(); return COUNTRIES.filter(c => peek(c.code).score >= n); }

function updateAutoInfo() {
  const n = scoreCutoff(), m = scoreMatches().length;
  $('edAutoInfo').textContent = `${m} ${m === 1 ? 'country has' : 'countries have'} a score ≥ ${n}.`;
  $('edAuto').textContent = editingId ? `Add all with score ≥ ${n}` : `Auto-create deck (score ≥ ${n})`;
}

function updateSelectedCount() { $('edCount').textContent = `${selected.size} selected`; }

function renderPicker() {
  const q = $('edFilter').value.trim().toLowerCase();
  const rows = COUNTRIES.slice().sort((a, b) => a.name.localeCompare(b.name))
    .filter(c => !q || c.name.toLowerCase().includes(q));
  $('edList').innerHTML = rows.length
    ? rows.map(c => `<label><input type="checkbox" data-code="${c.code}"${selected.has(c.code) ? ' checked' : ''}>` +
        `<span>${esc(c.name)}</span><span class="score">score ${peek(c.code).score}</span></label>`).join('')
    : '<p class="muted" style="padding:12px;margin:0">No matches</p>';
  updateSelectedCount();
}

function autoAction() {
  const matched = scoreMatches();
  if (!matched.length) { $('edError').textContent = 'No countries match that score.'; return; }
  if (editingId) {                       // editing: add matches to the selection
    matched.forEach(c => selected.add(c.code));
    $('edError').textContent = '';
    renderPicker();
  } else {                               // creating: build and save the deck right away
    selected = new Set(matched.map(c => c.code));
    saveEditor(`Score ≥ ${scoreCutoff()}`);
  }
}

function saveEditor(fallbackName) {
  const name = $('edName').value.trim() || fallbackName || '';
  if (!name) { $('edError').textContent = 'Give the deck a name.'; return; }
  if (!selected.size) { $('edError').textContent = 'Pick at least one country.'; return; }
  const id = editingId || newDeckId();
  upsertDeck({ id, name, codes: COUNTRIES.filter(c => selected.has(c.code)).map(c => c.code) });
  editingId ? openDeck(id) : showDecks();
}

function initDecks() {
  $('deckItems').addEventListener('click', e => {
    const b = e.target.closest('.deck-btn'); if (b) openDeck(b.dataset.id);
  });
  $('addDeck').onclick = () => openEditor(null);
  $('reset').onclick = () => {
    if (confirm('Erase all views and scores?')) { resetStats(); showDecks(); }
  };

  $('editDeck').onclick = () => openEditor(currentDeckId);
  $('edFilter').addEventListener('input', renderPicker);
  $('edScore').addEventListener('input', updateAutoInfo);
  $('edAuto').onclick = autoAction;
  $('edList').addEventListener('change', e => {
    const cb = e.target.closest('input[data-code]'); if (!cb) return;
    cb.checked ? selected.add(cb.dataset.code) : selected.delete(cb.dataset.code);
    updateSelectedCount();
  });
  $('edClear').onclick = () => { selected.clear(); renderPicker(); };
  $('edSave').onclick = () => saveEditor();
  $('edCancel').onclick = () => editingId ? openDeck(editingId) : showDecks();
  $('edDelete').onclick = () => {
    const d = getDeck(editingId);
    if (d && confirm(`Delete deck "${d.name}"? Scores and views are kept.`)) { removeDeck(editingId); showDecks(); }
  };
}
