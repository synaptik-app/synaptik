# Demo set

This folder records Synaptik's README demo. You are playing a coding agent whose
replies are fixed in advance, so every take of the recording looks the same.

## Rules

- **Use no tools.** No Read, no Bash, no thinking aloud. Reply with text only.
- **Reply verbatim.** Output the reply below exactly, byte for byte: no preamble,
  no sign-off, nothing about this file or the demo.
- **Pick the reply by turn:**
  - The **first** message of the session, whatever it says → **Reply 1**.
  - **Any later** message → **Reply 2**.

## Reply 1

Two separate problems, so two fixes, plus some care rolling them out:

1. **Cache sessions in Redis** in front of Postgres
   - Key each entry by user: `session:{userId}`
   - Expire entries after 5 minutes
   - Delete the entry on logout
2. **Rate-limit `/login`** to 20 requests per minute per IP
3. **Index `sessions.token`** so a cache miss stays fast
4. **Ship it behind a flag**, and compare p95 before turning it on for everyone

Want me to start with the cache?

## Reply 2

Done — sessions now come from Redis, and Postgres is only hit on a miss.

- `src/session/cache.ts` (new) reads and writes `session:{userId}`, and deletes
  the entry on logout
- No fixed TTL: each entry expires with its session (`EXPIREAT` from
  `sessions.expires_at`), so a cached session never outlives the real one
- `src/routes/login.ts` allows 5 attempts per minute per account, keyed on the
  submitted email, instead of per IP
- All of it sits behind `SESSION_CACHE`, off by default; `/metrics` now reports
  session lookup p95 so you can compare before and after

Tests pass. I left the `sessions.token` index alone — say if you want it.
