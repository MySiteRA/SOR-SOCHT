import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';

interface AtmosphereBackgroundProps {
  phase: 'night' | 'day';
  children?: React.ReactNode;
}

export default function AtmosphereBackground({ phase, children }: AtmosphereBackgroundProps) {
  return (
    <div className="relative min-h-screen overflow-hidden">
      <AnimatePresence mode="wait">
        {phase === 'night' ? (
          <motion.div
            key="night-bg"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 1.5 }}
            className="fixed inset-0 bg-gradient-to-b from-gray-900 via-black to-blue-900"
          >
            {/* Animated Stars */}
            <div className="absolute inset-0">
              {Array.from({ length: 100 }).map((_, i) => (
                <motion.div
                  key={`star-${i}`}
                  className="absolute w-1 h-1 bg-white rounded-full"
                  style={{
                    left: `${Math.random() * 100}%`,
                    top: `${Math.random() * 100}%`,
                  }}
                  animate={{
                    opacity: [0.2, 1, 0.2],
                    scale: [0.5, 1.2, 0.5]
                  }}
                  transition={{
                    duration: 2 + Math.random() * 3,
                    repeat: Infinity,
                    delay: Math.random() * 2
                  }}
                />
              ))}
            </div>
            
            {/* Shooting Stars */}
            {Array.from({ length: 3 }).map((_, i) => (
              <motion.div
                key={`shooting-star-${i}`}
                className="absolute w-2 h-0.5 bg-gradient-to-r from-white to-transparent rounded-full"
                initial={{ 
                  x: -100, 
                  y: Math.random() * 300 + 100,
                  opacity: 0 
                }}
                animate={{ 
                  x: window.innerWidth + 100,
                  opacity: [0, 1, 0]
                }}
                transition={{
                  duration: 2,
                  delay: i * 5 + Math.random() * 10,
                  repeat: Infinity,
                  repeatDelay: 15
                }}
              />
            ))}
            
            {/* Mystical Fog */}
            <motion.div
              animate={{ 
                opacity: [0.1, 0.3, 0.1],
                scale: [1, 1.1, 1]
              }}
              transition={{ duration: 8, repeat: Infinity }}
              className="absolute bottom-0 left-0 right-0 h-1/3 bg-gradient-to-t from-purple-900/30 to-transparent"
            />
          </motion.div>
        ) : (
          <motion.div
            key="day-bg"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 1.5 }}
            className="fixed inset-0 bg-gradient-to-b from-yellow-200 via-blue-200 to-indigo-300"
          >
            {/* Floating Clouds */}
            {Array.from({ length: 5 }).map((_, i) => (
              <motion.div
                key={`cloud-${i}`}
                className="absolute text-white text-4xl opacity-60"
                style={{
                  top: `${20 + Math.random() * 40}%`,
                  left: `${Math.random() * 100}%`,
                }}
                animate={{
                  x: [0, 50, 0],
                  y: [0, -10, 0]
                }}
                transition={{
                  duration: 15 + Math.random() * 10,
                  repeat: Infinity,
                  delay: Math.random() * 5
                }}
              >
                ☁️
              </motion.div>
            ))}
            
            {/* Sun Rays */}
            <motion.div
              animate={{ rotate: 360 }}
              transition={{ duration: 30, repeat: Infinity, ease: "linear" }}
              className="absolute top-8 right-8 w-32 h-32"
            >
              {Array.from({ length: 8 }).map((_, i) => (
                <div
                  key={i}
                  className="absolute w-1 h-16 bg-gradient-to-t from-yellow-400/50 to-transparent origin-bottom"
                  style={{
                    transform: `rotate(${i * 45}deg)`,
                    left: '50%',
                    bottom: '50%',
                    transformOrigin: '0 100%'
                  }}
                />
              ))}
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
      
      {/* Content */}
      <div className="relative z-10">
        {children}
      </div>
    </div>
  );
}