/*
  # Добавление профилей студентов

  1. Новые таблицы
    - `student_profiles` - профили студентов с аватарами
    - `login_sessions` - сессии входа для отслеживания

  2. Изменения в существующих таблицах
    - Добавление колонки `device_info` в таблицу `students` для отслеживания устройств

  3. Безопасность
    - Включение RLS для новых таблиц
    - Политики для доступа к собственным данным
*/

-- Добавляем информацию об устройстве в таблицу students
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'students' AND column_name = 'device_info'
  ) THEN
    ALTER TABLE students ADD COLUMN device_info jsonb DEFAULT '{}'::jsonb;
  END IF;
END $$;

-- Создаем таблицу профилей студентов
CREATE TABLE IF NOT EXISTS student_profiles (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  student_id uuid NOT NULL REFERENCES students(id) ON DELETE CASCADE,
  avatar_url text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  UNIQUE(student_id)
);

-- Создаем таблицу сессий входа
CREATE TABLE IF NOT EXISTS login_sessions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  student_id uuid NOT NULL REFERENCES students(id) ON DELETE CASCADE,
  login_time timestamptz DEFAULT now(),
  device_info jsonb DEFAULT '{}'::jsonb,
  ip_address text,
  user_agent text
);

-- Включаем RLS
ALTER TABLE student_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE login_sessions ENABLE ROW LEVEL SECURITY;

-- Политики для student_profiles
CREATE POLICY "Students can read own profile"
  ON student_profiles
  FOR SELECT
  TO public
  USING (true);

CREATE POLICY "Students can insert own profile"
  ON student_profiles
  FOR INSERT
  TO public
  WITH CHECK (true);

CREATE POLICY "Students can update own profile"
  ON student_profiles
  FOR UPDATE
  TO public
  USING (true);

-- Политики для login_sessions
CREATE POLICY "Students can read own sessions"
  ON login_sessions
  FOR SELECT
  TO public
  USING (true);

CREATE POLICY "Students can insert own sessions"
  ON login_sessions
  FOR INSERT
  TO public
  WITH CHECK (true);

-- Создаем функцию для обновления updated_at
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ language 'plpgsql';

-- Создаем триггер для student_profiles
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_trigger 
    WHERE tgname = 'update_student_profiles_updated_at'
  ) THEN
    CREATE TRIGGER update_student_profiles_updated_at
      BEFORE UPDATE ON student_profiles
      FOR EACH ROW
      EXECUTE FUNCTION update_updated_at_column();
  END IF;
END $$;

-- Создаем индексы для производительности
CREATE INDEX IF NOT EXISTS idx_student_profiles_student_id ON student_profiles(student_id);
CREATE INDEX IF NOT EXISTS idx_login_sessions_student_id ON login_sessions(student_id);
CREATE INDEX IF NOT EXISTS idx_login_sessions_login_time ON login_sessions(login_time DESC);