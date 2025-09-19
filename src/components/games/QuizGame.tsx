import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Trophy, Clock, CheckCircle, XCircle, Users } from 'lucide-react';
import { 
  subscribeToGameEvents, 
  addGameEventRealtime,
  submitQuizAnswer,
  updatePlayerScore
} from '../../services/gameService';
import type { Game, GamePlayer, GameEvent, Student } from '../../lib/supabase';

interface QuizQuestion {
  id: string;
  question: string;
  options: string[];
  correctAnswer: number;
  timeLimit: number;
}

const sampleQuestions: QuizQuestion[] = [
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
];

interface QuizGameProps {
  game: Game;
  players: GamePlayer[];
  currentPlayer: Student;
  onError: (error: string) => void;
}

export default function QuizGame({ game, players, currentPlayer, onError }: QuizGameProps) {
  const [events, setEvents] = useState<GameEvent[]>([]);
  const [currentQuestion, setCurrentQuestion] = useState<QuizQuestion | null>(null);
  const [questionIndex, setQuestionIndex] = useState(0);
  const [timeLeft, setTimeLeft] = useState(0);
  const [selectedAnswer, setSelectedAnswer] = useState<number | null>(null);
  const [hasAnswered, setHasAnswered] = useState(false);
  const [showResults, setShowResults] = useState(false);
  const [questionResults, setQuestionResults] = useState<{playerId: string, answer: number, isCorrect: boolean}[]>([]);

  useEffect(() => {
    // Подписываемся на события игры
    const unsubscribe = subscribeToGameEvents(game.id, (event) => {
      setEvents(prev => [...prev, event]);
      
      if (event.event_type === 'answer' && event.metadata?.question_id === currentQuestion?.id) {
        setQuestionResults(prev => [...prev, {
          playerId: event.player_id!,
          answer: parseInt(event.metadata.answer_index),
          isCorrect: event.metadata.is_correct
        }]);
      }
    });

    // Начинаем первый вопрос
    if (!currentQuestion && sampleQuestions.length > 0) {
      startNextQuestion();
    }

    return unsubscribe;
  }, [game.id]);

  useEffect(() => {
    if (timeLeft > 0) {
      const timer = setTimeout(() => setTimeLeft(timeLeft - 1), 1000);
      return () => clearTimeout(timer);
    } else if (timeLeft === 0 && currentQuestion && !showResults) {
      // Время вышло, показываем результаты
      setShowResults(true);
      setTimeout(() => {
        nextQuestion();
      }, 3000);
    }
  }, [timeLeft, currentQuestion, showResults]);

  const startNextQuestion = () => {
    if (questionIndex >= sampleQuestions.length) {
      // Игра закончена, показываем финальные результаты
      showFinalResults();
      return;
    }

    const question = sampleQuestions[questionIndex];
    setCurrentQuestion(question);
    setTimeLeft(question.timeLimit);
    setSelectedAnswer(null);
    setHasAnswered(false);
    setShowResults(false);
    setQuestionResults([]);

    // Отправляем системное событие с новым вопросом
    addGameEventRealtime(
      game.id,
      null,
      null,
      'system',
      `Вопрос ${questionIndex + 1}: ${question.question}`,
      { question_id: question.id, options: question.options }
    );
  };

  const handleAnswerSelect = async (answerIndex: number) => {
    if (hasAnswered || !currentQuestion) return;

    setSelectedAnswer(answerIndex);
    setHasAnswered(true);

    const isCorrect = answerIndex === currentQuestion.correctAnswer;

    try {
      await submitQuizAnswer(
        game.id,
        currentPlayer.id,
        currentPlayer.name,
        currentQuestion.id,
        currentQuestion.options[answerIndex],
        isCorrect
      );
    } catch (err) {
      onError('Ошибка отправки ответа');
    }
  };

  const nextQuestion = () => {
    setQuestionIndex(prev => prev + 1);
    setTimeout(() => {
      startNextQuestion();
    }, 1000);
  };

  const showFinalResults = async () => {
    // Сортируем игроков по очкам
    const sortedPlayers = [...players].sort((a, b) => b.score - a.score);
    
    await addGameEventRealtime(
      game.id,
      null,
      null,
      'system',
      'Викторина завершена! Результаты:',
      { final_results: sortedPlayers.map(p => ({ name: p.player_name, score: p.score })) }
    );
  };

  if (!currentQuestion) {
    return (
      <div className="bg-white rounded-xl shadow-lg border border-gray-100 p-8 text-center">
        <div className="w-16 h-16 border-4 border-indigo-600 border-t-transparent rounded-full animate-spin mx-auto mb-4" />
        <p className="text-gray-600">Подготовка вопросов...</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Question */}
      <div className="bg-white rounded-xl shadow-lg border border-gray-100 p-8">
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center space-x-3">
            <div className="w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center">
              <span className="text-blue-600 font-bold text-sm">{questionIndex + 1}</span>
            </div>
            <h3 className="text-lg font-semibold text-gray-900">
              Вопрос {questionIndex + 1} из {sampleQuestions.length}
            </h3>
          </div>
          
          <div className="flex items-center space-x-2">
            <Clock className="w-4 h-4 text-orange-500" />
            <span className={`font-bold ${timeLeft <= 5 ? 'text-red-600' : 'text-orange-600'}`}>
              {timeLeft}с
            </span>
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
              {currentQuestion.options.map((option, index) => (
                <div
                  key={index}
                  className={`p-4 rounded-xl border-2 ${
                    index === currentQuestion.correctAnswer
                      ? 'border-green-500 bg-green-50'
                      : 'border-gray-200 bg-gray-50'
                  }`}
                >
                  <div className="flex items-center space-x-3">
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
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Leaderboard */}
      <div className="bg-white rounded-xl shadow-lg border border-gray-100 p-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center space-x-2">
          <Trophy className="w-5 h-5 text-yellow-500" />
          <span>Рейтинг</span>
        </h3>
        
        <div className="space-y-2">
          {[...players]
            .sort((a, b) => b.score - a.score)
            .map((player, index) => (
              <motion.div
                key={player.id}
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: index * 0.05 }}
                className={`flex items-center justify-between p-3 rounded-lg ${
                  player.player_id === currentPlayer.id
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
                    {player.player_name}
                  </span>
                </div>
                <div className="flex items-center space-x-2">
                  <Trophy className="w-4 h-4 text-yellow-500" />
                  <span className="font-bold text-gray-900">{player.score}</span>
                </div>
              </motion.div>
            ))}
        </div>
      </div>
    </div>
  );
}