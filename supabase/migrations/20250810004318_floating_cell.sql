/*
  # Заполнение начальными данными

  1. Добавление классов (с указанием grade)
  2. Добавление учеников класса 11-Ё
*/

-- Если в таблице classes ещё нет поля grade, добавляем:
ALTER TABLE classes ADD COLUMN IF NOT EXISTS grade INT;

-- Добавление классов
INSERT INTO classes (name, grade) VALUES
  ('2-А', 2), ('2-Б', 2), ('2-В', 2), ('2-Г', 2), ('2-Д', 2), ('2-Е', 2),
  ('3-ВUT', 3), ('3-А', 3), ('3-Б', 3), ('3-В', 3), ('3-Г', 3), ('3-Д', 3),
  ('4-А', 4), ('4-Б', 4), ('4-В', 4), ('4-Г', 4), ('4-Д', 4), ('4-Е', 4),
  ('5-А', 5), ('5-Б', 5), ('5-В', 5),
  ('6-А', 6), ('6-Б', 6), ('6-В', 6), ('6-Г', 6),
  ('7-А', 7), ('7-Б', 7), ('7-В', 7), ('7-Г', 7), ('7-Д', 7), ('7-Е', 7),
  ('8-Е', 8), ('8-А', 8), ('8-Б', 8), ('8-В', 8), ('8-Г', 8), ('8-Д', 8),
  ('9-А', 9), ('9-А УТ', 9), ('9-Б', 9), ('9-В', 9), ('9-Г', 9), ('9-Д', 9), ('9-Е', 9), ('9-Ё', 9),
  ('10-А', 10), ('10-Б', 10), ('10-В', 10), ('10-Г', 10), ('10-Д', 10), ('10-Е', 10),
  ('11-А', 11), ('11-Б', 11), ('11-В', 11), ('11-Д', 11), ('11-Е', 11), ('11-Ё', 11)
ON CONFLICT (name) DO NOTHING;

-- Добавление учеников класса 11-Ё
DO $$
DECLARE
  class_11_yo_id uuid;
BEGIN
  SELECT id INTO class_11_yo_id FROM classes WHERE name = '11-Ё';
  
  INSERT INTO students (class_id, name, redirect_url) VALUES
    (class_11_yo_id, 'Абдумаликова Зебохон Иброхимхужа Кизи', 'https://test-uz.ru/student1'),
    (class_11_yo_id, 'Абдухамидов Азизжон Нодир Угли', 'https://test-uz.ru/student2'),
    (class_11_yo_id, 'Азимжонов Умаржон Нодир Угли', 'https://test-uz.ru/student3'),
    (class_11_yo_id, 'Гуломова Нилуфар Нажмиддин Қизи', 'https://test-uz.ru/student4'),
    (class_11_yo_id, 'Демирчи-Огли Амаль Мустафаевич', 'https://test-uz.ru/student5'),
    (class_11_yo_id, 'Исмаилова Оминахон Аббор Кизи', 'https://test-uz.ru/student6'),
    (class_11_yo_id, 'Исроилов Ёкубжон Даврон Угли', 'https://test-uz.ru/student7'),
    (class_11_yo_id, 'Мадиев Саидазизхон Азамжон Угли', 'https://test-uz.ru/student8'),
    (class_11_yo_id, 'Мукминов Рамазан Рустамович', 'https://test-uz.ru/student9'),
    (class_11_yo_id, 'Муродова Нозимахон Анвар Кизи', 'https://test-uz.ru/student10'),
    (class_11_yo_id, 'Наврузова Севинч Навруз Қизи', 'https://test-uz.ru/student11'),
    (class_11_yo_id, 'Расулжонов Азиз Фуркатжонович', 'https://test-uz.ru/student12'),
    (class_11_yo_id, 'Саипова Шарофат Мурод Қизи', 'https://test-uz.ru/student13'),
    (class_11_yo_id, 'Содиков Абдулкаюм Алоуддин Угли', 'https://test-uz.ru/student14'),
    (class_11_yo_id, 'Султонмуродов Саидумаржон Рустам Угли', 'https://test-uz.ru/student15'),
    (class_11_yo_id, 'Талипова Зухра Шахобиддин Кизи', 'https://test-uz.ru/student16'),
    (class_11_yo_id, 'Туйчиева Мубинабону Давроновна', 'https://test-uz.ru/student17'),
    (class_11_yo_id, 'Тураева Наргиза Тожи Қизи', 'https://test-uz.ru/student18'),
    (class_11_yo_id, 'Турсунбоев Ботиржон Бахтиер Угли', 'https://test-uz.ru/student19'),
    (class_11_yo_id, 'Уримбаева Дурдона Бахрамовна', 'https://test-uz.ru/student20'),
    (class_11_yo_id, 'Усмонахужаев Саид Жалол Мухаммад Али Угли', 'https://test-uz.ru/student21'),
    (class_11_yo_id, 'Юлдашев Исмоил Ихтиерович', 'https://test-uz.ru/student22'),
    (class_11_yo_id, 'Юнусов Абдусаид Нурали Угли', 'https://test-uz.ru/student23'),
    (class_11_yo_id, 'Юнусова Муниса Тоировна', 'https://test-uz.ru/student24')
  ON CONFLICT DO NOTHING;
END $$;

-- Пример выборки классов от 11 до 1
-- SELECT * FROM classes ORDER BY grade DESC, name ASC;
