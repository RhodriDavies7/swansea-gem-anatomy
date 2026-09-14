## Photos of the same structure on different models

In the local Add images page, choose the shared structure, then the model pictured. Add each photo separately. All photos stay attached to one structure and use its shared answers. The library shows the model name below each photo, with Previous/Next controls. Mock spotters randomly select one eligible photo per structure, so additional model photos do not duplicate that structure within an exam.

For photos with a physical pin, select “The photo already has a clear physical pin marking the target” and enable spotters. No digital marker is needed. Ensure only the intended target is pinned and no visible label gives away the answer. For unmarked photos, click the target to place marker A. General images can leave the model unspecified. The CLI also accepts `--model MODEL_ID`.

# Maintaining the anatomy library

## Add images using the local page

1. Run `npm start` in the Anatomy folder (restart it if it was running before this update).
2. Open http://127.0.0.1:4173/manage-images or choose **Add images** in the local library.
3. Search for a structure and select it.
4. Choose a JPG, PNG or WebP image (up to 5 MB).
5. For exam use, choose an image without answer labels, tick **Use this image for spotters and identification**, then click the structure to place marker A.
6. Add a description and optional credit, then select **Save to the library**.

The page copies the image, links it to the shared structure and rebuilds the data. No IDs or JSON editing needed. Publish the project changes to share the new images. This editing page runs locally; the public GitHub Pages site only serves revision content.

## Mock spotter

Open `spotter.html` or choose **Mock spotter**. A full mock selects 30 distinct image-ready structures and mixes identification, actions, innervation and other available topics. Below 30 eligible structures, a shorter practice run is available. Region filters apply to eligibility. Choose untimed, 30-minute or 45-minute timing; shorter runs receive proportional time. These are configurable practice timings, not a claim about the official assessment format.

Write responses, flag questions and navigate freely. Submit to reveal the answers and self-mark each question. Timed runs submit when time expires. Responses and marks exist only in the current tab and disappear when you leave or refresh.

The older command-line image workflow below still works, including separate labelled answer images. Images added with the new page store `quizMarker` coordinates between 0 and 1; the marker is displayed over the original image without altering it.


The app has two views: **Model revision** for use with the lab models, and **Anatomy library** for searching and revising across models. Both read the same shared facts.

It remains a static website compatible with GitHub Pages. There is no database server, account system or saved learning state. The JSON files act as related tables, and a small build command checks their links and prepares the files the browser reads.

## Where to edit

| Location | Purpose |
| --- | --- |
| `content/structures/<id>.json` | One shared structure: name, aliases, collections, facts, source versions and image references |
| `content/models/<model>.json` | Model cards with their original labels/order and references to shared structures and facts |
| `content/models.json` | Model names, filenames and selection photographs |
| `content/images.json` | Shared image catalogue: paths, captions, credit and optional quiz image settings |
| `dist/images/structures/` | Local structure image files served by the website |
| `source-guides/` | Unchanged original RemNote text, retained as source evidence |
| `content/review-needed.json` | Generated list of questions that have multiple answers without a preferred version |
| `content/merged/` | Original records archived by the reviewed merge tool |
| `dist/data/` | Generated browser data; edit `content/` instead |

After changing content:

```sh
npm run build:data
npm test
```

Refresh the preview after building. Start the local server with `npm start` if it is not already running. The GitHub Pages workflow also builds and checks content before publishing a push to `main`.

## Add your first image

Open a terminal in the Anatomy project. Find the structure's ID:

```sh
npm run structure:find -- "pectoralis major"
```

For example, the shared record for Pectoralis major muscle is:

```text
pectoralis-major-muscle-d03b5bc362
```

Register a local JPG, PNG or WebP image with an accurate description:

```sh
npm run image:add -- pectoralis-major-muscle-d03b5bc362 "/path/to/pectoralis-major.jpg" "Anterior view showing pectoralis major" --credit "Your image credit"
npm run build:data
```

Replace `/path/to/pectoralis-major.jpg` with your file's actual path. You can drag a file into Terminal to insert its path.

The command copies the image into `dist/images/structures/`, gives it a stable filename, adds an entry to `content/images.json`, and links it to the structure. That single image is then available wherever that structure is used; it does not need a separate copy for every model. Re-running the same registration is rejected to prevent duplicates.

The library will display the image when you select the structure. Multiple registered images form a browsable gallery. Add `--license "Licence name"` and `--source "https://source-page.example"` when relevant; captions and credit can also be edited in the image catalogue. Use images you have permission to share.

## Add an image-identification question

A general labelled diagram is useful for reading, but may reveal the answer in a quiz. Prepare a separate quiz image with the target marked (for example, an arrow or `A`) and the target's name hidden.

Register both versions together:

```sh
npm run image:add -- pectoralis-major-muscle-d03b5bc362 "/path/to/reference.jpg" "Anterior view of pectoralis major" --quiz "/path/to/quiz.jpg" --quiz-alt "Identify the structure marked A" --answer "/path/to/labelled-answer.jpg" --credit "Your image credit"
npm run build:data
```

`--answer` is optional. It displays a labelled image after revealing the answer. The quiz prompt uses only the neutral `--quiz-alt` description and the quiz image; image credit is shown after revealing to avoid giving away the target.

The command sets `quizReady: true` and `quizStructureId` for that exact structure. The image-identification mode automatically includes it. Structures without a quiz-ready image are excluded from image-identification runs, while their text knowledge questions remain available.

Only mark an image quiz-ready after checking the target is unambiguous and its name is not visible. A quiz image must target exactly one structure. The same source image file can be reused with different marked versions for different structures.

### Editing the image catalogue directly

An entry in `content/images.json` looks like:

```json
{
  "id": "img-pectoralis-anterior",
  "src": "images/structures/pectoralis-reference.jpg",
  "alt": "Anterior view of pectoralis major",
  "caption": "Anterior view",
  "credit": "Your image credit",
  "license": "",
  "sourceUrl": "",
  "quizReady": true,
  "quizSrc": "images/structures/pectoralis-quiz.jpg",
  "quizAlt": "Identify the structure marked A",
  "quizStructureId": "pectoralis-major-muscle-d03b5bc362",
  "answerSrc": "images/structures/pectoralis-answer.jpg"
}
```

Add the image ID to the structure's `imageIds` array. Paths are relative to `dist/`, must begin `images/`, and must point to existing files. The builder rejects missing files, duplicate IDs, broken references and a quiz assigned to the wrong structure. A display-only image needs no quiz fields and uses `quizReady: false`.

To reuse a display image on another structure, add the same image ID to that structure's `imageIds`. Its quiz will still only be used for `quizStructureId`. To replace an image, replace its file at the same path or update the catalogue path, then rebuild.

## Standardise a fact once

A structure contains facts with one or more source variants:

```json
{
  "id": "f-example",
  "question": "Actions",
  "preferredVariantId": null,
  "variants": [
    { "id": "v-first", "answer": "First source answer", "sources": [] },
    { "id": "v-second", "answer": "Another source answer", "sources": [] }
  ]
}
```

Every current topic has one selected `preferredVariantId`, following the editorial review. Older source versions remain stored for traceability. A future merge clears the preference when answers differ, so choose the shared answer before publishing.

After reviewing the answers, set `preferredVariantId` to the variant you want to use (for example, `"v-first"`). For new wording, add a new variant and select its ID; keep the original variants unchanged. Rebuild, and the library, outside-lab revision and every model card referencing that fact use the preferred answer. Keep the other variants and their sources so the original material is not lost.

To add a new standard answer while preserving the original wording, add a new variant with a unique ID, your answer, and `sources: []`, then select that ID. This is the recommended approach for substantive edits. The source-fidelity test checks original variants against the original guides, so changing original wording will deliberately flag a mismatch.

Questions are distinct fields: `Actions`, `Innervation`, `Origin` and `Insertion`, for example. Renaming a structure does not automatically rewrite the original Identification answer; select or add the desired Identification variant as well.

## Review duplicate names

Initial consolidation merged exact names with case/spacing differences and reviewed muscle-name pairs that differed only by the word “muscle”. Original names remain aliases. Ambiguous names, including matching hand and foot structures, remain separate. A further 58 synonym pairs were reviewed and merged, including numbered cranial nerves and alternative anatomical names. Three same-name collisions were split using source context. See [Editorial review](editorial-review.md). There is no fuzzy automatic merge.

Find both records, then preview a merge:

```sh
npm run structures:merge -- KEEP_ID MERGE_ID
```

Only if they refer to the same structure, including region and laterality:

```sh
npm run structures:merge -- KEEP_ID MERGE_ID --apply
npm run build:data
npm test
```

The tool keeps the first ID, adds the other name as an alias, combines facts and images, and updates model-card references. It preserves differing answers and clears the preference for combined questions with multiple versions. The original merged record is archived under `content/merged/`; Git records all file changes. To undo a merge, restore the structure, model and image files from before the merge together.

Do not merge left/right structures, muscle parts, or similarly named structures from different regions simply because they look alike.

## Collections and search

Each structure has editable arrays: `types`, `systems`, `regions`, `organs`, `tags` and `aliases`. The filters are generated from these arrays, so adding a new collection requires no UI code.

Initial types and systems use source tags; regions and organ collections also use source-model membership. These are starting collections for navigation, not a completed anatomical ontology. For example, structures appearing in a heart guide may appear in the Heart collection even when they are neighbouring vessels. Review and refine memberships in the structure files as needed.

Search matches names, aliases, tags and the displayed fact answers. Filters combine: selecting Muscles and Upper limb narrows to structures in both. Knowledge revision offers topics within the selected structures and deduplicates identical shared fact versions. Image revision uses one ready quiz image per structure. No learning history is stored.

## Model-card references

A model card now stores references instead of copying a question and answer:

```json
{
  "id": "original-card-id",
  "structureId": "pectoralis-major-muscle-d03b5bc362",
  "factId": "f-example",
  "variantId": "v-first",
  "label": "10",
  "path": ["10"],
  "section": "Muscles",
  "tags": ["Action", "Muscle", "MS7"],
  "sourceLine": 42
}
```

Keep existing IDs, labels, sections and array order. `variantId` points to the original model answer; a preferred fact answer overrides it at display time. Images are reached through `structureId → imageIds → image catalogue`, so they are not duplicated per model.

## What is ready and what remains manual

The initial library contains 904 searchable structures and five retained model-note entries, with all 6,353 original model cards preserved. No current questions are waiting for a preferred answer; earlier source versions remain stored within the records. The builder refreshes the review list whenever content changes.

The existing model photographs remain in model selection. No structure-specific images have been guessed or substituted: the image catalogue starts empty. Add suitable images gradually; search and knowledge revision already work without them.

Image descriptions in the local uploader are optional. Leaving one blank generates accessible text from the structure name and, when selected, the model name. Exam image descriptions remain neutral.

## Learning outcomes

`content/learning-outcomes.json` is the editable source; `npm run build:data` copies it to `dist/data/learning-outcomes.json`. Each session has a stable ID, year, original week code, title, source system label, PDF page numbers, session summary and ordered outcomes. Each outcome stores its original text, source page, `structureIds` for direct library links and `relatedModelIds` for broader suggested models. Existing structure and model IDs are used, so changes to shared anatomy appear automatically.

The initial import contains 477 outcomes across 32 Year 1 and 22 Year 2 sessions. Outcome text was checked against both source PDFs, allowing only whitespace changes. Source categories are preserved even when a title appears under an unexpected system. Source PDFs are in `dist/documents/` and linked at the relevant page.

Direct links were seeded conservatively from names and aliases explicitly mentioned in each outcome, restricted to models associated with that teaching session. These are suggested revision links, not an assertion of complete curriculum coverage or a medically reviewed curriculum mapping. Broader outcomes use related model links; unsupported topics show a coverage gap. To improve a mapping, edit its ID arrays without changing the original outcome text. Tests verify all 54 sessions, 477 outcomes and reference targets. Keep IDs stable when updating future documents.
