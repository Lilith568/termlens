// TermLens text engine: tokenising, lemmatising, finding difficult terms,
// choosing the meaning that fits the context (simplified Lesk), simplifying and readability.
// Pure functions; works in browsers and Node 20+.

export const STOP = new Set(('a an the and or but if then else of to in on at by for with from as is are was were be been being it its this that these those ' +
  'which who whom whose what when where why how not no nor so than too very can could may might must shall should will would do does did done ' +
  'has have had having he she they them their his her we us our you your i me my mine about above after again against all any because before ' +
  'below between both during each few further here into more most other over own same some such only out up down off once there through under ' +
  'until while also however by contrast eventually largely one ones its itself themselves').split(/\s+/));

const WORD_RE = /[A-Za-z][A-Za-z'-]*[A-Za-z]|[A-Za-z]/g;

/** Tokens with character offsets. */
export function tokenize(text) {
  const out = [];
  for (const m of String(text).matchAll(WORD_RE)) out.push({ text: m[0], lower: m[0].toLowerCase(), start: m.index, end: m.index + m[0].length });
  return out;
}

/** Sentence spans, used as context windows. */
export function sentences(text) {
  const spans = []; const re = /[^.!?;]+[.!?;]*/g; let m;
  while ((m = re.exec(text))) if (m[0].trim()) spans.push({ start: m.index, end: m.index + m[0].length });
  return spans.length ? spans : [{ start: 0, end: text.length }];
}

const IRREGULAR = { mitochondria: 'mitochondrion', bacteria: 'bacterium', criteria: 'criterion', phenomena: 'phenomenon', nuclei: 'nucleus', fungi: 'fungus', stimuli: 'stimulus', theses: 'thesis', analyses: 'analysis', hypotheses: 'hypothesis', matrices: 'matrix', indices: 'index', vertices: 'vertex', data: 'datum', media: 'medium', genera: 'genus', taxa: 'taxon', alumni: 'alumnus', larvae: 'larva', algae: 'alga', formulae: 'formula', axes: 'axis', crises: 'crisis', diagnoses: 'diagnosis', children: 'child', men: 'man', women: 'woman', feet: 'foot', teeth: 'tooth', mice: 'mouse', geese: 'goose', lice: 'louse' };

/** Candidate dictionary forms for an inflected word, most likely first. */
export function lemmaCandidates(word) {
  const w = word.toLowerCase().replace(/'s$/, '');
  const c = [w];
  if (IRREGULAR[w]) c.unshift(IRREGULAR[w]);
  const add = (x) => { if (x && x.length > 2 && !c.includes(x)) c.push(x); };
  if (w.endsWith('ies')) add(w.slice(0, -3) + 'y');
  if (w.endsWith('ves')) { add(w.slice(0, -3) + 'f'); add(w.slice(0, -3) + 'fe'); }
  if (/(s|x|z|ch|sh)es$/.test(w)) add(w.slice(0, -2));
  if (w.endsWith('es')) add(w.slice(0, -1));
  if (w.endsWith('s') && !w.endsWith('ss') && !w.endsWith('us') && !w.endsWith('is')) add(w.slice(0, -1));
  if (w.endsWith('ied')) add(w.slice(0, -3) + 'y');
  if (w.endsWith('ed')) { add(w.slice(0, -2)); add(w.slice(0, -1)); if (/(.)\1ed$/.test(w)) add(w.slice(0, -3)); }
  if (w.endsWith('ing')) { add(w.slice(0, -3)); add(w.slice(0, -3) + 'e'); if (/(.)\1ing$/.test(w)) add(w.slice(0, -4)); }
  if (w.endsWith('ier')) add(w.slice(0, -3) + 'y');
  if (w.endsWith('er')) { add(w.slice(0, -2)); add(w.slice(0, -1)); }
  if (w.endsWith('iest')) add(w.slice(0, -4) + 'y');
  if (w.endsWith('est')) { add(w.slice(0, -3)); add(w.slice(0, -2)); }
  if (w.endsWith('ly')) add(w.slice(0, -2));
  return c;
}

/** Prefixes (two letters, padded with "_") needed to look up every candidate in the text. */
export function neededPrefixes(text) {
  const set = new Set();
  for (const t of tokenize(text)) for (const c of lemmaCandidates(t.text)) set.add((c + '_').slice(0, 2));
  return [...set];
}

/**
 * Finds difficult terms. `lookup(lemma)` returns [zipf, senses] or undefined.
 * Longest match first (up to 3 words), then single words. A term is difficult when its
 * zipf frequency is below `maxZipf` (multi-word terms already carry an adjusted value).
 */
export function findTerms(text, lookup, { maxZipf = 3.6 } = {}) {
  const toks = tokenize(text);
  const terms = [];
  for (let i = 0; i < toks.length; i++) {
    let found = null;
    for (let n = 3; n >= 2 && !found; n--) {
      if (i + n > toks.length) continue;
      const span = toks.slice(i, i + n);
      if (!/^\s+$/.test(text.slice(span[0].end, span[1].start)) || (n === 3 && !/^\s+$/.test(text.slice(span[1].end, span[2].start)))) continue;
      const head = span.slice(0, -1).map((t) => t.lower).join(' ');
      for (const last of lemmaCandidates(span[n - 1].text)) {
        const e = lookup(`${head} ${last}`);
        if (e) { found = { start: span[0].start, end: span[n - 1].end, surface: text.slice(span[0].start, span[n - 1].end), lemma: `${head} ${last}`, zipf: e[0], senses: e[1], words: n }; break; }
      }
    }
    if (!found) {
      const t = toks[i];
      if (t.lower.length < 4 || STOP.has(t.lower)) continue;
      for (const cand of lemmaCandidates(t.text)) {
        const e = lookup(cand);
        if (e) { found = { start: t.start, end: t.end, surface: t.text, lemma: cand, zipf: e[0], senses: e[1], words: 1 }; break; }
      }
    }
    if (found) {
      if (found.zipf < maxZipf) terms.push(found);
      i += found.words - 1;
    }
  }
  return terms;
}

// ---------- meaning picker (simplified Lesk) ----------
const stem = (w) => w.toLowerCase().replace(/(ies|ied)$/, 'y').replace(/(ing|ed|es|s|ly)$/, '').slice(0, 7);
const contentStems = (s) => new Set(tokenize(s).map((t) => t.lower).filter((w) => w.length > 2 && !STOP.has(w)).map(stem));
const stemMap = (s) => { const m = new Map(); for (const t of tokenize(s)) { const w = t.lower; if (w.length > 2 && !STOP.has(w) && !m.has(stem(w))) m.set(stem(w), w); } return m; };

/** Context = the sentence containing the term plus its neighbours. */
export function contextOf(text, term) {
  const ss = sentences(text);
  const i = Math.max(0, ss.findIndex((s) => term.start >= s.start && term.start < s.end));
  const from = ss[Math.max(0, i - 1)].start; const to = ss[Math.min(ss.length - 1, i + 1)].end;
  return text.slice(from, to);
}

/** Part-of-speech hint from the word form: "diffuses" can only be a verb or a plural noun, "diffused" a verb or adjective. */
const VERB_CUES = new Set(['may', 'might', 'can', 'could', 'will', 'would', 'should', 'must', 'to', 'cannot', "can't", "won't", 'does', 'did', 'not']);
export function posHint(term, text = '') {
  if (term.words > 1) return null;
  const before = text.slice(Math.max(0, term.start - 20), term.start).toLowerCase().match(/([a-z']+)\s+$/);
  if (before && VERB_CUES.has(before[1])) return ['v'];
  const s = term.surface.toLowerCase(); const l = term.lemma;
  if (s === l) return null;
  if (s.endsWith('ing')) return ['v', 'n'];
  if (s.endsWith('ed')) return ['v', 'a', 's'];
  if (s.endsWith('s')) return ['n', 'v'];
  return null;
}

/** Ranks senses by word overlap with the context (simplified Lesk) plus a word-form hint; ties keep dictionary order. */
export function rankSenses(term, context, text = '') {
  const ctx = stemMap(context);
  for (const w of term.lemma.split(' ')) ctx.delete(stem(w));
  const hint = posHint(term, text);
  return term.senses.map((s, idx) => {
    const [pos, def, example, simpler, kindOf, syns] = s;
    const bag = contentStems(`${def} ${example} ${(syns || []).join(' ')} ${kindOf || ''}`);
    let score = 0; const hits = [];
    for (const w of bag) if (ctx.has(w)) { score++; hits.push(ctx.get(w)); }
    if (hint && !hint.includes(pos)) score -= 2;
    return { idx, pos, definition: def, example, simpler: simpler || [], kindOf: kindOf || '', synonyms: syns || [], score, hits };
  }).sort((a, b) => b.score - a.score || a.idx - b.idx);
}

/** Gives a replacement word the same ending as the original (spread → spreads/spread/spreading). */
export function inflectLike(word, surface, lemma, pos) {
  const s = surface.toLowerCase();
  if (s === lemma || lemma.includes(' ')) return word;
  if (pos === 'v' && s.endsWith('ing')) return word.replace(/e$/, '') + 'ing';
  if (pos === 'v' && s.endsWith('ed')) return word.endsWith('e') ? `${word}d` : `${word}ed`;
  if ((pos === 'v' || pos === 'n') && s.endsWith('s')) return /(s|x|z|ch|sh)$/.test(word) ? `${word}es` : word.replace(/([^aeiou])y$/, '$1ie') + 's';
  return word;
}

export const POS = { n: 'noun', v: 'verb', a: 'adjective', s: 'adjective', r: 'adverb' };

/** Removes WordNet's leading domain label like "(biology, chemistry)" and capitalises. */
export function cleanDefinition(def) {
  const d = String(def).replace(/^\([^)]*\)\s*/, '').trim();
  return d.charAt(0).toUpperCase() + d.slice(1) + (/[.!?]$/.test(d) ? '' : '.');
}
export function domainOf(def) { const m = /^\(([^)]*)\)/.exec(String(def)); return m ? m[1] : ''; }

// ---------- simplify and readability ----------
/** Simplifies a paragraph: swaps difficult words for same-meaning simpler words and splits long
 *  sentences at semicolons and ", which". Returns the new text and the list of changes. */
export function simplify(text, terms, contextFor = (t) => contextOf(text, t)) {
  const edits = [];
  for (const t of terms) {
    const best = rankSenses(t, contextFor(t), text)[0];
    const word = best && best.score >= 0 && best.simpler[0];
    if (!word) continue;
    let rep = inflectLike(word, t.surface, t.lemma, best.pos);
    if (/^[A-Z]/.test(t.surface)) rep = rep[0].toUpperCase() + rep.slice(1);
    edits.push({ start: t.start, end: t.end, to: rep, kind: 'word' });
  }
  const inTerm = (i) => edits.some((e) => i >= e.start && i < e.end);
  for (const m of text.matchAll(/;\s+([a-z])/g)) if (!inTerm(m.index)) edits.push({ start: m.index, end: m.index + m[0].length, to: `. ${m[1].toUpperCase()}`, kind: 'split' });
  for (const m of text.matchAll(/,\s+which\s+/g)) if (!inTerm(m.index)) edits.push({ start: m.index, end: m.index + m[0].length, to: '. This ', kind: 'split' });
  edits.sort((a, b) => a.start - b.start);
  let out = ''; let pos = 0; const swaps = [];
  for (const e of edits) {
    if (e.start < pos) continue;
    out += text.slice(pos, e.start);
    swaps.push({ from: text.slice(e.start, e.end), to: e.to, kind: e.kind, start: out.length, end: out.length + e.to.length });
    out += e.to; pos = e.end;
  }
  out += text.slice(pos);
  return { text: out, swaps };
}

export function syllables(word) {
  let w = word.toLowerCase().replace(/[^a-z]/g, '');
  if (!w) return 0;
  if (w.length <= 3) return 1;
  w = w.replace(/(?:[^laeiouy]es|[^laeiouy]ed|[^laeiouy]e)$/, '').replace(/^y/, '');
  const m = w.match(/[aeiouy]{1,2}/g);
  return Math.max(1, m ? m.length : 1);
}

/** Flesch Reading Ease: 206.835 − 1.015·(words/sentences) − 84.6·(syllables/words). Higher = easier. */
export function readingEase(text) {
  const words = tokenize(text);
  if (!words.length) return null;
  const sents = Math.max(1, (String(text).match(/[.!?;]+(\s|$)/g) || []).length);
  const syl = words.reduce((s, w) => s + syllables(w.text), 0);
  const score = 206.835 - 1.015 * (words.length / sents) - 84.6 * (syl / words.length);
  return Math.round(Math.max(0, Math.min(100, score)));
}
export function easeLabel(score) {
  if (score === null) return '';
  if (score >= 70) return 'easy';
  if (score >= 50) return 'fairly difficult';
  if (score >= 30) return 'difficult';
  return 'very difficult';
}
