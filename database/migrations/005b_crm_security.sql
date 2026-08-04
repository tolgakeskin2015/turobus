-- SATIR GÜVENLİĞİ

alter table public.crm_customers enable row level security;
alter table public.crm_tags enable row level security;
alter table public.crm_customer_tags enable row level security;
alter table public.crm_notes enable row level security;
alter table public.crm_tasks enable row level security;
alter table public.crm_deals enable row level security;
alter table public.crm_timeline enable row level security;
alter table public.crm_files enable row level security;


grant select, insert, update, delete
on public.crm_customers,
   public.crm_tags,
   public.crm_customer_tags,
   public.crm_notes,
   public.crm_tasks,
   public.crm_deals,
   public.crm_timeline,
   public.crm_files
to authenticated;


-- GENEL ŞİRKET ÜYESİ OKUMA POLİTİKALARI

create policy "Members view CRM customers"
on public.crm_customers
for select
to authenticated
using (
  public.is_company_member(company_id)
);

create policy "Authorized users manage CRM customers"
on public.crm_customers
for all
to authenticated
using (
  public.has_company_role(
    company_id,
    array[
      'super_admin',
      'company_owner',
      'operation_manager',
      'sales'
    ]::public.app_role[]
  )
)
with check (
  public.has_company_role(
    company_id,
    array[
      'super_admin',
      'company_owner',
      'operation_manager',
      'sales'
    ]::public.app_role[]
  )
);


create policy "Members view CRM tags"
on public.crm_tags
for select
to authenticated
using (
  public.is_company_member(company_id)
);

create policy "Authorized users manage CRM tags"
on public.crm_tags
for all
to authenticated
using (
  public.has_company_role(
    company_id,
    array[
      'super_admin',
      'company_owner',
      'operation_manager',
      'sales'
    ]::public.app_role[]
  )
)
with check (
  public.has_company_role(
    company_id,
    array[
      'super_admin',
      'company_owner',
      'operation_manager',
      'sales'
    ]::public.app_role[]
  )
);


create policy "Members manage CRM customer tags"
on public.crm_customer_tags
for all
to authenticated
using (
  public.is_company_member(company_id)
)
with check (
  public.is_company_member(company_id)
);


create policy "Members view CRM notes"
on public.crm_notes
for select
to authenticated
using (
  public.is_company_member(company_id)
);

create policy "Members manage CRM notes"
on public.crm_notes
for all
to authenticated
using (
  public.is_company_member(company_id)
)
with check (
  public.is_company_member(company_id)
);


create policy "Members view CRM tasks"
on public.crm_tasks
for select
to authenticated
using (
  public.is_company_member(company_id)
);

create policy "Members manage CRM tasks"
on public.crm_tasks
for all
to authenticated
using (
  public.is_company_member(company_id)
)
with check (
  public.is_company_member(company_id)
);


create policy "Members view CRM deals"
on public.crm_deals
for select
to authenticated
using (
  public.is_company_member(company_id)
);

create policy "Authorized users manage CRM deals"
on public.crm_deals
for all
to authenticated
using (
  public.has_company_role(
    company_id,
    array[
      'super_admin',
      'company_owner',
      'operation_manager',
      'sales',
      'accounting'
    ]::public.app_role[]
  )
)
with check (
  public.has_company_role(
    company_id,
    array[
      'super_admin',
      'company_owner',
      'operation_manager',
      'sales',
      'accounting'
    ]::public.app_role[]
  )
);


create policy "Members view CRM timeline"
on public.crm_timeline
for select
to authenticated
using (
  public.is_company_member(company_id)
);

create policy "Members add CRM timeline"
on public.crm_timeline
for insert
to authenticated
with check (
  public.is_company_member(company_id)
);


create policy "Members view CRM files"
on public.crm_files
for select
to authenticated
using (
  public.is_company_member(company_id)
);

create policy "Members manage CRM files"
on public.crm_files
for all
to authenticated
using (
  public.is_company_member(company_id)
)
with check (
  public.is_company_member(company_id)
);
