/*
  # Заполнение начальными данными

  1. Добавление классов (с указанием grade)
  2. Добавление учеников классов 11-А, 11-Б, 11-В и 11-Д
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

-- Добавление учеников класса 11-А
DO $$
DECLARE
  class_11_a_id uuid;
BEGIN
  SELECT id INTO class_11_a_id FROM classes WHERE name = '11-А';
  
  INSERT INTO students (class_id, name, redirect_url) VALUES
    (class_11_a_id, 'Abdug''afforjonova Malikaxon Abduvaxob Qizi', 'https://test-uz.ru/student51'),
    (class_11_a_id, 'Abdurazzoqov Shahzod Abdurasul O''g''li', 'https://test-uz.ru/student52'),
    (class_11_a_id, 'Abdusamadov Sa''dulloh Farrux O''g''li', 'https://test-uz.ru/student53'),
    (class_11_a_id, 'Abduxamidjonov Asilbek Abdurasul O''g''li', 'https://test-uz.ru/student54'),
    (class_11_a_id, 'Axmadova Rayxona Bahodir Qizi', 'https://test-uz.ru/student55'),
    (class_11_a_id, 'Azizova Ominabonu Mirxomit Qizi', 'https://test-uz.ru/student56'),
    (class_11_a_id, 'Babajanov Abdulloh Mo`min  o`g`li', 'https://test-uz.ru/student57'),
    (class_11_a_id, 'Bo''riyeva Nozima Shuxrat Qizi', 'https://test-uz.ru/student58'),
    (class_11_a_id, 'G''ulomova Marxabo Baxriddin Qizi', 'https://test-uz.ru/student59'),
    (class_11_a_id, 'Ismoilov Abdulloh Dilshod O''g''li', 'https://test-uz.ru/student60'),
    (class_11_a_id, 'Ismoilova Shahrizoda Nurxonovna', 'https://test-uz.ru/student61'),
    (class_11_a_id, 'Kamolov Azizbek Sherzod O''g''li', 'https://test-uz.ru/student62'),
    (class_11_a_id, 'Muxamedjanova Muslima Sherzod qizi', 'https://test-uz.ru/student63'),
    (class_11_a_id, 'Najmiddinov G''ulomiddin Fazliddin O''g''li', 'https://test-uz.ru/student64'),
    (class_11_a_id, 'Nasibullayeva Madina Izzatilla Qizi', 'https://test-uz.ru/student65'),
    (class_11_a_id, 'Nig''matullayeva Ominabonu Jamoliddin Qizi', 'https://test-uz.ru/student66'),
    (class_11_a_id, 'Nosirova Madinaxon Nodir Qizi', 'https://test-uz.ru/student67'),
    (class_11_a_id, 'Qo`chqorboyev Asadbek Alisherovich', 'https://test-uz.ru/student68'),
    (class_11_a_id, 'Ravshanova Nozima Raufovna', 'https://test-uz.ru/student69'),
    (class_11_a_id, 'Sobirova Samira Shavkatovna', 'https://test-uz.ru/student70'),
    (class_11_a_id, 'Ubaydullayev Asliddin Zabixilla O''g''li', 'https://test-uz.ru/student71'),
    (class_11_a_id, 'Xamidjonov Abdulaziz Xusniddin O''g''li', 'https://test-uz.ru/student72'),
    (class_11_a_id, 'Xasanov Ansoriddin Yorqin O''g''li', 'https://test-uz.ru/student73'),
    (class_11_a_id, 'Yaxyayeva Soliha Islomovna', 'https://test-uz.ru/student74'),
    (class_11_a_id, 'Yodgorxo''jayeva Muslimaxon Sherzodovna', 'https://test-uz.ru/student75'),
    (class_11_a_id, 'Yuldasheva Soliha G''afurjon Qizi', 'https://test-uz.ru/student76'),
    (class_11_a_id, 'Yusufjonova Omina Yunusjon Qizi', 'https://test-uz.ru/student77'),
    (class_11_a_id, 'Zabixullayeva Sohibjamol Dilshod Qizi', 'https://test-uz.ru/student78'),
    (class_11_a_id, 'Shuxratjonov Farruxjon Faxriddin O''g''li', 'https://test-uz.ru/student79')
  ON CONFLICT DO NOTHING;
END $$;

-- Добавление учеников класса 11-Б
DO $$
DECLARE
  class_11_b_id uuid;
BEGIN
  SELECT id INTO class_11_b_id FROM classes WHERE name = '11-Б';
  
  INSERT INTO students (class_id, name, redirect_url) VALUES
    (class_11_b_id, 'Abbosxonova Saida Abbosxonovna', 'https://test-uz.ru/student80'),
    (class_11_b_id, 'Abdukomilova Madinabonu Azizbek Qizi', 'https://test-uz.ru/student81'),
    (class_11_b_id, 'Abdullayev Ibrohim Ravshan O''g''li', 'https://test-uz.ru/student82'),
    (class_11_b_id, 'Abduqayumova Robiya Abdugafurovna', 'https://test-uz.ru/student83'),
    (class_11_b_id, 'Abdusattarova Xadicha Abdulla Qizi', 'https://test-uz.ru/student84'),
    (class_11_b_id, 'Abdusattorov Abduazim Abdurasul o`g`li', 'https://test-uz.ru/student85'),
    (class_11_b_id, 'Abdusattorov Azizbek Abdusalom O''g''li', 'https://test-uz.ru/student86'),
    (class_11_b_id, 'Abdusattorova Xilola Muzaffar Qizi', 'https://test-uz.ru/student87'),
    (class_11_b_id, 'Abduxakimov Anvar Alisherovich', 'https://test-uz.ru/student88'),
    (class_11_b_id, 'Abidov Umar Davranovich', 'https://test-uz.ru/student89'),
    (class_11_b_id, 'Adhamxonov Muhammad Said Qobilxonovich', 'https://test-uz.ru/student90'),
    (class_11_b_id, 'Asqarjonova Feruza Olimjon Qizi', 'https://test-uz.ru/student91'),
    (class_11_b_id, 'Axmedova Ziyodabonu Aimardon Qizi', 'https://test-uz.ru/student92'),
    (class_11_b_id, 'Davronov Ne''matilloxoji Qurbonali o''g''li', 'https://test-uz.ru/student93'),
    (class_11_b_id, 'Hikmatillaev Abdurahmon Dilmurod O''g''li', 'https://test-uz.ru/student94'),
    (class_11_b_id, 'Hikmatillaeva Muslima Dilshod Qizi', 'https://test-uz.ru/student95'),
    (class_11_b_id, 'Hojimurodov Ibrohim Ma''murjon O''g''li', 'https://test-uz.ru/student96'),
    (class_11_b_id, 'Ibragimov Muhammadali Nurali O''g''li', 'https://test-uz.ru/student97'),
    (class_11_b_id, 'Jo''rayev Abdulbois Bosit O''g''li', 'https://test-uz.ru/student98'),
    (class_11_b_id, 'Kamoliddinov Maqsudjon Murodulla O''g''li', 'https://test-uz.ru/student99'),
    (class_11_b_id, 'Kamolxo''jaeva Ominabonu Abbosxon Qizi', 'https://test-uz.ru/student100'),
    (class_11_b_id, 'Lutfullayeva Osiyoxon Saydullo Qizi', 'https://test-uz.ru/student101'),
    (class_11_b_id, 'Majidxojayev Ismoil Abdurasul O''g''li', 'https://test-uz.ru/student102'),
    (class_11_b_id, 'Muxamatkulova Rayxona G''ayratali Qizi', 'https://test-uz.ru/student103'),
    (class_11_b_id, 'Obidjonova Samiraxon Rustam Qizi', 'https://test-uz.ru/student104'),
    (class_11_b_id, 'Ochilova Dilnora To''ymurodovna', 'https://test-uz.ru/student105'),
    (class_11_b_id, 'Qobiljonov Mohirjon Rustamjon O''g''li', 'https://test-uz.ru/student106'),
    (class_11_b_id, 'Rustamov Baxtiyor Bahodir O''g''li', 'https://test-uz.ru/student107'),
    (class_11_b_id, 'Sultonmurodova Nargiza Behzod Qizi', 'https://test-uz.ru/student108'),
    (class_11_b_id, 'Tohirov Abdullo Muzaffar O''g''li', 'https://test-uz.ru/student109'),
    (class_11_b_id, 'Turabov Abdulla Abdusattor O''g''li', 'https://test-uz.ru/student110'),
    (class_11_b_id, 'Ubaydullayeva Odina Xurshid Qizi', 'https://test-uz.ru/student111'),
    (class_11_b_id, 'Usmanov Mustafo Azizovich', 'https://test-uz.ru/student112'),
    (class_11_b_id, 'Xusanov Biloliddin Nuriddin o''g''li', 'https://test-uz.ru/student113'),
    (class_11_b_id, 'Shukurov Umarjon M''amurjon O''g''li', 'https://test-uz.ru/student114'),
    (class_11_b_id, 'Shuxratov Shoxrux Sherzod O''g''li', 'https://test-uz.ru/student115'),
    (class_11_b_id, 'Choriyeva Gulsevar Nurmamad Qizi', 'https://test-uz.ru/student116')
  ON CONFLICT DO NOTHING;
END $$;

-- Добавление учеников класса 11-В
DO $$
DECLARE
  class_11_v_id uuid;
BEGIN
  SELECT id INTO class_11_v_id FROM classes WHERE name = '11-В';
  
  INSERT INTO students (class_id, name, redirect_url) VALUES
    (class_11_v_id, 'Abdullayeva Махбуба Mirzohid qizi', 'https://test-uz.ru/student117'),
    (class_11_v_id, 'Abduqodirova Madina Sherzod Qizi', 'https://test-uz.ru/student118'),
    (class_11_v_id, 'Abdurahimov Muhammadamir Doniyor O''g''li', 'https://test-uz.ru/student119'),
    (class_11_v_id, 'Akromov Ozodbek Zuhriddin O''g''li', 'https://test-uz.ru/student120'),
    (class_11_v_id, 'Azizov Abdulaziz Ulug''bek O''g''li', 'https://test-uz.ru/student121'),
    (class_11_v_id, 'Bakiyeva Madina Mardon Qizi', 'https://test-uz.ru/student122'),
    (class_11_v_id, 'Baxtiyorova Maftuna Dilmurodovna', 'https://test-uz.ru/student123'),
    (class_11_v_id, 'Boboqulova Marjona Jamshid qizi', 'https://test-uz.ru/student124'),
    (class_11_v_id, 'Husanov Sunnatilla Doniyor O''g''li', 'https://test-uz.ru/student125'),
    (class_11_v_id, 'Kamolova Hadicha Axral Qizi', 'https://test-uz.ru/student126'),
    (class_11_v_id, 'Mahkamov Nurmuhammad Shuhrat O''g''li', 'https://test-uz.ru/student127'),
    (class_11_v_id, 'Musurmonqulov Mirzohid Jalol O''g''li', 'https://test-uz.ru/student128'),
    (class_11_v_id, 'Nosirov Moniy Jamshid O''g''li', 'https://test-uz.ru/student129'),
    (class_11_v_id, 'Qayumov Azizjon Abdusattorovich', 'https://test-uz.ru/student130'),
    (class_11_v_id, 'Qudratxo''jaev A''zamxo''ja Shavkat O''g''li', 'https://test-uz.ru/student131'),
    (class_11_v_id, 'Raupova Robiyaxon Ravshan Qizi', 'https://test-uz.ru/student132'),
    (class_11_v_id, 'Raximov Abdulazizxo''ja Abduvalixoja O''gli', 'https://test-uz.ru/student133'),
    (class_11_v_id, 'Sobirjonov Muhammadyusuf Rasuljon O''g''li', 'https://test-uz.ru/student134'),
    (class_11_v_id, 'Sunnatov Nuriddin Asomiddinovich', 'https://test-uz.ru/student135'),
    (class_11_v_id, 'Ulug''bekova Umida Otabek Qizi', 'https://test-uz.ru/student136'),
    (class_11_v_id, 'Xujayorov Fayzulla Latif O''g''li', 'https://test-uz.ru/student137'),
    (class_11_v_id, 'Zohidov Jamshid Бахтиер Угли', 'https://test-uz.ru/student138'),
    (class_11_v_id, 'Sheralieva Omina Shohrux Qizi', 'https://test-uz.ru/student139'),
    (class_11_v_id, 'Shuhratov Muxammadali Doniyor O''g''li', 'https://test-uz.ru/student140')
  ON CONFLICT DO NOTHING;
END $$;

-- Добавление учеников класса 11-Д
DO $$
DECLARE
  class_11_d_id uuid;
BEGIN
  SELECT id INTO class_11_d_id FROM classes WHERE name = '11-Д';
  
  INSERT INTO students (class_id, name, redirect_url) VALUES
    (class_11_d_id, 'Maвлутдинов Убайдулла Мавлутдин ўғли', 'https://test-uz.ru/student141'),
    (class_11_d_id, 'Абдувохидова Захро Абдуганиевна', 'https://test-uz.ru/student142'),
    (class_11_d_id, 'Абдуллаев Аббос Эргашевич', 'https://test-uz.ru/student143'),
    (class_11_d_id, 'Абдуфаттохов Мухаммадризо Жахонгир Угли', 'https://test-uz.ru/student144'),
    (class_11_d_id, 'Адилова Камила Зокировна', 'https://test-uz.ru/student145'),
    (class_11_d_id, 'Акрамова Лазиза Азаматовна', 'https://test-uz.ru/student146'),
    (class_11_d_id, 'Альмухамедов Айдар Маратович', 'https://test-uz.ru/student147'),
    (class_11_d_id, 'Ахмадбекова Робия Козимбек Кизи', 'https://test-uz.ru/student148'),
    (class_11_d_id, 'Ахрорбеков Бобурбек Давронбек Угли', 'https://test-uz.ru/student149'),
    (class_11_d_id, 'Борисова Милана Павловна', 'https://test-uz.ru/student150'),
    (class_11_d_id, 'Джон Минджун Ходжинович', 'https://test-uz.ru/student151'),
    (class_11_d_id, 'Дустмуродов Фирдавс Сухробович', 'https://test-uz.ru/student152'),
    (class_11_d_id, 'Зариббоев Одилбек Улугбекович', 'https://test-uz.ru/student153'),
    (class_11_d_id, 'Исломов Ҳамза Баходирович', 'https://test-uz.ru/student154'),
    (class_11_d_id, 'Каримов Бехруз Алишер Угли', 'https://test-uz.ru/student155'),
    (class_11_d_id, 'Каримова Лейла Рустам Кизи', 'https://test-uz.ru/student156'),
    (class_11_d_id, 'Кудратиллаев Сардорхужа Умид Угли', 'https://test-uz.ru/student157'),
    (class_11_d_id, 'Кудратов Мухаммадали Фарход Угли', 'https://test-uz.ru/student158'),
    (class_11_d_id, 'Маликова Мунисахон Улугбек Кизи', 'https://test-uz.ru/student159'),
    (class_11_d_id, 'Мухаммадкулов Аслиддин Шерзодович', 'https://test-uz.ru/student160'),
    (class_11_d_id, 'Набихужаева Холидахон Акрамхужаевна', 'https://test-uz.ru/student161'),
    (class_11_d_id, 'Рахимжонов Мухаммадали Азиз Угли', 'https://test-uz.ru/student162'),
    (class_11_d_id, 'Рустамбекова Мунаввархон Камаладдиновна', 'https://test-uz.ru/student163'),
    (class_11_d_id, 'Садритдинова Самина Кодировна', 'https://test-uz.ru/student164'),
    (class_11_d_id, 'Солтанова Диана Руслановна', 'https://test-uz.ru/student165'),
    (class_11_d_id, 'Сувонов Озодбек Низомиддин Угли', 'https://test-uz.ru/student166'),
    (class_11_d_id, 'Сулейкина Яна Олеговна', 'https://test-uz.ru/student167'),
    (class_11_d_id, 'Тасимова Гулиза Шерзодовна', 'https://test-uz.ru/student168'),
    (class_11_d_id, 'Хамдамова Фарангиз Рустамжон Кизи', 'https://test-uz.ru/student169'),
    (class_11_d_id, 'Хашимов Руслан Дилшодович', 'https://test-uz.ru/student170'),
    (class_11_d_id, 'Элмонов Асадбек Юсупович', 'https://test-uz.ru/student171'),
    (class_11_d_id, 'Эшбоева Арофат Самандаровна', 'https://test-uz.ru/student172'),
    (class_11_d_id, 'Ярашев Асадбек Хамид Угли', 'https://test-uz.ru/student173')
  ON CONFLICT DO NOTHING;
END $$;

-- Пример выборки классов от 11 до 1
-- SELECT * FROM classes ORDER BY grade DESC, name ASC;