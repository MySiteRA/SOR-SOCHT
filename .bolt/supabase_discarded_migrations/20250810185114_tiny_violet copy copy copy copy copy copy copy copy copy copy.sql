/*
  # Add files and subjects system

  1. New Tables
    - `subjects`
      - `id` (uuid, primary key)
      - `class_id` (uuid, foreign key to classes)
      - `name` (text)
      - `created_at` (timestamp)
    - `files`
      - `id` (uuid, primary key)
      - `class_id` (uuid, foreign key to classes)
      - `subject_id` (uuid, foreign key to subjects)
      - `category` (text, SOR or SOCH)
      - `filename` (text)
      - `file_url` (text)
      - `file_size` (bigint)
      - `uploaded_at` (timestamp)
    - `downloads`
      - `id` (uuid, primary key)
      - `student_id` (uuid, foreign key to students)
      - `file_id` (uuid, foreign key to files)
      - `downloaded_at` (timestamp)

  2. Security
    - Enable RLS on all new tables
    - Add policies for public access to files and subjects
    - Add policies for admin file management

  3. Initial Data
    - Add subjects for class 11-Ё
*/

-- Create subjects table
CREATE TABLE IF NOT EXISTS subjects (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  class_id uuid NOT NULL REFERENCES classes(id) ON DELETE CASCADE,
  name text NOT NULL,
  created_at timestamptz DEFAULT now()
);

-- Create files table
CREATE TABLE IF NOT EXISTS files (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  class_id uuid NOT NULL REFERENCES classes(id) ON DELETE CASCADE,
  subject_id uuid NOT NULL REFERENCES subjects(id) ON DELETE CASCADE,
  category text NOT NULL CHECK (category IN ('SOR', 'SOCH')),
  filename text NOT NULL,
  file_url text NOT NULL,
  file_size bigint DEFAULT 0,
  uploaded_at timestamptz DEFAULT now()
);

-- Create downloads table
CREATE TABLE IF NOT EXISTS downloads (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  student_id uuid NOT NULL REFERENCES students(id) ON DELETE CASCADE,
  file_id uuid NOT NULL REFERENCES files(id) ON DELETE CASCADE,
  downloaded_at timestamptz DEFAULT now()
);

-- Enable RLS
ALTER TABLE subjects ENABLE ROW LEVEL SECURITY;
ALTER TABLE files ENABLE ROW LEVEL SECURITY;
ALTER TABLE downloads ENABLE ROW LEVEL SECURITY;

-- Create policies for subjects
CREATE POLICY "Subjects are publicly readable"
  ON subjects
  FOR SELECT
  TO public
  USING (true);

CREATE POLICY "Allow public to insert subjects"
  ON subjects
  FOR INSERT
  TO public
  WITH CHECK (true);

CREATE POLICY "Allow public to update subjects"
  ON subjects
  FOR UPDATE
  TO public
  USING (true);

CREATE POLICY "Allow public to delete subjects"
  ON subjects
  FOR DELETE
  TO public
  USING (true);

-- Create policies for files
CREATE POLICY "Files are publicly readable"
  ON files
  FOR SELECT
  TO public
  USING (true);

CREATE POLICY "Allow public to insert files"
  ON files
  FOR INSERT
  TO public
  WITH CHECK (true);

CREATE POLICY "Allow public to update files"
  ON files
  FOR UPDATE
  TO public
  USING (true);

CREATE POLICY "Allow public to delete files"
  ON files
  FOR DELETE
  TO public
  USING (true);

-- Create policies for downloads
CREATE POLICY "Downloads are publicly readable"
  ON downloads
  FOR SELECT
  TO public
  USING (true);

CREATE POLICY "Allow public to insert downloads"
  ON downloads
  FOR INSERT
  TO public
  WITH CHECK (true);

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_subjects_class_id ON subjects(class_id);
CREATE INDEX IF NOT EXISTS idx_files_class_id ON files(class_id);
CREATE INDEX IF NOT EXISTS idx_files_subject_id ON files(subject_id);
CREATE INDEX IF NOT EXISTS idx_files_category ON files(category);
CREATE INDEX IF NOT EXISTS idx_downloads_student_id ON downloads(student_id);
CREATE INDEX IF NOT EXISTS idx_downloads_file_id ON downloads(file_id);

-- Insert subjects for class 11-Ё
DO $$
DECLARE
  class_11_yo_id uuid;
BEGIN
  -- Get the ID of class 11-Ё
  SELECT id INTO class_11_yo_id FROM classes WHERE name = '11-Ё';
  
  IF class_11_yo_id IS NOT NULL THEN
    INSERT INTO subjects (class_id, name) VALUES
    (class_11_yo_id, 'Математика'),
    (class_11_yo_id, 'Физика'),
    (class_11_yo_id, 'Химия'),
    (class_11_yo_id, 'Биология'),
    (class_11_yo_id, 'История'),
    (class_11_yo_id, 'География'),
    (class_11_yo_id, 'Литература'),
    (class_11_yo_id, 'Русский язык'),
    (class_11_yo_id, 'Английский язык'),
    (class_11_yo_id, 'Информатика'),
    (class_11_yo_id, 'Обществознание'),
    (class_11_yo_id, 'Экономика');
  END IF;
END $$;