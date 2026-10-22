import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import * as T from '../text.mjs';
import { createLexicon } from '../lexicon.mjs';
import { createGlossary, toFlashcardCSV } from '../glossary.mjs';

const dir = new URL('../dict/', import.meta.url);
const lex = createLexicon(dir.href, async (u) => JSON.parse(fs.readFileSync(new URL(u), 'utf8')));
const sample = fs.readFileSync(new URL('../sample.txt', import.meta.url), 'utf8').trim();
const prepared = (async () => { await lex.load(T.neededPrefixes(sample + ' The nucleus of an atom contains protons and neutrons and carries a positive charge. In eukaryotic cells the nucleus contains the DNA and controls growth of the cell.')); })();

test('lemma candidates cover common inflections', () => {
  assert.ok(T.lemmaCandidates('membranes').includes('membrane'));
  assert.ok(T.lemmaCandidates('diffused').includes('diffuse'));
  assert.ok(T.lemmaCandidates('studies').includes('study'));
  assert.equal(T.lemmaCandidates('mitochondria')[0], 'mitochondrion');
});

test('finds difficult single and multi-word terms, never common words', async () => {
  await prepared;
  const terms = T.findTerms(sample, lex.lookup, { maxZipf: 3.6 });
  const lemmas = terms.map((t) => t.lemma);
  for (const w of ['osmosis', 'cell membrane', 'hypotonic', 'phospholipid', 'turgor']) assert.ok(lemmas.includes(w), w);
  for (const w of ['water', 'movement', 'region', 'because', 'cells']) assert.ok(!lemmas.includes(w), w);
  assert.ok(terms.length >= 8);
});

test('the slider threshold changes how many terms count as difficult', async () => {
  await prepared;
  const easy = T.findTerms(sample, lex.lookup, { maxZipf: 2.6 }).length;
  const hard = T.findTerms(sample, lex.lookup, { maxZipf: 4.3 }).length;
  assert.ok(hard > easy);
});

test('context chooses the right meaning (Lesk)', async () => {
  await prepared;
  const t1 = T.findTerms(sample, lex.lookup, { maxZipf: 3.6 }).find((t) => t.lemma === 'hypotonic');
  assert.match(T.rankSenses(t1, T.contextOf(sample, t1), sample)[0].definition, /solution/);
  const t2 = T.findTerms(sample, lex.lookup, { maxZipf: 3.6 }).find((t) => t.surface === 'diffuses');
  assert.equal(T.rankSenses(t2, T.contextOf(sample, t2), sample)[0].pos, 'v');
  const nucleusIn = (text) => { const t = T.findTerms(text, lex.lookup, { maxZipf: 9 }).find((x) => x.lemma === 'nucleus'); return T.rankSenses(t, text, text)[0].definition; };
  assert.match(nucleusIn('The nucleus of an atom contains protons and neutrons and carries a positive charge.'), /atom/i);
  assert.match(nucleusIn('In eukaryotic cells the nucleus contains the DNA and controls growth of the cell.'), /cell/i);
});

test('simplify swaps words, keeps inflection and raises readability', async () => {
  await prepared;
  const terms = T.findTerms(sample, lex.lookup, { maxZipf: 3.6 });
  const s = T.simplify(sample, terms);
  assert.ok(s.text.includes('spreads'));
  assert.ok(T.readingEase(s.text) > T.readingEase(sample));
  assert.equal(T.inflectLike('spread', 'diffuses', 'diffuse', 'v'), 'spreads');
  assert.equal(T.inflectLike('move', 'diffusing', 'diffuse', 'v'), 'moving');
});

test('readability score behaves sensibly', () => {
  assert.ok(T.readingEase('The cat sat on the mat. It was warm.') > 80);
  assert.ok(T.readingEase('Notwithstanding considerable methodological heterogeneity, investigators characterised multidimensional interdependencies.') < 20);
  assert.equal(T.syllables('water'), 2);
});

test('glossary de-duplicates, persists and exports CSV', () => {
  const store = new Map(); const storage = { getItem: (k) => store.get(k) ?? null, setItem: (k, v) => store.set(k, v) };
  const g = createGlossary(storage);
  assert.equal(g.add({ lemma: 'osmosis', definition: 'Diffusion of "water".', example: 'x' }), true);
  assert.equal(g.add({ lemma: 'osmosis', definition: 'again' }), false);
  assert.equal(createGlossary(storage).items.length, 1);
  const csv = toFlashcardCSV(g.items);
  assert.match(csv, /^"front","back"\n"osmosis","Diffusion of ""water""\. \| Example: x"$/);
});
