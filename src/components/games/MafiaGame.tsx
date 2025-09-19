import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Moon, Sun, Users, Eye, Heart, Shield, Skull } from 'lucide-react';
import { 
  subscribeToGameEvents, 
  addGameEventRealtime,
  submitMafiaVote,
  assignMafiaRoles,
  eliminatePlayer
} from '../../services/gameService';
import type { Game, GamePlayer, GameEvent, Student } from '../../lib/supabase';

type GamePhase = 'night' | 'day' | 'voting' | 'results';

interface MafiaGameProps {
  game: Game;
  players: GamePlayer[];
  currentPlayer: Student;
  onError: (error: string) => void;
}

export default function MafiaGame({ game, players, currentPlayer, onError }: MafiaGameProps) {
  const [events, setEvents] = useState<GameEvent[]>([]);
  const [gamePhase, setGamePhase] = useState<GamePhase>('night');
  const [roundNumber, setRoundNumber] = useState(1);
  const [selectedTarget, setSelectedTarget] = useState<GamePlayer | null>(null);
  const [votes, setVotes] = useState<{[playerId: string]: string}>({});
  const [rolesAssigned, setRolesAssigned] = useState(false);

  const currentPlayerData = players.find(p => p.player_id === currentPlayer.id);
  const alivePlayers = players.filter(p => p.is_alive);
  const mafiaPlayers = players.filter(p => p.role === 'mafia' && p.is_alive);
  const civilianPlayers = players.filter(p => p.role !== 'mafia' && p.is_alive);

  useEffect(() => {
    // Подписываемся на события игры
    const unsubscribe = subscribeToGameEvents(game.id, (event) => {
      setEvents(prev => [...prev, event]);
      
      if (event.event_type === 'vote') {
        setVotes(prev => ({
          ...prev,
          [event.player_id!]: event.metadata?.target_id
        }));
      }
    });

    // Назначаем роли при первом запуске
    if (!rolesAssigned && players.length > 0) {
      assignRoles();
    }

    return unsubscribe;
  }, [game.id, players, rolesAssigned]);

  const assignRoles = async () => {
    try {
      await assignMafiaRoles(game.id, players);
      setRolesAssigned(true);
      
      await addGameEventRealtime(
        game.id,
        null,
        null,
        'system',
        `Роли распределены! Раунд ${roundNumber} - Ночь. Мафия выбирает жертву.`
      );
    } catch (err) {
      onError('Ошибка назначения ролей');
    }
  };

  const handleVote = async (targetPlayer: GamePlayer) => {
    if (!currentPlayerData || !currentPlayerData.is_alive) return;

    try {
      await submitMafiaVote(
        game.id,
        currentPlayer.id,
        currentPlayer.name,
        targetPlayer.player_id,
        targetPlayer.player_name,
        gamePhase === 'night' ? 'night' : 'day'
      );

      setSelectedTarget(targetPlayer);
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
    if (!currentPlayerData?.is_alive) return false;
    
    if (gamePhase === 'night') {
      return currentPlayerData.role === 'mafia' || 
             currentPlayerData.role === 'doctor' || 
             currentPlayerData.role === 'detective';
    }
    
    return gamePhase === 'voting';
  };

  const getVotingTargets = () => {
    if (gamePhase === 'night') {
      if (currentPlayerData?.role === 'mafia') {
        return civilianPlayers;
      } else if (currentPlayerData?.role === 'doctor') {
        return alivePlayers;
      } else if (currentPlayerData?.role === 'detective') {
        return alivePlayers.filter(p => p.player_id !== currentPlayer.id);
      }
    } else if (gamePhase === 'voting') {
      return alivePlayers.filter(p => p.player_id !== currentPlayer.id);
    }
    
    return [];
  };

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
                Раунд {roundNumber} - {gamePhase === 'night' ? 'Ночь' : 'День'}
              </h3>
              <p className="text-sm text-gray-600">
                {gamePhase === 'night' 
                  ? 'Особые роли выполняют свои действия' 
                  : 'Обсуждение и голосование'
                }
              </p>
            </div>
          </div>
          
          <div className="text-right text-sm text-gray-600">
            <div>Мафия: {mafiaPlayers.length}</div>
            <div>Мирные: {civilianPlayers.length}</div>
          </div>
        </div>

        {/* Player Role */}
        {currentPlayerData && (
          <div className="bg-gray-50 rounded-lg p-4 mb-4">
            <div className="flex items-center space-x-3">
              {getRoleIcon(currentPlayerData.role)}
              <div>
                <h4 className="font-semibold text-gray-900">
                  Ваша роль: {getRoleName(currentPlayerData.role)}
                </h4>
                <p className="text-sm text-gray-600">
                  {getRoleDescription(currentPlayerData.role)}
                </p>
              </div>
            </div>
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
          {players.map((player, index) => (
            <motion.div
              key={player.id}
              initial={{ opacity: 0, scale: 0.8 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ delay: index * 0.05 }}
              className={`p-4 rounded-lg border-2 transition-all ${
                !player.is_alive
                  ? 'border-red-200 bg-red-50 opacity-60'
                  : selectedTarget?.id === player.id
                    ? 'border-indigo-500 bg-indigo-50'
                    : canVote() && getVotingTargets().some(t => t.id === player.id)
                      ? 'border-gray-200 hover:border-indigo-300 hover:bg-indigo-50 cursor-pointer'
                      : 'border-gray-200 bg-gray-50'
              }`}
              onClick={() => {
                if (canVote() && getVotingTargets().some(t => t.id === player.id)) {
                  handleVote(player);
                }
              }}
            >
              <div className="text-center">
                <div className="w-12 h-12 bg-gray-200 rounded-full flex items-center justify-center mx-auto mb-2 relative">
                  <span className="text-gray-700 font-bold text-sm">
                    {player.player_name.split(' ').map(n => n[0]).slice(0, 2).join('')}
                  </span>
                  {!player.is_alive && (
                    <div className="absolute inset-0 bg-red-500 bg-opacity-50 rounded-full flex items-center justify-center">
                      <Skull className="w-6 h-6 text-white" />
                    </div>
                  )}
                </div>
                <p className="text-sm font-medium text-gray-900 truncate">
                  {player.player_name}
                </p>
                {/* Показываем роль только если игрок мертв или игра закончена */}
                {(!player.is_alive || game.status === 'finished') && (
                  <div className="flex items-center justify-center space-x-1 mt-1">
                    {getRoleIcon(player.role)}
                    <span className="text-xs text-gray-600">
                      {getRoleName(player.role)}
                    </span>
                  </div>
                )}
              </div>
            </motion.div>
          ))}
        </div>
      </div>

      {/* Game Events */}
      <div className="bg-white rounded-xl shadow-lg border border-gray-100 p-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">События игры</h3>
        
        <div className="space-y-3 max-h-64 overflow-y-auto">
          {events.length === 0 ? (
            <div className="text-center py-8 text-gray-500">
              События игры будут отображаться здесь
            </div>
          ) : (
            events.map((event, index) => (
              <motion.div
                key={event.id}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.02 }}
                className={`p-3 rounded-lg ${
                  event.event_type === 'system' 
                    ? 'bg-blue-50 border border-blue-200' 
                    : 'bg-gray-50 border border-gray-200'
                }`}
              >
                <div className="text-sm">
                  {event.player_name && event.event_type !== 'system' && (
                    <span className="font-medium text-gray-900">
                      {event.player_name}:{' '}
                    </span>
                  )}
                  <span className="text-gray-700">{event.content}</span>
                </div>
                <div className="text-xs text-gray-500 mt-1">
                  {new Date(event.created_at).toLocaleTimeString('ru-RU', {
                    hour: '2-digit',
                    minute: '2-digit'
                  })}
                </div>
              </motion.div>
            ))
          )}
        </div>
      </div>
    </div>
  );
}