import React, { useEffect, useState } from "react";
import toast from "react-hot-toast";
import { MeetingProvider } from "@videosdk.live/react-sdk";
import axios from "axios";
import { v4 as uuidv4 } from "uuid";
import { useParams } from "react-router-dom";
import MeetingView from "../components/MeetingView";
import "../styles/Meet.css";
import { useLocation } from "react-router-dom";

const BACKEND_URL = import.meta.env.VITE_BACKEND_URL;

// ─── Join Screen ───
function JoinScreen({ getMeetingAndToken, initialMeetingId }) {
	const [meetingId, setMeetingId] = useState(initialMeetingId || "");
	const [name, setName] = useState("");

	// Auto-join if URL has a meetingId
	useEffect(() => {
		if (initialMeetingId) {
			getMeetingAndToken(initialMeetingId);
		}
	}, []);

	const handleJoin = async () => {
		if (!meetingId) {
			toast.error("Please enter a meeting ID or create one.");
			return;
		}
		await getMeetingAndToken(meetingId, name);
	};

	const handleCreate = async () => {
		await getMeetingAndToken(null, name);
	};

	const handleKeyDown = (e) => {
		if (e.key === "Enter") handleJoin();
	};

	// Auto-joining from URL — show loading
	if (initialMeetingId) {
		return (
			<div className="meet-join-loading">
				<div className="meet-join-loading-icon">📡</div>
				<h2>Joining Meeting...</h2>
				<p>
					Connecting to <strong>{initialMeetingId}</strong>
				</p>
			</div>
		);
	}

	return (
		<div className="meet-join-wrapper">
			<div className="meet-join-card">
				<div className="meet-join-icon">
					<svg
						width="32"
						height="32"
						viewBox="0 0 24 24"
						fill="none"
						stroke="#fff"
						strokeWidth="2"
						strokeLinecap="round"
						strokeLinejoin="round"
					>
						<polygon points="23 7 16 12 23 17 23 7" />
						<rect x="1" y="5" width="15" height="14" rx="2" ry="2" />
					</svg>
				</div>

				<h1 className="meet-join-title">Start a Meeting</h1>
				<p className="meet-join-subtitle">
					Create a new meeting or join an existing one
				</p>

				<input
					type="text"
					className="meet-join-input"
					placeholder="Your name (optional)"
					value={name}
					onChange={(e) => setName(e.target.value)}
				/>

				<input
					type="text"
					className="meet-join-input"
					placeholder="Enter Meeting ID to join"
					value={meetingId}
					onChange={(e) => setMeetingId(e.target.value)}
					onKeyDown={handleKeyDown}
				/>

				<div className="meet-join-actions">
					<button className="meet-join-btn primary" onClick={handleCreate}>
						New Meeting
					</button>
					<button className="meet-join-btn secondary" onClick={handleJoin}>
						Join Meeting
					</button>
				</div>
			</div>
		</div>
	);
}

// ─── Main Meet Component ───
const Meet = () => {
	const { meetingId: urlMeetingId } = useParams();
	const location = useLocation();
	const [meetingId, setMeetingId] = useState(null);
	const [token, setToken] = useState("");
	const [participantName, setParticipantName] = useState("");
	const classroomId = new URLSearchParams(location.search).get('classroomId');

	// Dark background for the meet page
	useEffect(() => {
		document.body.classList.add("meet-page");
		return () => document.body.classList.remove("meet-page");
	}, []);

	const getMeetingAndToken = async (id, name) => {
		try {
			let newMeetingId;

			if (!id) {
				const res = await axios.post(BACKEND_URL + "/meet/create-room");
				newMeetingId = res.data.roomId;
				window.history.replaceState(null, "", `/meet/${newMeetingId}`);
			} else {
				newMeetingId = id;
			}

			setMeetingId(newMeetingId);
			setParticipantName(name || "Guest-" + uuidv4().slice(0, 4));

			const tokenRes = await axios.get(BACKEND_URL + "/meet/get-token");
			console.log("✅ Got fresh VideoSDK token from backend");
			setToken(tokenRes.data.token);
		} catch (err) {
			console.error(
				"❌ Error creating or joining meeting:",
				err?.response?.data || err.message
			);
			toast.error("Something went wrong while joining the meeting.");
		}
	};

	const onMeetingLeave = () => {
		setMeetingId(null);
		setToken("");
		window.history.replaceState(null, "", "/meet");
	};

	return token && meetingId ? (
		<MeetingProvider
			config={{
				meetingId,
				micEnabled: true,
				webcamEnabled: true,
				name: participantName,
			}}
			token={token}
		>
			<MeetingView meetingId={meetingId} onLeave={onMeetingLeave} classroomId={classroomId} />
		</MeetingProvider>
	) : (
		<JoinScreen
			getMeetingAndToken={getMeetingAndToken}
			initialMeetingId={urlMeetingId}
		/>
	);
};

export default Meet;
