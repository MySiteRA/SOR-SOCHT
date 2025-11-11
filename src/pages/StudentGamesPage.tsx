import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ArrowLeft, MoreVertical, LogOut, Trash2, User as UserIcon, Calendar, MessageCircle, Gamepad2, Users, Play, Plus, Crown, Clock } from 'lucide-react';
import { useLanguage } from '../contexts/LanguageContext';
import { useNavigate } from 'react-router-dom';
import LoadingSpinner from '../components/LoadingSpinner';
import { checkStudentKeyValidity } from '../lib/api';
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
      
      // Проверяем валидность ключа студента
      validateStudentKey(data.student.id);
      
      setupGameSubscription(data.student.class_id);
    } else {
      navigate('/', { replace: true });
    }
  }, []);

  const validateStudentKey = async (studentId: string) => {
    try {
      const isValid = await checkStudentKeyValidity(studentId);
      
      if (!isValid) {
        // Ключ больше не валиден, принудительно разлогиниваем
        localStorage.removeItem('studentDashboardData');
        localStorage.removeItem('studentId');
        localStorage.removeItem('createdAt');
        localStorage.setItem('skipAutoLogin', 'true');
        navigate('/', { replace: true });
      }
    } catch (error) {
      console.error('Error validating student key:', error);
      // В случае ошибки проверки, не разлогиниваем
    }
  };

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
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-slate-100">
      {/* Header */}
      <header className="bg-white/80 backdrop-blur-lg border-b border-slate-200">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-4">
              <button
                onClick={() => navigate('/student-dashboard')}
                className="flex items-center space-x-2 text-slate-600 hover:text-slate-900 font-medium transition-colors"
              >
                <ArrowLeft className="w-5 h-5" />
                <span>{t('common.back')}</span>
              </button>
              <div>
                <h1 className="text-2xl font-bold text-slate-900 flex items-center space-x-2">
                  <Gamepad2 className="w-6 h-6 text-emerald-600" />
                  <span>Игры с классом</span>
                </h1>
                <p className="text-slate-500 text-sm">{studentData.className}</p>
              </div>
            </div>

            <div className="flex items-center space-x-4">
              {/* Session Indicator */}
              <motion.div
                initial={{ opacity: 0, scale: 0 }}
                animate={{ opacity: 1, scale: 1 }}
                className="w-3 h-3 bg-emerald-500 rounded-full shadow-lg animate-pulse"
                title="Активный сеанс"
              />

              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <motion.button
                    whileHover={{ scale: 1.05 }}
                    whileTap={{ scale: 0.95 }}
                    className="flex items-center justify-center w-10 h-10 bg-slate-100 hover:bg-slate-200 rounded-xl transition-all duration-200 shadow-sm hover:shadow-md"
                  >
                    <MoreVertical className="w-5 h-5 text-slate-600" />
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
                        <UserIcon className="w-4 h-4 mr-3 text-emerald-600" />
                        <span className="text-slate-700">Профиль</span>
                      </DropdownMenuItem>

                      <DropdownMenuItem onClick={handleScheduleClick} className="cursor-pointer">
                        <Calendar className="w-4 h-4 mr-3 text-blue-600" />
                        <span className="text-slate-700">Расписание</span>
                      </DropdownMenuItem>

                      <DropdownMenuItem onClick={handleChatClick} className="cursor-pointer">
                        <MessageCircle className="w-4 h-4 mr-3 text-teal-600" />
                        <span className="text-slate-700">Чат класса</span>
                      </DropdownMenuItem>

                      <DropdownMenuItem onClick={handleForgetSession} className="cursor-pointer">
                        <Trash2 className="w-4 h-4 mr-3 text-amber-600" />
                        <span className="text-slate-700">Забыть сеанс (полный выход)</span>
                      </DropdownMenuItem>

                      <DropdownMenuItem onClick={handleLogout} className="cursor-pointer">
                        <LogOut className="w-4 h-4 mr-3 text-red-600" />
                        <span className="text-slate-700">Выйти (сеанс сохранится)</span>
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
            className="mb-12"
          >
            <div className="mb-6">
              <h2 className="text-2xl font-bold text-slate-900">Активные игры</h2>
              <p className="text-slate-500 mt-1">Присоединяйтесь к происходящим играм или создавайте свою</p>
            </div>
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
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
                    whileHover={{ scale: 1.02, y: -4 }}
                    whileTap={{ scale: 0.98 }}
                    onClick={() => handleJoinGame(game)}
                    className="bg-white rounded-2xl shadow-lg hover:shadow-2xl transition-all duration-300 cursor-pointer border border-slate-200 p-6 group"
                  >
                    <div className="space-y-5">
                      <div className="flex items-start justify-between">
                        <div className="flex items-center space-x-4">
                          <div className="w-14 h-14 bg-gradient-to-br from-emerald-100 to-teal-100 rounded-2xl flex items-center justify-center text-3xl group-hover:scale-110 transition-transform duration-300">
                            {getGameTypeIcon(game.gameType)}
                          </div>
                          <div>
                            <h3 className="text-lg font-bold text-slate-900">
                              {getGameTypeName(game.gameType)}
                            </h3>
                            <p className="text-sm text-slate-500 mt-1 flex items-center">
                              {isCreator && <Crown className="w-3.5 h-3.5 inline mr-1.5 text-amber-500" />}
                              {game.status === 'waiting'
                                ? 'Ожидание игроков'
                                : isInGame
                                  ? `В игре • Номер: ${currentPlayerNumber}`
                                  : 'Игра идёт'
                              }
                            </p>
                          </div>
                        </div>

                        <div className="text-right">
                          <div className="inline-block bg-emerald-50 rounded-lg px-3 py-2">
                            <div className="flex items-center space-x-1.5 text-emerald-700 font-semibold">
                              <Users className="w-4 h-4" />
                              <span>{playerCount}/{game.maxPlayers}</span>
                            </div>
                          </div>
                        </div>
                      </div>

                      <div className="h-px bg-gradient-to-r from-slate-200 to-transparent"></div>

                      <div className="flex items-center justify-between">
                        <div className="flex -space-x-2">
                          {game.players && Object.entries(game.players).slice(0, 4).map(([userId, player], idx) => (
                            <motion.div
                              key={userId}
                              whileHover={{ scale: 1.2, zIndex: 50 }}
                              className="w-8 h-8 bg-gradient-to-br from-emerald-500 to-teal-600 rounded-full flex items-center justify-center border-2 border-white text-white text-xs font-bold hover:shadow-lg transition-shadow cursor-pointer"
                              style={{ zIndex: 4 - idx }}
                              title={player.name}
                            >
                              {player.name.split(' ').map(n => n[0]).slice(0, 2).join('')}
                            </motion.div>
                          ))}
                          {playerCount > 4 && (
                            <div className="w-8 h-8 bg-slate-400 rounded-full flex items-center justify-center border-2 border-white text-white text-xs font-bold">
                              +{playerCount - 4}
                            </div>
                          )}
                        </div>

                        <div className="flex items-center space-x-2 text-slate-500 text-xs">
                          <Clock className="w-3.5 h-3.5" />
                          <span>{formatTimeAgo(game.createdAt || 0)}</span>
                        </div>
                      </div>

                      <div className="flex gap-3 pt-2">
                        <div className="flex-1">
                          <span className={`block px-3 py-2 rounded-lg text-sm font-semibold text-center transition-all ${
                            isInGame
                              ? 'bg-emerald-100 text-emerald-800'
                              : game.status === 'waiting'
                                ? 'bg-blue-100 text-blue-800'
                                : 'bg-amber-100 text-amber-800'
                          }`}>
                            {isInGame
                              ? `Игрок ${currentPlayerNumber}`
                              : game.status === 'waiting'
                                ? 'Присоединиться'
                                : 'Присоединиться'
                            }
                          </span>
                        </div>
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
          className="mb-12"
        >
          <div className="mb-8">
            <h2 className="text-2xl font-bold text-slate-900">Создать новую игру</h2>
            <p className="text-slate-500 mt-1">Выберите тип игры и создайте свою собственную</p>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {gameTypes.map((gameType, index) => (
              <motion.div
                key={gameType.type}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.1 }}
                className="group relative bg-white rounded-2xl shadow-lg hover:shadow-2xl border border-slate-200 overflow-hidden transition-all duration-300"
              >
                <div className={`h-1 bg-gradient-to-r ${gameType.color} opacity-0 group-hover:opacity-100 transition-opacity duration-300`} />
                <div className="p-8">
                  <div className="text-center mb-8">
                    <div className={`w-20 h-20 ${gameType.bgColor} rounded-2xl flex items-center justify-center mx-auto mb-6 text-4xl group-hover:scale-110 transition-transform duration-300`}>
                      {gameType.icon}
                    </div>
                    <h3 className="text-2xl font-bold text-slate-900 mb-3">
                      {gameType.name}
                    </h3>
                    <p className="text-slate-600 text-sm leading-relaxed">
                      {gameType.description}
                    </p>
                    <div className="inline-block mt-4 bg-slate-100 rounded-lg px-3 py-1.5 text-xs font-semibold text-slate-600">
                      До 10 игроков
                    </div>
                  </div>

                  <motion.button
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.98 }}
                    onClick={() => handleCreateGame(gameType.type)}
                    disabled={creatingGame === gameType.type}
                    className={`w-full bg-gradient-to-r ${gameType.color} text-white py-3 px-4 rounded-xl font-semibold shadow-lg hover:shadow-xl transition-all duration-300 disabled:opacity-60 disabled:cursor-not-allowed flex items-center justify-center space-x-2`}
                  >
                    {creatingGame === gameType.type ? (
                      <>
                        <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                        <span>Создание...</span>
                      </>
                    ) : (
                      <>
                        <Plus className="w-5 h-5" />
                        <span>Создать игру</span>
                      </>
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
        >
          <div className="mb-8">
            <h2 className="text-2xl font-bold text-slate-900">Как это работает</h2>
            <p className="text-slate-500 mt-1">Узнайте правила каждой игры</p>
          </div>

          <div className="space-y-4">
            <motion.div
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.35 }}
              className="bg-gradient-to-br from-blue-50 to-cyan-50 rounded-2xl p-6 border border-blue-200 hover:shadow-lg transition-shadow"
            >
              <h4 className="font-bold text-blue-900 mb-3 text-lg flex items-center">
                <span className="text-2xl mr-3">🎭</span>
                Анонимность в играх
              </h4>
              <p className="text-blue-800 leading-relaxed">
                При старте игры всем участникам назначаются случайные номера (Игрок 1, Игрок 2, и т.д.). Это обеспечивает анонимность и делает игры более честными и интересными.
              </p>
            </motion.div>

            <motion.div
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.4 }}
              className="bg-gradient-to-br from-pink-50 to-rose-50 rounded-2xl p-6 border border-pink-200 hover:shadow-lg transition-shadow"
            >
              <h4 className="font-bold text-pink-900 mb-3 text-lg flex items-center">
                <span className="text-2xl mr-3">🎭</span>
                Правда или Действие
              </h4>
              <p className="text-pink-800 leading-relaxed">
                Случайно выбранные игроки задают друг другу вопросы или дают задания. Выберите "Правда" для вопроса или "Действие" для задания. Все действия видны в реальном времени.
              </p>
            </motion.div>

            <motion.div
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.45 }}
              className="bg-gradient-to-br from-amber-50 to-orange-50 rounded-2xl p-6 border border-amber-200 hover:shadow-lg transition-shadow"
            >
              <h4 className="font-bold text-amber-900 mb-3 text-lg flex items-center">
                <span className="text-2xl mr-3">🎲</span>
                Викторина
              </h4>
              <p className="text-amber-800 leading-relaxed">
                Отвечайте на вопросы быстрее других! За каждый правильный ответ начисляются баллы. Все ответы видны в реальном времени. Побеждает игрок с наибольшим количеством баллов. Игроки видят только номера друг друга.
              </p>
            </motion.div>

            <motion.div
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.5 }}
              className="bg-gradient-to-br from-slate-100 to-slate-200 rounded-2xl p-6 border border-slate-300 hover:shadow-lg transition-shadow"
            >
              <h4 className="font-bold text-slate-900 mb-3 text-lg flex items-center">
                <span className="text-2xl mr-3">🕵️</span>
                Мафия
              </h4>
              <p className="text-slate-800 leading-relaxed">
                Психологическая игра в реальном времени с анонимными номерами. Мафия пытается устранить мирных жителей, а мирные жители пытаются найти мафию. Есть специальные роли: врач и детектив. Все голоса и действия синхронизируются онлайн.
              </p>
            </motion.div>
          </div>
        </motion.div>
      </div>
    </div>
  );
}