import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import TypewriterText from './TypewriterText';

interface MafiaKillAnimationProps {
  isVisible: boolean;
  victimName: string;
  onComplete?: () => void;
}

export default function MafiaKillAnimation({ isVisible, victimName, onComplete }: MafiaKillAnimationProps) {
  return (
    <AnimatePresence>
      {isVisible && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.5 }}
          className="fixed inset-0 flex items-center justify-center bg-black/90 z-50"
          onAnimationComplete={() => {
            if (onComplete) {
              setTimeout(onComplete, 2000);
            }
          }}
        >
          {/* Blood Splatter Effect */}
          <motion.div
            initial={{ scale: 0, opacity: 0 }}
            animate={{ scale: [0, 1.5, 1], opacity: [0, 0.3, 0] }}
            transition={{ duration: 1, times: [0, 0.3, 1] }}
            className="absolute inset-0 bg-red-600/20"
          />
          
          {/* Main Animation */}
          <motion.div
            initial={{ y: 50, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            transition={{ delay: 0.3, duration: 0.8 }}
            className="flex flex-col items-center space-y-8 text-center"
          >
            {/* Victim Name with Glitch Effect */}
            <motion.div
              animate={{ 
                x: [0, -2, 2, -1, 1, 0],
                filter: [
                  'hue-rotate(0deg)',
                  'hue-rotate(90deg)', 
                  'hue-rotate(180deg)',
                  'hue-rotate(270deg)',
                  'hue-rotate(360deg)'
                ]
              }}
              transition={{ duration: 0.5, repeat: 3 }}
              className="text-6xl font-bold text-white drop-shadow-lg"
            >
              {victimName}
            </motion.div>
            
            {/* Skull Animation */}
            <motion.div
              initial={{ scale: 0, rotate: -180 }}
              animate={{ 
                scale: [0, 1.5, 1], 
                rotate: [180, 0, 360],
                filter: [
                  'drop-shadow(0 0 0 rgba(239, 68, 68, 0))',
                  'drop-shadow(0 0 20px rgba(239, 68, 68, 0.8))',
                  'drop-shadow(0 0 40px rgba(239, 68, 68, 1))'
                ]
              }}
              transition={{ 
                duration: 1.2, 
                times: [0, 0.6, 1],
                ease: "easeOut"
              }}
              className="text-8xl"
            >
              💀
            </motion.div>
            
            {/* Death Message */}
            <motion.div
              initial={{ scale: 0, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              transition={{ delay: 1, duration: 0.5 }}
              className="bg-red-600/80 backdrop-blur-md px-8 py-4 rounded-2xl border-2 border-red-400 shadow-2xl shadow-red-500/50"
            >
              <motion.div
                animate={{ 
                  textShadow: [
                    '0 0 0 rgba(239, 68, 68, 0)',
                    '0 0 10px rgba(239, 68, 68, 0.8)',
                    '0 0 20px rgba(239, 68, 68, 1)',
                    '0 0 10px rgba(239, 68, 68, 0.8)',
                    '0 0 0 rgba(239, 68, 68, 0)'
                  ]
                }}
                transition={{ duration: 2, repeat: Infinity }}
                className="text-3xl font-bold text-white"
              >
                <TypewriterText text="БЫЛ ИСКЛЮЧЕН" speed={150} />
              </motion.div>
            </motion.div>
            
            {/* Continuation Message */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 1.8, duration: 0.5 }}
              className="text-white text-xl font-medium"
            >
              <TypewriterText text="Игра продолжается..." speed={100} />
            </motion.div>
          </motion.div>
          
          {/* Particle Effects */}
          {Array.from({ length: 20 }).map((_, i) => (
            <motion.div
              key={i}
              className="absolute w-2 h-2 bg-red-500 rounded-full"
              initial={{ 
                x: '50vw', 
                y: '50vh',
                scale: 0,
                opacity: 1
              }}
              animate={{ 
                x: `${50 + (Math.random() - 0.5) * 100}vw`,
                y: `${50 + (Math.random() - 0.5) * 100}vh`,
                scale: [0, 1, 0],
                opacity: [1, 0.8, 0]
              }}
              transition={{ 
                duration: 2,
                delay: 0.5 + Math.random() * 0.5,
                ease: "easeOut"
              }}
            />
          ))}
        </motion.div>
      )}
    </AnimatePresence>
  );
}