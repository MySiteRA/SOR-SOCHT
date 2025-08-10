import React, { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { GraduationCap, Loader2, Info, MessageCircle, X } from 'lucide-react'
import { supabase } from '../lib/supabase'
import { useAuth } from '../contexts/AuthContext'

interface Class {
  id: string
  name: string
}

export function ClassSelection() {
  const [classes, setClasses] = useState<Class[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [showInfoMenu, setShowInfoMenu] = useState(false)
  const { setSelectedClass } = useAuth()

  useEffect(() => {
    loadClasses()
  }, [])

  const loadClasses = async () => {
    try {
      setLoading(true)
      setError(null)
      
      const { data, error: supabaseError } = await supabase
        .from('classes')
        .select('*')
        .order('name', { ascending: false })

      if (supabaseError) throw supabaseError

      setClasses(data || [])
    } catch (err: any) {
      setError('Ошибка загрузки классов')
      console.error('Ошибка загрузки классов:', err)
    } finally {
      setLoading(false)
    }
  }

  const handleClassSelect = (classId: string) => {
    setSelectedClass(classId)
  }

  const handleTelegramClick = () => {
    window.open('https://t.me/MrDarkRyder', '_blank')
  }
  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-indigo-100 flex items-center justify-center">
        <motion.div
          initial={{ scale: 0.8, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          className="text-center"
        >
          <Loader2 className="h-8 w-8 animate-spin text-blue-600 mx-auto mb-4" />
          <p className="text-gray-600">Загрузка классов...</p>
        </motion.div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-indigo-100 flex items-center justify-center">
        <motion.div
          initial={{ scale: 0.8, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          className="text-center bg-white p-8 rounded-xl shadow-lg"
        >
          <div className="text-red-500 mb-4">⚠️</div>
          <h3 className="text-lg font-semibold text-gray-900 mb-2">Ошибка загрузки</h3>
          <p className="text-gray-600 mb-4">{error}</p>
          <button
            onClick={loadClasses}
            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
          >
            Попробовать еще раз
          </button>
        </motion.div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-indigo-100">
      <div className="container mx-auto px-4 py-12">
        <motion.div
          initial={{ y: -20, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          className="text-center mb-12"
        >
          <div className="flex items-center justify-center mb-4 relative">
            <GraduationCap className="h-12 w-12 text-blue-600 mr-3" />
            <h1 className="text-4xl font-bold bg-gradient-to-r from-blue-600 to-indigo-600 bg-clip-text text-transparent">
              Test-UZ
            </h1>
            <button
              onClick={() => setShowInfoMenu(!showInfoMenu)}
              className="absolute right-0 top-1/2 transform -translate-y-1/2 p-2 text-blue-600 hover:bg-blue-50 rounded-full transition-colors"
            >
              <Info className="h-6 w-6" />
            </button>
          </div>
          <p className="text-xl text-gray-600">Выберите ваш класс</p>
        </motion.div>

        {/* Информационное меню */}
        <AnimatePresence>
          {showInfoMenu && (
            <>
              <div 
                className="fixed inset-0 bg-black bg-opacity-50 z-40"
                onClick={() => setShowInfoMenu(false)}
              />
              <motion.div
                initial={{ opacity: 0, scale: 0.9, y: -20 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.9, y: -20 }}
                transition={{ type: "spring", stiffness: 300 }}
                className="fixed top-20 right-4 bg-white rounded-xl shadow-2xl border border-gray-100 p-6 z-50 max-w-sm"
              >
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-lg font-semibold text-gray-900">Информация</h3>
                  <button
                    onClick={() => setShowInfoMenu(false)}
                    className="p-1 hover:bg-gray-100 rounded-full transition-colors"
                  >
                    <X className="h-4 w-4 text-gray-500" />
                  </button>
                </div>
                
                <div className="space-y-4">
                  <p className="text-gray-600 text-sm">
                    Для получения ключа напишите в Telegram:
                  </p>
                  
                  <motion.button
                    onClick={handleTelegramClick}
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.98 }}
                    className="w-full flex items-center justify-center space-x-3 bg-gradient-to-r from-blue-500 to-blue-600 text-white p-3 rounded-lg hover:from-blue-600 hover:to-blue-700 transition-all duration-200 shadow-md hover:shadow-lg"
                  >
                    <motion.div
                      animate={{ 
                        rotate: [0, -10, 10, -10, 0],
                        scale: [1, 1.1, 1, 1.1, 1]
                      }}
                      transition={{ 
                        duration: 2,
                        repeat: Infinity,
                        repeatDelay: 3
                      }}
                    >
                      <MessageCircle className="h-5 w-5" />
                    </motion.div>
                    <span className="font-medium">@MrDarkRyder</span>
                  </motion.button>
                  
                  <p className="text-xs text-gray-500 text-center">
                    Нажмите для перехода в Telegram
                  </p>
                </div>
              </motion.div>
            </>
          )}
        </AnimatePresence>
        <div className="max-w-6xl mx-auto">
          <AnimatePresence>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ duration: 0.5 }}
              className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-4"
            >
              {classes.map((classItem, index) => (
                <motion.div
                  key={classItem.id}
                  initial={{ y: 20, opacity: 0 }}
                  animate={{ y: 0, opacity: 1 }}
                  transition={{ 
                    delay: index * 0.05,
                    type: "spring",
                    stiffness: 300
                  }}
                  whileHover={{ 
                    y: -8, 
                    scale: 1.05,
                    transition: { type: "spring", stiffness: 400 }
                  }}
                  whileTap={{ scale: 0.95 }}
                >
                  <button
                    onClick={() => handleClassSelect(classItem.id)}
                    className="w-full aspect-square bg-white rounded-xl shadow-md hover:shadow-xl transition-all duration-300 group border border-gray-100 hover:border-blue-300"
                  >
                    <div className="flex flex-col items-center justify-center h-full p-4">
                      <div className="w-12 h-12 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-lg flex items-center justify-center mb-3 group-hover:scale-110 transition-transform duration-200">
                        <GraduationCap className="h-6 w-6 text-white" />
                      </div>
                      <span className="text-lg font-semibold text-gray-800 group-hover:text-blue-600 transition-colors">
                        {classItem.name}
                      </span>
                    </div>
                  </button>
                </motion.div>
              ))}
            </motion.div>
          </AnimatePresence>
        </div>
      </div>
    </div>
  )
}