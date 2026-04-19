import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import toast from "react-hot-toast";
import { MeetingProvider } from "@videosdk.live/react-sdk";
import axios from "axios";
import { v4 as uuidv4 } from "uuid";
import { useLocation, useParams } from "react-router-dom";
import MeetingView from "../components/MeetingView";
import "../styles/Meet.css";

const BACKEND_URL = import.meta.env.VITE_BACKEND_URL;
const TOKEN_REFRESH_INTERVAL = 23 * 60 * 60 * 1000;
const NETWORK_RETRIES = 3;

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

const withRetries = async (requestFn, retries = NETWORK_RETRIES, retryDelayMs = 800) => {
	for (let attempt = 1; attempt <= retries; attempt += 1) {
		try {
			return await requestFn();
		} catch (error) {
			if (attempt >= retries) throw error;
			await sleep(retryDelayMs);
		}
	}
	return null;
};

function JoinScreen({
	onJoinMeeting,
	initialMeetingId,
	isLoading,
	errorMessage,
	retryCount,
}) {
	const [meetingId, setMeetingId] = useState(initialMeetingId || "");
	const [name, setName] = useState("");

	useEffect(() => {
		setMeetingId(initialMeetingId || "");
	}, [initialMeetingId]);

	const handleJoin = async () => {
		const trimmedMeetingId = meetingId.trim();
		if (!trimmedMeetingId) {
			toast.error("Please enter a meeting ID or create one.");
			return;
		}
		await onJoinMeeting(trimmedMeetingId, name);
	};

	const handleCreate = async () => {
		await onJoinMeeting(null, name);
	};

	return (
		<div className="meet-shell">
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

					<h1 className="meet-join-title">
						{initialMeetingId ? "Join Meeting" : "Start a Meeting"}
					</h1>
					<p className="meet-join-subtitle">
						{errorMessage
							? `Could not initialize the meeting. ${retryCount > 0 ? `Attempts: ${retryCount}. ` : ""}Please try again.`
							: "Create a new meeting or join an existing one"}
					</p>

					{errorMessage && (
						<div
							style={{
								background: "rgba(239,68,68,0.12)",
								color: "#fca5a5",
								border: "1px solid rgba(239,68,68,0.25)",
								borderRadius: "10px",
								padding: "10px 12px",
								fontSize: "12px",
								marginBottom: "12px",
							}}
						>
							{errorMessage}
						</div>
					)}

					<input
						type="text"
						className="meet-join-input"
						placeholder="Your name (optional)"
						value={name}
						onChange={(e) => setName(e.target.value)}
						disabled={isLoading}
					/>

					<input
						type="text"
						className="meet-join-input"
						placeholder="Enter Meeting ID to join"
						value={meetingId}
						onChange={(e) => setMeetingId(e.target.value)}
						onKeyDown={(e) => {
							if (e.key === "Enter" && !isLoading) handleJoin();
						}}
						disabled={isLoading}
					/>

					<div className="meet-join-actions">
						<button
							className="meet-join-btn primary"
							onClick={handleCreate}
							disabled={isLoading}
							style={{ opacity: isLoading ? 0.7 : 1 }}
						>
							{isLoading ? "Starting..." : "New Meeting"}
						</button>
						<button
							className="meet-join-btn secondary"
							onClick={handleJoin}
							disabled={isLoading}
							style={{ opacity: isLoading ? 0.7 : 1 }}
						>
							{isLoading ? "Joining..." : initialMeetingId ? "Try Again" : "Join Meeting"}
						</button>
					</div>
				</div>
			</div>
		</div>
	);
}

const Meet = () => {
	const { meetingId: urlMeetingId } = useParams();
	const location = useLocation();
	const classroomId = useMemo(
		() => new URLSearchParams(location.search).get("classroomId"),
		[location.search]
	);
	const classroomCode = useMemo(
		() => new URLSearchParams(location.search).get("classroomCode"),
		[location.search]
	);

	const [meetingId, setMeetingId] = useState(null);
	const [token, setToken] = useState("");
	const [participantName, setParticipantName] = useState("");
	const [initStatus, setInitStatus] = useState(urlMeetingId ? "initializing" : "idle");
	const [initError, setInitError] = useState("");
	const [initAttempts, setInitAttempts] = useState(0);

	const tokenRefreshTimerRef = useRef(null);
	const hasScheduledRefreshRef = useRef(false);
	const isRefreshingTokenRef = useRef(false);
	const hasAutoJoinStartedRef = useRef(false);

	const clearTokenRefresh = useCallback(() => {
		if (tokenRefreshTimerRef.current) {
			clearInterval(tokenRefreshTimerRef.current);
			tokenRefreshTimerRef.current = null;
		}
		hasScheduledRefreshRef.current = false;
	}, []);

	useEffect(() => {
		document.body.classList.add("meet-page");
		return () => {
			document.body.classList.remove("meet-page");
			clearTokenRefresh();
		};
	}, [clearTokenRefresh]);

	const fetchFreshToken = useCallback(async () => {
		const response = await withRetries(() =>
			axios.get(`${BACKEND_URL}/meet/get-token`, { timeout: 10000 })
		);
		const fetchedToken = response?.data?.token;
		if (!fetchedToken) {
			throw new Error("Video SDK token was not returned by the server.");
		}
		return fetchedToken;
	}, []);

	const scheduleTokenRefresh = useCallback(() => {
		if (hasScheduledRefreshRef.current) return;
		hasScheduledRefreshRef.current = true;

		tokenRefreshTimerRef.current = setInterval(async () => {
			if (isRefreshingTokenRef.current) return;
			isRefreshingTokenRef.current = true;
			try {
				const refreshedToken = await fetchFreshToken();
				setToken(refreshedToken);
			} catch (error) {
				toast.error("Meeting token refresh failed. Please rejoin the meeting.");
			} finally {
				isRefreshingTokenRef.current = false;
			}
		}, TOKEN_REFRESH_INTERVAL);
	}, [fetchFreshToken]);

	const initializeMeeting = useCallback(
		async (requestedMeetingId, requestedName) => {
			setInitStatus("initializing");
			setInitError("");

			try {
				let resolvedMeetingId = requestedMeetingId?.trim();
				if (!resolvedMeetingId) {
					const roomResponse = await withRetries(() =>
						axios.post(`${BACKEND_URL}/meet/create-room`, {}, { timeout: 10000 })
					);
					resolvedMeetingId = roomResponse?.data?.roomId;
					if (!resolvedMeetingId) {
						throw new Error("Meeting room creation failed.");
					}
					const querySuffix = classroomId
						? `?classroomId=${encodeURIComponent(classroomId)}${classroomCode ? `&classroomCode=${encodeURIComponent(classroomCode)}` : ""}`
						: "";
					window.history.replaceState(null, "", `/meet/${resolvedMeetingId}${querySuffix}`);
				}

				const freshToken = await fetchFreshToken();
				setMeetingId(resolvedMeetingId);
				setToken(freshToken);
				setParticipantName(requestedName?.trim() || `Guest-${uuidv4().slice(0, 4)}`);
				setInitAttempts(0);
				setInitStatus("idle");
				scheduleTokenRefresh();
			} catch (error) {
				const message =
					error?.response?.data?.error ||
					error?.response?.data?.message ||
					error?.message ||
					"Failed to initialize meeting.";
				setMeetingId(null);
				setToken("");
				setInitStatus("failed");
				setInitAttempts((prev) => prev + 1);
				setInitError(message);
				toast.error(message);
			}
		},
		[classroomCode, classroomId, fetchFreshToken, scheduleTokenRefresh]
	);

	useEffect(() => {
		if (!urlMeetingId || hasAutoJoinStartedRef.current) return;
		hasAutoJoinStartedRef.current = true;
		initializeMeeting(urlMeetingId);
	}, [urlMeetingId, initializeMeeting]);

	const onMeetingLeave = useCallback(() => {
		clearTokenRefresh();
		setMeetingId(null);
		setToken("");
		setParticipantName("");
		setInitStatus("idle");
		setInitError("");
		setInitAttempts(0);
		hasAutoJoinStartedRef.current = false;
		window.history.replaceState(null, "", "/meet");
	}, [clearTokenRefresh]);

	if (initStatus === "initializing" && !token) {
		return (
			<div className="meet-shell">
				<div className="meet-join-loading">
					<div className="meet-join-loading-icon">📡</div>
					<h2>Initializing Meeting...</h2>
					<p>
						{urlMeetingId
							? `Connecting to ${urlMeetingId}`
							: "Preparing your meeting room"}
					</p>
				</div>
			</div>
		);
	}

	if (token && meetingId) {
		return (
			<div className="meet-shell">
				<MeetingProvider
					config={{
						meetingId,
						micEnabled: true,
						webcamEnabled: true,
						name: participantName,
					}}
					token={token}
				>
					<MeetingView
						meetingId={meetingId}
						onLeave={onMeetingLeave}
						classroomId={classroomId}
						classroomCode={classroomCode}
					/>
				</MeetingProvider>
			</div>
		);
	}

	return (
		<JoinScreen
			onJoinMeeting={initializeMeeting}
			initialMeetingId={urlMeetingId}
			isLoading={initStatus === "initializing"}
			errorMessage={initError}
			retryCount={initAttempts}
		/>
	);
};

export default Meet;
