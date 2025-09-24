import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ArrowLeft, MoreVertical, LogOut, Trash2, User as UserIcon, Calendar, MessageCircle, Gamepad2, Users, Play, Plus, Crown, Clock } from 'lucide-react';
import { useLanguage } from '../contexts/LanguageContext';
import { useNavigate } from 'react-router-dom';
import LoadingSpinner from '../components/LoadingSpinner';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '../components/ui/dropdown-menu';
import { 
  createGame, 
  subscribeToActiveGames, 
  getGameTypeName, 
  getGameTypeIcon, 
  getGameTypeColor,
  getPlayerNumber,
  type FirebaseGame 
} from '../services/firebaseGameService';
import type { Student, Game } from '../lib/supabase';

const gameTypes = [
  {
    type: 'truth_or_dare' as const,
    name: 'Правда или Действие',
    description: 'Классическая игра с вопросами и заданиями',
    icon: '🎭',
    color: 'from-pink-500 to-rose-600',
    bgColor: 'bg-pink-100',
    textColor: 'text-pink-600'
  },
  {
    type: 'quiz' as const,
    name: 'Викторина',
    description: 'Интеллектуальная игра с вопросами',
    icon: '🎲',
    color: 'from-blue-500 to-indigo-600',
    bgColor: 'bg-blue-100',
    textColor: 'text-blue-600'
  },
  {
    type: 'mafia' as const,
    name: 'Мафия',
    description: 'Психологическая игра на выживание',
    icon: '🕵️',
    color: 'from-gray-700 to-gray-900',
    bgColor: 'bg-gray-100',
    textColor: 'text-gray-700'
  }
];

export default function StudentGamesPage() {
  const { t } = useLanguage();
  const navigate = useNavigate();
  const [studentData, setStudentData] = useState<{student: Student, className: string} | null>(null);
  const [activeGames, setActiveGames] = useState<FirebaseGame[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [creatingGame, setCreatingGame] = useState<string | null>(null);

  useEffect(() => {
    const saved = localStorage.getItem('studentDashboardData');
    if (saved) {
      const data = JSON.parse(saved);
      setStudentData(data);
      setupGameSubscription(data.student.class_id);
    } else {
      navigate('/', { replace: true });
    }
  }, []);

  const setupGameSubscription = (classId: string) => {
    setLoading(true);
    setError(null);
    
    const unsubscribe = subscribeToActiveGames(classId, (games) => {
      setActiveGames(games);
      setLoading(false);
    });

    // Очищаем подписку при размонтировании компонента
    return () => {
      unsubscribe();
    };
  };

  const handleCreateGame = async (gameType: 'truth_or_dare' | 'quiz' | 'mafia') => {
    if (!studentData) return;

    try {
      setCreatingGame(gameType);
      setError(null);

      const gameId = await createGame(
        studentData.student.class_id,
        studentData.student.id,
        studentData.student.name,
        gameType,
        10 // Максимум 10 игроков для всех типов игр
      );

      // Перенаправляем на страницу игры
      navigate(`/student-game/${gameId}`, {
        state: {
          student: studentData.student,
          className: studentData.className
        }
      });
    } catch (err) {
      setError('Ошибка создания игры');
    } finally {
      setCreatingGame(null);
    }
  };

  const handleJoinGame = (game: FirebaseGame) => {
    if (!studentData) return;

    navigate(`/student-game/${game.id}`, {
      state: {
        student: studentData.student,
        className: studentData.className
      }
    });
  };

  const handleLogout = () => {
    localStorage.removeItem('studentDashboardData');
    navigate('/', { replace: true });
  };

  const handleForgetSession = () => {
    localStorage.removeItem('studentId');
    localStorage.removeItem('createdAt');
    localStorage.removeItem('studentDashboardData');
    localStorage.setItem('skipAutoLogin', 'true');
    navigate('/', { replace: true });
  };

  const handleProfileClick = () => {
    navigate('/student-profile');
  };

  const handleScheduleClick = () => {
    navigate('/student-schedule');
  };

  const handleChatClick = () => {
    navigate('/student-chat');
  };

  const getPlayerCount = (game: FirebaseGame): number => {
    return game.players ? Object.keys(game.players).length : 0;
  };

  const isPlayerInGame = (game: FirebaseGame): boolean => {
    return game.players && studentData ? 
      Object.keys(game.players).includes(studentData.student.id) : false;
  };

  const isGameCreator = (game: FirebaseGame): boolean => {
    return studentData ? game.creatorId === studentData.student.id : false;
  };

  const formatTimeAgo = (timestamp: number): string => {
    const now = Date.now();
    const diff = now - timestamp;
    const minutes = Math.floor(diff / 60000);
    
    if (minutes < 1) return 'только что';
    if (minutes < 60) return `${minutes} мин. назад`;
    
    const hours = Math.floor(minutes / 60);
    if (hours < 24) return `${hours} ч. назад`;
    
    const days = Math.floor(hours / 24);
    return `${days} дн. назад`;
  };

  if (!studentData) {
    return null;
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100">
      {/* Header */}
      <header className="bg-white shadow-sm border-b">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-4">
              <button
                onClick={() => navigate('/student-dashboard')}
                className="flex items-center space-x-2 text-blue-600 hover:text-blue-700 font-medium"
              >
                <ArrowLeft className="w-5 h-5" />
                <span>{t('common.back')}</span>
              </button>
              <div>
                <h1 className="text-2xl font-bold text-gray-900 flex items-center space-x-2">
                  <Gamepad2 className="w-6 h-6 text-indigo-600" />
                  <span>Игры с классом</span>
                </h1>
                <p className="text-gray-600">{studentData.className}</p>
              </div>
            </div>
            
            <div className="flex items-center space-x-4">
              {/* Session Indicator */}
              <motion.div
                initial={{ opacity: 0, scale: 0 }}
                animate={{ opacity: 1, scale: 1 }}
                className="w-3 h-3 bg-green-500 rounded-full shadow-lg animate-pulse"
                title="Активный сеанс"
              />
              
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <motion.button
                    whileHover={{ scale: 1.05 }}
                    whileTap={{ scale: 0.95 }}
                    className="flex items-center justify-center w-10 h-10 bg-white border border-gray-200 rounded-xl hover:bg-gray-50 hover:border-gray-300 transition-all duration-200 shadow-sm hover:shadow-md"
                  >
                    <MoreVertical className="w-5 h-5 text-gray-600" />
                  </motion.button>
                </DropdownMenuTrigger>
                
                <DropdownMenuContent align="end" className="w-48 mt-2" asChild>
                  <motion.div
                    initial={{ opacity: 0, scale: 0.95, y: -10 }}
                    animate={{ opacity: 1, scale: 1, y: 0 }}
                    exit={{ opacity: 0, scale: 0.95, y: -10 }}
                    transition={{ duration: 0.15, ease: "easeOut" }}
                  >
                    <div>
                      <DropdownMenuItem onClick={handleProfileClick} className="cursor-pointer">
                        <UserIcon className="w-4 h-4 mr-3 text-indigo-500" />
                        <span className="text-gray-700">Профиль</span>
                      </DropdownMenuItem>
                      
                      <DropdownMenuItem onClick={handleScheduleClick} className="cursor-pointer">
                        <Calendar className="w-4 h-4 mr-3 text-blue-500" />
                        <span className="text-gray-700">Расписание</span>
                      </DropdownMenuItem>
                      
                      <DropdownMenuItem onClick={handleChatClick} className="cursor-pointer">
                        <MessageCircle className="w-4 h-4 mr-3 text-green-500" />
                        <span className="text-gray-700">Чат класса</span>
                      </DropdownMenuItem>
                      
                      <DropdownMenuItem onClick={handleForgetSession} className="cursor-pointer">
                        <Trash2 className="w-4 h-4 mr-3 text-orange-500" />
                        <span className="text-gray-700">Забыть сеанс (полный выход)</span>
                      </DropdownMenuItem>
                      
                      <DropdownMenuItem onClick={handleLogout} className="cursor-pointer">
                        <LogOut className="w-4 h-4 mr-3 text-red-500" />
                        <span className="text-gray-700">Выйти (сеанс сохранится)</span>
                      </DropdownMenuItem>
                    </div>
                  </motion.div>
                </DropdownMenuContent>
              </DropdownMenu>
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

        {/* Active Games */}
        {activeGames.length > 0 && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="mb-8"
          >
            <h2 className="text-xl font-bold text-gray-900 mb-4">Активные игры</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {activeGames.map((game, index) => {
                const playerCount = getPlayerCount(game);
                const isInGame = isPlayerInGame(game);
                const isCreator = isGameCreator(game);
                const currentPlayerNumber = isInGame ? getPlayerNumber(game.players || {}, studentData.student.id) : 0;
                
                return (
                  <motion.div
                    key={game.id}
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: index * 0.05 }}
                    whileHover={{ scale: 1.02, y: -2 }}
                    whileTap={{ scale: 0.98 }}
                    onClick={() => handleJoinGame(game)}
                    className="bg-white rounded-xl shadow-lg hover:shadow-xl transition-all duration-300 cursor-pointer border border-gray-100 p-6"
                  >
                    <div className="space-y-4">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center space-x-3">
                          <div className="w-12 h-12 bg-gradient-to-r from-indigo-100 to-purple-100 rounded-xl flex items-center justify-center text-2xl">
                            {getGameTypeIcon(game.gameType)}
                          </div>
                          <div>
                            <h3 className="text-lg font-semibold text-gray-900">
                              {getGameTypeName(game.gameType)}
                            </h3>
                            <p className="text-sm text-gray-600">
                              {isCreator && <Crown className="w-3 h-3 inline mr-1 text-yellow-500" />}
                              {game.status === 'waiting' 
                                ? 'Набор игроков' 
                                : isInGame 
                                  ? `В процессе • Вы: Игрок ${currentPlayerNumber}`
                                  : 'В процессе'
                              }
                            </p>
                          </div>
                        </div>
                        
                        <div className="text-right">
                          <div className="flex items-center space-x-1 text-sm text-gray-600 mb-1">
                            <Users className="w-4 h-4" />
                            <span>{playerCount}/{game.maxPlayers}</span>
                          </div>
                          <div className="flex items-center space-x-1 text-xs text-gray-500">
                            <Clock className="w-3 h-3" />
                            <span>{formatTimeAgo(game.createdAt || 0)}</span>
                          </div>
                        </div>
                      </div>
                      
                      <div className="flex items-center justify-between">
                        <div className="flex -space-x-2">
                          {game.players && Object.entries(game.players).slice(0, 4).map(([userId, player], idx) => (
                            <div
                              key={userId}
                              className="w-8 h-8 bg-gradient-to-br from-indigo-500 to-purple-600 rounded-full flex items-center justify-center border-2 border-white text-white text-xs font-bold"
                              style={{ zIndex: 4 - idx }}
                            >
                              {player.name.split(' ').map(n => n[0]).slice(0, 2).join('')}
                            </div>
                          ))}
                          {playerCount > 4 && (
                            <div className="w-8 h-8 bg-gray-400 rounded-full flex items-center justify-center border-2 border-white text-white text-xs font-bold">
                              +{playerCount - 4}
                            </div>
                          )}
                        </div>
                        
                        <span className={`px-3 py-1 rounded-full text-sm font-medium ${
                          isInGame
                            ? 'bg-green-100 text-green-800'
                            : game.status === 'waiting' 
                              ? 'bg-yellow-100 text-yellow-800' 
                              : 'bg-blue-100 text-blue-800'
                        }`}>
                          {isInGame 
                            ? `Игрок ${currentPlayerNumber}` 
                            : game.status === 'waiting' 
                              ? 'Присоединиться' 
                              : 'Играть'
                          }
                        </span>
                      </div>
                    </div>
                  </motion.div>
                );
              })}
            </div>
          </motion.div>
        )}

        {/* Game Types */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="mb-8"
        >
          <h2 className="text-xl font-bold text-gray-900 mb-4">Создать новую игру</h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {gameTypes.map((gameType, index) => (
              <motion.div
                key={gameType.type}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.1 }}
                className="bg-white rounded-xl shadow-lg border border-gray-100 overflow-hidden"
              >
                <div className={`h-2 bg-gradient-to-r ${gameType.color}`} />
                <div className="p-6">
                  <div className="text-center mb-6">
                    <div className={`w-16 h-16 ${gameType.bgColor} rounded-xl flex items-center justify-center mx-auto mb-4 text-3xl`}>
                      {gameType.icon}
                    </div>
                    <h3 className="text-xl font-bold text-gray-900 mb-2">
                      {gameType.name}
                    </h3>
                    <p className="text-gray-600 text-sm">
                      {gameType.description}
                    </p>
                    <div className="text-xs text-gray-500 mt-2">
                      Макс. игроков: 10
                    </div>
                  </div>

                  <motion.button
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.98 }}
                    onClick={() => handleCreateGame(gameType.type)}
                    disabled={creatingGame === gameType.type}
                    className={`w-full bg-gradient-to-r ${gameType.color} text-white py-3 px-4 rounded-xl font-medium hover:shadow-lg transition-all duration-300 disabled:opacity-50 disabled:cursor-not-allowed`}
                  >
                    {creatingGame === gameType.type ? (
                      <div className="flex items-center justify-center space-x-2">
                        <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                        <span>Создание...</span>
                      </div>
                    ) : (
                      <div className="flex items-center justify-center space-x-2">
                        <Plus className="w-4 h-4" />
                        <span>Создать игру</span>
                      </div>
                    )}
                  </motion.button>
                </div>
              </motion.div>
            ))}
          </div>
        </motion.div>

        {/* Game Rules */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
          className="bg-white rounded-xl shadow-lg border border-gray-100 p-6"
        >
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Правила игр</h3>
          <div className="space-y-4 text-sm text-gray-600">
            <div className="bg-blue-50 rounded-lg p-4 border border-blue-200">
              <h4 className="font-medium text-blue-900 mb-2">🎭 Анонимность в играх</h4>
              <p className="text-blue-800">При старте игры всем участникам назначаются случайные номера (Игрок 1, Игрок 2, и т.д.). Это обеспечивает анонимность и делает игры более честными и интересными.</p>
            </div>
            <div>
              <h4 className="font-medium text-gray-900 mb-2">🎭 Правда или Действие</h4>
              <p>Случайно выбранные игроки задают друг другу вопросы или дают задания. Выберите "Правда" для вопроса или "Действие" для задания. Все действия видны в реальном времени.</p>
            </div>
            <div>
              <h4 className="font-medium text-gray-900 mb-2">🎲 Викторина</h4>
              <p>Отвечайте на вопросы быстрее других! За каждый правильный ответ начисляются баллы. Все ответы видны в реальном времени. Побеждает игрок с наибольшим количеством баллов. Игроки видят только номера друг друга.</p>
            </div>
            <div>
              <h4 className="font-medium text-gray-900 mb-2">🕵️ Мафия</h4>
              <p>Психологическая игра в реальном времени с анонимными номерами. Мафия пытается устранить мирных жителей, а мирные жители пытаются найти мафию. Есть специальные роли: врач и детектив. Все голоса и действия синхронизируются онлайн.</p>
            </div>
          </div>
        </motion.div>
      </div>
    </div>
  );
}