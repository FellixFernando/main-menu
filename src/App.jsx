import { useState, useEffect, useRef, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { useTransition } from "./TransitionContext";
import clickSound from "./button-click.mp3";
import "./ObstacleGame.css"; // Make sure the path is correct relative to this file
import ucup2 from "./ucup2.png";
import rock1 from "./rock1.png"; // Import the rock image
import rock2 from "./rock2.png";
import rock4 from "./rock4.png";

// Define constants OUTSIDE the component function
const playerVisualSize = 40;
const obstacleVisualSize = 50; // Changed from 60 to 50
const playerBottomOffsetPx = 40; // The 'bottom: 40px' from your CSS
const GAME_DURATION = 60; // seconds
const MAP_BORDER_PX = 60; // Border width in pixels

export default function ObstacleGame() {
	const navigate = useNavigate();
	const { triggerTransition } = useTransition();
	const [gameStarted, setGameStarted] = useState(false);
	const [gameOver, setGameOver] = useState(false);
	const [score, setScore] = useState(0);
	const [timeLeft, setTimeLeft] = useState(GAME_DURATION);
	const [playerPosition, setPlayerPosition] = useState(50); // Horizontal position %
	const [obstacles, setObstacles] = useState([]); // [{ id, x: %, y: % }, ...]
	const [backgroundPosition, setBackgroundPosition] = useState(0); // For background scroll effect
	const [attemptsLeft, setAttemptsLeft] = useState(3); // Add attempts counter
	const [highestScore, setHighestScore] = useState(0); // Add highest score tracking
	const [playerDirection, setPlayerDirection] = useState("right"); // default facing right
	const [playerMoving, setPlayerMoving] = useState(false);
	const [playerFrame, setPlayerFrame] = useState(0); // Add this line for player animation frame

	const gameAreaRef = useRef(null); // Ref to the game area div
	const requestRef = useRef(null); // Ref for requestAnimationFrame ID
	const obstacleTimerRef = useRef(null); // Ref for the setTimeout ID for spawning
	const lastTimeRef = useRef(0); // Ref for timestamp in game loop
	const gameStateRef = useRef({
		// Use a ref to track state without re-renders
		gameStarted: false,
		gameOver: false,
		playerPosition: 50,
		obstacles: [],
		attemptsLeft: 3,
	});

	// Update the ref whenever state changes
	useEffect(() => {
		gameStateRef.current = {
			...gameStateRef.current,
			gameStarted,
			gameOver,
			playerPosition,
			obstacles,
			attemptsLeft,
		};
	}, [gameStarted, gameOver, playerPosition, obstacles, attemptsLeft]);

	// Function to end the game
	const endGame = useCallback((survived = false, finalScore = 0) => {
		console.log(`Game ending. Survived: ${survived}`);

		// Always update highest score to the latest value
		setHighestScore((prev) => Math.max(prev, finalScore));

		// Decrease attempts if not survived
		if (!survived) {
			setAttemptsLeft((prev) => prev - 1);
		}

		setGameOver(true);
		setGameStarted(false);

		if (requestRef.current) {
			cancelAnimationFrame(requestRef.current);
			requestRef.current = null;
		}
		if (obstacleTimerRef.current) {
			clearTimeout(obstacleTimerRef.current);
			obstacleTimerRef.current = null;
		}
	}, []);

	// Game loop function with improved collision detection
	const gameLoop = useCallback(
		(timestamp) => {
			const { gameStarted, gameOver, playerPosition, obstacles } =
				gameStateRef.current;

			// Check game state early
			if (!gameStarted || gameOver) {
				return;
			}

			// Calculate delta time with a maximum to prevent huge jumps if tab is inactive
			const deltaTime = Math.min(timestamp - lastTimeRef.current, 50);
			lastTimeRef.current = timestamp;

			// Get game area dimensions for pixel calculations
			const gameAreaDims = gameAreaRef.current
				? {
						width: gameAreaRef.current.offsetWidth,
						height: gameAreaRef.current.offsetHeight,
				  }
				: { width: 500, height: 400 }; // Fallback

			// Update background position
			setBackgroundPosition((prev) => prev + deltaTime * 0.05);

			// Create new obstacles array with updated positions
			const updatedObstacles = obstacles
				.map((obstacle) => ({
					...obstacle,
					y: obstacle.y + deltaTime * 0.15, // Slightly reduced speed for smoother movement
				}))
				.filter((obstacle) => obstacle.y < 100); // Remove off-screen obstacles

			// Check for collisions
			let collisionDetected = false;

			// Player hitbox (in pixels)
			const playerCenterPx = (playerPosition / 100) * gameAreaDims.width;
			const playerLeftPx = playerCenterPx - playerVisualSize / 2;
			const playerRightPx = playerLeftPx + playerVisualSize;
			const playerBottomPx = gameAreaDims.height - playerBottomOffsetPx;
			const playerTopPx = playerBottomPx - playerVisualSize;

			// Player hitbox reduced by 20% for more forgiving collisions
			const hitboxReduction = playerVisualSize * 0.1;
			const playerHitboxLeft = playerLeftPx + hitboxReduction;
			const playerHitboxRight = playerRightPx - hitboxReduction;
			const playerHitboxTop = playerTopPx + hitboxReduction;
			const playerHitboxBottom = playerBottomPx - hitboxReduction;

			// Check each obstacle for collision
			for (const obstacle of updatedObstacles) {
				// Obstacle pixel coordinates
				const obstacleLeftPx = (obstacle.x / 100) * gameAreaDims.width;
				const obstacleTopPx = (obstacle.y / 100) * gameAreaDims.height;

				// Obstacle hitbox reduced by 20% for more forgiving collisions
				const obstacleHitboxReduction = obstacleVisualSize * 0.1;
				const obstacleHitboxLeft = obstacleLeftPx + obstacleHitboxReduction;
				const obstacleHitboxRight =
					obstacleLeftPx + obstacleVisualSize - obstacleHitboxReduction;
				const obstacleHitboxTop = obstacleTopPx + obstacleHitboxReduction;
				const obstacleHitboxBottom =
					obstacleTopPx + obstacleVisualSize - obstacleHitboxReduction;

				// Check for overlap using reduced hitboxes
				const xOverlap =
					playerHitboxLeft < obstacleHitboxRight &&
					playerHitboxRight > obstacleHitboxLeft;
				const yOverlap =
					playerHitboxTop < obstacleHitboxBottom &&
					playerHitboxBottom > obstacleHitboxTop;

				if (xOverlap && yOverlap) {
					console.warn(`COLLISION DETECTED with obstacle ${obstacle.id}!`);
					collisionDetected = true;
					break; // Exit loop early once collision is found
				}
			}

			if (collisionDetected) {
				endGame(false, score);
			} else {
				setObstacles(updatedObstacles);
			}

			requestRef.current = requestAnimationFrame(gameLoop);
		},
		[endGame, score]
	);

	// Effect for keyboard input with improved boundary calculations
	useEffect(() => {
		let animationInterval;
		if (playerMoving) {
			animationInterval = setInterval(() => {
				setPlayerFrame((prev) => (prev + 1) % 4);
			}, 80); // Reduced from 120ms to 80ms for faster animation
		} else {
			setPlayerFrame(0); // Reset to standing frame
		}
		return () => clearInterval(animationInterval);
	}, [playerMoving]);

	useEffect(() => {
		const handleKeyDown = (e) => {
			if (!gameStateRef.current.gameStarted || gameStateRef.current.gameOver)
				return;
			const gameAreaWidth = gameAreaRef.current
				? gameAreaRef.current.offsetWidth
				: 500;
			const playerWidthPercent = (playerVisualSize / gameAreaWidth) * 100;
			const borderPercent = (MAP_BORDER_PX / gameAreaWidth) * 100;
			const moveStep = 4; // Increased from 3 to 4 for faster movement

			// Update direction immediately
			if (e.key === "ArrowLeft") {
				setPlayerDirection("left");
				setPlayerMoving(true);
				setPlayerPosition((prev) =>
					Math.max(borderPercent + playerWidthPercent / 2, prev - moveStep)
				);
			} else if (e.key === "ArrowRight") {
				setPlayerDirection("right");
				setPlayerMoving(true);
				setPlayerPosition((prev) =>
					Math.min(
						100 - borderPercent - playerWidthPercent / 2,
						prev + moveStep
					)
				);
			}
		};
		const handleKeyUp = (e) => {
			if (e.key === "ArrowLeft" || e.key === "ArrowRight") {
				setPlayerMoving(false);
			}
		};
		window.addEventListener("keydown", handleKeyDown);
		window.addEventListener("keyup", handleKeyUp);
		return () => {
			window.removeEventListener("keydown", handleKeyDown);
			window.removeEventListener("keyup", handleKeyUp);
		};
	}, []);

	// Effect to manage the obstacle spawning timer with improved cleanup
	useEffect(() => {
		// Clear any existing timer
		if (obstacleTimerRef.current) {
			clearTimeout(obstacleTimerRef.current);
			obstacleTimerRef.current = null;
		}

		if (!gameStarted || gameOver) return;

		const spawnAndScheduleNext = () => {
			// Check game state again when timeout fires
			if (!gameStateRef.current.gameStarted || gameStateRef.current.gameOver)
				return;

			const gameAreaWidth = gameAreaRef.current
				? gameAreaRef.current.offsetWidth
				: 500;
			const obstacleWidthPercent = (obstacleVisualSize / gameAreaWidth) * 100;
			const borderPercent = (MAP_BORDER_PX / gameAreaWidth) * 100;

			const rockImages = [rock1, rock2, rock4];

			const newObstacle = {
				id: Date.now() + Math.random(),
				x:
					borderPercent +
					Math.random() * (100 - 2 * borderPercent - obstacleWidthPercent),
				y: -5, // Start slightly above the visible area
				img: rockImages[Math.floor(Math.random() * rockImages.length)],
			};

			setObstacles((prev) => [...prev, newObstacle]);

			// Gradually decrease spawn interval as game progresses for increasing difficulty
			const progress = 1 - timeLeft / GAME_DURATION;
			const minDelay = (800 - 400 * progress) * 0.8;
			const maxDelay = (1500 - 700 * progress) * 0.8;
			const nextDelay = minDelay + Math.random() * (maxDelay - minDelay);

			obstacleTimerRef.current = setTimeout(spawnAndScheduleNext, nextDelay);
		};

		// Start obstacle spawning
		spawnAndScheduleNext();

		return () => {
			if (obstacleTimerRef.current) {
				clearTimeout(obstacleTimerRef.current);
				obstacleTimerRef.current = null;
			}
		};
	}, [gameStarted, gameOver, timeLeft]);

	// Function to start the game
	const startGame = () => {
		// Don't start if no attempts left
		if (attemptsLeft <= 0) return;

		console.log("Starting game...");
		setGameStarted(true);
		setGameOver(false);
		setScore(0);
		setTimeLeft(GAME_DURATION);
		setPlayerPosition(50);
		setObstacles([]);
		setBackgroundPosition(0);

		lastTimeRef.current = performance.now();

		// Clear any outstanding frame request before starting
		if (requestRef.current) cancelAnimationFrame(requestRef.current);
		requestRef.current = requestAnimationFrame(gameLoop);
	};

	// Effect for the game timer with improved score handling
	useEffect(() => {
		if (!gameStarted || gameOver) return;

		const timerInterval = setInterval(() => {
			setTimeLeft((prev) => {
				if (prev <= 1) {
					clearInterval(timerInterval);
					endGame(true, score + 1); // +1 because score is incremented after timer fires
					return 0;
				}

				// Increase score
				setScore((currentScore) => currentScore + 1);
				return prev - 1;
			});
		}, 1000);

		return () => clearInterval(timerInterval);
	}, [gameStarted, gameOver, endGame, score]);

	// Clean up all timers and animations on unmount
	useEffect(() => {
		return () => {
			if (requestRef.current) cancelAnimationFrame(requestRef.current);
			if (obstacleTimerRef.current) clearTimeout(obstacleTimerRef.current);
		};
	}, []);

	const handleBackToMenu = () => {
		const audio = new Audio(clickSound);
		audio.play();
		setTimeout(() => {
			triggerTransition("split_diagonal", 1200, () => navigate("/"));
		}, 250); // 250ms delay before starting overlay
	};

	return (
		<div className="game-container">
			<button className="back-button" onClick={handleBackToMenu}>
				Back to Menu
			</button>
			<div className="game-stats">
				<div className="stat-item">Score: {score}</div>
				<div className="stat-item">Time: {timeLeft}s</div>
				<div className="stat-item">Attempts: {attemptsLeft}</div>
				<div className="stat-item">
					High Score: {gameOver ? Math.max(highestScore, score) : highestScore}
				</div>
			</div>
			<div
				ref={gameAreaRef}
				className="game-area"
				style={{ backgroundPositionY: `${backgroundPosition}px` }}>
				{/* Player with improved positioning */}
				<div
					className="character"
					facing={playerDirection}
					walking={playerMoving ? "true" : "false"}
					style={{
						left: `calc(${playerPosition}% - 48px)`,
						bottom: `${playerBottomOffsetPx}px`,
						width: `96px`,
						height: `96px`,
						position: "absolute",
						overflow: "hidden",
					}}>
					<div
						className="character_spritesheet"
						style={{
							width: "384px",
							height: "96px",
							backgroundImage: `url(${ucup2})`,
							backgroundRepeat: "no-repeat",
							backgroundPositionX: `-${playerFrame * 96}px`,
							backgroundPositionY:
								playerDirection === "left" ? "-120px" : "-216px",
							backgroundSize: "384px 384px",
						}}
					/>
				</div>
				{/* Obstacles with improved rendering */}
				{obstacles.map((obstacle) => (
					<div
						key={obstacle.id}
						className="obstacle"
						style={{
							width: `${obstacleVisualSize}px`,
							height: `${obstacleVisualSize}px`,
							left: `${obstacle.x}%`,
							top: `${obstacle.y}%`,
							backgroundImage: `url(${obstacle.img})`,
							backgroundSize: "cover",
							backgroundRepeat: "no-repeat",
							backgroundPosition: "center",
						}}
					/>
				))}
				{/* Game overlay (Start/End screens) */}
				{!gameStarted && (
					<div className="game-overlay">
						<div>
							<h2 className="game-title">
								{gameOver
									? attemptsLeft <= 0
										? "Game Over - No Attempts Left!"
										: timeLeft <= 0
										? "You Won!"
										: "Game Over!"
									: "Rock Climbing"}
							</h2>
							{gameOver && (
								<>
									<p className="game-score">Your score: {score}</p>
									<p className="game-score">
										Highest score: {Math.max(highestScore, score)}
									</p>
									<p className="game-score">
										Attempts remaining: {attemptsLeft}
									</p>
								</>
							)}
							<button
								className="game-button"
								onClick={startGame}
								disabled={attemptsLeft <= 0}
								style={{
									cursor: attemptsLeft <= 0 ? "default" : "pointer",
								}}>
								{gameOver
									? attemptsLeft <= 0
										? "No Attempts Left"
										: "Try Again"
									: "Start Game"}
							</button>
							{!gameOver && (
								<div className="game-instructions">
									<p>Use left and right arrow keys to move</p>
									<p>Avoid obstacles for 60 seconds to win!</p>
									<p>
										You have {attemptsLeft} attempts to achieve the highest
										score
									</p>
								</div>
							)}
						</div>
					</div>
				)}
			</div>
		</div>
	);
}
