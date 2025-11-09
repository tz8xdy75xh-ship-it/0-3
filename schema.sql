
create table if not exists users(
  id serial primary key,
  email text unique not null,
  password_hash text not null,
  display_name text not null,
  age int,
  pref text,
  city text,
  created_at timestamptz default now()
);
create table if not exists listings(
  id serial primary key,
  owner_id int references users(id) on delete cascade,
  title text not null,
  description text,
  category text,
  condition text,
  price_per_week int not null,
  image_url text,
  created_at timestamptz default now()
);
create table if not exists orders(
  id serial primary key,
  listing_id int references listings(id) on delete cascade,
  renter_id int references users(id) on delete cascade,
  owner_id int references users(id) on delete cascade,
  start_date date,
  end_date date,
  duration_type text,
  subtotal int,
  status text default 'pending',
  created_at timestamptz default now()
);
create table if not exists messages(
  id serial primary key,
  order_id int references orders(id) on delete cascade,
  sender_id int references users(id) on delete cascade,
  receiver_id int references users(id) on delete cascade,
  text text not null,
  created_at timestamptz default now()
);
