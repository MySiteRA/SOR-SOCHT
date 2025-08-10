/*
  # Создание схемы базы данных для платформы test-uz.ru

  1. Новые таблицы
    - `classes` - классы школы
      - `id` (uuid, primary key)
      - `name` (text, уникальное название класса)
      - `created_at` (timestamp)
    - `students` - ученики
      - `id` (uuid, primary key) 
      - `class_id` (uuid, foreign key к classes)
      - `name` (text, имя ученика)
      - `password_hash` (text, nullable, хэш пароля)
      - `redirect_url` (text, nullable, индивидуальный URL)
      - `created_at` (timestamp)
    - `keys` - ключи доступа
      - `id` (uuid, primary key)
      - `student_id` (uuid, foreign key к students)  
      - `key_value` (text, уникальный ключ)
      - `status` (text, active/revoked)
      - `created_at` (timestamp)
      - `revoked_at` (timestamp, nullable)
    - `admin_logs` - логи действий админа
      - `id` (uuid, primary key)
      - `action` (text, тип действия)
      - `details` (jsonb, детали действия)
      - `created_at` (timestamp)

  2. Безопасность
    - Включение RLS для всех таблиц
    - Политики для публичного доступа к чтению классов и студентов
    - Политики для админских операций
*/

-- Создание таблицы классов
CREATE TABLE IF NOT EXISTS classes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text UNIQUE NOT NULL,
  created_at timestamptz DEFAULT now()
);

-- Создание таблицы студентов  
CREATE TABLE IF NOT EXISTS students (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  class_id uuid NOT NULL REFERENCES classes(id) ON DELETE CASCADE,
  name text NOT NULL,
  password_hash text,
  redirect_url text,
  created_at timestamptz DEFAULT now()
);

-- Создание таблицы ключей
CREATE TABLE IF NOT EXISTS keys (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  student_id uuid NOT NULL REFERENCES students(id) ON DELETE CASCADE,
  key_value text UNIQUE NOT NULL,
  status text NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'revoked')),
  created_at timestamptz DEFAULT now(),
  revoked_at timestamptz
);

-- Создание таблицы логов админа
CREATE TABLE IF NOT EXISTS admin_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  action text NOT NULL,
  details jsonb DEFAULT '{}'::jsonb,
  created_at timestamptz DEFAULT now()
);

-- Включение RLS
ALTER TABLE classes ENABLE ROW LEVEL SECURITY;
ALTER TABLE students ENABLE ROW LEVEL SECURITY; 
ALTER TABLE keys ENABLE ROW LEVEL SECURITY;
ALTER TABLE admin_logs ENABLE ROW LEVEL SECURITY;

-- Политики для публичного чтения классов и студентов
CREATE POLICY "Публичное чтение классов"
  ON classes FOR SELECT
  TO anon, authenticated
  USING (true);

CREATE POLICY "Публичное чтение студентов"  
  ON students FOR SELECT
  TO anon, authenticated
  USING (true);

-- Политики для операций с ключами (только чтение статуса)
CREATE POLICY "Публичное чтение ключей"
  ON keys FOR SELECT  
  TO anon, authenticated
  USING (true);

-- Политики для админских операций (пока разрешаем все)
CREATE POLICY "Админские операции с классами"
  ON classes FOR ALL
  TO anon, authenticated  
  USING (true)
  WITH CHECK (true);

CREATE POLICY "Админские операции со студентами"
  ON students FOR ALL
  TO anon, authenticated
  USING (true) 
  WITH CHECK (true);

CREATE POLICY "Админские операции с ключами"
  ON keys FOR ALL
  TO anon, authenticated
  USING (true)
  WITH CHECK (true);

CREATE POLICY "Админские операции с логами"
  ON admin_logs FOR ALL  
  TO anon, authenticated
  USING (true)
  WITH CHECK (true);

-- Создание индексов для оптимизации
CREATE INDEX IF NOT EXISTS idx_students_class_id ON students(class_id);
CREATE INDEX IF NOT EXISTS idx_keys_student_id ON keys(student_id);
CREATE INDEX IF NOT EXISTS idx_keys_status ON keys(status);
CREATE INDEX IF NOT EXISTS idx_admin_logs_created_at ON admin_logs(created_at DESC);