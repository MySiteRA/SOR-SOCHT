import { supabase } from '../lib/supabase';
import { ref, push, onChildAdded, off, query, orderByChild, limitToLast, onValue, set, remove } from "firebase/database";
import { db } from "../firebase";

export interface Game {
  id: string;
  class_id: string;
  game_type: 'truth_or_dare' | 'quiz' | 'mafia';
  status: 'waiting' | 'started' | 'finished';
  created_by: string;
  max_players: number;
  current_round: number;
  settings: any;
  created_at: string;
  started_at?: string;
  finished_at?: string;
}

export interface GamePlayer {
  id: string;
  game_id: string;
  player_id: string;
  player_name: string;
  role: string;
  score: number;
  is_alive: boolean;
  joined_at: string;
}

export interface GameEvent {
  id: string;
  game_id: string;
  player_id?: string;
  player_name?: string;
  event_type: 'join' | 'leave' | 'question' | 'answer' | 'vote' | 'action' | 'system' | 'chat';
  content: string;
  metadata?: any;
  created_at: string;
}

// ==================== Управление играми ====================

export async function createGame(
  classId: string, 
  gameType: 'truth_or_dare' | 'quiz' | 'mafia',
  createdBy: string,
  maxPlayers: number = 10,
  settings: any = {}
): Promise<Game> {
  const { data, error } = await supabase
    .from('games')
    .insert({
      class_id: classId,
      game_type: gameType,
      created_by: createdBy,
      max_players: maxPlayers,
      settings
    })
    .select('*')
    .single();

  if (error) throw error;
  return data;
}

export async function getActiveGames(classId: string): Promise<Game[]> {
  const { data, error } = await supabase
    .from('games')
    .select('*')
    .eq('class_id', classId)
    .in('status', ['waiting', 'started'])
    .order('created_at', { ascending: false });

  if (error) throw error;
  return data || [];
}

export async function joinGame(gameId: string, playerId: string, playerName: string): Promise<void> {
  const { error } = await supabase
    .from('game_players')
    .insert({
      game_id: gameId,
      player_id: playerId,
      role: 'player'
    });

  if (error) throw error;

  // Добавляем событие присоединения
  await addGameEvent(gameId, playerId, 'join', `${playerName} присоединился к игре`, { player_name: playerName });
}

export async function startGame(gameId: string): Promise<void> {
  const { error } = await supabase
    .from('games')
    .update({
      status: 'started',
      started_at: new Date().toISOString()
    })
    .eq('id', gameId);

  if (error) throw error;

  // Добавляем системное событие
  await addGameEvent(gameId, null, 'system', 'Игра началась!');
}

export async function finishGame(gameId: string): Promise<void> {
  const { error } = await supabase
    .from('games')
    .update({
      status: 'finished',
      finished_at: new Date().toISOString()
    })
    .eq('id', gameId);

  if (error) throw error;

  // Добавляем системное событие
  await addGameEvent(gameId, null, 'system', 'Игра завершена!');
}

// ==================== Участники игр ====================

export async function getGamePlayers(gameId: string): Promise<GamePlayer[]> {
  const { data, error } = await supabase
    .from('game_players')
    .select(`
      *,
      student:students(name)
    `)
    .eq('game_id', gameId)
    .order('joined_at');

  if (error) throw error;
  
  return (data || []).map(player => ({
    ...player,
    player_name: Array.isArray(player.student) ? player.student[0]?.name : player.student?.name
  }));
}

export async function updatePlayerScore(gameId: string, playerId: string, score: number): Promise<void> {
  const { error } = await supabase
    .from('game_players')
    .update({ score })
    .eq('game_id', gameId)
    .eq('player_id', playerId);

  if (error) throw error;
}

export async function updatePlayerRole(gameId: string, playerId: string, role: string): Promise<void> {
  const { error } = await supabase
    .from('game_players')
    .update({ role })
    .eq('game_id', gameId)
    .eq('player_id', playerId);

  if (error) throw error;
}

export async function eliminatePlayer(gameId: string, playerId: string): Promise<void> {
  const { error } = await supabase
    .from('game_players')
    .update({ is_alive: false })
    .eq('game_id', gameId)
    .eq('player_id', playerId);

  if (error) throw error;
}

// ==================== События игр ====================

export async function addGameEvent(
  gameId: string,
  playerId: string | null,
  eventType: GameEvent['event_type'],
  content: string,
  metadata: any = {}
): Promise<void> {
  const { error } = await supabase
    .from('game_events')
    .insert({
      game_id: gameId,
      player_id: playerId,
      event_type: eventType,
      content,
      metadata
    });

  if (error) throw error;
}

export async function getGameEvents(gameId: string): Promise<GameEvent[]> {
  const { data, error } = await supabase
    .from('game_events')
    .select(`
      *,
      student:students(name)
    `)
    .eq('game_id', gameId)
    .order('created_at');

  if (error) throw error;
  
  return (data || []).map(event => ({
    ...event,
    player_name: Array.isArray(event.student) ? event.student[0]?.name : event.student?.name
  }));
}

// ==================== Подписки на обновления ====================

export function subscribeToGameUpdates(gameId: string, callback: (game: Game) => void) {
  const gameRef = ref(db, `game_updates/${gameId}`);
  
  const unsubscribe = onValue(gameRef, (snapshot) => {
    const game = snapshot.val();
    if (game) {
      callback(game);
    }
  });

  return () => off(gameRef);
}

export function subscribeToGamePlayers(gameId: string, callback: (players: GamePlayer[]) => void) {
  const playersRef = ref(db, `game_players/${gameId}`);
  
  const unsubscribe = onValue(playersRef, (snapshot) => {
    const playersData = snapshot.val();
    if (playersData) {
      const players = Object.keys(playersData).map(key => ({
        id: key,
        ...playersData[key]
      }));
      callback(players);
    }
  });

  return () => off(playersRef);
}

export function subscribeToGameEvents(gameId: string, callback: (event: GameEvent) => void) {
  const eventsRef = ref(db, `game_events/${gameId}`);
  const eventsQuery = query(eventsRef, orderByChild('created_at'), limitToLast(100));
  
  const unsubscribe = onChildAdded(eventsQuery, (snapshot) => {
    const event = snapshot.val();
    if (event) {
      callback({
        id: snapshot.key || '',
        ...event
      });
    }
  });

  return () => off(eventsQuery, 'child_added', unsubscribe);
}

// ==================== Обновления в реальном времени ====================

export async function updateGameInRealtime(gameId: string, updates: Partial<Game>): Promise<void> {
  const gameRef = ref(db, `game_updates/${gameId}`);
  await set(gameRef, {
    ...updates,
    updated_at: Date.now()
  });
}

export async function updatePlayersInRealtime(gameId: string, players: GamePlayer[]): Promise<void> {
  const playersRef = ref(db, `game_players/${gameId}`);
  const playersData: any = {};
  
  players.forEach(player => {
    playersData[player.id] = player;
  });
  
  await set(playersRef, playersData);
}

export async function addGameEventRealtime(
  gameId: string,
  playerId: string | null,
  playerName: string | null,
  eventType: GameEvent['event_type'],
  content: string,
  metadata: any = {}
): Promise<void> {
  const eventsRef = ref(db, `game_events/${gameId}`);
  await push(eventsRef, {
    player_id: playerId,
    player_name: playerName,
    event_type: eventType,
    content,
    metadata,
    created_at: Date.now()
  });
}

// ==================== Специфичные функции для игр ====================

// Правда или Действие
export async function createTruthOrDareQuestion(
  gameId: string,
  fromPlayerId: string,
  fromPlayerName: string,
  toPlayerId: string,
  toPlayerName: string,
  questionType: 'truth' | 'dare',
  question: string
): Promise<void> {
  await addGameEventRealtime(
    gameId,
    fromPlayerId,
    fromPlayerName,
    'question',
    question,
    {
      to_player_id: toPlayerId,
      to_player_name: toPlayerName,
      question_type: questionType
    }
  );
}

// Викторина
export async function submitQuizAnswer(
  gameId: string,
  playerId: string,
  playerName: string,
  questionId: string,
  answer: string,
  isCorrect: boolean
): Promise<void> {
  await addGameEventRealtime(
    gameId,
    playerId,
    playerName,
    'answer',
    answer,
    {
      question_id: questionId,
      is_correct: isCorrect
    }
  );

  if (isCorrect) {
    // Обновляем счет игрока
    const { data: player } = await supabase
      .from('game_players')
      .select('score')
      .eq('game_id', gameId)
      .eq('player_id', playerId)
      .single();

    if (player) {
      await updatePlayerScore(gameId, playerId, player.score + 1);
    }
  }
}

// Мафия
export async function submitMafiaVote(
  gameId: string,
  voterId: string,
  voterName: string,
  targetId: string,
  targetName: string,
  voteType: 'day' | 'night'
): Promise<void> {
  await addGameEventRealtime(
    gameId,
    voterId,
    voterName,
    'vote',
    `Голосует против ${targetName}`,
    {
      target_id: targetId,
      target_name: targetName,
      vote_type: voteType
    }
  );
}

export async function assignMafiaRoles(gameId: string, players: GamePlayer[]): Promise<void> {
  const shuffled = [...players].sort(() => Math.random() - 0.5);
  const mafiaCount = Math.max(1, Math.floor(players.length / 4));
  
  const roles = [
    ...Array(mafiaCount).fill('mafia'),
    'doctor',
    'detective',
    ...Array(players.length - mafiaCount - 2).fill('civilian')
  ];

  for (let i = 0; i < shuffled.length; i++) {
    const player = shuffled[i];
    const role = roles[i] || 'civilian';
    await updatePlayerRole(gameId, player.player_id, role);
  }

  await addGameEventRealtime(
    gameId,
    null,
    null,
    'system',
    'Роли распределены! Игра начинается...'
  );
}