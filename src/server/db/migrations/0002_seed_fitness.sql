-- Seed: the initial fitness challenge type. Adding more types later means
-- one new strategy file in code (Factory pattern, ADR-006) + one row here.

insert into public.challenge_types (key, label, icon, default_metrics) values
  ('fitness', 'Fitness', 'dumbbell', $${
    "schema_version": 1,
    "metrics": [
      {"metric":"weight_kg","unit":"kg","direction":"lower"},
      {"metric":"body_fat_pct","unit":"%","direction":"lower"},
      {"metric":"workouts","unit":"count","direction":"higher"},
      {"metric":"steps","unit":"steps","direction":"higher"}
    ]
  }$$::jsonb)
on conflict (key) do nothing;
