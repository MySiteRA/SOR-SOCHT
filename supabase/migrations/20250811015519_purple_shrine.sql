/*
  # Система материалов и предметов

  1. Новые таблицы
    - `subjects` - предметы с иконками
    - `materials` - материалы СОР/СОЧ с различными типами контента
  
  2. Безопасность
    - Включить RLS для всех таблиц
    - Публичное чтение для учеников
    - Полный доступ для админов
*/

-- Удаляем старую таблицу subjects если существует
DROP TABLE IF EXISTS subjects CASCADE;

-- Создаем новую таблицу предметов
CREATE TABLE IF NOT EXISTS subjects (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  icon text DEFAULT 'BookOpen',
  created_at timestamptz DEFAULT now()
);

-- Создаем таблицу материалов
CREATE TABLE IF NOT EXISTS materials (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  subject_id uuid NOT NULL REFERENCES subjects(id) ON DELETE CASCADE,
  title text NOT NULL,
  type text NOT NULL CHECK (type IN ('SOR', 'SOCH')),
  content_type text NOT NULL CHECK (content_type IN ('text', 'image', 'file', 'link')),
  content_value text NOT NULL,
  created_at timestamptz DEFAULT now()
);

-- Включаем RLS
ALTER TABLE subjects ENABLE ROW LEVEL SECURITY;
ALTER TABLE materials ENABLE ROW LEVEL SECURITY;

-- Политики для subjects
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

-- Политики для materials
CREATE POLICY "Materials are publicly readable"
  ON materials
  FOR SELECT
  TO public
  USING (true);

CREATE POLICY "Allow public to insert materials"
  ON materials
  FOR INSERT
  TO public
  WITH CHECK (true);

CREATE POLICY "Allow public to update materials"
  ON materials
  FOR UPDATE
  TO public
  USING (true);

CREATE POLICY "Allow public to delete materials"
  ON materials
  FOR DELETE
  TO public
  USING (true);

-- Индексы для производительности
CREATE INDEX IF NOT EXISTS idx_materials_subject_id ON materials(subject_id);
CREATE INDEX IF NOT EXISTS idx_materials_type ON materials(type);

-- Вставляем предметы для класса 11-Ё
INSERT INTO subjects (name, icon) VALUES
  ('Математика', 'Calculator'),
  ('Физика', 'Zap'),
  ('Химия', 'Flask'),
  ('Биология', 'Leaf'),
  ('История', 'Clock'),
  ('География', 'Globe'),
  ('Литература', 'BookOpen'),
  ('Русский язык', 'Type'),
  ('Английский язык', 'Languages'),
  ('Информатика', 'Monitor')
ON CONFLICT DO NOTHING;

-- Добавляем примеры материалов
DO $$
DECLARE
  math_id uuid;
  physics_id uuid;
BEGIN
  -- Получаем ID предметов
  SELECT id INTO math_id FROM subjects WHERE name = 'Математика' LIMIT 1;
  SELECT id INTO physics_id FROM subjects WHERE name = 'Физика' LIMIT 1;
  
  -- Добавляем материалы для математики
  IF math_id IS NOT NULL THEN
    INSERT INTO materials (subject_id, title, type, content_type, content_value) VALUES
      (math_id, 'Производные и интегралы', 'SOR', 'text', 'Изучите основы дифференциального и интегрального исчисления. Решите задачи на нахождение производных сложных функций.'),
      (math_id, 'Тригонометрические функции', 'SOR', 'text', 'Повторите основные тригонометрические тождества и формулы приведения.'),
      (math_id, 'Итоговая контрольная работа', 'SOCH', 'text', 'Комплексная работа по всем темам четверти: алгебра, геометрия, начала анализа.');
  END IF;
  
  -- Добавляем материалы для физики
  IF physics_id IS NOT NULL THEN
    INSERT INTO materials (subject_id, title, type, content_type, content_value) VALUES
      (physics_id, 'Электромагнитные волны', 'SOR', 'text', 'Изучите свойства электромагнитных волн, их распространение и применение.'),
      (physics_id, 'Квантовая физика', 'SOR', 'text', 'Основы квантовой механики, фотоэффект, строение атома.'),
      (physics_id, 'Физика атомного ядра', 'SOCH', 'text', 'Радиоактивность, ядерные реакции, элементарные частицы.');
  END IF;
END $$;