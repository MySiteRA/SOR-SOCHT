import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Users, MessageCircle, Target, Dice6, Send, Clock } from 'lucide-react';
import { 
  subscribeToGameMoves,
  subscribeToCurrentTurn,
  addGameMove,
  submitChoice,
  submitQuestion,
  submitAnswer,
  getPlayerByNumber,
  getPlayerNumber,
  type FirebaseGame,
  type FirebasePlayer,
  type FirebaseMove
} from '../../services/firebaseGameService';
import type { Student } from '../../lib/supabase';

interface FirebaseTruthOrDareGameProps {
  game: FirebaseGame;
  players: { [userId: string]: FirebasePlayer };
  currentPlayer: Student;
  gameId: string;
  onError: (error: string) => void;
}

export default function FirebaseTruthOrDareGame({ 
  game, 
  players, 
  currentPlayer, 
  gameId, 
  onError 
}: FirebaseTruthOrDareGameProps) {
  const [moves, setMoves] = useState<(FirebaseMove & { id: string })[]>([]);
  const [currentTurn, setCurrentTurn] = useState<any>(null);
  const [question, setQuestion] = useState('');
  const [answer, setAnswer] = useState('');
  const [recentParticipants, setRecentParticipants] = useState<{askers: number[], targets: number[]}>({
    askers: [],
    targets: []
  });

  const currentPlayerNumber = getPlayerNumber(players, currentPlayer.id);
  const showPlayerNames = game.settings?.anonymity === false;
  const playersArray = Object.entries(players).map(([userId, player]) => ({
    userId,
    ...player
  })).sort((a, b) => a.number - b.number);

  useEffect(() => {
    // Подписываемся на ходы игры
    const unsubscribeMoves = subscribeToGameMoves(gameId, (move) => {
      setMoves(prev => [...prev, move]);
      
      // Отслеживаем участников для улучшения рандомайзера
      if (move.type === 'answer') {
        // Когда игрок ответил, обновляем список недавних участников
        setRecentParticipants(prev => {
          const maxRecentCount = Math.max(2, Math.floor(Object.keys(players).length / 2));
          
          return {
            askers: [move.playerNumber, ...prev.askers].slice(0, maxRecentCount),
            targets: [move.playerNumber, ...prev.targets].slice(0, maxRecentCount)
          };
        });
      }
    });

    // Подписываемся на текущий ход
    const unsubscribeTurn = subscribeToCurrentTurn(gameId, (turn) => {
      setCurrentTurn(turn);
    });

    return () => {
      unsubscribeMoves();
      unsubscribeTurn();
    };
  }, [gameId]);

  const handleChoice = async (choice: 'truth' | 'dare') => {
    try {
      await submitChoice(gameId, currentPlayer.id, currentPlayer.name, currentPlayerNumber, choice);
    } catch (err) {
      onError('Ошибка отправки выбора');
    }
  };

  const handleQuestionSubmit = async () => {
    if (!question.trim()) return;

    try {
      await submitQuestion(gameId, currentPlayer.id, currentPlayer.name, currentPlayerNumber, question);
      setQuestion('');
    } catch (err) {
      onError('Ошибка отправки вопроса');
    }
  };

  const handleAnswerSubmit = async () => {
    // Очистка ввода - удаляем лишние пробелы
    const cleanAnswer = answer.trim();
    if (!cleanAnswer) return;

    try {
      await submitAnswer(gameId, currentPlayer.id, currentPlayer.name, currentPlayerNumber, cleanAnswer);
      setAnswer('');
    } catch (err) {
      onError('Ошибка отправки ответа');
    }
  };

  const isMyTurnToChoose = currentTurn?.target === currentPlayerNumber && !currentTurn?.choice;
  const isMyTurnToAsk = currentTurn?.asker === currentPlayerNumber && currentTurn?.choice && !currentTurn?.question;
  const isMyTurnToAnswer = currentTurn?.target === currentPlayerNumber && currentTurn?.question && !currentTurn?.answer;

  const getPlayerDisplayName = (playerNumber: number) => {
    if (showPlayerNames) {
      const playerData = getPlayerByNumber(players, playerNumber);
      return playerData ? playerData.player.name : `Игрок ${playerNumber}`;
    }
    return `Игрок ${playerNumber}`;
  };

  return (
    <div className="space-y-6">
      {/* Game Status */}
      <div className="bg-white rounded-xl shadow-lg border border-gray-100 p-8">
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center space-x-3">
            <Target className="w-6 h-6 text-indigo-600" />
            <div>
              <h3 className="text-lg font-semibold text-gray-900">Правда или Действие</h3>
              <p className="text-sm text-gray-600">
                Ваш номер: <span className="font-bold text-indigo-600">Игрок {currentPlayerNumber}</span>
              </p>
            </div>
          </div>
          
          <div className="flex items-center space-x-4">
            {showPlayerNames && (
              <div className="text-sm text-gray-600 bg-green-100 px-3 py-1 rounded-lg border border-green-200">
                <span>Имена игроков видны</span>
              </div>
            )}
            
            <div className="flex items-center space-x-2 text-sm text-gray-600">
              <Users className="w-4 h-4" />
              <span>{Object.keys(players).length} игроков</span>
            </div>
          </div>
        </div>

        {/* Current Turn Status */}
        {currentTurn && (
          <div className="bg-gradient-to-r from-indigo-50 to-purple-50 rounded-xl p-6 mb-6 border border-indigo-200">
            <div className="text-center">
              <h4 className="text-lg font-semibold text-gray-900 mb-2">
                {!currentTurn.choice && (
                  <>🎯 {getPlayerDisplayName(currentTurn.asker)} спрашивает {getPlayerDisplayName(currentTurn.target)}: Правда или Действие?</>
                )}
                {currentTurn.choice && !currentTurn.question && (
                  <>📝 {getPlayerDisplayName(currentTurn.asker)} задаёт {currentTurn.choice === 'truth' ? 'вопрос' : 'задание'} для {getPlayerDisplayName(currentTurn.target)}</>
                )}
                {currentTurn.question && !currentTurn.answer && (
                  <>💭 {getPlayerDisplayName(currentTurn.target)} отвечает на {currentTurn.choice === 'truth' ? 'вопрос' : 'задание'}</>
                )}
              </h4>
              
              {currentTurn.question && (
                <div className="bg-white rounded-lg p-4 border border-indigo-200 mt-4">
                  <p className="text-gray-800 font-medium">{currentTurn.question}</p>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Choice Interface */}
        {isMyTurnToChoose && (
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="space-y-4"
          >
            <div className="bg-yellow-50 rounded-lg p-4 border border-yellow-200">
              <p className="text-yellow-800 font-medium text-center">
                🎯 Ваш ход! Выберите: Правда или Действие?
              </p>
            </div>
            
            <div className="grid grid-cols-2 gap-4 max-w-md mx-auto">
              <button
                onClick={() => handleChoice('truth')}
                className="p-6 bg-blue-500 text-white rounded-xl hover:bg-blue-600 transition-colors shadow-lg hover:shadow-xl"
              >
                <div className="text-3xl mb-3">🤔</div>
                <div className="font-bold text-lg">Правда</div>
                <div className="text-sm opacity-90 mt-1">Ответить на вопрос</div>
              </button>
              
              <button
                onClick={() => handleChoice('dare')}
                className="p-6 bg-orange-500 text-white rounded-xl hover:bg-orange-600 transition-colors shadow-lg hover:shadow-xl"
              >
                <div className="text-3xl mb-3">⚡</div>
                <div className="font-bold text-lg">Действие</div>
                <div className="text-sm opacity-90 mt-1">Выполнить задание</div>
              </button>
            </div>
          </motion.div>
        )}

        {/* Question Interface */}
        {isMyTurnToAsk && (
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="space-y-4"
          >
            <div className="bg-green-50 rounded-lg p-4 border border-green-200">
              <p className="text-green-800 font-medium text-center">
                📝 Задайте {currentTurn.choice === 'truth' ? 'вопрос' : 'задание'} для {getPlayerDisplayName(currentTurn.target)}
              </p>
            </div>
            
            <div className="space-y-3">
              <textarea
                value={question}
                onChange={(e) => setQuestion(e.target.value)}
                placeholder={currentTurn.choice === 'truth' 
                  ? 'Например: Какой твой самый большой страх?' 
                  : 'Например: Спой песню в течение 30 секунд'
                }
                className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:border-transparent resize-none"
                rows={3}
              />
              <button
                onClick={handleQuestionSubmit}
                disabled={!question.trim()}
                className="w-full bg-indigo-600 text-white px-6 py-3 rounded-xl hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors font-medium flex items-center justify-center space-x-2"
              >
                <Send className="w-4 h-4" />
                <span>Отправить {currentTurn.choice === 'truth' ? 'вопрос' : 'задание'}</span>
              </button>
            </div>
          </motion.div>
        )}

        {/* Answer Interface */}
        {isMyTurnToAnswer && (
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="space-y-4"
          >
            <div className="bg-purple-50 rounded-lg p-4 border border-purple-200">
              <p className="text-purple-800 font-medium text-center">
                💭 Ваш ответ на {currentTurn.choice === 'truth' ? 'вопрос' : 'задание'}:
              </p>
            </div>
            
            <div className="space-y-3">
              <textarea
                value={answer}
                onChange={(e) => setAnswer(e.target.value)}
                placeholder={currentTurn.choice === 'truth' 
                  ? 'Ваш честный ответ...' 
                  : 'Опишите, как выполнили задание...'
                }
                className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-purple-500 focus:border-transparent resize-none"
                rows={3}
              />
              <button
                onClick={handleAnswerSubmit}
                disabled={!answer.trim()}
                className="w-full bg-purple-600 text-white px-6 py-3 rounded-xl hover:bg-purple-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors font-medium flex items-center justify-center space-x-2"
              >
                <Send className="w-4 h-4" />
                <span>Отправить ответ</span>
              </button>
            </div>
          </motion.div>
        )}

        {/* Waiting State */}
        {!isMyTurnToChoose && !isMyTurnToAsk && !isMyTurnToAnswer && currentTurn && (
          <div className="text-center text-gray-600 bg-gray-50 rounded-lg p-6">
            <Clock className="w-8 h-8 text-gray-400 mx-auto mb-2" />
            <p>
              {!currentTurn.choice && (
                <>Ожидаем выбора от {getPlayerDisplayName(currentTurn.target)}</>
              )}
              {currentTurn.choice && !currentTurn.question && (
                <>Ожидаем {currentTurn.choice === 'truth' ? 'вопрос' : 'задание'} от {getPlayerDisplayName(currentTurn.asker)}</>
              )}
              {currentTurn.question && !currentTurn.answer && (
                <>Ожидаем ответ от {getPlayerDisplayName(currentTurn.target)}</>
              )}
            </p>
          </div>
        )}
      </div>

      {/* Players Grid */}
      <div className="bg-white rounded-xl shadow-lg border border-gray-100 p-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center space-x-2">
          <Users className="w-5 h-5 text-indigo-600" />
          <span>Игроки</span>
        </h3>
        
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
          {playersArray.map((player, index) => {
            const isCurrentPlayer = player.userId === currentPlayer.id;
            const isAsker = currentTurn?.asker === player.number;
            const isTarget = currentTurn?.target === player.number;
            
            return (
              <motion.div
                key={player.userId}
                initial={{ opacity: 0, scale: 0.8 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ delay: index * 0.05 }}
                className={`p-4 rounded-lg border-2 transition-all text-center ${
                  isCurrentPlayer
                    ? 'border-indigo-500 bg-indigo-50'
                    : isAsker
                      ? 'border-green-500 bg-green-50'
                      : isTarget
                        ? 'border-orange-500 bg-orange-50'
                        : 'border-gray-200 bg-gray-50'
                }`}
              >
                <div className="w-12 h-12 bg-gradient-to-br from-indigo-500 to-purple-600 rounded-full flex items-center justify-center mx-auto mb-2 text-white font-bold">
                  {player.number}
                </div>
                <p className="text-sm font-medium text-gray-900 truncate">
                  {showPlayerNames ? player.name : `Игрок ${player.number}`}
                </p>
                {isCurrentPlayer && (
                  <div className="text-xs text-indigo-600 font-medium mt-1">Это вы</div>
                )}
                {isAsker && (
                  <div className="text-xs text-green-600 font-medium mt-1">Спрашивает</div>
                )}
                {isTarget && (
                  <div className="text-xs text-orange-600 font-medium mt-1">Отвечает</div>
                )}
              </motion.div>
            );
          })}
        </div>
      </div>

      {/* Game Events */}
      <div className="bg-white rounded-xl shadow-lg border border-gray-100 p-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center space-x-2">
          <MessageCircle className="w-5 h-5 text-indigo-600" />
          <span>События игры</span>
        </h3>
        
        <div className="space-y-3 max-h-96 overflow-y-auto">
          {moves.length === 0 ? (
            <div className="text-center py-8 text-gray-500">
              <MessageCircle className="w-12 h-12 text-gray-400 mx-auto mb-3" />
              <p>События игры будут отображаться здесь</p>
            </div>
          ) : (
            moves.map((move, index) => (
              <motion.div
                key={move.id}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.02 }}
                className={`p-4 rounded-lg border ${
                  move.type === 'system' 
                    ? 'bg-blue-50 border-blue-200' 
                    : move.type === 'question'
                      ? 'bg-purple-50 border-purple-200'
                      : move.type === 'choice'
                        ? 'bg-green-50 border-green-200'
                        : move.type === 'answer'
                          ? 'bg-orange-50 border-orange-200'
                          : 'bg-gray-50 border-gray-200'
                }`}
              >
                <div className="flex items-start space-x-3">
                  <div className="text-lg">
                    {move.type === 'system' ? '🤖' : 
                     move.type === 'choice' ? '✅' :
                     move.type === 'question' ? (move.metadata?.choice === 'truth' ? '🤔' : '⚡') :
                     move.type === 'answer' ? '💭' : '👤'}
                  </div>
                  <div className="flex-1">
                    <div className="text-sm">
                      <span className="text-gray-700">{move.content}</span>
                    </div>
                    
                    {/* Показываем детали для некоторых типов ходов */}
                    {move.type === 'question' && move.metadata?.question && (
                      <div className="mt-2 p-3 bg-white rounded-lg border border-gray-200">
                        <p className="text-gray-800 font-medium">"{move.metadata.question}"</p>
                      </div>
                    )}
                    
                    {move.type === 'answer' && move.metadata?.answer && (
                      <div className="mt-2 p-3 bg-white rounded-lg border border-gray-200">
                        <p className="text-gray-800 font-medium">"{move.metadata.answer}"</p>
                      </div>
                    )}
                    
                    <div className="text-xs text-gray-500 mt-1">
                      {new Date(move.createdAt).toLocaleTimeString('ru-RU', {
                        hour: '2-digit',
                        minute: '2-digit'
                      })}
                    </div>
                  </div>
                </div>
              </motion.div>
            ))
          )}
        </div>
      </div>

      {/* Game Rules */}
      <div className="bg-gradient-to-r from-gray-50 to-gray-100 rounded-xl p-6 border border-gray-200">
        <h4 className="font-semibold text-gray-900 mb-3">Правила игры:</h4>
        <div className="space-y-2 text-sm text-gray-700">
          <p>🎭 <strong>Номера:</strong> Все игроки получают случайные номера{showPlayerNames ? ', но имена видны' : ' для анонимности'}</p>
          <p>🎯 <strong>Ход:</strong> Случайно выбираются спрашивающий и отвечающий</p>
          <p>🤔 <strong>Правда:</strong> Честно ответьте на вопрос</p>
          <p>⚡ <strong>Действие:</strong> Выполните задание и опишите результат</p>
        </div>
      </div>
    </div>
  );
}