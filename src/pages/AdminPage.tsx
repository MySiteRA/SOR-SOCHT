import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import {
  ArrowLeft, Key, Edit, Trash2, Copy, Plus, Calendar, Upload, FileText
} from 'lucide-react';
import ClassCard from '../components/ClassCard';
import StudentCard from '../components/StudentCard';
import SubjectCard from '../components/SubjectCard';
import FileCard from '../components/FileCard';
import Modal from '../components/Modal';
import LoadingSpinner from '../components/LoadingSpinner';
import {
  getClasses, getStudentsByClass, getStudent, getStudentKeys,
  getSubjectsByClass, getFilesByClassAndCategory, generateKey,
  revokeKey, updateStudentUrl, updateKeyExpiration,
  uploadFile, deleteFile, createSubject
} from '../lib/api';
import type { Class, Student, Key as KeyType, Subject, FileRecord } from '../lib/supabase';

type AdminView = 'classes' | 'students' | 'student-profile' | 'class-files' | 'subject-files';

interface AdminPageProps {
  onLogout: () => void;
}

export default function AdminPage({ onLogout }: AdminPageProps) {
  // ====== Состояния админки ======
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

  // Модалки
  const [showGenerateKeyModal, setShowGenerateKeyModal] = useState(false);
  const [showKeyResultModal, setShowKeyResultModal] = useState(false);
  const [showEditUrlModal, setShowEditUrlModal] = useState(false);
  const [showExpirationModal, setShowExpirationModal] = useState(false);
  const [showUploadModal, setShowUploadModal] = useState(false);
  const [showCreateSubjectModal, setShowCreateSubjectModal] = useState(false);

  // Формы
  const [generatedKey, setGeneratedKey] = useState('');
  const [editingUrl, setEditingUrl] = useState('');
  const [keyExpiration, setKeyExpiration] = useState('');
  const [selectedKey, setSelectedKey] = useState<KeyType | null>(null);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [newSubjectName, setNewSubjectName] = useState('');

  // ====== Логика загрузки ======
  useEffect(() => {
    loadClasses();
  }, []);

  const loadClasses = async () => {
    try {
      setLoading(true);
      const classData = await getClasses();
      setClasses(classData);
    } catch {
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
    } catch {
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
    } catch {
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
    } catch {
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
    } catch {
      setError('Ошибка загрузки файлов предмета');
    } finally {
      setLoading(false);
    }
  };

  // ====== Методы работы ======
  const handleGenerateKey = async () => {
    if (!selectedStudent) return;
    try {
      const expiresAt = keyExpiration ? new Date(keyExpiration).toISOString() : undefined;
      const newKey = await generateKey(selectedStudent.id, expiresAt);
      setGeneratedKey(newKey);
      setShowGenerateKeyModal(false);
      setShowKeyResultModal(true);
      setKeyExpiration('');
      const updatedKeys = await getStudentKeys(selectedStudent.id);
      setStudentKeys(updatedKeys);
    } catch {
      setError('Ошибка генерации ключа');
    }
  };

  const handleRevokeKey = async (key: KeyType) => {
    if (!confirm('Вы уверены?')) return;
    try {
      await revokeKey(key.id);
      const updatedKeys = await getStudentKeys(selectedStudent!.id);
      setStudentKeys(updatedKeys);
    } catch {
      setError('Ошибка аннулирования ключа');
    }
  };

  const handleUpdateUrl = async () => {
    if (!selectedStudent) return;
    try {
      await updateStudentUrl(selectedStudent.id, editingUrl);
      setSelectedStudent({ ...selectedStudent, url: editingUrl });
      setShowEditUrlModal(false);
    } catch {
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
    } catch {
      setError('Ошибка обновления срока действия');
    }
  };

  const handleFileUpload = async () => {
    if (!selectedFile || !selectedClass || !selectedSubject) return;
    try {
      await uploadFile(selectedFile, selectedClass.id, selectedSubject.id, currentCategory);
      setShowUploadModal(false);
      setSelectedFile(null);
      const fileData = await getFilesByClassAndCategory(selectedClass.id, currentCategory);
      const subjectFiles = fileData.filter(file => file.subject_id === selectedSubject.id);
      setFiles(subjectFiles);
    } catch {
      setError('Ошибка загрузки файла');
    }
  };

  const handleDeleteFile = async (file: FileRecord) => {
    if (!confirm('Удалить файл?')) return;
    try {
      await deleteFile(file.id);
      const fileData = await getFilesByClassAndCategory(selectedClass!.id, currentCategory);
      const subjectFiles = fileData.filter(f => f.subject_id === selectedSubject!.id);
      setFiles(subjectFiles);
    } catch {
      setError('Ошибка удаления файла');
    }
  };

  const handleCreateSubject = async () => {
    if (!newSubjectName.trim() || !selectedClass) return;
    try {
      await createSubject(selectedClass.id, newSubjectName.trim());
      setShowCreateSubjectModal(false);
      setNewSubjectName('');
      const subjectData = await getSubjectsByClass(selectedClass.id);
      setSubjects(subjectData);
    } catch {
      setError('Ошибка создания предмета');
    }
  };

  const copyToClipboard = (text: string) => navigator.clipboard.writeText(text);

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

  const formatDate = (dateString: string) =>
    new Date(dateString).toLocaleDateString('ru-RU', {
      year: 'numeric', month: 'long', day: 'numeric',
      hour: '2-digit', minute: '2-digit'
    });

  // ====== Рендер ======
  if (loading) {
    return <div className="min-h-screen flex items-center justify-center"><LoadingSpinner /></div>;
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="container mx-auto px-4 py-8">
        <div className="flex justify-between items-center mb-6">
          <h1 className="text-3xl font-bold">Админ-панель</h1>
          <button 
            onClick={onLogout} 
            className="bg-red-600 text-white px-4 py-2 rounded-lg hover:bg-red-700 transition-colors"
          >
            Выйти
          </button>
        </div>

        {/* Error Message */}
        {error && (
          <div className="bg-red-100 border border-red-200 text-red-700 px-4 py-3 rounded-lg mb-6">
            {error}
            <button
              onClick={() => setError(null)}
              className="ml-2 text-red-500 hover:text-red-700"
            >
              ✕
            </button>
          </div>
        )}

        {/* Back Button */}
        {view !== 'classes' && (
          <button
            onClick={handleBack}
            className="flex items-center space-x-2 text-blue-600 hover:text-blue-700 mb-6 font-medium"
          >
            <ArrowLeft className="w-5 h-5" />
            <span>Назад</span>
          </button>
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
                onClick={() => loadStudentProfile(student)}
                index={index}
              />
            ))}
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
                      className="w-full bg-green-600 text-white px-4 py-2 rounded-lg hover:bg-green-700"
                    >
                      <Key className="w-4 h-4 inline mr-2" />
                      Сгенерировать ключ
                    </button>
                    <button
                      onClick={() => setShowEditUrlModal(true)}
                      className="w-full bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700"
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
                            className="p-2 text-blue-600 hover:bg-blue-100 rounded"
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
                                className="p-2 text-yellow-600 hover:bg-yellow-100 rounded"
                              >
                                <Calendar className="w-4 h-4" />
                              </button>
                              <button
                                onClick={() => handleRevokeKey(key)}
                                className="p-2 text-red-600 hover:bg-red-100 rounded"
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
              className="w-full bg-green-600 text-white py-2 px-4 rounded-lg hover:bg-green-700"
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
              className="w-full bg-blue-600 text-white py-2 px-4 rounded-lg hover:bg-blue-700"
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
              className="w-full bg-blue-600 text-white py-2 px-4 rounded-lg hover:bg-blue-700"
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
              className="w-full bg-yellow-600 text-white py-2 px-4 rounded-lg hover:bg-yellow-700"
            >
              Обновить
            </button>
          </div>
        </Modal>
      </div>
    </div>
  );
}
