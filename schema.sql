-- Enable UUID extension
create extension if not exists "uuid-ossp";

-- ==========================================
-- 1. PROFILES (Business info & settings)
-- ==========================================
create table public.profiles (
  id uuid references auth.users on delete cascade primary key,
  business_name text not null,
  address text,
  phone text,
  email text,
  gstin text,
  bank_name text,
  bank_account text,
  ifsc_code text,
  status text default 'pending',
  role text default 'user',
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- RLS
alter table public.profiles enable row level security;
create policy "Users can view own profile." on public.profiles for select using (auth.uid() = id);
create policy "Users can insert own profile." on public.profiles for insert with check (auth.uid() = id);
create policy "Users can update own profile." on public.profiles for update using (auth.uid() = id);

-- Admins can view and update all profiles
create policy "Admins can view all profiles" on public.profiles for select using (
  (select role from public.profiles where id = auth.uid()) = 'admin'
);
create policy "Admins can update all profiles" on public.profiles for update using (
  (select role from public.profiles where id = auth.uid()) = 'admin'
);

-- ==========================================
-- 2. PRODUCTS (Inventory)
-- ==========================================
create table public.products (
  id uuid default uuid_generate_v4() primary key,
  user_id uuid references auth.users not null,
  name text not null,
  category text,
  hsn_sac text,
  price numeric(10,2) default 0,
  gst_rate numeric(5,2) default 18,
  quantity numeric(10,2) default 0,
  low_stock_threshold integer default 10,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

alter table public.products enable row level security;
create policy "Users can manage own products." on public.products for all using (auth.uid() = user_id);

-- ==========================================
-- 3. PARTIES (Customers & Suppliers)
-- ==========================================
create table public.parties (
  id uuid default uuid_generate_v4() primary key,
  user_id uuid references auth.users not null,
  type text not null check (type in ('customer', 'supplier')),
  name text not null,
  gstin text,
  phone text,
  address text,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

alter table public.parties enable row level security;
create policy "Users can manage own parties." on public.parties for all using (auth.uid() = user_id);

-- ==========================================
-- 4. BILLS (Invoices & Challans)
-- ==========================================
create table public.bills (
  id uuid default uuid_generate_v4() primary key,
  user_id uuid references auth.users not null,
  bill_number integer not null,
  type text not null check (type in ('invoice', 'challan')),
  status text not null default 'completed',
  date date not null,
  party_id uuid references public.parties,
  customer_name text,
  customer_address text,
  customer_gstin text,
  place_of_supply text,
  subtotal numeric(12,2) default 0,
  total_gst numeric(12,2) default 0,
  grand_total numeric(12,2) default 0,
  round_off numeric(10,2) default 0,
  notes text,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

alter table public.bills enable row level security;
create policy "Users can manage own bills." on public.bills for all using (auth.uid() = user_id);

-- Unique bill number per user and type
create unique index on public.bills (user_id, type, bill_number);

-- ==========================================
-- 5. BILL ITEMS
-- ==========================================
create table public.bill_items (
  id uuid default uuid_generate_v4() primary key,
  bill_id uuid references public.bills on delete cascade not null,
  product_id uuid references public.products,
  product_name text not null,
  hsn_sac text,
  quantity numeric(10,3) not null,
  rate numeric(10,2) not null,
  gst_rate numeric(5,2) default 18,
  discount_pct numeric(5,2) default 0,
  amount numeric(12,2) not null
);

alter table public.bill_items enable row level security;
create policy "Users can manage own bill items." on public.bill_items 
  for all using (bill_id in (select id from public.bills where user_id = auth.uid()));

-- ==========================================
-- 6. PURCHASES (Inward Stock)
-- ==========================================
create table public.purchases (
  id uuid default uuid_generate_v4() primary key,
  user_id uuid references auth.users not null,
  bill_number integer not null,
  status text not null default 'completed',
  date date not null,
  party_id uuid references public.parties,
  party_name text,
  subtotal numeric(12,2) default 0,
  total_gst numeric(12,2) default 0,
  grand_total numeric(12,2) default 0,
  round_off numeric(10,2) default 0,
  notes text,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

alter table public.purchases enable row level security;
create policy "Users can manage own purchases." on public.purchases for all using (auth.uid() = user_id);

create unique index on public.purchases (user_id, bill_number);

-- ==========================================
-- 7. PURCHASE ITEMS
-- ==========================================
create table public.purchase_items (
  id uuid default uuid_generate_v4() primary key,
  purchase_id uuid references public.purchases on delete cascade not null,
  product_id uuid references public.products,
  product_name text not null,
  hsn_sac text,
  quantity numeric(10,3) not null,
  rate numeric(10,2) not null,
  gst_rate numeric(5,2) default 18,
  discount_pct numeric(5,2) default 0,
  amount numeric(12,2) not null
);

alter table public.purchase_items enable row level security;
create policy "Users can manage own purchase items." on public.purchase_items 
  for all using (purchase_id in (select id from public.purchases where user_id = auth.uid()));

-- ==========================================
-- 8. TRANSACTIONS (Ledger)
-- ==========================================
create table public.transactions (
  id uuid default uuid_generate_v4() primary key,
  user_id uuid references auth.users not null,
  party_id uuid references public.parties not null,
  date date not null,
  type text not null check (type in ('invoice', 'receipt', 'purchase', 'payment')),
  reference text,
  amount numeric(12,2) not null,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

alter table public.transactions enable row level security;
create policy "Users can manage own transactions." on public.transactions for all using (auth.uid() = user_id);
