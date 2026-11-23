# TCGEmpire — Guide for Claude sessions

@AGENTS.md

## Session start checklist

1. Read the gate in `AGENTS.md` §0. **Write code only for an update the owner has asked for.**
2. Read `ROADMAP.md` for the current state and its open tasks.
3. Check `USER_QUESTIONS.md` for answers the owner has given since the last session; move decided
   answers into `docs/DECISIONS.md` and the affected design docs.
4. Work on the designated branch only; never open a pull request unless the owner asks.

## Working with the owner

- The owner decides scope, set releases, balance direction and anything about tone. Offer a recommended
  default with every question.
- Report in plain language: what was built, how to try it, what is uncertain. Lead with the result.
- Never claim something works without having run it. If a test or build fails, say so with the output.
- Sets never enter or leave print by themselves; that is always the owner's call.

## Useful habits in this repo

- **Look at what you make.** UI and pixel art are judged by eye: render contact sheets and screenshots
  and view the images before calling anything done.
- **Verify the platform, not your memory.** Vercel and Supabase limits and APIs change; check the current
  documentation before relying on a limit or a new API, and keep `docs/ARCHITECTURE.md` §9 current.
- **Use subagents for independent, well-scoped work** (card research, large art batches, test writing),
  each with a precise brief and the relevant doc paths. Review their output before committing it.
- **Keep the docs true.** A design change is made in the docs first, then in code.
- **Spend tokens where the game gets better.** Do not re-read whole documents; search for the section
  you need. Batch art and content work. Keep status reports to a few lines.

## Version and changelog

- `0.0.1` is released (23 Nov 2026; before it came `0.0.1-alpha_01` … `_12`). Every update after it counts up by one:
  `0.0.2`, `0.0.3`, … (owner decision). An update bumps `version` in `content/config.ts` (then `pnpm seed`) and
  `package.json`, and gets a `CHANGELOG.md` entry and in-game patch notes (`src/texts/patchnotes.ts`).
- `CHANGELOG.md` is written for players (German patch notes are generated from it later); keep entries
  short and concrete.
