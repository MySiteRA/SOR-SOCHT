import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { ArrowLeft, Key, Edit, Trash2, Copy, Plus, Calendar, Upload, FileText } from 'lucide-react';
import ClassCard from '../components/ClassCard';
import StudentCard from '../components/StudentCard';
import SubjectCard from '../components/SubjectCard';
import FileCard from '../components/FileCard';
import Modal from '../components/Modal';
import LoadingSpinner from '../components/LoadingSpinner';
import { 
  getClasses, 
  getStudentsByClass, 
  getStudent,
  getStudentKeys,
  getSubjectsByClass,
  getFilesByClassAndCategory,
  generateKey,
  revokeKey,
  updateStudentUrl,
  updateKeyExpiration,
  uploadFile,
  deleteFile,
  createSubject
} from '../lib/api';
import type { Class, Student, Key as KeyType, Subject, FileRecord } from '../lib/supabase';

type AdminView = 'classes' | 'students' | 'student-profile' | 'class-files' | 'subject-files';

export default function AdminPage() {
  const [view, setView] = useState<AdminView>('classes');
  const [classes, setClasses] = useState<Class[]>([]);
  const [students, setStudents] = useState<Student[]>([]);
  const [subjects, setSubjects] = useState<Subject[]>([]);
  const [files, setFiles] = useState<FileRecord[]>([]);
  const [selectedClass, setSelectedClass] = useState<Class | null>(null);
  const [selectedStudent, setSelectedStudent] = useState<Student | null>(null);
  const [selectedSubject, setSelectedSubject] = useState<Subject | null>(null);
  const [studentKeys, setStudentKeys] = useState<KeyType[]>([]);
  const [currentCategory, setCurrentCategory] = useState<'SOR' | 'SOCH'>('SOR');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Modal states
  const [showGenerateKeyModal, setShowGenerateKeyModal] = useState(false);
  const [showKeyResultModal, setShowKeyResultModal] = useState(false);
  const [showEditUrlModal, setShowEditUrlModal] = useState(false);
  const [showExpirationModal, setShowExpirationModal] = useState(false);
  const [showUploadModal, setShowUploadModal] = useState(false);
  const [showCreateSubjectModal, setShowCreateSubjectModal] = useState(false);
  
  // Form states
  const [generatedKey, setGeneratedKey] = useState('');
  const [editingUrl, setEditingUrl] = useState('');
  const [keyExpiration, setKeyExpiration] = useState('');
  const [selectedKey, setSelectedKey] = useState<KeyType | null>(null);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [newSubjectName, setNewSubjectName] = useState('');

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

  const loadClassFiles = async (classItem: Class, category: 'SOR' | 'SOCH') => {
    try {
      setLoading(true);
      const [subjectData, fileData] = await Promise.all([
        getSubjectsByClass(classItem.id),
        getFilesByClassAndCategory(classItem.id, category)
      ]);
      setSubjects(subjectData);
      setFiles(fileData);
      setSelectedClass(classItem);
      setCurrentCategory(category);
      setView('class-files');
    } catch (err) {
      setError('Ошибка загрузки файлов');
    } finally {
      setLoading(false);
    }
  };

  const loadSubjectFiles = async (subject: Subject) => {
    try {
      setLoading(true);
      const fileData = await getFilesByClassAndCategory(selectedClass!.id, currentCategory);
      const subjectFiles = fileData.filter(file => file.subject_id === subject.id);
      setFiles(subjectFiles);
      setSelectedSubject(subject);
      setView('subject-files');
    } catch (err) {
      setError('Ошибка загрузки файлов предмета');
    } finally {
      setLoading(false);
    }
  };

  const handleGenerateKey = async () => {
    if (!selectedStudent) return;

    try {
      const expiresAt = keyExpiration ? new Date(keyExpiration).toISOString() : undefined;
      const newKey = await generateKey(selectedStudent.id, expiresAt);
      setGeneratedKey(newKey);
      setShowGenerateKeyModal(false);
      setShowKeyResultModal(true);
      setKeyExpiration('');
      
      // Обновляем список ключей
      const updatedKeys = await getStudentKeys(selectedStudent.id);
      setStudentKeys(updatedKeys);
    } catch (err) {
      setError('Ошибка генерации ключа');
    }
  };

  const handleRevokeKey = async (key: KeyType) => {
    if (!confirm('Вы уверены, что хотите аннулировать этот ключ?')) return;

    try {
      await revokeKey(key.id);
      
      // Обновляем список ключей
      const updatedKeys = await getStudentKeys(selectedStudent!.id);
      setStudentKeys(updatedKeys);
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
    } catch (err) {
      setError('Ошибка обновления URL');
    }
  };

  const handleUpdateExpiration = async () => {
    if (!selectedKey) return;

    try {
      const expiresAt = keyExpiration ? new Date(keyExpiration).toISOString() : null;
      await updateKeyExpiration(selectedKey.id, expiresAt);
      
      // Обновляем список ключей
      const updatedKeys = await getStudentKeys(selectedStudent!.id);
      setStudentKeys(updatedKeys);
      
      setShowExpirationModal(false);
      setSelectedKey(null);
      setKeyExpiration('');
    } catch (err) {
      setError('Ошибка обновления срока действия');
    }
  };

  const handleFileUpload = async () => {
    if (!selectedFile || !selectedClass || !selectedSubject) return;

    try {
      await uploadFile(selectedFile, selectedClass.id, selectedSubject.id, currentCategory);
      setShowUploadModal(false);
      setSelectedFile(null);
      
      // Обновляем список файлов
      const fileData = await getFilesByClassAndCategory(selectedClass.id, currentCategory);
      const subjectFiles = fileData.filter(file => file.subject_id === selectedSubject.id);
      setFiles(subjectFiles);
    } catch (err) {
      setError('Ошибка загрузки файла');
    }
  };

  const handleDeleteFile = async (file: FileRecord) => {
    if (!confirm('Вы уверены, что хотите удалить этот файл?')) return;

    try {
      await deleteFile(file.id);
      
      // Обновляем список файлов
      const fileData = await getFilesByClassAndCategory(selectedClass!.id, currentCategory);
      const subjectFiles = fileData.filter(f => f.subject_id === selectedSubject!.id);
      setFiles(subjectFiles);
    } catch (err) {
      setError('Ошибка удаления файла');
    }
  };

  const handleCreateSubject = async () => {
    if (!newSubjectName.trim() || !selectedClass) return;

    try {
      await createSubject(selectedClass.id, newSubjectName.trim());
      setShowCreateSubjectModal(false);
      setNewSubjectName('');
      
      // Обновляем список предметов
      const subjectData = await getSubjectsByClass(selectedClass.id);
      setSubjects(subjectData);
    } catch (err) {
      setError('Ошибка создания предмета');
    }
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
  };

  const handleBack = () => {
    if (view === 'subject-files') {
      setView('class-files');
      setSelectedSubject(null);
      setFiles([]);
    } else if (view === 'class-files') {
      setView('classes');
      setSelectedClass(null);
      setSubjects([]);
      setFiles([]);
    } else if (view === 'student-profile') {
      setView('students');
      setSelectedStudent(null);
      setStudentKeys([]);
    } else if (view === 'students') {
      setView('classes');
      setSelectedClass(null);
      setStudents([]);
    }
  };

  const closeAllModals = () => {
    setShowGenerateKeyModal(false);
    setShowKeyResultModal(false);
    setShowEditUrlModal(false);
    setShowExpirationModal(false);
    setShowUploadModal(false);
    setShowCreateSubjectModal(false);
    setGeneratedKey('');
    setKeyExpiration('');
    setSelectedKey(null);
    setSelectedFile(null);
    setNewSubjectName('');
    setError(null);
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('ru-RU', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 to-gray-100 flex items-center justify-center">
        <LoadingSpinner />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-gray-100">
      <div className="container mx-auto px-4 py-8">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-center mb-8"
        >
          <h1 className="text-4xl font-bold text-gray-900 mb-2">
            Админ-панель
          </h1>
          <p className="text-xl text-gray-600">
            {view === 'classes' && 'Выберите класс'}
            {view === 'students' && `Ученики класса ${selectedClass?.name}`}
            {view === 'student-profile' && `Профиль: ${selectedStudent?.name}`}
            {view === 'class-files' && `Файлы ${currentCategory} - ${selectedClass?.name}`}
            {view === 'subject-files' && selectedSubject && `${selectedSubject.name} - ${currentCategory}`}
          </p>
        </motion.div>

        {/* Back Button */}
        {view !== 'classes' && (
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
          <div className="space-y-8">
            <div className="text-center">
              <h2 className="text-2xl font-bold text-gray-900 mb-4">Управление классами</h2>
              <div className="flex justify-center space-x-4 mb-6">
                <button
                  onClick={() => setCurrentCategory('SOR')}
                  className={`px-6 py-2 rounded-lg font-medium transition-colors ${
                    currentCategory === 'SOR'
                      ? 'bg-blue-600 text-white'
                      : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
                  }`}
                >
                  СОР
                </button>
                <button
                  onClick={() => setCurrentCategory('SOCH')}
                  className={`px-6 py-2 rounded-lg font-medium transition-colors ${
                    currentCategory === 'SOCH'
                      ? 'bg-blue-600 text-white'
                      : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
                  }`}
                >
                  СОЧ
                </button>
              </div>
            </div>
            
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-6 gap-4">
              {classes.map((classItem, index) => (
                <div key={classItem.id} className="space-y-2">
                  <ClassCard
                    classItem={classItem}
                    onClick={() => loadClassFiles(classItem, currentCategory)}
                    index={index}
                  />
                  <button
                    onClick={() => loadStudents(classItem)}
                    className="w-full text-sm text-blue-600 hover:text-blue-700 font-medium"
                  >
                    Ученики
                  </button>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Students View */}
        {view === 'students' && (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {students.map((student, index) => (
              <StudentCard
                key={student.id}
                student={student}
                onClick={() => loadStudentProfile(student)}
                index={index}
              />
            ))}
          </div>
        )}

        {/* Student Profile View */}
        {view === 'student-profile' && selectedStudent && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="space-y-6"
          >
            {/* Student Info */}
            <div className="bg-white rounded-xl shadow-md p-6">
              <h2 className="text-2xl font-bold text-gray-900 mb-4">{selectedStudent.name}</h2>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Класс</label>
                  <p className="text-lg text-gray-900">{selectedClass?.name}</p>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">URL перенаправления</label>
                  <div className="flex items-center space-x-2">
                    <p className="text-lg text-gray-900 flex-1">{selectedStudent.url || 'Не задан'}</p>
                    <button
                      onClick={() => setShowEditUrlModal(true)}
                      className="p-2 text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                    >
                      <Edit className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              </div>
            </div>

            {/* Actions */}
            <div className="bg-white rounded-xl shadow-md p-6">
              <h3 className="text-lg font-bold text-gray-900 mb-4">Действия</h3>
              <div className="flex flex-wrap gap-3">
                <button
                  onClick={() => setShowGenerateKeyModal(true)}
                  className="flex items-center space-x-2 bg-green-600 text-white px-4 py-2 rounded-lg hover:bg-green-700 transition-colors"
                >
                  <Plus className="w-4 h-4" />
                  <span>Сгенерировать ключ</span>
                </button>
              </div>
            </div>

            {/* Keys History */}
            <div className="bg-white rounded-xl shadow-md p-6">
              <h3 className="text-lg font-bold text-gray-900 mb-4">История ключей</h3>
              {studentKeys.length === 0 ? (
                <p className="text-gray-500">Ключи не найдены</p>
              ) : (
                <div className="space-y-3">
                  {studentKeys.map((key) => (
                    <div
                      key={key.id}
                      className={`p-4 border rounded-lg ${
                        key.status === 'active' ? 'border-green-200 bg-green-50' : 'border-gray-200 bg-gray-50'
                      }`}
                    >
                      <div className="flex items-center justify-between">
                        <div className="flex-1">
                          <div className="flex items-center space-x-3">
                            <code className="bg-gray-100 px-2 py-1 rounded text-sm font-mono">
                              {key.key_value}
                            </code>
                            <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                              key.status === 'active' 
                                ? 'bg-green-100 text-green-800' 
                                : 'bg-red-100 text-red-800'
                            }`}>
                              {key.status === 'active' ? 'Активный' : 'Аннулированный'}
                            </span>
                          </div>
                          <div className="text-sm text-gray-500 mt-1">
                            Создан: {formatDate(key.created_at)}
                            {key.expires_at && (
                              <span className="ml-4">
                                Истекает: {formatDate(key.expires_at)}
                              </span>
                            )}
                          </div>
                        </div>
                        <div className="flex items-center space-x-2">
                          <button
                            onClick={() => copyToClipboard(key.key_value)}
                            className="p-2 text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                          >
                            <Copy className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() => {
                              setSelectedKey(key);
                              setKeyExpiration(key.expires_at || '');
                              setShowExpirationModal(true);
                            }}
                            className="p-2 text-orange-600 hover:bg-orange-50 rounded-lg transition-colors"
                          >
                            <Calendar className="w-4 h-4" />
                          </button>
                          {key.status === 'active' && (
                            <button
                              onClick={() => handleRevokeKey(key)}
                              className="p-2 text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          )}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </motion.div>
        )}

        {/* Class Files View */}
        {view === 'class-files' && selectedClass && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="space-y-6"
          >
            {/* Actions */}
            <div className="bg-white rounded-xl shadow-md p-6">
              <h3 className="text-lg font-bold text-gray-900 mb-4">Действия</h3>
              <div className="flex flex-wrap gap-3">
                <button
                  onClick={() => setShowCreateSubjectModal(true)}
                  className="flex items-center space-x-2 bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors"
                >
                  <Plus className="w-4 h-4" />
                  <span>Добавить предмет</span>
                </button>
              </div>
            </div>

            {/* Subjects */}
            <div className="bg-white rounded-xl shadow-md p-6">
              <h3 className="text-lg font-bold text-gray-900 mb-4">Предметы</h3>
              {subjects.length === 0 ? (
                <p className="text-gray-500">Предметы не найдены</p>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {subjects.map((subject, index) => (
                    <SubjectCard
                      key={subject.id}
                      subject={subject}
                      onClick={() => loadSubjectFiles(subject)}
                      index={index}
                    />
                  ))}
                </div>
              )}
            </div>
          </motion.div>
        )}

        {/* Subject Files View */}
        {view === 'subject-files' && selectedSubject && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="space-y-6"
          >
            {/* Actions */}
            <div className="bg-white rounded-xl shadow-md p-6">
              <h3 className="text-lg font-bold text-gray-900 mb-4">Действия</h3>
              <div className="flex flex-wrap gap-3">
                <button
                  onClick={() => setShowUploadModal(true)}
                  className="flex items-center space-x-2 bg-green-600 text-white px-4 py-2 rounded-lg hover:bg-green-700 transition-colors"
                >
                  <Upload className="w-4 h-4" />
                  <span>Загрузить файл</span>
                </button>
              </div>
            </div>

            {/* Files */}
            <div className="bg-white rounded-xl shadow-md p-6">
              <h3 className="text-lg font-bold text-gray-900 mb-4">Файлы</h3>
              {files.length === 0 ? (
                <div className="text-center py-12">
                  <FileText className="w-16 h-16 text-gray-400 mx-auto mb-4" />
                  <h3 className="text-xl font-medium text-gray-600 mb-2">Файлы не найдены</h3>
                  <p className="text-gray-500">Загрузите первый файл для этого предмета</p>
                </div>
              ) : (
                <div className="space-y-4">
                  {files.map((file, index) => (
                    <div key={file.id} className="flex items-center justify-between p-4 border rounded-lg">
                      <FileCard
                        file={file}
                        onDownload={() => window.open(file.file_url, '_blank')}
                        index={index}
                      />
                      <button
                        onClick={() => handleDeleteFile(file)}
                        className="ml-4 p-2 text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </motion.div>
        )}

        {/* Generate Key Modal */}
        <Modal
          isOpen={showGenerateKeyModal}
          onClose={closeAllModals}
          title="Генерация ключа"
        >
          <div className="space-y-4">
            <p className="text-gray-600">
              Сгенерировать новый ключ доступа для {selectedStudent?.name}
            </p>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
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

        {/* Key Result Modal */}
        <Modal
          isOpen={showKeyResultModal}
          onClose={closeAllModals}
          title="Ключ сгенерирован"
        >
          <div className="space-y-4">
            <p className="text-gray-600">Новый ключ успешно создан:</p>
            <div className="bg-gray-100 p-4 rounded-lg">
              <code className="text-lg font-mono">{generatedKey}</code>
            </div>
            <button
              onClick={() => copyToClipboard(generatedKey)}
              className="w-full bg-blue-600 text-white py-2 px-4 rounded-lg hover:bg-blue-700 transition-colors flex items-center justify-center space-x-2"
            >
              <Copy className="w-4 h-4" />
              <span>Скопировать ключ</span>
            </button>
          </div>
        </Modal>

        {/* Edit URL Modal */}
        <Modal
          isOpen={showEditUrlModal}
          onClose={closeAllModals}
          title="Изменить URL"
        >
          <div className="space-y-4">
            <p className="text-gray-600">Введите новый URL для перенаправления</p>
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

        {/* Expiration Modal */}
        <Modal
          isOpen={showExpirationModal}
          onClose={closeAllModals}
          title="Изменить срок действия"
        >
          <div className="space-y-4">
            <p className="text-gray-600">Изменить срок действия ключа</p>
            <input
              type="datetime-local"
              value={keyExpiration}
              onChange={(e) => setKeyExpiration(e.target.value)}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
            <div className="flex space-x-3">
              <button
                onClick={handleUpdateExpiration}
                className="flex-1 bg-blue-600 text-white py-2 px-4 rounded-lg hover:bg-blue-700 transition-colors"
              >
                Сохранить
              </button>
              <button
                onClick={() => {
                  setKeyExpiration('');
                  handleUpdateExpiration();
                }}
                className="flex-1 bg-gray-600 text-white py-2 px-4 rounded-lg hover:bg-gray-700 transition-colors"
              >
                Убрать срок
              </button>
            </div>
          </div>
        </Modal>

        {/* Upload File Modal */}
        <Modal
          isOpen={showUploadModal}
          onClose={closeAllModals}
          title="Загрузить файл"
        >
          <div className="space-y-4">
            <p className="text-gray-600">
              Загрузить файл для предмета "{selectedSubject?.name}" в категории {currentCategory}
            </p>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Выберите файл
              </label>
              <input
                type="file"
                onChange={(e) => setSelectedFile(e.target.files?.[0] || null)}
                accept=".pdf,.doc,.docx,.zip,.rar,.txt,.jpg,.jpeg,.png"
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>
            <button
              onClick={handleFileUpload}
              disabled={!selectedFile}
              className="w-full bg-green-600 text-white py-2 px-4 rounded-lg hover:bg-green-700 disabled:bg-gray-300 disabled:cursor-not-allowed transition-colors"
            >
              Загрузить файл
            </button>
          </div>
        </Modal>

        {/* Create Subject Modal */}
        <Modal
          isOpen={showCreateSubjectModal}
          onClose={closeAllModals}
          title="Создать предмет"
        >
          <div className="space-y-4">
            <p className="text-gray-600">
              Создать новый предмет для класса {selectedClass?.name}
            </p>
            <input
              type="text"
              value={newSubjectName}
              onChange={(e) => setNewSubjectName(e.target.value)}
              placeholder="Название предмета"
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
            <button
              onClick={handleCreateSubject}
              disabled={!newSubjectName.trim()}
              className="w-full bg-blue-600 text-white py-2 px-4 rounded-lg hover:bg-blue-700 disabled:bg-gray-300 disabled:cursor-not-allowed transition-colors"
            >
              Создать предмет
            </button>
          </div>
        </Modal>
      </div>
    </div>
  );
}