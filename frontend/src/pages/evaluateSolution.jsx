import React, { useState, useEffect } from "react";
import { Container, Card, Form, Button, Alert, Spinner, Row, Col, Badge, ProgressBar } from "react-bootstrap";
import toast from 'react-hot-toast';
import axios from "axios";
import JSON5 from "json5";
import { useNavigate } from "react-router-dom";
import { getUser, getToken } from "../utils/auth";

const EvaluateSolution = () => {
    const navigate = useNavigate();
    const [modelFile, setModelFile] = useState(null);
    const [studentFile, setStudentFile] = useState(null);
    const [loading, setLoading] = useState(false);
    const [revealing, setRevealing] = useState(false);
    const [displayedText, setDisplayedText] = useState("");
    const [result, setResult] = useState(null);
    const [parsingStatus, setParsingStatus] = useState(null); // 'clean' | 'json5' | 'sanitized' | 'sanitized-json5' | 'raw'
    const [error, setError] = useState("");
    const BACKEND_URL = import.meta.env.VITE_BACKEND_URL;
    const token = getToken();

    useEffect(() => {
        const user = getUser();
        if (user?.role && user.role !== 'teacher') {
            toast.error('AI Checker is for teachers only');
            navigate('/');
        }
    }, [navigate]);

    // Format result into a human-friendly multi-line string (no JSON brackets/commas)
    const formatResult = (data, indent = 0) => {
        const pad = (n = 0) => " ".repeat(n);

        const prettyKey = (k) => {
            if (!k) return "";
            return String(k)
                .replace(/[_-]/g, " ")
                .replace(/\b\w/g, (c) => c.toUpperCase());
        };

        // (removed automatic summary header to avoid duplicated/awkward summary lines)

        // primitives
        if (data === null) return "None";
        if (data === undefined) return "(no value)";
        if (typeof data === "string") return data;
        if (typeof data === "number" || typeof data === "boolean") return String(data);

        // arrays -> numbered list or inline simple list when short
        if (Array.isArray(data)) {
            if (data.length === 0) return "(empty list)";
            // if primitive array, show numbered list
            const primitives = data.every((i) => i == null || typeof i !== 'object');
            if (primitives) {
                return data.map((item, i) => `${pad(indent)}${i + 1}) ${String(item)}`).join('\n');
            }
            // array of objects -> header + items
            return data
                .map((item, i) => `${pad(indent)}${i + 1})\n${formatResult(item, indent + 4)}`)
                .join('\n\n');
        }

        // objects -> try to produce a summary header then key: value lines
        if (typeof data === 'object') {
            const keys = Object.keys(data);
            if (keys.length === 0) return "(empty)";

            const lines = [];

            for (const key of keys) {
                const val = data[key];
                const title = prettyKey(key);
                if (val == null || typeof val === 'string' || typeof val === 'number' || typeof val === 'boolean') {
                    lines.push(`${pad(indent)}${title}: ${val === null ? 'None' : String(val)}`);
                } else if (Array.isArray(val)) {
                    lines.push(`${pad(indent)}${title}:`);
                    // include numbered list for array
                    const arrText = formatResult(val, indent + 4);
                    lines.push(arrText);
                } else {
                    lines.push(`${pad(indent)}${title}:`);
                    lines.push(formatResult(val, indent + 4));
                }
            }

            return lines.join('\n');
        }

        return String(data);
    };

    // Try to clean up common JSON issues sent by backend so frontend can parse it:
    // - wrap bare fractions like 7/25 into strings: "7/25"
    // - remove trailing commas
    // - normalize single quotes to double quotes (basic)
    const sanitizeJSONString = (raw) => {
        if (typeof raw !== 'string') return raw;
        let s = raw;
        try {
            // Remove markdown code fences like ```json or ```
            s = s.replace(/```[a-zA-Z]*\s*/g, '');
            s = s.replace(/\s*```/g, '');

            // If there's extra surrounding text, try to extract the first JSON object/array block
            const firstBrace = s.indexOf('{');
            const firstBracket = s.indexOf('[');
            let start = -1;
            if (firstBrace !== -1 && (firstBracket === -1 || firstBrace < firstBracket)) start = firstBrace;
            else if (firstBracket !== -1) start = firstBracket;

            if (start !== -1) {
                // find last matching closing brace/bracket by simple search for last '}' or ']'
                const lastBrace = s.lastIndexOf('}');
                const lastBracket = s.lastIndexOf(']');
                let end = Math.max(lastBrace, lastBracket);
                if (end > start) {
                    s = s.slice(start, end + 1);
                }
            }

            // Collapse newlines to spaces to make regex replacements safer
            s = s.replace(/\r?\n/g, ' ');

            // Remove trailing commas before } or ]
            s = s.replace(/,\s*(?=[}\]])/g, '');

            // Wrap unquoted fraction values after a colon:   : 7/25  => : "7/25"
            s = s.replace(/:\s*([0-9]+)\s*\/\s*([0-9]+)(?=\s*[,}\]])/g, ': "$1/$2"');

            // Also wrap unquoted fraction tokens inside arrays: [ 7/25, ... ]
            s = s.replace(/(\[|,\s*)([0-9]+)\s*\/\s*([0-9]+)(?=\s*(,|\]))/g, '$1"$2/$3"');

            // If there are single-quoted strings, convert them to double quotes (simple cases)
            s = s.replace(/'([^']*)'/g, '"$1"');

            return s;
        } catch (e) {
            return raw;
        }
    };

    // Conservative extractor for completely raw text when JSON parsing fails.
    // Looks for overall marks like '7/25' or 'marks: 7/25' and per-question lines like
    // 'marks Of This Question : 3/5' or 'marks: 3/5' following a question number.
    const extractFromRawText = (raw) => {
        if (!raw || typeof raw !== 'string') return null;
        const text = raw.replace(/\r?\n/g, '\n');

        const overallMatch = text.match(/(?:\bmarks\b[^\d\n:/]*|\btotal\b[^\d\n:/]*|\bscore\b[^\d\n:/]*)?(\d+\s*\/\s*\d+)/i);
        const overall = overallMatch ? overallMatch[1].replace(/\s+/g, '') : null;

        // per-question: find sequences like 'question 1' ... 'marks ... 3/5'
        const perQuestion = [];
        // split into lines and search
        const lines = text.split('\n');
        for (let i = 0; i < lines.length; i++) {
            const line = lines[i];
            const qMatch = line.match(/question\s*(\d+)/i);
            if (qMatch) {
                const qNum = Number(qMatch[1]);
                // look ahead a few lines for marks
                let found = null;
                for (let j = i; j <= Math.min(i + 4, lines.length - 1); j++) {
                    const m = lines[j].match(/(marks?[^\d\n:/]*|marks\s+of\s+this\s+question[^\d\n:/]*)?(\d+\s*\/\s*\d+)/i);
                    if (m) {
                        found = m[2].replace(/\s+/g, '');
                        break;
                    }
                }
                if (found) perQuestion.push({ question: qNum, marks: found });
            } else {
                // also catch inline lines like 'marks Of This Question : 3/5' without explicit 'question N'
                const inline = line.match(/marks\s*(?:of\s*this\s*question)?\s*[:\-]?\s*(\d+\s*\/\s*\d+)/i);
                if (inline) {
                    perQuestion.push({ question: null, marks: inline[1].replace(/\s+/g, '') });
                }
            }
        }

        if (!overall && perQuestion.length === 0) return null;

        const result = { extracted: true };
        if (overall) result.marks = overall;
        if (perQuestion.length) result.perQuestion = perQuestion;
        return result;
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        setError("");
        setResult(null);
        setDisplayedText("");
        setRevealing(false);

        if (!modelFile || !studentFile) {
            setError("Please upload both files before submitting.");
            toast.error('Please upload both files before submitting.');
            return;
        }

        try {
            setLoading(true);

            const formData = new FormData();
            formData.append("model", modelFile);
            formData.append("student", studentFile);

            const response = await axios.post(
                `${BACKEND_URL}/tools/evaluate`,
                formData,
                {
                    headers: { Authorization: `Bearer ${token}` },
                }
            );

            let data = response.data;

            // ✅ Try to parse JSON safely (frontend parsing) with a sanitizer fallback
            let parsed;
            setParsingStatus(null);
            try {
                if (typeof data === "string") {
                    // 1) try strict parse
                    try {
                        parsed = JSON.parse(data);
                        setParsingStatus('clean');
                    } catch (e1) {
                        // 2) try lenient JSON5 parse
                        try {
                            parsed = JSON5.parse(data);
                            setParsingStatus('json5');
                        } catch (e2) {
                            // 3) sanitize then try strict
                            const san = sanitizeJSONString(data);
                            try {
                                parsed = JSON.parse(san);
                                setParsingStatus('sanitized');
                            } catch (e3) {
                                // 4) try JSON5 on sanitized
                                try {
                                    parsed = JSON5.parse(san);
                                    setParsingStatus('sanitized-json5');
                                } catch (e4) {
                                    throw e4;
                                }
                            }
                        }
                    }
                } else if (typeof data.result === "string") {
                    const raw = data.result;
                    try {
                        parsed = JSON.parse(raw);
                        setParsingStatus('clean');
                    } catch (e1) {
                        try {
                            parsed = JSON5.parse(raw);
                            setParsingStatus('json5');
                        } catch (e2) {
                            const san = sanitizeJSONString(raw);
                            try {
                                parsed = JSON.parse(san);
                                setParsingStatus('sanitized');
                            } catch (e3) {
                                try {
                                    parsed = JSON5.parse(san);
                                    setParsingStatus('sanitized-json5');
                                } catch (e4) {
                                    throw e4;
                                }
                            }
                        }
                    }
                } else {
                    parsed = data.result || data;
                    setParsingStatus('clean');
                }
            } catch (err) {
                console.warn("⚠️ Frontend JSON parsing failed, showing raw:", err.message);
                // try extracting useful info from the raw text
                const extracted = extractFromRawText(typeof data === 'string' ? data : (typeof data.result === 'string' ? data.result : String(data)));
                if (extracted) {
                    parsed = extracted;
                    setParsingStatus('raw');
                } else {
                    parsed = { raw: data, error: err.message };
                    setParsingStatus('raw');
                }
            }

            // ✅ Store parsed data and start slow reveal
            setResult(parsed);
            setRevealing(true);
        } catch (err) {
            console.error("❌ Evaluate error:", err?.response?.data || err.message);
            setError("Error evaluating the solutions. Please try again.");
            toast.error('Error evaluating the solutions. Please try again.');
        } finally {
            setLoading(false);
        }
    };

    const handleCopy = () => {
        if (result) {
            // Copy the nicely formatted string instead of raw JSON
            navigator.clipboard.writeText(formatResult(result));
            toast.success("✅ Result copied to clipboard!");
        }
    };

    const handleClear = () => {
        setResult(null);
        setDisplayedText("");
        setRevealing(false);
        setError("");
        setModelFile(null);
        setStudentFile(null);
    };

    const formatFileSize = (size) => {
        if (!size && size !== 0) return "";
        if (size < 1024) return `${size} B`;
        if (size < 1024 * 1024) return `${(size / 1024).toFixed(1)} KB`;
        return `${(size / (1024 * 1024)).toFixed(2)} MB`;
    };

    // Try to extract a simple summary (score/total/percentage/conclusion)
    const extractSummary = (data) => {
        if (!data) return null;

        // recursive search for keys or string patterns
        const findByKey = (obj, keys) => {
            if (obj == null) return null;
            if (typeof obj === 'string') return null;
            if (typeof obj !== 'object') return null;
            for (const k of Object.keys(obj)) {
                try {
                    if (keys.includes(k.toLowerCase())) return obj[k];
                } catch (e) { }
                const val = obj[k];
                const nested = findByKey(val, keys);
                if (nested !== null && nested !== undefined) return nested;
            }
            return null;
        };

        const findStringPattern = (obj, regex) => {
            if (obj == null) return null;
            if (typeof obj === 'string') {
                const m = obj.match(regex);
                if (m) return m;
                return null;
            }
            if (typeof obj === 'object') {
                if (Array.isArray(obj)) {
                    for (const item of obj) {
                        const found = findStringPattern(item, regex);
                        if (found) return found;
                    }
                } else {
                    for (const k of Object.keys(obj)) {
                        const found = findStringPattern(obj[k], regex);
                        if (found) return found;
                    }
                }
            }
            return null;
        };

        const summary = {};

        // first try explicit keys
        summary.score = findByKey(data, ['score', 'marks', 'mark', 'obtained']);
        summary.total = findByKey(data, ['total', 'outof', 'max', 'maximum', 'out_of', 'out of']);
        summary.percentage = findByKey(data, ['percentage', 'percent', '%']);
        summary.conclusion = findByKey(data, ['conclusion', 'final', 'result']);

        // If explicit keys not found, look for inline patterns like '6/10' or '6 out of 10'
        if ((!summary.score || !summary.total)) {
            const frac = findStringPattern(data, /(\d+(?:\.\d+)?)\s*(?:\/|out of|of)\s*(\d+(?:\.\d+)?)/i);
            if (frac) {
                // frac[1] = score, frac[2] = total
                summary.score = summary.score ?? Number(frac[1]);
                summary.total = summary.total ?? Number(frac[2]);
            }
        }

        // If still no percentage, look for percent pattern
        if (!summary.percentage) {
            const percentMatch = findStringPattern(data, /(\d+(?:\.\d+)?)\s*%/);
            if (percentMatch) summary.percentage = Number(percentMatch[1]);
        }

        // normalize numeric strings to numbers when possible
        try {
            if (summary.score !== null && summary.score !== undefined && summary.score !== '') {
                const s = Number(summary.score);
                if (!isNaN(s)) summary.score = s;
            }
            if (summary.total !== null && summary.total !== undefined && summary.total !== '') {
                const t = Number(summary.total);
                if (!isNaN(t)) summary.total = t;
            }
            if (summary.percentage !== null && summary.percentage !== undefined && summary.percentage !== '') {
                const p = Number(summary.percentage);
                if (!isNaN(p)) summary.percentage = p;
            }
        } catch (e) { }

        // compute percentage if possible
        if ((summary.percentage === null || summary.percentage === undefined) && typeof summary.score === 'number' && typeof summary.total === 'number' && summary.total > 0) {
            summary.computedPercentage = Math.round((summary.score / summary.total) * 100);
        }

        return summary;
    };

    // 🧠 Highlight lines: errors in red; important items (marks, numbers, totals, conclusion) in green
    const highlightMarks = (jsonText) => {
        if (!jsonText) return jsonText;

        const importantKeywords = [
            "marks",
            "mark",
            "score",
            "total",
            "result",
            "conclusion",
            "final",
            "percentage",
            "out of",
        ];

        const errorKeywords = ["error", "wrong", "failed", "something went wrong"];

        const lines = jsonText.split("\n");
        // find last non-empty line index for optional 'last sentence' highlighting
        let lastNonEmpty = -1;
        for (let i = lines.length - 1; i >= 0; i--) {
            if (lines[i].trim() !== "") {
                lastNonEmpty = i;
                break;
            }
        }

        return lines
            .map((line, idx) => {
                const lower = line.toLowerCase();

                // error lines -> red
                for (const kw of errorKeywords) {
                    if (lower.includes(kw)) {
                        return `<span style="color:red; font-weight:bold;">${line}</span>`;
                    }
                }

                // MARKS-specific highlighting: lines that explicitly mention marks or contain a fraction like 7/25
                const marksKeyword = /\bmarks?\b/i;
                const fractionPattern = /\b\d+\s*\/\s*\d+\b/;
                if (marksKeyword.test(line) || fractionPattern.test(line)) {
                    // prominent green pill-style highlight for marks
                    return `<span style="color:#0f5132; background:#d1e7dd; padding:4px 8px; border-radius:6px; font-weight:700;">${line}</span>`;
                }

                // other important lines -> subtle green
                const hasImportant = importantKeywords.some((kw) => lower.includes(kw));
                const hasNumber = /\d/.test(line);
                const isLastSentence = idx === lastNonEmpty && line.trim().length > 6; // treat last non-empty as potential conclusion

                if (hasImportant || hasNumber || isLastSentence) {
                    return `<span style="color:green; font-weight:bold;">${line}</span>`;
                }

                return line;
            })
            .join("\n");
    };

    // Recursively scan the result object/string to find any error-like message
    const findErrorMessage = (data) => {
        if (data == null) return null;
        if (typeof data === "string") {
            const lower = data.toLowerCase();
            if (lower.includes("error") || lower.includes("wrong") || lower.includes("failed") || lower.includes("something went wrong")) {
                return data;
            }
            return null;
        }
        if (typeof data === "boolean" || typeof data === "number") return null;
        if (Array.isArray(data)) {
            for (const item of data) {
                const found = findErrorMessage(item);
                if (found) return found;
            }
            return null;
        }
        if (typeof data === "object") {
            if (data.error) return data.error;
            for (const key of Object.keys(data)) {
                const found = findErrorMessage(data[key]);
                if (found) return found;
            }
        }
        return null;
    };

    // 💭 Slowly reveal JSON lines (frontend animation)
    useEffect(() => {
        if (revealing && result) {
            const formatted = formatResult(result);
            const lines = formatted.split("\n");

            const revealLines = async () => {
                setDisplayedText("");
                for (let i = 0; i < lines.length; i++) {
                    setDisplayedText((prev) => prev + lines[i] + "\n");
                    await new Promise((resolve) => setTimeout(resolve, 40)); // typing delay
                }
                setRevealing(false);
            };

            revealLines();
        }
    }, [revealing, result]);

    return (
        <Container fluid style={{ padding: 24 }}>
            <Row className="justify-content-center">
                <Col xs={12} lg={10}>
                    <Card style={{ padding: 20, borderRadius: 12, boxShadow: "0 6px 24px rgba(0,0,0,0.06)" }}>
                        <Row>
                            {/* Left: Upload and controls */}
                            <Col xs={12} md={5} style={{ borderRight: "1px solid #e9ecef" }}>
                                <div className="d-flex align-items-center mb-4">
                                    <h4 style={{ margin: 5, color: "#0d6efd" }}>🧠 Evaluate Homework</h4>
                                    <small className="ms-2 text-muted">(Upload model & student PDFs)</small>
                                </div>

                                <Form onSubmit={handleSubmit}>
                                    <Form.Group controlId="modelFile" className="mb-4">
                                        <Form.Label className="fw-bold">Model Solution (Reference)</Form.Label>
                                        <Form.Control
                                            type="file"
                                            accept=".pdf"
                                            onChange={(e) => setModelFile(e.target.files[0])}
                                        />
                                        {modelFile && (
                                            <small className="text-muted">{modelFile.name} • {formatFileSize(modelFile.size)}</small>
                                        )}
                                    </Form.Group>

                                    <Form.Group controlId="studentFile" className="mb-4">
                                        <Form.Label className="fw-bold">Student Solution</Form.Label>
                                        <Form.Control
                                            type="file"
                                            accept=".pdf"
                                            onChange={(e) => setStudentFile(e.target.files[0])}
                                        />
                                        {studentFile && (
                                            <small className="text-muted">{studentFile.name} • {formatFileSize(studentFile.size)}</small>
                                        )}
                                    </Form.Group>

                                    {error && <Alert variant="danger">{error}</Alert>}

                                    <div className="d-flex gap-2">
                                        <Button type="submit" variant="primary" disabled={loading} className="flex-grow-1">
                                            {loading ? (
                                                <>
                                                    <Spinner animation="border" size="sm" className="me-2" />
                                                    Evaluating...
                                                </>
                                            ) : (
                                                "Submit for Evaluation"
                                            )}
                                        </Button>

                                        <Button variant="outline-secondary" onClick={handleClear} disabled={loading}>
                                            Clear
                                        </Button>
                                    </div>
                                </Form>
                            </Col>

                            {/* Right: Results */}
                            <Col xs={12} md={7} style={{ paddingLeft: 24 }}>
                                <div className="d-flex justify-content-between align-items-start mb-2">
                                    <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                                        <h5 style={{ margin: 0 }}>🧩 Result</h5>
                                        {parsingStatus && parsingStatus !== 'clean' && (
                                            <Badge bg={parsingStatus === 'raw' ? 'danger' : 'warning'}>
                                                {parsingStatus === 'json5' ? 'Lenient' : parsingStatus === 'sanitized' ? 'Sanitized' : parsingStatus === 'sanitized-json5' ? 'Sanitized+' : 'Raw'}
                                            </Badge>
                                        )}
                                    </div>
                                    <div className="d-flex gap-2">
                                        {result && (
                                            <Button size="sm" variant="outline-secondary" onClick={handleCopy} disabled={revealing}>
                                                Copy Result
                                            </Button>
                                        )}
                                    </div>
                                </div>

                                {loading && (
                                    <div className="text-center p-4">
                                        <Spinner animation="border" variant="primary" />
                                        <p className="mt-2 text-muted">Analyzing responses... Please wait.</p>
                                    </div>
                                )}

                                {/* Show a prominent error alert if result contains error-like text */}
                                {result && (() => {
                                    const errMsg = findErrorMessage(result);
                                    if (errMsg) {
                                        return (
                                            <Alert variant="danger" className="mt-3">
                                                <strong>Evaluation error:</strong> {errMsg}
                                            </Alert>
                                        );
                                    }
                                    return null;
                                })()}

                                {/* Summary badge and progress (if available) */}
                                {result && (() => {
                                    const summary = extractSummary(result);
                                    if (!summary) return null;
                                    let score = summary.score ?? null;
                                    let total = summary.total ?? null;
                                    let pct = summary.percentage ?? summary.computedPercentage ?? null;

                                    // If score already contains a fraction like '6/10', don't duplicate total
                                    const scoreStr = score !== null && score !== undefined ? String(score) : null;
                                    const hasFraction = scoreStr && /\d+\s*\/\s*\d+/.test(scoreStr);

                                    // Normalize numeric strings
                                    if (!hasFraction && scoreStr && /^\d+(?:\.\d+)?$/.test(scoreStr)) {
                                        score = Number(scoreStr);
                                    }
                                    if (total !== null && total !== undefined) {
                                        const totalStr = String(total);
                                        if (/^\d+(?:\.\d+)?$/.test(totalStr)) total = Number(totalStr);
                                    }

                                    // Normalize percentage: if fraction between 0 and 1, convert to percent
                                    if (pct !== null && pct !== undefined) {
                                        const pctNum = Number(pct);
                                        if (!isNaN(pctNum)) {
                                            if (pctNum > 0 && pctNum <= 1) {
                                                pct = Math.round(pctNum * 100);
                                            } else {
                                                pct = Math.round(pctNum);
                                            }
                                        } else {
                                            pct = null;
                                        }
                                    }

                                    // Build display strings
                                    let displayScore = '';
                                    if (hasFraction) displayScore = scoreStr;
                                    else if (typeof score === 'number') displayScore = String(score);
                                    else if (score !== null && score !== undefined) displayScore = String(score);

                                    let displayTotal = '';
                                    if (!hasFraction && (total !== null && total !== undefined)) displayTotal = String(total);

                                    const pctToShow = pct !== null && pct !== undefined ? pct : null;

                                    return (
                                        <div className="mb-3">
                                            <div className="d-flex align-items-center gap-3">
                                                <Badge bg="success" pill style={{ fontSize: 16 }}>
                                                    {displayScore || '-'}{displayTotal ? ` / ${displayTotal}` : ''}
                                                </Badge>

                                                {pctToShow !== null && (
                                                    <div style={{ width: 180 }}>
                                                        <ProgressBar now={Number(pctToShow)} label={`${pctToShow}%`} />
                                                    </div>
                                                )}
                                            </div>
                                        </div>
                                    );
                                })()}

                                {result && (
                                    <div style={{ maxHeight: 520, overflowY: 'auto' }}>
                                        <pre style={{
                                            backgroundColor: '#f8f9fa',
                                            padding: 18,
                                            borderRadius: 8,
                                            fontSize: '0.95rem',
                                            whiteSpace: 'pre-wrap',
                                            wordWrap: 'break-word',
                                            border: '1px solid #e9ecef'
                                        }} dangerouslySetInnerHTML={{ __html: highlightMarks(displayedText) }} />
                                    </div>
                                )}
                            </Col>
                        </Row>
                    </Card>
                </Col>
            </Row>
        </Container>
    );
};

export default EvaluateSolution;