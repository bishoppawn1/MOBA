# Blockbound Arena Agent Instructions

These instructions apply to the entire repository.

## Source of truth

- Read `spec.md` before changing gameplay, progression, characters, maps, controls, or interface rules.
- Keep `spec.md` synchronized with intentional changes to the game.
- Treat the existing visual language and the current playable prototype as the baseline unless the user asks for a redesign.

## Working practices

1. Start with `git status` and inspect the relevant files before editing.
2. Preserve user-authored and unrelated changes. Stage only files that belong to the current task.
3. Keep the game playable in a static Vite build; do not add a server requirement without explicit approval.
4. Keep match simulation and the live HUD in `app/battle.tsx`; keep hero definitions, ability progression data, and hero selection in `app/game.tsx`.
5. Prefer small, typed changes and reuse existing components and styles.
6. Run `npm run build` after code changes. Add focused checks when a mechanic needs more verification.
7. Review the final diff for accidental generated files, secrets, or unrelated changes.

## GitHub delivery

- Always commit completed, verified work and push it to GitHub unless the user explicitly says not to push.
- Fetch before pushing and use a normal fast-forward push. Never force-push or rewrite shared history.
- Push deployable work to `main`, because `.github/workflows/pages.yml` publishes `main` to GitHub Pages.
- If the build fails, credentials are unavailable, or remote history has diverged, do not bypass the problem. Leave the work locally recoverable and report the blocker.
- Use concise, imperative commit messages that describe the player-facing outcome.

## Game-specific guardrails

- The match must remain keyboard-and-mouse playable with no required account or network connection.
- Character-selection attributes use readable labels and exact values, not comparative stat bars.
- Live resources such as health, cooldowns, and team XP may use meters because they change during play.
- Hero abilities follow the progression defined in `spec.md`; locked abilities must be visibly locked and impossible to cast.
- Keep both battleground eras mechanically equivalent unless the specification explicitly distinguishes them.
