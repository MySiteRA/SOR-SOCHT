import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ArrowLeft, Users, Crown, Clock, MessageCircle } from 'lucide-react';
import { useNavigate, useParams, useLocation } from 'react-router-dom';
import { useLanguage } from '../contexts/LanguageContext';
import LoadingSpinner from '../components/LoadingSpinner';
import TruthOrDareGame from '../components/games/TruthOrDareGame';
import QuizGame from '../components/games/QuizGame';
import MafiaGame from '../components/games/MafiaGame';
import { 
  joinGame, 
  startGame, 
  getGamePlayers,
  subscribeToGameUpdates,
  subscribeToGamePlayers,
  updateGameInRealtime
} from '../services/gameService';
import type { Student, Game, GamePlayer } from '../lib/supabase';

export default function StudentGamePage() {
  const { t } = useLanguage();
  const navigate = useNavigate();
  const { gameId } = useParams<{ gameId: string }>();
  const location = useLocation();
  
  const { student, className, game: initialGame } = location.state || {};
  
  const [game, setGame] = useState<Game | null>(initialGame);
  const [players, setPlayers] = useState<GamePlayer[]>([]);
  const [isJoined, setIsJoined] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!student || !gameId) {
      navigate('/student-games', { replace: true });
      return;
    }

    loadGameData();
    setupSubscriptions();
  }, [gameId, student]);

  const loadGameData = async () => {
    if (!gameId) return;

    try {
      setLoading(true);
      setError(null);

      // Загружаем участников игры
      const playersData = await getGamePlayers(gameId);
      setPlayers(playersData);

      // Проверяем, присоединился ли уже игрок
      const playerJoined = playersData.some(p => p.player_id === student.id);
      setIsJoined(playerJoined);
    } catch (err) {
      setError('Ошибка загрузки данных игры');
    } finally {
      setLoading(false);
    }
  };

  const setupSubscriptions = () => {
    if (!gameId) return;

    // Подписываемся на обновления игры
    const unsubscribeGame = subscribeToGameUpdates(gameId, (updatedGame) => {
      setGame(updatedGame);
    });

    // Подписываемся на обновления игроков
    const unsubscribePlayers = subscribeToGamePlayers(gameId, (updatedPlayers) => {
      setPlayers(updatedPlayers);
      const playerJoined = updatedPlayers.some(p => p.player_id === student.id);
      setIsJoined(playerJoined);
    });

    return () => {
      unsubscribeGame();
      unsubscribePlayers();
    };
  };

  const handleJoinGame = async () => {
    if (!gameId || !student || isJoined) return;

    try {
      setError(null);
      await joinGame(gameId, student.id, student.name);
      setIsJoined(true);
    } catch (err) {
      setError('Ошибка присоединения к игре');
    }
  };

  const handleStartGame = async () => {
    if (!gameId || !game) return;

    try {
      setError(null);
      await startGame(gameId);
      await updateGameInRealtime(gameId, { status: 'started' });
    } catch (err) {
      setError('Ошибка запуска игры');
    }
  };

  const canStartGame = () => {
    return game?.created_by === student?.id && 
           game?.status === 'waiting' && 
           players.length >= 2;
  };

  const getGameTitle = () => {
    switch (game?.game_type) {
      case 'truth_or_dare':
        return 'Правда или Действие';
      case 'quiz':
        return 'Викторина';
      case 'mafia':
        return 'Мафия';
      default:
        return 'Игра';
    }
  };

  const renderGameComponent = () => {
    if (!game || !student) return null;

    switch (game.game_type) {
      case 'truth_or_dare':
        return (
          <TruthOrDareGame
            game={game}
            players={players}
            currentPlayer={student}
            onError={setError}
          />
        );
      case 'quiz':
        return (
          <QuizGame
            game={game}
            players={players}
            currentPlayer={student}
            onError={setError}
          />
        );
      case 'mafia':
        return (
          <MafiaGame
            game={game}
            players={players}
            currentPlayer={student}
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
                  {getGameTitle()}
                </h1>
                <p className="text-gray-600">{className}</p>
              </div>
            </div>
            
            <div className="flex items-center space-x-4">
              <div className="flex items-center space-x-2 text-sm text-gray-600">
                <Users className="w-4 h-4" />
                <span>{players.length}/{game.max_players}</span>
              </div>
              
              <span className={`px-3 py-1 rounded-full text-sm font-medium ${
                game.status === 'waiting' 
                  ? 'bg-yellow-100 text-yellow-800' 
                  : game.status === 'started'
                    ? 'bg-green-100 text-green-800'
                    : 'bg-gray-100 text-gray-800'
              }`}>
                {game.status === 'waiting' && 'Ожидание'}
                {game.status === 'started' && 'В процессе'}
                {game.status === 'finished' && 'Завершена'}
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
                Ожидаем игроков... ({players.length}/{game.max_players})
              </p>

              {/* Players List */}
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
                {players.map((player, index) => (
                  <motion.div
                    key={player.id}
                    initial={{ opacity: 0, scale: 0.8 }}
                    animate={{ opacity: 1, scale: 1 }}
                    transition={{ delay: index * 0.1 }}
                    className="bg-gray-50 rounded-lg p-4 text-center"
                  >
                    <div className="w-12 h-12 bg-indigo-100 rounded-full flex items-center justify-center mx-auto mb-2">
                      <span className="text-indigo-600 font-bold">
                        {player.player_name.split(' ').map(n => n[0]).slice(0, 2).join('')}
                      </span>
                    </div>
                    <p className="text-sm font-medium text-gray-900 truncate">
                      {player.player_name}
                    </p>
                    {player.player_id === game.created_by && (
                      <Crown className="w-4 h-4 text-yellow-500 mx-auto mt-1" />
                    )}
                  </motion.div>
                ))}
                
                {/* Empty slots */}
                {Array.from({ length: game.max_players - players.length }).map((_, index) => (
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
                  <motion.button
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.98 }}
                    onClick={handleJoinGame}
                    className="bg-indigo-600 text-white px-8 py-3 rounded-xl hover:bg-indigo-700 transition-colors font-medium shadow-lg"
                  >
                    Присоединиться к игре
                  </motion.button>
                ) : canStartGame() ? (
                  <motion.button
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.98 }}
                    onClick={handleStartGame}
                    className="bg-green-600 text-white px-8 py-3 rounded-xl hover:bg-green-700 transition-colors font-medium shadow-lg"
                  >
                    Начать игру
                  </motion.button>
                ) : (
                  <div className="text-gray-600">
                    {players.length < 2 
                      ? 'Ожидаем еще игроков...' 
                      : 'Ожидаем начала игры...'
                    }
                  </div>
                )}
              </div>
            </div>
          </motion.div>
        )}

        {/* Game Content */}
        {game.status === 'started' && isJoined && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
          >
            {renderGameComponent()}
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