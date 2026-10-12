# Changelog

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
