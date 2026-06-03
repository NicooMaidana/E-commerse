-- Add images array to combos (same structure as products.images)
-- Run in Supabase SQL editor

alter table combos add column images text[] not null default '{}';
