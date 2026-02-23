-- ============================================================
-- Remove image_url column from wishlist_items
-- ============================================================

-- Drop the image_url column from wishlist_items table
alter table wishlist_items drop column if exists image_url;

comment on table wishlist_items is 'Items in a wishlist with reservation support (image_url removed 2026-02-23)';
