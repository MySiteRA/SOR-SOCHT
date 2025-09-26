import React from 'react';
import { motion } from 'framer-motion';
import { Vote, Crown, Skull } from 'lucide-react';

interface VotingCardProps {
  playerNumber: number;
  playerName: string;
  isSelected: boolean;
  isCurrentPlayer: boolean;
  isCreator: boolean;
  isDead: boolean;
  hasVotesAgainst: boolean;
  playerColor: string;
  phase: 'night' | 'day';
  onClick: () => void;
  disabled?: boolean;
}

export default function VotingCard({
  playerNumber,
  playerName,
  isSelected,
  isCurrentPlayer,
  isCreator,
  isDead,
  hasVotesAgainst,
  playerColor,
  phase,
  onClick,
  disabled = false
}: VotingCardProps) {
  return (
    <motion.button
      whileHover={!disabled && !isDead ? { 
        scale: 1.05, 
        y: -8,
        boxShadow: phase === 'night' 
          ? '0 10px 30px rgba(239, 68, 68, 0.3)' 
          : '0 10px 30px rgba(251, 146, 60, 0.3)'
      } : {}}
      whileTap={!disabled && !isDead ? { scale: 0.95 } : {}}
      onClick={onClick}
      disabled={disabled || isDead}
      className={`p-6 rounded-2xl border-2 transition-all duration-300 relative overflow-hidden ${
        isDead
          ? 'border-red-300 bg-red-100/20 opacity-50 cursor-not-allowed'
          : isSelected
            ? phase === 'night'
              ? 'border-red-500 bg-red-500/20 shadow-2xl shadow-red-500/50'
              : 'border-orange-500 bg-orange-500/20 shadow-2xl shadow-orange-500/50'
            : isCurrentPlayer
              ? phase === 'night'
                ? 'border-indigo-400 bg-indigo-500/20 shadow-lg shadow-indigo-500/30'
                : 'border-indigo-500 bg-indigo-100/50 shadow-lg shadow-indigo-500/20'
              : phase === 'night'
                ? 'border-gray-600 bg-gray-700/30 hover:border-red-400 hover:bg-red-500/10'
                : 'border-gray-300 bg-white/50 hover:border-orange-400 hover:bg-orange-500/10'
      }`}
    >
      {/* Glow Effect */}
      {(isSelected || isCurrentPlayer) && !isDead && (
        <motion.div
          animate={{ opacity: [0.2, 0.5, 0.2] }}
          transition={{ duration: 2, repeat: Infinity }}
          className={`absolute inset-0 rounded-2xl bg-gradient-to-r ${
            isSelected 
              ? phase === 'night' ? 'from-red-500 to-pink-600' : 'from-orange-500 to-red-600'
              : playerColor
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
          className={`w-20 h-20 rounded-full bg-gradient-to-r ${playerColor} flex items-center justify-center mx-auto mb-4 text-white font-bold text-xl shadow-xl relative`}
        >
          {playerNumber}
          
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
          
          {/* Creator Crown */}
          {isCreator && (
            <motion.div
              animate={{ rotate: [0, 10, -10, 0] }}
              transition={{ duration: 2, repeat: Infinity }}
              className="absolute -top-4 -left-2"
            >
              <Crown className="w-6 h-6 text-yellow-400 filter drop-shadow-lg" />
            </motion.div>
          )}
        </motion.div>
        
        {/* Player Name */}
        <motion.div
          animate={isSelected ? { 
            scale: [1, 1.1, 1],
            color: phase === 'night' ? ['#ffffff', '#ef4444', '#ffffff'] : ['#1f2937', '#ea580c', '#1f2937']
          } : {}}
          transition={{ duration: 1, repeat: isSelected ? Infinity : 0 }}
          className={`text-lg font-bold ${
            isDead 
              ? 'text-gray-500 line-through' 
              : phase === 'night' ? 'text-white' : 'text-gray-900'
          }`}
        >
          {playerName}
        </motion.div>
        
        {/* Current Player Indicator */}
        {isCurrentPlayer && (
          <motion.div
            animate={{ opacity: [0.5, 1, 0.5] }}
            transition={{ duration: 1.5, repeat: Infinity }}
            className="text-xs text-indigo-400 font-bold mt-2"
          >
            ✨ Это вы
          </motion.div>
        )}
        
        {/* Selection Indicator */}
        {isSelected && !isDead && (
          <motion.div
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            className={`mt-3 px-3 py-1 rounded-full text-xs font-bold ${
              phase === 'night'
                ? 'bg-red-500 text-white'
                : 'bg-orange-500 text-white'
            }`}
          >
            {phase === 'night' ? '🎯 Цель' : '🗳️ Выбран'}
          </motion.div>
        )}
      </div>
    </motion.button>
  );
}