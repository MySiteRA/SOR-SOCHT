import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import TypewriterText from './TypewriterText';

interface PhaseTransitionProps {
  isVisible: boolean;
  phase: 'night' | 'day';
  roundNumber: number;
  onComplete?: () => void;
}

export default function PhaseTransition({ isVisible, phase, roundNumber, onComplete }: PhaseTransitionProps) {
  const getPhaseEmoji = () => phase === 'night' ? '🌙' : '☀️';
  const getPhaseTitle = () => phase === 'night' ? 'Ночь' : 'День';
  const getPhaseMessage = () => {
    return phase === 'night' 
      ? 'Город засыпает... Мафия выходит на охоту'
      : 'Рассвет. Время обсуждения и правосудия';
  };

  return (
    <AnimatePresence>
      {isVisible && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.8 }}
          className={`fixed inset-0 flex items-center justify-center z-50 ${
            phase === 'night'
              ? 'bg-gradient-to-b from-black via-purple-900 to-black'
              : 'bg-gradient-to-b from-yellow-300 via-orange-200 to-blue-300'
          }`}
          onAnimationComplete={() => {
            if (onComplete) {
              setTimeout(onComplete, 3000);
            }
          }}
        >
          {/* Background Effects */}
          {phase === 'night' ? (
            <>
              {/* Stars */}
              {Array.from({ length: 50 }).map((_, i) => (
                <motion.div
                  key={i}
                  className="absolute w-1 h-1 bg-white rounded-full"
                  style={{
                    left: `${Math.random() * 100}%`,
                    top: `${Math.random() * 100}%`,
                  }}
                  animate={{
                    opacity: [0, 1, 0],
                    scale: [0.5, 1.5, 0.5]
                  }}
                  transition={{
                    duration: 1 + Math.random() * 2,
                    repeat: Infinity,
                    delay: Math.random()
                  }}
                />
              ))}
              
              {/* Mystical Particles */}
              {Array.from({ length: 10 }).map((_, i) => (
                <motion.div
                  key={`particle-${i}`}
                  className="absolute w-3 h-3 rounded-full bg-purple-400/50"
                  style={{
                    left: `${Math.random() * 100}%`,
                    top: `${Math.random() * 100}%`,
                  }}
                  animate={{
                    y: [0, -50, 0],
                    opacity: [0, 0.8, 0],
                    scale: [0.5, 1, 0.5]
                  }}
                  transition={{
                    duration: 4,
                    repeat: Infinity,
                    delay: Math.random() * 2
                  }}
                />
              ))}
            </>
          ) : (
            <>
              {/* Sun Rays */}
              <motion.div
                animate={{ rotate: 360 }}
                transition={{ duration: 20, repeat: Infinity, ease: "linear" }}
                className="absolute inset-0"
              >
                {Array.from({ length: 12 }).map((_, i) => (
                  <div
                    key={i}
                    className="absolute w-2 h-96 bg-gradient-to-t from-yellow-400/30 to-transparent origin-bottom"
                    style={{
                      left: '50%',
                      top: '50%',
                      transform: `rotate(${i * 30}deg)`,
                      transformOrigin: '0 0'
                    }}
                  />
                ))}
              </motion.div>
              
              {/* Floating Light Particles */}
              {Array.from({ length: 15 }).map((_, i) => (
                <motion.div
                  key={`light-${i}`}
                  className="absolute w-2 h-2 rounded-full bg-yellow-300/60"
                  style={{
                    left: `${Math.random() * 100}%`,
                    top: `${Math.random() * 100}%`,
                  }}
                  animate={{
                    y: [0, -30, 0],
                    x: [0, Math.random() * 20 - 10, 0],
                    opacity: [0.3, 1, 0.3],
                    scale: [0.8, 1.2, 0.8]
                  }}
                  transition={{
                    duration: 3 + Math.random() * 2,
                    repeat: Infinity,
                    delay: Math.random() * 2
                  }}
                />
              ))}
            </>
          )}

          {/* Main Content */}
          <motion.div
            initial={{ scale: 0, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={{ 
              type: "spring", 
              stiffness: 200, 
              damping: 20,
              delay: 0.5
            }}
            className="text-center z-10"
          >
            {/* Phase Icon */}
            <motion.div
              animate={{ 
                scale: [1, 1.3, 1],
                rotate: phase === 'night' ? [0, 360] : [0, 180, 360],
                filter: [
                  'drop-shadow(0 0 0 rgba(255, 255, 255, 0))',
                  `drop-shadow(0 0 30px ${phase === 'night' ? 'rgba(147, 51, 234, 0.8)' : 'rgba(251, 191, 36, 0.8)'})`,
                  'drop-shadow(0 0 0 rgba(255, 255, 255, 0))'
                ]
              }}
              transition={{ 
                duration: 2, 
                repeat: Infinity,
                ease: "easeInOut"
              }}
              className="text-9xl mb-8"
            >
              {getPhaseEmoji()}
            </motion.div>
            
            {/* Round Number */}
            <motion.div
              initial={{ opacity: 0, y: -20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 1 }}
              className={`text-2xl font-bold mb-4 ${
                phase === 'night' ? 'text-purple-200' : 'text-orange-700'
              }`}
            >
              Раунд {roundNumber}
            </motion.div>
            
            {/* Phase Title */}
            <motion.h2
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 1.2 }}
              className={`text-5xl font-bold mb-6 ${
                phase === 'night' ? 'text-white' : 'text-gray-800'
              }`}
            >
              <TypewriterText 
                text={`${getPhaseTitle()} наступает`}
                speed={120}
              />
            </motion.h2>
            
            {/* Phase Description */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 2 }}
              className={`text-xl ${
                phase === 'night' ? 'text-gray-300' : 'text-gray-700'
              }`}
            >
              <TypewriterText 
                text={getPhaseMessage()}
                speed={80}
              />
            </motion.div>
            
            {/* Atmospheric Elements */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 2.5 }}
              className="mt-8"
            >
              {phase === 'night' ? (
                <div className="flex justify-center space-x-4 text-4xl">
                  <motion.span animate={{ rotate: [0, 10, -10, 0] }} transition={{ duration: 1, repeat: Infinity }}>🦇</motion.span>
                  <motion.span animate={{ scale: [1, 1.2, 1] }} transition={{ duration: 1.5, repeat: Infinity, delay: 0.5 }}>🕯️</motion.span>
                  <motion.span animate={{ rotate: [0, -10, 10, 0] }} transition={{ duration: 1, repeat: Infinity, delay: 1 }}>👻</motion.span>
                </div>
              ) : (
                <div className="flex justify-center space-x-4 text-4xl">
                  <motion.span animate={{ y: [0, -10, 0] }} transition={{ duration: 1, repeat: Infinity }}>🐦</motion.span>
                  <motion.span animate={{ scale: [1, 1.1, 1] }} transition={{ duration: 1.5, repeat: Infinity, delay: 0.3 }}>🌻</motion.span>
                  <motion.span animate={{ y: [0, -5, 0] }} transition={{ duration: 1.2, repeat: Infinity, delay: 0.6 }}>🦋</motion.span>
                </div>
              )}
            </motion.div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}