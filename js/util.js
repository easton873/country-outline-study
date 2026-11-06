// Small shared helpers and screen switching.
const $ = id => document.getElementById(id);

function esc(s) { return s.replace(/[&<>"]/g, m => ({ '&':'&amp;', '<':'&lt;', '>':'&gt;', '"':'&quot;' }[m])); }

function shuffle(a) {
  for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; }
  return a;
}

const SCREENS = ['decks', 'deckEditor', 'home', 'study', 'done'];
function show(id) { for (const s of SCREENS) $(s).classList.toggle('hidden', s !== id); }
