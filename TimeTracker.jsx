import React, { useState, useEffect, useRef, useMemo } from "react";
import {
  Play, Square, Clock, FolderKanban, BarChart3, Users, LogOut,
  Plus, Search, ChevronDown, X, Pencil, Trash2, Calendar,
  CircleUser, Shield, Check, Timer as TimerIcon, TrendingUp, Filter
} from "lucide-react";
import {
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell, CartesianGrid, AreaChart, Area
} from "recharts";

/* ------------------------------------------------------------------ */
/*  Storage helpers (shared store = acts like a tiny multi-user DB)    */
/* ------------------------------------------------------------------ */
const DB_KEY = "tt_db_v1";

async function loadDB() {
  try {
    const res = await window.storage.get(DB_KEY, true);
    if (res && res.value) return JSON.parse(res.value);
  } catch (e) {
    /* key doesn't exist yet */
  }
  return null;
}
async function saveDB(db) {
  try {
    await window.storage.set(DB_KEY, JSON.stringify(db), true);
  } catch (e) {
    console.error("save failed", e);
  }
}

/* ------------------------------------------------------------------ */
/*  Seed data                                                          */
/* ------------------------------------------------------------------ */
const uid = () => Math.random().toString(36).slice(2, 10);
const todayStr = (d = new Date()) => d.toISOString().slice(0, 10);
function daysAgo(n) {
  const d = new Date();
  d.setDate(d.getDate() - n);
  return d;
}

const PROJECT_COLORS = ["#4f46e5", "#0ea5e9", "#10b981", "#f59e0b", "#ef4444", "#8b5cf6", "#ec4899", "#14b8a6"];

function seed() {
  const admin = { id: uid(), name: "Arul Raj", email: "admin@inboxist.com", password: "admin123", role: "admin", color: "#4f46e5" };
  const priya = { id: uid(), name: "Priya Nair", email: "priya@inboxist.com", password: "demo123", role: "member", color: "#0ea5e9" };
  const karthik = { id: uid(), name: "Karthik R", email: "karthik@inboxist.com", password: "demo123", role: "member", color: "#10b981" };
  const divya = { id: uid(), name: "Divya S", email: "divya@inboxist.com", password: "demo123", role: "member", color: "#f59e0b" };
  const users = [admin, priya, karthik, divya];

  const p1 = { id: uid(), name: "Inboxist Website", client: "Internal", color: "#4f46e5", memberIds: [admin.id, priya.id], archived: false };
  const p2 = { id: uid(), name: "Klaviyo Migration", client: "Acme Co", color: "#0ea5e9", memberIds: [admin.id, priya.id, karthik.id], archived: false };
  const p3 = { id: uid(), name: "Cold Email Engine", client: "Brightline", color: "#10b981", memberIds: [admin.id, karthik.id, divya.id], archived: false };
  const projects = [p1, p2, p3];

  const tasks = [
    { id: uid(), projectId: p1.id, name: "Design" },
    { id: uid(), projectId: p1.id, name: "Development" },
    { id: uid(), projectId: p1.id, name: "Content" },
    { id: uid(), projectId: p2.id, name: "Data Mapping" },
    { id: uid(), projectId: p2.id, name: "Template Build" },
    { id: uid(), projectId: p2.id, name: "QA & Testing" },
    { id: uid(), projectId: p3.id, name: "List Building" },
    { id: uid(), projectId: p3.id, name: "Copywriting" },
    { id: uid(), projectId: p3.id, name: "Campaign Setup" },
  ];

  // generate some entries across the week
  const entries = [];
  const mk = (userId, projectId, taskId, desc, dayOffset, hours) => {
    const d = daysAgo(dayOffset);
    const start = new Date(d); start.setHours(9 + Math.floor(Math.random() * 4), Math.floor(Math.random() * 50));
    const durationSec = Math.round(hours * 3600);
    const end = new Date(start.getTime() + durationSec * 1000);
    entries.push({
      id: uid(), userId, projectId, taskId, description: desc,
      start: start.getTime(), end: end.getTime(), durationSec, date: todayStr(d),
    });
  };
  mk(admin.id, p1.id, tasks[1].id, "Hero section build", 0, 2.5);
  mk(admin.id, p2.id, tasks[3].id, "Field mapping review", 1, 1.75);
  mk(priya.id, p1.id, tasks[0].id, "Landing page mockups", 0, 3.2);
  mk(priya.id, p2.id, tasks[4].id, "Welcome flow template", 1, 2.1);
  mk(priya.id, p1.id, tasks[2].id, "Copy edits", 2, 1.4);
  mk(karthik.id, p3.id, tasks[6].id, "Lead scrape + verify", 0, 4.0);
  mk(karthik.id, p2.id, tasks[5].id, "QA on Klaviyo flows", 1, 2.6);
  mk(karthik.id, p3.id, tasks[8].id, "Instantly sequence setup", 3, 3.3);
  mk(divya.id, p3.id, tasks[7].id, "Cold email copy v2", 0, 2.9);
  mk(divya.id, p3.id, tasks[7].id, "A/B subject lines", 2, 1.8);
  mk(admin.id, p3.id, tasks[8].id, "Domain warmup config", 4, 1.2);

  return { users, projects, tasks, entries };
}

/* ------------------------------------------------------------------ */
/*  Format helpers                                                     */
/* ------------------------------------------------------------------ */
const pad = (n) => String(n).padStart(2, "0");
function hms(totalSec) {
  const h = Math.floor(totalSec / 3600);
  const m = Math.floor((totalSec % 3600) / 60);
  const s = Math.floor(totalSec % 60);
  return `${pad(h)}:${pad(m)}:${pad(s)}`;
}
function hShort(totalSec) {
  const h = Math.floor(totalSec / 3600);
  const m = Math.floor((totalSec % 3600) / 60);
  if (h === 0) return `${m}m`;
  return `${h}h ${m}m`;
}
function prettyDate(dStr) {
  const d = new Date(dStr + "T00:00:00");
  const t = todayStr();
  const y = todayStr(daysAgo(1));
  if (dStr === t) return "Today";
  if (dStr === y) return "Yesterday";
  return d.toLocaleDateString(undefined, { weekday: "short", month: "short", day: "numeric" });
}
function initials(name) {
  return name.split(" ").map((w) => w[0]).join("").slice(0, 2).toUpperCase();
}

/* ------------------------------------------------------------------ */
/*  Small UI atoms                                                     */
/* ------------------------------------------------------------------ */
function Avatar({ name, color, size = 32 }) {
  return (
    <div
      className="flex items-center justify-center rounded-full text-white font-semibold flex-shrink-0"
      style={{ width: size, height: size, background: color, fontSize: size * 0.4 }}
    >
      {initials(name)}
    </div>
  );
}
function Dot({ color, size = 10 }) {
  return <span className="inline-block rounded-full flex-shrink-0" style={{ width: size, height: size, background: color }} />;
}
function Modal({ children, onClose, title }) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4" style={{ background: "rgba(15,23,42,0.45)" }} onClick={onClose}>
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100">
          <h3 className="font-semibold text-slate-900">{title}</h3>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-700"><X size={20} /></button>
        </div>
        <div className="p-6">{children}</div>
      </div>
    </div>
  );
}
function Field({ label, children }) {
  return (
    <label className="block mb-4">
      <span className="block text-sm font-medium text-slate-600 mb-1.5">{label}</span>
      {children}
    </label>
  );
}
const inputCls = "w-full px-3 py-2 rounded-lg border border-slate-200 text-slate-800 outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100 transition";

/* ================================================================== */
/*  LOGIN                                                               */
/* ================================================================== */
function Login({ users, onLogin }) {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [err, setErr] = useState("");

  const submit = () => {
    const u = users.find((x) => x.email.toLowerCase() === email.trim().toLowerCase() && x.password === password);
    if (!u) { setErr("Invalid email or password."); return; }
    onLogin(u);
  };

  const quick = (u) => { setEmail(u.email); setPassword(u.password); setErr(""); };

  return (
    <div className="min-h-screen flex" style={{ fontFamily: "'Plus Jakarta Sans', sans-serif" }}>
      {/* brand panel */}
      <div className="hidden md:flex flex-col justify-between w-2/5 p-12 text-white relative overflow-hidden"
        style={{ background: "linear-gradient(150deg,#4f46e5 0%,#4338ca 55%,#0ea5e9 130%)" }}>
        <div className="flex items-center gap-2.5">
          <div className="w-9 h-9 rounded-xl bg-white flex items-center justify-center">
            <TimerIcon size={20} color="#4f46e5" />
          </div>
          <span className="text-xl font-bold tracking-tight">TimeTrack</span>
        </div>
        <div>
          <h1 className="text-4xl font-bold leading-tight mb-4">Track time.<br />Bill accurately.<br />Stay in control.</h1>
          <p className="text-indigo-100 text-lg leading-relaxed max-w-sm">
            A clean, team-ready time tracker with project-level access, live timers and reports.
          </p>
        </div>
        <p className="text-indigo-200 text-sm">Built for teams · Admin & member roles</p>
        {/* decorative */}
        <div className="absolute -right-20 -bottom-20 w-72 h-72 rounded-full" style={{ background: "rgba(255,255,255,0.08)" }} />
        <div className="absolute right-20 top-24 w-32 h-32 rounded-full" style={{ background: "rgba(255,255,255,0.06)" }} />
      </div>

      {/* form */}
      <div className="flex-1 flex items-center justify-center p-6 bg-slate-50">
        <div className="w-full max-w-sm">
          <div className="md:hidden flex items-center gap-2.5 mb-8">
            <div className="w-9 h-9 rounded-xl flex items-center justify-center" style={{ background: "#4f46e5" }}>
              <TimerIcon size={20} color="#fff" />
            </div>
            <span className="text-xl font-bold tracking-tight text-slate-900">TimeTrack</span>
          </div>
          <h2 className="text-2xl font-bold text-slate-900 mb-1">Welcome back</h2>
          <p className="text-slate-500 mb-6">Sign in to your workspace</p>

          <Field label="Email">
            <input className={inputCls} value={email} onChange={(e) => setEmail(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && submit()} placeholder="you@company.com" />
          </Field>
          <Field label="Password">
            <input type="password" className={inputCls} value={password} onChange={(e) => setPassword(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && submit()} placeholder="••••••••" />
          </Field>
          {err && <p className="text-sm text-red-500 mb-3">{err}</p>}
          <button onClick={submit}
            className="w-full py-2.5 rounded-lg text-white font-semibold transition hover:opacity-90"
            style={{ background: "#4f46e5" }}>Sign in</button>

          <div className="mt-8">
            <p className="text-xs font-semibold uppercase tracking-wide text-slate-400 mb-3">Demo accounts — tap to fill</p>
            <div className="space-y-2">
              {users.map((u) => (
                <button key={u.id} onClick={() => quick(u)}
                  className="w-full flex items-center gap-3 px-3 py-2 rounded-lg border border-slate-200 bg-white hover:border-indigo-300 hover:bg-indigo-50 transition text-left">
                  <Avatar name={u.name} color={u.color} size={30} />
                  <div className="flex-1 min-w-0">
                    <div className="text-sm font-medium text-slate-800 truncate">{u.name}</div>
                    <div className="text-xs text-slate-400 truncate">{u.email}</div>
                  </div>
                  {u.role === "admin"
                    ? <span className="text-xs font-medium px-2 py-0.5 rounded-full text-indigo-700 bg-indigo-100 flex items-center gap-1"><Shield size={11} />Admin</span>
                    : <span className="text-xs font-medium px-2 py-0.5 rounded-full text-slate-500 bg-slate-100">Member</span>}
                </button>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

/* ================================================================== */
/*  MAIN APP                                                            */
/* ================================================================== */
export default function App() {
  const [db, setDb] = useState(null);
  const [me, setMe] = useState(null);
  const [view, setView] = useState("tracker");
  const [now, setNow] = useState(Date.now());

  // running timer (in-memory, per session)
  const [running, setRunning] = useState(null); // {projectId, taskId, description, start}

  // load shared db
  useEffect(() => {
    (async () => {
      let d = await loadDB();
      if (!d) { d = seed(); await saveDB(d); }
      setDb(d);
    })();
  }, []);

  // tick for live timer
  useEffect(() => {
    const t = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(t);
  }, []);

  const commit = (updater) => {
    setDb((prev) => {
      const next = typeof updater === "function" ? updater(prev) : updater;
      saveDB(next);
      return next;
    });
  };

  if (!db) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50" style={{ fontFamily: "'Plus Jakarta Sans',sans-serif" }}>
        <div className="flex items-center gap-3 text-slate-500">
          <div className="w-5 h-5 rounded-full border-2 border-indigo-500 border-t-transparent animate-spin" />
          Loading workspace…
        </div>
      </div>
    );
  }

  if (!me) {
    return (
      <>
        <FontInjector />
        <Login users={db.users} onLogin={setMe} />
      </>
    );
  }

  const isAdmin = me.role === "admin";
  const myProjects = db.projects.filter((p) => !p.archived && (isAdmin || p.memberIds.includes(me.id)));

  const nav = [
    { key: "tracker", label: "Timer", icon: Clock },
    { key: "timesheet", label: "Timesheet", icon: Calendar },
    { key: "reports", label: "Reports", icon: BarChart3 },
    { key: "projects", label: "Projects", icon: FolderKanban },
    ...(isAdmin ? [{ key: "team", label: "Team", icon: Users }] : []),
  ];

  /* ---- timer actions ---- */
  const startTimer = (projectId, taskId, description) => {
    setRunning({ projectId, taskId, description, start: Date.now() });
  };
  const stopTimer = () => {
    if (!running) return;
    const end = Date.now();
    const durationSec = Math.max(1, Math.round((end - running.start) / 1000));
    const entry = {
      id: uid(), userId: me.id, projectId: running.projectId, taskId: running.taskId,
      description: running.description, start: running.start, end, durationSec, date: todayStr(),
    };
    commit((d) => ({ ...d, entries: [entry, ...d.entries] }));
    setRunning(null);
  };

  return (
    <>
      <FontInjector />
      <div className="min-h-screen flex bg-slate-50 text-slate-800" style={{ fontFamily: "'Plus Jakarta Sans',sans-serif" }}>
        {/* SIDEBAR */}
        <aside className="w-60 bg-white border-r border-slate-200 flex flex-col flex-shrink-0">
          <div className="px-5 h-16 flex items-center gap-2.5 border-b border-slate-100">
            <div className="w-8 h-8 rounded-lg flex items-center justify-center" style={{ background: "#4f46e5" }}>
              <TimerIcon size={18} color="#fff" />
            </div>
            <span className="text-lg font-bold tracking-tight text-slate-900">TimeTrack</span>
          </div>
          <nav className="flex-1 p-3 space-y-1">
            {nav.map((n) => {
              const Icon = n.icon;
              const active = view === n.key;
              return (
                <button key={n.key} onClick={() => setView(n.key)}
                  className={"w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition " +
                    (active ? "text-indigo-700 bg-indigo-50" : "text-slate-600 hover:bg-slate-50")}>
                  <Icon size={18} /> {n.label}
                </button>
              );
            })}
          </nav>
          <div className="p-3 border-t border-slate-100">
            <div className="flex items-center gap-3 px-2 py-2">
              <Avatar name={me.name} color={me.color} size={36} />
              <div className="flex-1 min-w-0">
                <div className="text-sm font-semibold text-slate-800 truncate">{me.name}</div>
                <div className="text-xs text-slate-400 truncate flex items-center gap-1">
                  {isAdmin && <Shield size={11} className="text-indigo-500" />}{isAdmin ? "Admin" : "Member"}
                </div>
              </div>
              <button onClick={() => { setMe(null); setRunning(null); setView("tracker"); }}
                className="text-slate-400 hover:text-red-500 transition" title="Sign out"><LogOut size={18} /></button>
            </div>
          </div>
        </aside>

        {/* MAIN */}
        <main className="flex-1 flex flex-col min-w-0">
          {/* top running-timer bar */}
          <RunningBar running={running} now={now} db={db} onStop={stopTimer} />

          <div className="flex-1 overflow-auto">
            <div className="max-w-5xl mx-auto px-6 py-8">
              {view === "tracker" && (
                <Tracker me={me} db={db} myProjects={myProjects} running={running}
                  onStart={startTimer} onStop={stopTimer} now={now}
                  onManual={(e) => commit((d) => ({ ...d, entries: [e, ...d.entries] }))}
                  onDelete={(id) => commit((d) => ({ ...d, entries: d.entries.filter((x) => x.id !== id) }))} />
              )}
              {view === "timesheet" && (
                <Timesheet me={me} db={db} isAdmin={isAdmin}
                  onDelete={(id) => commit((d) => ({ ...d, entries: d.entries.filter((x) => x.id !== id) }))} />
              )}
              {view === "reports" && <Reports me={me} db={db} isAdmin={isAdmin} />}
              {view === "projects" && (
                <Projects me={me} db={db} isAdmin={isAdmin} commit={commit} />
              )}
              {view === "team" && isAdmin && <Team db={db} commit={commit} />}
            </div>
          </div>
        </main>
      </div>
    </>
  );
}

/* ------------------------------------------------------------------ */
/*  Running timer bar                                                  */
/* ------------------------------------------------------------------ */
function RunningBar({ running, now, db, onStop }) {
  const proj = running && db.projects.find((p) => p.id === running.projectId);
  const task = running && db.tasks.find((t) => t.id === running.taskId);
  const elapsed = running ? Math.round((now - running.start) / 1000) : 0;
  return (
    <div className="h-16 bg-white border-b border-slate-200 flex items-center px-6 flex-shrink-0">
      {running ? (
        <div className="flex items-center gap-4 w-full">
          <span className="relative flex h-2.5 w-2.5">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full opacity-60" style={{ background: "#10b981" }} />
            <span className="relative inline-flex rounded-full h-2.5 w-2.5" style={{ background: "#10b981" }} />
          </span>
          <div className="min-w-0">
            <div className="text-sm font-medium text-slate-800 truncate">{running.description || "No description"}</div>
            <div className="text-xs text-slate-400 flex items-center gap-1.5">
              {proj && <Dot color={proj.color} size={8} />}{proj?.name}{task ? ` · ${task.name}` : ""}
            </div>
          </div>
          <div className="ml-auto flex items-center gap-4">
            <span className="text-2xl font-semibold text-slate-900" style={{ fontVariantNumeric: "tabular-nums" }}>{hms(elapsed)}</span>
            <button onClick={onStop} className="flex items-center gap-2 px-4 py-2 rounded-lg text-white font-medium text-sm transition hover:opacity-90" style={{ background: "#ef4444" }}>
              <Square size={15} fill="#fff" /> Stop
            </button>
          </div>
        </div>
      ) : (
        <div className="text-sm text-slate-400 flex items-center gap-2"><Clock size={16} /> No timer running — start one below</div>
      )}
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  Page header                                                        */
/* ------------------------------------------------------------------ */
function PageHead({ title, sub, children }) {
  return (
    <div className="flex items-start justify-between mb-6">
      <div>
        <h1 className="text-2xl font-bold text-slate-900">{title}</h1>
        {sub && <p className="text-slate-500 mt-1">{sub}</p>}
      </div>
      {children}
    </div>
  );
}

/* ================================================================== */
/*  TRACKER                                                            */
/* ================================================================== */
function Tracker({ me, db, myProjects, running, onStart, onStop, now, onManual, onDelete }) {
  const [desc, setDesc] = useState("");
  const [projectId, setProjectId] = useState(myProjects[0]?.id || "");
  const [taskId, setTaskId] = useState("");
  const [showManual, setShowManual] = useState(false);

  const tasksForProject = db.tasks.filter((t) => t.projectId === projectId);
  useEffect(() => {
    if (tasksForProject.length && !tasksForProject.find((t) => t.id === taskId)) setTaskId(tasksForProject[0].id);
  }, [projectId]); // eslint-disable-line

  const myToday = db.entries
    .filter((e) => e.userId === me.id && e.date === todayStr())
    .sort((a, b) => b.start - a.start);
  const todayTotal = myToday.reduce((s, e) => s + e.durationSec, 0) + (running ? Math.round((now - running.start) / 1000) : 0);

  const start = () => {
    if (!projectId) return;
    onStart(projectId, taskId, desc);
    setDesc("");
  };

  return (
    <div>
      <PageHead title={`Good ${greet()}, ${me.name.split(" ")[0]}`} sub={`You've tracked ${hShort(todayTotal)} today.`} />

      {/* timer composer */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-5 mb-8">
        <div className="flex flex-col md:flex-row gap-3 md:items-end">
          <div className="flex-1">
            <label className="block text-xs font-medium text-slate-500 mb-1.5">What are you working on?</label>
            <input className={inputCls} placeholder="Describe your task…" value={desc}
              onChange={(e) => setDesc(e.target.value)} onKeyDown={(e) => e.key === "Enter" && !running && start()} />
          </div>
          <div className="w-full md:w-44">
            <label className="block text-xs font-medium text-slate-500 mb-1.5">Project</label>
            <div className="relative">
              <select className={inputCls + " appearance-none pr-8"} value={projectId} onChange={(e) => setProjectId(e.target.value)}>
                {myProjects.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}
              </select>
              <ChevronDown size={16} className="absolute right-2.5 top-3 text-slate-400 pointer-events-none" />
            </div>
          </div>
          <div className="w-full md:w-40">
            <label className="block text-xs font-medium text-slate-500 mb-1.5">Task</label>
            <div className="relative">
              <select className={inputCls + " appearance-none pr-8"} value={taskId} onChange={(e) => setTaskId(e.target.value)}>
                {tasksForProject.map((t) => <option key={t.id} value={t.id}>{t.name}</option>)}
              </select>
              <ChevronDown size={16} className="absolute right-2.5 top-3 text-slate-400 pointer-events-none" />
            </div>
          </div>
          {running ? (
            <button onClick={onStop} className="flex items-center justify-center gap-2 px-5 py-2.5 rounded-lg text-white font-semibold transition hover:opacity-90" style={{ background: "#ef4444" }}>
              <Square size={16} fill="#fff" /> Stop
            </button>
          ) : (
            <button onClick={start} disabled={!projectId}
              className="flex items-center justify-center gap-2 px-5 py-2.5 rounded-lg text-white font-semibold transition hover:opacity-90 disabled:opacity-40" style={{ background: "#10b981" }}>
              <Play size={16} fill="#fff" /> Start
            </button>
          )}
        </div>
        <div className="mt-3 flex justify-end">
          <button onClick={() => setShowManual(true)} className="text-sm text-indigo-600 hover:text-indigo-800 font-medium flex items-center gap-1">
            <Plus size={15} /> Add manual entry
          </button>
        </div>
      </div>

      {/* today's entries */}
      <h2 className="text-sm font-semibold uppercase tracking-wide text-slate-400 mb-3">Today</h2>
      {myToday.length === 0 ? (
        <EmptyState icon={Clock} text="No time tracked yet today. Start the timer above!" />
      ) : (
        <div className="space-y-2">
          {myToday.map((e) => <EntryRow key={e.id} entry={e} db={db} onDelete={onDelete} />)}
        </div>
      )}

      {showManual && (
        <ManualEntry me={me} myProjects={myProjects} db={db} onClose={() => setShowManual(false)}
          onSave={(e) => { onManual(e); setShowManual(false); }} />
      )}
    </div>
  );
}

function greet() {
  const h = new Date().getHours();
  if (h < 12) return "morning";
  if (h < 18) return "afternoon";
  return "evening";
}

function EntryRow({ entry, db, onDelete, showUser }) {
  const proj = db.projects.find((p) => p.id === entry.projectId);
  const task = db.tasks.find((t) => t.id === entry.taskId);
  const user = db.users.find((u) => u.id === entry.userId);
  return (
    <div className="bg-white rounded-xl border border-slate-200 px-4 py-3 flex items-center gap-4 group hover:border-slate-300 transition">
      {showUser && user && <Avatar name={user.name} color={user.color} size={30} />}
      <div className="flex-1 min-w-0">
        <div className="text-sm font-medium text-slate-800 truncate">{entry.description || "No description"}</div>
        <div className="text-xs text-slate-400 flex items-center gap-1.5 mt-0.5">
          {proj && <Dot color={proj.color} size={8} />}{proj?.name}{task ? ` · ${task.name}` : ""}
          {showUser && user ? ` · ${user.name}` : ""}
        </div>
      </div>
      <div className="text-xs text-slate-400 hidden sm:block">
        {new Date(entry.start).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })} – {new Date(entry.end).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
      </div>
      <div className="text-sm font-semibold text-slate-900 w-16 text-right" style={{ fontVariantNumeric: "tabular-nums" }}>{hShort(entry.durationSec)}</div>
      {onDelete && (
        <button onClick={() => onDelete(entry.id)} className="text-slate-300 hover:text-red-500 opacity-0 group-hover:opacity-100 transition">
          <Trash2 size={16} />
        </button>
      )}
    </div>
  );
}

function ManualEntry({ me, myProjects, db, onClose, onSave }) {
  const [projectId, setProjectId] = useState(myProjects[0]?.id || "");
  const tasksFor = db.tasks.filter((t) => t.projectId === projectId);
  const [taskId, setTaskId] = useState(tasksFor[0]?.id || "");
  const [desc, setDesc] = useState("");
  const [date, setDate] = useState(todayStr());
  const [from, setFrom] = useState("09:00");
  const [to, setTo] = useState("10:00");

  const save = () => {
    const start = new Date(`${date}T${from}`).getTime();
    let end = new Date(`${date}T${to}`).getTime();
    if (end <= start) end = start + 60000;
    onSave({
      id: uid(), userId: me.id, projectId, taskId, description: desc,
      start, end, durationSec: Math.round((end - start) / 1000), date,
    });
  };

  return (
    <Modal title="Add manual entry" onClose={onClose}>
      <Field label="Description">
        <input className={inputCls} value={desc} onChange={(e) => setDesc(e.target.value)} placeholder="What did you work on?" />
      </Field>
      <Field label="Project">
        <select className={inputCls} value={projectId} onChange={(e) => { setProjectId(e.target.value); const t = db.tasks.find(x => x.projectId === e.target.value); setTaskId(t?.id || ""); }}>
          {myProjects.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}
        </select>
      </Field>
      <Field label="Task">
        <select className={inputCls} value={taskId} onChange={(e) => setTaskId(e.target.value)}>
          {tasksFor.map((t) => <option key={t.id} value={t.id}>{t.name}</option>)}
        </select>
      </Field>
      <div className="grid grid-cols-3 gap-3">
        <Field label="Date"><input type="date" className={inputCls} value={date} onChange={(e) => setDate(e.target.value)} /></Field>
        <Field label="From"><input type="time" className={inputCls} value={from} onChange={(e) => setFrom(e.target.value)} /></Field>
        <Field label="To"><input type="time" className={inputCls} value={to} onChange={(e) => setTo(e.target.value)} /></Field>
      </div>
      <button onClick={save} className="w-full py-2.5 rounded-lg text-white font-semibold mt-2" style={{ background: "#4f46e5" }}>Save entry</button>
    </Modal>
  );
}

/* ================================================================== */
/*  TIMESHEET                                                          */
/* ================================================================== */
function Timesheet({ me, db, isAdmin, onDelete }) {
  const [scope, setScope] = useState("me"); // me | all (admin)
  const entries = db.entries
    .filter((e) => (isAdmin && scope === "all") ? true : e.userId === me.id)
    .sort((a, b) => b.start - a.start);

  const byDay = useMemo(() => {
    const m = {};
    entries.forEach((e) => { (m[e.date] = m[e.date] || []).push(e); });
    return Object.entries(m).sort((a, b) => b[0].localeCompare(a[0]));
  }, [entries]);

  return (
    <div>
      <PageHead title="Timesheet" sub="Your tracked entries, grouped by day.">
        {isAdmin && (
          <div className="flex rounded-lg border border-slate-200 overflow-hidden text-sm">
            <button onClick={() => setScope("me")} className={"px-3 py-1.5 font-medium " + (scope === "me" ? "bg-indigo-600 text-white" : "bg-white text-slate-600")}>My time</button>
            <button onClick={() => setScope("all")} className={"px-3 py-1.5 font-medium " + (scope === "all" ? "bg-indigo-600 text-white" : "bg-white text-slate-600")}>Whole team</button>
          </div>
        )}
      </PageHead>

      {byDay.length === 0 ? <EmptyState icon={Calendar} text="No entries yet." /> : (
        <div className="space-y-6">
          {byDay.map(([day, list]) => {
            const total = list.reduce((s, e) => s + e.durationSec, 0);
            return (
              <div key={day}>
                <div className="flex items-center justify-between mb-2">
                  <h3 className="text-sm font-semibold text-slate-700">{prettyDate(day)}</h3>
                  <span className="text-sm font-semibold text-slate-500" style={{ fontVariantNumeric: "tabular-nums" }}>{hShort(total)}</span>
                </div>
                <div className="space-y-2">
                  {list.map((e) => (
                    <EntryRow key={e.id} entry={e} db={db}
                      showUser={isAdmin && scope === "all"}
                      onDelete={(isAdmin || e.userId === me.id) ? onDelete : null} />
                  ))}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

/* ================================================================== */
/*  REPORTS                                                            */
/* ================================================================== */
function Reports({ me, db, isAdmin }) {
  const [scope, setScope] = useState(isAdmin ? "all" : "me");
  const [range, setRange] = useState(7);

  const cutoff = daysAgo(range - 1); cutoff.setHours(0, 0, 0, 0);
  const entries = db.entries.filter((e) => {
    const inScope = scope === "all" ? true : e.userId === me.id;
    return inScope && e.start >= cutoff.getTime();
  });

  const total = entries.reduce((s, e) => s + e.durationSec, 0);

  // by project
  const byProject = useMemo(() => {
    const m = {};
    entries.forEach((e) => { m[e.projectId] = (m[e.projectId] || 0) + e.durationSec; });
    return Object.entries(m).map(([pid, sec]) => {
      const p = db.projects.find((x) => x.id === pid);
      return { name: p?.name || "—", hours: +(sec / 3600).toFixed(2), color: p?.color || "#94a3b8" };
    }).sort((a, b) => b.hours - a.hours);
  }, [entries]);

  // by day
  const byDay = useMemo(() => {
    const arr = [];
    for (let i = range - 1; i >= 0; i--) {
      const d = daysAgo(i); const ds = todayStr(d);
      const sec = entries.filter((e) => e.date === ds).reduce((s, e) => s + e.durationSec, 0);
      arr.push({ day: d.toLocaleDateString(undefined, { weekday: "short" }), hours: +(sec / 3600).toFixed(2) });
    }
    return arr;
  }, [entries]);

  // by member
  const byMember = useMemo(() => {
    const m = {};
    entries.forEach((e) => { m[e.userId] = (m[e.userId] || 0) + e.durationSec; });
    return Object.entries(m).map(([uidv, sec]) => {
      const u = db.users.find((x) => x.id === uidv);
      return { name: u?.name || "—", hours: +(sec / 3600).toFixed(2), color: u?.color || "#94a3b8" };
    }).sort((a, b) => b.hours - a.hours);
  }, [entries]);

  const billable = (total / 3600 * 1).toFixed(1);

  return (
    <div>
      <PageHead title="Reports" sub="Visualize where time goes.">
        <div className="flex items-center gap-2">
          {isAdmin && (
            <div className="flex rounded-lg border border-slate-200 overflow-hidden text-sm">
              <button onClick={() => setScope("me")} className={"px-3 py-1.5 font-medium " + (scope === "me" ? "bg-indigo-600 text-white" : "bg-white text-slate-600")}>Me</button>
              <button onClick={() => setScope("all")} className={"px-3 py-1.5 font-medium " + (scope === "all" ? "bg-indigo-600 text-white" : "bg-white text-slate-600")}>Team</button>
            </div>
          )}
          <div className="relative">
            <select value={range} onChange={(e) => setRange(+e.target.value)} className={inputCls + " appearance-none pr-8 py-1.5 text-sm"}>
              <option value={7}>Last 7 days</option>
              <option value={14}>Last 14 days</option>
              <option value={30}>Last 30 days</option>
            </select>
            <ChevronDown size={15} className="absolute right-2.5 top-2.5 text-slate-400 pointer-events-none" />
          </div>
        </div>
      </PageHead>

      {/* stat cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
        <StatCard label="Total tracked" value={hShort(total)} icon={Clock} tint="#4f46e5" />
        <StatCard label="Entries" value={entries.length} icon={Calendar} tint="#0ea5e9" />
        <StatCard label="Projects active" value={byProject.length} icon={FolderKanban} tint="#10b981" />
        <StatCard label="Avg / day" value={hShort(total / range)} icon={TrendingUp} tint="#f59e0b" />
      </div>

      {entries.length === 0 ? <EmptyState icon={BarChart3} text="No data in this range." /> : (
        <div className="grid md:grid-cols-2 gap-4">
          {/* daily trend */}
          <Card title="Daily activity">
            <ResponsiveContainer width="100%" height={220}>
              <AreaChart data={byDay} margin={{ top: 10, right: 8, left: -18, bottom: 0 }}>
                <defs>
                  <linearGradient id="g" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#4f46e5" stopOpacity={0.35} />
                    <stop offset="100%" stopColor="#4f46e5" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" vertical={false} />
                <XAxis dataKey="day" tick={{ fontSize: 12, fill: "#94a3b8" }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fontSize: 12, fill: "#94a3b8" }} axisLine={false} tickLine={false} />
                <Tooltip formatter={(v) => [`${v}h`, "Hours"]} />
                <Area type="monotone" dataKey="hours" stroke="#4f46e5" strokeWidth={2} fill="url(#g)" />
              </AreaChart>
            </ResponsiveContainer>
          </Card>

          {/* by project pie */}
          <Card title="Time by project">
            <div className="flex items-center">
              <ResponsiveContainer width="55%" height={220}>
                <PieChart>
                  <Pie data={byProject} dataKey="hours" nameKey="name" cx="50%" cy="50%" innerRadius={48} outerRadius={80} paddingAngle={2}>
                    {byProject.map((d, i) => <Cell key={i} fill={d.color} />)}
                  </Pie>
                  <Tooltip formatter={(v) => [`${v}h`, ""]} />
                </PieChart>
              </ResponsiveContainer>
              <div className="flex-1 space-y-2">
                {byProject.map((d) => (
                  <div key={d.name} className="flex items-center gap-2 text-sm">
                    <Dot color={d.color} /> <span className="text-slate-600 flex-1 truncate">{d.name}</span>
                    <span className="font-semibold text-slate-800">{d.hours}h</span>
                  </div>
                ))}
              </div>
            </div>
          </Card>

          {/* by member (or by task for member view) */}
          <Card title={scope === "all" ? "Time by member" : "Top projects"} className="md:col-span-2">
            <ResponsiveContainer width="100%" height={Math.max(140, (scope === "all" ? byMember : byProject).length * 44)}>
              <BarChart data={scope === "all" ? byMember : byProject} layout="vertical" margin={{ left: 8, right: 24 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" horizontal={false} />
                <XAxis type="number" tick={{ fontSize: 12, fill: "#94a3b8" }} axisLine={false} tickLine={false} />
                <YAxis type="category" dataKey="name" width={130} tick={{ fontSize: 13, fill: "#475569" }} axisLine={false} tickLine={false} />
                <Tooltip formatter={(v) => [`${v}h`, "Hours"]} cursor={{ fill: "#f8fafc" }} />
                <Bar dataKey="hours" radius={[0, 6, 6, 0]} barSize={20}>
                  {(scope === "all" ? byMember : byProject).map((d, i) => <Cell key={i} fill={d.color} />)}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </Card>
        </div>
      )}
    </div>
  );
}

function StatCard({ label, value, icon: Icon, tint }) {
  return (
    <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-4">
      <div className="w-9 h-9 rounded-lg flex items-center justify-center mb-3" style={{ background: tint + "1a" }}>
        <Icon size={18} color={tint} />
      </div>
      <div className="text-2xl font-bold text-slate-900" style={{ fontVariantNumeric: "tabular-nums" }}>{value}</div>
      <div className="text-sm text-slate-500">{label}</div>
    </div>
  );
}
function Card({ title, children, className = "" }) {
  return (
    <div className={"bg-white rounded-2xl border border-slate-200 shadow-sm p-5 " + className}>
      <h3 className="font-semibold text-slate-800 mb-4">{title}</h3>
      {children}
    </div>
  );
}

/* ================================================================== */
/*  PROJECTS                                                           */
/* ================================================================== */
function Projects({ me, db, isAdmin, commit }) {
  const [edit, setEdit] = useState(null); // project being edited / "new"
  const visible = db.projects.filter((p) => isAdmin || p.memberIds.includes(me.id));

  const projTime = (pid) => db.entries.filter((e) => e.projectId === pid).reduce((s, e) => s + e.durationSec, 0);

  return (
    <div>
      <PageHead title="Projects" sub={isAdmin ? "Manage projects and who can access them." : "Projects you have access to."}>
        {isAdmin && (
          <button onClick={() => setEdit("new")} className="flex items-center gap-2 px-4 py-2 rounded-lg text-white font-medium text-sm" style={{ background: "#4f46e5" }}>
            <Plus size={16} /> New project
          </button>
        )}
      </PageHead>

      <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
        {visible.map((p) => {
          const members = db.users.filter((u) => p.memberIds.includes(u.id));
          const taskCount = db.tasks.filter((t) => t.projectId === p.id).length;
          return (
            <div key={p.id} className="bg-white rounded-2xl border border-slate-200 shadow-sm p-5 group">
              <div className="flex items-start justify-between mb-3">
                <div className="w-10 h-10 rounded-xl flex items-center justify-center" style={{ background: p.color + "1a" }}>
                  <FolderKanban size={20} color={p.color} />
                </div>
                {isAdmin && (
                  <button onClick={() => setEdit(p)} className="text-slate-300 hover:text-indigo-600 opacity-0 group-hover:opacity-100 transition"><Pencil size={16} /></button>
                )}
              </div>
              <h3 className="font-semibold text-slate-900">{p.name}</h3>
              <p className="text-sm text-slate-400 mb-4">{p.client}</p>
              <div className="flex items-center justify-between text-sm text-slate-500 mb-3">
                <span>{taskCount} tasks</span>
                <span className="font-semibold text-slate-700">{hShort(projTime(p.id))}</span>
              </div>
              <div className="flex items-center -space-x-2">
                {members.slice(0, 5).map((u) => (
                  <div key={u.id} className="ring-2 ring-white rounded-full"><Avatar name={u.name} color={u.color} size={28} /></div>
                ))}
                {members.length > 5 && <span className="text-xs text-slate-400 pl-3">+{members.length - 5}</span>}
              </div>
            </div>
          );
        })}
        {visible.length === 0 && <div className="md:col-span-3"><EmptyState icon={FolderKanban} text="No projects yet." /></div>}
      </div>

      {edit && <ProjectModal db={db} project={edit === "new" ? null : edit} onClose={() => setEdit(null)} commit={commit} />}
    </div>
  );
}

function ProjectModal({ db, project, onClose, commit }) {
  const isNew = !project;
  const [name, setName] = useState(project?.name || "");
  const [client, setClient] = useState(project?.client || "");
  const [color, setColor] = useState(project?.color || PROJECT_COLORS[0]);
  const [memberIds, setMemberIds] = useState(project?.memberIds || []);
  const [tasks, setTasks] = useState(db.tasks.filter((t) => t.projectId === project?.id).map((t) => t.name));
  const [newTask, setNewTask] = useState("");

  const toggleMember = (id) => setMemberIds((m) => m.includes(id) ? m.filter((x) => x !== id) : [...m, id]);

  const save = () => {
    if (!name.trim()) return;
    commit((d) => {
      let projects, allTasks;
      if (isNew) {
        const pid = uid();
        projects = [...d.projects, { id: pid, name, client, color, memberIds, archived: false }];
        allTasks = [...d.tasks, ...tasks.map((tn) => ({ id: uid(), projectId: pid, name: tn }))];
      } else {
        projects = d.projects.map((p) => p.id === project.id ? { ...p, name, client, color, memberIds } : p);
        // reconcile tasks: keep existing names, add new
        const existing = d.tasks.filter((t) => t.projectId === project.id);
        const keep = existing.filter((t) => tasks.includes(t.name));
        const add = tasks.filter((tn) => !existing.find((t) => t.name === tn)).map((tn) => ({ id: uid(), projectId: project.id, name: tn }));
        allTasks = [...d.tasks.filter((t) => t.projectId !== project.id), ...keep, ...add];
      }
      return { ...d, projects, tasks: allTasks };
    });
    onClose();
  };

  const remove = () => {
    commit((d) => ({
      ...d,
      projects: d.projects.filter((p) => p.id !== project.id),
      tasks: d.tasks.filter((t) => t.projectId !== project.id),
      entries: d.entries.filter((e) => e.projectId !== project.id),
    }));
    onClose();
  };

  return (
    <Modal title={isNew ? "New project" : "Edit project"} onClose={onClose}>
      <Field label="Project name"><input className={inputCls} value={name} onChange={(e) => setName(e.target.value)} placeholder="e.g. Website Redesign" /></Field>
      <Field label="Client"><input className={inputCls} value={client} onChange={(e) => setClient(e.target.value)} placeholder="e.g. Acme Co" /></Field>
      <Field label="Color">
        <div className="flex gap-2">
          {PROJECT_COLORS.map((c) => (
            <button key={c} onClick={() => setColor(c)} className="w-7 h-7 rounded-full flex items-center justify-center transition"
              style={{ background: c, outline: color === c ? "2px solid #1e293b" : "none", outlineOffset: 2 }}>
              {color === c && <Check size={14} color="#fff" />}
            </button>
          ))}
        </div>
      </Field>
      <Field label="Tasks">
        <div className="space-y-1.5 mb-2">
          {tasks.map((t, i) => (
            <div key={i} className="flex items-center gap-2 text-sm bg-slate-50 rounded-lg px-3 py-1.5">
              <span className="flex-1 text-slate-700">{t}</span>
              <button onClick={() => setTasks(tasks.filter((_, idx) => idx !== i))} className="text-slate-400 hover:text-red-500"><X size={14} /></button>
            </div>
          ))}
        </div>
        <div className="flex gap-2">
          <input className={inputCls} value={newTask} onChange={(e) => setNewTask(e.target.value)}
            onKeyDown={(e) => { if (e.key === "Enter" && newTask.trim()) { setTasks([...tasks, newTask.trim()]); setNewTask(""); } }}
            placeholder="Add a task and press Enter" />
        </div>
      </Field>
      <Field label="Team access">
        <div className="space-y-1.5 max-h-44 overflow-auto">
          {db.users.map((u) => (
            <button key={u.id} onClick={() => toggleMember(u.id)}
              className={"w-full flex items-center gap-2.5 px-3 py-2 rounded-lg border transition text-left " +
                (memberIds.includes(u.id) ? "border-indigo-300 bg-indigo-50" : "border-slate-200 bg-white")}>
              <Avatar name={u.name} color={u.color} size={28} />
              <span className="flex-1 text-sm text-slate-700">{u.name}</span>
              {u.role === "admin" && <Shield size={13} className="text-indigo-400" />}
              <span className={"w-5 h-5 rounded-md flex items-center justify-center " + (memberIds.includes(u.id) ? "bg-indigo-600" : "border border-slate-300")}>
                {memberIds.includes(u.id) && <Check size={13} color="#fff" />}
              </span>
            </button>
          ))}
        </div>
      </Field>
      <div className="flex gap-3 mt-2">
        {!isNew && <button onClick={remove} className="px-4 py-2.5 rounded-lg font-medium text-red-600 bg-red-50 hover:bg-red-100">Delete</button>}
        <button onClick={save} className="flex-1 py-2.5 rounded-lg text-white font-semibold" style={{ background: "#4f46e5" }}>{isNew ? "Create project" : "Save changes"}</button>
      </div>
    </Modal>
  );
}

/* ================================================================== */
/*  TEAM (admin only)                                                  */
/* ================================================================== */
function Team({ db, commit }) {
  const [edit, setEdit] = useState(null); // user | "new"

  const userTime = (uidv) => db.entries.filter((e) => e.userId === uidv).reduce((s, e) => s + e.durationSec, 0);
  const userProjects = (uidv) => db.projects.filter((p) => p.memberIds.includes(uidv)).length;

  return (
    <div>
      <PageHead title="Team" sub="Manage members, roles and access.">
        <button onClick={() => setEdit("new")} className="flex items-center gap-2 px-4 py-2 rounded-lg text-white font-medium text-sm" style={{ background: "#4f46e5" }}>
          <Plus size={16} /> Add member
        </button>
      </PageHead>

      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
        <table className="w-full text-sm">
          <thead>
            <tr className="text-left text-slate-400 border-b border-slate-100">
              <th className="font-medium px-5 py-3">Member</th>
              <th className="font-medium px-5 py-3">Role</th>
              <th className="font-medium px-5 py-3">Projects</th>
              <th className="font-medium px-5 py-3">Tracked</th>
              <th className="px-5 py-3"></th>
            </tr>
          </thead>
          <tbody>
            {db.users.map((u) => (
              <tr key={u.id} className="border-b border-slate-50 last:border-0 hover:bg-slate-50/60 group">
                <td className="px-5 py-3">
                  <div className="flex items-center gap-3">
                    <Avatar name={u.name} color={u.color} size={34} />
                    <div>
                      <div className="font-medium text-slate-800">{u.name}</div>
                      <div className="text-xs text-slate-400">{u.email}</div>
                    </div>
                  </div>
                </td>
                <td className="px-5 py-3">
                  {u.role === "admin"
                    ? <span className="text-xs font-medium px-2 py-0.5 rounded-full text-indigo-700 bg-indigo-100 inline-flex items-center gap-1"><Shield size={11} />Admin</span>
                    : <span className="text-xs font-medium px-2 py-0.5 rounded-full text-slate-500 bg-slate-100">Member</span>}
                </td>
                <td className="px-5 py-3 text-slate-600">{userProjects(u.id)}</td>
                <td className="px-5 py-3 font-semibold text-slate-700">{hShort(userTime(u.id))}</td>
                <td className="px-5 py-3 text-right">
                  <button onClick={() => setEdit(u)} className="text-slate-300 hover:text-indigo-600 opacity-0 group-hover:opacity-100 transition"><Pencil size={16} /></button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {edit && <UserModal db={db} user={edit === "new" ? null : edit} onClose={() => setEdit(null)} commit={commit} />}
    </div>
  );
}

function UserModal({ db, user, onClose, commit }) {
  const isNew = !user;
  const [name, setName] = useState(user?.name || "");
  const [email, setEmail] = useState(user?.email || "");
  const [password, setPassword] = useState(user?.password || "demo123");
  const [role, setRole] = useState(user?.role || "member");
  const [color, setColor] = useState(user?.color || PROJECT_COLORS[Math.floor(Math.random() * PROJECT_COLORS.length)]);

  const save = () => {
    if (!name.trim() || !email.trim()) return;
    commit((d) => {
      if (isNew) return { ...d, users: [...d.users, { id: uid(), name, email, password, role, color }] };
      return { ...d, users: d.users.map((u) => u.id === user.id ? { ...u, name, email, password, role, color } : u) };
    });
    onClose();
  };
  const remove = () => {
    commit((d) => ({
      ...d,
      users: d.users.filter((u) => u.id !== user.id),
      projects: d.projects.map((p) => ({ ...p, memberIds: p.memberIds.filter((id) => id !== user.id) })),
    }));
    onClose();
  };

  return (
    <Modal title={isNew ? "Add member" : "Edit member"} onClose={onClose}>
      <Field label="Full name"><input className={inputCls} value={name} onChange={(e) => setName(e.target.value)} /></Field>
      <Field label="Email"><input className={inputCls} value={email} onChange={(e) => setEmail(e.target.value)} /></Field>
      <Field label="Password"><input className={inputCls} value={password} onChange={(e) => setPassword(e.target.value)} /></Field>
      <Field label="Role">
        <div className="flex gap-2">
          {["member", "admin"].map((r) => (
            <button key={r} onClick={() => setRole(r)}
              className={"flex-1 py-2 rounded-lg border font-medium text-sm capitalize transition " +
                (role === r ? "border-indigo-400 bg-indigo-50 text-indigo-700" : "border-slate-200 text-slate-600")}>
              {r === "admin" && <Shield size={13} className="inline mr-1" />}{r}
            </button>
          ))}
        </div>
      </Field>
      <Field label="Avatar color">
        <div className="flex gap-2">
          {PROJECT_COLORS.map((c) => (
            <button key={c} onClick={() => setColor(c)} className="w-7 h-7 rounded-full flex items-center justify-center"
              style={{ background: c, outline: color === c ? "2px solid #1e293b" : "none", outlineOffset: 2 }}>
              {color === c && <Check size={14} color="#fff" />}
            </button>
          ))}
        </div>
      </Field>
      <div className="flex gap-3 mt-2">
        {!isNew && <button onClick={remove} className="px-4 py-2.5 rounded-lg font-medium text-red-600 bg-red-50 hover:bg-red-100">Remove</button>}
        <button onClick={save} className="flex-1 py-2.5 rounded-lg text-white font-semibold" style={{ background: "#4f46e5" }}>{isNew ? "Add member" : "Save"}</button>
      </div>
    </Modal>
  );
}

/* ------------------------------------------------------------------ */
function EmptyState({ icon: Icon, text }) {
  return (
    <div className="bg-white rounded-2xl border border-dashed border-slate-200 py-16 flex flex-col items-center text-slate-400">
      <Icon size={32} className="mb-3" />
      <p className="text-sm">{text}</p>
    </div>
  );
}

function FontInjector() {
  return (
    <style>{`
      @import url('https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@400;500;600;700;800&display=swap');
      * { box-sizing: border-box; }
    `}</style>
  );
}
