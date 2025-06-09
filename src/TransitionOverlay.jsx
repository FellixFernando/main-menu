import React from "react";
import "./easytransitions.css";

export default function TransitionOverlay({ type = "split_diagonal", show }) {
	return (
		<div
			className="easytransitions_transition"
			style={{
				pointerEvents: "none",
				zIndex: 9999,
				position: "fixed",
				inset: 0,
				display: show ? "block" : "none",
			}}>
			<div className={`easytransitions_transition__part-1 ${type}`}></div>
			<div className={`easytransitions_transition__part-2 ${type}`}></div>
			<div className={`easytransitions_transition__part-3 ${type}`}></div>
			<div className={`easytransitions_transition__part-4 ${type}`}></div>
			<div className={`easytransitions_transition__part-5 ${type}`}></div>
			<div className={`easytransitions_transition__part-6 ${type}`}></div>
			<div className={`easytransitions_transition__part-7 ${type}`}></div>
			<div className={`easytransitions_transition__part-8 ${type}`}></div>
		</div>
	);
}
