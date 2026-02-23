create table if not exists public.subscriptions (
    user_id uuid not null references public.profiles(id) on delete cascade,
    plan text not null check (plan in ('free', 'plus', 'pro', 'premium')),
    product_id text,
    is_active boolean not null default false,
    environment text check (environment in ('sandbox', 'production')),
    expires_at timestamptz,
    updated_at timestamptz default now(),
    primary key (user_id)
);

alter table public.subscriptions enable row level security;

create policy "Users can view own subscription"
    on public.subscriptions for select
    using (auth.uid() = user_id);

create policy "Service role can manage subscriptions"
    on public.subscriptions for all
    using (auth.role() = 'service_role');

-- Create trigger for updated_at
create trigger update_subscriptions_updated_at
    before update on public.subscriptions
    for each row
    execute function update_updated_at_column();
