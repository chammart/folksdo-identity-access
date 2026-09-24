# Patch 4A v3 — IAM-Owned Local Bruno Acceptance

This patch replaces the invalid Patch 4A/v2 attempts.

- Restores the IAM Patch 3J package contract and lockfile.
- Adds IAM-owned `pnpm certification:local`.
- Adds a standalone `Folksdo IAM` Bruno collection.
- Local preparation owns MongoDB/NATS startup, deterministic IAM fixtures, Bruno projection, real HTTP server, and shutdown cleanup.
- The preparation command removes the two known invalid `Folksdo Operations/05 - IAM` and `13 - IAM` folders left by the discarded patches.

Run `pnpm install --frozen-lockfile`, then `pnpm certification:local`. Keep it running while Bruno executes `01 - IAM` with environment `local`.
