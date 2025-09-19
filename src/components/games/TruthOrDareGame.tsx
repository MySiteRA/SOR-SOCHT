import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Users, MessageCircle, Target, Dice6 } from 'lucide-react';
import { 
  subscribeToGameEvents, 
  addGameEventRealtime,
  createTruthOrDareQuestion 
} from '../../services/gameService';
import type { Game, GamePlayer, GameEvent, Student } from '../../lib/supabase';

interface TruthOrDareGameProps {
  game: Game;
  players: GamePlayer[];
  currentPlayer: Student;
  onError: (error: string) => void;
}

export default function TruthOrDareGame({ game, players, currentPlayer, onError }: TruthOrDareGameProps) {
  const [events, setEvents] = useState<GameEvent[]>([]);
  const [selectedPlayer, setSelectedPlayer] = useState<GamePlayer | null>(null);
  const [questionType, setQuestionType] = useState<'truth' | 'dare' | null>(null);
  const [question, setQuestion] = useState('');
  const [currentTurn, setCurrentTurn] = useState<GamePlayer | null>(null);
  const [waitingForChoice, setWaitingForChoice] = useState(false);

  useEffect(() => {
    // Подписываемся на события игры
    const unsubscribe = subscribeToGameEvents(game.id, (event) => {
      setEvents(prev => [...prev, event]);
      
      if (event.event_type === 'question' && event.metadata?.to_player_id === currentPlayer.id) {
        setWaitingForChoice(true);
      }
    });

    // Выбираем случайного игрока для первого хода
    if (players.length > 0 && !currentTurn) {
      const randomPlayer = players[Math.floor(Math.random() * players.length)];
      setCurrentTurn(randomPlayer);
    }

    return unsubscribe;
  }, [game.id, players, currentPlayer.id]);

  const handlePlayerSelect = (player: GamePlayer) => {
    setSelectedPlayer(player);
  };

  const handleChoiceSelect = async (choice: 'truth' | 'dare') => {
    setQuestionType(choice);
    setWaitingForChoice(false);
    
    await addGameEventRealtime(
      game.id,
      currentPlayer.id,
      currentPlayer.name,
      'action',
      `выбрал ${choice === 'truth' ? 'Правду' : 'Действие'}`,
      { choice }
    );
  };

  const handleQuestionSubmit = async () => {
    if (!selectedPlayer || !questionType || !question.trim()) return;

    try {
      await createTruthOrDareQuestion(
        game.id,
        currentPlayer.id,
        currentPlayer.name,
        selectedPlayer.player_id,
        selectedPlayer.player_name,
        questionType,
        question
      );

      // Переходим к следующему игроку
      const currentIndex = players.findIndex(p => p.player_id === currentTurn?.player_id);
      const nextIndex = (currentIndex + 1) % players.length;
      setCurrentTurn(players[nextIndex]);

      // Сбрасываем состояние
      setSelectedPlayer(null);
      setQuestionType(null);
      setQuestion('');
    } catch (err) {
      onError('Ошибка отправки вопроса');
    }
  };

  const suggestRandomPlayer = () => {
    const otherPlayers = players.filter(p => p.player_id !== currentPlayer.id);
    if (otherPlayers.length > 0) {
      const randomPlayer = otherPlayers[Math.floor(Math.random() * otherPlayers.length)];
      setSelectedPlayer(randomPlayer);
    }
  };

  const isMyTurn = currentTurn?.player_id === currentPlayer.id;

  return (
    <div className="space-y-6">
      {/* Game Status */}
      <div className="bg-white rounded-xl shadow-lg border border-gray-100 p-6">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold text-gray-900">Ход игры</h3>
          <div className="flex items-center space-x-2">
            <Target className="w-4 h-4 text-indigo-600" />
            <span className="text-sm text-gray-600">
              Ход: {currentTurn?.player_name || 'Определяется...'}
            </span>
          </div>
        </div>

        {isMyTurn && !waitingForChoice && (
          <div className="space-y-4">
            <p className="text-gray-700">Ваш ход! Выберите игрока и задайте вопрос или дайте задание.</p>
            
            {/* Player Selection */}
            <div>
              <div className="flex items-center justify-between mb-3">
                <label className="text-sm font-medium text-gray-700">
                  Выберите игрока:
                </label>
                <button
                  onClick={suggestRandomPlayer}
                  className="flex items-center space-x-1 text-xs text-indigo-600 hover:text-indigo-700"
                >
                  <Dice6 className="w-3 h-3" />
                  <span>Случайный</span>
                </button>
              </div>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
                {players
                  .filter(p => p.player_id !== currentPlayer.id)
                  .map(player => (
                    <button
                      key={player.id}
                      onClick={() => handlePlayerSelect(player)}
                      className={`p-3 rounded-lg border transition-colors ${
                        selectedPlayer?.id === player.id
                          ? 'border-indigo-500 bg-indigo-50 text-indigo-700'
                          : 'border-gray-200 hover:border-indigo-300 hover:bg-gray-50'
                      }`}
                    >
                      <div className="text-xs font-medium truncate">
                        {player.player_name}
                      </div>
                    </button>
                  ))}
              </div>
            </div>

            {/* Question Type Selection */}
            {selectedPlayer && (
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-3">
                  Что выберет {selectedPlayer.player_name}?
                </label>
                <div className="grid grid-cols-2 gap-4">
                  <button
                    onClick={() => setQuestionType('truth')}
                    className={`p-4 rounded-lg border transition-colors ${
                      questionType === 'truth'
                        ? 'border-blue-500 bg-blue-50 text-blue-700'
                        : 'border-gray-200 hover:border-blue-300 hover:bg-blue-50'
                    }`}
                  >
                    <div className="text-2xl mb-2">🤔</div>
                    <div className="font-medium">Правда</div>
                    <div className="text-xs text-gray-600">Задать вопрос</div>
                  </button>
                  
                  <button
                    onClick={() => setQuestionType('dare')}
                    className={`p-4 rounded-lg border transition-colors ${
                      questionType === 'dare'
                        ? 'border-orange-500 bg-orange-50 text-orange-700'
                        : 'border-gray-200 hover:border-orange-300 hover:bg-orange-50'
                    }`}
                  >
                    <div className="text-2xl mb-2">⚡</div>
                    <div className="font-medium">Действие</div>
                    <div className="text-xs text-gray-600">Дать задание</div>
                  </button>
                </div>
              </div>
            )}

            {/* Question Input */}
            {selectedPlayer && questionType && (
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  {questionType === 'truth' ? 'Ваш вопрос:' : 'Ваше задание:'}
                </label>
                <textarea
                  value={question}
                  onChange={(e) => setQuestion(e.target.value)}
                  placeholder={questionType === 'truth' 
                    ? 'Например: Какой твой самый большой страх?' 
                    : 'Например: Спой песню в течение 30 секунд'
                  }
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent resize-none"
                  rows={3}
                />
                <button
                  onClick={handleQuestionSubmit}
                  disabled={!question.trim()}
                  className="mt-3 bg-indigo-600 text-white px-6 py-2 rounded-lg hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                >
                  Отправить {questionType === 'truth' ? 'вопрос' : 'задание'}
                </button>
              </div>
            )}
          </div>
        )}

        {/* Waiting for choice */}
        {waitingForChoice && (
          <div className="text-center space-y-4">
            <p className="text-lg text-gray-700">Вам задали вопрос! Выберите:</p>
            <div className="grid grid-cols-2 gap-4 max-w-md mx-auto">
              <button
                onClick={() => handleChoiceSelect('truth')}
                className="p-4 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-colors"
              >
                <div className="text-2xl mb-2">🤔</div>
                <div className="font-medium">Правда</div>
              </button>
              
              <button
                onClick={() => handleChoiceSelect('dare')}
                className="p-4 bg-orange-500 text-white rounded-lg hover:bg-orange-600 transition-colors"
              >
                <div className="text-2xl mb-2">⚡</div>
                <div className="font-medium">Действие</div>
              </button>
            </div>
          </div>
        )}

        {!isMyTurn && !waitingForChoice && (
          <div className="text-center text-gray-600">
            Ожидаем хода игрока: {currentTurn?.player_name}
          </div>
        )}
      </div>

      {/* Game Events */}
      <div className="bg-white rounded-xl shadow-lg border border-gray-100 p-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center space-x-2">
          <MessageCircle className="w-5 h-5 text-indigo-600" />
          <span>События игры</span>
        </h3>
        
        <div className="space-y-3 max-h-96 overflow-y-auto">
          {events.length === 0 ? (
            <div className="text-center py-8 text-gray-500">
              События игры будут отображаться здесь
            </div>
          ) : (
            events.map((event, index) => (
              <motion.div
                key={event.id}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.02 }}
                className={`p-3 rounded-lg ${
                  event.event_type === 'system' 
                    ? 'bg-blue-50 border border-blue-200' 
                    : 'bg-gray-50 border border-gray-200'
                }`}
              >
                <div className="flex items-start space-x-3">
                  <div className="text-sm">
                    {event.event_type === 'system' ? '🤖' : '👤'}
                  </div>
                  <div className="flex-1">
                    <div className="text-sm">
                      {event.player_name && event.event_type !== 'system' && (
                        <span className="font-medium text-gray-900">
                          {event.player_name}:{' '}
                        </span>
                      )}
                      <span className="text-gray-700">{event.content}</span>
                    </div>
                    <div className="text-xs text-gray-500 mt-1">
                      {new Date(event.created_at).toLocaleTimeString('ru-RU', {
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
    </div>
  );
}