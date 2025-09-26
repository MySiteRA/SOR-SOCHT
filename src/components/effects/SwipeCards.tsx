import React, { useState } from 'react';
import { motion, PanInfo, useMotionValue, useTransform } from 'framer-motion';

interface SwipeCardsProps {
  onSwipeLeft: () => void;
  onSwipeRight: () => void;
  onTapLeft: () => void;
  onTapRight: () => void;
  isDarkMode: boolean;
}

export default function SwipeCards({ 
  onSwipeLeft, 
  onSwipeRight, 
  onTapLeft, 
  onTapRight, 
  isDarkMode 
}: SwipeCardsProps) {
  const [draggedCard, setDraggedCard] = useState<'truth' | 'dare' | null>(null);
  const x = useMotionValue(0);
  const rotate = useTransform(x, [-200, 200], [-25, 25]);
  const opacity = useTransform(x, [-200, -100, 0, 100, 200], [0, 1, 1, 1, 0]);

  const handleDragEnd = (event: any, info: PanInfo) => {
    const threshold = 100;
    
    if (info.offset.x > threshold) {
      onSwipeRight();
    } else if (info.offset.x < -threshold) {
      onSwipeLeft();
    }
    
    setDraggedCard(null);
    x.set(0);
  };

  return (
    <div className="relative w-full max-w-md mx-auto">
      <motion.div
        initial={{ opacity: 0, scale: 0.8 }}
        animate={{ opacity: 1, scale: 1 }}
        className="text-center mb-8"
      >
        <motion.div
          animate={{ rotate: [0, 10, -10, 0] }}
          transition={{ duration: 2, repeat: Infinity }}
          className="text-8xl mb-4"
        >
          🎭
        </motion.div>
        <h2 className={`text-3xl font-bold mb-2 ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>
          Ваш ход!
        </h2>
        <p className={`text-lg ${isDarkMode ? 'text-gray-300' : 'text-gray-600'}`}>
          Выберите: Правда или Действие?
        </p>
        <p className={`text-sm mt-2 ${isDarkMode ? 'text-gray-400' : 'text-gray-500'}`}>
          Свайпните влево для Правды, вправо для Действия
        </p>
      </motion.div>

      {/* Swipe Indicators */}
      <div className="absolute top-1/2 left-0 right-0 flex justify-between px-8 pointer-events-none z-10">
        <motion.div
          animate={{ 
            scale: draggedCard === 'truth' ? [1, 1.2, 1] : 1,
            opacity: draggedCard === 'truth' ? [0.5, 1, 0.5] : 0.3
          }}
          transition={{ duration: 0.5, repeat: draggedCard === 'truth' ? Infinity : 0 }}
          className="text-6xl filter drop-shadow-lg"
        >
          🤔
        </motion.div>
        
        <motion.div
          animate={{ 
            scale: draggedCard === 'dare' ? [1, 1.2, 1] : 1,
            opacity: draggedCard === 'dare' ? [0.5, 1, 0.5] : 0.3
          }}
          transition={{ duration: 0.5, repeat: draggedCard === 'dare' ? Infinity : 0 }}
          className="text-6xl filter drop-shadow-lg"
        >
          ⚡
        </motion.div>
      </div>

      {/* Swipeable Card */}
      <motion.div
        drag="x"
        dragConstraints={{ left: 0, right: 0 }}
        dragElastic={0.2}
        onDragStart={() => setDraggedCard('truth')}
        onDrag={(event, info) => {
          if (info.offset.x > 50) {
            setDraggedCard('dare');
          } else if (info.offset.x < -50) {
            setDraggedCard('truth');
          }
        }}
        onDragEnd={handleDragEnd}
        style={{ x, rotate, opacity }}
        whileHover={{ scale: 1.05 }}
        whileTap={{ scale: 0.95 }}
        className={`relative w-full h-80 rounded-3xl border-2 cursor-grab active:cursor-grabbing backdrop-blur-md ${
          isDarkMode 
            ? 'bg-gray-800/60 border-purple-500/50 shadow-2xl shadow-purple-500/20' 
            : 'bg-white/80 border-indigo-300/50 shadow-2xl shadow-indigo-500/20'
        }`}
      >
        <div className="absolute inset-0 rounded-3xl bg-gradient-to-br from-indigo-500/20 via-purple-500/20 to-pink-500/20" />
        
        <div className="relative z-10 h-full flex flex-col items-center justify-center p-8">
          <motion.div
            animate={{ 
              scale: [1, 1.1, 1],
              rotate: [0, 5, -5, 0]
            }}
            transition={{ duration: 2, repeat: Infinity }}
            className="text-8xl mb-6"
          >
            🎲
          </motion.div>
          
          <h3 className={`text-2xl font-bold mb-4 ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>
            Сделайте выбор
          </h3>
          
          <div className="flex space-x-4">
            <motion.div
              whileHover={{ scale: 1.1 }}
              className="text-center"
            >
              <div className="text-4xl mb-2">🤔</div>
              <div className={`text-sm font-medium ${isDarkMode ? 'text-blue-300' : 'text-blue-600'}`}>
                ← Правда
              </div>
            </motion.div>
            
            <motion.div
              whileHover={{ scale: 1.1 }}
              className="text-center"
            >
              <div className="text-4xl mb-2">⚡</div>
              <div className={`text-sm font-medium ${isDarkMode ? 'text-orange-300' : 'text-orange-600'}`}>
                Действие →
              </div>
            </motion.div>
          </div>
        </div>

        {/* Glow Effects */}
        <motion.div
          animate={{
            opacity: draggedCard === 'truth' ? [0, 0.5, 0] : 0,
            scale: draggedCard === 'truth' ? [1, 1.1, 1] : 1
          }}
          transition={{ duration: 0.5, repeat: draggedCard === 'truth' ? Infinity : 0 }}
          className="absolute inset-0 rounded-3xl bg-blue-500/30 blur-xl"
        />
        
        <motion.div
          animate={{
            opacity: draggedCard === 'dare' ? [0, 0.5, 0] : 0,
            scale: draggedCard === 'dare' ? [1, 1.1, 1] : 1
          }}
          transition={{ duration: 0.5, repeat: draggedCard === 'dare' ? Infinity : 0 }}
          className="absolute inset-0 rounded-3xl bg-orange-500/30 blur-xl"
        />
      </motion.div>

      {/* Fallback Buttons for Desktop */}
      <div className="mt-8 grid grid-cols-2 gap-4 md:hidden">
        <motion.button
          whileHover={{ scale: 1.05, boxShadow: "0 0 30px rgba(59, 130, 246, 0.5)" }}
          whileTap={{ scale: 0.95 }}
          onClick={onTapLeft}
          className={`p-6 rounded-2xl border-2 transition-all duration-300 ${
            isDarkMode 
              ? 'bg-blue-500/20 border-blue-400/50 text-white shadow-lg shadow-blue-500/30' 
              : 'bg-blue-50 border-blue-300 text-blue-700 shadow-lg shadow-blue-500/20'
          }`}
        >
          <div className="text-4xl mb-3">🤔</div>
          <div className="font-bold text-lg">Правда</div>
          <div className="text-sm opacity-80">Ответить честно</div>
        </motion.button>
        
        <motion.button
          whileHover={{ scale: 1.05, boxShadow: "0 0 30px rgba(249, 115, 22, 0.5)" }}
          whileTap={{ scale: 0.95 }}
          onClick={onTapRight}
          className={`p-6 rounded-2xl border-2 transition-all duration-300 ${
            isDarkMode 
              ? 'bg-orange-500/20 border-orange-400/50 text-white shadow-lg shadow-orange-500/30' 
              : 'bg-orange-50 border-orange-300 text-orange-700 shadow-lg shadow-orange-500/20'
          }`}
        >
          <div className="text-4xl mb-3">⚡</div>
          <div className="font-bold text-lg">Действие</div>
          <div className="text-sm opacity-80">Выполнить задание</div>
        </motion.button>
      </div>
    </div>
  );
}