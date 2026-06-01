-- categories
create table categories (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  slug text unique not null,
  icon text,
  display_order int,
  visible bool not null default true,
  created_at timestamptz not null default now()
);

-- products
create table products (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  description text,
  category_id uuid references categories(id) on delete set null,
  price numeric not null,
  stock int not null default 0,
  images text[] not null default '{}',
  visible bool not null default true,
  created_at timestamptz not null default now()
);

-- combos
create table combos (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  description text,
  category_id uuid references categories(id) on delete set null,
  price numeric not null,
  visible bool not null default true,
  created_at timestamptz not null default now()
);

-- combo_items
create table combo_items (
  id uuid primary key default gen_random_uuid(),
  combo_id uuid not null references combos(id) on delete cascade,
  product_id uuid not null references products(id) on delete cascade,
  quantity int not null
);

-- ticker_messages
create table ticker_messages (
  id uuid primary key default gen_random_uuid(),
  content text not null,
  display_order int,
  active bool not null default true
);

-- settings
create table settings (
  key text primary key,
  value text
);

-- stock_logs
create table stock_logs (
  id uuid primary key default gen_random_uuid(),
  raw_message text,
  parsed_items jsonb,
  confirmed_at timestamptz,
  notes text,
  created_at timestamptz not null default now()
);

-- default settings
insert into settings (key, value) values
  ('whatsapp_number', ''),
  ('delivery_cost', ''),
  ('min_order', ''),
  ('store_name', '');
