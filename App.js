import React, { useEffect, useState, useRef } from "react";
import "./App.css";

/* ========== Word pool & paragraph generator ========== */
const WORD_POOL = [
  "the","quick","brown","fox","jumps","over","lazy","dog","time","waits","for","no","one",
  "and","moves","on","gentle","rain","fell","softly","ground","garden","full","fragrant",
  "blooming","flowers","child","laughed","bright","sunshine","they","traveled","together",
  "down","winding","road","innovation","drives","progress","remarkable","ways","coffee",
  "warmed","her","hands","cold","morning","ancient","tree","stood","tall","silent","train",
  "left","station","right","on","students","studied","quietly","under","library","roof",
  "river","cut","silver","line","through","valley","music","filled","room","joyful","noise",
  "she","wrote","letter","friend","distant","lighthouse","guided","ships","safely","home",
  "market","buzzing","colors","voices","they","planted","seeds","watered","them","daily",
  "artist","painted","scenes","everyday","life","new","technology","changes","people","connect",
  "he","promised","return","next","sunrise","ocean","covers","more","than","seventy","percent",
  "planet","surface","vital","role","regulating","climate","supporting","biodiversity",
  "providing","livelihoods","millions","people","beneath","surface","lies","world","wonder"
];

function generateParagraph(linesCount, minWords = 8, maxWords = 12) {
  const lines = [];
  for (let i = 0; i < linesCount; i++) {
    const wc = Math.floor(Math.random() * (maxWords - minWords + 1)) + minWords;
    const parts = [];
    for (let j = 0; j < wc; j++) {
      parts.push(WORD_POOL[Math.floor(Math.random() * WORD_POOL.length)]);
    }
    // Capitalize first word and add punctuation at end
    let line = parts.join(" ");
    line = line.charAt(0).toUpperCase() + line.slice(1) + ".";
    lines.push(line);
  }
  // join lines with newline to preserve visual lines
  return lines.join("\n");
}

/* ========== localStorage keys ========== */
const LS_USERS = "tm_users_v1"; // array of { username, password, totalPoints }

export default function App() {
  /* ---------- Auth state ---------- */
  const [users, setUsers] = useState(() => {
    const raw = localStorage.getItem(LS_USERS);
    return raw ? JSON.parse(raw) : [];
  });
  const [currentUser, setCurrentUser] = useState(null);

  const [authModeRegister, setAuthModeRegister] = useState(false);
  const [authName, setAuthName] = useState("");
  const [authPass, setAuthPass] = useState("");

  /* ---------- Game state ---------- */
  const [mode, setMode] = useState(""); // "easy" | "moderate" | "advanced"
  const [paragraph, setParagraph] = useState(""); // displayed text (may contain \n)
  const [words, setWords] = useState([]); // target words array (strip whitespace)
  const [typedWords, setTypedWords] = useState([]); // words user committed
  const [currentWordIndex, setCurrentWordIndex] = useState(0);
  const [input, setInput] = useState("");
  const [pointsSession, setPointsSession] = useState(0);

  // durations (seconds)
  const DURATIONS = { easy: 60, moderate: 180, advanced: 300 };
  const [duration, setDuration] = useState(DURATIONS.easy);
  const [timeLeft, setTimeLeft] = useState(0);
  const [isActive, setIsActive] = useState(false);
  const [isPaused, setIsPaused] = useState(false);

  const [isEditing, setIsEditing] = useState(false);
  const [editText, setEditText] = useState("");

  const inputRef = useRef(null);

  /* ---------- Persist users when changed ---------- */
  useEffect(() => {
    localStorage.setItem(LS_USERS, JSON.stringify(users));
  }, [users]);

  /* ---------- Timer effect ---------- */
  useEffect(() => {
    if (!isActive || isPaused) return;
    if (timeLeft <= 0) {
      endSession();
      return;
    }
    const t = setTimeout(() => setTimeLeft((s) => s - 1), 1000);
    return () => clearTimeout(t);
  }, [isActive, isPaused, timeLeft]);

  /* ---------- Auth handlers ---------- */
  function register() {
    const name = authName.trim();
    if (!name || !authPass) {
      alert("Enter username and password");
      return;
    }
    if (users.find((u) => u.username === name)) {
      alert("Username already exists");
      return;
    }
    const newUsers = [...users, { username: name, password: authPass, totalPoints: 0 }];
    setUsers(newUsers);
    setAuthModeRegister(false);
    setAuthName("");
    setAuthPass("");
    alert("Registered — you can now log in");
  }

  function login() {
    const name = authName.trim();
    if (!name || !authPass) {
      alert("Enter username and password");
      return;
    }
    const u = users.find((x) => x.username === name && x.password === authPass);
    if (!u) {
      alert("Invalid credentials");
      return;
    }
    setCurrentUser(u);
    setAuthName("");
    setAuthPass("");
  }

  function logout() {
    setCurrentUser(null);
    stopSession();
    setMode("");
  }

  /* ---------- Start/Stop/Pause/Edit ---------- */
  function startMode(selectedMode) {
    // prepare paragraph depending on mode
    let text = "";
    if (selectedMode === "easy") {
      // easy: combine a few short sentences, but simpler: generate 3 lines then join
      text = generateParagraph(3, 4, 8).replace(/\n/g, " ");
    } else if (selectedMode === "moderate") {
      // moderate: 15 lines
      text = generateParagraph(15, 6, 12);
    } else {
      // advanced: 20-25 lines random
      const lines = 20 + Math.floor(Math.random() * 6); // 20..25
      text = generateParagraph(lines, 8, 14);
    }

    const w = text.split(/\s+/).filter(Boolean);
    setMode(selectedMode);
    setParagraph(text);
    setWords(w);
    setTypedWords([]);
    setCurrentWordIndex(0);
    setInput("");
    setPointsSession(0);
    const dur = DURATIONS[selectedMode];
    setDuration(dur);
    setTimeLeft(dur);
    setIsActive(true);
    setIsPaused(false);
    setIsEditing(false);

    // focus input next tick
    setTimeout(() => inputRef.current?.focus(), 50);
  }

  function pauseToggle() {
    if (!isActive) return;
    setIsPaused((p) => !p);
  }

  function stopSession() {
    setIsActive(false);
    setIsPaused(false);
    setTimeLeft(0);
  }

  function endSession() {
    // add session points to user total and persist
    setIsActive(false);
    setIsPaused(false);
    if (!currentUser) return;
    const usersCopy = users.map((u) => {
      if (u.username === currentUser.username) {
        const updated = { ...u, totalPoints: (u.totalPoints || 0) + pointsSession };
        setCurrentUser(updated);
        return updated;
      }
      return u;
    });
    setUsers(usersCopy);
    alert(`Time's up! You earned ${pointsSession} points this session.`);
  }

  /* ---------- Edit paragraph ---------- */
  function openEditor() {
    // pause if running
    if (isActive && !isPaused) setIsPaused(true);
    setEditText(paragraph);
    setIsEditing(true);
  }

  function saveEdit() {
    const txt = editText.trim();
    if (!txt) {
      alert("Paragraph cannot be empty");
      return;
    }
    const w = txt.split(/\s+/).filter(Boolean);
    setParagraph(txt);
    setWords(w);
    setTypedWords([]);
    setCurrentWordIndex(0);
    setInput("");
    setPointsSession(0);
    setIsEditing(false);
    setIsPaused(false);
    setTimeLeft(duration); // reset to duration for this mode
    setTimeout(() => inputRef.current?.focus(), 50);
  }

  function cancelEdit() {
    setIsEditing(false);
    setEditText("");
    setIsPaused(false);
  }

  /* ---------- Typing handling ---------- */
  function handleInputChange(e) {
    if (!isActive || isPaused) return;
    const val = e.target.value;
    setInput(val);
    if (val.endsWith(" ")) {
      const typed = val.trim();
      commitWord(typed);
    }
  }

  function handleKeyDown(e) {
    // allow Enter to commit word as well
    if (e.key === "Enter") {
      e.preventDefault();
      const typed = input.trim();
      if (typed) commitWord(typed);
    }
  }

  function commitWord(typed) {
    if (!isActive) return;
    const idx = currentWordIndex;
    const target = words[idx] || "";
    setTypedWords((prev) => [...prev, typed]);
    setCurrentWordIndex(idx + 1);
    setInput("");
    if (typed === target) {
      setPointsSession((p) => p + 1);
    }
    // easy: when finishes paragraph, load another random easy paragraph (keeps going until time out)
    if (mode === "easy" && idx + 1 >= words.length) {
      const nextText = generateParagraph(3, 4, 8).replace(/\n/g, " ");
      const nextWords = nextText.split(/\s+/).filter(Boolean);
      setParagraph(nextText);
      setWords(nextWords);
      setTypedWords([]);
      setCurrentWordIndex(0);
      setInput("");
    }
  }

  /* ---------- Helpers for UI coloring ---------- */
  function typedWordClass(i) {
    const t = typedWords[i];
    const target = words[i];
    if (t === undefined) return "";
    return t === target ? "correct-word" : "wrong-word";
  }

  /* ---------- Derived values ---------- */
  const totalPoints = (currentUser && currentUser.totalPoints) ? currentUser.totalPoints : 0;

  /* ---------- AUTH VIEW ---------- */
  if (!currentUser) {
    return (
      <div className="login-register-container">
        <div className="auth-card">
          <h1 className="game-title">Typing Master</h1>
          <h2>{authModeRegister ? "Register" : "Login"}</h2>

          <input className="auth-input" placeholder="Username" value={authName} onChange={(e) => setAuthName(e.target.value)} />
          <input className="auth-input" placeholder="Password" type="password" value={authPass} onChange={(e) => setAuthPass(e.target.value)} />

          <div className="auth-actions">
            {authModeRegister ? (
              <>
                <button onClick={register}>Register</button>
                <button className="ghost" onClick={() => setAuthModeRegister(false)}>Have account? Login</button>
              </>
            ) : (
              <>
                <button onClick={login}>Login</button>
                <button className="ghost" onClick={() => setAuthModeRegister(true)}>Create account</button>
              </>
            )}
          </div>

          <small style={{ display: "block", marginTop: 8, color: "#ddd" }}>
            (Stored locally in your browser; not secure for production.)
          </small>
        </div>
      </div>
    );
  }

  /* ---------- GAME / HOME VIEW ---------- */
  return (
    <div className="app-container">
      <header className="header">
        <div className="left">
          <h1 className="game-title">Typing Master</h1>
        </div>
        <div className="right user-area">
          <div className="welcome">Hi, <strong>{currentUser.username}</strong></div>
          <div className="total-points">Total Points: <strong>{totalPoints}</strong></div>
          <button className="ghost" onClick={logout}>Logout</button>
        </div>
      </header>

      {!isActive ? (
        <main className="menu">
          <h2>Select Mode</h2>
          <div className="level-buttons">
            <button onClick={() => startModeAndStart("easy")}>Easy</button>
            <button onClick={() => startModeAndStart("moderate")}>Moderate</button>
            <button onClick={() => startModeAndStart("advanced")}>Advanced</button>
          </div>
          <p className="hint">Easy loads short sentences repeatedly. Moderate = 15 lines. Advanced = 20–25 lines.</p>
        </main>
      ) : null}

      {/* We separate rendering so the game area appears whether active or not after Start */}
      {isActive ? (
        <main className="game-area">
          <div className="hud">
            <div>Mode: <strong>{mode}</strong></div>
            <div>Time: <strong>{timeLeft}s</strong></div>
            <div>Session Points: <strong>{pointsSession}</strong></div>

            <div className="controls">
              <button onClick={pauseToggle}>{isPaused ? "Resume" : "Pause"}</button>
              <button onClick={openEditor}>Edit Paragraph</button>
              <button className="ghost" onClick={() => { stopSession(); }}>Stop</button>
            </div>
          </div>

          <div className="typing-grid">
            <section className="lhs paragraph-box">
              <h3>Paragraph</h3>
              <div className="paragraph-text">{paragraph}</div>
            </section>

            <section className="rhs typing-box">
              <h3>Your Typing</h3>
              <div className="typed-box" aria-live="polite">
                {typedWords.map((w, i) => (
                  <span key={i} className={`typed-word ${typedWordClass(i)}`}>{w} </span>
                ))}
                <span className="current-word">{input}</span>
              </div>

              <input
                ref={inputRef}
                className="type-input"
                value={input}
                onChange={handleInputChange}
                onKeyDown={handleKeyDown}
                placeholder={isPaused ? "Paused" : "Type here... (space or enter to submit)"}
                disabled={!isActive || isPaused || timeLeft <= 0}
                autoFocus
              />
            </section>
          </div>

          {/* Editor modal */}
          {isEditing && (
            <div className="editor-overlay" role="dialog" aria-modal="true">
              <div className="editor-card">
                <h3>Edit paragraph</h3>
                <textarea value={editText} onChange={(e) => setEditText(e.target.value)} />
                <div className="editor-actions">
                  <button onClick={saveEdit}>Save & Reset Progress</button>
                  <button className="ghost" onClick={() => setEditText(mode === "easy" ? generateParagraph(3,4,8).replace(/\n/g,' ') : mode === "moderate" ? generateParagraph(15,6,12) : generateParagraph(20 + Math.floor(Math.random()*6),8,14))}>Random</button>
                  <button className="ghost" onClick={cancelEdit}>Cancel</button>
                </div>
              </div>
            </div>
          )}
        </main>
      ) : null}
    </div>
  );

  /* helper to unify start button & also allow landing page start */
  function startModeAndStart(lvl) {
    startMode(lvl);
    startMode(lvl); // first call sets paragraph etc. but we want to ensure active true — startMode already sets active
  }

  /* startMode extracted for readability (keeps single responsibility) */
  function startMode(selectedMode) {
    let text = "";
    if (selectedMode === "easy") {
      text = generateParagraph(3, 4, 8).replace(/\n/g, " ");
    } else if (selectedMode === "moderate") {
      text = generateParagraph(15, 6, 12);
    } else {
      const lines = 20 + Math.floor(Math.random() * 6); // 20..25
      text = generateParagraph(lines, 8, 14);
    }
    const w = text.split(/\s+/).filter(Boolean);
    setMode(selectedMode);
    setParagraph(text);
    setWords(w);
    setTypedWords([]);
    setCurrentWordIndex(0);
    setInput("");
    setPointsSession(0);
    const dur = DURATIONS[selectedMode];
    setDuration(dur);
    setTimeLeft(dur);
    setIsActive(true);
    setIsPaused(false);
    setIsEditing(false);
    setTimeout(() => inputRef.current?.focus(), 50);
  }
}
