import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ArrowLeft, Users, Crown, Clock, MessageCircle, X, AlertTriangle, Shuffle } from 'lucide-react';
import { useNavigate, useParams, useLocation } from 'react-router-dom';
import { useLanguage } from '../contexts/LanguageContext';
import LoadingSpinner from '../components/LoadingSpinner';
import FirebaseTruthOrDareGame from '../components/games/FirebaseTruthOrDareGame';
import FirebaseQuizGame from '../components/games/FirebaseQuizGame';
import FirebaseMafiaGame from '../components/games/FirebaseMafiaGame';
import { 
  joinGame,
  leaveGame,
  startGame,
  cancelGame,
  subscribeToGame,
  subscribeToGamePlayers,
  assignMafiaRoles,
  getGameTypeName,
  getPlayerNumber,
  type FirebaseGame,
  type FirebasePlayer
} from '../services/firebaseGameService';
import type { Student } from '../lib/supabase';

export default function StudentGamePage() {
  const { t } = useLanguage();
  const navigate = useNavigate();
  const { gameId } = useParams<{ gameId: string }>();
  const location = useLocation();
  
  const { student, className } = location.state || {};
  
  const [game, setGame] = useState<FirebaseGame | null>(null);
  const [players, setPlayers] = useState<{ [userId: string]: FirebasePlayer }>({});
  const [isJoined, setIsJoined] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [actionLoading, setActionLoading] = useState<string | null>(null);

  useEffect(() => {
    if (!student || !gameId) {
      navigate('/student-games', { replace: true });
      return;
    }

    setupSubscriptions();
  }, [gameId, student]);


  const setupSubscriptions = () => {
    if (!gameId) return;

    let unsubscribeGame: (() => void) | null = null;
    let unsubscribePlayers: (() => void) | null = null;

    // Подписываемся на игру
    unsubscribeGame = subscribeToGame(gameId, (gameData) => {
      if (gameData) {
        setGame(gameData);
        setLoading(false);
        
        // Если игра отменена, показываем сообщение и возвращаемся
        if (gameData.status === 'cancelled') {
          setError('Игра была отменена создателем');
          setTimeout(() => {
            navigate('/student-games', { replace: true });
          }, 3000);
        }
      } else {
        setError('Игра не найдена');
        setLoading(false);
      }
    });

    // Подписываемся на обновления игроков
    unsubscribePlayers = subscribeToGamePlayers(gameId, (playersData) => {
      setPlayers(playersData);
      const playerJoined = Object.keys(playersData).includes(student.id);
      setIsJoined(playerJoined);
    });

    return () => {
      if (unsubscribeGame) unsubscribeGame();
      if (unsubscribePlayers) unsubscribePlayers();
    };
  };

  const handleJoinGame = async () => {
    if (!gameId || !student || isJoined || !game) return;
    
    // Проверяем, не превышен ли лимит игроков
    const currentPlayerCount = Object.keys(players).length;
    if (currentPlayerCount >= game.maxPlayers) {
      setError('Игра заполнена');
      return;
    }

    try {
      setActionLoading('join');
      setError(null);
      await joinGame(gameId, student.id, student.name);
      setIsJoined(true);
    } catch (err) {
      setError('Ошибка присоединения к игре');
    } finally {
      setActionLoading(null);
    }
  };

  const handleLeaveGame = async () => {
    if (!gameId || !student || !isJoined) return;

    try {
      setActionLoading('leave');
      setError(null);
      await leaveGame(gameId, student.id);
      setIsJoined(false);
    } catch (err) {
      setError('Ошибка выхода из игры');
    } finally {
      setActionLoading(null);
    }
  };

  const handleStartGame = async () => {
    if (!gameId || !game) return;

    try {
      setActionLoading('start');
      setError(null);
      
      // Для мафии назначаем роли перед началом
      if (game.gameType === 'mafia') {
        const playerIds = Object.keys(players);
        await assignMafiaRoles(gameId, playerIds);
      }
      
      await startGame(gameId);
    } catch (err) {
      setError('Ошибка запуска игры');
    } finally {
      setActionLoading(null);
    }
  };

  const handleCancelGame = async () => {
    if (!gameId || !game || !isGameCreator()) return;
    
    if (!confirm('Вы уверены, что хотите отменить игру? Все игроки будут уведомлены.')) {
      return;
    }

    try {
      setActionLoading('cancel');
      setError(null);
      await cancelGame(gameId);
    } catch (err) {
      setError('Ошибка отмены игры');
    } finally {
      setActionLoading(null);
    }
  };

  const canStartGame = () => {
    return game?.creatorId === student?.id && 
           game?.status === 'waiting' && 
           Object.keys(players).length >= 2;
  };

  const isGameCreator = () => {
    return game?.creatorId === student?.id;
  };

  const getPlayerCount = (): number => {
    return Object.keys(players).length;
  };

  const getPlayersArray = () => {
    return Object.entries(players).map(([userId, player]) => ({
      userId,
      ...player
    }));
  };

  const renderGameComponent = () => {
    if (!game || !student) return null;

    switch (game.gameType) {
      case 'truth_or_dare':
        return (
          <FirebaseTruthOrDareGame
            game={game}
            players={players}
            currentPlayer={student}
            gameId={gameId!}
            onError={setError}
          />
        );
      case 'quiz':
        return (
          <FirebaseQuizGame
            game={game}
            players={players}
            currentPlayer={student}
            gameId={gameId!}
            onError={setError}
          />
        );
      case 'mafia':
        return (
          <FirebaseMafiaGame
            game={game}
            players={players}
            currentPlayer={student}
            gameId={gameId!}
            onError={setError}
          />
        );
      default:
        return <div>Неизвестный тип игры</div>;
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center">
        <LoadingSpinner />
      </div>
    );
  }

  if (!game || !student) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center">
        <div className="text-center">
          <p className="text-red-600 mb-4">Игра не найдена</p>
          <button
            onClick={() => navigate('/student-games')}
            className="px-6 py-3 bg-indigo-600 text-white rounded-xl hover:bg-indigo-700 transition-colors"
          >
            Вернуться к играм
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100">
      {/* Header */}
      <header className="bg-white shadow-sm border-b">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-4">
              <button
                onClick={() => navigate('/student-games')}
                className="flex items-center space-x-2 text-blue-600 hover:text-blue-700 font-medium"
              >
                <ArrowLeft className="w-5 h-5" />
                <span>К играм</span>
              </button>
              <div>
                <h1 className="text-2xl font-bold text-gray-900">
                  {game ? getGameTypeName(game.gameType) : 'Игра'}
                </h1>
                <p className="text-gray-600">{className}</p>
              </div>
            </div>
            
            <div className="flex items-center space-x-4">
              <div className="flex items-center space-x-2 text-sm text-gray-600">
                <Users className="w-4 h-4" />
                <span>{getPlayerCount()}/{game?.maxPlayers || 0}</span>
              </div>
              
              <span className={`px-3 py-1 rounded-full text-sm font-medium ${
                game.status === 'waiting' 
                  ? 'bg-yellow-100 text-yellow-800' 
                  : game.status === 'started'
                    ? 'bg-green-100 text-green-800'
                    : game.status === 'active'
                      ? 'bg-green-100 text-green-800'
                    : game.status === 'cancelled'
                      ? 'bg-red-100 text-red-800'
                    : 'bg-gray-100 text-gray-800'
              }`}>
                {game.status === 'waiting' && 'Ожидание'}
                {(game.status === 'started' || game.status === 'active') && 'В процессе'}
                {game.status === 'finished' && 'Завершена'}
                {game.status === 'cancelled' && 'Отменена'}
              </span>
            </div>
          </div>
        </div>
      </header>

      <div className="container mx-auto px-4 py-8">
        {/* Error Message */}
        {error && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            className="bg-red-100 border border-red-200 text-red-700 px-4 py-3 rounded-lg mb-6"
          >
            {error}
            <button
              onClick={() => setError(null)}
              className="ml-2 text-red-500 hover:text-red-700"
            >
              ✕
            </button>
          </motion.div>
        )}

        {/* Waiting Room */}
        {game.status === 'waiting' && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="bg-white rounded-xl shadow-lg border border-gray-100 p-8 mb-8"
          >
            <div className="text-center">
              <h2 className="text-2xl font-bold text-gray-900 mb-4">Комната ожидания</h2>
              <p className="text-gray-600 mb-6">
                Ожидаем игроков... ({getPlayerCount()}/{game.maxPlayers})
              </p>
              
              <div className="bg-blue-50 rounded-lg p-4 border border-blue-200 mb-6">
                <div className="flex items-center justify-center space-x-2 text-blue-800">
                  <Shuffle className="w-4 h-4" />
                  <span className="text-sm font-medium">
                    При старте игры всем игрокам будут назначены случайные номера для анонимности
                  </span>
                </div>
              </div>

              {/* Players List */}
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
                {getPlayersArray().map((player, index) => (
                  <motion.div
                    key={player.userId}
                    initial={{ opacity: 0, scale: 0.8 }}
                    animate={{ opacity: 1, scale: 1 }}
                    transition={{ delay: index * 0.1 }}
                    className="bg-gray-50 rounded-lg p-4 text-center"
                  >
                    <div className="w-12 h-12 bg-gradient-to-br from-indigo-500 to-purple-600 rounded-full flex items-center justify-center mx-auto mb-2">
                      <span className="text-white font-bold">
                        {player.name.split(' ').map(n => n[0]).slice(0, 2).join('')}
                      </span>
                    </div>
                    <p className="text-sm font-medium text-gray-900 truncate">
                      {player.name}
                    </p>
                    {player.userId === game.creatorId && (
                      <Crown className="w-4 h-4 text-yellow-500 mx-auto mt-1" />
                    )}
                    <div className="text-xs text-gray-500 mt-1">
                      Получит номер при старте
                    </div>
                  </motion.div>
                ))}
                
                {/* Empty slots */}
                {Array.from({ length: game.maxPlayers - getPlayerCount() }).map((_, index) => (
                  <div
                    key={`empty-${index}`}
                    className="bg-gray-100 rounded-lg p-4 text-center border-2 border-dashed border-gray-300"
                  >
                    <div className="w-12 h-12 bg-gray-200 rounded-full flex items-center justify-center mx-auto mb-2">
                      <Users className="w-6 h-6 text-gray-400" />
                    </div>
                    <p className="text-xs text-gray-500">Ожидание</p>
                  </div>
                ))}
              </div>

              {/* Action Buttons */}
              <div className="space-y-4">
                {!isJoined ? (
                  <div className="space-y-3">
                    <motion.button
                      whileHover={{ scale: 1.02 }}
                      whileTap={{ scale: 0.98 }}
                      onClick={handleJoinGame}
                      disabled={actionLoading === 'join' || getPlayerCount() >= game.maxPlayers}
                      className="bg-indigo-600 text-white px-8 py-3 rounded-xl hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors font-medium shadow-lg"
                    >
                      {actionLoading === 'join' ? (
                        <div className="flex items-center space-x-2">
                          <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                          <span>Присоединение...</span>
                        </div>
                      ) : getPlayerCount() >= game.maxPlayers ? (
                        'Игра заполнена'
                      ) : (
                        'Присоединиться к игре'
                      )}
                    </motion.button>
                  </div>
                ) : canStartGame() ? (
                  <div className="space-y-3">
                    <motion.button
                      whileHover={{ scale: 1.02 }}
                      whileTap={{ scale: 0.98 }}
                      onClick={handleStartGame}
                      disabled={actionLoading === 'start'}
                      className="bg-green-600 text-white px-8 py-3 rounded-xl hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors font-medium shadow-lg"
                    >
                      {actionLoading === 'start' ? (
                        <div className="flex items-center space-x-2">
                          <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                          <span>Запуск...</span>
                        </div>
                      ) : (
                        'Начать игру'
                      )}
                    </motion.button>
                    
                    <motion.button
                      whileHover={{ scale: 1.02 }}
                      whileTap={{ scale: 0.98 }}
                      onClick={handleCancelGame}
                      disabled={actionLoading === 'cancel'}
                      className="bg-red-600 text-white px-6 py-2 rounded-lg hover:bg-red-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors font-medium"
                    >
                      {actionLoading === 'cancel' ? (
                        <div className="flex items-center space-x-2">
                          <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                          <span>Отмена...</span>
                        </div>
                      ) : (
                        <div className="flex items-center space-x-2">
                          <X className="w-4 h-4" />
                          <span>Отменить игру</span>
                        </div>
                      )}
                    </motion.button>
                  </div>
                ) : isJoined ? (
                  <div className="space-y-3">
                    <div className="text-gray-600">
                      {getPlayerCount() < 2 
                        ? 'Ожидаем еще игроков...' 
                        : 'Ожидаем начала игры...'
                      }
                    </div>
                    
                    <motion.button
                      whileHover={{ scale: 1.02 }}
                      whileTap={{ scale: 0.98 }}
                      onClick={handleLeaveGame}
                      disabled={actionLoading === 'leave'}
                      className="bg-orange-600 text-white px-6 py-2 rounded-lg hover:bg-orange-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors font-medium"
                    >
                      {actionLoading === 'leave' ? (
                        <div className="flex items-center space-x-2">
                          <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                          <span>Выход...</span>
                        </div>
                      ) : (
                        'Покинуть игру'
                      )}
                    </motion.button>
                  </div>
                ) : (
                  <div className="text-gray-600">
                    {getPlayerCount() < 2 
                      ? 'Ожидаем еще игроков...' 
                      : 'Ожидаем начала игры...'
                    }
                  </div>
                )}
                
                {/* Cancel button for creator */}
                {isGameCreator() && !canStartGame() && (
                  <motion.button
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.98 }}
                    onClick={handleCancelGame}
                    disabled={actionLoading === 'cancel'}
                    className="bg-red-600 text-white px-6 py-2 rounded-lg hover:bg-red-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors font-medium"
                  >
                    {actionLoading === 'cancel' ? (
                      <div className="flex items-center space-x-2">
                        <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                        <span>Отмена...</span>
                      </div>
                    ) : (
                      <div className="flex items-center space-x-2">
                        <X className="w-4 h-4" />
                        <span>Отменить игру</span>
                      </div>
                    )}
                  </motion.button>
                )}
              </div>
            </div>
          </motion.div>
        )}

        {/* Game Content */}
        {(game.status === 'active' || game.status === 'started') && isJoined && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
          >
            {renderGameComponent()}
          </motion.div>
        )}

        {/* Game Cancelled */}
        {game.status === 'cancelled' && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="bg-white rounded-xl shadow-lg border border-red-200 p-8 text-center"
          >
            <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <AlertTriangle className="w-8 h-8 text-red-600" />
            </div>
            <h2 className="text-2xl font-bold text-gray-900 mb-4">Игра отменена</h2>
            <p className="text-gray-600 mb-6">Создатель игры отменил её</p>
            <button
              onClick={() => navigate('/student-games')}
              className="bg-indigo-600 text-white px-8 py-3 rounded-xl hover:bg-indigo-700 transition-colors font-medium"
            >
              Вернуться к играм
            </button>
          </motion.div>
        )}
        {/* Game Finished */}
        {game.status === 'finished' && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="bg-white rounded-xl shadow-lg border border-gray-100 p-8 text-center"
          >
            <h2 className="text-2xl font-bold text-gray-900 mb-4">Игра завершена!</h2>
            <p className="text-gray-600 mb-6">Спасибо за участие в игре</p>
            <button
              onClick={() => navigate('/student-games')}
              className="bg-indigo-600 text-white px-8 py-3 rounded-xl hover:bg-indigo-700 transition-colors font-medium"
            >
              Вернуться к играм
            </button>
          </motion.div>
        )}
      </div>
    </div>
  );
}