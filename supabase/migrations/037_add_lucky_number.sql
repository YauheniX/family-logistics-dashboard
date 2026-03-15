-- Migration 037: Add lucky number cache to school_connections
-- Librus LuckyNumbers endpoint returns the daily lucky number.
-- Stored here so the UI can display it without an extra API call.

alter table public.school_connections
  add column if not exists lucky_number     int,
  add column if not exists lucky_number_day date;

comment on column public.school_connections.lucky_number     is 'Today''s lucky number from Librus (Szczęśliwy numerek)';
comment on column public.school_connections.lucky_number_day is 'The date the lucky_number is valid for';
