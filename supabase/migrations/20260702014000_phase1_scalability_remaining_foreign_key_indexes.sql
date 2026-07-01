-- Complete the remaining foreign-key covering indexes reported after phase one.

create index if not exists goals_decided_by_idx on public.goals (decided_by);
create index if not exists points_ledger_created_by_idx on public.points_ledger (created_by);
create index if not exists quran_segments_approved_by_idx on public.quran_segments (approved_by);
