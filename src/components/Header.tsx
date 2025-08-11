import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Shield, HelpCircle, X, MessageCircle } from 'lucide-react';

interface HeaderProps {
  onShowAdminModal: () => void;
}

export default function Header({ onShowAdminModal }: HeaderProps) {
  const [showKeyModal, setShowKeyModal] = useState(false);

  return (
    <>
      <header className="absolute top-0 left-0 right-0 z-40 p-4">
        <div className="flex justify-end items-center space-x-3">
          {/* Кнопка "Как получить ключ?" */}
          <motion.button
            whileHover={{ scale: 1.02, y: -1 }}
            whileTap={{ scale: 0.98 }}
            onClick={() => setShowKeyModal(true)}
            className="flex items-center space-x-2 bg-gradient-to-r from-blue-50 to-indigo-50 hover:from-blue-100 hover:to-indigo-100 text-blue-700 px-4 py-2 rounded-xl border border-blue-200 hover:border-blue-300 transition-all duration-300 shadow-sm hover:shadow-md backdrop-blur-sm"
          >
            <HelpCircle className="w-4 h-4" />
            <span className="text-sm font-medium hidden sm:inline">Как получить ключ?</span>
            <span className="text-sm font-medium sm:hidden">Ключ?</span>
          </motion.button>

          {/* Кнопка авторизации */}
          <motion.button
            whileHover={{ scale: 1.02, y: -1 }}
            whileTap={{ scale: 0.98 }}
            onClick={onShowAdminModal}
            className="flex items-center space-x-2 bg-gradient-to-r from-indigo-500 to-purple-600 hover:from-indigo-600 hover:to-purple-700 text-white px-4 py-2 rounded-xl transition-all duration-300 shadow-lg hover:shadow-xl"
          >
            <Shield className="w-4 h-4" />
            <span className="text-sm font-medium hidden sm:inline">Авторизация</span>
            <span className="text-sm font-medium sm:hidden">Вход</span>
          </motion.button>
        </div>
      </header>

      {/* Модальное окно "Как получить ключ?" */}
      <AnimatePresence>
        {showKeyModal && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-white/60 backdrop-blur-md flex items-center justify-center p-4 z-50"
            onClick={() => setShowKeyModal(false)}
          >
            <motion.div
              initial={{ opacity: 0, scale: 0.7, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.7, y: 20 }}
              transition={{ 
                type: "spring", 
                damping: 25, 
                stiffness: 300,
                duration: 0.3 
              }}
              onClick={(e) => e.stopPropagation()}
              className="bg-white rounded-2xl shadow-2xl max-w-md w-full mx-4 border border-gray-100 overflow-hidden"
            >
              {/* Заголовок */}
              <div className="bg-gradient-to-r from-blue-50 to-indigo-50 px-6 py-5 border-b border-gray-100">
                <div className="flex items-center justify-between">
                  <div>
                    <h2 className="text-2xl font-bold text-gray-900 mb-1">
                      Как получить ключ?
                    </h2>
                    <p className="text-gray-600 text-sm">
                      Чтобы получить ключ, напишите нам в Telegram:
                    </p>
                  </div>
                  <button
                    onClick={() => setShowKeyModal(false)}
                    className="p-2 hover:bg-white/50 rounded-xl transition-colors"
                  >
                    <X className="w-5 h-5 text-gray-500" />
                  </button>
                </div>
              </div>

              {/* Контент */}
              <div className="p-6 space-y-4">
                {/* Кнопка Поддержка 1 */}
                <motion.a
                  href="https://t.me/MrDarkRyder"
                  target="_blank"
                  rel="noopener noreferrer"
                  whileHover={{ scale: 1.02, y: -1 }}
                  whileTap={{ scale: 0.98 }}
                  className="flex items-center justify-center space-x-3 w-full bg-gradient-to-r from-blue-500 to-blue-600 hover:from-blue-600 hover:to-blue-700 text-white py-3 px-4 rounded-xl transition-all duration-300 shadow-lg hover:shadow-xl"
                >
                  <MessageCircle className="w-5 h-5" />
                  <span className="font-medium">Поддержка 1</span>
                </motion.a>

                {/* Кнопка Поддержка 2 */}
                <motion.a
                  href="https://t.me/Jaysson_5557"
                  target="_blank"
                  rel="noopener noreferrer"
                  whileHover={{ scale: 1.02, y: -1 }}
                  whileTap={{ scale: 0.98 }}
                  className="flex items-center justify-center space-x-3 w-full bg-gradient-to-r from-indigo-500 to-purple-600 hover:from-indigo-600 hover:to-purple-700 text-white py-3 px-4 rounded-xl transition-all duration-300 shadow-lg hover:shadow-xl"
                >
                  <MessageCircle className="w-5 h-5" />
                  <span className="font-medium">Поддержка 2</span>
                </motion.a>

                {/* Кнопка закрыть */}
                <motion.button
                  whileHover={{ scale: 1.01 }}
                  whileTap={{ scale: 0.99 }}
                  onClick={() => setShowKeyModal(false)}
                  className="w-full bg-gradient-to-r from-gray-100 to-gray-200 hover:from-gray-200 hover:to-gray-300 text-gray-700 py-3 px-4 rounded-xl transition-all duration-300 font-medium mt-6"
                >
                  Закрыть
                </motion.button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}