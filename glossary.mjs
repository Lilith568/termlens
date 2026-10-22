// Personal glossary stored in this browser only, with CSV flashcard export.
const KEY = 'termlens.glossary.v1';

export function createGlossary(storage = globalThis.localStorage) {
  let items = [];
  try { items = JSON.parse(storage?.getItem(KEY) || '[]'); if (!Array.isArray(items)) items = []; } catch { items = []; }
  const save = () => { try { storage?.setItem(KEY, JSON.stringify(items)); } catch { /* storage unavailable: keep in memory */ } };
  return {
    get items() { return [...items]; },
    has: (lemma) => items.some((i) => i.lemma === lemma),
    add(item) {
      if (!item?.lemma || items.some((i) => i.lemma === item.lemma)) return false;
      items = [{ lemma: item.lemma, definition: item.definition, example: item.example || '', simpler: item.simpler || [], addedAt: new Date().toISOString() }, ...items];
      save(); return true;
    },
    remove(lemma) { items = items.filter((i) => i.lemma !== lemma); save(); },
    clear() { items = []; save(); },
  };
}

/** CSV with front,back columns. Imports into Anki (Basic note type) and Quizlet. */
export function toFlashcardCSV(items) {
  const esc = (s) => `"${String(s ?? '').replace(/"/g, '""')}"`;
  const rows = items.map((i) => {
    const back = [i.definition, i.example ? `Example: ${i.example}` : '', i.simpler?.length ? `Simpler: ${i.simpler.join(', ')}` : ''].filter(Boolean).join(' | ');
    return `${esc(i.lemma)},${esc(back)}`;
  });
  return ['"front","back"', ...rows].join('\n');
}
