/*
  # Создание схемы базы данных для test-uz.ru клона

  1. Новые таблицы
    - `classes` - классы школы
      - `id` (uuid, primary key)
      - `name` (text)
      - `created_at` (timestamp)
    
    - `students` - ученики
      - `id` (uuid, primary key)
      - `class_id` (uuid, foreign key)
      - `name` (text)
      - `password_hash` (text, nullable)
      - `url` (text, nullable)
      - `created_at` (timestamp)
    
    - `keys` - ключи доступа
      - `id` (uuid, primary key)
      - `student_id` (uuid, foreign key)
      - `key_value` (text, unique)
      - `status` (text: active/revoked)
      - `created_at` (timestamp)
      - `expires_at` (timestamp, nullable)
      - `revoked_at` (timestamp, nullable)
    
    - `logs` - логи действий
      - `id` (uuid, primary key)
      - `action` (text)
      - `details` (text)
      - `created_at` (timestamp)

  2. Security
    - Enable RLS на всех таблицах
    - Политики для доступа к данным
*/

-- Создание таблицы классов
CREATE TABLE IF NOT EXISTS classes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text UNIQUE NOT NULL,
  created_at timestamptz DEFAULT now()
);

-- Создание таблицы учеников
CREATE TABLE IF NOT EXISTS students (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  class_id uuid NOT NULL REFERENCES classes(id) ON DELETE CASCADE,
  name text NOT NULL,
  password_hash text,
  url text,
  created_at timestamptz DEFAULT now()
);

-- Создание таблицы ключей
CREATE TABLE IF NOT EXISTS keys (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  student_id uuid NOT NULL REFERENCES students(id) ON DELETE CASCADE,
  key_value text UNIQUE NOT NULL,
  status text NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'revoked')),
  created_at timestamptz DEFAULT now(),
  expires_at timestamptz,
  revoked_at timestamptz
);

-- Создание таблицы логов
CREATE TABLE IF NOT EXISTS logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  action text NOT NULL,
  details text,
  created_at timestamptz DEFAULT now()
);

-- Включение RLS
ALTER TABLE classes ENABLE ROW LEVEL SECURITY;
ALTER TABLE students ENABLE ROW LEVEL SECURITY;
ALTER TABLE keys ENABLE ROW LEVEL SECURITY;
ALTER TABLE logs ENABLE ROW LEVEL SECURITY;

-- Политики доступа (публичное чтение для основных таблиц)
CREATE POLICY "Classes are publicly readable"
  ON classes FOR SELECT
  TO public
  USING (true);

CREATE POLICY "Students are publicly readable"
  ON students FOR SELECT
  TO public
  USING (true);

CREATE POLICY "Keys are publicly readable"
  ON keys FOR SELECT
  TO public
  USING (true);

CREATE POLICY "Allow public to update student password"
  ON students FOR UPDATE
  TO public
  USING (true);

CREATE POLICY "Allow public to insert keys"
  ON keys FOR INSERT
  TO public
  WITH CHECK (true);

CREATE POLICY "Allow public to update keys"
  ON keys FOR UPDATE
  TO public
  USING (true);

CREATE POLICY "Allow public to insert logs"
  ON logs FOR INSERT
  TO public
  WITH CHECK (true);

CREATE POLICY "Logs are publicly readable"
  ON logs FOR SELECT
  TO public
  USING (true);

-- Создание индексов для производительности
CREATE INDEX IF NOT EXISTS idx_students_class_id ON students(class_id);
CREATE INDEX IF NOT EXISTS idx_keys_student_id ON keys(student_id);
CREATE INDEX IF NOT EXISTS idx_keys_key_value ON keys(key_value);
CREATE INDEX IF NOT EXISTS idx_keys_status ON keys(status);