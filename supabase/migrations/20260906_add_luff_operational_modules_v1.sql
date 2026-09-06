-- LUFF Admin v0.3 — módulos operacionais
-- Aplicado no projeto Supabase compartilhado em 2026-09-06.

alter table luff.members add column if not exists display_name text;
alter table luff.members add column if not exists email text;

create table if not exists luff.site_settings (
  tenant_id uuid primary key references luff.tenants(id) on delete cascade,
  brand_name text not null default 'LUFF Store', slogan text, whatsapp text, instagram text,
  address text, map_url text, seo_title text, seo_description text,
  is_published boolean not null default false,
  created_at timestamptz not null default now(), updated_at timestamptz not null default now()
);

create table if not exists luff.site_banners (
  id uuid primary key default gen_random_uuid(), tenant_id uuid not null references luff.tenants(id) on delete cascade,
  title text not null, subtitle text, image_url text, cta_label text, cta_url text,
  sort_order integer not null default 0, is_active boolean not null default true,
  starts_at timestamptz, ends_at timestamptz,
  created_at timestamptz not null default now(), updated_at timestamptz not null default now(),
  unique(id, tenant_id)
);

create table if not exists luff.site_sections (
  id uuid primary key default gen_random_uuid(), tenant_id uuid not null references luff.tenants(id) on delete cascade,
  section_key text not null, title text not null, subtitle text, sort_order integer not null default 0,
  is_active boolean not null default true, created_at timestamptz not null default now(), updated_at timestamptz not null default now(),
  unique(tenant_id, section_key), unique(id, tenant_id)
);

create table if not exists luff.marketing_campaigns (
  id uuid primary key default gen_random_uuid(), tenant_id uuid not null references luff.tenants(id) on delete cascade,
  name text not null, objective text, channel text,
  status text not null default 'draft' check (status in ('draft','planned','active','paused','completed','archived')),
  starts_at timestamptz, ends_at timestamptz, budget numeric(12,2), notes text,
  created_at timestamptz not null default now(), updated_at timestamptz not null default now(), unique(id, tenant_id)
);

create table if not exists luff.marketing_content (
  id uuid primary key default gen_random_uuid(), tenant_id uuid not null references luff.tenants(id) on delete cascade,
  campaign_id uuid, channel text not null default 'instagram',
  content_type text not null default 'post' check (content_type in ('post','reel','story','email','whatsapp','other')),
  title text not null, caption text, media_url text,
  status text not null default 'idea' check (status in ('idea','planned','production','ready','scheduled','published','archived')),
  scheduled_at timestamptz, published_at timestamptz,
  created_at timestamptz not null default now(), updated_at timestamptz not null default now(), unique(id, tenant_id),
  foreign key (campaign_id, tenant_id) references luff.marketing_campaigns(id, tenant_id) on delete set null
);

create table if not exists luff.customers (
  id uuid primary key default gen_random_uuid(), tenant_id uuid not null references luff.tenants(id) on delete cascade,
  source_system text not null default 'manual', external_id text, name text not null, email text, phone text,
  birthday date, clothing_size text, pants_size text, shoe_size text,
  preferred_colors text[], preferred_styles text[], notes text,
  marketing_consent boolean not null default false, last_purchase_at timestamptz,
  created_at timestamptz not null default now(), updated_at timestamptz not null default now(),
  unique(id, tenant_id), unique(tenant_id, source_system, external_id)
);

create table if not exists luff.sales_daily (
  id uuid primary key default gen_random_uuid(), tenant_id uuid not null references luff.tenants(id) on delete cascade,
  sale_date date not null, gross_sales numeric(14,2) not null default 0, net_sales numeric(14,2) not null default 0,
  orders_count integer not null default 0, items_count integer not null default 0, customers_count integer not null default 0,
  source_system text not null default 'velo', last_synced_at timestamptz,
  created_at timestamptz not null default now(), updated_at timestamptz not null default now(),
  unique(tenant_id, sale_date, source_system)
);

create index if not exists luff_site_banners_tenant_active_idx on luff.site_banners(tenant_id, is_active, sort_order);
create index if not exists luff_site_sections_tenant_order_idx on luff.site_sections(tenant_id, sort_order);
create index if not exists luff_marketing_campaigns_tenant_status_idx on luff.marketing_campaigns(tenant_id, status, starts_at);
create index if not exists luff_marketing_content_tenant_status_idx on luff.marketing_content(tenant_id, status, scheduled_at);
create index if not exists luff_marketing_content_campaign_idx on luff.marketing_content(campaign_id);
create index if not exists luff_customers_tenant_name_idx on luff.customers(tenant_id, name);
create index if not exists luff_sales_daily_tenant_date_idx on luff.sales_daily(tenant_id, sale_date desc);

alter table luff.site_settings enable row level security;
alter table luff.site_banners enable row level security;
alter table luff.site_sections enable row level security;
alter table luff.marketing_campaigns enable row level security;
alter table luff.marketing_content enable row level security;
alter table luff.customers enable row level security;
alter table luff.sales_daily enable row level security;

create policy site_settings_public_read on luff.site_settings for select to anon using (is_published);
create policy site_settings_member_read on luff.site_settings for select to authenticated using (luff_private.has_luff_role(tenant_id, array['owner','manager','staff']));
create policy site_settings_manager_insert on luff.site_settings for insert to authenticated with check (luff_private.has_luff_role(tenant_id, array['owner','manager']));
create policy site_settings_manager_update on luff.site_settings for update to authenticated using (luff_private.has_luff_role(tenant_id, array['owner','manager'])) with check (luff_private.has_luff_role(tenant_id, array['owner','manager']));

create policy site_banners_public_read on luff.site_banners for select to anon using (is_active and (starts_at is null or starts_at <= now()) and (ends_at is null or ends_at >= now()));
create policy site_banners_member_read on luff.site_banners for select to authenticated using (luff_private.has_luff_role(tenant_id, array['owner','manager','staff']));
create policy site_banners_manager_insert on luff.site_banners for insert to authenticated with check (luff_private.has_luff_role(tenant_id, array['owner','manager']));
create policy site_banners_manager_update on luff.site_banners for update to authenticated using (luff_private.has_luff_role(tenant_id, array['owner','manager'])) with check (luff_private.has_luff_role(tenant_id, array['owner','manager']));
create policy site_banners_manager_delete on luff.site_banners for delete to authenticated using (luff_private.has_luff_role(tenant_id, array['owner','manager']));

create policy site_sections_public_read on luff.site_sections for select to anon using (is_active);
create policy site_sections_member_read on luff.site_sections for select to authenticated using (luff_private.has_luff_role(tenant_id, array['owner','manager','staff']));
create policy site_sections_manager_insert on luff.site_sections for insert to authenticated with check (luff_private.has_luff_role(tenant_id, array['owner','manager']));
create policy site_sections_manager_update on luff.site_sections for update to authenticated using (luff_private.has_luff_role(tenant_id, array['owner','manager'])) with check (luff_private.has_luff_role(tenant_id, array['owner','manager']));
create policy site_sections_manager_delete on luff.site_sections for delete to authenticated using (luff_private.has_luff_role(tenant_id, array['owner','manager']));

create policy campaigns_member_read on luff.marketing_campaigns for select to authenticated using (luff_private.has_luff_role(tenant_id, array['owner','manager','staff']));
create policy campaigns_manager_insert on luff.marketing_campaigns for insert to authenticated with check (luff_private.has_luff_role(tenant_id, array['owner','manager']));
create policy campaigns_manager_update on luff.marketing_campaigns for update to authenticated using (luff_private.has_luff_role(tenant_id, array['owner','manager'])) with check (luff_private.has_luff_role(tenant_id, array['owner','manager']));
create policy campaigns_manager_delete on luff.marketing_campaigns for delete to authenticated using (luff_private.has_luff_role(tenant_id, array['owner','manager']));

create policy content_member_read on luff.marketing_content for select to authenticated using (luff_private.has_luff_role(tenant_id, array['owner','manager','staff']));
create policy content_manager_insert on luff.marketing_content for insert to authenticated with check (luff_private.has_luff_role(tenant_id, array['owner','manager']));
create policy content_manager_update on luff.marketing_content for update to authenticated using (luff_private.has_luff_role(tenant_id, array['owner','manager'])) with check (luff_private.has_luff_role(tenant_id, array['owner','manager']));
create policy content_manager_delete on luff.marketing_content for delete to authenticated using (luff_private.has_luff_role(tenant_id, array['owner','manager']));

create policy customers_member_read on luff.customers for select to authenticated using (luff_private.has_luff_role(tenant_id, array['owner','manager','staff']));
create policy customers_manager_insert on luff.customers for insert to authenticated with check (luff_private.has_luff_role(tenant_id, array['owner','manager']));
create policy customers_manager_update on luff.customers for update to authenticated using (luff_private.has_luff_role(tenant_id, array['owner','manager'])) with check (luff_private.has_luff_role(tenant_id, array['owner','manager']));
create policy customers_manager_delete on luff.customers for delete to authenticated using (luff_private.has_luff_role(tenant_id, array['owner','manager']));

create policy sales_daily_member_read on luff.sales_daily for select to authenticated using (luff_private.has_luff_role(tenant_id, array['owner','manager','staff']));
create policy sales_daily_manager_insert on luff.sales_daily for insert to authenticated with check (luff_private.has_luff_role(tenant_id, array['owner','manager']));
create policy sales_daily_manager_update on luff.sales_daily for update to authenticated using (luff_private.has_luff_role(tenant_id, array['owner','manager'])) with check (luff_private.has_luff_role(tenant_id, array['owner','manager']));
create policy sales_daily_manager_delete on luff.sales_daily for delete to authenticated using (luff_private.has_luff_role(tenant_id, array['owner','manager']));

grant select on luff.site_settings, luff.site_banners, luff.site_sections to anon;
grant select, insert, update, delete on luff.site_settings, luff.site_banners, luff.site_sections, luff.marketing_campaigns, luff.marketing_content, luff.customers, luff.sales_daily to authenticated;
grant all on luff.site_settings, luff.site_banners, luff.site_sections, luff.marketing_campaigns, luff.marketing_content, luff.customers, luff.sales_daily to service_role;

create trigger luff_site_settings_updated before update on luff.site_settings for each row execute function luff_private.set_updated_at();
create trigger luff_site_banners_updated before update on luff.site_banners for each row execute function luff_private.set_updated_at();
create trigger luff_site_sections_updated before update on luff.site_sections for each row execute function luff_private.set_updated_at();
create trigger luff_marketing_campaigns_updated before update on luff.marketing_campaigns for each row execute function luff_private.set_updated_at();
create trigger luff_marketing_content_updated before update on luff.marketing_content for each row execute function luff_private.set_updated_at();
create trigger luff_customers_updated before update on luff.customers for each row execute function luff_private.set_updated_at();
create trigger luff_sales_daily_updated before update on luff.sales_daily for each row execute function luff_private.set_updated_at();

with t as (select id from luff.tenants where slug='luff-store')
insert into luff.site_settings (tenant_id, brand_name, slogan, is_published)
select id, 'LUFF Store', 'Controle o rumo. Vista o movimento.', false from t
on conflict (tenant_id) do nothing;

with t as (select id from luff.tenants where slug='luff-store')
insert into luff.site_sections (tenant_id, section_key, title, subtitle, sort_order, is_active)
select t.id, s.section_key, s.title, s.subtitle, s.sort_order, true
from t cross join (values
('novidades','Novidades','Os lançamentos que acabam de chegar.',10),
('destaques','Destaques','Seleção da LUFF para a temporada.',20),
('looks','Looks','Combinações pensadas para diferentes ocasiões.',30),
('categorias','Categorias','Explore o universo LUFF.',40)
) s(section_key,title,subtitle,sort_order)
on conflict (tenant_id, section_key) do nothing;

update luff.members m
set email = u.email,
    display_name = coalesce(m.display_name, nullif(u.raw_user_meta_data->>'name',''), split_part(u.email,'@',1))
from auth.users u
where m.user_id = u.id and (m.email is null or m.display_name is null);
