import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Trophy, Clock, CheckCircle, XCircle, Users, Play, RotateCcw, Crown, LogOut } from 'lucide-react';
import { 
  subscribeToGameMoves,
  addGameMove,
  submitQuizAnswer,
  getPlayerByNumber,
  getPlayerNumber,
  leaveGame,
  type FirebaseGame,
  type FirebasePlayer,
  type FirebaseMove
} from '../../services/firebaseGameService';
import type { Student } from '../../lib/supabase';

interface QuizQuestion {
  id: string;
  question: string;
  options: string[];
  correctAnswer: number;
  timeLimit: number;
}

const questionsByDifficulty = {
  easy: [
    {
      id: '1',
      question: 'Сколько дней в неделе?',
      options: ['5', '6', '7', '8'],
      correctAnswer: 2,
      timeLimit: 20
    },
    {
      id: '2',
      question: 'Какого цвета солнце?',
      options: ['Синее', 'Желтое', 'Красное', 'Зеленое'],
      correctAnswer: 1,
      timeLimit: 15
    },
    {
      id: '3',
      question: 'Сколько ног у кота?',
      options: ['2', '3', '4', '5'],
      correctAnswer: 2,
      timeLimit: 15
    }
  ],
  medium: [
  {
    id: '1',
    question: 'Какая планета самая большая в Солнечной системе?',
    options: ['Земля', 'Юпитер', 'Сатурн', 'Нептун'],
    correctAnswer: 1,
    timeLimit: 15
  },
  {
    id: '2',
    question: 'В каком году была основана Москва?',
    options: ['1147', '1156', '1162', '1174'],
    correctAnswer: 0,
    timeLimit: 20
  },
  {
    id: '3',
    question: 'Кто написал роман "Война и мир"?',
    options: ['Достоевский', 'Толстой', 'Пушкин', 'Гоголь'],
    correctAnswer: 1,
    timeLimit: 15
  },
  {
    id: '4',
    question: 'Сколько континентов на Земле?',
    options: ['5', '6', '7', '8'],
    correctAnswer: 2,
    timeLimit: 10
  },
  {
    id: '5',
    question: 'Какой химический элемент обозначается символом "Au"?',
    options: ['Серебро', 'Золото', 'Алюминий', 'Медь'],
    correctAnswer: 1,
    timeLimit: 15
  }
  ],
  hard: [
    {
      id: '1',
      question: 'В каком году была открыта структура ДНК?',
      options: ['1951', '1953', '1955', '1957'],
      correctAnswer: 1,
      timeLimit: 10
    },
    {
      id: '2',
      question: 'Какая самая глубокая точка Мирового океана?',
      options: ['Марианская впадина', 'Пуэрто-Риканский желоб', 'Японский желоб', 'Филиппинский желоб'],
      correctAnswer: 0,
      timeLimit: 12
    },
    {
      id: '3',
      question: 'Кто сформулировал принцип неопределенности в квантовой механике?',
      options: ['Эйнштейн', 'Бор', 'Гейзенберг', 'Шредингер'],
      correctAnswer: 2,
      timeLimit: 15
    }
  ]
};

interface FirebaseQuizGameProps {
  game: FirebaseGame;
  players: { [userId: string]: FirebasePlayer };
  currentPlayer: Student;
  gameId: string;
  onError: (error: string) => void;
}

export default function FirebaseQuizGame({ 
  game, 
  players, 
  currentPlayer, 
  gameId, 
  onError 
}: FirebaseQuizGameProps) {
  const [moves, setMoves] = useState<(FirebaseMove & { id: string })[]>([]);
  const [currentQuestion, setCurrentQuestion] = useState<QuizQuestion | null>(null);
  const [questionIndex, setQuestionIndex] = useState(0);
  const [timeLeft, setTimeLeft] = useState(0);
  const [selectedAnswer, setSelectedAnswer] = useState<number | null>(null);
  const [hasAnswered, setHasAnswered] = useState(false);
  const [showResults, setShowResults] = useState(false);
  const [questionAnswers, setQuestionAnswers] = useState<{[playerNumber: number]: {answer: number, isCorrect: boolean, timestamp: number}}>({});
  const [isQuizMaster, setIsQuizMaster] = useState(false);
  const [leavingGame, setLeavingGame] = useState(false);

  const currentPlayerNumber = getPlayerNumber(players, currentPlayer.id);
  const difficulty = game.settings?.difficulty || 'medium';
  const sampleQuestions = questionsByDifficulty[difficulty];
  const playersArray = Object.entries(players).map(([userId, player]) => ({
    userId,
    ...player
  })).sort((a, b) => a.number - b.number);

  useEffect(() => {
    // Создатель игры становится ведущим викторины
    setIsQuizMaster(game.creatorId === currentPlayer.id);
    
    // Подписываемся на ходы игры
    const unsubscribe = subscribeToGameMoves(gameId, (move) => {
      setMoves(prev => [...prev, move]);
      
      if (move.type === 'question_start' && move.metadata?.questionData) {
        // Новый вопрос начался
        const questionData = move.metadata.questionData;
        setCurrentQuestion(questionData);
        setTimeLeft(questionData.timeLimit);
        setSelectedAnswer(null);
        setHasAnswered(false);
        setShowResults(false);
        setQuestionAnswers({});
      }
      
      if (move.type === 'answer' && move.metadata?.questionId === currentQuestion?.id) {
        // Новый ответ получен
        setQuestionAnswers(prev => ({
          ...prev,
          [move.playerNumber]: {
            answer: move.metadata.answerIndex,
            isCorrect: move.metadata.isCorrect,
            timestamp: move.createdAt
          }
        }));
      }
      
      if (move.type === 'question_end') {
        // Вопрос закончился, показываем результаты
        setShowResults(true);
        setTimeLeft(0);
      }
      
      if (move.type === 'quiz_finished') {
        // Викторина закончилась
        setCurrentQuestion(null);
      }
    });

    return unsubscribe;
  }, [gameId, currentPlayer.id, game.creatorId, currentQuestion?.id]);

  useEffect(() => {
    if (timeLeft > 0) {
      const timer = setTimeout(() => setTimeLeft(timeLeft - 1), 1000);
      return () => clearTimeout(timer);
    } else if (timeLeft === 0 && currentQuestion && !showResults && isQuizMaster) {
      // Время вышло, ведущий завершает вопрос
      endCurrentQuestion();
    }
  }, [timeLeft, currentQuestion, showResults, isQuizMaster]);

  const startNextQuestion = async () => {
    if (!isQuizMaster) return;
    
    if (questionIndex >= sampleQuestions.length) {
      // Викторина закончена
      await addGameMove(
        gameId,
        currentPlayer.id,
        currentPlayer.name,
        currentPlayerNumber,
        'quiz_finished',
        'Викторина завершена!',
        { finalScores: playersArray.map(p => ({ playerNumber: p.number, name: p.name, score: p.score || 0 })) }
      );
      return;
    }

    const question = sampleQuestions[questionIndex];
    
    try {
      await addGameMove(
        gameId,
        currentPlayer.id,
        currentPlayer.name,
        currentPlayerNumber,
        'question_start',
        `Вопрос ${questionIndex + 1}: ${question.question}`,
        { questionData: question }
      );
      
      setQuestionIndex(prev => prev + 1);
    } catch (err) {
      onError('Ошибка запуска вопроса');
    }
  };

  const endCurrentQuestion = async () => {
    if (!isQuizMaster || !currentQuestion) return;
    
    try {
      await addGameMove(
        gameId,
        currentPlayer.id,
        currentPlayer.name,
        currentPlayerNumber,
        'question_end',
        `Время вышло! Правильный ответ: ${currentQuestion.options[currentQuestion.correctAnswer]}`,
        { 
          questionId: currentQuestion.id,
          correctAnswer: currentQuestion.correctAnswer,
          answers: questionAnswers
        }
      );
    } catch (err) {
      onError('Ошибка завершения вопроса');
    }
  };

  const handleAnswerSelect = async (answerIndex: number) => {
    if (hasAnswered || !currentQuestion || timeLeft === 0) return;

    setSelectedAnswer(answerIndex);
    setHasAnswered(true);

    const isCorrect = answerIndex === currentQuestion.correctAnswer;

    try {
      await submitQuizAnswer(
        gameId,
        currentPlayer.id,
        currentPlayer.name,
        currentPlayerNumber,
        currentQuestion.id,
        currentQuestion.options[answerIndex],
        isCorrect
      );
    } catch (err) {
      onError('Ошибка отправки ответа');
    }
  };

  const nextQuestion = () => {
    if (!isQuizMaster) return;
    
    setTimeout(() => {
      startNextQuestion();
    }, 2000);
  };

  const handleLeaveGame = async () => {
    if (!confirm('Вы уверены, что хотите покинуть игру?')) {
      return;
    }

    try {
      setLeavingGame(true);
      await leaveGame(gameId, currentPlayer.id);
      // Перенаправляем на страницу игр
      window.history.back();
    } catch (err) {
      onError('Ошибка выхода из игры');
    } finally {
      setLeavingGame(false);
    }
  };

  const getPlayerDisplayName = (playerNumber: number) => {
    return `Игрок ${playerNumber}`;
  };

  // Автоматически начинаем первый вопрос если мы ведущий
  useEffect(() => {
    if (isQuizMaster && !currentQuestion && questionIndex === 0) {
      setTimeout(() => {
        startNextQuestion();
      }, 2000);
    }
  }, [isQuizMaster, currentQuestion, questionIndex]);

  if (!currentQuestion && !moves.some(m => m.type === 'quiz_finished')) {
    return (
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="min-h-screen flex items-center justify-center p-4 bg-gradient-to-br from-blue-50 via-indigo-50 to-purple-50"
      >
        <div className="w-full max-w-md">
          <motion.div
            animate={{ rotate: 360 }}
            transition={{ duration: 3, repeat: Infinity, ease: "linear" }}
            className="text-7xl mb-8 text-center"
          >
            🧠
          </motion.div>

          <div className="bg-white/80 backdrop-blur-md rounded-3xl shadow-2xl border border-indigo-100 p-8 text-center space-y-6">
            <div>
              <h2 className="text-3xl font-bold bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent mb-2">
                {isQuizMaster ? 'Подготовка викторины' : 'Комната ожидания'}
              </h2>
              <p className="text-gray-600">
                {isQuizMaster ? 'Готовьтесь начать вопросы' : 'Ожидаем начала игры'}
              </p>
            </div>

            <motion.div
              initial={{ scale: 0.9 }}
              animate={{ scale: 1 }}
              transition={{ duration: 2, repeat: Infinity }}
              className="inline-block"
            >
              <div className="w-20 h-20 border-4 border-indigo-200 border-t-indigo-600 rounded-full animate-spin mx-auto" />
            </motion.div>

            <div className="space-y-4 pt-6">
              <motion.div
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: 0.1 }}
                className="flex items-center justify-between p-4 bg-gradient-to-r from-blue-50 to-indigo-50 rounded-2xl border border-blue-200"
              >
                <span className="text-gray-700 font-medium">Ваш номер</span>
                <span className="px-4 py-2 bg-gradient-to-r from-blue-500 to-indigo-600 text-white font-bold rounded-lg">
                  Игрок {currentPlayerNumber}
                </span>
              </motion.div>

              <motion.div
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: 0.2 }}
                className="flex items-center justify-between p-4 bg-gradient-to-r from-purple-50 to-pink-50 rounded-2xl border border-purple-200"
              >
                <span className="text-gray-700 font-medium">Уровень сложности</span>
                <span className={`px-4 py-2 font-bold rounded-lg text-white ${
                  difficulty === 'easy'
                    ? 'bg-green-500'
                    : difficulty === 'medium'
                      ? 'bg-amber-500'
                      : 'bg-red-500'
                }`}>
                  {difficulty === 'easy' ? 'Легкий' : difficulty === 'medium' ? 'Средний' : 'Сложный'}
                </span>
              </motion.div>

              <motion.div
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: 0.3 }}
                className="flex items-center justify-between p-4 bg-gradient-to-r from-green-50 to-emerald-50 rounded-2xl border border-green-200"
              >
                <span className="text-gray-700 font-medium">Участников</span>
                <span className="px-4 py-2 bg-gradient-to-r from-green-500 to-emerald-600 text-white font-bold rounded-lg">
                  {playersArray.length}
                </span>
              </motion.div>
            </div>

            {isQuizMaster && (
              <motion.button
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                onClick={startNextQuestion}
                className="w-full mt-8 bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-700 hover:to-purple-700 text-white font-bold py-4 px-6 rounded-2xl transition-all duration-300 shadow-lg hover:shadow-xl flex items-center justify-center space-x-2"
              >
                <Play className="w-5 h-5" />
                <span>Начать викторину</span>
              </motion.button>
            )}
          </div>

          <motion.p
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.5 }}
            className="text-center text-gray-600 text-sm mt-6"
          >
            {isQuizMaster ? 'Вы можете начать игру в любой момент' : 'Ожидайте ведущего'}
          </motion.p>
        </div>
      </motion.div>
    );
  }

  // Если викторина завершена
  if (moves.some(m => m.type === 'quiz_finished')) {
    const finalMove = moves.find(m => m.type === 'quiz_finished');
    const finalScores = finalMove?.metadata?.finalScores || [];
    
    return (
      <div className="bg-white rounded-xl shadow-lg border border-gray-100 p-8">
        <div className="text-center mb-8">
          <Trophy className="w-16 h-16 text-yellow-500 mx-auto mb-4" />
          <h2 className="text-2xl font-bold text-gray-900 mb-4">Викторина завершена!</h2>
        </div>
        
        <div className="space-y-3">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Финальные результаты:</h3>
          {finalScores
            .sort((a: any, b: any) => (b.score || 0) - (a.score || 0))
            .map((player: any, index: number) => (
              <div
                key={player.playerNumber}
                className={`flex items-center justify-between p-4 rounded-lg ${
                  index === 0 
                    ? 'bg-yellow-50 border border-yellow-200' 
                    : 'bg-gray-50 border border-gray-200'
                }`}
              >
                <div className="flex items-center space-x-3">
                  <div className={`w-8 h-8 rounded-full flex items-center justify-center font-bold text-sm ${
                    index === 0 
                      ? 'bg-yellow-500 text-white' 
                      : index === 1 
                        ? 'bg-gray-400 text-white'
                        : index === 2
                          ? 'bg-orange-500 text-white'
                          : 'bg-gray-200 text-gray-700'
                  }`}>
                    {index + 1}
                  </div>
                  <span className="font-medium text-gray-900">
                    {getPlayerDisplayName(player.playerNumber)}
                  </span>
                  {index === 0 && <Crown className="w-4 h-4 text-yellow-500" />}
                </div>
                <div className="flex items-center space-x-2">
                  <Trophy className="w-4 h-4 text-yellow-500" />
                  <span className="font-bold text-gray-900">{player.score || 0}</span>
                </div>
              </div>
            ))}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Leave Game Button */}
      <motion.button
        whileHover={{ scale: 1.05 }}
        whileTap={{ scale: 0.95 }}
        onClick={handleLeaveGame}
        disabled={leavingGame}
        className="fixed top-4 right-4 z-50 flex items-center space-x-2 bg-red-600 text-white px-4 py-2 rounded-xl hover:bg-red-700 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-300 shadow-lg"
      >
        {leavingGame ? (
          <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
        ) : (
          <LogOut className="w-4 h-4" />
        )}
        <span className="text-sm font-medium">
          {leavingGame ? 'Выход...' : 'Покинуть'}
        </span>
      </motion.button>

      {/* Question */}
      {currentQuestion && (
        <div className="bg-white rounded-xl shadow-lg border border-gray-100 p-8">
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center space-x-3">
              <div className="w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center">
                <span className="text-blue-600 font-bold text-sm">{questionIndex}</span>
              </div>
              <h3 className="text-lg font-semibold text-gray-900">
                Вопрос {questionIndex} из {sampleQuestions.length}
              </h3>
            </div>
            
            <div className="flex items-center space-x-4">
              <div className="text-sm text-gray-600">
                Ваш номер: <span className="font-bold text-indigo-600">Игрок {currentPlayerNumber}</span>
              </div>
              
              <div className="text-sm text-gray-600">
                <span className="font-bold text-purple-600">
                  {difficulty === 'easy' ? 'Легкий' : difficulty === 'medium' ? 'Средний' : 'Сложный'}
                </span>
              </div>
              
              <div className="flex items-center space-x-2">
                <Clock className="w-4 h-4 text-orange-500" />
                <span className={`font-bold ${timeLeft <= 5 ? 'text-red-600' : 'text-orange-600'}`}>
                  {timeLeft}с
                </span>
              </div>
            </div>
          </div>

          <div className="text-center mb-8">
            <h2 className="text-2xl font-bold text-gray-900 mb-4">
              {currentQuestion.question}
            </h2>
          </div>

          {/* Answer Options */}
          {!showResults ? (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {currentQuestion.options.map((option, index) => (
                <motion.button
                  key={index}
                  whileHover={{ scale: hasAnswered ? 1 : 1.02 }}
                  whileTap={{ scale: hasAnswered ? 1 : 0.98 }}
                  onClick={() => handleAnswerSelect(index)}
                  disabled={hasAnswered || timeLeft === 0}
                  className={`p-4 rounded-xl border-2 transition-all duration-300 ${
                    selectedAnswer === index
                      ? 'border-indigo-500 bg-indigo-50 text-indigo-700'
                      : hasAnswered
                        ? 'border-gray-200 bg-gray-50 text-gray-500 cursor-not-allowed'
                        : 'border-gray-200 hover:border-indigo-300 hover:bg-indigo-50'
                  }`}
                >
                  <div className="flex items-center space-x-3">
                    <div className={`w-8 h-8 rounded-full border-2 flex items-center justify-center font-bold ${
                      selectedAnswer === index
                        ? 'border-indigo-500 bg-indigo-500 text-white'
                        : 'border-gray-300 text-gray-600'
                    }`}>
                      {String.fromCharCode(65 + index)}
                    </div>
                    <span className="font-medium">{option}</span>
                  </div>
                </motion.button>
              ))}
            </div>
          ) : (
            /* Results */
            <div className="space-y-4">
              <div className="text-center mb-6">
                <h3 className="text-xl font-bold text-gray-900 mb-2">Результаты вопроса</h3>
                <p className="text-gray-600">
                  Правильный ответ: <span className="font-bold text-green-600">
                    {currentQuestion.options[currentQuestion.correctAnswer]}
                  </span>
                </p>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {currentQuestion.options.map((option, index) => {
                  const answersForThisOption = Object.entries(questionAnswers)
                    .filter(([_, answer]) => answer.answer === index);
                  
                  return (
                    <div
                      key={index}
                      className={`p-4 rounded-xl border-2 ${
                        index === currentQuestion.correctAnswer
                          ? 'border-green-500 bg-green-50'
                          : 'border-gray-200 bg-gray-50'
                      }`}
                    >
                      <div className="flex items-center space-x-3 mb-2">
                        <div className={`w-8 h-8 rounded-full border-2 flex items-center justify-center font-bold ${
                          index === currentQuestion.correctAnswer
                            ? 'border-green-500 bg-green-500 text-white'
                            : 'border-gray-300 text-gray-600'
                        }`}>
                          {index === currentQuestion.correctAnswer ? (
                            <CheckCircle className="w-4 h-4" />
                          ) : (
                            String.fromCharCode(65 + index)
                          )}
                        </div>
                        <span className="font-medium">{option}</span>
                      </div>
                      
                      {/* Показываем кто выбрал этот ответ */}
                      {answersForThisOption.length > 0 && (
                        <div className="text-xs text-gray-600 ml-11">
                          {answersForThisOption.map(([playerNumber, _]) => 
                            getPlayerDisplayName(parseInt(playerNumber))
                          ).join(', ')}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
              
              {/* Next Question Button for Quiz Master */}
              {isQuizMaster && (
                <div className="text-center mt-6">
                  <button
                    onClick={nextQuestion}
                    className="bg-indigo-600 text-white px-6 py-3 rounded-lg hover:bg-indigo-700 transition-colors font-medium"
                  >
                    {questionIndex >= sampleQuestions.length ? 'Завершить викторину' : 'Следующий вопрос'}
                  </button>
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {/* Leaderboard */}
      <div className="bg-white rounded-xl shadow-lg border border-gray-100 p-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center space-x-2">
          <Trophy className="w-5 h-5 text-yellow-500" />
          <span>Рейтинг</span>
        </h3>
        
        <div className="space-y-2">
          {playersArray
            .sort((a, b) => (b.score || 0) - (a.score || 0))
            .map((player, index) => (
              <motion.div
                key={player.userId}
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: index * 0.05 }}
                className={`flex items-center justify-between p-3 rounded-lg ${
                  player.userId === currentPlayer.id
                    ? 'bg-indigo-50 border border-indigo-200'
                    : 'bg-gray-50'
                }`}
              >
                <div className="flex items-center space-x-3">
                  <div className={`w-8 h-8 rounded-full flex items-center justify-center font-bold text-sm ${
                    index === 0 
                      ? 'bg-yellow-500 text-white' 
                      : index === 1 
                        ? 'bg-gray-400 text-white'
                        : index === 2
                          ? 'bg-orange-500 text-white'
                          : 'bg-gray-200 text-gray-700'
                  }`}>
                    {index + 1}
                  </div>
                  <span className="font-medium text-gray-900">
                    {getPlayerDisplayName(player.number)}
                  </span>
                </div>
                <div className="flex items-center space-x-2">
                  <Trophy className="w-4 h-4 text-yellow-500" />
                  <span className="font-bold text-gray-900">{player.score || 0}</span>
                </div>
              </motion.div>
            ))}
        </div>
      </div>

      {/* Quiz Master Controls */}
      {isQuizMaster && !currentQuestion && !moves.some(m => m.type === 'quiz_finished') && (
        <div className="bg-indigo-50 rounded-xl border border-indigo-200 p-6">
          <h3 className="text-lg font-semibold text-indigo-900 mb-4">Управление викториной</h3>
          <div className="space-y-3">
            <button
              onClick={startNextQuestion}
              className="w-full bg-indigo-600 text-white px-6 py-3 rounded-lg hover:bg-indigo-700 transition-colors font-medium"
            >
              <Play className="w-4 h-4 inline mr-2" />
              Начать следующий вопрос
            </button>
            <p className="text-sm text-indigo-700">
              Вы ведущий викторины. Управляйте вопросами и временем.
            </p>
          </div>
        </div>
      )}
    </div>
  );
}