-- Drop the old trigger if it exists just in case
drop trigger if exists on_auth_user_created on auth.users;
drop function if exists public.handle_new_user();

-- Create a function that runs with admin privileges (security definer)
create or replace function public.handle_new_user()
returns trigger as $$
begin
  insert into public.profiles (id, email, business_name)
  values (
    new.id, 
    new.email, 
    COALESCE(new.raw_user_meta_data->>'business_name', 'My Business')
  );
  return new;
end;
$$ language plpgsql security definer;

-- Trigger the function every time a new user is created
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();
