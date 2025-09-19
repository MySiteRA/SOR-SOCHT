/*
  # Create schedules table for file management

  1. New Tables
    - `schedules`
      - `id` (uuid, primary key)
      - `class_id` (uuid, foreign key to classes)
      - `file_name` (text, sanitized filename)
      - `public_url` (text, Supabase storage public URL)
      - `created_at` (timestamp)

  2. Security
    - Enable RLS on `schedules` table
    - Add policies for public read access
    - Add policies for authenticated users to manage schedules

  3. Indexes
    - Index on class_id for efficient queries
    - Index on created_at for ordering
*/

CREATE TABLE IF NOT EXISTS schedules (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  class_id uuid REFERENCES classes(id) ON DELETE CASCADE,
  file_name text NOT NULL,
  public_url text NOT NULL,
  created_at timestamptz DEFAULT now()
);

-- Enable RLS
ALTER TABLE schedules ENABLE ROW LEVEL SECURITY;

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_schedules_class_id ON schedules(class_id);
CREATE INDEX IF NOT EXISTS idx_schedules_created_at ON schedules(created_at DESC);

-- RLS Policies
CREATE POLICY "Public can read schedules"
  ON schedules
  FOR SELECT
  TO public
  USING (true);

CREATE POLICY "Authenticated users can manage schedules"
  ON schedules
  FOR ALL
  TO authenticated
  USING (true)
  WITH CHECK (true);

CREATE POLICY "Anonymous users can manage schedules"
  ON schedules
  FOR ALL
  TO anon
  USING (true)
  WITH CHECK (true);