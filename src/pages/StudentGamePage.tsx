import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ArrowLeft, Users, Crown, Clock, MessageCircle, X, AlertTriangle, Shuffle, Settings, Plus, Minus, Eye, EyeOff } from 'lucide-react';
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
  updateGameSettings,
  validateGameSettings,
  getGameTypeName,
  getPlayerNumber,
  type FirebaseGame,
  type FirebasePlayer
} from '../services/firebaseGameService';
import type { Student } from '../lib/supabase';

interface GameSettings {
  // Для мафии
  mafia?: number;
  doctor?: number;
  detective?: number;
  // Для правды или действия
  anonymity?: boolean;
  // Для викторины
  difficulty?: 'easy' | 'medium' | 'hard';
}

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
  const [showSettings, setShowSettings] = useState(false);
  const [gameSettings, setGameSettings] = useState<GameSettings>({
    mafia: 1,
    doctor: 1,
    detective: 1,
    anonymity: true,
    difficulty: 'medium'
  });
  const [settingsLoading, setSettingsLoading] = useState(false);

  useEffect(() => {
    if (!student || !gameId) {
      navigate('/student-games', { replace: true });
      return;
    }

    setupSubscriptions();
  }, [gameId, student]);

  // Загружаем настройки игры при инициализации
  useEffect(() => {
    if (game?.settings) {
      setGameSettings(prev => ({ ...prev, ...game.settings }));
    }
  }, [game?.settings]);

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

  const handleSettingsUpdate = async () => {
    if (!gameId || !game) return;

    try {
      setSettingsLoading(true);
      
      // Валидация для мафии
      if (game.gameType === 'mafia') {
        const playerCount = Object.keys(players).length;
        const validation = validateGameSettings(playerCount, {
          mafia: gameSettings.mafia || 1,
          doctor: gameSettings.doctor || 1,
          detective: gameSettings.detective || 1
        });
        
        if (!validation.valid) {
          setError(validation.error || 'Неверные настройки');
          return;
        }
      }
      
      await updateGameSettings(gameId, gameSettings);
      setShowSettings(false);
      
    } catch (err) {
      setError('Ошибка обновления настроек');
    } finally {
      setSettingsLoading(false);
    }
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
      
      await startGame(gameId);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Ошибка запуска игры');
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

  const renderGameSettings = () => {
    if (!game || !isGameCreator()) return null;

    return (
      <AnimatePresence>
        {showSettings && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50"
            onClick={() => setShowSettings(false)}
          >
            <motion.div
              initial={{ opacity: 0, scale: 0.9, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.9, y: 20 }}
              transition={{ type: "spring", damping: 25, stiffness: 300 }}
              onClick={(e) => e.stopPropagation()}
              className="bg-white rounded-2xl shadow-2xl max-w-md w-full mx-4 overflow-hidden"
            >
              {/* Header */}
              <div className="bg-gradient-to-r from-indigo-50 to-purple-50 px-6 py-4 border-b border-gray-100">
                <div className="flex items-center justify-between">
                  <h3 className="text-lg font-semibold text-gray-900">
                    Настройки игры
                  </h3>
                  <button
                    onClick={() => setShowSettings(false)}
                    className="p-1 hover:bg-white/70 rounded-lg transition-colors"
                  >
                    <X className="w-4 h-4 text-gray-500" />
                  </button>
                </div>
              </div>

              {/* Settings Content */}
              <div className="p-6 space-y-6">
                {/* Правда или Действие - Анонимность */}
                {game.gameType === 'truth_or_dare' && (
                  <div>
                    <h4 className="font-semibold text-gray-900 mb-4">Настройки анонимности</h4>
                    <div className="space-y-4">
                      <div className="flex items-center justify-between">
                        <div>
                          <label className="text-sm font-medium text-gray-700">
                            Анонимные номера
                          </label>
                          <p className="text-xs text-gray-500">
                            Игроки видят только номера вместо имен
                          </p>
                        </div>
                        <label className="relative inline-flex items-center cursor-pointer">
                          <input
                            type="checkbox"
                            checked={gameSettings.anonymity}
                            onChange={(e) => setGameSettings(prev => ({ ...prev, anonymity: e.target.checked }))}
                            className="sr-only peer"
                          />
                          <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-indigo-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-indigo-600"></div>
                        </label>
                      </div>
                    </div>
                  </div>
                )}

                {/* Мафия - Роли */}
                {game.gameType === 'mafia' && (
                  <div>
                    <h4 className="font-semibold text-gray-900 mb-4">Распределение ролей</h4>
                    <div className="space-y-4">
                      {/* Мафия */}
                      <div className="bg-red-50 rounded-lg p-4 border border-red-200">
                        <div className="flex items-center justify-between">
                          <div>
                            <label className="text-sm font-medium text-red-900">Мафия</label>
                            <p className="text-xs text-red-700">Устраняют мирных жителей</p>
                          </div>
                          <div className="flex items-center space-x-2">
                            <button
                              onClick={() => setGameSettings(prev => ({ ...prev, mafia: Math.max(1, (prev.mafia || 1) - 1) }))}
                              disabled={(gameSettings.mafia || 1) <= 1}
                              className="w-6 h-6 bg-red-600 text-white rounded-full flex items-center justify-center hover:bg-red-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                            >
                              <Minus className="w-3 h-3" />
                            </button>
                            <span className="text-lg font-bold text-red-900 w-6 text-center">
                              {gameSettings.mafia || 1}
                            </span>
                            <button
                              onClick={() => setGameSettings(prev => ({ ...prev, mafia: Math.min(3, (prev.mafia || 1) + 1) }))}
                              disabled={(gameSettings.mafia || 1) >= 3}
                              className="w-6 h-6 bg-red-600 text-white rounded-full flex items-center justify-center hover:bg-red-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                            >
                              <Plus className="w-3 h-3" />
                            </button>
                          </div>
                        </div>
                      </div>

                      {/* Врач */}
                      <div className="bg-green-50 rounded-lg p-4 border border-green-200">
                        <div className="flex items-center justify-between">
                          <div>
                            <label className="text-sm font-medium text-green-900">Врач</label>
                            <p className="text-xs text-green-700">Может спасти игрока ночью</p>
                          </div>
                          <div className="flex items-center space-x-2">
                            <button
                              onClick={() => setGameSettings(prev => ({ ...prev, doctor: Math.max(0, (prev.doctor || 1) - 1) }))}
                              disabled={(gameSettings.doctor || 1) <= 0}
                              className="w-6 h-6 bg-green-600 text-white rounded-full flex items-center justify-center hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                            >
                              <Minus className="w-3 h-3" />
                            </button>
                            <span className="text-lg font-bold text-green-900 w-6 text-center">
                              {gameSettings.doctor || 1}
                            </span>
                            <button
                              onClick={() => setGameSettings(prev => ({ ...prev, doctor: Math.min(1, (prev.doctor || 1) + 1) }))}
                              disabled={(gameSettings.doctor || 1) >= 1}
                              className="w-6 h-6 bg-green-600 text-white rounded-full flex items-center justify-center hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                            >
                              <Plus className="w-3 h-3" />
                            </button>
                          </div>
                        </div>
                      </div>

                      {/* Детектив */}
                      <div className="bg-blue-50 rounded-lg p-4 border border-blue-200">
                        <div className="flex items-center justify-between">
                          <div>
                            <label className="text-sm font-medium text-blue-900">Детектив</label>
                            <p className="text-xs text-blue-700">Может проверить роль игрока</p>
                          </div>
                          <div className="flex items-center space-x-2">
                            <button
                              onClick={() => setGameSettings(prev => ({ ...prev, detective: Math.max(0, (prev.detective || 1) - 1) }))}
                              disabled={(gameSettings.detective || 1) <= 0}
                              className="w-6 h-6 bg-blue-600 text-white rounded-full flex items-center justify-center hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                            >
                              <Minus className="w-3 h-3" />
                            </button>
                            <span className="text-lg font-bold text-blue-900 w-6 text-center">
                              {gameSettings.detective || 1}
                            </span>
                            <button
                              onClick={() => setGameSettings(prev => ({ ...prev, detective: Math.min(2, (prev.detective || 1) + 1) }))}
                              disabled={(gameSettings.detective || 1) >= 2}
                              className="w-6 h-6 bg-blue-600 text-white rounded-full flex items-center justify-center hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                            >
                              <Plus className="w-3 h-3" />
                            </button>
                          </div>
                        </div>
                      </div>

                      {/* Validation */}
                      {(() => {
                        const playerCount = Object.keys(players).length;
                        const validation = validateGameSettings(playerCount, {
                          mafia: gameSettings.mafia || 1,
                          doctor: gameSettings.doctor || 1,
                          detective: gameSettings.detective || 1
                        });
                        
                        return !validation.valid ? (
                          <div className="bg-red-50 rounded-lg p-3 border border-red-200">
                            <div className="flex items-center space-x-2">
                              <AlertTriangle className="w-4 h-4 text-red-600" />
                              <span className="text-red-800 text-sm">{validation.error}</span>
                            </div>
                          </div>
                        ) : (
                          <div className="bg-green-50 rounded-lg p-3 border border-green-200">
                            <div className="text-center text-sm text-green-800">
                              Мирных жителей: {playerCount - (gameSettings.mafia || 1) - (gameSettings.doctor || 1) - (gameSettings.detective || 1)}
                            </div>
                          </div>
                        );
                      })()}
                    </div>
                  </div>
                )}

                {/* Викторина - Сложность */}
                {game.gameType === 'quiz' && (
                  <div>
                    <h4 className="font-semibold text-gray-900 mb-4">Уровень сложности</h4>
                    <div className="space-y-3">
                      {[
                        { value: 'easy', label: 'Легкий', desc: 'Простые вопросы, больше времени' },
                        { value: 'medium', label: 'Средний', desc: 'Стандартные вопросы и время' },
                        { value: 'hard', label: 'Сложный', desc: 'Сложные вопросы, меньше времени' }
                      ].map(option => (
                        <label
                          key={option.value}
                          className={`flex items-center space-x-3 p-3 rounded-lg border cursor-pointer transition-colors ${
                            gameSettings.difficulty === option.value
                              ? 'border-indigo-500 bg-indigo-50'
                              : 'border-gray-200 hover:border-indigo-300 hover:bg-gray-50'
                          }`}
                        >
                          <input
                            type="radio"
                            name="difficulty"
                            value={option.value}
                            checked={gameSettings.difficulty === option.value}
                            onChange={(e) => setGameSettings(prev => ({ ...prev, difficulty: e.target.value as 'easy' | 'medium' | 'hard' }))}
                            className="w-4 h-4 text-indigo-600 border-gray-300 focus:ring-indigo-500"
                          />
                          <div>
                            <div className="font-medium text-gray-900">{option.label}</div>
                            <div className="text-xs text-gray-600">{option.desc}</div>
                          </div>
                        </label>
                      ))}
                    </div>
                  </div>
                )}

                {/* Save Button */}
                <div className="flex space-x-3">
                  <button
                    onClick={handleSettingsUpdate}
                    disabled={settingsLoading}
                    className="flex-1 bg-indigo-600 text-white px-6 py-3 rounded-xl hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors font-medium"
                  >
                    {settingsLoading ? (
                      <div className="flex items-center justify-center space-x-2">
                        <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                        <span>Сохранение...</span>
                      </div>
                    ) : (
                      'Сохранить настройки'
                    )}
                  </button>
                  <button
                    onClick={() => setShowSettings(false)}
                    className="px-6 py-3 bg-gray-200 text-gray-700 rounded-xl hover:bg-gray-300 transition-colors font-medium"
                  >
                    Отмена
                  </button>
                </div>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    );
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
              <div className="flex items-center justify-center space-x-4 mb-4">
                <h2 className="text-2xl font-bold text-gray-900">Комната ожидания</h2>
                {isGameCreator() && (
                  <button
                    onClick={() => setShowSettings(true)}
                    className="flex items-center space-x-2 bg-gray-100 hover:bg-gray-200 text-gray-700 px-4 py-2 rounded-lg transition-colors"
                  >
                    <Settings className="w-4 h-4" />
                    <span>Настройки</span>
                  </button>
                )}
              </div>
              <p className="text-gray-600 mb-6">
                Ожидаем игроков... ({getPlayerCount()}/{game.maxPlayers})
              </p>
              
              <div className="bg-blue-50 rounded-lg p-4 border border-blue-200 mb-6">
                <div className="flex items-center justify-center space-x-2 text-blue-800">
                  <Shuffle className="w-4 h-4" />
                  <span className="text-sm font-medium">
                    При старте игры всем игрокам будут назначены случайные номера
                    {game.gameType === 'truth_or_dare' && gameSettings.anonymity === false && ' (имена будут видны)'}
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

        {/* Game Settings Modal */}
        {renderGameSettings()}
      </div>
    </div>
  );
}