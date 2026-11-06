// Persistence: global per-country stats (views/score) and the user's decks.
const STATS_KEY = 'countryOutlineStats.v1';
const DECKS_KEY = 'countryOutlineDecks.v1';
const ALL_DECK_ID = 'all';

function loadJSON(key, fallback) {
  try { const v = JSON.parse(localStorage.getItem(key)); return v ?? fallback; } catch { return fallback; }
}
function saveJSON(key, value) { try { localStorage.setItem(key, JSON.stringify(value)); } catch {} }

/* ---- stats (global, not per deck) ---- */
let stats = loadJSON(STATS_KEY, {});
const get = code => stats[code] || (stats[code] = { views: 0, score: 0 });
const peek = code => stats[code] || { views: 0, score: 0 };
function saveStats() { saveJSON(STATS_KEY, stats); }
function resetStats() { stats = {}; saveStats(); }

/* ---- decks ---- */
let customDecks = loadJSON(DECKS_KEY, []);
if (!Array.isArray(customDecks)) customDecks = [];
function saveDecks() { saveJSON(DECKS_KEY, customDecks); }

const allDeck = () => ({ id: ALL_DECK_ID, name: 'All countries', codes: COUNTRIES.map(c => c.code), builtin: true });
const allDecks = () => [allDeck(), ...customDecks];
const getDeck = id => allDecks().find(d => d.id === id);
const deckCountries = deck => deck.codes.map(c => byCode[c]).filter(Boolean);
const newDeckId = () => 'd' + Date.now().toString(36) + Math.random().toString(36).slice(2, 6);

function upsertDeck(deck) {
  const i = customDecks.findIndex(d => d.id === deck.id);
  if (i >= 0) customDecks[i] = deck; else customDecks.push(deck);
  saveDecks();
}
function removeDeck(id) { customDecks = customDecks.filter(d => d.id !== id); saveDecks(); }
