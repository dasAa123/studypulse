import { useState, useEffect, useRef } from "react";

// ─── DESIGN TOKENS ───────────────────────────────────────────────────────────
const C = {
  bg: "#0A0A14",
  surface: "#12121F",
  card: "#1A1A2E",
  cardHover: "#1E1E35",
  accent: "#6C63FF",
  accentLight: "#9D97FF",
  accentGlow: "rgba(108,99,255,0.15)",
  green: "#22D3A5",
  orange: "#FF8C42",
  red: "#FF5C7A",
  yellow: "#FFD166",
  pink: "#FF6EB4",
  text: "#EEE9FF",
  muted: "#7A75A0",
  border: "rgba(108,99,255,0.2)",
  navBg: "rgba(10,10,20,0.95)",
};

const subjectColors = {
  Math: "#6C63FF", Science: "#22D3A5", English: "#FF8C42",
  History: "#FF6EB4", Computer: "#38BDF8", Other: "#FFD166",
};

const urgencyColor = (d) => d <= 1 ? C.red : d <= 3 ? C.orange : d <= 7 ? C.yellow : C.green;
const daysLeft = (deadline) => Math.max(0, Math.ceil((new Date(deadline) - new Date()) / 86400000));

const GLOBAL_CSS = `
  @import url('https://fonts.googleapis.com/css2?family=Outfit:wght@400;500;600;700;800;900&family=Inter:wght@300;400;500;600&display=swap');
  *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }
  html, body, #root { height: 100%; background: ${C.bg}; }
  body { font-family: 'Inter', sans-serif; color: ${C.text}; overscroll-behavior: none; -webkit-tap-highlight-color: transparent; }
  ::-webkit-scrollbar { width: 3px; }
  ::-webkit-scrollbar-thumb { background: ${C.accent}; border-radius: 3px; }
  input, select, textarea { -webkit-appearance: none; appearance: none; }
  button { -webkit-tap-highlight-color: transparent; touch-action: manipulation; }
  @keyframes fadeUp { from { opacity:0; transform:translateY(16px); } to { opacity:1; transform:translateY(0); } }
  @keyframes fadeIn { from { opacity:0; } to { opacity:1; } }
  @keyframes slideDown { from { opacity:0; transform:translateY(-10px); } to { opacity:1; transform:translateY(0); } }
  @keyframes pulse { 0%,100%{transform:scale(1);} 50%{transform:scale(1.05);} }
  @keyframes shimmer { 0%{background-position:-200% 0;} 100%{background-position:200% 0;} }
  @keyframes badgePop { 0%{transform:scale(0.7);opacity:0;} 70%{transform:scale(1.15);} 100%{transform:scale(1);opacity:1;} }
`;

// ─── AI CALL ─────────────────────────────────────────────────────────────────
async function callClaude(prompt, system = "You are a helpful student productivity AI.") {
  try {
    const res = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        model: "claude-sonnet-4-6", max_tokens: 1000,
        system, messages: [{ role: "user", content: prompt }],
      }),
    });
    const data = await res.json();
    return data.content?.[0]?.text || "";
  } catch { return ""; }
}

// ─── NOTIFICATION SYSTEM ─────────────────────────────────────────────────────
function useNotifications() {
  const [permission, setPermission] = useState("default");
  const scheduledRef = useRef(new Set());

  useEffect(() => {
    if ("Notification" in window) setPermission(Notification.permission);
  }, []);

  const requestPermission = async () => {
    if (!("Notification" in window)) return false;
    const result = await Notification.requestPermission();
    setPermission(result);
    return result === "granted";
  };

  const scheduleNotification = (title, body, delayMs) => {
    const key = `${title}-${delayMs}`;
    if (scheduledRef.current.has(key)) return;
    scheduledRef.current.add(key);
    setTimeout(() => {
      if (Notification.permission === "granted") {
        new Notification(title, {
          body, icon: "https://api.dicebear.com/7.x/shapes/svg?seed=studypulse",
          badge: "https://api.dicebear.com/7.x/shapes/svg?seed=sp",
        });
      }
      scheduledRef.current.delete(key);
    }, delayMs);
  };

  const scheduleTaskReminders = (task) => {
    const days = daysLeft(task.deadline);
    if (days === 3) scheduleNotification("⚠️ Deadline in 3 days", `"${task.name}" is due soon. Start now!`, 5000);
    if (days === 1) scheduleNotification("🚨 Due Tomorrow!", `"${task.name}" is due tomorrow. Final push!`, 8000);
    if (days === 0) scheduleNotification("🔥 Due Today!", `"${task.name}" is due TODAY.`, 3000);
  };

  return { permission, requestPermission, scheduleNotification, scheduleTaskReminders };
}

// ─── TOAST ───────────────────────────────────────────────────────────────────
function Toast({ toasts, remove }) {
  return (
    <div style={{ position: "fixed", top: 16, left: "50%", transform: "translateX(-50%)", zIndex: 9999, display: "flex", flexDirection: "column", gap: 8, width: "calc(100% - 32px)", maxWidth: 420, pointerEvents: "none" }}>
      {toasts.map(t => (
        <div key={t.id} onClick={() => remove(t.id)} style={{
          background: t.type === "success" ? C.green : t.type === "error" ? C.red : C.card,
          color: t.type === "success" || t.type === "error" ? "#000" : C.text,
          padding: "12px 16px", borderRadius: 12, fontSize: 13, fontWeight: 500,
          boxShadow: "0 8px 32px rgba(0,0,0,0.4)", animation: "slideDown 0.3s ease",
          pointerEvents: "all", cursor: "pointer", border: `1px solid ${C.border}`,
        }}>
          {t.msg}
        </div>
      ))}
    </div>
  );
}

function useToast() {
  const [toasts, setToasts] = useState([]);
  const add = (msg, type = "info") => {
    const id = Date.now();
    setToasts(p => [...p, { id, msg, type }]);
    setTimeout(() => setToasts(p => p.filter(t => t.id !== id)), 3500);
  };
  const remove = (id) => setToasts(p => p.filter(t => t.id !== id));
  return { toasts, remove, success: m => add(m, "success"), error: m => add(m, "error"), info: m => add(m, "info") };
}

// ─── PRIMITIVES ──────────────────────────────────────────────────────────────
const Btn = ({ onClick, children, variant = "primary", disabled, full, small, style = {} }) => {
  const base = {
    border: "none", borderRadius: small ? 8 : 12, padding: small ? "8px 14px" : "12px 20px",
    fontFamily: "Inter", fontSize: small ? 12 : 14, fontWeight: 600,
    cursor: disabled ? "not-allowed" : "pointer", opacity: disabled ? 0.45 : 1,
    transition: "all 0.18s", width: full ? "100%" : "auto", display: "inline-flex",
    alignItems: "center", justifyContent: "center", gap: 6, whiteSpace: "nowrap",
    userSelect: "none", WebkitUserSelect: "none",
  };
  const v = {
    primary: { background: `linear-gradient(135deg, ${C.accent}, #8B7FFF)`, color: "#fff", boxShadow: `0 4px 20px ${C.accentGlow}` },
    ghost: { background: "transparent", color: C.accentLight, border: `1px solid ${C.border}` },
    danger: { background: "rgba(255,92,122,0.12)", color: C.red, border: "1px solid rgba(255,92,122,0.3)" },
    success: { background: "rgba(34,211,165,0.12)", color: C.green, border: "1px solid rgba(34,211,165,0.3)" },
    muted: { background: C.surface, color: C.muted, border: `1px solid ${C.border}` },
  };
  return <button onClick={onClick} disabled={disabled} style={{ ...base, ...v[variant], ...style }}>{children}</button>;
};

const Card = ({ children, style = {} }) => (
  <div style={{ background: C.card, border: `1px solid ${C.border}`, borderRadius: 18, padding: 18, ...style }}>
    {children}
  </div>
);

const Badge = ({ color, children, small }) => (
  <span style={{
    background: color + "20", color, border: `1px solid ${color}35`,
    borderRadius: 20, padding: small ? "2px 8px" : "3px 10px",
    fontSize: small ? 10 : 11, fontWeight: 700, letterSpacing: 0.4, whiteSpace: "nowrap",
  }}>{children}</span>
);

const Field = ({ label, value, onChange, type = "text", options, placeholder, min }) => (
  <div style={{ marginBottom: 14 }}>
    <label style={{ display: "block", fontSize: 11, color: C.muted, fontWeight: 600, textTransform: "uppercase", letterSpacing: 0.8, marginBottom: 5 }}>{label}</label>
    {options ? (
      <select value={value} onChange={e => onChange(e.target.value)} style={fieldStyle}>{options.map(o => <option key={o} value={o}>{o}</option>)}</select>
    ) : (
      <input type={type} value={value} onChange={e => onChange(e.target.value)} placeholder={placeholder} min={min} style={fieldStyle} />
    )}
  </div>
);

const fieldStyle = {
  width: "100%", background: C.surface, border: `1px solid ${C.border}`, borderRadius: 10,
  padding: "11px 13px", color: C.text, fontSize: 14, fontFamily: "Inter",
  outline: "none", WebkitAppearance: "none",
};

// ─── SECTION HEADER ──────────────────────────────────────────────────────────
const SectionHeader = ({ title, sub }) => (
  <div style={{ marginBottom: 18 }}>
    <p style={{ fontFamily: "Outfit", fontSize: 20, fontWeight: 800, letterSpacing: -0.3 }}>{title}</p>
    {sub && <p style={{ fontSize: 12, color: C.muted, marginTop: 3 }}>{sub}</p>}
  </div>
);

// ─── NOTIFICATION PERMISSION BANNER ──────────────────────────────────────────
function NotifBanner({ permission, onRequest }) {
  if (permission === "granted" || permission === "denied") return null;
  return (
    <div style={{
      background: `linear-gradient(135deg, ${C.accentGlow}, rgba(255,209,102,0.08))`,
      border: `1px solid ${C.border}`, borderRadius: 14, padding: "14px 16px",
      marginBottom: 16, display: "flex", alignItems: "center", gap: 12, animation: "fadeUp 0.4s ease",
    }}>
      <span style={{ fontSize: 24 }}>🔔</span>
      <div style={{ flex: 1 }}>
        <p style={{ fontSize: 13, fontWeight: 600 }}>Enable deadline reminders</p>
        <p style={{ fontSize: 11, color: C.muted, marginTop: 2 }}>Get notified before tasks are due</p>
      </div>
      <Btn onClick={onRequest} small>Enable</Btn>
    </div>
  );
}

// ─── ADD TASK ─────────────────────────────────────────────────────────────────
function AddTask({ onAdd, toast }) {
  const [open, setOpen] = useState(false);
  const [name, setName] = useState("");
  const [subject, setSubject] = useState("Math");
  const [deadline, setDeadline] = useState("");
  const [effort, setEffort] = useState("Medium");
  const [loading, setLoading] = useState(false);

  const today = new Date().toISOString().slice(0, 10);

  const submit = async () => {
    if (!name.trim() || !deadline) return;
    setLoading(true);
    const days = daysLeft(deadline);
    const numSteps = Math.max(1, Math.min(days, 6));
    let steps = [];
    try {
      const raw = await callClaude(
        `Task: "${name}", Subject: ${subject}, Due in: ${days} days, Effort: ${effort}. Break into ${numSteps} daily study steps with realistic time estimates. Return ONLY a JSON array: [{"day":1,"task":"...","minutes":30}]`,
        "Return ONLY valid JSON arrays. No markdown, no explanation, no preamble."
      );
      steps = JSON.parse(raw.replace(/```json|```/g, "").trim());
    } catch {
      steps = Array.from({ length: numSteps }, (_, i) => ({ day: i + 1, task: `Work on ${name} – part ${i + 1}`, minutes: 40 }));
    }
    onAdd({ id: Date.now(), name: name.trim(), subject, deadline, effort, steps, completed: false, stepsCompleted: [], createdAt: Date.now() });
    toast.success("✅ Study plan created!");
    setName(""); setDeadline(""); setLoading(false); setOpen(false);
  };

  return (
    <div style={{ marginBottom: 20 }}>
      {!open ? (
        <Btn onClick={() => setOpen(true)} full style={{ padding: "14px", fontSize: 15, borderRadius: 14 }}>
          + Add New Task
        </Btn>
      ) : (
        <Card style={{ animation: "fadeUp 0.25s ease" }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
            <p style={{ fontFamily: "Outfit", fontSize: 16, fontWeight: 700 }}>New Task</p>
            <Btn variant="ghost" small onClick={() => setOpen(false)}>✕</Btn>
          </div>
          <Field label="What do you need to do?" value={name} onChange={setName} placeholder="e.g. Write history essay on WW2" />
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
            <Field label="Subject" value={subject} onChange={setSubject} options={Object.keys(subjectColors)} />
            <Field label="Effort" value={effort} onChange={setEffort} options={["Small", "Medium", "Large"]} />
          </div>
          <Field label="Deadline" value={deadline} onChange={setDeadline} type="date" min={today} />
          <Btn onClick={submit} disabled={loading || !name.trim() || !deadline} full>
            {loading ? "🧠 AI Building Plan..." : "Generate Study Plan"}
          </Btn>
        </Card>
      )}
    </div>
  );
}

// ─── TASK CARD ────────────────────────────────────────────────────────────────
function TaskCard({ task, onDelete, onToggleStep, onComplete, toast }) {
  const [expanded, setExpanded] = useState(false);
  const [nudge, setNudge] = useState("");
  const [loadingNudge, setLoadingNudge] = useState(false);
  const days = daysLeft(task.deadline);
  const color = urgencyColor(days);
  const progress = task.steps.length ? (task.stepsCompleted.length / task.steps.length) * 100 : 0;

  const getMotivation = async () => {
    setLoadingNudge(true);
    const msg = await callClaude(
      `Student task: "${task.name}", due in ${days} days, ${Math.round(progress)}% done. Give a 2-sentence energizing nudge. Direct, real, not cheesy.`,
      "You are a no-nonsense student coach. Short, punchy, motivating."
    );
    setNudge(msg); setLoadingNudge(false);
  };

  return (
    <Card style={{ marginBottom: 12, animation: "fadeUp 0.3s ease", opacity: task.completed ? 0.55 : 1 }}>
      <div style={{ display: "flex", gap: 12 }}>
        <div style={{
          width: 4, borderRadius: 4, background: color, flexShrink: 0,
          minHeight: 60, alignSelf: "stretch",
        }} />
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ display: "flex", gap: 6, flexWrap: "wrap", marginBottom: 7 }}>
            <Badge color={subjectColors[task.subject] || C.accent}>{task.subject}</Badge>
            <Badge color={color}>{days === 0 ? "Due Today!" : `${days}d left`}</Badge>
          </div>
          <p style={{
            fontFamily: "Outfit", fontSize: 15, fontWeight: 700, marginBottom: 8,
            textDecoration: task.completed ? "line-through" : "none",
            overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap",
          }}>{task.name}</p>
          <div style={{ background: C.surface, borderRadius: 4, height: 5, marginBottom: 6 }}>
            <div style={{ width: `${progress}%`, height: "100%", background: `linear-gradient(90deg, ${C.accent}, ${color})`, borderRadius: 4, transition: "width 0.5s ease" }} />
          </div>
          <p style={{ fontSize: 11, color: C.muted }}>{task.stepsCompleted.length}/{task.steps.length} steps · {Math.round(progress)}%</p>
        </div>
        <div style={{ display: "flex", flexDirection: "column", gap: 6, flexShrink: 0 }}>
          <Btn variant="ghost" small onClick={() => setExpanded(!expanded)} style={{ padding: "8px 10px" }}>
            {expanded ? "▲" : "▼"}
          </Btn>
          <Btn variant="danger" small onClick={() => { onDelete(task.id); toast.info("Task removed"); }} style={{ padding: "8px 10px" }}>✕</Btn>
        </div>
      </div>

      {expanded && (
        <div style={{ marginTop: 16, borderTop: `1px solid ${C.border}`, paddingTop: 14, animation: "fadeIn 0.2s ease" }}>
          <p style={{ fontSize: 11, color: C.muted, fontWeight: 600, textTransform: "uppercase", letterSpacing: 0.8, marginBottom: 10 }}>Your Study Plan</p>
          {task.steps.map((step, i) => {
            const done = task.stepsCompleted.includes(i);
            return (
              <div key={i} onClick={() => onToggleStep(task.id, i)} style={{
                display: "flex", gap: 10, padding: "10px 12px", borderRadius: 10, marginBottom: 6,
                background: done ? "rgba(108,99,255,0.1)" : C.surface,
                border: `1px solid ${done ? C.accent + "40" : "transparent"}`,
                cursor: "pointer", transition: "all 0.2s", userSelect: "none",
              }}>
                <div style={{
                  width: 20, height: 20, borderRadius: "50%", border: `2px solid ${done ? C.accent : C.muted}`,
                  background: done ? C.accent : "transparent", flexShrink: 0,
                  display: "flex", alignItems: "center", justifyContent: "center", fontSize: 10, color: "#fff", marginTop: 1,
                }}>{done ? "✓" : ""}</div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <p style={{ fontSize: 13, lineHeight: 1.4, color: done ? C.muted : C.text, textDecoration: done ? "line-through" : "none" }}>
                    <span style={{ color: C.accent, fontWeight: 700 }}>Day {step.day}: </span>{step.task}
                  </p>
                  <p style={{ fontSize: 11, color: C.muted, marginTop: 3 }}>⏱ {step.minutes} min</p>
                </div>
              </div>
            );
          })}

          <div style={{ display: "flex", gap: 8, marginTop: 14, flexWrap: "wrap" }}>
            <Btn variant="ghost" small onClick={getMotivation} disabled={loadingNudge}>
              {loadingNudge ? "..." : "💬 Motivate Me"}
            </Btn>
            {!task.completed && progress === 100 && (
              <Btn variant="success" small onClick={() => { onComplete(task.id); toast.success("🎉 Task completed! Great work!"); }}>
                ✅ Mark Done
              </Btn>
            )}
          </div>
          {nudge && (
            <div style={{
              marginTop: 12, padding: 12, background: C.accentGlow, borderRadius: 10,
              border: `1px solid ${C.border}`, fontSize: 13, lineHeight: 1.6, color: C.accentLight,
              animation: "fadeIn 0.3s ease",
            }}>💡 {nudge}</div>
          )}
        </div>
      )}
    </Card>
  );
}

// ─── TASKS TAB ────────────────────────────────────────────────────────────────
function TasksTab({ tasks, notifPermission, onRequestNotif, onAdd, onDelete, onToggleStep, onComplete, toast }) {
  const sorted = [...tasks].sort((a, b) => !a.completed && b.completed ? -1 : a.completed && !b.completed ? 1 : daysLeft(a.deadline) - daysLeft(b.deadline));
  return (
    <div>
      <SectionHeader title="Your Tasks" sub={`${tasks.filter(t => !t.completed).length} active · ${tasks.filter(t => t.completed).length} done`} />
      <NotifBanner permission={notifPermission} onRequest={onRequestNotif} />
      <AddTask onAdd={onAdd} toast={toast} />
      {sorted.length === 0 && (
        <div style={{ textAlign: "center", padding: "52px 20px", color: C.muted }}>
          <div style={{ fontSize: 48, marginBottom: 12 }}>📚</div>
          <p style={{ fontFamily: "Outfit", fontSize: 17, fontWeight: 700, color: C.text }}>No tasks yet</p>
          <p style={{ fontSize: 13, marginTop: 6 }}>Add a task and get your AI study plan in seconds</p>
        </div>
      )}
      {sorted.map(t => (
        <TaskCard key={t.id} task={t} onDelete={onDelete} onToggleStep={onToggleStep} onComplete={onComplete} toast={toast} />
      ))}
    </div>
  );
}

// ─── FOCUS MODE ───────────────────────────────────────────────────────────────
function FocusTab({ tasks, toast }) {
  const [running, setRunning] = useState(false);
  const [secs, setSecs] = useState(25 * 60);
  const [isBreak, setIsBreak] = useState(false);
  const [cycles, setCycles] = useState(0);
  const [selectedId, setSelectedId] = useState("");
  const [goal, setGoal] = useState("");
  const [loadingGoal, setLoadingGoal] = useState(false);
  const ref = useRef(null);

  useEffect(() => {
    if (running) {
      ref.current = setInterval(() => setSecs(s => {
        if (s <= 1) {
          clearInterval(ref.current);
          const breaking = !isBreak;
          setIsBreak(breaking);
          setSecs(breaking ? 5 * 60 : 25 * 60);
          setRunning(false);
          if (!breaking) setCycles(c => c + 1);
          toast.info(breaking ? "⏸ Break time! Rest for 5 min." : "🎯 Break over. Back to focus!");
          return 0;
        }
        return s - 1;
      }), 1000);
    } else clearInterval(ref.current);
    return () => clearInterval(ref.current);
  }, [running, isBreak]);

  const getGoal = async () => {
    if (!selectedId) return;
    setLoadingGoal(true);
    const task = tasks.find(t => t.id === parseInt(selectedId));
    const g = await callClaude(
      `For a 25-min focus session on: "${task?.name}". Give ONE specific, actionable goal. 1 sentence, active voice, concrete output expected.`,
      "You are a focused study coach. Be specific and energizing. One sentence only."
    );
    setGoal(g); setLoadingGoal(false);
  };

  const min = String(Math.floor(secs / 60)).padStart(2, "0");
  const sec = String(secs % 60).padStart(2, "0");
  const total = isBreak ? 5 * 60 : 25 * 60;
  const pct = (secs / total) * 100;
  const r = 80; const circ = 2 * Math.PI * r;
  const active = tasks.filter(t => !t.completed);

  return (
    <div>
      <SectionHeader title="Focus Mode" sub="25-min Pomodoro sessions" />

      {!running && (
        <Card style={{ marginBottom: 16, animation: "fadeUp 0.3s ease" }}>
          <p style={{ fontSize: 12, color: C.muted, fontWeight: 600, textTransform: "uppercase", letterSpacing: 0.8, marginBottom: 10 }}>Session Setup</p>
          <div style={{ marginBottom: 12 }}>
            <label style={{ fontSize: 11, color: C.muted, fontWeight: 600, textTransform: "uppercase", letterSpacing: 0.8, display: "block", marginBottom: 5 }}>Focusing On</label>
            <select value={selectedId} onChange={e => setSelectedId(e.target.value)} style={fieldStyle}>
              <option value="">Pick a task...</option>
              {active.map(t => <option key={t.id} value={t.id}>{t.name}</option>)}
            </select>
          </div>
          <Btn variant="ghost" onClick={getGoal} disabled={!selectedId || loadingGoal} small>
            {loadingGoal ? "Setting goal..." : "🎯 Generate Session Goal"}
          </Btn>
          {goal && (
            <div style={{ marginTop: 10, padding: 12, background: C.accentGlow, borderRadius: 10, border: `1px solid ${C.border}`, fontSize: 13, color: C.accentLight, lineHeight: 1.5, animation: "fadeIn 0.3s ease" }}>
              🎯 {goal}
            </div>
          )}
        </Card>
      )}

      <Card style={{ textAlign: "center", padding: "32px 20px" }}>
        <div style={{ position: "relative", width: 200, height: 200, margin: "0 auto 24px" }}>
          <svg width="200" height="200" style={{ transform: "rotate(-90deg)" }}>
            <circle cx="100" cy="100" r={r} fill="none" stroke={C.surface} strokeWidth="10" />
            <circle cx="100" cy="100" r={r} fill="none"
              stroke={isBreak ? C.green : C.accent} strokeWidth="10" strokeLinecap="round"
              strokeDasharray={circ} strokeDashoffset={circ * (1 - pct / 100)}
              style={{ transition: "stroke-dashoffset 0.8s ease, stroke 0.5s" }} />
          </svg>
          <div style={{ position: "absolute", inset: 0, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center" }}>
            <p style={{ fontFamily: "Outfit", fontSize: 44, fontWeight: 900, lineHeight: 1, color: isBreak ? C.green : C.text }}>{min}:{sec}</p>
            <p style={{ fontSize: 12, color: C.muted, textTransform: "uppercase", letterSpacing: 1.5, marginTop: 4 }}>{isBreak ? "Break" : "Focus"}</p>
          </div>
        </div>

        {cycles > 0 && <p style={{ fontSize: 12, color: C.muted, marginBottom: 16 }}>🔥 {cycles} session{cycles > 1 ? "s" : ""} completed today</p>}

        <div style={{ display: "flex", gap: 10, justifyContent: "center" }}>
          <Btn onClick={() => setRunning(!running)} style={{ minWidth: 110 }}>
            {running ? "⏸ Pause" : "▶ Start"}
          </Btn>
          <Btn variant="ghost" onClick={() => { setRunning(false); setSecs(25 * 60); setIsBreak(false); }}>↺</Btn>
        </div>
      </Card>

      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10, marginTop: 16 }}>
        {[["Sessions", cycles, C.accent], ["Minutes", cycles * 25, C.green]].map(([l, v, c]) => (
          <Card key={l} style={{ textAlign: "center", padding: 16 }}>
            <p style={{ fontFamily: "Outfit", fontSize: 30, fontWeight: 900, color: c }}>{v}</p>
            <p style={{ fontSize: 11, color: C.muted }}>{l} Today</p>
          </Card>
        ))}
      </div>
    </div>
  );
}

// ─── FRIENDS SYSTEM ───────────────────────────────────────────────────────────
const DEMO_FRIENDS = [
  { id: 1, name: "Priya S.", avatar: "🧑🏽‍💻", status: "online", streak: 7, tasksThisWeek: 5, lastActive: "Now", badge: "🔥 On Fire" },
  { id: 2, name: "Raj M.", avatar: "👨🏾‍🎓", status: "studying", streak: 3, tasksThisWeek: 3, lastActive: "20m ago", badge: "📚 Studying" },
  { id: 3, name: "Aisha K.", avatar: "👩🏻‍🎓", status: "offline", streak: 12, tasksThisWeek: 8, lastActive: "2h ago", badge: "⭐ Top Scorer" },
];

function FriendsTab({ myTasks, toast }) {
  const [friends, setFriends] = useState(DEMO_FRIENDS);
  const [invite, setInvite] = useState("");
  const [showInvite, setShowInvite] = useState(false);
  const [reactions, setReactions] = useState({});
  const myCompleted = myTasks.filter(t => t.completed).length;
  const myStreak = 5;

  const sendReaction = (friendId, emoji) => {
    setReactions(r => ({ ...r, [`${friendId}-${emoji}`]: true }));
    toast.success(`${emoji} Reaction sent!`);
    setTimeout(() => setReactions(r => { const n = { ...r }; delete n[`${friendId}-${emoji}`]; return n; }), 2000);
  };

  const sendInvite = () => {
    if (!invite.trim()) return;
    toast.success(`📨 Invite sent to ${invite}!`);
    setInvite(""); setShowInvite(false);
  };

  const leaderboard = [
    { name: "You", tasks: myCompleted, streak: myStreak, me: true },
    ...friends.map(f => ({ name: f.name, tasks: f.tasksThisWeek, streak: f.streak })),
  ].sort((a, b) => b.tasks - a.tasks);

  return (
    <div>
      <SectionHeader title="Study Squad" sub="Stay accountable together" />

      {/* Leaderboard */}
      <Card style={{ marginBottom: 16 }}>
        <p style={{ fontSize: 13, fontWeight: 700, color: C.accentLight, marginBottom: 12 }}>📊 This Week's Leaderboard</p>
        {leaderboard.map((p, i) => (
          <div key={p.name} style={{
            display: "flex", alignItems: "center", gap: 12, padding: "10px 0",
            borderBottom: i < leaderboard.length - 1 ? `1px solid ${C.border}` : "none",
            background: p.me ? C.accentGlow : "transparent", borderRadius: p.me ? 10 : 0,
            paddingLeft: p.me ? 10 : 0, paddingRight: p.me ? 10 : 0,
          }}>
            <p style={{ fontFamily: "Outfit", fontSize: 18, fontWeight: 900, color: i === 0 ? C.yellow : i === 1 ? C.muted : C.muted, width: 28, textAlign: "center" }}>
              {i === 0 ? "🥇" : i === 1 ? "🥈" : i === 2 ? "🥉" : `${i + 1}`}
            </p>
            <div style={{ flex: 1 }}>
              <p style={{ fontSize: 13, fontWeight: 600 }}>{p.name}{p.me ? " (You)" : ""}</p>
              <p style={{ fontSize: 11, color: C.muted }}>🔥 {p.streak} day streak</p>
            </div>
            <Badge color={C.accent}>{p.tasks} tasks</Badge>
          </div>
        ))}
      </Card>

      {/* Friend cards */}
      <p style={{ fontSize: 12, color: C.muted, fontWeight: 600, textTransform: "uppercase", letterSpacing: 0.8, marginBottom: 10 }}>Your Friends</p>
      {friends.map(f => (
        <Card key={f.id} style={{ marginBottom: 10 }}>
          <div style={{ display: "flex", gap: 12, alignItems: "flex-start" }}>
            <div style={{ position: "relative" }}>
              <div style={{ width: 44, height: 44, borderRadius: "50%", background: C.surface, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 22 }}>
                {f.avatar}
              </div>
              <div style={{
                position: "absolute", bottom: 0, right: 0, width: 12, height: 12, borderRadius: "50%",
                background: f.status === "online" ? C.green : f.status === "studying" ? C.yellow : C.muted,
                border: `2px solid ${C.card}`,
              }} />
            </div>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 3 }}>
                <p style={{ fontSize: 14, fontWeight: 700 }}>{f.name}</p>
                <Badge color={f.status === "online" ? C.green : f.status === "studying" ? C.yellow : C.muted} small>
                  {f.status}
                </Badge>
              </div>
              <p style={{ fontSize: 11, color: C.muted }}>{f.badge} · Active {f.lastActive}</p>
              <div style={{ display: "flex", gap: 12, marginTop: 6 }}>
                <span style={{ fontSize: 11, color: C.muted }}>🔥 {f.streak}d streak</span>
                <span style={{ fontSize: 11, color: C.muted }}>✅ {f.tasksThisWeek} this week</span>
              </div>
            </div>
          </div>
          <div style={{ display: "flex", gap: 6, marginTop: 12 }}>
            {["👏", "🔥", "💪", "⭐"].map(e => (
              <button key={e} onClick={() => sendReaction(f.id, e)} style={{
                background: reactions[`${f.id}-${e}`] ? C.accentGlow : C.surface,
                border: `1px solid ${reactions[`${f.id}-${e}`] ? C.accent : C.border}`,
                borderRadius: 8, padding: "6px 10px", fontSize: 16, cursor: "pointer",
                transition: "all 0.2s", transform: reactions[`${f.id}-${e}`] ? "scale(1.2)" : "scale(1)",
              }}>{e}</button>
            ))}
          </div>
        </Card>
      ))}

      {/* Invite */}
      <div style={{ marginTop: 16 }}>
        {!showInvite ? (
          <Btn variant="ghost" full onClick={() => setShowInvite(true)}>+ Invite a Friend</Btn>
        ) : (
          <Card style={{ animation: "fadeUp 0.2s ease" }}>
            <p style={{ fontSize: 13, fontWeight: 600, marginBottom: 10 }}>Invite by email or username</p>
            <input value={invite} onChange={e => setInvite(e.target.value)} placeholder="friend@email.com"
              style={{ ...fieldStyle, marginBottom: 10 }} />
            <div style={{ display: "flex", gap: 8 }}>
              <Btn onClick={sendInvite} disabled={!invite.trim()} full>Send Invite 📨</Btn>
              <Btn variant="ghost" onClick={() => setShowInvite(false)} style={{ flexShrink: 0 }}>Cancel</Btn>
            </div>
          </Card>
        )}
      </div>
    </div>
  );
}

// ─── STATS TAB ────────────────────────────────────────────────────────────────
function StatsTab({ tasks }) {
  const total = tasks.length;
  const done = tasks.filter(t => t.completed).length;
  const active = tasks.filter(t => !t.completed);
  const urgent = active.filter(t => daysLeft(t.deadline) <= 2).length;
  const totalSteps = tasks.reduce((a, t) => a + t.steps.length, 0);
  const doneSteps = tasks.reduce((a, t) => a + t.stepsCompleted.length, 0);
  const pct = total ? Math.round((done / total) * 100) : 0;

  const bySubject = Object.keys(subjectColors).map(s => ({
    subject: s,
    count: tasks.filter(t => t.subject === s).length,
    done: tasks.filter(t => t.subject === s && t.completed).length,
  })).filter(x => x.count > 0);

  return (
    <div>
      <SectionHeader title="Your Progress" sub="Keep the momentum going" />

      {/* Big stat */}
      <Card style={{ marginBottom: 12, textAlign: "center", padding: "28px 20px", background: `linear-gradient(135deg, ${C.card}, ${C.accentGlow})` }}>
        <p style={{ fontFamily: "Outfit", fontSize: 64, fontWeight: 900, color: C.accent, lineHeight: 1 }}>{pct}%</p>
        <p style={{ fontSize: 13, color: C.muted, marginTop: 6 }}>Overall completion rate</p>
        <div style={{ background: C.surface, borderRadius: 6, height: 6, marginTop: 16 }}>
          <div style={{ width: `${pct}%`, height: "100%", background: `linear-gradient(90deg, ${C.accent}, ${C.accentLight})`, borderRadius: 6, transition: "width 0.6s ease" }} />
        </div>
      </Card>

      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10, marginBottom: 16 }}>
        {[
          ["Total", total, C.accent, "📋"],
          ["Done", done, C.green, "✅"],
          ["Urgent", urgent, C.red, "🚨"],
          ["Steps", `${doneSteps}/${totalSteps}`, C.yellow, "📝"],
        ].map(([l, v, c, e]) => (
          <Card key={l} style={{ textAlign: "center", padding: "16px 10px" }}>
            <p style={{ fontSize: 22, marginBottom: 4 }}>{e}</p>
            <p style={{ fontFamily: "Outfit", fontSize: 26, fontWeight: 900, color: c }}>{v}</p>
            <p style={{ fontSize: 11, color: C.muted }}>{l}</p>
          </Card>
        ))}
      </div>

      {/* By subject */}
      {bySubject.length > 0 && (
        <Card style={{ marginBottom: 12 }}>
          <p style={{ fontSize: 13, fontWeight: 700, color: C.accentLight, marginBottom: 12 }}>By Subject</p>
          {bySubject.map(({ subject, count, done }) => (
            <div key={subject} style={{ marginBottom: 10 }}>
              <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 5 }}>
                <span style={{ fontSize: 13, fontWeight: 600 }}>{subject}</span>
                <span style={{ fontSize: 11, color: C.muted }}>{done}/{count} done</span>
              </div>
              <div style={{ background: C.surface, borderRadius: 4, height: 5 }}>
                <div style={{ width: `${count ? (done / count) * 100 : 0}%`, height: "100%", background: subjectColors[subject], borderRadius: 4, transition: "width 0.5s" }} />
              </div>
            </div>
          ))}
        </Card>
      )}

      {/* Deadlines */}
      <Card>
        <p style={{ fontSize: 13, fontWeight: 700, color: C.accentLight, marginBottom: 12 }}>Upcoming Deadlines</p>
        {active.sort((a, b) => daysLeft(a.deadline) - daysLeft(b.deadline)).map(t => {
          const d = daysLeft(t.deadline);
          return (
            <div key={t.id} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "10px 0", borderBottom: `1px solid ${C.border}` }}>
              <div style={{ flex: 1, minWidth: 0, marginRight: 10 }}>
                <p style={{ fontSize: 13, fontWeight: 600, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{t.name}</p>
                <p style={{ fontSize: 11, color: C.muted }}>{t.subject}</p>
              </div>
              <Badge color={urgencyColor(d)}>{d === 0 ? "Today!" : `${d}d`}</Badge>
            </div>
          );
        })}
        {active.length === 0 && <p style={{ color: C.muted, fontSize: 13, textAlign: "center", padding: "16px 0" }}>🎉 No upcoming deadlines!</p>}
      </Card>
    </div>
  );
}

// ─── BOTTOM NAV ───────────────────────────────────────────────────────────────
function BottomNav({ tab, setTab, urgentCount, notifCount }) {
  const items = [
    { id: "tasks", icon: "📋", label: "Tasks", badge: urgentCount },
    { id: "focus", icon: "⏱", label: "Focus" },
    { id: "friends", icon: "👥", label: "Squad" },
    { id: "stats", icon: "📊", label: "Stats" },
  ];
  return (
    <nav style={{
      position: "fixed", bottom: 0, left: 0, right: 0,
      background: C.navBg, backdropFilter: "blur(20px)", WebkitBackdropFilter: "blur(20px)",
      borderTop: `1px solid ${C.border}`, display: "flex", zIndex: 100,
      paddingBottom: "env(safe-area-inset-bottom, 0px)",
    }}>
      {items.map(item => (
        <button key={item.id} onClick={() => setTab(item.id)} style={{
          flex: 1, padding: "10px 0 12px", background: "transparent", border: "none",
          display: "flex", flexDirection: "column", alignItems: "center", gap: 3,
          cursor: "pointer", position: "relative", WebkitTapHighlightColor: "transparent",
        }}>
          {item.badge > 0 && (
            <div style={{
              position: "absolute", top: 6, right: "calc(50% - 18px)",
              background: C.red, color: "#fff", borderRadius: "50%",
              width: 16, height: 16, fontSize: 9, fontWeight: 700,
              display: "flex", alignItems: "center", justifyContent: "center",
              animation: "badgePop 0.3s ease",
            }}>{item.badge}</div>
          )}
          <span style={{ fontSize: tab === item.id ? 22 : 20, transition: "all 0.2s", transform: tab === item.id ? "translateY(-2px)" : "none" }}>{item.icon}</span>
          <span style={{ fontSize: 10, fontWeight: tab === item.id ? 700 : 500, color: tab === item.id ? C.accent : C.muted, transition: "color 0.2s" }}>{item.label}</span>
          {tab === item.id && <div style={{ position: "absolute", bottom: 0, width: 20, height: 2, background: C.accent, borderRadius: 2 }} />}
        </button>
      ))}
    </nav>
  );
}

// ─── REMINDER SCHEDULER ──────────────────────────────────────────────────────
function useReminders(tasks, notif) {
  const scheduled = useRef(new Set());
  useEffect(() => {
    if (notif.permission !== "granted") return;
    tasks.filter(t => !t.completed).forEach(task => {
      const days = daysLeft(task.deadline);
      const key = `${task.id}-${days}`;
      if (!scheduled.current.has(key)) {
        scheduled.current.add(key);
        if (days <= 3 && days > 0) {
          notif.scheduleNotification(
            `⚠️ ${task.name}`,
            `Due in ${days} day${days > 1 ? "s" : ""}! Check your study plan.`,
            2000 + Math.random() * 3000
          );
        } else if (days === 0) {
          notif.scheduleNotification(`🔥 Due Today!`, `"${task.name}" is due today!`, 1500);
        }
      }
    });
  }, [tasks, notif.permission]);
}

// ─── MAIN APP ─────────────────────────────────────────────────────────────────
export default function StudyPulse() {
  const [tab, setTab] = useState("tasks");
  const [tasks, setTasks] = useState([
    {
      id: 1, name: "Math – Quadratic Equations", subject: "Math",
      deadline: new Date(Date.now() + 3 * 86400000).toISOString().slice(0, 10),
      effort: "Medium", completed: false, stepsCompleted: [0], createdAt: Date.now(),
      steps: [
        { day: 1, task: "Review quadratic formula and worked examples", minutes: 30 },
        { day: 2, task: "Solve problems 1–10 from textbook", minutes: 45 },
        { day: 3, task: "Check answers and fix mistakes", minutes: 25 },
      ],
    },
  ]);

  const toast = useToast();
  const notif = useNotifications();
  useReminders(tasks, notif);

  const addTask = (task) => setTasks(p => [task, ...p]);
  const deleteTask = (id) => setTasks(p => p.filter(t => t.id !== id));
  const toggleStep = (id, idx) => setTasks(p => p.map(t => {
    if (t.id !== id) return t;
    const sc = t.stepsCompleted.includes(idx) ? t.stepsCompleted.filter(i => i !== idx) : [...t.stepsCompleted, idx];
    return { ...t, stepsCompleted: sc };
  }));
  const completeTask = (id) => setTasks(p => p.map(t => t.id === id ? { ...t, completed: true } : t));
  const requestNotif = async () => {
    const granted = await notif.requestPermission();
    if (granted) toast.success("🔔 Reminders enabled!");
    else toast.error("Permission denied. Enable in browser settings.");
  };

  const urgentCount = tasks.filter(t => !t.completed && daysLeft(t.deadline) <= 2).length;

  return (
    <>
      <style>{GLOBAL_CSS}</style>
      <Toast toasts={toast.toasts} remove={toast.remove} />

      {/* Header */}
      <header style={{
        position: "sticky", top: 0, zIndex: 50,
        background: C.navBg, backdropFilter: "blur(20px)", WebkitBackdropFilter: "blur(20px)",
        borderBottom: `1px solid ${C.border}`,
        paddingTop: "env(safe-area-inset-top, 0px)",
      }}>
        <div style={{ padding: "14px 18px", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
          <div>
            <p style={{ fontFamily: "Outfit", fontSize: 22, fontWeight: 900, letterSpacing: -0.5, lineHeight: 1 }}>
              Study<span style={{ color: C.accent }}>Pulse</span>
            </p>
            <p style={{ fontSize: 11, color: C.muted }}>AI study planner</p>
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            {urgentCount > 0 && (
              <div style={{ background: C.red + "22", border: `1px solid ${C.red}44`, borderRadius: 20, padding: "4px 10px", display: "flex", alignItems: "center", gap: 5 }}>
                <span style={{ fontSize: 10 }}>🚨</span>
                <span style={{ fontSize: 11, color: C.red, fontWeight: 700 }}>{urgentCount} urgent</span>
              </div>
            )}
            <div style={{ width: 36, height: 36, borderRadius: "50%", background: C.accentGlow, border: `1px solid ${C.border}`, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 18 }}>
              🧑‍🎓
            </div>
          </div>
        </div>
      </header>

      {/* Main content */}
      <main style={{ padding: "18px 16px 100px", maxWidth: 520, margin: "0 auto" }}>
        {tab === "tasks" && <TasksTab tasks={tasks} notifPermission={notif.permission} onRequestNotif={requestNotif} onAdd={addTask} onDelete={deleteTask} onToggleStep={toggleStep} onComplete={completeTask} toast={toast} />}
        {tab === "focus" && <FocusTab tasks={tasks} toast={toast} />}
        {tab === "friends" && <FriendsTab myTasks={tasks} toast={toast} />}
        {tab === "stats" && <StatsTab tasks={tasks} />}
      </main>

      <BottomNav tab={tab} setTab={setTab} urgentCount={urgentCount} />
    </>
  );
}
