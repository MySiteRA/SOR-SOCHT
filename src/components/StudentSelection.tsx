import React, { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { User, ArrowLeft, Loader2 } from 'lucide-react'
import { supabase } from '../lib/supabase'
import { useAuth } from '../contexts/AuthContext'

interface Student {
  id: string
  name: string
  class_id: string
  redirect_url: string | null
}

export function StudentSelection() {
  const [students, setStudents] = useState<Student[]>([])
  const [className, setClassName] = useState('')
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const { selectedClass, setSelectedClass, setSelectedStudent } = useAuth()

  useEffect(() => {
    if (selectedClass) {
      loadStudents()
    }
  }, [selectedClass])

  const loadStudents = async () => {
    try {
      setLoading(true)
      setError(null)

      // Загружаем информацию о классе
      const { data: classData, error: classError } = await supabase
        .from('classes')
        .select('name')
        .eq('id', selectedClass)
        .single()

      if (classError) throw classError

      setClassName(classData?.name || '')

      // Загружаем студентов
      const { data: studentsData, error: studentsError } = await supabase
        .from('students')
        .select('*')
        .eq('class_id', selectedClass)
        .order('name')

      if (studentsError) throw studentsError

      setStudents(studentsData || [])
    } catch (err: any) {
      setError('Ошибка загрузки студентов')
      console.error('Ошибка загрузки студентов:', err)
    } finally {
      setLoading(false)
    }
  }

  const handleStudentSelect = (student: Student) => {
    setSelectedStudent(student)
  }

  const handleBack = () => {
    setSelectedClass(null)
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
          <p className="text-gray-600">Загрузка студентов...</p>
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
          <div className="space-x-4">
            <button
              onClick={loadStudents}
              className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
            >
              Попробовать еще раз
            </button>
            <button
              onClick={handleBack}
              className="px-4 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700 transition-colors"
            >
              Назад
            </button>
          </div>
        </motion.div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-indigo-100">
      <div className="container mx-auto px-4 py-12">
        <motion.div
          initial={{ x: -20, opacity: 0 }}
          animate={{ x: 0, opacity: 1 }}
          className="mb-8"
        >
          <button
            onClick={handleBack}
            className="flex items-center text-blue-600 hover:text-blue-800 transition-colors mb-6"
          >
            <ArrowLeft className="h-5 w-5 mr-2" />
            Назад к выбору класса
          </button>
          
          <div className="text-center">
            <h1 className="text-3xl font-bold text-gray-900 mb-2">
              Класс {className}
            </h1>
            <p className="text-lg text-gray-600">Выберите вашего ученика</p>
          </div>
        </motion.div>

        <div className="max-w-4xl mx-auto">
          <AnimatePresence>
            {students.length === 0 ? (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className="text-center py-12"
              >
                <p className="text-gray-600 text-lg">В этом классе пока нет учеников</p>
              </motion.div>
            ) : (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ duration: 0.5 }}
                className="space-y-3"
              >
                {students.map((student, index) => (
                  <motion.div
                    key={student.id}
                    initial={{ x: -20, opacity: 0 }}
                    animate={{ x: 0, opacity: 1 }}
                    transition={{ 
                      delay: index * 0.05,
                      type: "spring",
                      stiffness: 300
                    }}
                    whileHover={{ 
                      x: 8,
                      transition: { type: "spring", stiffness: 400 }
                    }}
                    whileTap={{ scale: 0.98 }}
                  >
                    <button
                      onClick={() => handleStudentSelect(student)}
                      className="w-full bg-white rounded-xl shadow-md hover:shadow-lg transition-all duration-300 border border-gray-100 hover:border-blue-300 group p-6"
                    >
                      <div className="flex items-center">
                        <div className="w-12 h-12 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-full flex items-center justify-center mr-4 group-hover:scale-110 transition-transform duration-200">
                          <User className="h-6 w-6 text-white" />
                        </div>
                        <div className="text-left flex-1">
                          <h3 className="text-lg font-semibold text-gray-900 group-hover:text-blue-600 transition-colors">
                            {student.name}
                          </h3>
                          {student.redirect_url && (
                            <p className="text-sm text-gray-500 mt-1">
                              URL: {student.redirect_url}
                            </p>
                          )}
                        </div>
                        <div className="w-6 h-6 border-2 border-gray-300 rounded-full group-hover:border-blue-500 group-hover:bg-blue-50 transition-all duration-200" />
                      </div>
                    </button>
                  </motion.div>
                ))}
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>
    </div>
  )
}