import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  ArrowLeft, Key, Edit, Trash2, Copy, Plus, Calendar, Upload, FileText,
  Users, BookOpen, Home, LogOut, X, Download, ExternalLink, Image
} from 'lucide-react';
import Modal from '../components/Modal';
import LoadingSpinner from '../components/LoadingSpinner';
import {
  getClasses, getStudentsByClass, getStudent, getStudentKeys,
  getSubjects, getMaterialsByType, generateKey,
  revokeKey, updateStudentUrl, updateKeyExpiration,
  createMaterial, deleteMaterial, resetStudentPassword
} from '../lib/api';
import type { Class, Student, Key as KeyType, Subject, Material } from '../lib/supabase';

type AdminView = 'main' | 'classes' | 'students' | 'student-profile' | 'sor' | 'soch' | 'materials';
type ContentType = 'text' | 'image' | 'file' | 'link';

interface AdminPageProps {
  onLogout: () => void;
  onShowStudents: () => void;
}

export default function AdminPage({ onLogout, onShowStudents }: AdminPageProps) {
  // ====== Основные состояния ======
  const [view, setView] = useState<AdminView>('main');
  const [classes, setClasses] = useState<Class[]>([]);
  const [students, setStudents] = useState<Student[]>([]);
  const [subjects, setSubjects] = useState<Subject[]>([]);
  const [materials, setMaterials] = useState<Material[]>([]);
  const [selectedClass, setSelectedClass] = useState<Class | null>(null);
  const [selectedStudent, setSelectedStudent] = useState<Student | null>(null);
  const [selectedSubject, setSelectedSubject] = useState<Subject | null>(null);
  const [currentSection, setCurrentSection] = useState<'SOR' | 'SOCH'>('SOR');
  const [studentKeys, setStudentKeys] = useState<KeyType[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  // ====== Модальные окна ======
  const [showGenerateKeyModal, setShowGenerateKeyModal] = useState(false);
  const [showKeyResultModal, setShowKeyResultModal] = useState(false);
  const [showEditUrlModal, setShowEditUrlModal] = useState(false);
  const [showExpirationModal, setShowExpirationModal] = useState(false);
  const [showAddMaterialModal, setShowAddMaterialModal] = useState(false);
  const [showImageModal, setShowImageModal] = useState(false);

  // ====== Формы ======
  const [generatedKey, setGeneratedKey] = useState('');
  const [editingUrl, setEditingUrl] = useState('');
  const [keyExpiration, setKeyExpiration] = useState('');
  const [selectedKey, setSelectedKey] = useState<KeyType | null>(null);
  const [selectedImage, setSelectedImage] = useState('');
  
  // Форма материала
  const [materialTitle, setMaterialTitle] = useState('');
  const [selectedContentTypes, setSelectedContentTypes] = useState<ContentType[]>(['text']);
  const [materialContents, setMaterialContents] = useState<Record<ContentType, string>>({
    text: '',
    image: '',
    file: '',
    link: ''
  });

  // ====== Загрузка данных ======
  useEffect(() => {
    if (view === 'classes' || view === 'sor' || view === 'soch' || view === 'students') {
      loadClasses();
    }
  }, [view]);

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
      if (view === 'students') {
        // Остаемся в разделе студентов
      } else {
        setView('student-profile');
      }
    } catch (err) {
      setError('Ошибка загрузки учеников');
    } finally {
      setLoading(false);
    }
  };

  const loadStudentProfile = async (student: Student) => {
    try {
      setLoading(true);
      const [studentData, keys] = await Promise.all([
        getStudent(student.id),
        getStudentKeys(student.id)
      ]);
      if (studentData) {
        setSelectedStudent(studentData);
        setStudentKeys(keys);
        setEditingUrl(studentData.url || '');
        setView('student-profile');
      }
    } catch (err) {
      setError('Ошибка загрузки профиля ученика');
    } finally {
      setLoading(false);
    }
  };

  const loadSubjects = async (classItem: Class) => {
    try {
      setLoading(true);
      const subjectData = await getSubjects();
      setSubjects(subjectData);
      setSelectedClass(classItem);
      // Не меняем view здесь, остаемся в текущем разделе
    } catch (err) {
      setError('Ошибка загрузки предметов');
    } finally {
      setLoading(false);
    }
  };

  const loadMaterials = async (subject: Subject) => {
    try {
      setLoading(true);
      const materialData = await getMaterialsByType(subject.id, currentSection);
      setMaterials(materialData);
      setSelectedSubject(subject);
      setView('materials');
    } catch (err) {
      setError('Ошибка загрузки материалов');
    } finally {
      setLoading(false);
    }
  };

  // ====== Обработчики действий ======
  const handleSectionChange = (section: 'SOR' | 'SOCH') => {
    setCurrentSection(section);
    setView(section.toLowerCase() as 'sor' | 'soch');
    setSelectedClass(null);
    setSelectedSubject(null);
    setMaterials([]);
    setSubjects([]);
  };

  const handleGenerateKey = async () => {
    if (!selectedStudent) return;
    try {
      const expiresAt = keyExpiration ? new Date(keyExpiration).toISOString() : undefined;
      
      const keyValue = await generateKey(selectedStudent.id, expiresAt);
      
      setGeneratedKey(keyValue);
      setShowGenerateKeyModal(false);
      setShowKeyResultModal(true);
      setKeyExpiration('');
      const updatedKeys = await getStudentKeys(selectedStudent.id);
      setStudentKeys(updatedKeys);
      setSuccess(t('keys.generateSuccess'));
    } catch (err) {
      setError(t('keys.generationError'));
    }
  };

  const handleRevokeKey = async (key: KeyType) => {
    if (!confirm('Вы уверены, что хотите отозвать этот ключ?')) return;
    try {
      await revokeKey(key.id);
      const updatedKeys = await getStudentKeys(selectedStudent!.id);
      setStudentKeys(updatedKeys);
      setSuccess('Ключ успешно отозван');
    } catch (err) {
      setError('Ошибка аннулирования ключа');
    }
  };

  const handleUpdateUrl = async () => {
    if (!selectedStudent) return;
    try {
      await updateStudentUrl(selectedStudent.id, editingUrl);
      setSelectedStudent({ ...selectedStudent, url: editingUrl });
      setShowEditUrlModal(false);
      setSuccess('URL успешно обновлен');
    } catch (err) {
      setError('Ошибка обновления URL');
    }
  };

  const handleUpdateExpiration = async () => {
    if (!selectedKey) return;
    try {
      const expiresAt = keyExpiration ? new Date(keyExpiration).toISOString() : null;
      await updateKeyExpiration(selectedKey.id, expiresAt);
      const updatedKeys = await getStudentKeys(selectedStudent!.id);
      setStudentKeys(updatedKeys);
      setShowExpirationModal(false);
      setSelectedKey(null);
      setKeyExpiration('');
      setSuccess('Срок действия ключа обновлен');
    } catch (err) {
      setError('Ошибка обновления срока действия');
    }
  };

  const handleAddMaterial = async () => {
    if (!materialTitle.trim() || !selectedSubject || selectedContentTypes.length === 0) return;

    // Проверяем, что для всех выбранных типов есть контент
    const hasEmptyContent = selectedContentTypes.some(type => !materialContents[type].trim());
    if (hasEmptyContent) {
      setError('Заполните все поля для выбранных типов контента');
      return;
    }

    try {
      // Создаем материал для каждого выбранного типа контента
      for (const contentType of selectedContentTypes) {
        await createMaterial(
          selectedSubject.id,
          `${materialTitle.trim()}${selectedContentTypes.length > 1 ? ` (${contentType})` : ''}`,
          currentSection,
          contentType,
          materialContents[contentType].trim()
        );
      }

      setSuccess('Материал успешно добавлен');
      setShowAddMaterialModal(false);
      resetMaterialForm();
      
      // Обновляем список материалов
      const updatedMaterials = await getMaterialsByType(selectedSubject.id, currentSection);
      setMaterials(updatedMaterials);
    } catch (err) {
      setError('Ошибка добавления материала');
    }
  };

  const handleDeleteMaterial = async (material: Material) => {
    if (!confirm(`Удалить материал "${material.title}"?`)) return;

    try {
      await deleteMaterial(material.id);
      setSuccess('Материал удален');
      
      // Обновляем список материалов
      const updatedMaterials = await getMaterialsByType(selectedSubject!.id, currentSection);
      setMaterials(updatedMaterials);
    } catch (err) {
      setError('Ошибка удаления материала');
    }
  };

  const handleResetPassword = async (student: Student) => {
    if (!confirm(`Сбросить пароль для ${student.name}?`)) return;

    try {
      await resetStudentPassword(student.id);

// Ждём, чтобы Supabase точно сохранил
await new Promise(res => setTimeout(res, 500));

// Берём свежие данные
const updatedStudent = await getStudent(student.id);
setSelectedStudent(updatedStudent);

// Обновляем список учеников
setStudents(prevStudents => 
  prevStudents.map(s => 
    s.id === student.id ? updatedStudent : s
  )
);

      
      // Обновляем локальное состояние студента
      setStudents(prevStudents => 
        prevStudents.map(s => 
          s.id === student.id 
            ? { ...s, password_hash: null }
            : s
        )
      );
      
      // Если это текущий выбранный студент, обновляем и его
      if (selectedStudent && selectedStudent.id === student.id) {
        setSelectedStudent({ ...selectedStudent, password_hash: null });
      }
      
      setSuccess(`Пароль для ${student.name} сброшен`);
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Ошибка сброса пароля';
      setError(errorMessage);
    }
  };

  const resetMaterialForm = () => {
    setMaterialTitle('');
    setSelectedContentTypes(['text']);
    setMaterialContents({
      text: '',
      image: '',
      file: '',
      link: ''
    });
  };

  const handleContentTypeToggle = (type: ContentType) => {
    setSelectedContentTypes(prev => {
      if (prev.includes(type)) {
        // Не позволяем убрать все типы
        if (prev.length === 1) return prev;
        return prev.filter(t => t !== type);
      } else {
        return [...prev, type];
      }
    });
  };

  const handleContentChange = (type: ContentType, value: string) => {
    setMaterialContents(prev => ({
      ...prev,
      [type]: value
    }));
  };

  const getContentTypeLabel = (type: ContentType) => {
    switch (type) {
      case 'text': return 'Текст';
      case 'image': return 'Изображение';
      case 'file': return 'Файл';
      case 'link': return 'Ссылка';
    }
  };

  const handleBack = () => {
    if (view === 'materials') {
      setView(currentSection.toLowerCase() as 'sor' | 'soch');
      setSelectedSubject(null);
      setMaterials([]);
    } else if (view === 'sor' || view === 'soch') {
      if (selectedClass) {
        setView(currentSection.toLowerCase() as 'sor' | 'soch');
        setSelectedClass(null);
        setSubjects([]);
      } else {
        setView('main');
      }
    } else if (view === 'student-profile') {
      setView('students');
      setSelectedStudent(null);
      setStudentKeys([]);
    } else if (view === 'students') {
      if (selectedClass) {
        setView('students');
        setSelectedClass(null);
        setStudents([]);
      } else {
        setView('main');
      }
    } else if (view === 'classes') {
      setView('main');
      setSelectedClass(null);
      setStudents([]);
    }
  };

  const closeAllModals = () => {
    setShowGenerateKeyModal(false);
    setShowKeyResultModal(false);
    setShowEditUrlModal(false);
    setShowExpirationModal(false);
    setShowAddMaterialModal(false);
    setShowImageModal(false);
    setGeneratedKey('');
    setKeyExpiration('');
    setSelectedKey(null);
    setSelectedImage('');
    resetMaterialForm();
    setError(null);
    setSuccess(null);
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    setSuccess('Скопировано в буфер обмена');
  };

  const formatDate = (dateString: string) =>
    new Date(dateString).toLocaleDateString('ru-RU', {
      year: 'numeric', month: 'long', day: 'numeric',
      hour: '2-digit', minute: '2-digit'
    });

  const handleContentClick = (material: Material) => {
    if (material.content_type === 'image') {
      setSelectedImage(material.content_value);
      setShowImageModal(true);
    } else if (material.content_type === 'link' || material.content_type === 'file') {
      window.open(material.content_value, '_blank');
    }
  };

  const getContentIcon = (contentType: ContentType) => {
    switch (contentType) {
      case 'text': return <FileText className="w-5 h-5" />;
      case 'image': return <Image className="w-5 h-5" />;
      case 'file': return <Download className="w-5 h-5" />;
      case 'link': return <ExternalLink className="w-5 h-5" />;
    }
  };

  // ====== Рендер ======
  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <LoadingSpinner />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white shadow-sm border-b">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <h1 className="text-2xl font-bold text-gray-900">Админ-панель</h1>
            
            {/* Navigation */}
            <nav className="hidden md:flex items-center space-x-6">
              <button
                onClick={() => setView('main')}
                className={`flex items-center space-x-2 px-3 py-2 rounded-lg transition-colors ${
                  view === 'main' ? 'bg-blue-100 text-blue-700' : 'text-gray-600 hover:text-blue-600'
                }`}
              >
                <Home className="w-4 h-4" />
                <span>Главная</span>
              </button>
              <button
                onClick={() => handleSectionChange('SOR')}
                className={`flex items-center space-x-2 px-3 py-2 rounded-lg transition-colors ${
                  view === 'sor' || view === 'materials' && currentSection === 'SOR' ? 'bg-green-100 text-green-700' : 'text-gray-600 hover:text-green-600'
                }`}
              >
                <BookOpen className="w-4 h-4" />
                <span>СОР</span>
              </button>
              <button
                onClick={() => handleSectionChange('SOCH')}
                className={`flex items-center space-x-2 px-3 py-2 rounded-lg transition-colors ${
                  view === 'soch' || view === 'materials' && currentSection === 'SOCH' ? 'bg-purple-100 text-purple-700' : 'text-gray-600 hover:text-purple-600'
                }`}
              >
                <FileText className="w-4 h-4" />
                <span>СОЧ</span>
              </button>
              <button
                onClick={() => setView('students')}
                className={`flex items-center space-x-2 px-3 py-2 rounded-lg transition-colors ${
                  view === 'students' || view === 'student-profile' ? 'bg-blue-100 text-blue-700' : 'text-gray-600 hover:text-blue-600'
                }`}
              >
                <Users className="w-4 h-4" />
                <span>Ученики</span>
              </button>
              <button
                onClick={onShowStudents}
                className="flex items-center space-x-2 px-3 py-2 rounded-lg transition-colors flex-1 justify-center text-gray-600 hover:text-indigo-600"
              >
                <Users className="w-4 h-4" />
                <span>Все</span>
              </button>
              <button
                onClick={onShowStudents}
                className="flex items-center space-x-2 px-3 py-2 rounded-lg transition-colors text-gray-600 hover:text-indigo-600"
              >
                <Users className="w-4 h-4" />
                <span>Все ученики</span>
              </button>
            </nav>

            <button
              onClick={onLogout}
              className="flex items-center space-x-2 bg-red-600 text-white px-4 py-2 rounded-lg hover:bg-red-700 transition-colors"
            >
              <LogOut className="w-4 h-4" />
              <span>Выйти</span>
            </button>
          </div>

          {/* Mobile Navigation */}
          <nav className="md:hidden mt-4 flex flex-wrap gap-2">
            <button
              onClick={() => setView('main')}
              className={`flex items-center space-x-2 px-3 py-2 rounded-lg transition-colors flex-1 justify-center ${
                view === 'main' ? 'bg-blue-100 text-blue-700' : 'text-gray-600 hover:text-blue-600'
              }`}
            >
              <Home className="w-4 h-4" />
              <span>Главная</span>
            </button>
            <button
              onClick={() => handleSectionChange('SOR')}
              className={`flex items-center space-x-2 px-3 py-2 rounded-lg transition-colors flex-1 justify-center ${
                view === 'sor' || view === 'materials' && currentSection === 'SOR' ? 'bg-green-100 text-green-700' : 'text-gray-600 hover:text-green-600'
              }`}
            >
              <BookOpen className="w-4 h-4" />
              <span>СОР</span>
            </button>
            <button
              onClick={() => handleSectionChange('SOCH')}
              className={`flex items-center space-x-2 px-3 py-2 rounded-lg transition-colors flex-1 justify-center ${
                view === 'soch' || view === 'materials' && currentSection === 'SOCH' ? 'bg-purple-100 text-purple-700' : 'text-gray-600 hover:text-purple-600'
              }`}
            >
              <FileText className="w-4 h-4" />
              <span>СОЧ</span>
            </button>
            <button
              onClick={() => setView('students')}
              className={`flex items-center space-x-2 px-3 py-2 rounded-lg transition-colors flex-1 justify-center ${
                view === 'students' || view === 'student-profile' ? 'bg-blue-100 text-blue-700' : 'text-gray-600 hover:text-blue-600'
              }`}
            >
              <Users className="w-4 h-4" />
              <span>Ученики</span>
            </button>
          </nav>
        </div>
      </header>

      <div className="container mx-auto px-4 py-8">
        {/* Back Button */}
        {view !== 'main' && (
          <motion.button
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            onClick={handleBack}
            className="flex items-center space-x-2 text-blue-600 hover:text-blue-700 mb-6 font-medium"
          >
            <ArrowLeft className="w-5 h-5" />
            <span>Назад</span>
          </motion.button>
        )}

        {/* Notifications */}
        <AnimatePresence>
          {error && (
            <motion.div
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
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
          
          {success && (
            <motion.div
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              className="bg-green-100 border border-green-200 text-green-700 px-4 py-3 rounded-lg mb-6"
            >
              {success}
              <button
                onClick={() => setSuccess(null)}
                className="ml-2 text-green-500 hover:text-green-700"
              >
                ✕
              </button>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Main Dashboard */}
        {view === 'main' && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="max-w-4xl mx-auto"
          >
            <div className="text-center mb-8">
              <h2 className="text-3xl font-bold text-gray-900 mb-2">Добро пожаловать в админ-панель</h2>
              <p className="text-gray-600">Выберите раздел для управления</p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              <motion.div
                whileHover={{ scale: 1.02, y: -5 }}
                whileTap={{ scale: 0.98 }}
                onClick={() => handleSectionChange('SOR')}
                className="bg-white rounded-xl shadow-lg hover:shadow-xl transition-all duration-300 cursor-pointer border border-gray-100 p-8"
              >
                <div className="text-center">
                  <div className="bg-green-100 w-20 h-20 rounded-full flex items-center justify-center mx-auto mb-4">
                    <BookOpen className="w-10 h-10 text-green-600" />
                  </div>
                  <h3 className="text-2xl font-bold text-gray-900 mb-2">СОР</h3>
                  <p className="text-gray-600">Суммативное оценивание за раздел</p>
                </div>
              </motion.div>

              <motion.div
                whileHover={{ scale: 1.02, y: -5 }}
                whileTap={{ scale: 0.98 }}
                onClick={() => handleSectionChange('SOCH')}
                className="bg-white rounded-xl shadow-lg hover:shadow-xl transition-all duration-300 cursor-pointer border border-gray-100 p-8"
              >
                <div className="text-center">
                  <div className="bg-purple-100 w-20 h-20 rounded-full flex items-center justify-center mx-auto mb-4">
                    <FileText className="w-10 h-10 text-purple-600" />
                  </div>
                  <h3 className="text-2xl font-bold text-gray-900 mb-2">СОЧ</h3>
                  <p className="text-gray-600">Суммативное оценивание за четверть</p>
                </div>
              </motion.div>

              <motion.div
                whileHover={{ scale: 1.02, y: -5 }}
                whileTap={{ scale: 0.98 }}
                onClick={() => setView('students')}
                className="bg-white rounded-xl shadow-lg hover:shadow-xl transition-all duration-300 cursor-pointer border border-gray-100 p-8"
              >
                <div className="text-center">
                  <div className="bg-blue-100 w-20 h-20 rounded-full flex items-center justify-center mx-auto mb-4">
                    <Users className="w-10 h-10 text-blue-600" />
                  </div>
                  <h3 className="text-2xl font-bold text-gray-900 mb-2">Ученики</h3>
                  <p className="text-gray-600">Управление учениками и ключами</p>
                </div>
              </motion.div>
            </div>
          </motion.div>
        )}

        {/* Classes Grid */}
        {(view === 'sor' || view === 'soch' || view === 'students') && !selectedClass && (
          <div>
            <div className="text-center mb-8">
              <h2 className="text-3xl font-bold text-gray-900 mb-2">
                {view === 'sor' && 'СОР - Выберите класс'}
                {view === 'soch' && 'СОЧ - Выберите класс'}
                {view === 'students' && 'Ученики - Выберите класс'}
              </h2>
            </div>
            
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-6 gap-4">
              {classes.map((classItem, index) => (
                <motion.div
                  key={classItem.id}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: index * 0.05 }}
                  whileHover={{ scale: 1.02, y: -2 }}
                  whileTap={{ scale: 0.98 }}
                  onClick={() => view === 'students' ? loadStudents(classItem) : loadSubjects(classItem)}
                  className="bg-white rounded-xl shadow-md hover:shadow-lg transition-all duration-300 cursor-pointer border border-gray-100 p-6"
                >
                  <div className="text-center">
                    <h3 className="text-2xl font-bold text-gray-800">{classItem.name}</h3>
                  </div>
                </motion.div>
              ))}
            </div>
          </div>
        )}

        {/* Subjects Grid */}
        {(view === 'sor' || view === 'soch') && selectedClass && !selectedSubject && (
          <div>
            <div className="text-center mb-8">
              <h2 className="text-3xl font-bold text-gray-900 mb-2">
                {currentSection} - {selectedClass.name} - Выберите предмет
              </h2>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {subjects.map((subject, index) => (
                <motion.div
                  key={subject.id}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: index * 0.05 }}
                  whileHover={{ scale: 1.01, y: -2 }}
                  whileTap={{ scale: 0.99 }}
                  onClick={() => loadMaterials(subject)}
                  className="bg-white rounded-lg shadow-md hover:shadow-lg transition-all duration-300 cursor-pointer border border-gray-100 p-4"
                >
                  <div className="flex items-center space-x-3">
                    <div className={`p-2 rounded-lg ${currentSection === 'SOR' ? 'bg-green-100' : 'bg-purple-100'}`}>
                      <BookOpen className={`w-5 h-5 ${currentSection === 'SOR' ? 'text-green-600' : 'text-purple-600'}`} />
                    </div>
                    <div className="flex-1">
                      <h3 className="text-lg font-medium text-gray-900">{subject.name}</h3>
                    </div>
                  </div>
                </motion.div>
              ))}
            </div>
          </div>
        )}

        {/* Materials View */}
        {view === 'materials' && selectedSubject && (
          <div>
            <div className="text-center mb-8">
              <h2 className="text-3xl font-bold text-gray-900 mb-2">
                {currentSection} - {selectedClass?.name} - {selectedSubject.name}
              </h2>
            </div>

            {/* Add Material Button */}
            <div className="mb-6">
              <motion.button
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                onClick={() => setShowAddMaterialModal(true)}
                className={`flex items-center space-x-2 px-6 py-3 rounded-lg text-white font-medium transition-all duration-300 shadow-lg ${
                  currentSection === 'SOR' 
                    ? 'bg-green-600 hover:bg-green-700' 
                    : 'bg-purple-600 hover:bg-purple-700'
                }`}
              >
                <Plus className="w-5 h-5" />
                <span>Добавить материал</span>
              </motion.button>
            </div>

            {/* Materials Grid */}
            {materials.length === 0 ? (
              <div className="text-center py-12">
                <FileText className="w-16 h-16 text-gray-400 mx-auto mb-4" />
                <h3 className="text-xl font-medium text-gray-600 mb-2">Материалы не найдены</h3>
                <p className="text-gray-500">Добавьте первый материал для этого предмета</p>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {materials.map((material, index) => (
                  <motion.div
                    key={material.id}
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: index * 0.1 }}
                    className="bg-white rounded-xl shadow-lg hover:shadow-xl transition-all duration-300 border border-gray-100 overflow-hidden"
                  >
                    {/* Material Header */}
                    <div className={`p-4 ${currentSection === 'SOR' ? 'bg-green-50' : 'bg-purple-50'}`}>
                      <div className="flex items-center justify-between">
                        <div className="flex items-center space-x-3">
                          <div className={`p-2 rounded-lg ${currentSection === 'SOR' ? 'bg-green-100' : 'bg-purple-100'}`}>
                            {getContentIcon(material.content_type)}
                          </div>
                          <div>
                            <h3 className="text-lg font-bold text-gray-900">{material.title}</h3>
                            <p className="text-sm text-gray-600">{material.type}</p>
                          </div>
                        </div>
                        <button
                          onClick={() => handleDeleteMaterial(material)}
                          className="p-2 bg-red-100 rounded-lg hover:bg-red-200 transition-colors"
                        >
                          <Trash2 className="w-4 h-4 text-red-600" />
                        </button>
                      </div>
                    </div>

                    {/* Material Content */}
                    <div className="p-4">
                      {material.content_type === 'text' && (
                        <p className="text-gray-700 leading-relaxed">{material.content_value}</p>
                      )}
                      
                      {material.content_type === 'image' && (
                        <div className="text-center">
                          <img
                            src={material.content_value}
                            alt={material.title}
                            className="max-w-full h-32 object-cover rounded-lg cursor-pointer hover:opacity-80 transition-opacity"
                            onClick={() => handleContentClick(material)}
                          />
                        </div>
                      )}
                      
                      {(material.content_type === 'file' || material.content_type === 'link') && (
                        <div className="text-center">
                          <motion.button
                            whileHover={{ scale: 1.05 }}
                            whileTap={{ scale: 0.95 }}
                            onClick={() => handleContentClick(material)}
                            className="inline-flex items-center space-x-2 bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors"
                          >
                            {getContentIcon(material.content_type)}
                            <span>
                              {material.content_type === 'file' ? 'Скачать' : 'Открыть'}
                            </span>
                          </motion.button>
                        </div>
                      )}
                      
                      <div className="mt-4 pt-4 border-t border-gray-100">
                        <p className="text-sm text-gray-500">
                          Создано: {formatDate(material.created_at)}
                        </p>
                      </div>
                    </div>
                  </motion.div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Students View */}
        {view === 'students' && selectedClass && (
          <div>
            <div className="text-center mb-8">
              <h2 className="text-3xl font-bold text-gray-900 mb-2">
                Ученики класса {selectedClass.name}
              </h2>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {students.map((student, index) => (
                <motion.div
                  key={student.id}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: index * 0.05 }}
                  className="bg-white rounded-lg shadow-md hover:shadow-lg transition-all duration-300 border border-gray-100 p-4"
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-3">
                      <div className="bg-blue-100 p-2 rounded-lg">
                        <Users className="w-5 h-5 text-blue-600" />
                      </div>
                      <div className="flex-1">
                        <h3 className="text-lg font-medium text-gray-900">{student.name}</h3>
                        <p className="text-sm text-gray-500">
                          {student.password_hash ? 'Пароль установлен' : 'Пароль не установлен'}
                        </p>
                      </div>
                    </div>
                    <div className="flex space-x-2">
                      <motion.button
                        whileHover={{ scale: 1.05 }}
                        whileTap={{ scale: 0.95 }}
                        onClick={() => loadStudentProfile(student)}
                        className="flex items-center space-x-2 bg-blue-600 text-white px-3 py-2 rounded-lg hover:bg-blue-700 transition-colors"
                      >
                        <Key className="w-4 h-4" />
                        <span className="hidden sm:inline">Ключи</span>
                      </motion.button>
                      <motion.button
                        whileHover={{ scale: 1.05 }}
                        whileTap={{ scale: 0.95 }}
                        onClick={() => handleResetPassword(student)}
                        className="flex items-center space-x-2 bg-red-600 text-white px-3 py-2 rounded-lg hover:bg-red-700 transition-colors"
                      >
                        <Trash2 className="w-4 h-4" />
                        <span className="hidden sm:inline">Сбросить</span>
                      </motion.button>
                    </div>
                  </div>
                </motion.div>
              ))}
            </div>
          </div>
        )}

        {/* Student Profile View */}
        {view === 'student-profile' && selectedStudent && (
          <div className="max-w-4xl mx-auto">
            <div className="bg-white rounded-lg shadow-md p-6 mb-6">
              <h2 className="text-2xl font-bold mb-4">{selectedStudent.name}</h2>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <h3 className="text-lg font-semibold mb-2">Информация</h3>
                  <p><strong>ID:</strong> {selectedStudent.id}</p>
                  <p><strong>Пароль:</strong> {selectedStudent.password_hash ? 'Установлен' : 'Не установлен'}</p>
                  <p><strong>URL:</strong> {selectedStudent.url || 'Не установлен'}</p>
                </div>
                <div>
                  <h3 className="text-lg font-semibold mb-2">Действия</h3>
                  <div className="space-y-2">
                    <button
                      onClick={() => setShowGenerateKeyModal(true)}
                      className="w-full bg-green-600 text-white px-4 py-2 rounded-lg hover:bg-green-700 transition-colors"
                    >
                      <Key className="w-4 h-4 inline mr-2" />
                      Сгенерировать ключ
                    </button>
                    <button
                      onClick={() => setShowEditUrlModal(true)}
                      className="w-full bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors"
                    >
                      <Edit className="w-4 h-4 inline mr-2" />
                      Изменить URL
                    </button>
                  </div>
                </div>
              </div>
            </div>

            {/* Keys List */}
            <div className="bg-white rounded-lg shadow-md p-6">
              <h3 className="text-lg font-semibold mb-4">Ключи доступа</h3>
              {studentKeys.length === 0 ? (
                <p className="text-gray-500">Ключи не найдены</p>
              ) : (
                <div className="space-y-3">
                  {studentKeys.map((key) => (
                    <div key={key.id} className="border rounded-lg p-4">
                      <div className="flex justify-between items-start">
                        <div>
                          <p className="font-mono text-sm">{key.key_value}</p>
                          <p className="text-sm text-gray-500">
                            Создан: {formatDate(key.created_at)}
                          </p>
                          {key.expires_at && (
                            <p className="text-sm text-gray-500">
                              Истекает: {formatDate(key.expires_at)}
                            </p>
                          )}
                          <span className={`inline-block px-2 py-1 rounded text-xs ${
                            key.status === 'active' ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
                          }`}>
                            {key.status === 'active' ? 'Активен' : 'Отозван'}
                          </span>
                        </div>
                        <div className="flex space-x-2">
                          <button
                            onClick={() => copyToClipboard(key.key_value)}
                            className="p-2 text-blue-600 hover:bg-blue-100 rounded transition-colors"
                          >
                            <Copy className="w-4 h-4" />
                          </button>
                          {key.status === 'active' && (
                            <>
                              <button
                                onClick={() => {
                                  setSelectedKey(key);
                                  setShowExpirationModal(true);
                                }}
                                className="p-2 text-yellow-600 hover:bg-yellow-100 rounded transition-colors"
                              >
                                <Calendar className="w-4 h-4" />
                              </button>
                              <button
                                onClick={() => handleRevokeKey(key)}
                                className="p-2 text-red-600 hover:bg-red-100 rounded transition-colors"
                              >
                                <Trash2 className="w-4 h-4" />
                              </button>
                            </>
                          )}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}

        {/* Modals */}
        <Modal
          isOpen={showGenerateKeyModal}
          onClose={closeAllModals}
          title="Генерация ключа"
        >
          <div className="space-y-4">
            <p className="text-gray-600">Создать новый ключ доступа для ученика</p>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Срок действия (необязательно)
              </label>
              <input
                type="datetime-local"
                value={keyExpiration}
                onChange={(e) => setKeyExpiration(e.target.value)}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>
            <button
              onClick={handleGenerateKey}
              className="w-full bg-green-600 text-white py-2 px-4 rounded-lg hover:bg-green-700 transition-colors"
            >
              Сгенерировать ключ
            </button>
          </div>
        </Modal>

        <Modal
          isOpen={showKeyResultModal}
          onClose={closeAllModals}
          title="Ключ сгенерирован"
        >
          <div className="space-y-4">
            <p className="text-gray-600">Новый ключ доступа:</p>
            <div className="bg-gray-100 p-4 rounded-lg">
              <p className="font-mono text-lg">{generatedKey}</p>
            </div>
            <button
              onClick={() => copyToClipboard(generatedKey)}
              className="w-full bg-blue-600 text-white py-2 px-4 rounded-lg hover:bg-blue-700 transition-colors"
            >
              <Copy className="w-4 h-4 inline mr-2" />
              Скопировать
            </button>
          </div>
        </Modal>

        <Modal
          isOpen={showEditUrlModal}
          onClose={closeAllModals}
          title="Изменить URL"
        >
          <div className="space-y-4">
            <p className="text-gray-600">URL для перенаправления после входа</p>
            <input
              type="url"
              value={editingUrl}
              onChange={(e) => setEditingUrl(e.target.value)}
              placeholder="https://example.com"
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
            <button
              onClick={handleUpdateUrl}
              className="w-full bg-blue-600 text-white py-2 px-4 rounded-lg hover:bg-blue-700 transition-colors"
            >
              Сохранить
            </button>
          </div>
        </Modal>

        <Modal
          isOpen={showExpirationModal}
          onClose={closeAllModals}
          title="Изменить срок действия"
        >
          <div className="space-y-4">
            <p className="text-gray-600">Установить новый срок действия ключа</p>
            <input
              type="datetime-local"
              value={keyExpiration}
              onChange={(e) => setKeyExpiration(e.target.value)}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
            <button
              onClick={handleUpdateExpiration}
              className="w-full bg-yellow-600 text-white py-2 px-4 rounded-lg hover:bg-yellow-700 transition-colors"
            >
              Обновить
            </button>
          </div>
        </Modal>

        <Modal
          isOpen={showAddMaterialModal}
          onClose={closeAllModals}
          title="Добавить материал"
        >
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Название материала
              </label>
              <input
                type="text"
                value={materialTitle}
                onChange={(e) => setMaterialTitle(e.target.value)}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                placeholder="Введите название"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Типы содержимого (можно выбрать несколько)
              </label>
              <div className="grid grid-cols-2 gap-2">
                {(['text', 'image', 'file', 'link'] as ContentType[]).map(type => (
                  <label key={type} className="flex items-center space-x-2 p-3 border rounded-lg cursor-pointer hover:bg-gray-50">
                    <input
                      type="checkbox"
                      checked={selectedContentTypes.includes(type)}
                      onChange={() => handleContentTypeToggle(type)}
                      className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                    />
                    <div className="flex items-center space-x-2">
                      {getContentIcon(type)}
                      <span className="text-sm font-medium">{getContentTypeLabel(type)}</span>
                    </div>
                  </label>
                ))}
              </div>
            </div>

            {/* Поля ввода для каждого выбранного типа */}
            {selectedContentTypes.map(type => (
              <div key={type}>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  {getContentTypeLabel(type)}
                  {type === 'text' && ' - содержимое'}
                  {type === 'image' && ' - URL изображения'}
                  {type === 'file' && ' - URL файла'}
                  {type === 'link' && ' - ссылка'}
                </label>
                
                {type === 'text' ? (
                  <textarea
                    value={materialContents[type]}
                    onChange={(e) => handleContentChange(type, e.target.value)}
                    rows={3}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    placeholder="Введите текст"
                  />
                ) : (
                  <input
                    type={type === 'link' ? 'url' : 'text'}
                    value={materialContents[type]}
                    onChange={(e) => handleContentChange(type, e.target.value)}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    placeholder={
                      type === 'link' ? 'https://example.com' : 
                      type === 'image' ? 'https://example.com/image.jpg' :
                      'https://example.com/file.pdf'
                    }
                  />
                )}
              </div>
            ))}

            <button
              onClick={handleAddMaterial}
              disabled={
                !materialTitle.trim() || 
                selectedContentTypes.length === 0 ||
                selectedContentTypes.some(type => !materialContents[type].trim())
              }
              className={`w-full py-2 px-4 rounded-lg text-white font-medium transition-all duration-300 disabled:bg-gray-300 disabled:cursor-not-allowed ${
                currentSection === 'SOR' 
                  ? 'bg-green-600 hover:bg-green-700' 
                  : 'bg-purple-600 hover:bg-purple-700'
              }`}
            >
              Добавить материал
            </button>
          </div>
        </Modal>

        <Modal
          isOpen={showImageModal}
          onClose={closeAllModals}
          title="Просмотр изображения"
        >
          <div className="text-center">
            <img
              src={selectedImage}
              alt="Просмотр"
              className="max-w-full max-h-96 object-contain rounded-lg"
            />
          </div>
        </Modal>
      </div>
    </div>
  );
}