import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import MainMenu from "./main-menu.jsx";
import ObstacleGame from "./App.jsx";
import {
	BrowserRouter as Router,
	Routes,
	Route,
	Navigate,
} from "react-router-dom";
import { TransitionProvider } from "./TransitionContext";

createRoot(document.getElementById("root")).render(
	<StrictMode>
		<TransitionProvider>
		<Router>
			<Routes>
					{/* Main menu route */}
				<Route path="/" element={<MainMenu />} />

					{/* Game route */}
				<Route path="/game" element={<ObstacleGame />} />

					{/* Catch all route - redirect to main menu */}
					<Route path="*" element={<Navigate to="/" replace />} />
			</Routes>
		</Router>
		</TransitionProvider>
	</StrictMode>
);
