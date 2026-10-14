# Changelog

## 0.2.2

- Hints now say `npx apiyi@latest auth set-key` when the CLI runs through `npx` / `npm exec`.
  Previously they said `apiyi auth set-key`, which fails with "command not found: apiyi"
  because npx does not install the command. `--help` under npx explains the prefix and `npm i -g apiyi`.
- README: how to run commands after `npx`, and how to install globally.

## 0.2.1

- CI smoke test runs `apiyi check --help` (bare `--help` exits 8 by design), so CI is green again.

## 0.2.0

- `balance` and `check` now use a **personal access token** (`nap_...`, "Profile: Read"):
  new `--access-token` flag, `APIYI_ACCESS_TOKEN` env var and `auth set-key --access-token`.
- Legacy system tokens retire on 2026-11-11 (UTC+8). `--system-token`, `APIYI_SYSTEM_TOKEN`
  and the saved `systemToken` still work as aliases, with a warning.
- Clear hints for retired tokens, missing permission and IP allowlist mismatches.

## 0.1.0

- First release: check, models, chat, responses, image, balance, auth.
