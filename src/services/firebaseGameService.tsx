@@ .. @@
 export function submitAnswer(
   gameId: string,
   userId: string,
   userName: string,
   playerNumber: number,
   answer: string
 ): Promise<void> {
   return new Promise((resolve, reject) => {
     const gameRef = ref(db, `games/${gameId}`);
     
     // Сначала получаем текущую игру для определения следующего хода
     onValue(gameRef, (snapshot) => {
       const game = snapshot.val();
       if (!game || !game.players) {
         reject(new Error('Игра не найдена'));
         return;
       }

       // Фильтрация номеров игроков - убираем игроков с номером 0
       const playerIds = Object.keys(game.players);
       const playerNumbers = playerIds
         .map(id => game.players[id].number)
         .filter(number => number > 0);
       
-      // Выбираем случайного следующего игрока
-      const randomAsker = playerNumbers[Math.floor(Math.random() * playerNumbers.length)];
-      let randomTarget = playerNumbers[Math.floor(Math.random() * playerNumbers.length)];
-      
-      // Убеждаемся, что target не равен asker
-      while (randomTarget === randomAsker && playerNumbers.length > 1) {
-        randomTarget = playerNumbers[Math.floor(Math.random() * playerNumbers.length)];
-      }
+      // Улучшенный алгоритм выбора следующих игроков
+      const getSmartRandomPlayer = (excludeNumbers: number[], availableNumbers: number[]): number => {
+        // Сначала пытаемся выбрать из тех, кто не участвовал недавно
+        const nonRecentPlayers = availableNumbers.filter(num => !excludeNumbers.includes(num));
+        
+        if (nonRecentPlayers.length > 0) {
+          return nonRecentPlayers[Math.floor(Math.random() * nonRecentPlayers.length)];
+        }
+        
+        // Если все недавно участвовали, выбираем любого доступного
+        return availableNumbers[Math.floor(Math.random() * availableNumbers.length)];
+      };
+      
+      // Получаем историю недавних участников из moves
+      const recentMoves = Object.values(game.moves || {})
+        .filter((move: any) => move.type === 'answer')
+        .sort((a: any, b: any) => b.createdAt - a.createdAt)
+        .slice(0, Math.max(2, Math.floor(playerNumbers.length / 2)));
+      
+      const recentAskers = recentMoves.map((move: any) => move.playerNumber);
+      const recentTargets = recentMoves.map((move: any) => move.playerNumber);
+      
+      // Выбираем спрашивающего (избегаем недавних спрашивающих)
+      const randomAsker = getSmartRandomPlayer(recentAskers, playerNumbers);
+      
+      // Выбираем цель (избегаем недавних целей и спрашивающего)
+      const targetCandidates = playerNumbers.filter(num => num !== randomAsker);
+      let randomTarget = getSmartRandomPlayer(recentTargets, targetCandidates);
+      
+      // Дополнительная проверка, что target не равен asker
+      if (randomTarget === randomAsker && targetCandidates.length > 0) {
+        randomTarget = targetCandidates[Math.floor(Math.random() * targetCandidates.length)];
+      }

       // Правильный сброс хода - полная замена объекта currentTurn
       const newTurn = {
         asker: randomAsker,
         target: randomTarget,
         choice: null,
         question: null,
         answer: null
       };
       
       const updates: { [key: string]: any } = {};
       updates.currentTurn = newTurn;

       // Исправление промисов - правильная цепочка операций
       update(gameRef, updates)
         .then(() => {
           // Добавляем ход в историю с очищенным ответом
           return addGameMove(
             gameId,
             userId,
             userName,
             playerNumber,
             'answer',
             `Игрок ${playerNumber} ответил`,
             { answer: answer.trim() }
           );
         })
         .then(() => {
           resolve();
         })
         .catch(reject);
     }, { onlyOnce: true });
   });
 }