/*
  # Заполнение начальными данными

  1. Добавление классов
  2. Добавление учеников класса 11-Ё
  3. Генерация тестовых ключей для некоторых учеников
*/

-- Добавление классов
INSERT INTO classes (name) VALUES
  ('2-А'), ('2-Б'), ('2-В'), ('2-Г'), ('2-Д'), ('2-Е'),
  ('3-ВUT'), ('3-А'), ('3-Б'), ('3-В'), ('3-Г'), ('3-Д'),
  ('4-А'), ('4-Б'), ('4-В'), ('4-Г'), ('4-Д'), ('4-Е'),
  ('5-А'), ('5-Б'), ('5-В'),
  ('6-А'), ('6-Б'), ('6-В'), ('6-Г'),
  ('7-А'), ('7-Б'), ('7-В'), ('7-Г'), ('7-Д'), ('7-Е'),
  ('8-Е'), ('8-А'), ('8-Б'), ('8-В'), ('8-Г'), ('8-Д'),
  ('9-А'), ('9-А УТ'), ('9-Б'), ('9-В'), ('9-Г'), ('9-Д'), ('9-Е'), ('9-Ё'),
  ('10-А'), ('10-Б'), ('10-В'), ('10-Г'), ('10-Д'), ('10-Е'),
  ('11-А'), ('11-Б'), ('11-В'), ('11-Д'), ('11-Е'), ('11-Ё')
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