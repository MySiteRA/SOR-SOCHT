/*
  # Fix materials content_type constraint

  1. Database Changes
    - Update content_value column to jsonb with default []
    - Add 'bundle' to allowed content_type values
    - Keep existing values working
    - Set default content_type to 'bundle'

  2. Security
    - Maintain existing RLS policies
    - No changes to permissions
*/

-- Ensure content_value is jsonb with default []
ALTER TABLE materials
  ALTER COLUMN content_value TYPE jsonb USING
    CASE
      WHEN content_value IS NULL THEN '[]'::jsonb
      WHEN jsonb_typeof(content_value::jsonb) IS NOT NULL THEN content_value::jsonb
      ELSE '[]'::jsonb
    END,
  ALTER COLUMN content_value SET DEFAULT '[]'::jsonb;

-- Drop and recreate the check constraint to allow 'bundle'
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'materials_content_type_check'
  ) THEN
    ALTER TABLE materials DROP CONSTRAINT materials_content_type_check;
  END IF;
END$$;

ALTER TABLE materials
  ADD CONSTRAINT materials_content_type_check
  CHECK (content_type IN ('text', 'link', 'file', 'image', 'bundle'));

-- Set default content_type to 'bundle'
ALTER TABLE materials
  ALTER COLUMN content_type SET DEFAULT 'bundle';