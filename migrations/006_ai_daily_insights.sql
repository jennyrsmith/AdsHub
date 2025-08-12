create table if not exists ai_daily_insights (
  id bigserial primary key,
  brand text not null default 'Beauty by Earth',
  for_date date not null,
  summary jsonb not null,
  top_patterns jsonb not null,
  recommendations text not null,
  created_at timestamptz not null default now(),
  unique (brand, for_date)
);

-- Helpful day indexes (if not already present)
create index if not exists idx_fb_date on facebook_ad_insights (date_start);
create index if not exists idx_yt_date on youtube_ad_insights (date_start);
