
-- Recreate profile for shabanatoon@gmail.com
insert into public.profiles (id, email, username)
values (
  '3c933030-cbc1-4042-9498-1fb02ab4c7a6',
  'shabanatoon@gmail.com',
  'shabanatoon'
)
on conflict (id) do nothing;

-- Recreate profile for iqrakhan30oct@gmail.com
insert into public.profiles (id, email, username)
values (
  '48e4bf11-a9c0-439b-a3a8-34ef89fbf1af',
  'iqrakhan30oct@gmail.com',
  'iqrakhan30oct'
)
on conflict (id) do nothing;
