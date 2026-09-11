# Swansea GEM Anatomy

Anatomy model revision for Swansea Graduate Entry Medicine, designed to use alongside the physical models. Practise identifying structures and recalling their actions, innervation, relations and more.

## Revise your way

- **34 models and 6,353 flashcards**, with model photographs to help you find the right one.
- **All cards or identification only**, in the original order or shuffled.
- **Searchable tag filters** to focus on topics such as muscle actions, blood supply or nerve lesions.
- **Optional name hints**: identify the structure yourself, or reveal its name before answering the question.
- **Random model selection** when you want to mix up your revision.

Every session is a fresh run through your chosen cards. There are no accounts, scores or spaced-repetition schedules.

## Using the app

1. Choose a model, or select **Random model**.
2. Pick your card set and order. Use tags to narrow the selection if you wish.
3. Start revision, recall your answer, then reveal it and move on.

With multiple tags selected, **Match all selected** includes cards carrying every selected tag; **Match any selected** includes cards carrying at least one. Searching for a tag does not remove existing selections.

Structure names are hidden by default on knowledge cards. **Show structure name** gives you a prompt without revealing the answer. Revealing the answer shows both the name and the answer.

| Key | Action |
| --- | --- |
| Space | Reveal the answer |
| → | Next card, after revealing the answer |
| ← | Previous card |

The layout works on phones, tablets and desktops. Model photographs appear in the selection screen; revision cards use the labels on the physical models.

## Run locally

With Node.js 20 or newer installed:

```sh
npm start
```

Open [localhost:4173](http://localhost:4173). No dependency installation or build step is needed.

## Publish

The app is a static website. The included GitHub Actions workflow publishes `dist/` to GitHub Pages when changes are pushed to `main`.

In the repository, select **Settings → Pages → Source → GitHub Actions**. Deployment progress appears in the **Actions** tab.

The contents of `dist/` can also be hosted by any other static hosting provider.

## Update the content

Cards live in `dist/data/`, with one JSON file per model. Model names, image paths and tag lists are recorded in `dist/data/models.json`; photographs are in `dist/images/`.

See [Maintaining models and cards](docs/maintenance.md) for the data format and update instructions.

Run the checks with:

```sh
npm test
```
