-- Migration: Add is_planned column to budget_entries
-- This allows distinguishing between planned budget and actual spending.

ALTER TABLE public.budget_entries
  ADD COLUMN IF NOT EXISTS is_planned boolean NOT NULL DEFAULT false;
