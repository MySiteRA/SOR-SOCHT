import { ref, push, set, onValue, onChildAdded, off, remove, update, serverTimestamp } from "firebase/database";
import { db } from "../firebase";

export interface FirebaseGame {
  id?: string;
  classId: string;
  creatorId: string;
  gameType: 'truth_or_dare' | 'mafia' | 'quiz';
  maxPlayers: number;
  status: 'waiting' | 'active' | 'finished' | 'cancelled';
  createdAt: number;
  players?: { [userId: string]: FirebasePlayer };
  currentTurn?: {
    asker?: number;
    target?: number;
    choice?: 'truth' | 'dare' | null;
    question?: string | null;
    answer?: string | null;
  };
  moves?: { [moveId: string]: FirebaseMove };
  gameData?: any;
}

export interface FirebasePlayer {
  name: string;
  number: number;
  joinedAt: number;
  isAlive?: boolean;
  role?: string;
  score?: number;
}

export interface FirebaseMove {
  userId: string;
  userName: string;
  playerNumber: number;
  type: string;
  content: string;
  createdAt: number;
  metadata?: any;
}

// ==================== Создание и управление играми ====================

export function createGame(
  classId: string,
  creatorId: string,
  creatorName: string,
  gameType: 'truth_or_dare' | 'mafia' | 'quiz',
  maxPlayers: number = 6
): Promise<string> {
  return new Promise((resolve, reject) => {
    const gamesRef = ref(db, 'games');
    const newGameRef = push(gamesRef);
    
    const gameData: FirebaseGame = {
      classId,
      creatorId,
      gameType,
      maxPlayers,
      status: 'waiting',
      createdAt: Date.now(),
      players: {
        [creatorId]: {
          name: creatorName,
          number: 0, // Временный номер, будет назначен при старте
          joinedAt: Date.now(),
          isAlive: true,
          score: 0
        }
      }
    };

    set(newGameRef, gameData)
      .then(() => {
        const gameId = newGameRef.key!;
        resolve(gameId);
      })
      .catch(reject);
  });
}

export function joinGame(gameId: string, userId: string, userName: string): Promise<void> {
  return new Promise((resolve, reject) => {
    const playerRef = ref(db, `games/${gameId}/players/${userId}`);
    
    set(playerRef, {
      name: userName,
      number: 0, // Временный номер, будет назначен при старте
      joinedAt: Date.now(),
      isAlive: true,
      score: 0
    })
      .then(() => resolve())
      .catch(reject);
  });
}

export function leaveGame(gameId: string, userId: string): Promise<void> {
  return new Promise((resolve, reject) => {
    const playerRef = ref(db, `games/${gameId}/players/${userId}`);
    
    remove(playerRef)
      .then(() => resolve())
      .catch(reject);
  });
}

export function startGame(gameId: string): Promise<void> {
  return new Promise((resolve, reject) => {
    const gameRef = ref(db, `games/${gameId}`);
    
    // Сначала получаем текущих игроков
    onValue(gameRef, (snapshot) => {
      const game = snapshot.val();
      if (!game || !game.players) {
        reject(new Error('Игра или игроки не найдены'));
        return;
      }

      // Перемешиваем игроков и назначаем номера
      const playerIds = Object.keys(game.players);
      const shuffledIds = playerIds.sort(() => Math.random() - 0.5);
      
      const updates: { [key: string]: any } = {};
      
      // Назначаем номера игрокам
      shuffledIds.forEach((playerId, index) => {
        updates[`players/${playerId}/number`] = index + 1;
      });
      
      // Обновляем статус игры
      updates.status = 'active';
      updates.startedAt = Date.now();
      
      // Для "Правда или действие" устанавливаем первый ход
      if (game.gameType === 'truth_or_dare') {
        const randomAsker = Math.floor(Math.random() * shuffledIds.length) + 1;
        let randomTarget = Math.floor(Math.random() * shuffledIds.length) + 1;
        
        // Убеждаемся, что target не равен asker
        while (randomTarget === randomAsker && shuffledIds.length > 1) {
          randomTarget = Math.floor(Math.random() * shuffledIds.length) + 1;
        }
        
        updates.currentTurn = {
          asker: randomAsker,
          target: randomTarget,
          choice: null,
          question: null,
          answer: null
        };
      }

      update(gameRef, updates)
        .then(() => {
          // Добавляем системное сообщение о начале игры
          addGameMove(
            gameId, 
            'system', 
            'Система', 
            0,
            'system', 
            `Игра началась! Игрокам назначены случайные номера.`
          );
          resolve();
        })
        .catch(reject);
    }, { onlyOnce: true });
  });
}

export function cancelGame(gameId: string): Promise<void> {
  return new Promise((resolve, reject) => {
    const gameRef = ref(db, `games/${gameId}`);
    
    update(gameRef, {
      status: 'cancelled',
      cancelledAt: Date.now()
    })
      .then(() => {
        // Добавляем системное сообщение об отмене
        addGameMove(gameId, 'system', 'Система', 0, 'system', 'Игра отменена создателем');
        resolve();
      })
      .catch(reject);
  });
}

export function finishGame(gameId: string): Promise<void> {
  return new Promise((resolve, reject) => {
    const gameRef = ref(db, `games/${gameId}`);
    
    update(gameRef, {
      status: 'finished',
      finishedAt: Date.now()
    })
      .then(() => resolve())
      .catch(reject);
  });
}

// ==================== Ходы и действия ====================

export function addGameMove(
  gameId: string,
  userId: string,
  userName: string,
  playerNumber: number,
  type: string,
  content: string,
  metadata?: any
): Promise<string> {
  return new Promise((resolve, reject) => {
    const movesRef = ref(db, `games/${gameId}/moves`);
    const newMoveRef = push(movesRef);
    
    const moveData: FirebaseMove = {
      userId,
      userName,
      playerNumber,
      type,
      content,
      createdAt: Date.now(),
      metadata
    };

    set(newMoveRef, moveData)
      .then(() => {
        const moveId = newMoveRef.key!;
        resolve(moveId);
      })
      .catch(reject);
  });
}

// ==================== Правда или действие ====================

export function submitChoice(
  gameId: string,
  userId: string,
  userName: string,
  playerNumber: number,
  choice: 'truth' | 'dare'
): Promise<void> {
  return new Promise((resolve, reject) => {
    const updates: { [key: string]: any } = {};
    updates[`currentTurn/choice`] = choice;
    
    const gameRef = ref(db, `games/${gameId}`);
    update(gameRef, updates)
      .then(() => {
        // Добавляем ход в историю
        addGameMove(
          gameId,
          userId,
          userName,
          playerNumber,
          'choice',
          `Игрок ${playerNumber} выбрал ${choice === 'truth' ? 'Правду' : 'Действие'}`,
          { choice }
        );
        resolve();
      })
      .catch(reject);
  });
}

export function submitQuestion(
  gameId: string,
  userId: string,
  userName: string,
  playerNumber: number,
  question: string
): Promise<void> {
  return new Promise((resolve, reject) => {
    const updates: { [key: string]: any } = {};
    updates[`currentTurn/question`] = question;
    
    const gameRef = ref(db, `games/${gameId}`);
    update(gameRef, updates)
      .then(() => {
        // Добавляем ход в историю
        addGameMove(
          gameId,
          userId,
          userName,
          playerNumber,
          'question',
          `Игрок ${playerNumber} задал вопрос`,
          { question }
        );
        resolve();
      })
      .catch(reject);
  });
}

export function submitAnswer(
  gameId: string,
  userId: string,
  userName: string,
  playerNumber: number,
  answer: string
): Promise<void> {
  return new Promise((resolve, reject) => {
    const gameRef = ref(db, `games/${gameId}`);
    
    // Сначала получаем текущую игру для определения следующего хода
    onValue(gameRef, (snapshot) => {
      const game = snapshot.val();
      if (!game || !game.players) {
        reject(new Error('Игра не найдена'));
        return;
      }

      // Фильтрация номеров игроков - убираем игроков с номером 0
      const playerIds = Object.keys(game.players);
      const playerNumbers = playerIds
        .map(id => game.players[id].number)
        .filter(number => number > 0);
      
      // Выбираем случайного следующего игрока
      const randomAsker = playerNumbers[Math.floor(Math.random() * playerNumbers.length)];
      let randomTarget = playerNumbers[Math.floor(Math.random() * playerNumbers.length)];
      
      // Убеждаемся, что target не равен asker
      while (randomTarget === randomAsker && playerNumbers.length > 1) {
        randomTarget = playerNumbers[Math.floor(Math.random() * playerNumbers.length)];
      }

      // Правильный сброс хода - полная замена объекта currentTurn
      const newTurn = {
        asker: randomAsker,
        target: randomTarget,
        choice: null,
        question: null,
        answer: null
      };
      
      const updates: { [key: string]: any } = {};
      updates.currentTurn = newTurn;

      // Исправление промисов - правильная цепочка операций
      update(gameRef, updates)
        .then(() => {
          // Добавляем ход в историю с очищенным ответом
          return addGameMove(
            gameId,
            userId,
            userName,
            playerNumber,
            'answer',
            `Игрок ${playerNumber} ответил`,
            { answer: answer.trim() }
          );
        })
        .then(() => {
          resolve();
        })
        .catch(reject);
    }, { onlyOnce: true });
  });
}

// ==================== Мафия ====================

export function submitMafiaVote(
  gameId: string,
  userId: string,
  userName: string,
  playerNumber: number,
  targetNumber: number,
  voteType: 'day' | 'night',
  role?: string
): Promise<void> {
  return addGameMove(
    gameId,
    userId,
    userName,
    playerNumber,
    'vote',
    `Игрок ${playerNumber} голосует против Игрока ${targetNumber}`,
    { targetNumber, voteType, role }
  ).then(() => {});
}

export function assignMafiaRoles(gameId: string, playerIds: string[]): Promise<void> {
  return new Promise((resolve, reject) => {
    const shuffled = [...playerIds].sort(() => Math.random() - 0.5);
    const mafiaCount = Math.max(1, Math.floor(playerIds.length / 4));
    
    const roles = [
      ...Array(mafiaCount).fill('mafia'),
      'doctor',
      'detective',
      ...Array(playerIds.length - mafiaCount - 2).fill('civilian')
    ];

    const updates: { [key: string]: any } = {};
    
    shuffled.forEach((playerId, index) => {
      const role = roles[index] || 'civilian';
      updates[`games/${gameId}/players/${playerId}/role`] = role;
    });

    update(ref(db), updates)
      .then(() => {
        // Добавляем системное сообщение
        addGameMove(gameId, 'system', 'Система', 0, 'system', 'Роли распределены! Игра начинается...');
        resolve();
      })
      .catch(reject);
  });
}

// ==================== Викторина ====================

export function submitQuizAnswer(
  gameId: string,
  userId: string,
  userName: string,
  playerNumber: number,
  questionId: string,
  answer: string,
  isCorrect: boolean
): Promise<void> {
  return addGameMove(
    gameId,
    userId,
    userName,
    playerNumber,
    'answer',
    `Игрок ${playerNumber} ответил: ${answer}`,
    { questionId, answer, isCorrect }
  ).then(() => {
    // Если ответ правильный, увеличиваем счет
    if (isCorrect) {
      const playerRef = ref(db, `games/${gameId}/players/${userId}/score`);
      return new Promise<void>((resolve, reject) => {
        onValue(playerRef, (snapshot) => {
          const currentScore = snapshot.val() || 0;
          set(playerRef, currentScore + 1)
            .then(() => resolve())
            .catch(reject);
        }, { onlyOnce: true });
      });
    }
  });
}

// ==================== Подписки на обновления ====================

export function subscribeToGame(gameId: string, callback: (game: FirebaseGame | null) => void) {
  const gameRef = ref(db, `games/${gameId}`);
  
  const unsubscribe = onValue(gameRef, (snapshot) => {
    const game = snapshot.val();
    if (game) {
      callback({ ...game, id: gameId });
    } else {
      callback(null);
    }
  });

  return () => off(gameRef, 'value', unsubscribe);
}

export function subscribeToGamePlayers(gameId: string, callback: (players: { [userId: string]: FirebasePlayer }) => void) {
  const playersRef = ref(db, `games/${gameId}/players`);
  
  const unsubscribe = onValue(playersRef, (snapshot) => {
    const players = snapshot.val() || {};
    callback(players);
  });

  return () => off(playersRef, 'value', unsubscribe);
}

export function subscribeToGameMoves(gameId: string, callback: (move: FirebaseMove & { id: string }) => void) {
  const movesRef = ref(db, `games/${gameId}/moves`);
  
  const unsubscribe = onChildAdded(movesRef, (snapshot) => {
    const move = snapshot.val();
    if (move) {
      callback({
        ...move,
        id: snapshot.key!
      });
    }
  });

  return () => off(movesRef, 'child_added', unsubscribe);
}

export function subscribeToCurrentTurn(gameId: string, callback: (turn: any) => void) {
  const turnRef = ref(db, `games/${gameId}/currentTurn`);
  
  const unsubscribe = onValue(turnRef, (snapshot) => {
    const turn = snapshot.val();
    callback(turn);
  });

  return () => off(turnRef, 'value', unsubscribe);
}

export function subscribeToActiveGames(classId: string, callback: (games: FirebaseGame[]) => void) {
  const gamesRef = ref(db, 'games');
  
  const unsubscribe = onValue(gamesRef, (snapshot) => {
    const allGames = snapshot.val() || {};
    const activeGames: FirebaseGame[] = [];
    
    Object.keys(allGames).forEach(gameId => {
      const game = allGames[gameId];
      if (game.classId === classId && (game.status === 'waiting' || game.status === 'active')) {
        activeGames.push({ ...game, id: gameId });
      }
    });
    
    // Сортируем по времени создания (новые первыми)
    activeGames.sort((a, b) => (b.createdAt || 0) - (a.createdAt || 0));
    
    callback(activeGames);
  });

  return () => off(gamesRef, 'value', unsubscribe);
}

// ==================== Утилиты ====================

export function getGameTypeName(gameType: string): string {
  switch (gameType) {
    case 'truth_or_dare':
      return 'Правда или Действие';
    case 'mafia':
      return 'Мафия';
    case 'quiz':
      return 'Викторина';
    default:
      return gameType;
  }
}

export function getGameTypeIcon(gameType: string): string {
  switch (gameType) {
    case 'truth_or_dare':
      return '🎭';
    case 'mafia':
      return '🕵️';
    case 'quiz':
      return '🎲';
    default:
      return '🎮';
  }
}

export function getGameTypeColor(gameType: string): string {
  switch (gameType) {
    case 'truth_or_dare':
      return 'from-pink-500 to-rose-600';
    case 'mafia':
      return 'from-gray-700 to-gray-900';
    case 'quiz':
      return 'from-blue-500 to-indigo-600';
    default:
      return 'from-gray-500 to-gray-600';
  }
}

// Получение игрока по номеру
export function getPlayerByNumber(players: { [userId: string]: FirebasePlayer }, number: number): { userId: string; player: FirebasePlayer } | null {
  const entry = Object.entries(players).find(([_, player]) => player.number === number);
  return entry ? { userId: entry[0], player: entry[1] } : null;
}

// Получение номера игрока по ID
export function getPlayerNumber(players: { [userId: string]: FirebasePlayer }, userId: string): number {
  return players[userId]?.number || 0;
}