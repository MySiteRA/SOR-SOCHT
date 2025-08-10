import React, { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { X, Key, Lock, ArrowLeft, Eye, EyeOff, CheckCircle } from 'lucide-react'
import { useAuth } from '../contexts/AuthContext'
import { supabase } from '../lib/supabase'
import { verifyAccessKey, setStudentPassword, verifyStudentPassword } from '../lib/auth'

type AuthStep = 'key' | 'password' | 'create-password'

export function AuthModal() {
  const [step, setStep] = useState<AuthStep>('key')
  const [keyValue, setKeyValue] = useState('')
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [showConfirmPassword, setShowConfirmPassword] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const { selectedStudent, setAuthenticated, setSelectedStudent } = useAuth()

  useEffect(() => {
    if (selectedStudent) {
      checkAuthStep()
    }
  }, [selectedStudent])

  const checkAuthStep = async () => {
    if (!selectedStudent) return

    try {
      // Проверяем есть ли у студента пароль
      const { data, error } = await supabase
        .from('students')
        .select('password_hash')
        .eq('id', selectedStudent.id)
        .single()

      if (error) throw error

      if (data?.password_hash) {
        setStep('password')
      } else {
        setStep('key')
      }
    } catch (err) {
      console.error('Ошибка проверки статуса аутентификации:', err)
      setStep('key')
    }
  }

  const handleKeySubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!selectedStudent) return

    setLoading(true)
    setError('')

    try {
      const { valid } = await verifyAccessKey(selectedStudent.id, keyValue.toUpperCase())
      
      if (valid) {
        setStep('create-password')
      } else {
        setError('Неверный ключ доступа')
      }
    } catch (err) {
      setError('Ошибка проверки ключа')
    } finally {
      setLoading(false)
    }
  }

  const handlePasswordSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!selectedStudent) return

    setLoading(true)
    setError('')

    try {
      const isValid = await verifyStudentPassword(selectedStudent.id, password)
      
      if (isValid) {
        handleSuccessfulAuth()
      } else {
        setError('Неверный пароль')
      }
    } catch (err) {
      setError('Ошибка проверки пароля')
    } finally {
      setLoading(false)
    }
  }

  const handleCreatePasswordSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!selectedStudent) return

    if (password.length < 6) {
      setError('Пароль должен содержать минимум 6 символов')
      return
    }

    if (password !== confirmPassword) {
      setError('Пароли не совпадают')
      return
    }

    setLoading(true)
    setError('')

    try {
      const success = await setStudentPassword(selectedStudent.id, password)
      
      if (success) {
        handleSuccessfulAuth()
      } else {
        setError('Ошибка сохранения пароля')
      }
    } catch (err) {
      setError('Ошибка создания пароля')
    } finally {
      setLoading(false)
    }
  }

  const handleSuccessfulAuth = () => {
    setAuthenticated(true)
    
    // Перенаправляем на URL ученика если он есть
    if (selectedStudent?.redirect_url) {
      setTimeout(() => {
        window.location.href = selectedStudent.redirect_url!
      }, 1000)
    }
  }

  const handleBack = () => {
    setSelectedStudent(null)
    setKeyValue('')
    setPassword('')
    setConfirmPassword('')
    setError('')
  }

  const formatKeyInput = (value: string) => {
    // Удаляем все кроме букв и цифр
    const clean = value.replace(/[^A-Z0-9]/g, '')
    // Добавляем дефисы каждые 4 символа
    const formatted = clean.match(/.{1,4}/g)?.join('-') || clean
    return formatted.slice(0, 14) // Максимум 12 символов + 2 дефиса
  }

  if (!selectedStudent) return null

  return (
    <AnimatePresence>
      <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
        <motion.div
          initial={{ y: 100, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          exit={{ y: 100, opacity: 0 }}
          transition={{ type: "spring", stiffness: 300 }}
          className="bg-white rounded-2xl shadow-2xl w-full max-w-md"
        >
          <div className="flex items-center justify-between p-6 border-b">
            <h2 className="text-xl font-semibold text-gray-900">
              {step === 'key' && 'Введите ключ доступа'}
              {step === 'password' && 'Введите пароль'}
              {step === 'create-password' && 'Создайте пароль'}
            </h2>
            <button
              onClick={handleBack}
              className="p-1 hover:bg-gray-100 rounded-full transition-colors"
            >
              <X className="h-5 w-5 text-gray-500" />
            </button>
          </div>

          <div className="p-6">
            <div className="mb-6">
              <div className="flex items-center mb-3">
                <div className="w-10 h-10 bg-blue-100 rounded-full flex items-center justify-center mr-3">
                  <span className="text-blue-600 font-semibold text-sm">
                    {selectedStudent.name.split(' ').map(n => n[0]).slice(0, 2).join('')}
                  </span>
                </div>
                <div>
                  <p className="font-medium text-gray-900">{selectedStudent.name}</p>
                  <p className="text-sm text-gray-500">Авторизация</p>
                </div>
              </div>
            </div>

            <AnimatePresence mode="wait">
              {step === 'key' && (
                <motion.form
                  key="key-form"
                  initial={{ x: -20, opacity: 0 }}
                  animate={{ x: 0, opacity: 1 }}
                  exit={{ x: 20, opacity: 0 }}
                  onSubmit={handleKeySubmit}
                >
                  <div className="mb-4">
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Ключ доступа
                    </label>
                    <div className="relative">
                      <Key className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400" />
                      <input
                        type="text"
                        value={keyValue}
                        onChange={(e) => setKeyValue(formatKeyInput(e.target.value.toUpperCase()))}
                        placeholder="XXXX-XXXX-XXXX"
                        className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent font-mono text-center tracking-wider"
                        maxLength={14}
                        required
                      />
                    </div>
                  </div>

                  {error && (
                    <motion.div
                      initial={{ opacity: 0, y: -10 }}
                      animate={{ opacity: 1, y: 0 }}
                      className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg text-red-700 text-sm"
                    >
                      {error}
                    </motion.div>
                  )}

                  <button
                    type="submit"
                    disabled={loading || keyValue.length < 14}
                    className="w-full bg-blue-600 text-white py-3 rounded-lg font-medium hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                  >
                    {loading ? 'Проверка...' : 'Продолжить'}
                  </button>
                </motion.form>
              )}

              {step === 'password' && (
                <motion.form
                  key="password-form"
                  initial={{ x: -20, opacity: 0 }}
                  animate={{ x: 0, opacity: 1 }}
                  exit={{ x: 20, opacity: 0 }}
                  onSubmit={handlePasswordSubmit}
                >
                  <div className="mb-4">
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Пароль
                    </label>
                    <div className="relative">
                      <Lock className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400" />
                      <input
                        type={showPassword ? 'text' : 'password'}
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        placeholder="Введите ваш пароль"
                        className="w-full pl-10 pr-12 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                        required
                      />
                      <button
                        type="button"
                        onClick={() => setShowPassword(!showPassword)}
                        className="absolute right-3 top-1/2 transform -translate-y-1/2 p-1 hover:bg-gray-100 rounded"
                      >
                        {showPassword ? (
                          <EyeOff className="h-4 w-4 text-gray-400" />
                        ) : (
                          <Eye className="h-4 w-4 text-gray-400" />
                        )}
                      </button>
                    </div>
                  </div>

                  {error && (
                    <motion.div
                      initial={{ opacity: 0, y: -10 }}
                      animate={{ opacity: 1, y: 0 }}
                      className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg text-red-700 text-sm"
                    >
                      {error}
                    </motion.div>
                  )}

                  <div className="space-y-3">
                    <button
                      type="submit"
                      disabled={loading || !password}
                      className="w-full bg-blue-600 text-white py-3 rounded-lg font-medium hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                    >
                      {loading ? 'Проверка...' : 'Войти'}
                    </button>
                    
                    <button
                      type="button"
                      onClick={() => setStep('key')}
                      className="w-full bg-gray-100 text-gray-700 py-3 rounded-lg font-medium hover:bg-gray-200 transition-colors"
                    >
                      Использовать ключ доступа
                    </button>
                  </div>
                </motion.form>
              )}

              {step === 'create-password' && (
                <motion.form
                  key="create-password-form"
                  initial={{ x: -20, opacity: 0 }}
                  animate={{ x: 0, opacity: 1 }}
                  exit={{ x: 20, opacity: 0 }}
                  onSubmit={handleCreatePasswordSubmit}
                >
                  <div className="mb-4 p-3 bg-green-50 border border-green-200 rounded-lg text-green-700 text-sm">
                    <div className="flex items-center">
                      <CheckCircle className="h-4 w-4 mr-2" />
                      Ключ верный! Создайте пароль для удобного входа в будущем.
                    </div>
                  </div>

                  <div className="space-y-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Новый пароль
                      </label>
                      <div className="relative">
                        <Lock className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400" />
                        <input
                          type={showPassword ? 'text' : 'password'}
                          value={password}
                          onChange={(e) => setPassword(e.target.value)}
                          placeholder="Минимум 6 символов"
                          className="w-full pl-10 pr-12 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                          required
                          minLength={6}
                        />
                        <button
                          type="button"
                          onClick={() => setShowPassword(!showPassword)}
                          className="absolute right-3 top-1/2 transform -translate-y-1/2 p-1 hover:bg-gray-100 rounded"
                        >
                          {showPassword ? (
                            <EyeOff className="h-4 w-4 text-gray-400" />
                          ) : (
                            <Eye className="h-4 w-4 text-gray-400" />
                          )}
                        </button>
                      </div>
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Подтвердите пароль
                      </label>
                      <div className="relative">
                        <Lock className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400" />
                        <input
                          type={showConfirmPassword ? 'text' : 'password'}
                          value={confirmPassword}
                          onChange={(e) => setConfirmPassword(e.target.value)}
                          placeholder="Повторите пароль"
                          className="w-full pl-10 pr-12 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                          required
                        />
                        <button
                          type="button"
                          onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                          className="absolute right-3 top-1/2 transform -translate-y-1/2 p-1 hover:bg-gray-100 rounded"
                        >
                          {showConfirmPassword ? (
                            <EyeOff className="h-4 w-4 text-gray-400" />
                          ) : (
                            <Eye className="h-4 w-4 text-gray-400" />
                          )}
                        </button>
                      </div>
                    </div>
                  </div>

                  {error && (
                    <motion.div
                      initial={{ opacity: 0, y: -10 }}
                      animate={{ opacity: 1, y: 0 }}
                      className="mt-4 p-3 bg-red-50 border border-red-200 rounded-lg text-red-700 text-sm"
                    >
                      {error}
                    </motion.div>
                  )}

                  <button
                    type="submit"
                    disabled={loading || !password || !confirmPassword}
                    className="w-full mt-6 bg-blue-600 text-white py-3 rounded-lg font-medium hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                  >
                    {loading ? 'Сохранение...' : 'Создать пароль и войти'}
                  </button>
                </motion.form>
              )}
            </AnimatePresence>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  )
}