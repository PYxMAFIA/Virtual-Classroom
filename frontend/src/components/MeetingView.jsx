import React, { useState, useRef, useEffect, useCallback } from "react";
import { useMeeting, usePubSub } from "@videosdk.live/react-sdk";
import Controls from "./Controls";
import ParticipantView from "./ParticipantView";
import axios from "axios";
import toast from "react-hot-toast";
import "../styles/Meet.css";
import { io } from "socket.io-client";
import { getToken, getUser } from "../utils/auth";

const SUMMARIZE_INTERVAL = 60000; // 60 seconds between summarization

function MeetingView({ meetingId, onLeave, classroomId }) {
	const [joined, setJoined] = useState(null);
	const currentUser = getUser();
	const [linkCopied, setLinkCopied] = useState(false);

	// AI Summarizer state
	const [summaries, setSummaries] = useState([]);
	const [isSummarizing, setIsSummarizing] = useState(false);
	const [isRecording, setIsRecording] = useState(false);
	const [aiPanelOpen, setAiPanelOpen] = useState(false);

	// Captions state
	const [captionsActive, setCaptionsActive] = useState(false);
	const [captionText, setCaptionText] = useState("");

	// Caption buffer for AI summarizer (accumulates all speech text)
	const captionBufferRef = useRef([]);
	const summarizeTimerRef = useRef(null);
	const quotaExhaustedRef = useRef(false); // prevent duplicate quota toasts

	const BACKEND_URL = import.meta.env.VITE_BACKEND_URL;

	const summaryEndRef = useRef(null);
	const recognitionRef = useRef(null);
	const socketRef = useRef(null);

	// Use a ref to track captions state for the onend closure
	const captionsActiveRef = useRef(false);
	useEffect(() => {
		captionsActiveRef.current = captionsActive;
	}, [captionsActive]);

	// Scroll to bottom of summaries
	useEffect(() => {
		if (summaryEndRef.current) {
			summaryEndRef.current.scrollIntoView({ behavior: "smooth" });
		}
	}, [summaries]);

	// ─── Speech Recognition for Captions ───
	useEffect(() => {
		if (captionsActive) {
			const SpeechRecognition =
				window.SpeechRecognition || window.webkitSpeechRecognition;
			if (!SpeechRecognition) {
				toast.error("Captions are not supported on this browser. Try Chrome.");
				setCaptionsActive(false);
				return;
			}
			const recognition = new SpeechRecognition();
			recognition.continuous = true;
			recognition.interimResults = true;
			recognition.lang = "en-US";

			recognition.onresult = (event) => {
				let interim = "";
				for (let i = event.resultIndex; i < event.results.length; i++) {
					if (event.results[i].isFinal) {
						const finalText = event.results[i][0].transcript;
						setCaptionText(finalText);

						// Add to caption buffer for AI summarizer
						captionBufferRef.current.push(finalText);

						// Send via socket for other participants
						if (classroomId && socketRef.current) {
							socketRef.current.emit('meet:caption', {
								classroomId,
								text: finalText,
								from: 'speech',
							});
						}
					} else {
						interim += event.results[i][0].transcript;
					}
				}
				if (interim) setCaptionText(interim);
			};

			recognition.onerror = (e) => {
				if (e.error === "not-allowed") {
					toast.error("Microphone access denied. Enable it in browser settings for captions.");
					setCaptionsActive(false);
				} else if (e.error === "aborted") {
					// Silently ignore
				} else if (e.error !== "no-speech") {
					console.error("Speech recognition error:", e.error);
				}
			};

			recognition.onend = () => {
				if (captionsActiveRef.current && recognitionRef.current) {
					setTimeout(() => {
						try { recognitionRef.current?.start(); } catch (_) { }
					}, 300);
				}
			};

			recognitionRef.current = recognition;
			setTimeout(() => {
				try {
					recognition.start();
				} catch (err) {
					console.error("Failed to start speech recognition:", err);
					toast.error("Could not start captions. Check microphone permissions.");
					setCaptionsActive(false);
				}
			}, 500);

			return () => {
				try { recognition.stop(); } catch (_) { }
				recognitionRef.current = null;
			};
		} else {
			setCaptionText("");
			if (recognitionRef.current) {
				try { recognitionRef.current.stop(); } catch (_) { }
				recognitionRef.current = null;
			}
		}
	}, [captionsActive]);

	// ─── Socket.io: captions broadcast ───
	useEffect(() => {
		if (!classroomId) return;
		const socket = io(BACKEND_URL, { transports: ["websocket"] });
		socketRef.current = socket;
		socket.emit('join:classroom', { classroomId });

		socket.on('meet:caption', (payload) => {
			if (payload?.classroomId !== classroomId) return;
			if (payload?.text) {
				setCaptionText(payload.text);
				// Also buffer captions from other participants
				captionBufferRef.current.push(payload.text);
			}
		});

		return () => {
			socket.emit('leave:classroom', { classroomId });
			socket.disconnect();
			socketRef.current = null;
		};
	}, [classroomId, BACKEND_URL]);

	// ─── AI Summarizer: Caption Buffer Approach ───
	// Instead of sending audio every 20s, we:
	// 1. Auto-start captions when AI summarizer starts
	// 2. Buffer all caption text locally
	// 3. Every 60s, send the accumulated text to Gemini for summarization
	// This reduces API calls from 3/min (audio) to 1/min (text)

	const summarizeBuffer = useCallback(async () => {
		const buffer = captionBufferRef.current.join(" ").trim();
		if (!buffer || buffer.length < 20) {
			// Not enough content to summarize
			return;
		}

		setIsSummarizing(true);
		try {
			const res = await axios.post(
				`${BACKEND_URL}/meet/summarize-text`,
				{ text: buffer },
				{ headers: { Authorization: `Bearer ${getToken()}` } }
			);

			if (res.data?.summary) {
				setSummaries((prev) => [...prev, res.data.summary.trim()]);
			}
			// Clear the buffer after successful summarization
			captionBufferRef.current = [];
		} catch (error) {
			const errMsg = error?.response?.data?.message || error?.response?.data?.error || error.message || '';
			const isQuota = errMsg.toLowerCase().includes('quota') || errMsg.toLowerCase().includes('rate') || errMsg.toLowerCase().includes('429') || errMsg.toLowerCase().includes('resource has been exhausted');
			if (isQuota) {
				if (!quotaExhaustedRef.current) {
					quotaExhaustedRef.current = true;
					toast.error('⚠️ Gemini API quota exhausted. Summaries paused.', { id: 'gemini-quota' });
				}
				// Stop the timer without calling summarizeBuffer again
				setIsRecording(false);
				if (summarizeTimerRef.current) {
					clearInterval(summarizeTimerRef.current);
					summarizeTimerRef.current = null;
				}
			} else {
				console.error("AI Summary error:", errMsg);
			}
		} finally {
			setIsSummarizing(false);
		}
	}, [BACKEND_URL]);

	const startAISummarizer = () => {
		// Auto-enable captions so we have text to summarize
		if (!captionsActive) {
			setCaptionsActive(true);
		}
		captionBufferRef.current = [];
		quotaExhaustedRef.current = false; // reset quota flag on fresh start
		setIsRecording(true);

		toast.success("AI Summarizer started! Summaries every 60 seconds.", { icon: "🧠", id: 'ai-start' });

		// Start interval to summarize every 60s
		summarizeTimerRef.current = setInterval(() => {
			if (!quotaExhaustedRef.current) {
				summarizeBuffer();
			}
		}, SUMMARIZE_INTERVAL);
	};

	const stopAISummarizer = () => {
		setIsRecording(false);
		if (summarizeTimerRef.current) {
			clearInterval(summarizeTimerRef.current);
			summarizeTimerRef.current = null;
		}
		// Do one final summarization of remaining buffer
		if (captionBufferRef.current.length > 0) {
			summarizeBuffer();
		}
	};

	// Manual summarize (button in caption overlay)
	const summarizeNow = async () => {
		const buffer = captionBufferRef.current.join(" ").trim();
		if (!buffer || buffer.length < 10) {
			// Fall back to server-side caption store
			if (classroomId) {
				setIsSummarizing(true);
				try {
					const res = await axios.post(
						BACKEND_URL + '/meet/summarize-captions',
						{ classroomId, clearAfter: false },
						{ headers: { Authorization: `Bearer ${getToken()}` } }
					);
					if (res.data?.summary) {
						setSummaries((prev) => [...prev, String(res.data.summary).trim()]);
						toast.success('Summary added!');
					} else {
						toast('No content to summarize yet. Keep talking!', { icon: '💬' });
					}
				} catch (err) {
					const errMsg = err?.response?.data?.message || err?.response?.data?.error || '';
					if (errMsg.toLowerCase().includes('quota') || errMsg.toLowerCase().includes('rate') || errMsg.toLowerCase().includes('429')) {
						toast.error('⚠️ Gemini API quota exhausted. Try again later.', { id: 'gemini-quota' });
					} else {
						toast.error(errMsg || 'Failed to summarize');
					}
				} finally {
					setIsSummarizing(false);
				}
			} else {
				toast('No captions to summarize yet. Keep talking!', { icon: '💬' });
			}
			return;
		}

		setIsSummarizing(true);
		try {
			const res = await axios.post(
				`${BACKEND_URL}/meet/summarize-text`,
				{ text: buffer },
				{ headers: { Authorization: `Bearer ${getToken()}` } }
			);
			if (res.data?.summary) {
				setSummaries((prev) => [...prev, res.data.summary.trim()]);
				captionBufferRef.current = [];
				toast.success('Summary added!');
			}
		} catch (error) {
			const errMsg = error?.response?.data?.message || error?.response?.data?.error || '';
			if (errMsg.toLowerCase().includes('quota') || errMsg.toLowerCase().includes('rate') || errMsg.toLowerCase().includes('429')) {
				toast.error('⚠️ Gemini API quota exhausted. Try again later.', { id: 'gemini-quota' });
			} else {
				toast.error(errMsg || 'Failed to summarize');
			}
		} finally {
			setIsSummarizing(false);
		}
	};

	// ─── Captions + AI Panel: both can be active simultaneously ───
	const handleToggleCaptions = () => {
		setCaptionsActive((prev) => !prev);
	};

	const handleToggleAiPanel = () => {
		setAiPanelOpen((prev) => !prev);
	};

	// ─── Auto-end meet when teacher leaves ───
	const endMeetForClassroom = async () => {
		if (!classroomId) return;
		try {
			await axios.post(
				`${BACKEND_URL}/meet/end-meet`,
				{ classroomId },
				{ headers: { Authorization: `Bearer ${getToken()}` } }
			);
			console.log('✅ Meet ended for classroom');
		} catch (err) {
			if (err?.response?.status !== 403) {
				console.error('Error ending meet:', err?.response?.data || err.message);
			}
		}
	};

	// ─── VideoSDK Hooks ───
	const { join, participants, localMicOn, localWebcamOn, toggleMic, toggleWebcam, leave } =
		useMeeting({
			onMeetingJoined: () => {
				console.log("✅ Joined meeting successfully");
				setJoined("JOINED");
			},
			onMeetingLeft: () => {
				console.log("🚪 Left meeting");
				stopAISummarizer();
				endMeetForClassroom();
				onLeave();
			},
		});

	const { publish } = usePubSub("focus-mode");

	// Copy link
	const copyMeetingLink = () => {
		const link = `${window.location.origin}/meet/${meetingId}`;
		navigator.clipboard
			.writeText(link)
			.then(() => {
				setLinkCopied(true);
				toast.success("Meeting link copied!");
				setTimeout(() => setLinkCopied(false), 3000);
			})
			.catch(() => toast.error("Failed to copy link"));
	};

	const joinMeeting = () => {
		setJoined("JOINING");
		join();
	};

	// Grid class based on participant count
	const pCount = participants ? participants.size : 0;
	const gridClass =
		pCount <= 1
			? "grid-1"
			: pCount === 2
				? "grid-2"
				: pCount <= 4
					? "grid-3-4"
					: pCount <= 6
						? "grid-5-6"
						: "grid-many";

	// ─── Not yet joined ───
	if (joined === "JOINING") {
		return (
			<div className="meet-join-loading">
				<div className="meet-join-loading-icon">📡</div>
				<h2>Joining meeting...</h2>
				<p>Connecting to {meetingId}</p>
			</div>
		);
	}

	if (joined !== "JOINED") {
		return (
			<div className="meet-join-loading">
				<div className="meet-join-loading-icon">🎥</div>
				<h2>Ready to join?</h2>
				<p>Meeting: {meetingId}</p>
				<button className="meet-join-btn primary" onClick={joinMeeting}>
					Join Meeting
				</button>
			</div>
		);
	}

	// ─── Meeting View ───
	return (
		<div className="meet-root">
			{/* Header */}
			<div className="meet-header">
				<div className="meet-header-left">
					<div className="meet-header-logo">
						<svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
							<polygon points="23 7 16 12 23 17 23 7" />
							<rect x="1" y="5" width="15" height="14" rx="2" ry="2" />
						</svg>
						Meet
					</div>
					<span className="meet-header-id">{meetingId}</span>
				</div>
				<div className="meet-header-right">
					<div className="meet-participant-count">
						<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
							<path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
							<circle cx="9" cy="7" r="4" />
							<path d="M23 21v-2a4 4 0 0 0-3-3.87" />
							<path d="M16 3.13a4 4 0 0 1 0 7.75" />
						</svg>
						{pCount}
					</div>
					<button
						className={`meet-copy-btn ${linkCopied ? "copied" : ""}`}
						onClick={copyMeetingLink}
					>
						{linkCopied ? (
							<>
								<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
									<polyline points="20 6 9 17 4 12" />
								</svg>
								<span>Copied!</span>
							</>
						) : (
							<>
								<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
									<rect x="9" y="9" width="13" height="13" rx="2" ry="2" />
									<path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1" />
								</svg>
								<span>Copy Link</span>
							</>
						)}
					</button>
				</div>
			</div>

			{/* Content: Grid + Side Panel */}
			<div className="meet-content">
				<div className={`meet-grid-area ${aiPanelOpen ? "panel-open" : ""}`}>
					<div className={`meet-video-grid ${gridClass}`}>
						{[...participants.keys()].map((pid) => (
							<ParticipantView key={pid} participantId={pid} />
						))}
					</div>
				</div>

				{/* AI Summarizer Side Panel */}
				<div className={`meet-side-panel ${aiPanelOpen ? "open" : ""}`}>
					<div className="meet-panel-inner">
						<div className="meet-panel-header">
							<div className="meet-panel-title">
								<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
									<circle cx="12" cy="12" r="3" />
									<path d="M12 1v4m0 14v4M4.22 4.22l2.83 2.83m9.9 9.9l2.83 2.83M1 12h4m14 0h4M4.22 19.78l2.83-2.83m9.9-9.9l2.83-2.83" />
								</svg>
								AI Summary
							</div>
							<button
								className="meet-panel-close"
								onClick={() => setAiPanelOpen(false)}
							>
								✕
							</button>
						</div>

						<div className="meet-panel-controls">
							{!isRecording ? (
								<button
									className="meet-panel-action-btn start"
									onClick={startAISummarizer}
								>
									<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
										<polygon points="5 3 19 12 5 21 5 3" />
									</svg>
									Start Auto-Summary
								</button>
							) : (
								<button
									className="meet-panel-action-btn stop"
									onClick={stopAISummarizer}
								>
									<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
										<rect x="6" y="6" width="12" height="12" />
									</svg>
									Stop Auto-Summary
								</button>
							)}

							{/* Manual summarize button */}
							<button
								className="meet-panel-action-btn start"
								onClick={summarizeNow}
								disabled={isSummarizing}
								style={{ marginTop: '8px', opacity: isSummarizing ? 0.6 : 1 }}
							>
								{isSummarizing ? '⏳ Summarizing...' : '📝 Summarize Now'}
							</button>
						</div>

						{isRecording && (
							<div className="meet-panel-status">
								<span className="pulse-dot" />
								{isSummarizing
									? "Generating summary..."
									: `Collecting speech (${captionBufferRef.current.length} segments)... Next summary in ~60s`
								}
							</div>
						)}

						<div className="meet-panel-body">
							{summaries.length > 0 ? (
								<>
									{summaries.map((s, i) => (
										<div className="meet-summary-item" key={i}>
											{s}
										</div>
									))}
									<div ref={summaryEndRef} />
								</>
							) : (
								<div className="meet-panel-empty">
									<span className="meet-panel-empty-icon">🧠</span>
									<p>
										Click &quot;Start Auto-Summary&quot; to get AI summaries
										every 60 seconds, or &quot;Summarize Now&quot; anytime.
									</p>
									<p style={{ fontSize: '12px', color: '#8b8fa3', marginTop: '8px' }}>
										Uses speech captions → fewer API calls → saves quota
									</p>
								</div>
							)}
						</div>
					</div>
				</div>
			</div>

			{/* Captions Overlay */}
			{captionsActive && (
				<div className="meet-captions">
					<div className="meet-captions-bubble">
						{captionText || (
							<span className="meet-captions-empty">
								Listening for speech...
							</span>
						)}
					</div>
				</div>
			)}

			{/* Bottom Control Bar */}
			<Controls
				micOn={localMicOn}
				webcamOn={localWebcamOn}
				captionsActive={captionsActive}
				aiPanelActive={aiPanelOpen}
				onToggleMic={() => toggleMic()}
				onToggleCam={() => toggleWebcam()}
				onToggleCaptions={handleToggleCaptions}
				onToggleAiPanel={handleToggleAiPanel}
				onLeave={() => leave()}
				onEndMeet={classroomId ? async () => {
					try {
						await axios.post(
							`${BACKEND_URL}/meet/end-meet`,
							{ classroomId },
							{ headers: { Authorization: `Bearer ${getToken()}` } }
						);
						toast.success("Meeting ended for everyone");
					} catch (err) {
						if (err?.response?.status === 403) {
							toast.error("Only the teacher or meet starter can end the meeting.");
							return;
						}
						toast.error("Failed to end meeting");
					}
					leave();
				} : null}
				classroomId={classroomId}
			/>
		</div>
	);
}

export default MeetingView;
