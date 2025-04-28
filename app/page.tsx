"use client";
import { useEffect, useState, useRef, useCallback } from 'react';

// 游戏常量
const GRID_SIZE = 20;
const CELL_SIZE = 20;
const INITIAL_SPEED = 150;

// 方向类型
type Direction = 'UP' | 'DOWN' | 'LEFT' | 'RIGHT';

// 坐标类型
interface Position {
  x: number;
  y: number;
}

export default function Game() {
  const [playerName, setPlayerName] = useState('');
  const [score, setScore] = useState(0);
  const [gameStarted, setGameStarted] = useState(false);
  const [gameOver, setGameOver] = useState(false);
  const [snake, setSnake] = useState<Position[]>([{ x: 10, y: 10 }]);
  const [food, setFood] = useState<Position>({ x: 5, y: 5 });
  const [direction, setDirection] = useState<Direction>('RIGHT');
  const [nextDirection, setNextDirection] = useState<Direction>('RIGHT');
  const [gameLoopDelay, setGameLoopDelay] = useState(INITIAL_SPEED);
  const [isPaused, setIsPaused] = useState(false);
  const [highScores, setHighScores] = useState<{name: string, score: number}[]>([]);
  const canvasRef = useRef<HTMLCanvasElement>(null);

  const fetchHighScores = useCallback(async () => {
    try {
      const response = await fetch('/api/getHighScores');
      const data = await response.json();
      setHighScores(data);
    } catch (error) {
      console.error('获取最高分失败:', error);
    }
  }, []);

  // 生成食物
  const generateFood = useCallback((snakeBody: Position[]) => {
    const newFood = {
      x: Math.floor(Math.random() * GRID_SIZE),
      y: Math.floor(Math.random() * GRID_SIZE)
    };
    
    if (snakeBody.some(segment => segment.x === newFood.x && segment.y === newFood.y)) {
      return generateFood(snakeBody);
    }
    
    setFood(newFood);
  }, []);

  // 游戏主逻辑
  const gameLoop = useCallback(() => {
    if (!gameStarted || gameOver || isPaused) return;

    setDirection(nextDirection);

    setSnake(prevSnake => {
      const head = { ...prevSnake[0] };

      switch (direction) {
        case 'UP': head.y -= 1; break;
        case 'DOWN': head.y += 1; break;
        case 'LEFT': head.x -= 1; break;
        case 'RIGHT': head.x += 1; break;
      }

      if (
        head.x < 0 || head.x >= GRID_SIZE || 
        head.y < 0 || head.y >= GRID_SIZE ||
        prevSnake.some(segment => segment.x === head.x && segment.y === head.y)
      ) {
        setGameOver(true);
        return prevSnake;
      }

      const newSnake = [head, ...prevSnake];
      if (head.x === food.x && head.y === food.y) {
        setScore(prev => prev + 10);
        generateFood(newSnake);
        if (gameLoopDelay > 50) {
          setGameLoopDelay(prev => prev - 5);
        }
      } else {
        newSnake.pop();
      }

      return newSnake;
    });
  }, [gameStarted, gameOver, isPaused, direction, nextDirection, food, gameLoopDelay, generateFood]);

  // 保存分数到数据库
  const saveScore = useCallback(async () => {
    try {
      const response = await fetch('/api/saveScore', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          name: playerName,
          score
        }),
      });
      if (!response.ok) throw new Error('保存失败');
      fetchHighScores(); // Refresh high scores after saving
    } catch (error) {
      console.error('保存分数失败:', error);
    }
  }, [playerName, score, fetchHighScores]);

  const resetGame = useCallback(() => {
    setGameOver(false);
    setGameStarted(false);
    setScore(0);
    setSnake([{ x: 10, y: 10 }]);
    setDirection('RIGHT');
    setNextDirection('RIGHT');
    setGameLoopDelay(INITIAL_SPEED);
    generateFood([{ x: 10, y: 10 }]);
  }, [generateFood]);

  // 键盘控制
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (!gameStarted || gameOver) return;
      
      switch (e.key) {
        case 'ArrowUp':
          if (direction !== 'DOWN') setNextDirection('UP');
          break;
        case 'ArrowDown':
          if (direction !== 'UP') setNextDirection('DOWN');
          break;
        case 'ArrowLeft':
          if (direction !== 'RIGHT') setNextDirection('LEFT');
          break;
        case 'ArrowRight':
          if (direction !== 'LEFT') setNextDirection('RIGHT');
          break;
        case ' ':
          setIsPaused(prev => !prev);
          break;
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [gameStarted, gameOver, direction]);

  // 游戏循环定时器
  useEffect(() => {
    if (!gameStarted || gameOver) return;

    const intervalId = setInterval(gameLoop, gameLoopDelay);
    return () => clearInterval(intervalId);
  }, [gameStarted, gameOver, gameLoop, gameLoopDelay]);

  // 画布渲染
  useEffect(() => {
    if (!canvasRef.current) return;

    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    ctx.clearRect(0, 0, canvas.width, canvas.height);

    ctx.fillStyle = '#f0f0f0';
    for (let i = 0; i < GRID_SIZE; i++) {
      for (let j = 0; j < GRID_SIZE; j++) {
        ctx.fillRect(i * CELL_SIZE, j * CELL_SIZE, CELL_SIZE, CELL_SIZE);
      }
    }

    ctx.fillStyle = '#ff5252';
    ctx.fillRect(food.x * CELL_SIZE, food.y * CELL_SIZE, CELL_SIZE, CELL_SIZE);

    snake.forEach((segment, index) => {
      ctx.fillStyle = index === 0 ? '#2e7d32' : '#4caf50';
      ctx.fillRect(segment.x * CELL_SIZE, segment.y * CELL_SIZE, CELL_SIZE, CELL_SIZE);
    });
  }, [snake, food]);

  useEffect(() => {
    fetchHighScores();
  }, [fetchHighScores]);

  // 游戏结束处理
  useEffect(() => {
    if (gameOver) {
      saveScore();
    }
  }, [gameOver, saveScore]);

  return (
    <div className="flex flex-col items-center justify-center min-h-screen bg-gray-50">
      <h1 className="text-3xl font-bold mb-4 text-gray-800">贪吃蛇游戏</h1>
      
      {!gameStarted ? (
        <div className="bg-white p-6 rounded-lg shadow-md w-full max-w-md border border-gray-200">
          <input
            type="text"
            placeholder="请输入玩家姓名"
            value={playerName}
            onChange={(e) => setPlayerName(e.target.value)}
            className="w-full p-3 mb-4 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-gray-800"
            required
          />
          {!gameStarted && (
            <div className="mb-6">
              <h2 className="text-xl font-semibold mb-2">最高分排行榜</h2>
              {highScores.length > 0 ? (
                <ul className="space-y-2">
                  {highScores.map((item, index) => (
                    <li key={index} className="flex justify-between">
                      <span>{item.name}</span>
                      <span className="font-bold">{item.score}</span>
                    </li>
                  ))}
                </ul>
              ) : (
                <p>暂无记录</p>
              )}
            </div>
          )}
          <button 
            onClick={() => {
              setGameStarted(true);
              generateFood([{ x: 10, y: 10 }]);
            }}
            disabled={!playerName.trim()}
            className="w-full py-3 px-4 bg-blue-600 text-white font-medium rounded-lg hover:bg-blue-700 disabled:bg-gray-400 transition-colors"
          >
            开始游戏
          </button>
        </div>
      ) : (
        <div className="w-full max-w-md bg-white p-4 rounded-lg shadow-md border border-gray-200">
          <div className="mb-4 flex justify-between items-center">
            <div className="text-lg font-semibold text-gray-800">
              玩家: <span className="text-blue-600">{playerName}</span>
            </div>
            <div className="text-lg font-semibold text-gray-800">
              分数: <span className="text-green-600">{score}</span>
              {isPaused && <span className="ml-2 text-red-500">(已暂停)</span>}
            </div>
          </div>
          <div className="mt-4 text-sm text-gray-600">
            <p>使用方向键控制，空格键暂停</p>
          </div>
          <canvas 
            ref={canvasRef} 
            className="w-full border border-gray-300 rounded-md bg-gray-100"
            width={GRID_SIZE * CELL_SIZE}
            height={GRID_SIZE * CELL_SIZE}
          />
          <div className="mt-4 flex justify-between">
            <button
              onClick={() => setIsPaused(prev => !prev)}
              className="px-4 py-2 bg-yellow-500 text-white rounded-lg hover:bg-yellow-600"
            >
              {isPaused ? '继续' : '暂停'}
            </button>
            <button
              onClick={resetGame}
              className="px-4 py-2 bg-red-500 text-white rounded-lg hover:bg-red-600"
            >
              重新开始
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
