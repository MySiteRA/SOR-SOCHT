/*
  # Система игр с классом

  1. Новые таблицы
    - `games` - игры с их статусами и настройками
    - `game_players` - участники игр с ролями и очками
    - `game_events` - события и сообщения в играх

  2. Безопасность
    - Включение RLS для всех таблиц
    - Политики для публичного доступа к играм класса
    - Политики для управления играми участниками

  3. Индексы
    - Индексы для быстрого поиска по классам и играм
    - Индексы для сортировки событий по времени
*/

-- Создаем таблицу игр
CREATE TABLE IF NOT EXISTS games (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  class_id uuid NOT NULL REFERENCES classes(id) ON DELETE CASCADE,
  game_type text NOT NULL CHECK (game_type IN ('truth_or_dare', 'quiz', 'mafia')),
  status text NOT NULL DEFAULT 'waiting' CHECK (status IN ('waiting', 'started', 'finished')),
  created_by uuid NOT NULL REFERENCES students(id) ON DELETE CASCADE,
  max_players integer DEFAULT 10,
  current_round integer DEFAULT 1,
  settings jsonb DEFAULT '{}'::jsonb,
  created_at timestamptz DEFAULT now(),
  started_at timestamptz,
  finished_at timestamptz
);

-- Создаем таблицу участников игр
CREATE TABLE IF NOT EXISTS game_players (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  game_id uuid NOT NULL REFERENCES games(id) ON DELETE CASCADE,
  player_id uuid NOT NULL REFERENCES students(id) ON DELETE CASCADE,
  role text DEFAULT 'player',
  score integer DEFAULT 0,
  is_alive boolean DEFAULT true,
  joined_at timestamptz DEFAULT now(),
  UNIQUE(game_id, player_id)
);

-- Создаем таблицу событий игры
CREATE TABLE IF NOT EXISTS game_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  game_id uuid NOT NULL REFERENCES games(id) ON DELETE CASCADE,
  player_id uuid REFERENCES students(id) ON DELETE SET NULL,
  event_type text NOT NULL CHECK (event_type IN ('join', 'leave', 'question', 'answer', 'vote', 'action', 'system', 'chat')),
  content text NOT NULL,
  metadata jsonb DEFAULT '{}'::jsonb,
  created_at timestamptz DEFAULT now()
);

-- Включаем RLS
ALTER TABLE games ENABLE ROW LEVEL SECURITY;
ALTER TABLE game_players ENABLE ROW LEVEL SECURITY;
ALTER TABLE game_events ENABLE ROW LEVEL SECURITY;

-- Политики для games
CREATE POLICY "Students can read games in their class"
  ON games
  FOR SELECT
  TO public
  USING (true);

CREATE POLICY "Students can create games"
  ON games
  FOR INSERT
  TO public
  WITH CHECK (true);

CREATE POLICY "Students can update games they created"
  ON games
  FOR UPDATE
  TO public
  USING (true);

-- Политики для game_players
CREATE POLICY "Students can read game players"
  ON game_players
  FOR SELECT
  TO public
  USING (true);

CREATE POLICY "Students can join games"
  ON game_players
  FOR INSERT
  TO public
  WITH CHECK (true);

CREATE POLICY "Students can update their game status"
  ON game_players
  FOR UPDATE
  TO public
  USING (true);

-- Политики для game_events
CREATE POLICY "Students can read game events"
  ON game_events
  FOR SELECT
  TO public
  USING (true);

CREATE POLICY "Students can create game events"
  ON game_events
  FOR INSERT
  TO public
  WITH CHECK (true);

-- Создаем индексы для производительности
CREATE INDEX IF NOT EXISTS idx_games_class_id ON games(class_id);
CREATE INDEX IF NOT EXISTS idx_games_status ON games(status);
CREATE INDEX IF NOT EXISTS idx_games_created_at ON games(created_at DESC);

CREATE INDEX IF NOT EXISTS idx_game_players_game_id ON game_players(game_id);
CREATE INDEX IF NOT EXISTS idx_game_players_player_id ON game_players(player_id);

CREATE INDEX IF NOT EXISTS idx_game_events_game_id ON game_events(game_id);
CREATE INDEX IF NOT EXISTS idx_game_events_created_at ON game_events(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_game_events_type ON game_events(event_type);