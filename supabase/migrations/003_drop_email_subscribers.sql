-- Remove digest email subscribe (feature retired).
drop function if exists public.subscribe_to_digest(text, text);
drop table if exists public.email_subscribers;
