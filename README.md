# Swansea GEM Anatomy

An anatomy lab tool by Rhodri, with model revision and a shared knowledge library for studying beyond the lab.

## Two ways to study

**Model revision** follows the labelled structures on 34 anatomy models. Choose all cards or identification only, filter by tags, and work through them in order or at random. Structure names stay hidden until you ask for a hint or reveal the answer.

**Anatomy library** brings information together across models. Search names and facts, browse by structure type, system, region or organ collection, and read each structure's anatomy with links back to its source models. Revise one structure or a filtered set using knowledge questions. Image-identification runs become available as quiz-ready structure images are added.

Every run is a fresh session. There are no accounts, scores or spaced-repetition schedules.

| Key | During revision |
| --- | --- |
| Space | Reveal the answer |
| → | Next card after revealing |
| ← | Previous card |

## Run locally

With Node.js 20 or newer:

```sh
npm run build:data
npm start
```

Open [the model view](http://localhost:4173/) or [the anatomy library](http://localhost:4173/library.html). No dependency installation is needed.

## Shared content

Structure records live in `content/structures/`. Model cards reference those records, so a reviewed preferred answer can be updated once and used throughout the app. Differing source answers remain traceable; similar names are not blindly combined.

Images are registered in `content/images.json` and stored locally under `dist/images/structures/`. The catalogue starts empty for structure-specific imagery; existing model photos remain in the model selector.

See [Maintaining the library and adding images](docs/maintenance.md) for step-by-step instructions, image quiz setup and tools for reviewing duplicate structures.

After editing content:

```sh
npm run build:data
npm test
```

## Publish

The included GitHub Pages workflow builds the shared data, runs the checks and publishes `dist/` when changes are pushed to `main`. In the repository's Pages settings, select **GitHub Actions** as the source.

The generated `dist/` folder can also be hosted by another static web host. The app needs no backend, database service or OpenAI connection.

## Mock spotter and image setup

Use **Mock spotter** for 30 image-based questions with optional timing and end-of-run self-marking. Shorter practice runs become available as you add images.

With the local server running, open http://127.0.0.1:4173/manage-images to search for a structure, choose an image and click its target. Saving updates the library automatically. See [the guide](docs/maintenance.md).
