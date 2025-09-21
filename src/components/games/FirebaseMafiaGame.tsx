import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Moon, Sun, Users, Eye, Heart, Shield, Skull, Vote, Clock, Crown, EyeOff, Settings, Plus, Minus, AlertTriangle } from 'lucide-react';
import { 
  subscribeToGameMoves,
  addGameMove,
  submitMafiaVote,
  updateGameSettings,
  validateGameSettings,
  getPlayerByNumber,
  getPlayerNumber,
  type FirebaseGame,
  type FirebasePlayer,
  type FirebaseMove
} from '../../services/firebaseGameService';
import type { Student } from '../../lib/supabase';

type GamePhase = 'night' | 'day' | 'voting' | 'results';

interface GameSettings {
  mafia: number;
  doctor: number;
  detective: number;
}
interface FirebaseMafiaGameProps {
  game: FirebaseGame;
  players: { [userId: string]: FirebasePlayer };
  currentPlayer: Student;
  gameId: string;
  onError: (error: string) => void;
}

export default function FirebaseMafiaGame({ 
  game, 
  players, 
  currentPlayer, 
  gameId, 
  onError 
}: FirebaseMafiaGameProps) {
  const [moves, setMoves] = useState<(FirebaseMove & { id: string })[]>([]);
  const [gamePhase, setGamePhase] = useState<GamePhase>('night');
  const [roundNumber, setRoundNumber] = useState(1);
  const [selectedTarget, setSelectedTarget] = useState<number | null>(null);
  const [votes, setVotes] = useState<{[playerNumber: number]: number}>({});
  const [hasVoted, setHasVoted] = useState(false);
  const [phaseTimeLeft, setPhaseTimeLeft] = useState(0);
  const [showPlayerNumbers, setShowPlayerNumbers] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const [gameSettings, setGameSettings] = useState<GameSettings>({
    mafia: 1,
    doctor: 1,
    detective: 1
  });
  const [settingsLoading, setSettingsLoading] = useState(false);

  const currentPlayerNumber = getPlayerNumber(players, currentPlayer.id);
  const currentPlayerData = players[currentPlayer.id];
  
  const playersArray = Object.entries(players).map(([userId, player]) => ({
    userId,
    ...player
  })).sort((a, b) => a.number - b.number);

  const alivePlayers = playersArray.filter(p => p.isAlive !== false);
  const mafiaPlayers = playersArray.filter(p => p.role === 'mafia' && p.isAlive !== false);
  const civilianPlayers = playersArray.filter(p => p.role !== 'mafia' && p.isAlive !== false);
  
  const isGameCreator = game.creatorId === currentPlayer.id;
  const playerCount = Object.keys(players).length;

  // Загружаем настройки игры при инициализации
  useEffect(() => {
    if (game.settings) {
      setGameSettings(game.settings);
    }
  }, [game.settings]);
  useEffect(() => {
    // Подписываемся на ходы игры
    const unsubscribe = subscribeToGameMoves(gameId, (move) => {
      setMoves(prev => [...prev, move]);
      
      if (move.type === 'vote') {
        setVotes(prev => ({
          ...prev,
          [move.playerNumber]: move.metadata?.targetNumber
        }));
      }
      
      if (move.type === 'phase_change') {
        setGamePhase(move.metadata?.phase || 'night');
        setRoundNumber(move.metadata?.round || 1);
        setVotes({});
        setHasVoted(false);
        setSelectedTarget(null);
        setPhaseTimeLeft(move.metadata?.timeLimit || 0);
      }
      
      if (move.type === 'player_eliminated') {
        // Игрок исключен - обновляется через подписку на players
      }
    });

    return unsubscribe;
  }, [gameId]);

  useEffect(() => {
    if (phaseTimeLeft > 0) {
      const timer = setTimeout(() => setPhaseTimeLeft(phaseTimeLeft - 1), 1000);
      return () => clearTimeout(timer);
    }
  }, [phaseTimeLeft]);

  const handleSettingsUpdate = async () => {
    try {
      setSettingsLoading(true);
      
      const validation = validateGameSettings(playerCount, gameSettings);
      if (!validation.valid) {
        onError(validation.error || 'Неверные настройки');
        return;
      }
      
      await updateGameSettings(gameId, gameSettings);
      setShowSettings(false);
      
      // Добавляем системное сообщение об изменении настроек
      await addGameMove(
        gameId,
        currentPlayer.id,
        currentPlayer.name,
        currentPlayerNumber,
        'system',
        `Настройки обновлены: Мафий: ${gameSettings.mafia}, Врачей: ${gameSettings.doctor}, Детективов: ${gameSettings.detective}`
      );
    } catch (err) {
      onError('Ошибка обновления настроек');
    } finally {
      setSettingsLoading(false);
    }
  };
  const handleVote = async (targetNumber: number) => {
    if (hasVoted || !canVote()) return;

    try {
      await submitMafiaVote(
        gameId,
        currentPlayer.id,
        currentPlayer.name,
        currentPlayerNumber,
        targetNumber,
        gamePhase === 'night' ? 'night' : 'day',
        currentPlayerData?.role
      );

      setSelectedTarget(targetNumber);
      setHasVoted(true);
    } catch (err) {
      onError('Ошибка голосования');
    }
  };

  const getRoleIcon = (role: string) => {
    switch (role) {
      case 'mafia':
        return <Skull className="w-4 h-4 text-red-600" />;
      case 'doctor':
        return <Heart className="w-4 h-4 text-green-600" />;
      case 'detective':
        return <Eye className="w-4 h-4 text-blue-600" />;
      default:
        return <Shield className="w-4 h-4 text-gray-600" />;
    }
  };

  const getRoleName = (role: string) => {
    switch (role) {
      case 'mafia':
        return 'Мафия';
      case 'doctor':
        return 'Врач';
      case 'detective':
        return 'Детектив';
      default:
        return 'Мирный житель';
    }
  };

  const getRoleDescription = (role: string) => {
    switch (role) {
      case 'mafia':
        return 'Ночью выбирайте жертву. Днем притворяйтесь мирным жителем.';
      case 'doctor':
        return 'Ночью можете спасти одного игрока от мафии.';
      case 'detective':
        return 'Ночью можете проверить роль одного игрока.';
      default:
        return 'Днем голосуйте против подозрительных игроков.';
    }
  };

  const canVote = () => {
    if (!currentPlayerData || currentPlayerData.isAlive === false) return false;
    
    if (gamePhase === 'night') {
      return currentPlayerData.role === 'mafia' || 
             currentPlayerData.role === 'doctor' || 
             currentPlayerData.role === 'detective';
    }
    
    return gamePhase === 'voting' || gamePhase === 'day';
  };

  const getVotingTargets = () => {
    if (gamePhase === 'night') {
      if (currentPlayerData?.role === 'mafia') {
        return civilianPlayers.filter(p => p.userId !== currentPlayer.id);
      } else if (currentPlayerData?.role === 'doctor') {
        return alivePlayers;
      } else if (currentPlayerData?.role === 'detective') {
        return alivePlayers.filter(p => p.userId !== currentPlayer.id);
      }
    } else if (gamePhase === 'voting' || gamePhase === 'day') {
      return alivePlayers.filter(p => p.userId !== currentPlayer.id);
    }
    
    return [];
  };

  const getPhaseTitle = () => {
    switch (gamePhase) {
      case 'night':
        return '🌙 Ночь';
      case 'day':
        return '☀️ День - Обсуждение';
      case 'voting':
        return '🗳️ Голосование';
      default:
        return 'Игра';
    }
  };

  const getPhaseDescription = () => {
    switch (gamePhase) {
      case 'night':
        return 'Особые роли выполняют свои действия';
      case 'day':
        return 'Обсуждение подозрительных игроков';
      case 'voting':
        return 'Голосование за исключение игрока';
      default:
        return '';
    }
  };

  const getPlayerDisplayName = (playerNumber: number) => {
    if (showPlayerNumbers) {
      const playerData = getPlayerByNumber(players, playerNumber);
      return playerData ? playerData.player.name : `Игрок ${playerNumber}`;
    }
    return `Игрок ${playerNumber}`;
  };

  // Если игра еще не началась и мы создатель
  if (game.status === 'waiting' && isGameCreator) {
    const validation = validateGameSettings(playerCount, gameSettings);
    
    return (
      <div className="space-y-6">
        {/* Game Settings */}
        <div className="bg-white rounded-xl shadow-lg border border-gray-100 p-6">
          <div className="flex items-center justify-between mb-6">
            <h3 className="text-lg font-semibold text-gray-900 flex items-center space-x-2">
              <Settings className="w-5 h-5 text-indigo-600" />
              <span>Настройки игры</span>
            </h3>
            
            <div className="text-sm text-gray-600">
              Игроков: {playerCount}/{game.maxPlayers}
            </div>
          </div>
          
          <div className="space-y-6">
            {/* Role Settings */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              {/* Mafia */}
              <div className="bg-red-50 rounded-lg p-4 border border-red-200">
                <div className="flex items-center space-x-2 mb-3">
                  <Skull className="w-5 h-5 text-red-600" />
                  <h4 className="font-semibold text-red-900">Мафия</h4>
                </div>
                <div className="flex items-center space-x-3">
                  <button
                    onClick={() => setGameSettings(prev => ({ ...prev, mafia: Math.max(1, prev.mafia - 1) }))}
                    disabled={gameSettings.mafia <= 1}
                    className="w-8 h-8 bg-red-600 text-white rounded-full flex items-center justify-center hover:bg-red-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                  >
                    <Minus className="w-4 h-4" />
                  </button>
                  <span className="text-2xl font-bold text-red-900 w-8 text-center">
                    {gameSettings.mafia}
                  </span>
                  <button
                    onClick={() => setGameSettings(prev => ({ ...prev, mafia: Math.min(3, prev.mafia + 1) }))}
                    disabled={gameSettings.mafia >= 3}
                    className="w-8 h-8 bg-red-600 text-white rounded-full flex items-center justify-center hover:bg-red-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                  >
                    <Plus className="w-4 h-4" />
                  </button>
                </div>
                <p className="text-xs text-red-700 mt-2">1-3 мафии</p>
              </div>
              
              {/* Doctor */}
              <div className="bg-green-50 rounded-lg p-4 border border-green-200">
                <div className="flex items-center space-x-2 mb-3">
                  <Heart className="w-5 h-5 text-green-600" />
                  <h4 className="font-semibold text-green-900">Врач</h4>
                </div>
                <div className="flex items-center space-x-3">
                  <button
                    onClick={() => setGameSettings(prev => ({ ...prev, doctor: Math.max(0, prev.doctor - 1) }))}
                    disabled={gameSettings.doctor <= 0}
                    className="w-8 h-8 bg-green-600 text-white rounded-full flex items-center justify-center hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                  >
                    <Minus className="w-4 h-4" />
                  </button>
                  <span className="text-2xl font-bold text-green-900 w-8 text-center">
                    {gameSettings.doctor}
                  </span>
                  <button
                    onClick={() => setGameSettings(prev => ({ ...prev, doctor: Math.min(1, prev.doctor + 1) }))}
                    disabled={gameSettings.doctor >= 1}
                    className="w-8 h-8 bg-green-600 text-white rounded-full flex items-center justify-center hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                  >
                    <Plus className="w-4 h-4" />
                  </button>
                </div>
                <p className="text-xs text-green-700 mt-2">0-1 врач</p>
              </div>
              
              {/* Detective */}
              <div className="bg-blue-50 rounded-lg p-4 border border-blue-200">
                <div className="flex items-center space-x-2 mb-3">
                  <Eye className="w-5 h-5 text-blue-600" />
                  <h4 className="font-semibold text-blue-900">Детектив</h4>
                </div>
                <div className="flex items-center space-x-3">
                  <button
                    onClick={() => setGameSettings(prev => ({ ...prev, detective: Math.max(0, prev.detective - 1) }))}
                    disabled={gameSettings.detective <= 0}
                    className="w-8 h-8 bg-blue-600 text-white rounded-full flex items-center justify-center hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                  >
                    <Minus className="w-4 h-4" />
                  </button>
                  <span className="text-2xl font-bold text-blue-900 w-8 text-center">
                    {gameSettings.detective}
                  </span>
                  <button
                    onClick={() => setGameSettings(prev => ({ ...prev, detective: Math.min(2, prev.detective + 1) }))}
                    disabled={gameSettings.detective >= 2}
                    className="w-8 h-8 bg-blue-600 text-white rounded-full flex items-center justify-center hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                  >
                    <Plus className="w-4 h-4" />
                  </button>
                </div>
                <p className="text-xs text-blue-700 mt-2">0-2 детектива</p>
              </div>
            </div>
            
            {/* Settings Summary */}
            <div className="bg-gray-50 rounded-lg p-4 border border-gray-200">
              <h4 className="font-semibold text-gray-900 mb-3">Итого ролей:</h4>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                <div className="text-center">
                  <div className="text-red-600 font-bold text-lg">{gameSettings.mafia}</div>
                  <div className="text-gray-600">Мафия</div>
                </div>
                <div className="text-center">
                  <div className="text-green-600 font-bold text-lg">{gameSettings.doctor}</div>
                  <div className="text-gray-600">Врач</div>
                </div>
                <div className="text-center">
                  <div className="text-blue-600 font-bold text-lg">{gameSettings.detective}</div>
                  <div className="text-gray-600">Детектив</div>
                </div>
                <div className="text-center">
                  <div className="text-gray-600 font-bold text-lg">
                    {Math.max(0, playerCount - gameSettings.mafia - gameSettings.doctor - gameSettings.detective)}
                  </div>
                  <div className="text-gray-600">Мирные</div>
                </div>
              </div>
            </div>
            
            {/* Validation Message */}
            {!validation.valid && (
              <div className="bg-red-50 rounded-lg p-4 border border-red-200">
                <div className="flex items-center space-x-2">
                  <AlertTriangle className="w-5 h-5 text-red-600" />
                  <span className="text-red-800 font-medium">{validation.error}</span>
                </div>
              </div>
            )}
            
            {validation.valid && (
              <div className="bg-green-50 rounded-lg p-4 border border-green-200">
                <div className="flex items-center space-x-2">
                  <Shield className="w-5 h-5 text-green-600" />
                  <span className="text-green-800 font-medium">
                    Настройки корректны! Можно начинать игру.
                  </span>
                </div>
              </div>
            )}
            
            {/* Save Settings Button */}
            <div className="flex space-x-3">
              <button
                onClick={handleSettingsUpdate}
                disabled={settingsLoading || !validation.valid}
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
            </div>
          </div>
        </div>
        
        {/* Players List */}
        <div className="bg-white rounded-xl shadow-lg border border-gray-100 p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center space-x-2">
            <Users className="w-5 h-5 text-indigo-600" />
            <span>Игроки в комнате ({playerCount}/{game.maxPlayers})</span>
          </h3>
          
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {playersArray.map((player, index) => (
              <div
                key={player.userId}
                className="p-4 rounded-lg border border-gray-200 bg-gray-50 text-center"
              >
                <div className="w-12 h-12 bg-gradient-to-br from-indigo-500 to-purple-600 rounded-full flex items-center justify-center mx-auto mb-2 text-white font-bold">
                  {player.name.split(' ').map(n => n[0]).slice(0, 2).join('')}
                </div>
                <p className="text-sm font-medium text-gray-900 truncate">
                  {player.name}
                </p>
                {player.userId === game.creatorId && (
                  <Crown className="w-4 h-4 text-yellow-500 mx-auto mt-1" />
                )}
                <div className="text-xs text-gray-500 mt-1">
                  Получит роль при старте
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    );
  }
  return (
    <div className="space-y-6">
      {/* Game Status */}
      <div className="bg-white rounded-xl shadow-lg border border-gray-100 p-6">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center space-x-3">
            {gamePhase === 'night' ? (
              <Moon className="w-6 h-6 text-indigo-600" />
            ) : (
              <Sun className="w-6 h-6 text-yellow-500" />
            )}
            <div>
              <h3 className="text-lg font-semibold text-gray-900">
                Раунд {roundNumber} - {getPhaseTitle()}
              </h3>
              <p className="text-sm text-gray-600">
                {getPhaseDescription()}
              </p>
            </div>
          </div>
          
          <div className="flex items-center space-x-4">
            <button
              onClick={() => setShowPlayerNumbers(!showPlayerNumbers)}
              className="flex items-center space-x-2 text-sm text-gray-600 hover:text-indigo-600 bg-gray-100 hover:bg-indigo-50 px-3 py-2 rounded-lg transition-colors"
            >
              {showPlayerNumbers ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              <span>{showPlayerNumbers ? 'Скрыть имена' : 'Показать имена'}</span>
            </button>
            
            <div className="text-right">
              <div className="text-sm text-gray-600 mb-1">
                <div>Мафия: {mafiaPlayers.length}</div>
                <div>Мирные: {civilianPlayers.length}</div>
              </div>
              {phaseTimeLeft > 0 && (
                <div className="flex items-center space-x-1 text-sm text-orange-600">
                  <Clock className="w-4 h-4" />
                  <span>{phaseTimeLeft}с</span>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Player Role */}
        {currentPlayerData && (
          <div className="bg-gray-50 rounded-lg p-4 mb-4">
            <div className="flex items-center space-x-3">
              {getRoleIcon(currentPlayerData.role || 'civilian')}
              <div>
                <h4 className="font-semibold text-gray-900">
                  Ваша роль: {getRoleName(currentPlayerData.role || 'civilian')} (Игрок {currentPlayerNumber})
                </h4>
                <p className="text-sm text-gray-600">
                  {getRoleDescription(currentPlayerData.role || 'civilian')}
                </p>
              </div>
            </div>
          </div>
        )}

        {/* Voting Interface */}
        {canVote() && !hasVoted && (
          <div className="space-y-4">
            <div className="bg-yellow-50 rounded-lg p-4 border border-yellow-200">
              <p className="text-yellow-800 font-medium text-center">
                {gamePhase === 'night' 
                  ? `🌙 Выберите цель для ${currentPlayerData?.role === 'mafia' ? 'устранения' : 'действия'}`
                  : '☀️ Выберите игрока для голосования'
                }
              </p>
            </div>
            
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              {getVotingTargets().map(player => (
                <button
                  key={player.userId}
                  onClick={() => handleVote(player.number)}
                  className={`p-3 rounded-lg border transition-colors ${
                    selectedTarget === player.number
                      ? 'border-red-500 bg-red-50 text-red-700'
                      : 'border-gray-200 hover:border-red-300 hover:bg-red-50'
                  }`}
                >
                  <div className="w-8 h-8 bg-gradient-to-br from-indigo-500 to-purple-600 rounded-full flex items-center justify-center mx-auto mb-2 text-white font-bold text-sm">
                    {player.number}
                  </div>
                  <div className="text-xs font-medium truncate">
                    {getPlayerDisplayName(player.number)}
                  </div>
                </button>
              ))}
            </div>
          </div>
        )}

        {hasVoted && (
          <div className="bg-green-50 rounded-lg p-4 border border-green-200 text-center">
            <p className="text-green-800 font-medium">
              ✅ Ваш голос учтен. Ожидаем остальных игроков...
            </p>
          </div>
        )}
      </div>

      {/* Players Grid */}
      <div className="bg-white rounded-xl shadow-lg border border-gray-100 p-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center space-x-2">
          <Users className="w-5 h-5 text-indigo-600" />
          <span>Игроки ({alivePlayers.length} живых)</span>
        </h3>
        
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {playersArray.map((player, index) => {
            const isCurrentPlayer = player.userId === currentPlayer.id;
            const hasVotedForThis = Object.values(votes).includes(player.number);
            
            return (
              <motion.div
                key={player.userId}
                initial={{ opacity: 0, scale: 0.8 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ delay: index * 0.05 }}
                className={`p-4 rounded-lg border-2 transition-all ${
                  player.isAlive === false
                    ? 'border-red-200 bg-red-50 opacity-60'
                    : isCurrentPlayer
                      ? 'border-indigo-500 bg-indigo-50'
                      : selectedTarget === player.number
                        ? 'border-orange-500 bg-orange-50'
                        : 'border-gray-200 bg-gray-50'
                }`}
              >
                <div className="text-center">
                  <div className="w-12 h-12 bg-gradient-to-br from-indigo-500 to-purple-600 rounded-full flex items-center justify-center mx-auto mb-2 relative text-white font-bold">
                    {player.number}
                    {player.isAlive === false && (
                      <div className="absolute inset-0 bg-red-500 bg-opacity-50 rounded-full flex items-center justify-center">
                        <Skull className="w-6 h-6 text-white" />
                      </div>
                    )}
                    {hasVotedForThis && (
                      <div className="absolute -top-1 -right-1 w-4 h-4 bg-red-500 rounded-full flex items-center justify-center">
                        <Vote className="w-2 h-2 text-white" />
                      </div>
                    )}
                  </div>
                  <p className="text-sm font-medium text-gray-900 truncate">
                    {showPlayerNumbers ? player.name : `Игрок ${player.number}`}
                  </p>
                  {isCurrentPlayer && (
                    <div className="text-xs text-indigo-600 font-medium mt-1">Это вы</div>
                  )}
                  {player.userId === game.creatorId && (
                    <div className="flex items-center justify-center mt-1">
                      <Crown className="w-3 h-3 text-yellow-500" />
                    </div>
                  )}
                  {/* Показываем роль только если игрок мертв или игра закончена */}
                  {(player.isAlive === false || game.status === 'finished') && player.role && (
                    <div className="flex items-center justify-center space-x-1 mt-1">
                      {getRoleIcon(player.role)}
                      <span className="text-xs text-gray-600">
                        {getRoleName(player.role)}
                      </span>
                    </div>
                  )}
                </div>
              </motion.div>
            );
          })}
        </div>
      </div>

      {/* Game Events */}
      <div className="bg-white rounded-xl shadow-lg border border-gray-100 p-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center space-x-2">
          <MessageCircle className="w-5 h-5 text-indigo-600" />
          <span>События игры</span>
        </h3>
        
        <div className="space-y-3 max-h-64 overflow-y-auto">
          {moves.length === 0 ? (
            <div className="text-center py-8 text-gray-500">
              События игры будут отображаться здесь
            </div>
          ) : (
            moves.map((move, index) => (
              <motion.div
                key={move.id}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.02 }}
                className={`p-3 rounded-lg ${
                  move.type === 'system' 
                    ? 'bg-blue-50 border border-blue-200' 
                    : move.type === 'vote'
                      ? 'bg-red-50 border border-red-200'
                      : 'bg-gray-50 border border-gray-200'
                }`}
              >
                <div className="text-sm">
                  {move.type !== 'system' && move.playerNumber > 0 && (
                    <span className="font-medium text-gray-900">
                      Игрок {move.playerNumber}:{' '}
                    </span>
                  )}
                  <span className="text-gray-700">{move.content}</span>
                </div>
                <div className="text-xs text-gray-500 mt-1">
                  {new Date(move.createdAt).toLocaleTimeString('ru-RU', {
                    hour: '2-digit',
                    minute: '2-digit'
                  })}
                </div>
              </motion.div>
            ))
          )}
        </div>
      </div>

      {/* Game Instructions */}
      <div className="bg-gradient-to-r from-gray-50 to-gray-100 rounded-xl p-6 border border-gray-200">
        <h4 className="font-semibold text-gray-900 mb-3">Как играть:</h4>
        <div className="space-y-2 text-sm text-gray-700">
          <p>🎭 <strong>Анонимность:</strong> Все игроки получают случайные номера</p>
          <p>🌙 <strong>Ночь:</strong> Мафия выбирает жертву, врач может спасти, детектив проверяет роль</p>
          <p>☀️ <strong>День:</strong> Все игроки обсуждают и голосуют за исключение подозрительного</p>
          <p>🎯 <strong>Цель мафии:</strong> Устранить всех мирных жителей</p>
          <p>🛡️ <strong>Цель мирных:</strong> Найти и исключить всю мафию</p>
          <p>👁️ <strong>Имена:</strong> Можно показать/скрыть настоящие имена игроков</p>
        </div>
      </div>
    </div>
  );
}