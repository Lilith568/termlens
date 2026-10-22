---
doc: spec
status: approved
---

# TermLens — Technical Spec

*Drafted by the agent as a recommendation at the learner's request; the learner confirms or changes it.*

## How This Works, In Plain Language
TermLens is a single web page that runs completely in the browser. There is no server and no AI service.
- **The dictionary** is a set of small files made once, ahead of time, from the free Open English WordNet dictionary. For about 60,000 less common English words and terms it stores the meanings, an example sentence, simpler words and "a kind of …". It is split into ~50 files, so the page only loads the parts it needs for your text.
- **The term finder** splits your paragraph into words and short word groups, reduces each word to its dictionary form ("membranes" → "membrane"), and keeps the ones that are rare in everyday English. How rare counts as difficult is set by the slider. Word rarity comes from the open wordfreq word list.
- **The meaning picker** chooses which meaning fits your text by counting how many words the meaning's definition and example share with the sentence around the term. This is a classic language-processing technique called the Lesk algorithm.
- **The simplifier** swaps a difficult word for a more common synonym where the dictionary has one, and the **readability score** (Flesch Reading Ease) measures sentence length and syllables before and after.
- **The glossary** is saved in the browser's own storage on this device and can be exported as a CSV file for Anki or Quizlet.

Why this shape: it needs no account, no API key and no internet beyond loading the page, it keeps students' texts private, and it is small enough to build and test in a few hours.

## The Core Journey Through the System
PRD ref: `prd.md > The Core Journey`.
1. Student pastes text or clicks *Try a sample paragraph* → the **Reader UI** puts the text into the input box.
2. *Explain terms* → **Term finder** tokenises and lemmatises → asks the **Dictionary loader** for the needed files → keeps difficult candidates (longest multi-word match first) → **Reader UI** renders the paragraph with highlights and a counter.
3. Click a term → **Meaning picker** ranks the senses against the sentence → **Explanation card** shows explanation, example, simpler words, "a kind of …" and other meanings.
4. *Add to glossary* → **Glossary store** saves it to localStorage → the glossary panel updates, and the term is marked as learned.
5. *Simplify* → **Simplifier** builds the simplified paragraph → **Readability** scores both → the UI shows the swapped words and both scores.
6. *Export* → **Glossary store** writes a CSV → the browser downloads it.

## Stack
- **Plain HTML, CSS and JavaScript (ES modules), no framework or build step.** Fits a one-screen tool, is easy to read and runs anywhere. Tradeoff: no component library, so the UI is hand-written.
- **Node.js built-in test runner** (`node --test`) for the logic modules. Docs: https://nodejs.org/api/test.html
- **Data build script in Python 3** using `wordfreq` (https://github.com/rspeer/wordfreq, data CC BY-SA 4.0) and **Open English WordNet 2024** (https://github.com/globalwordnet/english-wordnet, CC BY 4.0). Runs once; its output JSON is committed.
- No external API calls at runtime.

## Where It Runs and How Someone Tries It
- Runs in any modern browser. Locally: `python3 -m http.server 8000` in the project folder, then open http://localhost:8000. A static server is needed because the dictionary files are loaded with `fetch`.
- Optional deployment: **GitHub Pages** from the `main` branch, so judges can try it at https://lilith568.github.io/termlens/.
- Submission: demo video (1–3 min screen recording) + public GitHub repository with `scope.md`, `prd.md`, `spec.md`.
- No API keys.

## Look and Feel
From `prd.md > Look and Feel`: paper-white background (#fbfaf6), ink text (#1f2328), one accent: highlighter yellow (#ffe27a) as a soft underline/background for terms, and a muted green for "learned". Reading text in a serif (Georgia/Charter stack, ~19px, line-height 1.7); controls in a system sans-serif. Spacious, calm, friendly copy ("Here's what that means"). No gradients or sparkle icons.

## Components

### Reader UI
`index.html`, `app.js`, `styles.css`. Input box, sample button, Explain terms, difficulty slider, highlighted paragraph, Simplify toggle and scores, side panel with card and glossary. Keyboard accessible: terms are buttons, the card is announced politely.
PRD ref: `prd.md > Screens and Layout`, `prd.md > States and Boundaries`.

### Dictionary loader
`lexicon.mjs`. Reads `dict/index.json` (prefix → file), fetches only the files for the prefixes in the text, and caches them in memory.
PRD ref: `prd.md > Finding difficult terms`.

### Term finder
`text.mjs`. Tokeniser (keeps character offsets for rendering), rule-based English lemmatiser (plural, -ed/-ing, -ies, comparative; irregular list), longest-match lookup for 1–3 word terms, difficulty filter by word frequency (zipf) against the slider threshold, and stop-word protection so common words never highlight.
PRD ref: `prd.md > Finding difficult terms`.

### Meaning picker
`text.mjs`. Simplified Lesk: score = overlap of content-word stems between the sentence (±1 neighbour sentence) and each sense's definition + example + synonyms; ties keep dictionary order.
PRD ref: `prd.md > Explanation card`.

### Explanation card
`app.js`. Order: term, explanation, example, "in simpler words", "a kind of …", "Other meanings", source line.
PRD ref: `prd.md > Explanation card`.

### Simplifier and readability
`text.mjs`. Replace a difficult term with its best simpler word (highest frequency) and keep the original for hover. Flesch Reading Ease with a heuristic syllable counter.
PRD ref: `prd.md > Simplify view`.

### Glossary store
`glossary.mjs`. Add/remove/clear, de-duplicate by lemma, persist to `localStorage` (wrapped in try/catch), CSV export.
PRD ref: `prd.md > Glossary and flashcards`.

### Data build script
`scripts/build_dictionary.py`. Parses Open English WordNet, keeps lemmas with zipf 1.8–4.4 and at least five letters (or multi-word), up to three senses each with definition, one example, simpler words and hypernym, and writes `dict/*.json` plus `dict/index.json` with the source and licence.

## Data Model
- **Dictionary entry** (static, `dict/dNN.json`): `lemma → [zipf, [[pos, definition, example, simplerWords[], kindOf, synonyms[]], …]]`.
- **Found term** (in memory): `{ start, end, surface, lemma, zipf, senses }`.
- **Glossary item** (localStorage key `termlens.glossary.v1`): `{ lemma, definition, example, addedAt }`. It survives reloads on the same device; the Clear button removes it.
- The pasted text is never stored.

## File Structure
```
termlens/
├── index.html            # one-screen UI
├── styles.css            # reading-app look
├── app.js                # UI wiring: render, card, simplify, glossary panel
├── text.mjs              # tokenise, lemmatise, find terms, Lesk, simplify, readability
├── lexicon.mjs           # lazy dictionary loader
├── glossary.mjs          # glossary store + CSV export
├── sample.txt            # sample paragraph (written for this project)
├── dict/                 # generated dictionary chunks + index.json (CC BY 4.0 source)
├── scripts/build_dictionary.py
├── tests/text.test.mjs   # logic tests
├── scope.md, prd.md, spec.md   # planning docs (copied from devpost/)
├── README.md, LICENSE, NOTICE
└── devpost/              # course planning files (learner profile is git-ignored)
```

## Open Questions
- None blocking `5-build`.
