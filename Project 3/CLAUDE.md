# 3DGS Viewer – Project Guide for Claude

## About this project

A static web app for opening a user's own 3D Gaussian splat file (PLY, SPZ,
.splat, .ksplat, SOG) and inspecting it in the browser, built by a Geomatics
student (NTNU) for TBA4565 (3D GIS part). Split out of Project 2 on 2026-10-27;
rebuilt as a file viewer on 2026-10-28 (the earlier CesiumJS gallery and viewer
lab are in git history at 9442d81; see README "History"). Production-ready
standards as Project 2: clean architecture, linted, tested where it matters,
robust error handling, CI, deployed on GitHub Pages under `/3dgs-viewer/`.

Report question: "What does a 3DGS file contain, and how well can a static web
page open and inspect it entirely on the client?"

## Features (scope)

- Open a file (button or drag and drop anywhere); the file never leaves the
  browser. No server, no token.
- File facts: format, size, splat count, extent with/without floaters, PLY
  header (encoding, properties, SH degree).
- Orientation fix (up axis +Y/-Y/+Z/-Z) and reset view.
- Two-point distance in file units.
- "← My GIS module" link to the homepage.
- Do NOT add features beyond this list without asking.

## Tech stack

- Vite + React 19 (JavaScript/JSX, no TypeScript), Spark 2.4.0 on three.js
  0.186.1 (pinned in package.json), ESLint + Prettier, Vitest, GitHub Actions
  (`.github/workflows/project3-ci.yml`).
- Windows, PowerShell, Node 24, Git
- The message store is copied from Project 2, not shared, so each project
  builds on its own.

## Project structure

src/
main.jsx – React root only
App.jsx – composes hooks and components
config.js – constants: formats, camera, up axes, markers, homepage link
viewer/splatViewer.js – three.js + Spark scene, no React
hooks/ – React hooks bridging React and the viewer (viewer, file opening, measurement)
components/ – React UI: panel, file opener, facts, orientation, measurement, messages
state/ – small framework-independent stores (messages)
utils/ – pure helpers (PLY header, formats, bounds, orientation, distance, formatting)
tests/ – Vitest unit tests

## Code standards

- Small, single-purpose modules and functions. No logic in main.jsx.
- three.js/Spark code lives in viewer/, not in components. Components call the
  hooks; three.js objects are mutated outside React render.
- No magic numbers: formats, camera and display settings live in config.js.
- Every file load has error handling. The app must keep working and show a
  user-friendly message if a file fails; the open splat stays.
- Coordinates are in the file's own frame and units; say so in UI and docs.
- JSDoc on exported functions.
- Code must pass `npm run lint`, `npm run format:check`, `npm test` and
  `npm run build` before committing.
- Never invent numbers; measured values come from running code.
- Accessibility basics: buttons are real <button> elements with labels;
  layout works on mobile.

## Security

- No secrets: the app needs no token. Never add a runtime call to a backend.
- Never run commands that delete files, force-push or rewrite git history
  without asking.

## How to work with me (IMPORTANT)

- SPRINT OVERRIDE (until 2026-10-30): the sprint rules in the root CLAUDE.md
  apply. Implement directly; plan first for changes touching more than ~3 files.
- Explain WHY, not just what. Name the three.js/Spark classes and concepts used and link
  to the relevant docs when introducing something new.
- If I ask "why does this happen?", explain the cause. Do not fix it unless
  I ask.
- Spark changes quickly between versions: check the installed version in
  package.json and say so.
- Point out bad practices or anything that falls short of production quality.
- Commit messages: Conventional Commits.

## Module rules

- Claude writes all code. I direct, review and approve; I do not write code.
- My learning comes from understanding the code: explain the concepts and
  design choices behind each change.

## Current status

- 2026-10-27: split from Project 2; sessions 6–7 (Cesium gallery, viewer lab).
- 2026-10-28: session 8 (hardening). Then the gallery was dropped: its ion
  assets need Cesium's evaluation token (our token gets 404). Rebuilt as a
  file viewer (Spark). Old code at 9442d81.
- 2026-10-28: website (session 9). Shared NTNU-blue home link and favicon; built into
  `/3dgs-viewer/` by the root `npm run site:build`.
- 2026-10-28: live on GitHub Pages at `/3dgs-viewer/`.
