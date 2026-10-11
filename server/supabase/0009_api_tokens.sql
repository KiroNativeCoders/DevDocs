-- ============================================================================
-- DevDocs — API tokens for the remote MCP server
--
-- A user mints a personal token in the app; the raw value (ddx_...) is shown
-- ONCE and only its SHA-256 hash is stored. The MCP server validates an
-- incoming Bearer token by hashing it and looking it up here, then runs all
-- document operations AS that user (so existing RLS governs access).
--
-- Run in the Supabase SQL editor after the existing migrations.
-- ============================================================================

create table if not exists api_token (
  id           uuid primary key default gen_random_uuid(),
  user_id      uuid not null references app_user(id) on delete cascade,
  token_hash   text not null unique,          -- sha-256 hex of the raw token
  name         text,                          -- user-facing label
  scope        text not null default 'read_write' check (scope in ('read_only','read_write')),
  last_used_at timestamptz,
  revoked_at   timestamptz,                   -- non-null => revoked
  created_at   timestamptz not null default now()
);
create index if not exists api_token_user_idx on api_token(user_id);
create index if not exists api_token_hash_idx on api_token(token_hash);

alter table api_token enable row level security;

-- A user manages ONLY their own tokens. The raw token_hash is never selectable
-- in a way that helps an attacker (it's a hash), but we still scope to self.
drop policy if exists api_token_select on api_token;
create policy api_token_select on api_token
for select using ( user_id = auth.uid() );

drop policy if exists api_token_insert on api_token;
create policy api_token_insert on api_token
for insert with check ( user_id = auth.uid() );

-- Update is only ever used to set revoked_at (revoke). Self only.
drop policy if exists api_token_update on api_token;
create policy api_token_update on api_token
for update using ( user_id = auth.uid() ) with check ( user_id = auth.uid() );

drop policy if exists api_token_delete on api_token;
create policy api_token_delete on api_token
for delete using ( user_id = auth.uid() );
