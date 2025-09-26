import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';

interface BackgroundPhaseProps {
  phase: 'day' | 'night';
}

export default function BackgroundPhase({ phase }: BackgroundPhaseProps) {
  return (
    <AnimatePresence mode="wait">
      {phase === 'night' && (
        <motion.div
          key="night"
          className="fixed inset-0 bg-gradient-to-b from-gray-900 via-black to-blue-900 z-30"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 1.2 }}
        >
          {/* Звёзды */}
          <div className="absolute inset-0">
            {Array.from({ length: 150 }).map((_, i) => (
              <motion.div
                key={`star-${i}`}
                className="absolute w-1 h-1 bg-white rounded-full"
                style={{
                  left: `${Math.random() * 100}%`,
                  top: `${Math.random() * 100}%`,
                }}
                animate={{
                  opacity: [0.2, 1, 0.2],
                  scale: [0.5, 1.5, 0.5]
                }}
                transition={{
                  duration: 2 + Math.random() * 3,
                  repeat: Infinity,
                  delay: Math.random() * 2
                }}
              />
            ))}
          </div>

          {/* Падающие звёзды */}
          {Array.from({ length: 5 }).map((_, i) => (
            <motion.div
              key={`shooting-star-${i}`}
              className="absolute w-3 h-0.5 bg-gradient-to-r from-white to-transparent rounded-full"
              initial={{ 
                x: -100, 
                y: Math.random() * 400 + 100,
                opacity: 0 
              }}
              animate={{ 
                x: typeof window !== 'undefined' ? window.innerWidth + 100 : 1200,
                opacity: [0, 1, 0]
              }}
              transition={{
                duration: 3,
                delay: i * 8 + Math.random() * 10,
                repeat: Infinity,
                repeatDelay: 20
              }}
            />
          ))}

          {/* Луна */}
          <motion.div
            initial={{ scale: 0, opacity: 0, y: -100 }}
            animate={{ scale: 1, opacity: 1, y: 0 }}
            transition={{ duration: 1.5, ease: "easeOut" }}
            className="absolute top-10 right-10"
          >
            <motion.div
              animate={{ 
                rotate: 360,
                filter: [
                  'drop-shadow(0 0 20px rgba(255, 255, 255, 0.3))',
                  'drop-shadow(0 0 40px rgba(255, 255, 255, 0.5))',
                  'drop-shadow(0 0 20px rgba(255, 255, 255, 0.3))'
                ]
              }}
              transition={{ 
                rotate: { duration: 30, repeat: Infinity, ease: "linear" },
                filter: { duration: 3, repeat: Infinity }
              }}
              className="text-8xl filter drop-shadow-lg"
            >
              🌙
            </motion.div>
          </motion.div>

          {/* Мистический туман */}
          <motion.div
            animate={{ 
              opacity: [0.1, 0.4, 0.1],
              scale: [1, 1.2, 1]
            }}
            transition={{ duration: 8, repeat: Infinity }}
            className="absolute bottom-0 left-0 right-0 h-1/2 bg-gradient-to-t from-purple-900/40 to-transparent"
          />

          {/* Центральный текст */}
          <motion.div
            initial={{ scale: 0, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={{ delay: 0.8, duration: 0.8, type: "spring" }}
            className="absolute inset-0 flex items-center justify-center"
          >
            <motion.h1
              animate={{ 
                textShadow: [
                  '0 0 20px rgba(147, 51, 234, 0.5)',
                  '0 0 40px rgba(147, 51, 234, 0.8)',
                  '0 0 20px rgba(147, 51, 234, 0.5)'
                ]
              }}
              transition={{ duration: 2, repeat: Infinity }}
              className="text-white text-6xl font-bold drop-shadow-lg text-center"
            >
              Наступила ночь...
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 1.5 }}
                className="text-2xl text-purple-200 mt-4 font-normal"
              >
                Город засыпает, мафия выходит на охоту
              </motion.div>
            </motion.h1>
          </motion.div>
        </motion.div>
      )}

      {phase === 'day' && (
        <motion.div
          key="day"
          className="fixed inset-0 bg-gradient-to-b from-yellow-200 via-blue-200 to-indigo-300 z-30"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 1.2 }}
        >
          {/* Облака */}
          {Array.from({ length: 8 }).map((_, i) => (
            <motion.div
              key={`cloud-${i}`}
              className="absolute text-white text-6xl opacity-80"
              style={{
                top: `${15 + Math.random() * 50}%`,
                left: `${Math.random() * 100}%`,
              }}
              animate={{
                x: [0, 100, 0],
                y: [0, -20, 0]
              }}
              transition={{
                duration: 20 + Math.random() * 15,
                repeat: Infinity,
                delay: Math.random() * 10
              }}
            >
              ☁️
            </motion.div>
          ))}

          {/* Солнце */}
          <motion.div
            initial={{ scale: 0, opacity: 0, y: -100 }}
            animate={{ scale: 1, opacity: 1, y: 0 }}
            transition={{ duration: 1.5, ease: "easeOut" }}
            className="absolute top-10 left-10"
          >
            <motion.div
              animate={{ 
                rotate: 360,
                scale: [1, 1.1, 1],
                filter: [
                  'drop-shadow(0 0 30px rgba(251, 191, 36, 0.6))',
                  'drop-shadow(0 0 50px rgba(251, 191, 36, 0.8))',
                  'drop-shadow(0 0 30px rgba(251, 191, 36, 0.6))'
                ]
              }}
              transition={{ 
                rotate: { duration: 20, repeat: Infinity, ease: "linear" },
                scale: { duration: 2, repeat: Infinity },
                filter: { duration: 3, repeat: Infinity }
              }}
              className="text-8xl filter drop-shadow-lg"
            >
              ☀️
            </motion.div>
          </motion.div>

          {/* Солнечные лучи */}
          <motion.div
            animate={{ rotate: 360 }}
            transition={{ duration: 40, repeat: Infinity, ease: "linear" }}
            className="absolute top-10 left-10 w-32 h-32"
          >
            {Array.from({ length: 12 }).map((_, i) => (
              <div
                key={i}
                className="absolute w-2 h-20 bg-gradient-to-t from-yellow-400/40 to-transparent origin-bottom"
                style={{
                  transform: `rotate(${i * 30}deg)`,
                  left: '50%',
                  bottom: '50%',
                  transformOrigin: '0 100%'
                }}
              />
            ))}
          </motion.div>

          {/* Летающие частицы света */}
          {Array.from({ length: 25 }).map((_, i) => (
            <motion.div
              key={`light-particle-${i}`}
              className="absolute w-3 h-3 bg-yellow-300/60 rounded-full"
              style={{
                left: `${Math.random() * 100}%`,
                top: `${Math.random() * 100}%`,
              }}
              animate={{
                y: [0, -40, 0],
                x: [0, Math.random() * 30 - 15, 0],
                opacity: [0.3, 1, 0.3],
                scale: [0.8, 1.4, 0.8]
              }}
              transition={{
                duration: 4 + Math.random() * 3,
                repeat: Infinity,
                delay: Math.random() * 3
              }}
            />
          ))}

          {/* Центральный текст */}
          <motion.div
            initial={{ scale: 0, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={{ delay: 0.8, duration: 0.8, type: "spring" }}
            className="absolute inset-0 flex items-center justify-center"
          >
            <motion.h1
              animate={{ 
                textShadow: [
                  '0 0 20px rgba(251, 191, 36, 0.5)',
                  '0 0 40px rgba(251, 191, 36, 0.8)',
                  '0 0 20px rgba(251, 191, 36, 0.5)'
                ]
              }}
              transition={{ duration: 2, repeat: Infinity }}
              className="text-gray-900 text-6xl font-bold drop-shadow-lg text-center"
            >
              Наступил день
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 1.5 }}
                className="text-2xl text-orange-700 mt-4 font-normal"
              >
                Время обсуждения и правосудия
              </motion.div>
            </motion.h1>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}