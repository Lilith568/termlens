# TermLens

**Paste your course material. The words that block you light up. One click explains them.**

TermLens is a reading companion for university students. Paste a paragraph from lecture notes, a script or a textbook. TermLens highlights the difficult terms, explains each one with the meaning that fits *your* sentence, and collects them in a personal glossary you can export as flashcards. Everything runs in the browser, with no account, no AI service and no upload.

Built for **Build With AI: Basics** (Devpost Learn) with the Devpost Learn Skill Pack. The planning documents are in [`devpost/`](devpost): [`scope.md`](devpost/scope.md), [`prd.md`](devpost/prd.md), [`spec.md`](devpost/spec.md) and the build [`checklist.md`](devpost/checklist.md).

- **Live app:** https://lilith568.github.io/termlens/
- **Demo video:** see the Devpost submission

## What it does

- **Finds difficult terms**, including multi-word terms ("cell membrane") and inflected forms ("diffuses" → "diffuse"). An *Easier ↔ Harder* slider sets how rare a word must be to count.
- **Explains in context**: a short explanation, an example sentence, simpler words and "a kind of …". When a word has several meanings, TermLens picks the one that fits your sentence (simplified **Lesk algorithm**: the meaning whose definition shares the most words with the surrounding sentences wins, with a word-form hint for verbs/nouns). Other meanings stay one click away.
- **Simplify view**: swaps difficult words for same-meaning simpler words (keeping the word ending), splits long sentences, and shows the **Flesch Reading Ease** score before and after.
- **Glossary and flashcards**: saved on this device (localStorage) and exported as CSV for Anki or Quizlet.

## Run locally

```bash
python3 -m http.server 8000     # then open http://localhost:8000
node --test tests/text.test.mjs # 7 tests (Node 20+)
```

A static server is needed because the dictionary files are loaded on demand with `fetch`.

## How it is built

| File | Purpose |
|---|---|
| `index.html`, `styles.css`, `app.js` | One-screen reader UI |
| `text.mjs` | Tokeniser, lemmatiser, term finder, Lesk meaning picker, simplifier, readability |
| `lexicon.mjs` | Loads only the dictionary files needed for the current text |
| `glossary.mjs` | Glossary store and CSV export |
| `dict/` | ~82,000 terms in 66 files, built by `scripts/build_dictionary.py` |
| `tests/text.test.mjs` | Tests for term finding, meaning choice, simplification, readability, glossary |

Plain HTML, CSS and JavaScript modules, with no framework and no build step. Developed with Anthropic's Claude as the coding agent, following the Devpost Learn skills (`1-start` … `6-ship`).

## Data and licences

Code: MIT. Dictionary data: derived from **Open English WordNet 2024** (CC BY 4.0) and **wordfreq** (CC BY-SA 4.0). The generated `dict/` files are shared under CC BY-SA 4.0. See [NOTICE](NOTICE). The sample paragraph was written for this project.

## Limitations and next steps

Dictionary explanations are general and not tailored to a subject. Some very new or specialised terms are missing. Next: PDF upload, more languages (German first), quiz mode from the glossary, and optional AI-written everyday examples.
