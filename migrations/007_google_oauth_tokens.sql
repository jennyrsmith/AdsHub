create table if not exists google_oauth_tokens (
  id bigserial primary key,
  subject text default 'default', -- tie to a user/email later if needed
  access_token text,
  refresh_token text,
  scope text,
  token_type text,
  expiry_date timestamptz,
  raw_json jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create unique index if not exists idx_google_oauth_tokens_subject on google_oauth_tokens(subject);
