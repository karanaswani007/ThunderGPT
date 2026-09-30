-- ThunderGPT core schema. user_id is TEXT (Better Auth ids / preview 'dev-user').

create table if not exists profiles (
  user_id text primary key,
  display_name text,
  theme text not null default 'system',
  preferred_model text not null default 'auto',
  default_web_search boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint profiles_theme_chk check (theme in ('light', 'dark', 'system'))
);

create table if not exists conversations (
  id text primary key,
  user_id text not null,
  title text not null default 'New chat',
  model text not null default 'auto',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists conversations_user_updated_idx
  on conversations (user_id, updated_at desc);

create table if not exists messages (
  id text primary key,
  conversation_id text not null references conversations (id) on delete cascade,
  user_id text not null,
  role text not null,
  content text not null default '',
  model text,
  web_search boolean not null default false,
  error text,
  created_at timestamptz not null default now(),
  constraint messages_role_chk check (role in ('user', 'assistant', 'system'))
);

create index if not exists messages_conversation_idx
  on messages (conversation_id, created_at);

create table if not exists attachments (
  id text primary key,
  message_id text not null references messages (id) on delete cascade,
  user_id text not null,
  conversation_id text not null,
  filename text not null,
  mime_type text not null,
  size_bytes integer not null,
  kind text not null,
  extracted_text text,
  data_base64 text,
  created_at timestamptz not null default now(),
  constraint attachments_kind_chk check (
    kind in ('image', 'pdf', 'text', 'spreadsheet', 'document', 'generated')
  )
);

create index if not exists attachments_message_idx on attachments (message_id);
create index if not exists attachments_user_idx on attachments (user_id);

create table if not exists generated_images (
  id text primary key,
  user_id text not null,
  prompt text not null,
  enhanced_prompt text,
  model text not null,
  aspect_ratio text not null default '1:1',
  data_base64 text not null,
  mime_type text not null default 'image/png',
  conversation_id text,
  message_id text,
  created_at timestamptz not null default now()
);

create index if not exists generated_images_user_idx
  on generated_images (user_id, created_at desc);

create table if not exists usage_events (
  id text primary key,
  user_id text not null,
  kind text not null,
  model text,
  latency_ms integer,
  ok boolean not null,
  error_category text,
  created_at timestamptz not null default now()
);

create index if not exists usage_events_user_created_idx
  on usage_events (user_id, created_at desc);
