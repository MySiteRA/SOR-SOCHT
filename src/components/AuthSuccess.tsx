import React, { useEffect } from 'react'
import { motion } from 'framer-motion'
import { CheckCircle, ExternalLink } from 'lucide-react'
import { useAuth } from '../contexts/AuthContext'

export function AuthSuccess() {
  const { selectedStudent } = useAuth()

  useEffect(() => {
    if (selectedStudent?.redirect_url) {
      const timer = setTimeout(() => {
        window.location.href = selectedStudent.redirect_url!
      }, 3000)
      
      return () => clearTimeout(timer)
    }
  }, [selectedStudent])

  return (
    <div className="min-h-screen bg-gradient-to-br from-green-50 via-white to-emerald-100 flex items-center justify-center">
      <motion.div
        initial={{ scale: 0.8, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        transition={{ type: "spring", stiffness: 300 }}
        className="bg-white p-8 rounded-2xl shadow-xl text-center max-w-md mx-auto"
      >
        <motion.div
          initial={{ scale: 0 }}
          animate={{ scale: 1 }}
          transition={{ delay: 0.2, type: "spring", stiffness: 300 }}
          className="w-20 h-20 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-6"
        >
          <CheckCircle className="h-12 w-12 text-green-600" />
        </motion.div>

        <motion.div
          initial={{ y: 20, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ delay: 0.4 }}
        >
          <h1 className="text-2xl font-bold text-gray-900 mb-2">
            Успешный вход!
          </h1>
          <p className="text-gray-600 mb-6">
            Добро пожаловать, {selectedStudent?.name}
          </p>

          {selectedStudent?.redirect_url ? (
            <div className="space-y-4">
              <motion.div
                initial={{ scale: 0.9 }}
                animate={{ scale: 1 }}
                transition={{ delay: 0.6 }}
                className="p-4 bg-blue-50 rounded-lg border border-blue-200"
              >
                <p className="text-sm text-blue-700 mb-2">
                  Перенаправление на ваш тест...
                </p>
                <div className="flex items-center justify-center">
                  <ExternalLink className="h-4 w-4 text-blue-600 mr-2" />
                  <span className="text-blue-600 text-sm font-medium">
                    {selectedStudent.redirect_url}
                  </span>
                </div>
              </motion.div>

              <motion.div
                initial={{ width: 0 }}
                animate={{ width: '100%' }}
                transition={{ duration: 3, ease: "linear" }}
                className="h-2 bg-blue-600 rounded-full"
              />
            </div>
          ) : (
            <p className="text-gray-500">
              URL для перенаправления не настроен
            </p>
          )}
        </motion.div>
      </motion.div>
    </div>
  )
}