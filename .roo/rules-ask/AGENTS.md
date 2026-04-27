# Project Documentation Rules (Non-Obvious Only)

- `.cospec/TEST_GUIDE.md` is the canonical testing reference.
- `docs/superpowers/specs/2026-04-02-hrms-design.md` contains the original design spec.
- Chinese (`zh`) is the default and fallback language; `locales/zh.json` is the authoritative source for translation keys.
- The `hrms` bash script (not `package.json` scripts or Docker) is the intended local development entry point.
- `seed.py` contains hardcoded Chinese department/position names and demo data. It is idempotent — running it on an existing database backfills missing fields rather than starting from scratch.
