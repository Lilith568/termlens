import { neededPrefixes, findTerms, rankSenses, contextOf, simplify, readingEase, easeLabel, cleanDefinition, domainOf, POS } from './text.mjs';
import { createLexicon } from './lexicon.mjs';
import { createGlossary, toFlashcardCSV } from './glossary.mjs';

const $ = (id) => document.getElementById(id);
const esc = (s) => String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const lex = createLexicon();
const glossary = createGlossary();
const state = { text: '', terms: [], active: null };

$('sample').addEventListener('click', async () => {
  $('input').value = (await fetch('./sample.txt').then((r) => r.text())).trim();
  $('input').focus();
});
$('explain').addEventListener('click', analyse);
$('input').addEventListener('keydown', (e) => { if (e.key === 'Enter' && (e.ctrlKey || e.metaKey)) analyse(); });
$('edit').addEventListener('click', () => { $('reader-view').hidden = true; $('input-view').hidden = false; $('input').focus(); });
$('level').addEventListener('input', () => { if (state.text) { state.terms = findTerms(state.text, lex.lookup, { maxZipf: Number($('level').value) }); render(); } });
$('simplify').addEventListener('change', render);

async function analyse() {
  const text = $('input').value.trim();
  if (!text) { $('input').focus(); return; }
  $('explain').disabled = true; $('explain').textContent = 'Reading…';
  try {
    await lex.load(neededPrefixes(text));
    state.text = text; state.active = null;
    state.terms = findTerms(text, lex.lookup, { maxZipf: Number($('level').value) });
    $('input-view').hidden = true; $('reader-view').hidden = false;
    render();
    $('reader').focus();
  } catch (err) {
    $('count').textContent = `Could not load the dictionary (${err.message}). Please reload the page.`;
  } finally { $('explain').disabled = false; $('explain').textContent = 'Explain terms'; }
}

function render() {
  const { text, terms } = state;
  const n = new Set(terms.map((t) => t.lemma)).size;
  $('count').textContent = n ? `${n} difficult term${n === 1 ? '' : 's'} found` : 'No difficult terms at this level';
  const englishish = (text.match(/\b(the|and|of|is|to|in)\b/gi) || []).length > Math.max(2, text.split(/\s+/).length / 40);
  $('hint').textContent = !n ? 'Move the slider towards “Harder” to see more terms.' : !englishish ? 'This version explains English terms. Other languages are planned.' : 'Click a highlighted term. Terms in your glossary turn green.';
  const simple = $('simplify').checked;
  if (simple) {
    const s = simplify(text, terms);
    const before = readingEase(text); const after = readingEase(s.text);
    $('scores').hidden = false;
    $('scores').innerHTML = `<span class="score">Original: <b>${before}</b>/100 · ${easeLabel(before)}</span><span class="score ${after > before ? 'up' : ''}">Simplified: <b>${after}</b>/100 · ${easeLabel(after)}</span><span class="score">${s.swaps.length} change${s.swaps.length === 1 ? '' : 's'}</span>`;
    let html = ''; let pos = 0;
    for (const w of s.swaps) { html += esc(s.text.slice(pos, w.start)); html += `<span class="swap" title="Original: ${esc(w.from.trim())}">${esc(w.to)}</span>`; pos = w.end; }
    $('reader').innerHTML = html + esc(s.text.slice(pos));
    return;
  }
  $('scores').hidden = true;
  let html = ''; let pos = 0;
  terms.forEach((t, i) => {
    html += esc(text.slice(pos, t.start));
    const cls = ['term', glossary.has(t.lemma) ? 'learned' : '', state.active === i ? 'active' : ''].join(' ');
    html += `<button class="${cls}" data-i="${i}" aria-label="Explain ${esc(t.surface)}">${esc(t.surface)}</button>`;
    pos = t.end;
  });
  $('reader').innerHTML = html + esc(text.slice(pos));
}

$('reader').addEventListener('click', (e) => { const b = e.target.closest('button.term'); if (b) showCard(Number(b.dataset.i)); });

function showCard(i) {
  state.active = i; render();
  const t = state.terms[i];
  const ranked = rankSenses(t, contextOf(state.text, t), state.text);
  const best = ranked[0];
  const domain = domainOf(best.definition);
  const facts = [
    best.simpler.length ? `<li><b>In simpler words:</b> ${best.simpler.map(esc).join(', ')}</li>` : '',
    best.kindOf ? `<li><b>A kind of:</b> ${esc(best.kindOf)}</li>` : '',
    best.synonyms.length ? `<li><b>Also called:</b> ${best.synonyms.slice(0, 3).map(esc).join(', ')}</li>` : '',
  ].join('');
  const others = ranked.slice(1);
  const inGlossary = glossary.has(t.lemma);
  $('card').innerHTML = `
    <h2>${esc(t.lemma)}</h2>
    <p class="meta">${esc(POS[best.pos] || '')}${domain ? ` · ${esc(domain)}` : ''}${t.surface.toLowerCase() !== t.lemma ? ` · in your text: “${esc(t.surface)}”` : ''}</p>
    <p class="explain">${esc(cleanDefinition(best.definition))}</p>
    ${best.example ? `<p class="ex">“${esc(best.example)}”</p>` : ''}
    ${facts ? `<ul class="facts">${facts}</ul>` : ''}
    ${others.length ? `<details class="others"><summary>Other meanings (${others.length})</summary><ul>${others.map((o) => `<li><i>${esc(POS[o.pos] || '')}</i>: ${esc(cleanDefinition(o.definition))}</li>`).join('')}</ul></details>` : ''}
    <button class="btn primary small" id="add" ${inGlossary ? 'disabled' : ''}>${inGlossary ? 'In your glossary ✓' : 'Add to glossary'}</button>
    <p class="source">Meaning chosen to fit your sentence${best.hits.length ? ` (shared words: ${best.hits.slice(0, 4).map(esc).join(', ')})` : ''}. Source: Open English WordNet.</p>`;
  $('add').addEventListener('click', () => {
    glossary.add({ lemma: t.lemma, definition: cleanDefinition(best.definition), example: best.example, simpler: best.simpler });
    renderGlossary(); showCard(i);
  });
}

function renderGlossary() {
  const items = glossary.items;
  $('gl-count').textContent = items.length ? `(${items.length})` : '';
  $('gl-empty').hidden = items.length > 0;
  $('export').disabled = !items.length; $('clear').disabled = !items.length;
  $('gl-list').innerHTML = items.map((i) => `<li><span><b>${esc(i.lemma)}</b><small>${esc(i.definition)}</small></span><button class="x" data-l="${esc(i.lemma)}" aria-label="Remove ${esc(i.lemma)}">×</button></li>`).join('');
}
$('gl-list').addEventListener('click', (e) => { const b = e.target.closest('button.x'); if (b) { glossary.remove(b.dataset.l); renderGlossary(); if (state.text) render(); } });
$('clear').addEventListener('click', () => { glossary.clear(); renderGlossary(); if (state.text) render(); });
$('export').addEventListener('click', () => {
  const url = URL.createObjectURL(new Blob([toFlashcardCSV(glossary.items)], { type: 'text/csv' }));
  const a = Object.assign(document.createElement('a'), { href: url, download: 'termlens-flashcards.csv' });
  document.body.append(a); a.click(); a.remove(); setTimeout(() => URL.revokeObjectURL(url), 1000);
});
renderGlossary();
