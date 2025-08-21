/*
  # Добавление отслеживания входов учеников

  1. Изменения в таблице students
    - Добавляем поле last_login для отслеживания последнего входа
    - Добавляем поле registration_date для отслеживания даты регистрации

  2. Обновляем существующие записи
    - Устанавливаем registration_date как created_at для существующих записей
*/

-- Добавляем новые поля в таблицу students
DO $$
BEGIN
  -- Добавляем поле last_login если его нет
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'students' AND column_name = 'last_login'
  ) THEN
    ALTER TABLE students ADD COLUMN last_login timestamptz;
  END IF;

  -- Добавляем поле registration_date если его нет
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'students' AND column_name = 'registration_date'
  ) THEN
    ALTER TABLE students ADD COLUMN registration_date timestamptz;
  END IF;
END $$;

-- Обновляем registration_date для существующих записей
UPDATE students 
SET registration_date = created_at 
WHERE registration_date IS NULL;

-- Создаем индекс для быстрого поиска по last_login
CREATE INDEX IF NOT EXISTS idx_students_last_login ON students(last_login);
CREATE INDEX IF NOT EXISTS idx_students_registration_date ON students(registration_date);