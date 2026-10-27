---
name: report-evidence
description: Collect verified facts about one TBA4565 project (Project 1, 2 or 3) (objective, GIS concepts, data, methods, results, verification, limitations, references) into report/notes/ as source material for the project report.
disable-model-invocation: true
argument-hint: "[project-1|project-2|project-3]"
context: fork
agent: general-purpose
---

Collect report evidence for: $ARGUMENTS

You are gathering source material, not writing prose. Do not modify any code. The only file you write is `report/notes/$ARGUMENTS.md`.

Trust sources in this order: output of running code > tests > git history > READMEs, PROGRESS.md and CLAUDE.md. Read the project's README(s), Project 1's PROGRESS.md, its config, data scripts and tests, and run `git log --stat -- "<project folder>"`.

Write the notes as terse bullet points. Follow each fact with its source (a file path, a command, or a commit hash). Use these sections:

1. **Objective and motivation**: the stated purpose, the question the project answers, and who benefits.
2. **GIS concepts**: e.g. map projections, Tissot's indicatrix, geodesic vs planar area, CRS/EPSG codes, ellipsoidal vs NN2000 heights, 3D Tiles, WFS. Give one line on how each one is used in this project. Say whether each is GI Science or GI Systems.
3. **Data**: every dataset with its source, URL, licence, CRS, format, preprocessing steps and known quality issues.
4. **Architecture and stack**: include a Mermaid diagram of the components and the data flow.
5. **Methods and workflow**: the steps in order, with the commands needed to reproduce them.
6. **Results**: every number together with how it was produced. Re-run calculations or tests to confirm numbers when that is feasible. Mark anything you could not confirm as UNVERIFIED.
7. **Verification**: tests, CI, manual browser checks.
8. **Limitations, assumptions and uncertainties**: those the docs acknowledge, plus any you spot in the code.
9. **Future work.**
10. **References**: official docs, datasets and papers that are mentioned or clearly relevant, with URLs. Never invent a reference.

Do not embellish. If something is missing, write "missing" rather than filling the gap.
