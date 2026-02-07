-- Create a trigger that calls the Edge Function when a new suggestion is inserted

-- Ensure pg_net extension is enabled
create extension if not exists "pg_net" with schema "extensions";

-- Function to call the Edge Function
create or replace function public.on_suggestion_inserted()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  request_id bigint;
begin
  select
    net.http_post(
      url := 'https://ftybizjyqoezsmiqfmun.supabase.co/functions/v1/send-suggestion-email',
      headers := jsonb_build_object(
        'Content-Type', 'application/json',
        -- REEMPLAZA 'tu_service_role_key_aqui' con la clave real que copiaste
        'Authorization', 'Bearer tu_service_role_key_aqui'
      ),
      body := jsonb_build_object(
        'record', row_to_json(new)
      )
    )
  into request_id;

  return new;
end;
$$;

-- Trigger for user_suggestions
drop trigger if exists tr_on_suggestion_inserted on public.user_suggestions;
create trigger tr_on_suggestion_inserted
  after insert on public.user_suggestions
  for each row execute function public.on_suggestion_inserted();
