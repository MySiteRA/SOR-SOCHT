import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { ArrowLeft } from 'lucide-react';
import ClassCard from '../components/ClassCard';
import StudentCard from '../components/StudentCard';
import Header from '../components/Header';
import Modal from '../components/Modal';
import LoadingSpinner from '../components/LoadingSpinner';
import StudentDashboard from './StudentDashboard';
import { getClasses, getStudentsByClass, validateKey, validatePassword, createPassword } from '../lib/api';
import type { Class, Student } from '../lib/supabase';

type View = 'classes' | 'students' | 'dashboard' | 'admin-login';

interface HomePageProps {
  onShowAdminModal: () => void;
}

export default function HomePage({ onShowAdminModal }: HomePageProps) {
  const [view, setView] = useState<View>('classes');
  const [classes, setClasses] = useState<Class[]>([]);
  const [students, setStudents] = useState<Student[]>([]);
  const [selectedClass, setSelectedClass] = useState<Class | null>(null);
  const [selectedStudent, setSelectedStudent] = useState<Student | null>(null);
  const [authenticatedStudent, setAuthenticatedStudent] = useState<Student | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Состояния модальных окон
  const [showKeyModal, setShowKeyModal] = useState(false);
  const [showPasswordModal, setShowPasswordModal] = useState(false);
  const [showCreatePasswordModal, setShowCreatePasswordModal] = useState(false);
  
  // Состояния полей ввода
  const [keyInput, setKeyInput] = useState('');
  const [passwordInput, setPasswordInput] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');

  useEffect(() => {
    loadClasses();
  }, []);

  const loadClasses = async () => {
    try {
      setLoading(true);
      const classData = await getClasses();
      setClasses(classData);
    } catch (err) {
      setError('Ошибка загрузки классов');
    } finally {
      setLoading(false);
    }
  };

  const loadStudents = async (classItem: Class) => {
    try {
      setLoading(true);
      const studentData = await getStudentsByClass(classItem.id);
      setStudents(studentData);
      setSelectedClass(classItem);
      setView('students');
    } catch (err) {
      setError('Ошибка загрузки учеников');
    } finally {
      setLoading(false);
    }
  };

  const handleStudentClick = (student: Student) => {
    setSelectedStudent(student);
    
    if (student.password_hash) {
      setShowPasswordModal(true);
    } else {
      setShowKeyModal(true);
    }
  };

  const handleKeySubmit = async () => {
    if (!keyInput.trim() || !selectedStudent) return;

    try {
      const result = await validateKey(keyInput.trim(), selectedStudent.id);
      
      if (result.valid && result.student) {
        setShowKeyModal(false);
        setKeyInput('');
        setShowCreatePasswordModal(true);
      } else {
        setError('Неверный ключ или ключ не принадлежит этому ученику');
      }
    } catch (err) {
      setError('Ошибка проверки ключа');
    }
  };

  const handlePasswordSubmit = async () => {
    if (!passwordInput.trim() || !selectedStudent) return;

    try {
      const result = await validatePassword(selectedStudent.id, passwordInput.trim());
      
      if (result.valid && result.student) {
        setAuthenticatedStudent(result.student);
        setView('dashboard');
        setShowPasswordModal(false);
        setPasswordInput('');
        setError(null);
      } else {
        setError('Неверный пароль');
      }
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Ошибка проверки пароля';
      setError(errorMessage);
    }
  };

  const handleCreatePassword = async () => {
    if (!newPassword.trim() || !confirmPassword.trim() || !selectedStudent) return;

    if (newPassword !== confirmPassword) {
      setError('Пароли не совпадают');
      return;
    }

    if (newPassword.length < 4) {
      setError('Пароль должен содержать минимум 4 символа');
      return;
    }
    
    try {
      await createPassword(selectedStudent.id, newPassword);
      
      // Получаем обновленные данные студента из базы данных
      const updatedStudent = await getStudent(selectedStudent.id);
      if (!updatedStudent) {
        setError('Ошибка получения данных ученика');
        return;
      }
      
      setAuthenticatedStudent(updatedStudent);
      setView('dashboard');
      setShowCreatePasswordModal(false);
      setNewPassword('');
      setConfirmPassword('');
      setError(null);
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Ошибка создания пароля';
      setError(errorMessage);
    }
  };

  const handleBack = () => {
    if (view === 'dashboard') {
      setView('classes');
      setAuthenticatedStudent(null);
      setSelectedClass(null);
      setSelectedStudent(null);
      setStudents([]);
    } else if (view === 'students') {
      setView('classes');
      setSelectedClass(null);
      setStudents([]);
    }
  };

  const handleLogout = () => {
    setView('classes');
    setAuthenticatedStudent(null);
    setSelectedClass(null);
    setSelectedStudent(null);
    setStudents([]);
    closeAllModals();
  };

  const closeAllModals = () => {
    setShowKeyModal(false);
    setShowPasswordModal(false);
    setShowCreatePasswordModal(false);
    setKeyInput('');
    setPasswordInput('');
    setNewPassword('');
    setConfirmPassword('');
    setSelectedStudent(null);
    setError(null);
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center">
        <LoadingSpinner />
      </div>
    );
  }

  // Show student dashboard if authenticated
  if (view === 'dashboard' && authenticatedStudent && selectedClass) {
    return (
      <StudentDashboard
        student={authenticatedStudent}
        className={selectedClass.name}
        onLogout={handleLogout}
      />
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100">
      <div className="container mx-auto px-4 py-8">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-center mb-8"
        >
          <h1 className="text-4xl font-bold text-gray-900 mb-2">
            Лучший сайт для Сор и Соч
          </h1>
          <p className="text-xl text-gray-600">
            {view === 'classes' ? 'Выберите класс' : `Выберите ученика из ${selectedClass?.name}`}
          </p>
        </motion.div>

        {/* Header with buttons */}
        {view === 'classes' && (
          <Header onShowAdminModal={onShowAdminModal} />
        )}

        {/* Back Button */}
        {view === 'students' && (
          <motion.button
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            onClick={handleBack}
            className="flex items-center space-x-2 text-blue-600 hover:text-blue-700 mb-6 font-medium"
          >
            <ArrowLeft className="w-5 h-5" />
            <span>Назад к классам</span>
          </motion.button>
        )}

        {/* Error Message */}
        {error && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            className="bg-red-100 border border-red-200 text-red-700 px-4 py-3 rounded-lg mb-6"
          >
            {error}
            <button
              onClick={() => setError(null)}
              className="ml-2 text-red-500 hover:text-red-700"
            >
              ✕
            </button>
          </motion.div>
        )}

        {/* Classes View */}
        {view === 'classes' && (
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-6 gap-4">
            {classes.map((classItem, index) => (
              <ClassCard
                key={classItem.id}
                classItem={classItem}
                onClick={() => loadStudents(classItem)}
                index={index}
              />
            ))}
          </div>
        )}

        {/* Students View */}
        {view === 'students' && (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {students.map((student, index) => (
              <StudentCard
                key={student.id}
                student={student}
                onClick={() => handleStudentClick(student)}
                index={index}
              />
            ))}
          </div>
        )}

        {/* Key Modal */}
        <Modal
          isOpen={showKeyModal}
          onClose={closeAllModals}
          title="Введите ключ"
        >
          <div className="space-y-4">
            <p className="text-gray-600">
              Введите ключ доступа для ученика <strong>{selectedStudent?.name}</strong>
            </p>
            <input
              type="text"
              value={keyInput}
              onChange={(e) => setKeyInput(e.target.value)}
              placeholder="Ключ доступа"
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              onKeyPress={(e) => e.key === 'Enter' && handleKeySubmit()}
            />
            <button
              onClick={handleKeySubmit}
              disabled={!keyInput.trim()}
              className="w-full bg-blue-600 text-white py-2 px-4 rounded-lg hover:bg-blue-700 disabled:bg-gray-300 disabled:cursor-not-allowed transition-colors"
            >
              Войти
            </button>
          </div>
        </Modal>

        {/* Password Modal */}
        <Modal
          isOpen={showPasswordModal}
          onClose={closeAllModals}
          title="Введите пароль"
        >
          <div className="space-y-4">
            <p className="text-gray-600">
              Введите пароль для ученика <strong>{selectedStudent?.name}</strong>
            </p>
            <input
              type="password"
              value={passwordInput}
              onChange={(e) => setPasswordInput(e.target.value)}
              placeholder="Пароль"
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              onKeyPress={(e) => e.key === 'Enter' && handlePasswordSubmit()}
            />
            <button
              onClick={handlePasswordSubmit}
              disabled={!passwordInput.trim()}
              className="w-full bg-blue-600 text-white py-2 px-4 rounded-lg hover:bg-blue-700 disabled:bg-gray-300 disabled:cursor-not-allowed transition-colors"
            >
              Войти
            </button>
          </div>
        </Modal>

        {/* Create Password Modal */}
        <Modal
          isOpen={showCreatePasswordModal}
          onClose={closeAllModals}
          title="Создание пароля"
        >
          <div className="space-y-4">
            <p className="text-gray-600">
              Создайте пароль для ученика <strong>{selectedStudent?.name}</strong> для дальнейшего входа в систему
            </p>
            <input
              type="password"
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
              placeholder="Новый пароль"
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
            <input
              type="password"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              placeholder="Подтвердите пароль"
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
            <button
              onClick={handleCreatePassword}
              disabled={!newPassword.trim() || !confirmPassword.trim()}
              className="w-full bg-green-600 text-white py-2 px-4 rounded-lg hover:bg-green-700 disabled:bg-gray-300 disabled:cursor-not-allowed transition-colors"
            >
              Создать пароль
            </button>
          </div>
        </Modal>
      </div>
    </div>
  );
}