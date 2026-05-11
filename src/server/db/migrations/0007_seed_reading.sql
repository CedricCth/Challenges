-- Seed: register the reading challenge type in the lookup table.
-- Pair with src/features/challenges/strategies/reading.ts + the register()
-- call in src/server/composition.ts.

insert into public.challenge_types (key, label, icon, default_metrics) values
  ('reading', 'Reading', 'book-open', $${
    "schema_version": 1,
    "metrics": [
      {"metric":"pages_read","unit":"pages","direction":"higher"},
      {"metric":"books_finished","unit":"books","direction":"higher"},
      {"metric":"minutes_read","unit":"min","direction":"higher"}
    ]
  }$$::jsonb)
on conflict (key) do nothing;
