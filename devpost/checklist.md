---
doc: checklist
status: approved
---

# Build Checklist

Build mode: fast (learner asked for minimal back-and-forth; checkpoints shared as screenshots and the live link)

## Slices

- [x] **1. Paste a paragraph and see its difficult terms highlighted**
  Becomes usable: The page opens, "Try a sample paragraph" fills the box, "Explain terms" shows the paragraph with difficult terms highlighted and a counter.
  Why now: This is the kernel and the biggest risk (dictionary size, word forms, multi-word terms); everything else hangs off found terms.
  PRD ref: `prd.md > The Core Journey` (steps 1–3), `prd.md > Finding difficult terms`
  Spec ref: `spec.md > Data build script`, `spec.md > Dictionary loader`, `spec.md > Term finder`, `spec.md > Reader UI`, `spec.md > File Structure`
  Build: Generate `dict/` with the build script, write `lexicon.mjs` and the tokeniser/lemmatiser/finder in `text.mjs`, the sample paragraph, and the reader layout in `index.html`, `styles.css`, `app.js`.
  Verify (mechanical): `node --test` passes lemmatiser and finder tests ("membranes" → "membrane", "cell membrane" found as one term, common words never flagged); a headless browser run of the sample shows at least 8 highlights and no console errors.
  Learner check: Open the page, click "Try a sample paragraph" and "Explain terms", and say whether the right words light up.
  Commit: `Highlight difficult terms in pasted text`

- [x] **2. Click a term and get the explanation that fits the text**
  Becomes usable: Clicking a highlighted term opens the explanation card with the meaning that matches the sentence, an example, simpler words, "a kind of …" and other meanings.
  Why now: Completes the kernel: understanding a term in context.
  PRD ref: `prd.md > Explanation card`
  Spec ref: `spec.md > Meaning picker`, `spec.md > Explanation card`
  Build: Simplified Lesk sense ranking in `text.mjs`; card rendering and keyboard access in `app.js`.
  Verify (mechanical): Tests show the context picks the biology sense of "cell" in a biology sentence and the prison sense in a prison sentence; headless run opens the card for "osmosis" with all fields.
  Learner check: Click "osmosis" and two other terms and say whether the explanations help.
  Commit: `Explain terms in context`

- [x] **3. Adjust difficulty and handle empty states**
  Becomes usable: The easier ↔ harder slider changes how many terms are highlighted instantly; first-use, no-terms and non-English hints appear.
  Why now: Different students need different levels; small, builds on slice 1.
  PRD ref: `prd.md > Finding difficult terms`, `prd.md > States and Boundaries`
  Spec ref: `spec.md > Term finder`, `spec.md > Reader UI`
  Build: Slider bound to the zipf threshold, re-render without reloading; state messages.
  Verify (mechanical): Headless run: moving the slider from easier to harder increases the highlight count; a text of common words shows the no-terms hint.
  Learner check: Move the slider and see the highlights change.
  Commit: `Add difficulty slider and empty states`

- [x] **4. Keep a glossary and export flashcards**
  Becomes usable: "Add to glossary" saves terms in a side list that survives a reload; Export downloads a CSV for Anki/Quizlet; Clear empties it.
  Why now: Turns lookups into revision, the second half of the kernel.
  PRD ref: `prd.md > Glossary and flashcards`
  Spec ref: `spec.md > Glossary store`, `spec.md > Data Model`
  Build: `glossary.mjs` with localStorage persistence and CSV export; glossary panel in the UI; learned terms marked in the text.
  Verify (mechanical): Unit tests for de-duplication and CSV escaping; headless run adds two terms, reloads, and still lists them; the downloaded CSV has a header and two rows.
  Learner check: Add three terms, reload, export, and open the CSV.
  Commit: `Add glossary with flashcard export`

- [x] **5. Read the paragraph in simpler words**
  Becomes usable: The Simplify toggle shows the paragraph with simpler words (original on hover) and readability scores before and after.
  Why now: A finishing behaviour that depends on found terms and simpler words from the earlier slices.
  PRD ref: `prd.md > Simplify view`
  Spec ref: `spec.md > Simplifier and readability`
  Build: Simplifier and Flesch score in `text.mjs`; toggle and score display in the UI.
  Verify (mechanical): Tests for the syllable counter and that simplification raises the score on the sample; headless run toggles Simplify and shows both scores.
  Learner check: Toggle Simplify and compare the two scores.
  Commit: `Add simplify view with readability score`

## Hands-on Checkpoints
- [ ] Early usable behavior explored — after slice 2 (screenshot of the card shared with the learner)
- [ ] Final kick-the-tires exploration and feedback completed — on the live GitHub Pages link

## Final Review
- [ ] Final review complete — feedback resolved and learner confirms ready to ship

## Code Tour and App Map
- [ ] Learning activity complete — guided route, focused alternative, prior practice connected, or brief recap
- [ ] Optional edit and transfer reflection addressed — offered/declined/already covered/not applicable as appropriate

## Revisions
- Slices 1–5 were implemented in one working session because of the learner's limited time, then verified together: 7 unit tests (`node --test tests/text.test.mjs`) and a headless browser run (sample → 14 highlights; slider 2.4 → 4 terms, 4.3 → 28 terms; card opens; glossary survives reload; Simplify shows both scores; no console errors).
- The dictionary keeps at least one meaning per part of speech (max 5). With only the three most common meanings, the verb sense of "diffuse" was missing and the card showed the adjective sense.
- "In simpler words" uses only same-meaning words. Broader terms ("a kind of …") produced misleading swaps such as "turgor → state", so they are shown separately and never swapped in.
- The simplifier also splits sentences at semicolons and ", which", because single-word swaps alone barely changed the readability score.
- Multi-word terms get an adjusted rarity, because word-frequency estimates for phrases like "cell wall" are higher than for typical technical terms.
