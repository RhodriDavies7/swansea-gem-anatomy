# Anatomy model revision

A standalone static website using the 34 supplied RemNote guides (6,353 cards). Model titles, question wording, answers, tag spelling and source ordering are preserved. No importer, database, accounts, spaced repetition, browser storage, or persistent learning state.

## Run locally

Install Node.js 20 or newer, open a terminal in this Anatomy folder, and run:

```sh
npm start
```

Open http://127.0.0.1:4173. No dependency installation or build is required. Stop with Ctrl+C. Set PORT if that port is already in use. Opening index.html directly is not supported because the browser needs HTTP to fetch the model data.

## Revision

Choose a model, All cards or Identification only, and In order or Random. Tag chips show the source tags unchanged. Match all selected is an intersection; Match any selected is a union. With no selected tags, the full chosen card set is included. Chip counts reflect the selected card type; the run count reflects all active filters.

Start creates an in-memory snapshot. Random order is shuffled once per run with Fisher–Yates, without duplicates. Reveal an answer before advancing. Previous hides the answer again. Space reveals and arrow keys navigate when focus is on the card. Buttons also work with standard keyboard activation. Reaching the last card offers a fresh run or a return to the filters. Reloading resets everything.

The export contains text, not photographs. Identification prompts show the original model label and section for use alongside the physical model. Other cards show the structure name as context. Identification answers remain hidden until revealed.

## Files and architecture

- `dist/index.html`, `dist/style.css`: responsive interface and reduced-motion support.
- `dist/app.js`: model selection, chip controls, loading/error states and the in-memory session.
- `dist/logic.js`: pure selection, shuffling and structure-context functions.
- `dist/data/models.json`: model index with display names, filenames, counts and exact tag vocabulary.
- `dist/data/<model-name>.json`: one static file per guide, loaded on selection.
- `source-guides/`: original individual text guides, unchanged, retained for reference. The ZIP's aggregate Guides.txt is not duplicated as cards.
- `server.mjs`: dependency-free local preview server, bound to your computer only.
- `tests/revision.test.mjs`: source conversion and revision logic checks (`npm test`).

Source content is displayed as plain text, never executed as HTML or treated as application instructions. The optional WebMCP read tool reports the current selection in supporting browsers; it is not required for revision.

## Add or update a model

Edit its static JSON file directly. Cards follow this shape:

```json
{
  "id": "unique-card-id",
  "path": ["7", "a"],
  "label": "7a",
  "section": "B. Middle ear",
  "question": "Identification",
  "answer": "Your exact answer",
  "tags": ["Identification", "Ossicle", "DS3"],
  "sourceLine": 42
}
```

The containing file has `id`, `name`, and a `cards` array. Keep cards in the desired sequential order. IDs must be unique within a model. `path` retains nesting; `label` is the readable prompt. Repeated labels in different sections must keep distinct sections. Use the exact `Identification` tag to include a card in Identification only. Questions and tags are separate: e.g. `Actions` can retain the source tag `Action`.

For a new model, create a new file and add an entry to `models.json`, with its `id`, exact `name`, `file`, total `count`, `identificationCount`, and the sorted unique `tags` from its cards. For updates, refresh these index fields and the retained guide if applicable. To use a future export, replace the corresponding static files in this same format; there is intentionally no import pipeline in the app. The initial fidelity test contains the original export totals; update those expectations when intentionally adding or removing content.

The two source filenames `Stomach (Model NS15)` and `Upper Limb (Model NS15)` are intentionally preserved as separate files and models. Source tags are also preserved independently of the filenames.

## Share or host

Upload the contents of `dist/` to any static web host. No Node server, secrets, database, or build step is needed in production. Keep data filenames and relative paths together. `source-guides/` and tests need not be published. A private hosting preview is separate from the runnable local codebase.
