import express from 'express';
import { createServer } from 'http';
import { Server } from 'socket.io';
import cors from 'cors';
import { nanoid } from 'nanoid'; // Для генерации уникальных хэшей

import { checkWinner } from './helpers/checkWinner.js';

const app = express();
const server = createServer(app);
const io = new Server(server, {
	cors: {
		origin: '*', // Разрешаем запросы с любого источника
		methods: ['GET', 'POST'],
	},
});

app.use(cors());
app.use(express.static('public'));

// Хранилище игровых комнат
const rooms = {};

// Функция создания новой комнаты
function createRoom() {
	const roomId = nanoid(10); // Генерация уникального ID комнаты
	rooms[roomId] = {
		players: [],
		gameState: {
			status: 'waiting', // Статус игры: waiting, finished
			primaryPlayerMove: null,
			secondaryPlayerMove: null,
			primePlayerScore: 0,
			secondaryPlayerScore: 0,
		},
	};
	return roomId;
}

// Обработка подключения пользователей
io.on('connection', (socket) => {
	console.log(`User connected: ${socket.id}`);

	// Пользователь создает новую игру
	socket.on('createGame', (callback) => {
		const roomId = createRoom(); // Создаем новую комнату
		socket.join(roomId); // Присоединяем пользователя к комнате
		rooms[roomId].players.push(socket.id); // Добавляем его в список игроков

		console.log(`Room created: ${roomId} by ${socket.id}`);
		callback({ roomId }); // Возвращаем пользователю ID комнаты
	});

	// Пользователь присоединяется к существующей комнате по roomId
	socket.on('joinGame', (roomId, callback) => {
		const room = rooms[roomId];

		if (!room) {
			return callback({ error: 'Room not found' });
		}

		if (room.players.length >= 2) {
			return callback({ error: 'Room is full' });
		}

		socket.join(roomId);
		room.players.push(socket.id);
		console.log(`User ${socket.id} joined room: ${roomId}`);

		// Уведомляем игроков в комнате
		io.to(roomId).emit('roomUpdate', room);

		// Если два игрока, запускаем игру
		if (room.players.length === 2) {
			io.to(roomId).emit('gameStart', room.gameState);
		}

		callback({ success: true });
	});

	// Обработка хода игрока
	socket.on('makeMove', ({ roomIdLoc, move }) => {
		// console.log(rooms);
		const room = rooms[roomIdLoc];
		if (!room) return;
		console.log(move);
		if (move.action.currentPlayer === 'primary') {
			rooms[roomIdLoc].gameState.primaryPlayerMove = move.action.action;
		}

		if (move.action.currentPlayer === 'secondary') {
			rooms[roomIdLoc].gameState.secondaryPlayerMove = move.action.action;
		}

		if (rooms[roomIdLoc].gameState.primaryPlayerMove && rooms[roomIdLoc].gameState.secondaryPlayerMove) {
			const winner = checkWinner(rooms[roomIdLoc].gameState.primaryPlayerMove, rooms[roomIdLoc].gameState.secondaryPlayerMove);
			if (winner === 'primary') {
				console.log(1);
				rooms[roomIdLoc].gameState.primePlayerScore++;
			} else if (winner === 'secondary') {
				console.log(2);
				rooms[roomIdLoc].gameState.secondaryPlayerScore++;
			}

			rooms[roomIdLoc].gameState.primaryPlayerMove = null;
			rooms[roomIdLoc].gameState.secondaryPlayerMove = null;
		}

		io.to(roomIdLoc).emit('updateState', room.gameState); // Шлем обновленный стейт
	});

	// Обработка отключения игрока
	socket.on('disconnect', () => {
		console.log(`User disconnected: ${socket.id}`);
		for (const [roomId, room] of Object.entries(rooms)) {
			if (room.players.includes(socket.id)) {
				room.players = room.players.filter((player) => player !== socket.id);

				// Уведомляем оставшихся игроков
				io.to(roomId).emit('roomUpdate', room);

				// Удаляем комнату, если игроков не осталось
				if (room.players.length === 0) {
					delete rooms[roomId];
					console.log(`Room ${roomId} deleted`);
				}

				break;
			}
		}
	});
});

// Запуск сервера
const PORT = 4242;
server.listen(PORT, () => {
	console.log(`Server is running on http://localhost:${PORT}`);
});
