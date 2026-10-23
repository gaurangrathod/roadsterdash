create table if not exists public.scores (
  id uuid default gen_random_uuid() primary key,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null,
  name text not null,
  score bigint not null
);

-- Enable Row Level Security (RLS)
alter table public.scores enable row level security;

-- Allow anonymous users to view top scores
create policy "Allow public read access"
on public.scores for select
to anon
using (true);

-- Allow anonymous users to submit their run
create policy "Allow public insert access"
on public.scores for insert
to anon
with check (true);