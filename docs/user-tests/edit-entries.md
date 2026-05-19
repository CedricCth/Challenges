# User test guide — Edit stat entries

> Manual smoke test for the edit-entry feature (ADR-018). Walk this top-to-bottom
> the first time you exercise the feature on a deployed environment (or local
> `pnpm dev`). Each step lists the expected outcome; a ✅ means the system is
> behaving correctly.

## Pre-conditions
- Two seeded accounts: **Cedi** (`cedi@…`) and **Stefi** (`stefi@…`).
- At least one active challenge they share (any type — fitness or reading).
- That challenge has **at least two entries from Cedi** and **at least one
  entry from Stefi**. Add a quick "now" entry on each side if you need to seed.
- Sign in as **Cedi** unless a step says otherwise.

---

## T1 — Happy path: change a value

1. Open the challenge page (`/challenges/<id>`).
2. Scroll to **Recent entries**. On one of your own rows, an underlined
   **Edit** link appears next to the timestamp.
3. Click **Edit**. The form opens with metric, value, date, note pre-filled.
4. Change the value (e.g. `79.4` → `78.9`). Click **Save changes**.
5. ✅ You're redirected back to the challenge page. The same row now shows
   `78.9`. The chart point for that day moves. Score / goal bar updates.

## T2 — Change the metric

1. Edit any of your entries. In the **Metric** dropdown, pick a different
   metric of the same challenge type (e.g. fitness: `weight_kg` → `workouts`).
2. Save.
3. ✅ The row's metric label and the unit beside the value reflect the new
   metric (`workouts (count)` instead of `weight_kg (kg)`).

## T3 — Back-fill the date

1. Edit an entry. Set **When** to yesterday at 09:00 (use the picker).
2. Save.
3. ✅ The list shows yesterday's date. The chart's x-position for that
   point shifts to yesterday.

## T4 — Photo: replace

1. Edit an entry that has a photo. The current photo thumbnail is visible
   with three radio choices: **Keep / Replace / Remove**, defaulted to
   **Keep**.
2. Choose **Replace**. A file picker appears (required). Pick a new image.
3. Save.
4. ✅ The list now shows the new photo. *(Optional: open Supabase Storage →
   `stat-photos` and confirm the old object is gone.)*

## T5 — Photo: remove

1. Edit an entry with a photo. Choose **Remove**.
2. Save.
3. ✅ The row no longer shows a thumbnail. The DB column `photo_url` is now
   `NULL`.

## T6 — Photo: keep

1. Edit an entry with a photo. Change just the note text.
2. Leave the radio on **Keep**. Save.
3. ✅ The same photo is still on the row, and the note text is updated.

## T7 — Validation: negative value

1. Edit an entry. Set the value to `-1`. Try to save.
2. ✅ The form rejects with a positive-number error (either browser-native
   `min` or the strategy's Zod message). No DB change.

## T8 — Validation: invalid metric for type (tamper test)

1. Open browser DevTools → Elements. Locate the hidden `<input name="metric">`
   in the edit form on a **fitness** entry. Change its value to `pages_read`
   (a reading-only metric). Click **Save changes**.
2. ✅ The server rejects with a validation error. This exercises the
   `FitnessStrategy.statSchema` enum guard — the strategy is the single
   source of truth.

## T9 — Validation: far-future date

1. Edit an entry. Set **When** to 5 days from today. Save.
2. ✅ Error: *"Can't log an entry that far in the future."* (Same guard as
   the add flow — proves the helper is shared.)

## T10 — Ownership: cannot edit partner's row

1. Sign out, sign in as **Stefi**.
2. Open the same challenge. Confirm that only **Stefi's** rows have an
   **Edit** link; **Cedi's** rows do not.
3. *(Tamper test.)* Note the URL pattern of an edit page (e.g.
   `/challenges/<challengeId>/stats/<entryId>/edit`). Take an `entryId`
   that belongs to **Cedi** and try to navigate there manually.
4. ✅ The page returns **404 Not Found**. The DB row is untouched.

## T11 — Delete still works (regression)

1. As either user, on one of your own entries, click the delete control.
2. ✅ The row disappears from the list — the existing delete behaviour is
   unchanged.

## T12 — OCP check: future challenge type (optional, do once when adding one)

After a new strategy is registered in `composition.ts` (e.g. a Cooking
strategy), repeat **T1 + T2 + T7** on an entry of that type.

✅ Each works exactly as for fitness/reading, **without** any code change
under `src/features/stats/` or in the existing strategies. If a code change
*was* needed, that's a smell — file an issue.

---

## Where to look when something is wrong

| Symptom                                  | First place to check                                                                     |
| ---------------------------------------- | ---------------------------------------------------------------------------------------- |
| Edit link missing on your row            | Detail page passes `currentUserId={user.id}` into `<StatsEntriesList>` — verify in code. |
| 404 on the edit page for your own row    | `statsService.findOwnedEntry` — the entry's `profile_id` must equal your user id.        |
| "You can only edit your own entries."    | The repo's `UPDATE … WHERE profile_id = $owner` returned 0 rows. Also check RLS.         |
| Photo orphan in Supabase Storage         | Either the action failed after upload — check `console.error("[editStatEntry] failed:")` in Vercel logs — or T4/T5 cleanup didn't run. |
| Validation error on a tampered metric    | Working as designed — the strategy's `statSchema` enum is the guard.                     |
