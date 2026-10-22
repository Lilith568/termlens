// Lazy loader for the dictionary chunks in dict/. Only the files needed for a text are fetched.
export function createLexicon(baseUrl = './dict/', fetchJson = (u) => fetch(u).then((r) => { if (!r.ok) throw new Error(`Could not load ${u}`); return r.json(); })) {
  let index = null;
  const files = new Map(); // file name -> Promise<object>
  const entries = new Map();
  async function ensureIndex() { if (!index) index = await fetchJson(`${baseUrl}index.json`); return index; }
  return {
    async load(prefixes) {
      const idx = await ensureIndex();
      const names = [...new Set(prefixes.map((p) => idx.files[p]).filter(Boolean))];
      await Promise.all(names.map((n) => {
        if (!files.has(n)) files.set(n, fetchJson(`${baseUrl}${n}.json`).then((obj) => { for (const k in obj) entries.set(k, obj[k]); return obj; }));
        return files.get(n);
      }));
    },
    lookup: (lemma) => entries.get(lemma),
    get source() { return index ? index.source : ''; },
    get loadedFiles() { return files.size; },
  };
}
