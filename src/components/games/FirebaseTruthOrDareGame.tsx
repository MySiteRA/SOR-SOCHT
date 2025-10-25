import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Users, MessageCircle, Target, Dice6, Send, Clock, Crown, Zap, Heart, Timer, Sparkles, LogOut } from 'lucide-react';
import { 
  subscribeToGameMoves,
  subscribeToCurrentTurn,
  addGameMove,
  submitChoice,
  submitQuestion,
  submitAnswer,
  getPlayerByNumber,
  getPlayerNumber,
  leaveGame,
  type FirebaseGame,
  type FirebasePlayer,
  type FirebaseMove
} from '../../services/firebaseGameService';
import Confetti from '../effects/Confetti';
import TypewriterText from '../effects/TypewriterText';
import SwipeCards from '../effects/SwipeCards';
import type { Student } from '../../lib/supabase';

interface FirebaseTruthOrDareGameProps {
  game: FirebaseGame;
  players: { [userId: string]: FirebasePlayer };
  currentPlayer: Student;
  gameId: string;
  onError: (error: string) => void;
}

interface RecentParticipants {
  askers: number[];
  targets: number[];
}

const playerColors = [
  'from-pink-500 to-rose-600',
  'from-blue-500 to-indigo-600', 
  'from-green-500 to-emerald-600',
  'from-purple-500 to-violet-600',
  'from-orange-500 to-amber-600',
  'from-teal-500 to-cyan-600',
  'from-red-500 to-pink-600',
  'from-indigo-500 to-purple-600'
];

const emojis = ['❤️', '😂', '🎭', '✨', '🎉', '💫', '🌟', '🎪'];

export default function FirebaseTruthOrDareGame({ 
  game, 
  players, 
  currentPlayer, 
  gameId, 
  onError 
}: FirebaseTruthOrDareGameProps) {
  const [moves, setMoves] = useState<(FirebaseMove & { id: string })[]>([]);
  const [currentTurn, setCurrentTurn] = useState<any>(null);
  const [question, setQuestion] = useState('');
  const [answer, setAnswer] = useState('');
  const [recentParticipants, setRecentParticipants] = useState<RecentParticipants>({
    askers: [],
    targets: []
  });
  const [showConfetti, setShowConfetti] = useState(false);
  const [showChoiceCards, setShowChoiceCards] = useState(false);
  const [showQuestionModal, setShowQuestionModal] = useState(false);
  const [showAnswerModal, setShowAnswerModal] = useState(false);
  const [timeLeft, setTimeLeft] = useState(0);
  const [isDarkMode, setIsDarkMode] = useState(false);
  const [floatingEmojis, setFloatingEmojis] = useState<Array<{id: string, emoji: string, x: number, y: number}>>([]);
  const [leavingGame, setLeavingGame] = useState(false);
  const [lastUpdateTime, setLastUpdateTime] = useState(0);

  const currentPlayerNumber = getPlayerNumber(players, currentPlayer.id);
  const showPlayerNames = game.settings?.anonymity === false;
  
  // Оптимизация: мемоизация массива игроков с проверкой изменений
  const playersArray = React.useMemo(() => {
    return Object.entries(players).map(([userId, player]) => ({
    userId,
    ...player
    })).sort((a, b) => a.number - b.number);
  }, [Object.keys(players).length, Object.values(players).map(p => p.number).join(',')]);

  // Оптимизация: дебаунс обновлений для лучшего FPS
  const throttledMoves = React.useMemo(() => {
    const now = Date.now();
    if (now - lastUpdateTime > 100) { // Обновляем максимум раз в 100мс
      setLastUpdateTime(now);
      return moves;
    }
    return moves;
  }, [moves.length]);

  // Умный выбор следующего игрока
  const getNextPlayer = (availablePlayers: any[], currentPlayerId: string, recentList: number[], playerType: 'asker' | 'target') => {
    if (availablePlayers.length <= 2) {
      // Если игроков мало, можем повторять
      return availablePlayers[Math.floor(Math.random() * availablePlayers.length)];
    }

    let candidate;
    let attempts = 0;
    const maxAttempts = 10;

    do {
      candidate = availablePlayers[Math.floor(Math.random() * availablePlayers.length)];
      attempts++;
    } while (
      (candidate.userId === currentPlayerId || recentList.includes(candidate.number)) 
      && attempts < maxAttempts
    );

    return candidate;
  };

  // Анимированные эмодзи
  const spawnFloatingEmoji = () => {
    const emoji = emojis[Math.floor(Math.random() * emojis.length)];
    const newEmoji = {
      id: Date.now().toString(),
      emoji,
      x: Math.random() * 100,
      y: Math.random() * 100
    };
    
    setFloatingEmojis(prev => [...prev, newEmoji]);
    
    setTimeout(() => {
      setFloatingEmojis(prev => prev.filter(e => e.id !== newEmoji.id));
    }, 3000);
  };

  useEffect(() => {
    // Подписываемся на ходы игры
    const unsubscribeMoves = subscribeToGameMoves(gameId, (move) => {
      // Оптимизация: проверяем дубликаты перед добавлением
      setMoves(prev => {
        if (prev.some(m => m.id === move.id)) return prev;
        const newMoves = [...prev, move];
        // Ограничиваем количество ходов для лучшей производительности
        return newMoves.slice(-50);
      });
      
      // Обновляем историю участников для умного рандомайзера
      if (move.type === 'answer') {
        setRecentParticipants(prev => {
          const maxRecentCount = Math.max(2, Math.floor(Object.keys(players).length / 2));
          
          return {
            askers: [move.playerNumber, ...prev.askers].slice(0, maxRecentCount),
            targets: [move.playerNumber, ...prev.targets].slice(0, maxRecentCount)
          };
        });
        
        // Показываем конфетти после ответа (оптимизировано)
        setShowConfetti(true);
        spawnFloatingEmoji();
        setTimeout(() => setShowConfetti(false), 3000);
      }
      
      if (move.type === 'choice') {
        spawnFloatingEmoji();
      }
    });

    // Подписываемся на текущий ход
    const unsubscribeTurn = subscribeToCurrentTurn(gameId, (turn) => {
      setCurrentTurn(turn);
      
      if (turn) {
        // Устанавливаем таймер для каждого этапа
        if (!turn.choice) {
          setTimeLeft(15); // 15 секунд на выбор
        } else if (!turn.question) {
          setTimeLeft(30); // 30 секунд на вопрос
        } else if (!turn.answer) {
          setTimeLeft(60); // 60 секунд на ответ
        }
      }
    });

    return () => {
      unsubscribeMoves();
      unsubscribeTurn();
    };
  }, [gameId, players]);

  // Таймер обратного отсчета
  useEffect(() => {
    if (timeLeft > 0) {
      const timer = setTimeout(() => setTimeLeft(timeLeft - 1), 1000);
      return () => clearTimeout(timer);
    }
  }, [timeLeft]);

  // Проверяем состояния игры
  const isMyTurnToChoose = currentTurn?.target === currentPlayerNumber && !currentTurn?.choice;
  const isMyTurnToAsk = currentTurn?.asker === currentPlayerNumber && currentTurn?.choice && !currentTurn?.question;
  const isMyTurnToAnswer = currentTurn?.target === currentPlayerNumber && currentTurn?.question && !currentTurn?.answer;

  useEffect(() => {
    setShowChoiceCards(isMyTurnToChoose);
    setShowQuestionModal(isMyTurnToAsk);
    setShowAnswerModal(isMyTurnToAnswer);
  }, [isMyTurnToChoose, isMyTurnToAsk, isMyTurnToAnswer]);

  const handleChoice = async (choice: 'truth' | 'dare') => {
    try {
      await submitChoice(gameId, currentPlayer.id, currentPlayer.name, currentPlayerNumber, choice);
      setShowChoiceCards(false);
      spawnFloatingEmoji();
    } catch (err) {
      onError('Ошибка отправки выбора');
    }
  };

  const handleQuestionSubmit = async () => {
    if (!question.trim()) return;

    try {
      await submitQuestion(gameId, currentPlayer.id, currentPlayer.name, currentPlayerNumber, question);
      setQuestion('');
      setShowQuestionModal(false);
    } catch (err) {
      onError('Ошибка отправки вопроса');
    }
  };

  const handleAnswerSubmit = async () => {
    const cleanAnswer = answer.trim();
    if (!cleanAnswer) return;

    try {
      await submitAnswer(gameId, currentPlayer.id, currentPlayer.name, currentPlayerNumber, cleanAnswer);
      setAnswer('');
      setShowAnswerModal(false);
    } catch (err) {
      onError('Ошибка отправки ответа');
    }
  };

  const handleLeaveGame = async () => {
    if (!confirm('Вы уверены, что хотите покинуть игру?')) {
      return;
    }

    try {
      setLeavingGame(true);
      await leaveGame(gameId, currentPlayer.id);
      // Перенаправляем на страницу игр
      window.history.back();
    } catch (err) {
      onError('Ошибка выхода из игры');
    } finally {
      setLeavingGame(false);
    }
  };

  const getPlayerDisplayName = (playerNumber: number) => {
    if (showPlayerNames) {
      const playerData = getPlayerByNumber(players, playerNumber);
      return playerData ? playerData.player.name : `Игрок ${playerNumber}`;
    }
    return `Игрок ${playerNumber}`;
  };

  const getPlayerColor = (playerNumber: number) => {
    return playerColors[(playerNumber - 1) % playerColors.length];
  };

  return (
    <div className={`min-h-screen transition-all duration-1000 ${
      isDarkMode 
        ? 'bg-gradient-to-br from-gray-900 via-purple-900 to-black' 
        : 'bg-gradient-to-br from-blue-50 via-purple-50 to-pink-50'
    }`}>
      {/* Floating Emojis */}
      <AnimatePresence>
        {floatingEmojis.map(emoji => (
          <motion.div
            key={emoji.id}
            initial={{ opacity: 0, scale: 0, x: `${emoji.x}vw`, y: `${emoji.y}vh` }}
            animate={{ 
              opacity: [0, 1, 1, 0], 
              scale: [0, 1.5, 1, 0],
              y: `${emoji.y - 20}vh`,
              rotate: [0, 360]
            }}
            exit={{ opacity: 0, scale: 0 }}
            transition={{ duration: 3, ease: "easeOut" }}
            className="fixed pointer-events-none z-10 text-4xl"
          >
            {emoji.emoji}
          </motion.div>
        ))}
      </AnimatePresence>

      {/* Confetti Effect */}
      {showConfetti && <Confetti />}

      {/* Top Right Button Group */}
      <div className="fixed top-2 right-2 sm:top-4 sm:right-4 z-50 flex items-center gap-1 sm:gap-2">
        {/* Dark Mode Toggle */}
        <button
          onClick={() => setIsDarkMode(!isDarkMode)}
          className={`p-2 sm:p-3 rounded-full transition-all duration-300 ${
            isDarkMode
              ? 'bg-yellow-400 text-gray-900 shadow-yellow-400/50'
              : 'bg-gray-800 text-yellow-400 shadow-gray-800/50'
          } shadow-lg hover:scale-110 text-sm sm:text-base`}
        >
          {isDarkMode ? '☀️' : '🌙'}
        </button>

        {/* Leave Game Button - Mobile: Icon only, Desktop: Icon + Text */}
        <motion.button
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.95 }}
          onClick={handleLeaveGame}
          disabled={leavingGame}
          className="flex items-center gap-1 sm:gap-2 bg-red-600 text-white px-2 py-2 sm:px-4 sm:py-2 rounded-lg sm:rounded-xl hover:bg-red-700 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-300 shadow-lg"
        >
          {leavingGame ? (
            <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
          ) : (
            <LogOut className="w-4 h-4" />
          )}
          <span className="hidden sm:inline text-sm font-medium">
            {leavingGame ? 'Выход...' : 'Покинуть'}
          </span>
        </motion.button>
      </div>

      {/* HUD - Game Status */}
      <motion.div
        initial={{ y: -100, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        className={`fixed top-0 left-0 right-0 z-40 p-3 sm:p-4 ${
          isDarkMode
            ? 'bg-black/20 backdrop-blur-md border-b border-purple-500/30'
            : 'bg-white/20 backdrop-blur-md border-b border-indigo-200/50'
        }`}
      >
        <div className="container mx-auto">
          {/* Mobile Layout - Stack vertically */}
          <div className="flex md:hidden flex-col gap-2">
            <div className="flex items-center justify-between gap-2">
              {/* Round Counter */}
              <div className={`flex items-center space-x-1 px-3 py-1.5 rounded-full text-xs ${
                isDarkMode
                  ? 'bg-purple-500/20 border border-purple-400/30'
                  : 'bg-indigo-100/80 border border-indigo-200'
              }`}>
                <Target className="w-3 h-3 text-indigo-600" />
                <span className={`font-bold ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>
                  Р{Math.floor(moves.length / 3) + 1}
                </span>
              </div>

              {/* Current Player */}
              <div className={`flex items-center space-x-1 px-3 py-1.5 rounded-full text-xs ${
                isDarkMode
                  ? 'bg-pink-500/20 border border-pink-400/30'
                  : 'bg-pink-100/80 border border-pink-200'
              }`}>
                <div className={`w-5 h-5 rounded-full bg-gradient-to-r ${getPlayerColor(currentPlayerNumber)} flex items-center justify-center text-white font-bold text-xs`}>
                  {currentPlayerNumber}
                </div>
                <span className={`font-bold ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>
                  Вы
                </span>
              </div>

              {/* Timer */}
              {timeLeft > 0 && (
                <motion.div
                  initial={{ scale: 0 }}
                  animate={{ scale: 1 }}
                  className={`flex items-center space-x-1 px-3 py-1.5 rounded-full text-xs ${
                    timeLeft <= 5
                      ? isDarkMode
                        ? 'bg-red-500/30 border border-red-400/50'
                        : 'bg-red-100 border border-red-300'
                      : isDarkMode
                        ? 'bg-orange-500/20 border border-orange-400/30'
                        : 'bg-orange-100 border border-orange-200'
                  }`}
                >
                  <Timer className={`w-3 h-3 ${timeLeft <= 5 ? 'text-red-500' : 'text-orange-500'}`} />
                  <span className={`font-bold font-mono ${
                    timeLeft <= 5
                      ? 'text-red-600 animate-pulse'
                      : isDarkMode ? 'text-orange-300' : 'text-orange-600'
                  }`}>
                    {timeLeft}с
                  </span>
                </motion.div>
              )}

              {/* Players Count */}
              <div className={`flex items-center space-x-1 px-3 py-1.5 rounded-full text-xs ${
                isDarkMode
                  ? 'bg-green-500/20 border border-green-400/30'
                  : 'bg-green-100/80 border border-green-200'
              }`}>
                <Users className="w-3 h-3 text-green-600" />
                <span className={`font-bold ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>
                  {Object.keys(players).length}
                </span>
              </div>
            </div>
          </div>

          {/* Desktop Layout - Original horizontal */}
          <div className="hidden md:flex items-center justify-between">
            <div className="flex items-center space-x-6">
              {/* Round Counter */}
              <div className={`flex items-center space-x-2 px-4 py-2 rounded-full ${
                isDarkMode
                  ? 'bg-purple-500/20 border border-purple-400/30'
                  : 'bg-indigo-100/80 border border-indigo-200'
              }`}>
                <Target className="w-4 h-4 text-indigo-600" />
                <span className={`font-bold ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>
                  Раунд {Math.floor(moves.length / 3) + 1}
                </span>
              </div>

              {/* Current Player */}
              <div className={`flex items-center space-x-2 px-4 py-2 rounded-full ${
                isDarkMode
                  ? 'bg-pink-500/20 border border-pink-400/30'
                  : 'bg-pink-100/80 border border-pink-200'
              }`}>
                <div className={`w-6 h-6 rounded-full bg-gradient-to-r ${getPlayerColor(currentPlayerNumber)} flex items-center justify-center text-white font-bold text-xs`}>
                  {currentPlayerNumber}
                </div>
                <span className={`font-bold ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>
                  Вы: Игрок {currentPlayerNumber}
                </span>
              </div>
            </div>

            {/* Timer */}
            {timeLeft > 0 && (
              <motion.div
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                className={`flex items-center space-x-2 px-4 py-2 rounded-full ${
                  timeLeft <= 5
                    ? isDarkMode
                      ? 'bg-red-500/30 border border-red-400/50'
                      : 'bg-red-100 border border-red-300'
                    : isDarkMode
                      ? 'bg-orange-500/20 border border-orange-400/30'
                      : 'bg-orange-100 border border-orange-200'
                }`}
              >
                <Timer className={`w-4 h-4 ${timeLeft <= 5 ? 'text-red-500' : 'text-orange-500'}`} />
                <span className={`font-bold font-mono ${
                  timeLeft <= 5
                    ? 'text-red-600 animate-pulse'
                    : isDarkMode ? 'text-orange-300' : 'text-orange-600'
                }`}>
                  {timeLeft}с
                </span>
              </motion.div>
            )}

            {/* Players Count */}
            <div className={`flex items-center space-x-2 px-4 py-2 rounded-full ${
              isDarkMode
                ? 'bg-green-500/20 border border-green-400/30'
                : 'bg-green-100/80 border border-green-200'
            }`}>
              <Users className="w-4 h-4 text-green-600" />
              <span className={`font-bold ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>
                {Object.keys(players).length}
              </span>
            </div>
          </div>
        </div>
      </motion.div>

      <div className="container mx-auto px-4 pt-24 pb-8">
        {/* Main Game Area */}
        <div className="space-y-8">
          {/* Current Turn Status */}
          {currentTurn && (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className={`rounded-2xl p-8 border backdrop-blur-md ${
                isDarkMode 
                  ? 'bg-gray-800/40 border-purple-500/30 shadow-2xl shadow-purple-500/20' 
                  : 'bg-white/60 border-indigo-200/50 shadow-2xl shadow-indigo-500/10'
              }`}
            >
              <div className="text-center">
                <motion.div
                  animate={{ rotate: [0, 5, -5, 0] }}
                  transition={{ duration: 2, repeat: Infinity }}
                  className="text-6xl mb-4"
                >
                  🎭
                </motion.div>
                
                <h4 className={`text-2xl font-bold mb-4 ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>
                  {!currentTurn.choice && (
                    <TypewriterText 
                      text={`${getPlayerDisplayName(currentTurn.asker)} спрашивает ${getPlayerDisplayName(currentTurn.target)}: Правда или Действие?`}
                      speed={50}
                    />
                  )}
                  {currentTurn.choice && !currentTurn.question && (
                    <TypewriterText 
                      text={`${getPlayerDisplayName(currentTurn.asker)} задаёт ${currentTurn.choice === 'truth' ? 'вопрос' : 'задание'} для ${getPlayerDisplayName(currentTurn.target)}`}
                      speed={50}
                    />
                  )}
                  {currentTurn.question && !currentTurn.answer && (
                    <TypewriterText 
                      text={`${getPlayerDisplayName(currentTurn.target)} отвечает на ${currentTurn.choice === 'truth' ? 'вопрос' : 'задание'}`}
                      speed={50}
                    />
                  )}
                </h4>
                
                {currentTurn.question && (
                  <motion.div
                    initial={{ opacity: 0, scale: 0.9 }}
                    animate={{ opacity: 1, scale: 1 }}
                    className={`p-6 rounded-xl border-2 mt-6 ${
                      currentTurn.choice === 'truth'
                        ? isDarkMode 
                          ? 'bg-blue-500/20 border-blue-400/50' 
                          : 'bg-blue-50 border-blue-300'
                        : isDarkMode 
                          ? 'bg-orange-500/20 border-orange-400/50' 
                          : 'bg-orange-50 border-orange-300'
                    }`}
                  >
                    <div className="text-4xl mb-3">
                      {currentTurn.choice === 'truth' ? '🤔' : '⚡'}
                    </div>
                    <TypewriterText 
                      text={currentTurn.question}
                      speed={30}
                      className={`text-lg font-medium ${isDarkMode ? 'text-white' : 'text-gray-800'}`}
                    />
                  </motion.div>
                )}
              </div>
            </motion.div>
          )}

          {/* Choice Cards (Swipe Interface) */}
          <AnimatePresence>
            {showChoiceCards && (
              <motion.div
                initial={{ opacity: 0, scale: 0.8 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.8 }}
                className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4"
              >
                <SwipeCards
                  onSwipeLeft={() => handleChoice('truth')}
                  onSwipeRight={() => handleChoice('dare')}
                  onTapLeft={() => handleChoice('truth')}
                  onTapRight={() => handleChoice('dare')}
                  isDarkMode={isDarkMode}
                />
              </motion.div>
            )}
          </AnimatePresence>

          {/* Question Modal */}
          <AnimatePresence>
            {showQuestionModal && (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4"
              >
                <motion.div
                  initial={{ opacity: 0, scale: 0.9, y: 20 }}
                  animate={{ opacity: 1, scale: 1, y: 0 }}
                  exit={{ opacity: 0, scale: 0.9, y: 20 }}
                  className={`rounded-2xl p-8 max-w-md w-full border ${
                    isDarkMode 
                      ? 'bg-gray-800/90 border-purple-500/30' 
                      : 'bg-white/90 border-indigo-200/50'
                  }`}
                >
                  <div className="text-center mb-6">
                    <div className="text-6xl mb-4">
                      {currentTurn?.choice === 'truth' ? '🤔' : '⚡'}
                    </div>
                    <h3 className={`text-xl font-bold ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>
                      Задайте {currentTurn?.choice === 'truth' ? 'вопрос' : 'задание'}
                    </h3>
                    <p className={`text-sm ${isDarkMode ? 'text-gray-300' : 'text-gray-600'}`}>
                      для {getPlayerDisplayName(currentTurn?.target)}
                    </p>
                  </div>
                  
                  <div className="space-y-4">
                    <textarea
                      value={question}
                      onChange={(e) => setQuestion(e.target.value)}
                      placeholder={currentTurn?.choice === 'truth' 
                        ? 'Например: Какой твой самый большой страх?' 
                        : 'Например: Спой песню в течение 30 секунд'
                      }
                      className={`w-full px-4 py-3 rounded-xl resize-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-all ${
                        isDarkMode 
                          ? 'bg-gray-700/50 border border-gray-600 text-white placeholder-gray-400' 
                          : 'bg-white/80 border border-gray-300 text-gray-900'
                      }`}
                      rows={4}
                      autoFocus
                    />
                    
                    <div className="flex space-x-3">
                      <motion.button
                        whileHover={{ scale: 1.02 }}
                        whileTap={{ scale: 0.98 }}
                        onClick={handleQuestionSubmit}
                        disabled={!question.trim()}
                        className={`flex-1 py-3 px-6 rounded-xl font-medium transition-all duration-300 ${
                          currentTurn?.choice === 'truth'
                            ? 'bg-gradient-to-r from-blue-500 to-indigo-600 hover:from-blue-600 hover:to-indigo-700 text-white shadow-lg shadow-blue-500/30'
                            : 'bg-gradient-to-r from-orange-500 to-red-600 hover:from-orange-600 hover:to-red-700 text-white shadow-lg shadow-orange-500/30'
                        } disabled:opacity-50 disabled:cursor-not-allowed`}
                      >
                        <div className="flex items-center justify-center space-x-2">
                          <Send className="w-4 h-4" />
                          <span>Отправить</span>
                        </div>
                      </motion.button>
                    </div>
                  </div>
                </motion.div>
              </motion.div>
            )}
          </AnimatePresence>

          {/* Answer Modal */}
          <AnimatePresence>
            {showAnswerModal && (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4"
              >
                <motion.div
                  initial={{ opacity: 0, scale: 0.9, y: 20 }}
                  animate={{ opacity: 1, scale: 1, y: 0 }}
                  exit={{ opacity: 0, scale: 0.9, y: 20 }}
                  className={`rounded-2xl p-8 max-w-md w-full border ${
                    isDarkMode 
                      ? 'bg-gray-800/90 border-purple-500/30' 
                      : 'bg-white/90 border-indigo-200/50'
                  }`}
                >
                  <div className="text-center mb-6">
                    <div className="text-6xl mb-4">💭</div>
                    <h3 className={`text-xl font-bold ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>
                      Ваш ответ
                    </h3>
                    <p className={`text-sm ${isDarkMode ? 'text-gray-300' : 'text-gray-600'}`}>
                      на {currentTurn?.choice === 'truth' ? 'вопрос' : 'задание'}
                    </p>
                    
                    {/* Показываем вопрос/задание */}
                    {currentTurn?.question && (
                      <motion.div
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        className={`mt-4 p-4 rounded-xl border ${
                          currentTurn.choice === 'truth'
                            ? isDarkMode 
                              ? 'bg-blue-500/20 border-blue-400/50' 
                              : 'bg-blue-50 border-blue-300'
                            : isDarkMode 
                              ? 'bg-orange-500/20 border-orange-400/50' 
                              : 'bg-orange-50 border-orange-300'
                        }`}
                      >
                        <div className="text-2xl mb-2">
                          {currentTurn.choice === 'truth' ? '🤔' : '⚡'}
                        </div>
                        <p className={`text-sm font-medium ${isDarkMode ? 'text-white' : 'text-gray-800'}`}>
                          {currentTurn.question}
                        </p>
                      </motion.div>
                    )}
                  </div>
                  
                  <div className="space-y-4">
                    <textarea
                      value={answer}
                      onChange={(e) => setAnswer(e.target.value)}
                      placeholder={currentTurn?.choice === 'truth' 
                        ? 'Ваш честный ответ...' 
                        : 'Опишите, как выполнили задание...'
                      }
                      className={`w-full px-4 py-3 rounded-xl resize-none focus:ring-2 focus:ring-purple-500 focus:border-transparent transition-all ${
                        isDarkMode 
                          ? 'bg-gray-700/50 border border-gray-600 text-white placeholder-gray-400' 
                          : 'bg-white/80 border border-gray-300 text-gray-900'
                      }`}
                      rows={4}
                      autoFocus
                    />
                    
                    <div className="flex space-x-3">
                      <motion.button
                        whileHover={{ scale: 1.02 }}
                        whileTap={{ scale: 0.98 }}
                        onClick={handleAnswerSubmit}
                        disabled={!answer.trim()}
                        className="flex-1 bg-gradient-to-r from-purple-500 to-pink-600 hover:from-purple-600 hover:to-pink-700 text-white py-3 px-6 rounded-xl font-medium transition-all duration-300 shadow-lg shadow-purple-500/30 disabled:opacity-50 disabled:cursor-not-allowed"
                      >
                        <div className="flex items-center justify-center space-x-2">
                          <Send className="w-4 h-4" />
                          <span>Отправить</span>
                        </div>
                      </motion.button>
                    </div>
                  </div>
                </motion.div>
              </motion.div>
            )}
          </AnimatePresence>

          {/* Players Grid */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className={`rounded-2xl p-6 border backdrop-blur-md ${
              isDarkMode 
                ? 'bg-gray-800/40 border-purple-500/30' 
                : 'bg-white/60 border-indigo-200/50'
            }`}
          >
            <h3 className={`text-xl font-bold mb-6 flex items-center space-x-3 ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>
              <Users className="w-6 h-6 text-indigo-600" />
              <span>Игроки</span>
              <Sparkles className="w-5 h-5 text-yellow-500" />
            </h3>
            
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
              {playersArray.map((player, index) => {
                const isCurrentPlayer = player.userId === currentPlayer.id;
                const isAsker = currentTurn?.asker === player.number;
                const isTarget = currentTurn?.target === player.number;
                const playerColor = getPlayerColor(player.number);
                
                return (
                  <motion.div
                    key={player.userId}
                    initial={false}
                    animate={{ opacity: 1 }}
                    whileHover={{ scale: 1.01 }}
                    className={`p-4 rounded-xl border-2 transition-all duration-300 text-center relative overflow-hidden ${
                      isCurrentPlayer
                        ? isDarkMode 
                          ? 'border-indigo-400 bg-indigo-500/20 shadow-lg shadow-indigo-500/30' 
                          : 'border-indigo-500 bg-indigo-50 shadow-lg shadow-indigo-500/20'
                        : isAsker
                          ? isDarkMode 
                            ? 'border-green-400 bg-green-500/20 shadow-lg shadow-green-500/30' 
                            : 'border-green-500 bg-green-50 shadow-lg shadow-green-500/20'
                          : isTarget
                            ? isDarkMode 
                              ? 'border-orange-400 bg-orange-500/20 shadow-lg shadow-orange-500/30' 
                              : 'border-orange-500 bg-orange-50 shadow-lg shadow-orange-500/20'
                            : isDarkMode 
                              ? 'border-gray-600 bg-gray-700/30' 
                              : 'border-gray-200 bg-white/50'
                    }`}
                  >
                    {/* Glow Effect */}
                    {(isAsker || isTarget || isCurrentPlayer) && (
                      <div className={`absolute inset-0 rounded-xl opacity-10 ${
                        isCurrentPlayer 
                          ? 'bg-gradient-to-r from-indigo-500 to-purple-600' 
                          : isAsker 
                            ? 'bg-gradient-to-r from-green-500 to-emerald-600'
                            : 'bg-gradient-to-r from-orange-500 to-red-600'
                      }`} />
                    )}
                    
                    <div className="relative z-10">
                      <motion.div
                        animate={isAsker || isTarget ? { scale: [1, 1.02, 1] } : {}}
                        transition={{ duration: 3, repeat: Infinity }}
                        className={`w-16 h-16 rounded-full bg-gradient-to-r ${playerColor} flex items-center justify-center mx-auto mb-3 text-white font-bold text-lg shadow-lg`}
                      >
                        {player.number}
                      </motion.div>
                      
                      <p className={`text-sm font-bold truncate ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>
                        {showPlayerNames ? player.name : `Игрок ${player.number}`}
                      </p>
                      
                    </div>
                  </motion.div>
                );
              })}
            </div>
          </motion.div>

          {/* Game Events Chat */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className={`rounded-2xl p-6 border backdrop-blur-md ${
              isDarkMode 
                ? 'bg-gray-800/40 border-purple-500/30' 
                : 'bg-white/60 border-indigo-200/50'
            }`}
          >
            <h3 className={`text-xl font-bold mb-6 flex items-center space-x-3 ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>
              <MessageCircle className="w-6 h-6 text-indigo-600" />
              <span>События игры</span>
            </h3>
            
            <div className="space-y-3 max-h-96 overflow-y-auto">
              {moves.length === 0 ? (
                <div className="text-center py-12">
                  <motion.div
                    animate={{ rotate: [0, 2, -2, 0] }}
                    transition={{ duration: 6, repeat: Infinity }}
                    className="text-6xl mb-4"
                  >
                    🎭
                  </motion.div>
                  <p className={`${isDarkMode ? 'text-gray-400' : 'text-gray-500'}`}>
                    События игры будут отображаться здесь
                  </p>
                </div>
              ) : (
                throttledMoves.slice(-20).map((move, index) => (
                  <motion.div
                    key={move.id}
                    initial={false}
                    animate={{ opacity: 1 }}
                    className={`p-4 rounded-xl border backdrop-blur-sm ${
                      move.type === 'system' 
                        ? isDarkMode 
                          ? 'bg-blue-500/20 border-blue-400/30' 
                          : 'bg-blue-50 border-blue-200'
                        : move.type === 'choice'
                          ? isDarkMode 
                            ? 'bg-green-500/20 border-green-400/30' 
                            : 'bg-green-50 border-green-200'
                          : move.type === 'question'
                            ? isDarkMode 
                              ? 'bg-purple-500/20 border-purple-400/30' 
                              : 'bg-purple-50 border-purple-200'
                            : move.type === 'answer'
                              ? isDarkMode 
                                ? 'bg-orange-500/20 border-orange-400/30' 
                                : 'bg-orange-50 border-orange-200'
                              : isDarkMode 
                                ? 'bg-gray-700/30 border-gray-600/30' 
                                : 'bg-gray-50 border-gray-200'
                    }`}
                  >
                    <div className="flex items-start space-x-3">
                      <motion.div
                        initial={false}
                        className="text-2xl"
                      >
                        {move.type === 'system' ? '🤖' : 
                         move.type === 'choice' ? (move.metadata?.choice === 'truth' ? '🤔' : '⚡') :
                         move.type === 'question' ? '📝' :
                         move.type === 'answer' ? '💭' : '👤'}
                      </motion.div>
                      
                      <div className="flex-1">
                        <div className={`text-sm ${isDarkMode ? 'text-white' : 'text-gray-800'}`}>
                          {move.content}
                        </div>
                        
                        {/* Question/Answer Details */}
                        {move.type === 'question' && move.metadata?.question && (
                          <motion.div
                            initial={false}
                            className={`mt-3 p-3 rounded-lg border ${
                              isDarkMode 
                                ? 'bg-gray-700/50 border-gray-600' 
                                : 'bg-white/80 border-gray-200'
                            }`}
                          >
                            <span
                              className={`font-medium ${isDarkMode ? 'text-white' : 'text-gray-800'}`}
                            >
                              "{move.metadata.question}"
                            </span>
                          </motion.div>
                        )}
                        
                        {move.type === 'answer' && move.metadata?.answer && (
                          <motion.div
                            initial={false}
                            className={`mt-3 p-3 rounded-lg border ${
                              isDarkMode 
                                ? 'bg-gray-700/50 border-gray-600' 
                                : 'bg-white/80 border-gray-200'
                            }`}
                          >
                            <span
                              className={`font-medium ${isDarkMode ? 'text-white' : 'text-gray-800'}`}
                            >
                              "{move.metadata.answer}"
                            </span>
                          </motion.div>
                        )}
                        
                        <div className={`text-xs mt-2 ${isDarkMode ? 'text-gray-400' : 'text-gray-500'}`}>
                          {new Date(move.createdAt).toLocaleTimeString('ru-RU', {
                            hour: '2-digit',
                            minute: '2-digit'
                          })}
                        </div>
                      </div>
                    </div>
                  </motion.div>
                ))
              )}
            </div>
          </motion.div>

          {/* Waiting State */}
          {!isMyTurnToChoose && !isMyTurnToAsk && !isMyTurnToAnswer && currentTurn && (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className={`text-center rounded-2xl p-8 border backdrop-blur-md ${
                isDarkMode 
                  ? 'bg-gray-800/40 border-purple-500/30' 
                  : 'bg-white/60 border-indigo-200/50'
              }`}
            >
              <motion.div
                animate={{ rotate: 360 }}
                transition={{ duration: 2, repeat: Infinity, ease: "linear" }}
                className="text-6xl mb-4"
              >
                ⏳
              </motion.div>
              
              <h3 className={`text-xl font-bold mb-2 ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>
                Ожидание...
              </h3>
              
              <p className={`${isDarkMode ? 'text-gray-300' : 'text-gray-600'}`}>
                {!currentTurn.choice && (
                  <>Ожидаем выбора от {getPlayerDisplayName(currentTurn.target)}</>
                )}
                {currentTurn.choice && !currentTurn.question && (
                  <>Ожидаем {currentTurn.choice === 'truth' ? 'вопрос' : 'задание'} от {getPlayerDisplayName(currentTurn.asker)}</>
                )}
                {currentTurn.question && !currentTurn.answer && (
                  <>Ожидаем ответ от {getPlayerDisplayName(currentTurn.target)}</>
                )}
              </p>
            </motion.div>
          )}

          {/* Game Rules */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3 }}
            className={`rounded-2xl p-6 border backdrop-blur-md ${
              isDarkMode 
                ? 'bg-gray-800/40 border-purple-500/30' 
                : 'bg-white/60 border-indigo-200/50'
            }`}
          >
            <h4 className={`font-bold mb-4 flex items-center space-x-2 ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>
              <span className="text-2xl">📋</span>
              <span>Правила игры</span>
            </h4>
            <div className={`space-y-2 text-sm ${isDarkMode ? 'text-gray-300' : 'text-gray-700'}`}>
              <p>🎭 <strong>Номера:</strong> Все игроки получают случайные номера{showPlayerNames ? ', но имена видны' : ' для анонимности'}</p>
              <p>🎯 <strong>Ход:</strong> Умный алгоритм выбирает спрашивающего и отвечающего (избегает повторов)</p>
              <p>🤔 <strong>Правда:</strong> Честно ответьте на вопрос</p>
              <p>⚡ <strong>Действие:</strong> Выполните задание и опишите результат</p>
              <p>⏱️ <strong>Время:</strong> 15с на выбор, 30с на вопрос, 60с на ответ</p>
            </div>
          </motion.div>
        </div>
      </div>
    </div>
  );
}