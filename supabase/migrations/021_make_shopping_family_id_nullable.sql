-- ════════════════════════════════════════════════════════════
-- Migration 021: Make family_id nullable in shopping_lists
-- ════════════════════════════════════════════════════════════
-- Makes family_id nullable in shopping_lists to allow creating
-- new shopping lists with only household_id.
-- This completes the migration from families to households.
-- ════════════════════════════════════════════════════════════

-- Make family_id nullable to support household-only lists
alter table shopping_lists
  alter column family_id drop not null;

comment on column shopping_lists.family_id is 'Legacy family reference - nullable for new household-only lists';

-- Add check constraint to ensure either family_id or household_id is present
alter table shopping_lists
  drop constraint if exists shopping_lists_family_or_household_check;

alter table shopping_lists
  add constraint shopping_lists_family_or_household_check
  check (family_id is not null or household_id is not null);

comment on constraint shopping_lists_family_or_household_check on shopping_lists is 'Ensures list belongs to either a family or household (during migration)';
