import React, { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { 
  Users, 
  Key, 
  History, 
  LogOut, 
  GraduationCap,
  Loader2,
  Plus,
  Trash2,
  Eye,
  EyeOff,
  RefreshCw,
  ExternalLink
} from 'lucide-react'
import { supabase } from '../../lib/supabase'
import { generateAccessKey, logAdminAction } from '../../lib/auth'

interface Class {
  id: string
  name: string
  student_count?: number
}

interface Student {
  id: string
  name: string
  class_id: string
  password_hash: string | null
  redirect_url: string | null
  created_at: string
}

interface Key {
  id: string
  student_id: string
  key_value: string
  status: 'active' | 'revoked'
  created_at: string
  revoked_at: string | null
}

interface AdminLog {
  id: string
  action: string
  details: any
  created_at: string
}

type AdminView = 'classes' | 'students' | 'logs'

interface AdminDashboardProps {
  onLogout: () => void
}

export function AdminDashboard({ onLogout }: AdminDashboardProps) {
  const [currentView, setCurrentView] = useState<AdminView>('classes')
  const [classes, setClasses] = useState<Class[]>([])
  const [students, setStudents] = useState<Student[]>([])
  const [selectedClass, setSelectedClass] = useState<Class | null>(null)
  const [keys, setKeys] = useState<Key[]>([])
  const [logs, setLogs] = useState<AdminLog[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [newKeyValue, setNewKeyValue] = useState('')
  const [showGeneratedKey, setShowGeneratedKey] = useState(false)

  useEffect(() => {
    if (currentView === 'classes') {
      loadClasses()
    } else if (currentView === 'logs') {
      loadLogs()
    }
  }, [currentView])

  useEffect(() => {
    if (selectedClass) {
      loadStudents(selectedClass.id)
    }
  }, [selectedClass])

  const loadClasses = async () => {
    try {
      setLoading(true)
      setError(null)

      const { data: classesData, error: classesError } = await supabase
        .from('classes')
        .select(`
          id,
          name,
          students (count)
        `)
        .order('name', { ascending: false })

      if (classesError) throw classesError

      const classesWithCount = classesData?.map(cls => ({
        id: cls.id,
        name: cls.name,
        student_count: cls.students?.[0]?.count || 0
      })) || []

      setClasses(classesWithCount)
    } catch (err: any) {
      setError('Ошибка загрузки классов')
      console.error('Ошибка загрузки классов:', err)
    } finally {
      setLoading(false)
    }
  }

  const loadStudents = async (classId: string) => {
    try {
      setLoading(true)
      setError(null)

      const { data: studentsData, error: studentsError } = await supabase
        .from('students')
        .select('*')
        .eq('class_id', classId)
        .order('name')

      if (studentsError) throw studentsError

      setStudents(studentsData || [])
      
      // Загружаем ключи для студентов
      const studentIds = studentsData?.map(s => s.id) || []
      if (studentIds.length > 0) {
        const { data: keysData, error: keysError } = await supabase
          .from('keys')
          .select('*')
          .in('student_id', studentIds)
          .order('created_at', { ascending: false })

        if (!keysError) {
          setKeys(keysData || [])
        }
      }
    } catch (err: any) {
      setError('Ошибка загрузки студентов')
      console.error('Ошибка загрузки студентов:', err)
    } finally {
      setLoading(false)
    }
  }

  const loadLogs = async () => {
    try {
      setLoading(true)
      setError(null)

      const { data: logsData, error: logsError } = await supabase
        .from('admin_logs')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(100)

      if (logsError) throw logsError

      setLogs(logsData || [])
    } catch (err: any) {
      setError('Ошибка загрузки логов')
      console.error('Ошибка загрузки логов:', err)
    } finally {
      setLoading(false)
    }
  }

  const generateKeyForStudent = async (studentId: string, studentName: string) => {
    try {
      const keyValue = generateAccessKey()
      
      const { error } = await supabase
        .from('keys')
        .insert({
          student_id: studentId,
          key_value: keyValue,
          status: 'active'
        })

      if (error) throw error

      await logAdminAction('generate_key', {
        student_id: studentId,
        student_name: studentName,
        key_value: keyValue
      })

      setNewKeyValue(keyValue)
      setShowGeneratedKey(true)
      
      // Обновляем список ключей
      if (selectedClass) {
        loadStudents(selectedClass.id)
      }
    } catch (err: any) {
      setError('Ошибка генерации ключа')
      console.error('Ошибка генерации ключа:', err)
    }
  }

  const revokeKey = async (keyId: string, keyValue: string, studentName: string) => {
    try {
      const { error } = await supabase
        .from('keys')
        .update({ 
          status: 'revoked',
          revoked_at: new Date().toISOString()
        })
        .eq('id', keyId)

      if (error) throw error

      await logAdminAction('revoke_key', {
        key_id: keyId,
        key_value: keyValue,
        student_name: studentName
      })

      // Обновляем список ключей
      if (selectedClass) {
        loadStudents(selectedClass.id)
      }
    } catch (err: any) {
      setError('Ошибка аннулирования ключа')
      console.error('Ошибка аннулирования ключа:', err)
    }
  }

  const updateStudentUrl = async (studentId: string, url: string, studentName: string) => {
    try {
      const { error } = await supabase
        .from('students')
        .update({ redirect_url: url || null })
        .eq('id', studentId)

      if (error) throw error

      await logAdminAction('update_student_url', {
        student_id: studentId,
        student_name: studentName,
        new_url: url
      })

      // Обновляем список студентов
      if (selectedClass) {
        loadStudents(selectedClass.id)
      }
    } catch (err: any) {
      setError('Ошибка обновления URL')
      console.error('Ошибка обновления URL:', err)
    }
  }

  const getStudentKeys = (studentId: string) => {
    return keys.filter(key => key.student_id === studentId)
  }

  const renderClasses = () => (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      className="space-y-6"
    >
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold text-gray-900">Классы</h2>
        <button
          onClick={loadClasses}
          className="flex items-center px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors"
        >
          <RefreshCw className="h-4 w-4 mr-2" />
          Обновить
        </button>
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-12">
          <Loader2 className="h-8 w-8 animate-spin text-purple-600" />
        </div>
      ) : error ? (
        <div className="text-center py-12">
          <p className="text-red-600 mb-4">{error}</p>
          <button
            onClick={loadClasses}
            className="px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors"
          >
            Попробовать еще раз
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {classes.map((classItem, index) => (
            <motion.div
              key={classItem.id}
              initial={{ y: 20, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              transition={{ delay: index * 0.05 }}
              whileHover={{ y: -4 }}
              className="bg-white rounded-xl shadow-md hover:shadow-lg transition-all duration-300 border border-gray-100 cursor-pointer"
              onClick={() => {
                setSelectedClass(classItem)
                setCurrentView('students')
              }}
            >
              <div className="p-6">
                <div className="flex items-center justify-between mb-4">
                  <div className="w-12 h-12 bg-purple-100 rounded-lg flex items-center justify-center">
                    <GraduationCap className="h-6 w-6 text-purple-600" />
                  </div>
                  <span className="text-sm text-gray-500">
                    {classItem.student_count} студентов
                  </span>
                </div>
                <h3 className="text-lg font-semibold text-gray-900 mb-2">
                  {classItem.name}
                </h3>
                <p className="text-gray-600 text-sm">
                  Нажмите для управления студентами
                </p>
              </div>
            </motion.div>
          ))}
        </div>
      )}
    </motion.div>
  )

  const renderStudents = () => (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      className="space-y-6"
    >
      <div className="flex items-center justify-between">
        <div>
          <button
            onClick={() => {
              setCurrentView('classes')
              setSelectedClass(null)
            }}
            className="text-purple-600 hover:text-purple-800 mb-2 text-sm"
          >
            ← Назад к классам
          </button>
          <h2 className="text-2xl font-bold text-gray-900">
            Класс {selectedClass?.name}
          </h2>
        </div>
        <button
          onClick={() => selectedClass && loadStudents(selectedClass.id)}
          className="flex items-center px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors"
        >
          <RefreshCw className="h-4 w-4 mr-2" />
          Обновить
        </button>
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-12">
          <Loader2 className="h-8 w-8 animate-spin text-purple-600" />
        </div>
      ) : error ? (
        <div className="text-center py-12">
          <p className="text-red-600 mb-4">{error}</p>
          <button
            onClick={() => selectedClass && loadStudents(selectedClass.id)}
            className="px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors"
          >
            Попробовать еще раз
          </button>
        </div>
      ) : (
        <div className="space-y-4">
          {students.map((student, index) => {
            const studentKeys = getStudentKeys(student.id)
            const activeKey = studentKeys.find(k => k.status === 'active')
            
            return (
              <motion.div
                key={student.id}
                initial={{ x: -20, opacity: 0 }}
                animate={{ x: 0, opacity: 1 }}
                transition={{ delay: index * 0.05 }}
                className="bg-white rounded-xl shadow-md p-6 border border-gray-100"
              >
                <div className="flex items-start justify-between mb-4">
                  <div className="flex-1">
                    <h3 className="text-lg font-semibold text-gray-900 mb-1">
                      {student.name}
                    </h3>
                    <div className="flex items-center space-x-4 text-sm text-gray-500">
                      <span>ID: {student.id.slice(0, 8)}...</span>
                      <span>
                        Пароль: {student.password_hash ? '✅' : '❌'}
                      </span>
                    </div>
                  </div>
                  <div className="text-right">
                    {activeKey ? (
                      <span className="px-2 py-1 bg-green-100 text-green-800 text-xs rounded">
                        Активный ключ
                      </span>
                    ) : (
                      <span className="px-2 py-1 bg-gray-100 text-gray-800 text-xs rounded">
                        Нет ключа
                      </span>
                    )}
                  </div>
                </div>

                <div className="space-y-3">
                  {/* URL студента */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      URL перенаправления
                    </label>
                    <div className="flex space-x-2">
                      <input
                        type="url"
                        defaultValue={student.redirect_url || ''}
                        placeholder="https://example.com/test"
                        className="flex-1 px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                        onBlur={(e) => {
                          if (e.target.value !== student.redirect_url) {
                            updateStudentUrl(student.id, e.target.value, student.name)
                          }
                        }}
                      />
                      {student.redirect_url && (
                        <a
                          href={student.redirect_url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="p-2 text-gray-500 hover:text-purple-600 border border-gray-300 rounded-lg hover:border-purple-300 transition-colors"
                        >
                          <ExternalLink className="h-4 w-4" />
                        </a>
                      )}
                    </div>
                  </div>

                  {/* Управление ключами */}
                  <div className="flex items-center justify-between pt-3 border-t border-gray-100">
                    <div className="flex items-center space-x-3">
                      {!activeKey && (
                        <button
                          onClick={() => generateKeyForStudent(student.id, student.name)}
                          className="flex items-center px-3 py-1.5 bg-green-600 text-white text-sm rounded-lg hover:bg-green-700 transition-colors"
                        >
                          <Plus className="h-4 w-4 mr-1" />
                          Создать ключ
                        </button>
                      )}
                      
                      {activeKey && (
                        <div className="flex items-center space-x-2">
                          <code className="px-2 py-1 bg-gray-100 rounded text-sm font-mono">
                            {activeKey.key_value}
                          </code>
                          <button
                            onClick={() => revokeKey(activeKey.id, activeKey.key_value, student.name)}
                            className="p-1.5 text-red-600 hover:bg-red-50 rounded transition-colors"
                            title="Аннулировать ключ"
                          >
                            <Trash2 className="h-4 w-4" />
                          </button>
                        </div>
                      )}
                    </div>
                    
                    <div className="text-xs text-gray-500">
                      {studentKeys.length > 0 && (
                        <span>Всего ключей: {studentKeys.length}</span>
                      )}
                    </div>
                  </div>
                </div>
              </motion.div>
            )
          })}
        </div>
      )}

      {/* Модальное окно с созданным ключом */}
      <AnimatePresence>
        {showGeneratedKey && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
            <motion.div
              initial={{ scale: 0.8, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.8, opacity: 0 }}
              className="bg-white rounded-2xl shadow-2xl p-8 max-w-md w-full"
            >
              <div className="text-center">
                <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
                  <Key className="h-8 w-8 text-green-600" />
                </div>
                <h3 className="text-xl font-semibold text-gray-900 mb-4">
                  Ключ создан успешно!
                </h3>
                <div className="bg-gray-50 rounded-lg p-4 mb-6">
                  <code className="text-lg font-mono text-purple-600 select-all">
                    {newKeyValue}
                  </code>
                </div>
                <p className="text-gray-600 text-sm mb-6">
                  Скопируйте этот ключ и передайте студенту. Ключ можно использовать только один раз для создания пароля.
                </p>
                <button
                  onClick={() => {
                    setShowGeneratedKey(false)
                    setNewKeyValue('')
                  }}
                  className="px-6 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors"
                >
                  Закрыть
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </motion.div>
  )

  const renderLogs = () => (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      className="space-y-6"
    >
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold text-gray-900">История действий</h2>
        <button
          onClick={loadLogs}
          className="flex items-center px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors"
        >
          <RefreshCw className="h-4 w-4 mr-2" />
          Обновить
        </button>
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-12">
          <Loader2 className="h-8 w-8 animate-spin text-purple-600" />
        </div>
      ) : error ? (
        <div className="text-center py-12">
          <p className="text-red-600 mb-4">{error}</p>
          <button
            onClick={loadLogs}
            className="px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors"
          >
            Попробовать еще раз
          </button>
        </div>
      ) : (
        <div className="bg-white rounded-xl shadow-md overflow-hidden">
          {logs.length === 0 ? (
            <div className="p-8 text-center text-gray-500">
              История действий пуста
            </div>
          ) : (
            <div className="divide-y divide-gray-100">
              {logs.map((log, index) => (
                <motion.div
                  key={log.id}
                  initial={{ x: -20, opacity: 0 }}
                  animate={{ x: 0, opacity: 1 }}
                  transition={{ delay: index * 0.02 }}
                  className="p-4 hover:bg-gray-50 transition-colors"
                >
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-center space-x-2 mb-1">
                        <span className="font-medium text-gray-900">
                          {log.action === 'generate_key' && '🔑 Создание ключа'}
                          {log.action === 'revoke_key' && '🚫 Аннулирование ключа'}
                          {log.action === 'update_student_url' && '🔗 Обновление URL'}
                          {!['generate_key', 'revoke_key', 'update_student_url'].includes(log.action) && log.action}
                        </span>
                      </div>
                      {log.details && (
                        <div className="text-sm text-gray-600">
                          {log.details.student_name && (
                            <p>Студент: {log.details.student_name}</p>
                          )}
                          {log.details.key_value && log.action === 'generate_key' && (
                            <p>Ключ: {log.details.key_value}</p>
                          )}
                          {log.details.new_url && (
                            <p>URL: {log.details.new_url}</p>
                          )}
                        </div>
                      )}
                    </div>
                    <div className="text-right">
                      <p className="text-xs text-gray-500">
                        {new Date(log.created_at).toLocaleString('ru-RU')}
                      </p>
                    </div>
                  </div>
                </motion.div>
              ))}
            </div>
          )}
        </div>
      )}
    </motion.div>
  )

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 via-white to-purple-50">
      <div className="container mx-auto px-4 py-8">
        {/* Навигация */}
        <motion.div
          initial={{ y: -20, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          className="bg-white rounded-xl shadow-md p-4 mb-8"
        >
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-6">
              <h1 className="text-2xl font-bold text-purple-900">Админ-панель</h1>
              <nav className="flex space-x-4">
                <button
                  onClick={() => setCurrentView('classes')}
                  className={`flex items-center px-4 py-2 rounded-lg transition-colors ${
                    currentView === 'classes'
                      ? 'bg-purple-100 text-purple-700'
                      : 'text-gray-600 hover:text-purple-700 hover:bg-purple-50'
                  }`}
                >
                  <GraduationCap className="h-4 w-4 mr-2" />
                  Классы
                </button>
                <button
                  onClick={() => setCurrentView('logs')}
                  className={`flex items-center px-4 py-2 rounded-lg transition-colors ${
                    currentView === 'logs'
                      ? 'bg-purple-100 text-purple-700'
                      : 'text-gray-600 hover:text-purple-700 hover:bg-purple-50'
                  }`}
                >
                  <History className="h-4 w-4 mr-2" />
                  История
                </button>
              </nav>
            </div>
            <button
              onClick={onLogout}
              className="flex items-center px-4 py-2 text-red-600 hover:bg-red-50 rounded-lg transition-colors"
            >
              <LogOut className="h-4 w-4 mr-2" />
              Выйти
            </button>
          </div>
        </motion.div>

        {/* Основной контент */}
        <AnimatePresence mode="wait">
          {currentView === 'classes' && !selectedClass && renderClasses()}
          {currentView === 'students' && selectedClass && renderStudents()}
          {currentView === 'logs' && renderLogs()}
        </AnimatePresence>
      </div>
    </div>
  )
}