import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Moon, Sun, Users, Eye, Heart, Shield, Skull, LogOut, Crown, Vote, AlertTriangle, Timer, MessageCircle, CheckCircle, Settings } from 'lucide-react';
import { 
  subscribeToGameMoves,
  addGameMove,
  getPlayerByNumber,
  getPlayerNumber,
  leaveGame,
  type FirebaseGame,
  type FirebasePlayer,
  type FirebaseMove
} from '../../services/firebaseGameService';
import PhaseTransition from '../effects/PhaseTransition';
import MafiaKillAnimation from '../effects/MafiaKillAnimation';
import AtmosphereBackground from '../effects/AtmosphereBackground';
import VotingCard from '../effects/VotingCard';
import type { Student } from '../../lib/supabase';

type GamePhase = 'night' | 'day' | 'voting' | 'results';

interface FirebaseMafiaGameProps {
  game: FirebaseGame;
  players: { [userId: string]: FirebasePlayer };
  currentPlayer: Student;
  gameId: string;
  onError: (error: string) => void;
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
  const [nightActions, setNightActions] = useState<{[playerNumber: number]: boolean}>({});
  const [dayVotes, setDayVotes] = useState<{[playerNumber: number]: number}>({});
  const [showPhaseTransition, setShowPhaseTransition] = useState(false);
  const [showKillAnimation, setShowKillAnimation] = useState(false);
  const [killedPlayerName, setKilledPlayerName] = useState('');
  const [leavingGame, setLeavingGame] = useState(false);
  const [phaseTimer, setPhaseTimer] = useState(0);
  const [autoPhaseEnabled, setAutoPhaseEnabled] = useState(true);
  const [showMobileMenu, setShowMobileMenu] = useState(false);
  const [isMobile, setIsMobile] = useState(false);
  const [isDarkMode, setIsDarkMode] = useState(false);
  
  const currentPlayerNumber = getPlayerNumber(players, currentPlayer.id);
  const currentPlayerData = players[currentPlayer.id];
  const showPlayerNames = game.settings?.anonymity === false;
  
  // Оптимизация: мемоизация массива игроков
  const playersArray = React.useMemo(() => Object.entries(players).map(([userId, player]) => ({
    userId,
    ...player
  })).sort((a, b) => a.number - b.number), [players]);
  
  const alivePlayers = playersArray.filter(p => p.isAlive !== false);
  const mafiaPlayers = alivePlayers.filter(p => p.role === 'mafia');
  const civilianPlayers = alivePlayers.filter(p => p.role !== 'mafia');

  // Detect mobile device
  useEffect(() => {
    const checkMobile = () => {
      setIsMobile(window.innerWidth < 768);
    };
    
    checkMobile();
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

  // Проверяем, все ли выполнили свои ночные действия
  const checkNightActionsComplete = () => {
    const activeRoles = alivePlayers.filter(p => 
      p.role === 'mafia' || p.role === 'doctor' || p.role === 'detective'
    );
    
    return activeRoles.every(player => nightActions[player.number] === true);
  };

  // Проверяем, все ли проголосовали днем
  const checkDayVotesComplete = () => {
    return alivePlayers.every(player => dayVotes[player.number] !== undefined);
  };

  // Автоматическая смена фаз
  useEffect(() => {
    if (!autoPhaseEnabled) return;

    if (gamePhase === 'night' && checkNightActionsComplete()) {
      // Все выполнили ночные действия, переходим к дню
      setTimeout(() => {
        switchToDay();
      }, 2000);
    } else if (gamePhase === 'day' && checkDayVotesComplete()) {
      // Все проголосовали, обрабатываем результаты и переходим к ночи
      setTimeout(() => {
        processVotingResults();
      }, 3000);
    }
  }, [gamePhase, nightActions, dayVotes, autoPhaseEnabled]);

  // Таймер фазы
  useEffect(() => {
    if (phaseTimer > 0) {
      const timer = setTimeout(() => setPhaseTimer(phaseTimer - 1), 1000);
      return () => clearTimeout(timer);
    } else if (phaseTimer === 0 && autoPhaseEnabled) {
      // Время фазы истекло, принудительно переключаем
      if (gamePhase === 'night') {
        switchToDay();
      } else if (gamePhase === 'day') {
        processVotingResults();
      }
    }
  }, [phaseTimer, gamePhase, autoPhaseEnabled]);
  useEffect(() => {
    // Подписываемся на ходы игры
    const unsubscribe = subscribeToGameMoves(gameId, (move) => {
      // Оптимизация: проверяем дубликаты
      setMoves(prev => {
        if (prev.some(m => m.id === move.id)) return prev;
        return [...prev, move];
      });
      
      if (move.type === 'vote') {
        if (move.metadata?.voteType === 'night') {
          // Ночное действие
          setNightActions(prev => ({
            ...prev,
            [move.playerNumber]: true
          }));
        } else {
          // Дневное голосование
          setDayVotes(prev => ({
            ...prev,
            [move.playerNumber]: move.metadata?.targetNumber
          }));
        }
      }
      
      if (move.type === 'kill' && move.metadata?.victimName) {
        setKilledPlayerName(move.metadata.victimName);
        setShowKillAnimation(true);
        
        setTimeout(() => {
          setShowKillAnimation(false);
          // Убийство засчитывается как ночное действие мафии
          setNightActions(prev => ({
            ...prev,
            [move.playerNumber]: true
          }));
        }, 3000);
      }
      
      if (move.type === 'phase_change') {
        const newPhase = move.metadata?.phase;
        if (newPhase) {
          setGamePhase(newPhase);
          setPhaseTimer(newPhase === 'night' ? 120 : 180); // 2 минуты ночь, 3 минуты день
          setShowPhaseTransition(true);
          
          // Сбрасываем действия при смене фазы
          if (newPhase === 'night') {
            setNightActions({});
            setDayVotes({});
          } else if (newPhase === 'day') {
            setNightActions({});
          }
          
          setTimeout(() => {
            setShowPhaseTransition(false);
          }, 4000);
        }
      }
    });

    return unsubscribe;
  }, [gameId]);

  // Обработка результатов голосования
  const processVotingResults = async () => {
    const voteCounts: {[playerNumber: number]: number} = {};
    
    // Подсчитываем голоса
    Object.values(dayVotes).forEach(targetNumber => {
      voteCounts[targetNumber] = (voteCounts[targetNumber] || 0) + 1;
    });
    
    // Находим игрока с наибольшим количеством голосов
    let maxVotes = 0;
    let eliminatedPlayer: number | null = null;
    
    Object.entries(voteCounts).forEach(([playerNumber, voteCount]) => {
      if (voteCount > maxVotes) {
        maxVotes = voteCount;
        eliminatedPlayer = parseInt(playerNumber);
      }
    });
    
    if (eliminatedPlayer && maxVotes > 0) {
      // Исключаем игрока
      await addGameMove(
        gameId,
        'system',
        'Система',
        0,
        'elimination',
        `Игрок ${eliminatedPlayer} исключен голосованием (${maxVotes} голосов)`,
        { 
          eliminatedPlayer,
          voteCount: maxVotes,
          votes: dayVotes
        }
      );
      
      // Показываем анимацию исключения
      const playerData = getPlayerByNumber(players, eliminatedPlayer);
      if (playerData) {
        setKilledPlayerName(getPlayerDisplayName(eliminatedPlayer));
        setShowKillAnimation(true);
        
        setTimeout(() => {
          setShowKillAnimation(false);
          switchToNight();
        }, 3000);
      }
    } else {
      // Никого не исключили, сразу переходим к ночи
      await addGameMove(
        gameId,
        'system',
        'Система',
        0,
        'no_elimination',
        'Голоса разделились. Никто не исключен.',
        { votes: dayVotes }
      );
      
      setTimeout(() => {
        switchToNight();
      }, 2000);
    }
  };
  const handleVote = async (targetNumber: number) => {
    if (!currentPlayerData?.isAlive || selectedTarget === targetNumber) return;

    try {
      setSelectedTarget(targetNumber);
      
      const targetPlayer = getPlayerByNumber(players, targetNumber);
      if (!targetPlayer) return;

      await addGameMove(
        gameId,
        currentPlayer.id,
        currentPlayer.name,
        currentPlayerNumber,
        'vote',
        `Игрок ${currentPlayerNumber} голосует против Игрока ${targetNumber}`,
        { 
          targetNumber,
          voteType: gamePhase === 'night' ? 'night' : 'day',
          role: currentPlayerData.role
        }
      );

      // Если это ночное убийство мафией
      if (gamePhase === 'night' && currentPlayerData.role === 'mafia') {
        await addGameMove(
          gameId,
          currentPlayer.id,
          currentPlayer.name,
          currentPlayerNumber,
          'kill',
          `Игрок ${targetNumber} был убит мафией`,
          { 
            victimNumber: targetNumber,
            victimName: getPlayerDisplayName(targetNumber)
          }
        );
      }
    } catch (err) {
      onError('Ошибка голосования');
    }
  };

  const switchToDay = async () => {
    setGamePhase('day');
    setRoundNumber(prev => prev + 1);
    setSelectedTarget(null);
    setPhaseTimer(180); // 3 минуты на день
    
    await addGameMove(
      gameId,
      'system',
      'Система',
      0,
      'phase_change',
      `Раунд ${roundNumber + 1} - День. Обсуждение и голосование.`,
      { phase: 'day', round: roundNumber + 1 }
    );
  };

  const switchToNight = async () => {
    setGamePhase('night');
    setSelectedTarget(null);
    setPhaseTimer(120); // 2 минуты на ночь
    
    await addGameMove(
      gameId,
      'system',
      'Система',
      0,
      'phase_change',
      `Раунд ${roundNumber} - Ночь. Мафия выбирает жертву.`,
      { phase: 'night', round: roundNumber }
    );
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

  const getRoleDescription = (role: string, phase: GamePhase) => {
    switch (role) {
      case 'mafia':
        return phase === 'night' ? 'Выберите жертву для устранения' : 'Притворяйтесь мирным жителем';
      case 'doctor':
        return phase === 'night' ? 'Выберите игрока для спасения' : 'Участвуйте в обсуждении';
      case 'detective':
        return phase === 'night' ? 'Выберите игрока для проверки роли' : 'Используйте полученную информацию';
      default:
        return phase === 'night' ? 'Спите спокойно' : 'Найдите и изгоните мафию';
    }
  };

  const canVote = () => {
    if (!currentPlayerData?.isAlive) return false;
    
    if (gamePhase === 'night') {
      return currentPlayerData.role === 'mafia' || 
             currentPlayerData.role === 'doctor' || 
             currentPlayerData.role === 'detective';
    }
    
    return gamePhase === 'day' || gamePhase === 'voting';
  };

  const getVotingTargets = () => {
    if (gamePhase === 'night') {
      if (currentPlayerData?.role === 'mafia') {
        return alivePlayers.filter(p => p.role !== 'mafia');
      } else if (currentPlayerData?.role === 'doctor') {
        return alivePlayers;
      } else if (currentPlayerData?.role === 'detective') {
        return alivePlayers.filter(p => p.userId !== currentPlayer.id);
      }
    } else if (gamePhase === 'day' || gamePhase === 'voting') {
      return alivePlayers.filter(p => p.userId !== currentPlayer.id);
    }
    
    return [];
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

  const getVotesAgainst = (playerNumber: number) => {
    if (gamePhase === 'night') {
      return 0; // Ночные действия не показываем
    }
    return Object.values(dayVotes).filter(vote => vote === playerNumber).length;
  };

  // Получаем статус действия игрока
  const getPlayerActionStatus = (playerNumber: number) => {
    if (gamePhase === 'night') {
      return nightActions[playerNumber] ? 'completed' : 'waiting';
    } else {
      return dayVotes[playerNumber] !== undefined ? 'completed' : 'waiting';
    }
  };

  // Получаем прогресс фазы
  const getPhaseProgress = () => {
    if (gamePhase === 'night') {
      const activeRoles = alivePlayers.filter(p => 
        p.role === 'mafia' || p.role === 'doctor' || p.role === 'detective'
      );
      const completedActions = activeRoles.filter(p => nightActions[p.number]).length;
      return { completed: completedActions, total: activeRoles.length };
    } else {
      const completedVotes = alivePlayers.filter(p => dayVotes[p.number] !== undefined).length;
      return { completed: completedVotes, total: alivePlayers.length };
    }
  };

  // Мемоизированные компоненты для оптимизации
  const MobileMenu = React.memo(() => (
    <AnimatePresence>
      {showMobileMenu && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50"
          onClick={() => setShowMobileMenu(false)}
        >
          <motion.div
            initial={{ opacity: 0, scale: 0.9, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.9, y: 20 }}
            onClick={(e) => e.stopPropagation()}
            className="bg-white dark:bg-gray-800 rounded-2xl shadow-2xl max-w-sm w-full mx-4 overflow-hidden"
          >
            <div className="p-6 space-y-4">
              <button
                onClick={handleLeaveGame}
                className="w-full flex items-center space-x-3 p-3 bg-red-50 hover:bg-red-100 dark:bg-red-900/20 dark:hover:bg-red-900/30 rounded-xl transition-colors"
              >
                <LogOut className="w-5 h-5 text-red-600" />
                <span className="text-red-600 font-medium">Покинуть игру</span>
              </button>
              
              <div className="flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-700 rounded-xl">
                <div className="flex items-center space-x-3">
                  <Users className="w-5 h-5 text-gray-600 dark:text-gray-300" />
                  <span className="text-gray-700 dark:text-gray-200">Игроков</span>
                </div>
                <span className="font-bold text-gray-900 dark:text-white">{alivePlayers.length}/{playersArray.length}</span>
              </div>
              
              <button
                onClick={() => setIsDarkMode(!isDarkMode)}
                className="w-full flex items-center justify-between p-3 bg-gray-50 hover:bg-gray-100 dark:bg-gray-700 dark:hover:bg-gray-600 rounded-xl transition-colors"
              >
                <div className="flex items-center space-x-3">
                  {isDarkMode ? <Sun className="w-5 h-5 text-yellow-500" /> : <Moon className="w-5 h-5 text-indigo-600" />}
                  <span className="text-gray-700 dark:text-gray-200">Тема</span>
                </div>
                <span className="text-sm text-gray-500 dark:text-gray-400">
                  {isDarkMode ? 'Светлая' : 'Темная'}
                </span>
              </button>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  ));

  return (
    <AtmosphereBackground phase={gamePhase === 'night' ? 'night' : 'day'}>
      {/* Mobile/Desktop Menu */}
      <div className="fixed top-4 right-4 z-50">
        {isMobile ? (
          <button
            onClick={() => setShowMobileMenu(true)}
            className="flex items-center justify-center w-12 h-12 bg-white/90 dark:bg-gray-800/90 backdrop-blur-md border border-gray-200/50 dark:border-gray-700/50 rounded-xl hover:bg-white dark:hover:bg-gray-800 transition-colors shadow-lg"
          >
            <Settings className="w-6 h-6 text-gray-600 dark:text-gray-300" />
          </button>
        ) : (
          <div className="flex items-center space-x-3">
            <div className="flex items-center space-x-2 bg-white/90 dark:bg-gray-800/90 backdrop-blur-md border border-gray-200/50 dark:border-gray-700/50 px-4 py-2 rounded-xl shadow-lg">
              <span className="text-sm font-medium text-gray-700 dark:text-gray-200">Раунд {roundNumber}</span>
            </div>
            
            <div className="flex items-center space-x-2 bg-white/90 dark:bg-gray-800/90 backdrop-blur-md border border-gray-200/50 dark:border-gray-700/50 px-4 py-2 rounded-xl shadow-lg">
              <Users className="w-4 h-4 text-gray-600 dark:text-gray-300" />
              <span className="text-sm font-medium text-gray-700 dark:text-gray-200">{alivePlayers.length}/{playersArray.length}</span>
            </div>
            
            <button
              onClick={() => setIsDarkMode(!isDarkMode)}
              className="flex items-center justify-center w-10 h-10 bg-white/90 dark:bg-gray-800/90 backdrop-blur-md border border-gray-200/50 dark:border-gray-700/50 rounded-xl hover:bg-white dark:hover:bg-gray-800 transition-colors shadow-lg"
            >
              {isDarkMode ? <Sun className="w-5 h-5 text-yellow-500" /> : <Moon className="w-5 h-5 text-indigo-600" />}
            </button>
            
            <button
              onClick={handleLeaveGame}
              className="flex items-center space-x-2 bg-red-600/90 backdrop-blur-md text-white px-4 py-2 rounded-xl hover:bg-red-700 transition-colors shadow-lg"
            >
              <LogOut className="w-4 h-4" />
              <span className="text-sm font-medium">Покинуть</span>
            </button>
          </div>
        )}
      </div>

      <MobileMenu />

      {/* Phase Transition */}
      <PhaseTransition
        isVisible={showPhaseTransition}
        phase={gamePhase === 'night' ? 'night' : 'day'}
        roundNumber={roundNumber}
        onComplete={() => setShowPhaseTransition(false)}
      />

      {/* Kill Animation */}
      <MafiaKillAnimation
        isVisible={showKillAnimation}
        victimName={killedPlayerName}
        onComplete={() => setShowKillAnimation(false)}
      />

      <div className="container mx-auto px-4 py-8 relative z-10">
        {/* Game Status HUD */}
        <motion.div
          initial={{ y: -50, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          className={`${isDarkMode ? 'bg-black/20' : 'bg-white/10'} backdrop-blur-md rounded-2xl border ${isDarkMode ? 'border-purple-500/30' : 'border-white/20'} p-6 mb-8 shadow-2xl`}
        >
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center space-x-4">
              <div className="flex items-center space-x-2">
                {gamePhase === 'night' ? (
                  <Moon className="w-6 h-6 text-purple-300" />
                ) : (
                  <Sun className="w-6 h-6 text-yellow-400" />
                )}
                <div>
                  <h3 className={`text-xl font-bold ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>
                    Раунд {roundNumber} - {gamePhase === 'night' ? 'Ночь' : 'День'}
                  </h3>
                  <p className={`text-sm ${isDarkMode ? 'text-gray-300' : 'text-gray-600'}`}>
                    {gamePhase === 'night' 
                      ? 'Особые роли выполняют свои действия' 
                      : 'Обсуждение и голосование'
                    }
                  </p>
                </div>
              </div>
              
              <div className="text-sm text-gray-300">
                Ваш номер: <span className={`font-bold ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>Игрок {currentPlayerNumber}</span>
              </div>
            </div>
            
            <div className={`text-right text-sm ${isDarkMode ? 'text-gray-300' : 'text-gray-600'}`}>
              {/* Таймер фазы */}
              {phaseTimer > 0 && (
                <div className="flex items-center space-x-2 mb-2">
                  <Timer className="w-4 h-4 text-yellow-400" />
                  <span className={`font-mono text-lg font-bold ${
                    phaseTimer <= 30 ? 'text-red-400 animate-pulse' : 'text-yellow-400'
                  }`}>
                    {Math.floor(phaseTimer / 60)}:{String(phaseTimer % 60).padStart(2, '0')}
                  </span>
                </div>
              )}
              
              {/* Прогресс фазы */}
              <div className="flex items-center space-x-2 mb-2">
                <CheckCircle className="w-4 h-4 text-green-400" />
                <span className="text-sm text-gray-300">
                  {getPhaseProgress().completed}/{getPhaseProgress().total} 
                  {gamePhase === 'night' ? ' действий' : ' голосов'}
                </span>
              </div>
              
              <div>Мафия: {mafiaPlayers.length}</div>
              <div>Мирные: {civilianPlayers.length}</div>
              <div>Живых: {alivePlayers.length}</div>
            </div>
          </div>

          {/* Player Role Info */}
          {currentPlayerData && (
            <div className={`${isDarkMode ? 'bg-black/20 border-white/10' : 'bg-gray-100/80 border-gray-200'} rounded-xl p-4 border`}>
              <div className="flex items-center space-x-3">
                {getRoleIcon(currentPlayerData.role || 'civilian')}
                <div>
                  <h4 className={`font-bold ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>
                    Ваша роль: {getRoleName(currentPlayerData.role || 'civilian')}
                  </h4>
                  <p className={`text-sm ${isDarkMode ? 'text-gray-300' : 'text-gray-600'}`}>
                    {getRoleDescription(currentPlayerData.role || 'civilian', gamePhase)}
                  </p>
                </div>
                
                {/* Статус действия */}
                <div className="flex items-center space-x-2">
                  {getPlayerActionStatus(currentPlayerNumber) === 'completed' ? (
                    <div className="flex items-center space-x-1 text-green-400">
                      <CheckCircle className="w-4 h-4" />
                      <span className="text-sm">Выполнено</span>
                    </div>
                  ) : canVote() ? (
                    <div className="flex items-center space-x-1 text-yellow-400">
                      <Timer className="w-4 h-4" />
                      <span className="text-sm">Ожидание действия</span>
                    </div>
                  ) : (
                    <div className="flex items-center space-x-1 text-gray-400">
                      <Moon className="w-4 h-4" />
                      <span className="text-sm">Отдыхаете</span>
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}
          
          {/* Автоматическое переключение */}
          <div className={`mt-4 ${isDarkMode ? 'bg-black/20 border-white/10' : 'bg-gray-100/80 border-gray-200'} rounded-xl p-3 border`}>
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-2">
                <div className={`w-3 h-3 rounded-full ${autoPhaseEnabled ? 'bg-green-400 animate-pulse' : 'bg-gray-400'}`} />
                <span className={`text-sm ${isDarkMode ? 'text-gray-300' : 'text-gray-600'}`}>
                  Автоматическая смена фаз: {autoPhaseEnabled ? 'Включена' : 'Выключена'}
                </span>
              </div>
              <button
                onClick={() => setAutoPhaseEnabled(!autoPhaseEnabled)}
                className={`text-xs ${isDarkMode ? 'text-indigo-400 hover:text-indigo-300' : 'text-indigo-600 hover:text-indigo-700'} transition-colors`}
              >
                {autoPhaseEnabled ? 'Выключить' : 'Включить'}
              </button>
            </div>
            
            {autoPhaseEnabled && (
              <div className={`mt-2 text-xs ${isDarkMode ? 'text-gray-400' : 'text-gray-500'}`}>
                {gamePhase === 'night' 
                  ? `Ночь закончится когда все роли выполнят действия (${getPhaseProgress().completed}/${getPhaseProgress().total})`
                  : `День закончится когда все проголосуют (${getPhaseProgress().completed}/${getPhaseProgress().total})`
                }
              </div>
            )}
          </div>
        </motion.div>


        {/* Players Grid */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className={`${isDarkMode ? 'bg-white/10 border-white/20' : 'bg-gray-100/80 border-gray-200'} backdrop-blur-md rounded-2xl border p-6 mb-8 shadow-2xl`}
        >
          <h3 className={`text-xl font-bold ${isDarkMode ? 'text-white' : 'text-gray-900'} mb-6 flex items-center space-x-2`}>
            <Users className="w-6 h-6" />
            <span>Игроки ({alivePlayers.length} живых)</span>
          </h3>
          
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
            {playersArray.map((player, index) => {
              const isCurrentPlayer = player.userId === currentPlayer.id;
              const isDead = player.isAlive === false;
              const hasVotesAgainst = getVotesAgainst(player.number) > 0;
              const isCreator = player.userId === game.creatorId;
              const canVoteForThis = canVote() && getVotingTargets().some(t => t.number === player.number);
              const isSelected = selectedTarget === player.number;
              const actionStatus = getPlayerActionStatus(player.number);
              
              return (
                <motion.div
                  key={player.userId}
                  initial={{ opacity: 0, scale: 0.8, y: 20 }}
                  animate={{ opacity: 1, scale: 1, y: 0 }}
                  transition={{ delay: index * 0.1, type: "spring", stiffness: 300 }}
                  whileHover={!isDead && canVoteForThis ? { 
                    scale: 1.02, 
                    y: -4
                  } : {}}
                  whileTap={!isDead && canVoteForThis ? { scale: 0.98 } : {}}
                  onClick={() => canVoteForThis ? handleVote(player.number) : null}
                  className={`p-6 rounded-2xl border-2 transition-all duration-200 relative overflow-hidden cursor-pointer ${
                    isDead
                      ? `border-red-300 ${isDarkMode ? 'bg-red-900/20' : 'bg-red-100/20'} opacity-50 cursor-not-allowed`
                      : isSelected
                        ? gamePhase === 'night'
                          ? `border-red-500 ${isDarkMode ? 'bg-red-500/30' : 'bg-red-500/20'} shadow-xl`
                          : `border-orange-500 ${isDarkMode ? 'bg-orange-500/30' : 'bg-orange-500/20'} shadow-xl`
                        : isCurrentPlayer
                          ? gamePhase === 'night'
                            ? `border-indigo-400 ${isDarkMode ? 'bg-indigo-500/30' : 'bg-indigo-500/20'} shadow-lg`
                            : `border-indigo-500 ${isDarkMode ? 'bg-indigo-500/30' : 'bg-indigo-100/50'} shadow-lg`
                          : gamePhase === 'night'
                            ? `border-gray-600 ${isDarkMode ? 'bg-gray-700/30 hover:border-red-400 hover:bg-red-500/10' : 'bg-gray-200/50 hover:border-red-400 hover:bg-red-500/10'}`
                            : `border-gray-300 ${isDarkMode ? 'bg-gray-700/30 hover:border-orange-400 hover:bg-orange-500/10' : 'bg-white/50 hover:border-orange-400 hover:bg-orange-500/10'}`
                  }`}
                >
                  {/* Action Status Indicator */}
                  {!isDead && (
                    <div className="absolute top-2 right-2">
                      {actionStatus === 'completed' ? (
                        <div className="w-6 h-6 bg-green-500 rounded-full flex items-center justify-center">
                          <CheckCircle className="w-4 h-4 text-white" />
                        </div>
                      ) : canVote() && getVotingTargets().some(t => t.number === player.number) ? (
                        <div className="w-6 h-6 bg-yellow-500 rounded-full flex items-center justify-center animate-pulse">
                          <Timer className="w-4 h-4 text-white" />
                        </div>
                      ) : (
                        <div className="w-6 h-6 bg-gray-500 rounded-full flex items-center justify-center">
                          <div className="w-2 h-2 bg-white rounded-full" />
                        </div>
                      )}
                    </div>
                  )}
                  
                  {/* Glow Effect */}
                  {(isSelected || isCurrentPlayer) && !isDead && (
                    <motion.div
                      animate={{ opacity: [0.2, 0.5, 0.2] }}
                      transition={{ duration: 2, repeat: Infinity }}
                      className={`absolute inset-0 rounded-2xl bg-gradient-to-r ${
                        isSelected 
                          ? gamePhase === 'night' ? 'from-red-500 to-pink-600' : 'from-orange-500 to-red-600'
                          : getPlayerColor(player.number)
                      } opacity-20`}
                    />
                  )}
                  
                  {/* Danger Pulse for Selected */}
                  {isSelected && !isDead && (
                    <motion.div
                      animate={{ 
                        scale: [1, 1.1, 1],
                        opacity: [0, 0.3, 0]
                      }}
                      transition={{ duration: 1, repeat: Infinity }}
                      className="absolute inset-0 rounded-2xl bg-red-500"
                    />
                  )}
                  
                  <div className="relative z-10 text-center">
                    {/* Player Avatar */}
                    <motion.div
                      animate={hasVotesAgainst ? { 
                        scale: [1, 1.2, 1],
                        rotate: [0, 10, -10, 0]
                      } : {}}
                      transition={{ duration: 0.5, repeat: hasVotesAgainst ? Infinity : 0 }}
                      className={`w-20 h-20 rounded-full bg-gradient-to-r ${getPlayerColor(player.number)} flex items-center justify-center mx-auto mb-4 text-white font-bold text-xl shadow-xl relative`}
                    >
                      {player.number}
                      
                      {/* Death Overlay */}
                      {isDead && (
                        <motion.div
                          initial={{ scale: 0 }}
                          animate={{ scale: 1 }}
                          className="absolute inset-0 bg-red-500/70 rounded-full flex items-center justify-center"
                        >
                          <Skull className="w-10 h-10 text-white" />
                        </motion.div>
                      )}
                      
                      {/* Vote Indicator */}
                      {hasVotesAgainst && !isDead && (
                        <motion.div
                          initial={{ scale: 0 }}
                          animate={{ scale: 1 }}
                          className="absolute -top-2 -right-2 w-8 h-8 bg-red-500 rounded-full flex items-center justify-center shadow-lg border-2 border-white"
                        >
                          <Vote className="w-4 h-4 text-white" />
                        </motion.div>
                      )}
                      
                    </motion.div>
                    
                    {/* Player Name */}
                    <motion.div
                      animate={isSelected ? { 
                        scale: [1, 1.1, 1],
                        color: gamePhase === 'night' ? ['#ffffff', '#ef4444', '#ffffff'] : ['#1f2937', '#ea580c', '#1f2937']
                      } : {}}
                      transition={{ duration: 1, repeat: isSelected ? Infinity : 0 }}
                      className={`text-lg font-bold ${
                        isDead 
                          ? 'text-gray-500 line-through' 
                          : gamePhase === 'night' ? 'text-white' : 'text-gray-900'
                      }`}
                    >
                      {showPlayerNames ? player.name : `Игрок ${player.number}`}
                    </motion.div>
                    
                    
                    {/* Selection Indicator */}
                    {isSelected && !isDead && (
                      <motion.div
                        initial={{ scale: 0 }}
                        animate={{ scale: 1 }}
                        className={`mt-3 px-3 py-1 rounded-full text-xs font-bold ${
                          gamePhase === 'night'
                            ? 'bg-red-500 text-white'
                            : 'bg-orange-500 text-white'
                        }`}
                      >
                        {gamePhase === 'night' ? '🎯 Цель' : '🗳️ Выбран'}
                      </motion.div>
                    )}
                  </div>
                </motion.div>
              );
            })}
          </div>

          {/* Voting Instructions */}
          {canVote() && (
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              className="mt-6 bg-black/20 rounded-xl p-4 border border-white/10"
            >
              <div className="text-center">
                <h4 className="font-bold text-white mb-2">
                  {gamePhase === 'night' 
                    ? `${getRoleName(currentPlayerData?.role || 'civilian')} - выберите цель`
                    : 'Голосование - выберите подозрительного игрока'
                  }
                </h4>
                <p className="text-sm text-gray-300">
                  {getRoleDescription(currentPlayerData?.role || 'civilian', gamePhase)}
                </p>
                {getPlayerActionStatus(currentPlayerNumber) === 'completed' && (
                  <div className="mt-2 flex items-center justify-center space-x-2 text-green-400">
                    <CheckCircle className="w-4 h-4" />
                    <span className="text-sm">Вы уже выполнили действие</span>
                  </div>
                )}
              </div>
            </motion.div>
          )}

          {!canVote() && currentPlayerData?.isAlive && (
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              className="mt-6 bg-black/20 rounded-xl p-4 border border-white/10 text-center"
            >
              <p className="text-gray-300">
                {gamePhase === 'night' 
                  ? 'Вы спите. Ожидайте рассвета...'
                  : 'Ожидайте начала голосования...'
                }
              </p>
              <div className="mt-2 text-xs text-gray-400">
                {gamePhase === 'night' 
                  ? `Ожидаем действия: ${getPhaseProgress().total - getPhaseProgress().completed} игроков`
                  : `Ожидаем голоса: ${getPhaseProgress().total - getPhaseProgress().completed} игроков`
                }
              </div>
            </motion.div>
          )}
        </motion.div>

        {/* Game Events */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className={`${isDarkMode ? 'bg-white/10 border-white/20' : 'bg-gray-100/80 border-gray-200'} backdrop-blur-md rounded-2xl border p-6 shadow-2xl`}
        >
          <h3 className={`text-xl font-bold ${isDarkMode ? 'text-white' : 'text-gray-900'} mb-4 flex items-center space-x-2`}>
            <MessageCircle className="w-6 h-6" />
            <span>События игры</span>
          </h3>
          
          <div className="space-y-3 max-h-64 overflow-y-auto">
            {moves.length === 0 ? (
              <div className={`text-center py-8 ${isDarkMode ? 'text-gray-400' : 'text-gray-500'}`}>
                События игры будут отображаться здесь
              </div>
            ) : (
              moves.map((move, index) => (
                <motion.div
                  key={move.id}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: index * 0.02 }}
                  className={`p-3 rounded-lg backdrop-blur-sm transition-colors ${
                    move.type === 'system' 
                      ? `${isDarkMode ? 'bg-blue-500/20 border border-blue-400/30' : 'bg-blue-100/80 border border-blue-300'}` 
                      : move.type === 'kill'
                        ? `${isDarkMode ? 'bg-red-500/20 border border-red-400/30' : 'bg-red-100/80 border border-red-300'}`
                        : move.type === 'vote'
                          ? `${isDarkMode ? 'bg-orange-500/20 border border-orange-400/30' : 'bg-orange-100/80 border border-orange-300'}`
                          : move.type === 'elimination'
                            ? `${isDarkMode ? 'bg-purple-500/20 border border-purple-400/30' : 'bg-purple-100/80 border border-purple-300'}`
                            : `${isDarkMode ? 'bg-gray-500/20 border border-gray-400/30' : 'bg-gray-100/80 border border-gray-300'}`
                  }`}
                >
                  <div className="text-sm">
                    {move.type === 'system' && '🤖 '}
                    {move.type === 'kill' && '💀 '}
                    {move.type === 'vote' && '🗳️ '}
                    {move.type === 'elimination' && '⚖️ '}
                    <span className={isDarkMode ? 'text-white' : 'text-gray-800'}>{move.content}</span>
                  </div>
                  <div className={`text-xs ${isDarkMode ? 'text-gray-400' : 'text-gray-500'} mt-1`}>
                    {new Date(move.createdAt).toLocaleTimeString('ru-RU', {
                      hour: '2-digit',
                      minute: '2-digit'
                    })}
                  </div>
                </motion.div>
              ))
            )}
          </div>
        </motion.div>

        {/* Game Rules */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
          className="mt-8 bg-white/10 backdrop-blur-md rounded-2xl border border-white/20 p-6 shadow-2xl"
        >
          <h4 className="font-bold text-white mb-4 flex items-center space-x-2">
            <span className="text-2xl">📋</span>
            <span>Правила мафии</span>
          </h4>
          <div className="space-y-2 text-sm text-gray-300">
            <p>🌙 <strong>Ночь:</strong> Мафия убивает, врач лечит, детектив проверяет</p>
            <p>☀️ <strong>День:</strong> Все обсуждают и голосуют за изгнание</p>
            <p>🎭 <strong>Цель мафии:</strong> Устранить всех мирных жителей</p>
            <p>🛡️ <strong>Цель мирных:</strong> Найти и изгнать всю мафию</p>
            <p>👥 <strong>Анонимность:</strong> Все видят только номера игроков{showPlayerNames ? ' (имена видны)' : ''}</p>
            <p>⚡ <strong>Автосмена:</strong> Фазы меняются автоматически когда все выполнят действия</p>
            <p>⏱️ <strong>Таймеры:</strong> Ночь 2 мин, День 3 мин (принудительная смена)</p>
          </div>
        </motion.div>
      </div>
    </AtmosphereBackground>
  );
}