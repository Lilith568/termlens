---
doc: prd
status: approved
---

# TermLens — Product Requirements

A reading companion for university students: paste a paragraph of course material, see the difficult terms highlighted, get each one explained in context, and collect them in a personal glossary. Source: `scope.md > The Unique Kernel`, `scope.md > Who It's For`.

*Drafted by the agent as a proposal at the learner's request ("mach einen Vorschlag, den ich dann bestätigen kann"); every item below is for the learner to confirm or change.*

## The Core Journey
Source: `scope.md > The Core Loop`.
1. The student opens TermLens and sees a large reading area with a short line of instructions and a button **"Try a sample paragraph"**.
2. They paste a paragraph (or load the sample) and press **Explain terms**.
3. The paragraph is shown as readable text with difficult terms underlined in a soft highlight. A counter says how many terms were found.
4. They click a term. An explanation card opens next to the text: the plain explanation first, then an example sentence, then simpler words.
5. With one click (**Add to glossary**) the term is saved to their glossary in the side panel. Clicked terms are marked as "learned" in the text.
6. They switch on **Simplify** to see the same paragraph with simpler words swapped in, and a readability score that shows how much easier it got.
7. When done, they export the glossary as flashcards (CSV for Anki or Quizlet) and paste the next paragraph.

Success: the student understands the paragraph without leaving the page, and leaves with flashcards for revision.

## Screens and Layout
One screen, two columns on desktop, stacked on mobile:
- **Left (main):** input box → after analysis, the highlighted paragraph, with the **Simplify** toggle and readability score above it.
- **Right (side):** the explanation card for the selected term on top, the glossary list below with the export button.

## Look and Feel
Calm, focused reading tool in the style of a reading app: off-white paper background, dark ink text, one accent colour for highlights (soft yellow underline, like a highlighter), a serif font for the reading text and a clean sans-serif for controls. Friendly, never schoolish. Avoid flashy gradients and "AI app" sparkle.

## Features and Behavior

### Finding difficult terms
- As a student, I want the hard words in my text marked so that I see at a glance what I need to look up.
  - [ ] After pressing Explain terms, rare words and multi-word terms (e.g. "cell membrane") that have an explanation are highlighted.
  - [ ] Inflected forms are found too ("membranes" → "membrane", "diffused" → "diffuse").
  - [ ] A **difficulty slider** (easier ↔ harder) changes how many words count as difficult, and the highlights update immediately.
  - [ ] Common everyday words are never highlighted.

### Explanation card
- As a student, I want a short explanation that fits *my* text so that I understand the term the way it is used here.
  - [ ] The card shows, in this order: the term, the plain explanation, an example sentence, simpler words ("in simpler words: …") and what kind of thing it is ("a kind of …").
  - [ ] When a word has several meanings, the meaning that best fits the surrounding sentence is shown first; the others are available under "Other meanings".
  - [ ] The card says where the explanation comes from (open dictionary).

### Simplify view
- As a student, I want to read the paragraph in simpler words so that I get the gist before the details.
  - [ ] Toggling Simplify replaces difficult words that have a simpler synonym, marked so you can see the original on hover or tap.
  - [ ] A readability score (0–100, higher = easier) is shown for the original and the simplified version.

### Glossary and flashcards
- As a student, I want my looked-up terms collected so that I can revise them later.
  - [ ] Add to glossary saves term + explanation + example; duplicates are not added twice.
  - [ ] The glossary stays after closing the browser (on this device only) and can be cleared.
  - [ ] Export creates a CSV flashcard file (front: term, back: explanation and example) that imports into Anki or Quizlet.

## States and Boundaries
- **First use:** empty input with the sample button; glossary shows "Your glossary is empty — click a highlighted term to start."
- **No difficult terms found:** friendly message "No difficult terms at this level. Move the slider to 'harder' to see more."
- **Very long text:** works for at least several pages of text; a hint suggests pasting one section at a time.
- **Non-English text:** a note says this version explains English terms; other languages are planned.
- **Privacy:** the text is processed only in the browser; nothing is uploaded. The glossary is stored only on this device.

## Product Decisions
- Option A (term lens) over rewriting whole slides or quizzes — smallest version that proves the kernel (learner's choice).
- English first for the competition; all students and all languages as the long-term audience (learner).
- Explanations come from an open dictionary, not an AI service — the learner asked for no extra APIs or accounts. Assumption to confirm: dictionary explanations are good enough for the proof of concept; AI-written everyday examples are a later enhancement.

## What We're Building
Paste or sample text → highlighted difficult terms with difficulty slider → context-aware explanation card → Simplify view with readability score → saved glossary → CSV flashcard export.

## Deferred From the POC
- PDF and slide upload — needs file parsing; pasting text proves the kernel.
- Other languages — needs dictionaries per language.
- AI-written examples tailored to a subject — needs an AI service and key.

## Possible Later Enhancements
Quiz mode from the glossary; subject packs (biology, law, economics); browser extension that works on any web page.

## Non-Goals
- No accounts or cloud sync (privacy, not needed for the proof).
- No rewriting of whole texts by AI (different product).
- No grading or tracking of students.

## Open Questions
- None blocking `4-spec`.
