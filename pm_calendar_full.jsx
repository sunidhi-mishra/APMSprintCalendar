import { useState, useCallback, useMemo, useEffect } from "react";

/* ═══════════════════════════════════════════════════════════════════
   FONTS & GLOBAL STYLES
═══════════════════════════════════════════════════════════════════ */
const GlobalStyles = () => (
  <style>{`
    @import url('https://fonts.googleapis.com/css2?family=Syne:wght@400;500;600;700;800&family=JetBrains+Mono:wght@400;500;600&family=Manrope:wght@400;500;600;700&display=swap');
    *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }
    body { background: #080b12; }
    ::-webkit-scrollbar { width: 4px; height: 4px; }
    ::-webkit-scrollbar-track { background: transparent; }
    ::-webkit-scrollbar-thumb { background: rgba(255,255,255,0.1); border-radius: 99px; }
    .day-cell:hover { border-color: rgba(255,255,255,0.18) !important; background: rgba(255,255,255,0.05) !important; }
    .icon-btn:hover { background: rgba(255,255,255,0.1) !important; }
    .task-row:hover { background: rgba(255,255,255,0.05) !important; }
    .section-chip:hover { opacity: 0.85; }
    .add-btn:hover { background: rgba(99,102,241,0.25) !important; }
    input:focus { outline: none; }
    textarea:focus { outline: none; }
    select:focus { outline: none; }
    @keyframes fadeSlideIn {
      from { opacity: 0; transform: translateX(18px); }
      to   { opacity: 1; transform: translateX(0); }
    }
    @keyframes fadeIn {
      from { opacity: 0; transform: translateY(6px); }
      to   { opacity: 1; transform: translateY(0); }
    }
    @keyframes scaleIn {
      from { opacity: 0; transform: scale(0.94); }
      to   { opacity: 1; transform: scale(1); }
    }
    .panel-enter { animation: fadeSlideIn 0.22s ease; }
    .modal-enter { animation: scaleIn 0.2s ease; }
    .fade-in     { animation: fadeIn 0.18s ease; }

    /* Scrollbar for the day-panel task list — more visible than the global style */
    .panel-scroll::-webkit-scrollbar       { width: 5px; }
    .panel-scroll::-webkit-scrollbar-track { background: rgba(255,255,255,0.03); border-radius: 99px; }
    .panel-scroll::-webkit-scrollbar-thumb { background: rgba(255,255,255,0.15); border-radius: 99px; }
    .panel-scroll::-webkit-scrollbar-thumb:hover { background: rgba(255,255,255,0.28); }

    /* Scrollbar inside the notes textarea */
    .notes-area::-webkit-scrollbar       { width: 4px; }
    .notes-area::-webkit-scrollbar-track { background: transparent; }
    .notes-area::-webkit-scrollbar-thumb { background: rgba(255,255,255,0.12); border-radius: 99px; }
    .notes-area::-webkit-scrollbar-thumb:hover { background: rgba(255,255,255,0.25); }
  `}</style>
);

/* ═══════════════════════════════════════════════════════════════════
   DEFAULT DATA
═══════════════════════════════════════════════════════════════════ */
const DEFAULT_SECTIONS = [
  { id: "s1", label: "Learn PM Theory Concepts",        icon: "📘", color: "#818cf8", sub: "PM Theory list including AI concepts"          },
  { id: "s2", label: "Learn Practical Implementation",  icon: "⚙️", color: "#38bdf8", sub: "Excel · SQL · PowerBI · Jira · Figma"          },
  { id: "s3", label: "Learn Something Related to AI",   icon: "🤖", color: "#c084fc", sub: "Vibe Coding using Antigravity"                 },
  { id: "s4", label: "Solve a Product Problem",         icon: "🧩", color: "#34d399", sub: "Document it properly & post on LinkedIn"       },
];

const WEEKEND_SECTIONS = [
  { id: "w1", label: "Revise All Concepts",             icon: "🔁", color: "#fbbf24", sub: "Go through notes and frameworks from the week" },
  { id: "w2", label: "Solve Interview Questions",       icon: "🎯", color: "#f87171", sub: "600 PM Interview Questions (Google Drive)"     },
  { id: "w3", label: "Study on Ayuda's Website",        icon: "📚", color: "#818cf8", sub: "Master PM | Ayuda by Malay Krishna"            },
];

const ICON_OPTIONS = ["📘","⚙️","🤖","🧩","🔁","🎯","📚","💡","🔥","✍️","📊","🧠","🎨","📝","🚀","🏆","⭐","🌟","💪","📌"];
const COLOR_OPTIONS = ["#818cf8","#38bdf8","#c084fc","#34d399","#fbbf24","#f87171","#fb923c","#a3e635","#22d3ee","#e879f9"];

/* ═══════════════════════════════════════════════════════════════════
   UTILITY FUNCTIONS
═══════════════════════════════════════════════════════════════════ */
const uid = () => Math.random().toString(36).slice(2, 9);

function getDaysInMonth(year, month) {
  return new Date(year, month + 1, 0).getDate();
}
function getFirstDayOfMonth(year, month) {
  return new Date(year, month, 1).getDay(); // 0=Sun
}
function isWeekend(year, month, day) {
  const d = new Date(year, month, day).getDay();
  return d === 0 || d === 6;
}
function dateKey(year, month, day) {
  return `${year}-${String(month + 1).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
}
function todayKey() {
  const n = new Date();
  return dateKey(n.getFullYear(), n.getMonth(), n.getDate());
}

const MONTH_NAMES = ["January","February","March","April","May","June","July","August","September","October","November","December"];
const DAY_NAMES   = ["Sun","Mon","Tue","Wed","Thu","Fri","Sat"];

// Given a date key like "2026-03-10" and the section history array, returns the weekday
// and weekend section lists that were active on that date.
// The history is a list of { from: "YYYY-MM-DD", weekday: [...], weekend: [...] } entries
// sorted oldest-first. We find the latest entry whose `from` is <= the day being queried.
// Simple ISO string comparison works perfectly here because the format is fixed-width.
function resolveGlobalSections(dKey, history) {
  let resolved = history[0]; // always start from the oldest as a safe fallback
  for (const entry of history) {
    if (entry.from <= dKey) resolved = entry;
    else break; // entries are sorted, so we can stop early
  }
  return { weekday: resolved.weekday, weekend: resolved.weekend };
}

/* ═══════════════════════════════════════════════════════════════════
   SMALL REUSABLE COMPONENTS
═══════════════════════════════════════════════════════════════════ */

// Circular progress ring
function Ring({ pct, size = 44, stroke = 3.5, color = "#818cf8", label }) {
  const r = (size - stroke * 2) / 2;
  const circ = 2 * Math.PI * r;
  const offset = circ * (1 - pct / 100);
  return (
    <div style={{ position: "relative", width: size, height: size, flexShrink: 0 }}>
      <svg width={size} height={size} style={{ transform: "rotate(-90deg)" }}>
        <circle cx={size/2} cy={size/2} r={r} fill="none" stroke="rgba(255,255,255,0.07)" strokeWidth={stroke} />
        <circle cx={size/2} cy={size/2} r={r} fill="none" stroke={pct === 100 ? "#34d399" : color}
          strokeWidth={stroke} strokeDasharray={circ} strokeDashoffset={offset}
          strokeLinecap="round" style={{ transition: "stroke-dashoffset 0.4s ease, stroke 0.3s" }} />
      </svg>
      {label && (
        <div style={{ position:"absolute", inset:0, display:"flex", alignItems:"center", justifyContent:"center",
          fontSize: size < 36 ? "9px" : "11px", fontWeight:700, color:"#f1f5f9",
          fontFamily:"'JetBrains Mono', monospace" }}>
          {label}
        </div>
      )}
    </div>
  );
}

// Icon button
function IconBtn({ onClick, children, title, danger = false }) {
  return (
    <button className="icon-btn" onClick={onClick} title={title} style={{
      background: "transparent", border: "none", cursor: "pointer",
      width: 28, height: 28, borderRadius: 7, display:"flex", alignItems:"center", justifyContent:"center",
      color: danger ? "#f87171" : "#94a3b8", fontSize: 14, transition: "background 0.15s",
    }}>{children}</button>
  );
}

// Pill tag for section color
function ColorDot({ color }) {
  return <div style={{ width:10, height:10, borderRadius:"50%", background:color, flexShrink:0 }} />;
}

/* ═══════════════════════════════════════════════════════════════════
   MODAL WRAPPER
═══════════════════════════════════════════════════════════════════ */
function Modal({ onClose, children, title, width = 480 }) {
  return (
    <div style={{
      position:"fixed", inset:0, background:"rgba(0,0,0,0.7)", backdropFilter:"blur(4px)",
      display:"flex", alignItems:"center", justifyContent:"center", zIndex:1000, padding:20,
    }} onClick={onClose}>
      <div className="modal-enter" onClick={e => e.stopPropagation()} style={{
        background:"#131720", border:"1px solid rgba(255,255,255,0.1)",
        borderRadius:16, width:"100%", maxWidth:width, maxHeight:"90vh",
        overflow:"auto", boxShadow:"0 25px 60px rgba(0,0,0,0.6)",
      }}>
        <div style={{ padding:"20px 20px 0", display:"flex", alignItems:"center", justifyContent:"space-between" }}>
          <div style={{ fontSize:16, fontWeight:700, color:"#f1f5f9", fontFamily:"'Syne',sans-serif" }}>{title}</div>
          <IconBtn onClick={onClose}>✕</IconBtn>
        </div>
        <div style={{ padding:20 }}>{children}</div>
      </div>
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════════════
   SECTION EDITOR MODAL  (add / edit a section)
═══════════════════════════════════════════════════════════════════ */
function SectionEditorModal({ initial, onSave, onClose }) {
  const [label, setLabel] = useState(initial?.label || "");
  const [sub,   setSub]   = useState(initial?.sub   || "");
  const [icon,  setIcon]  = useState(initial?.icon  || "📘");
  const [color, setColor] = useState(initial?.color || "#818cf8");

  const inputStyle = {
    width:"100%", background:"rgba(255,255,255,0.05)", border:"1px solid rgba(255,255,255,0.1)",
    borderRadius:8, padding:"9px 12px", color:"#f1f5f9", fontSize:13,
    fontFamily:"'Manrope',sans-serif", marginBottom:10,
  };

  return (
    <Modal onClose={onClose} title={initial ? "Edit Section" : "Add New Section"} width={420}>
      <div style={{ fontSize:11, color:"#64748b", fontFamily:"'JetBrains Mono',monospace", marginBottom:14 }}>
        SECTION DETAILS
      </div>

      <input style={inputStyle} placeholder="Section label (e.g. Learn PM Theory)"
        value={label} onChange={e => setLabel(e.target.value)} />
      <input style={inputStyle} placeholder="Subtitle / description"
        value={sub} onChange={e => setSub(e.target.value)} />

      {/* Icon picker */}
      <div style={{ fontSize:11, color:"#64748b", fontFamily:"'JetBrains Mono',monospace", marginBottom:8 }}>ICON</div>
      <div style={{ display:"flex", flexWrap:"wrap", gap:6, marginBottom:14 }}>
        {ICON_OPTIONS.map(ic => (
          <button key={ic} onClick={() => setIcon(ic)} style={{
            fontSize:18, background: icon===ic ? "rgba(129,140,248,0.25)" : "rgba(255,255,255,0.05)",
            border: icon===ic ? "1px solid #818cf8" : "1px solid transparent",
            borderRadius:8, width:36, height:36, cursor:"pointer",
          }}>{ic}</button>
        ))}
      </div>

      {/* Color picker */}
      <div style={{ fontSize:11, color:"#64748b", fontFamily:"'JetBrains Mono',monospace", marginBottom:8 }}>COLOR</div>
      <div style={{ display:"flex", flexWrap:"wrap", gap:8, marginBottom:20 }}>
        {COLOR_OPTIONS.map(c => (
          <div key={c} onClick={() => setColor(c)} style={{
            width:26, height:26, borderRadius:"50%", background:c, cursor:"pointer",
            border: color===c ? "2px solid white" : "2px solid transparent",
            boxShadow: color===c ? `0 0 0 2px ${c}55` : "none",
            transition:"all 0.15s",
          }} />
        ))}
      </div>

      <button onClick={() => { if(label.trim()) onSave({ label:label.trim(), sub:sub.trim(), icon, color }); }} style={{
        width:"100%", padding:"10px", borderRadius:10, border:"none",
        background: label.trim() ? "#6366f1" : "#2d3748",
        color: label.trim() ? "white" : "#64748b",
        fontSize:14, fontWeight:700, cursor: label.trim() ? "pointer" : "not-allowed",
        fontFamily:"'Syne',sans-serif", transition:"background 0.2s",
      }}>
        {initial ? "Save Changes" : "Add Section"}
      </button>
    </Modal>
  );
}

/* ═══════════════════════════════════════════════════════════════════
   MANAGE SECTIONS MODAL
═══════════════════════════════════════════════════════════════════ */
function ManageSectionsModal({ weekdaySections, weekendSections, onSave, onClose }) {
  const [editing, setEditing] = useState(null);
  const [adding,  setAdding]  = useState(null);

  function handleSave(data) {
    if (adding) {
      const sec = { id: uid(), ...data };
      if (adding === "weekday") onSave([...weekdaySections, sec], weekendSections);
      else                      onSave(weekdaySections, [...weekendSections, sec]);
      setAdding(null);
    } else if (editing) {
      if (editing.type === "weekday") {
        onSave(weekdaySections.map((s,i) => i===editing.idx ? {...s,...data} : s), weekendSections);
      } else {
        onSave(weekdaySections, weekendSections.map((s,i) => i===editing.idx ? {...s,...data} : s));
      }
      setEditing(null);
    }
  }

  function handleDelete(type, idx) {
    if (type === "weekday") onSave(weekdaySections.filter((_,i) => i !== idx), weekendSections);
    else                    onSave(weekdaySections, weekendSections.filter((_,i) => i !== idx));
  }

  const rowStyle = { display:"flex", alignItems:"center", gap:10, padding:"9px 10px",
    borderRadius:9, background:"rgba(255,255,255,0.03)", marginBottom:6, border:"1px solid rgba(255,255,255,0.06)" };

  const SectionList = ({ list, type, label }) => (
    <div style={{ marginBottom:20 }}>
      <div style={{ fontSize:11, color:"#64748b", fontFamily:"'JetBrains Mono',monospace", marginBottom:10 }}>{label}</div>
      {list.map((s, i) => (
        <div key={s.id} style={rowStyle}>
          <span style={{ fontSize:15 }}>{s.icon}</span>
          <ColorDot color={s.color} />
          <div style={{ flex:1, minWidth:0 }}>
            <div style={{ fontSize:12, color:"#e2e8f0", fontFamily:"'Manrope',sans-serif", fontWeight:600,
              whiteSpace:"nowrap", overflow:"hidden", textOverflow:"ellipsis" }}>{s.label}</div>
            {s.sub && <div style={{ fontSize:10, color:"#475569", fontFamily:"'Manrope',sans-serif" }}>{s.sub}</div>}
          </div>
          <IconBtn onClick={() => setEditing({ type, idx:i, data:s })} title="Edit">✏️</IconBtn>
          <IconBtn danger onClick={() => handleDelete(type, i)} title="Delete">🗑</IconBtn>
        </div>
      ))}
      <button className="add-btn" onClick={() => setAdding(type)} style={{
        width:"100%", padding:"8px", borderRadius:9, border:"1px dashed rgba(99,102,241,0.4)",
        background:"rgba(99,102,241,0.07)", color:"#818cf8", fontSize:12, fontWeight:600,
        cursor:"pointer", fontFamily:"'Manrope',sans-serif", transition:"background 0.15s",
      }}>+ Add Section</button>
    </div>
  );

  if (editing || adding) {
    return <SectionEditorModal
      initial={editing?.data || null}
      onSave={handleSave}
      onClose={() => { setEditing(null); setAdding(null); }}
    />;
  }

  return (
    <Modal onClose={onClose} title="Manage Sections" width={460}>
      <SectionList list={weekdaySections} type="weekday" label="WEEKDAY SECTIONS (MON–FRI)" />
      <SectionList list={weekendSections} type="weekend" label="WEEKEND SECTIONS (SAT–SUN)" />
    </Modal>
  );
}

/* ═══════════════════════════════════════════════════════════════════
   DAY DETAIL PANEL  (right panel when a day is clicked)
═══════════════════════════════════════════════════════════════════ */
function DayPanel({ dKey, date, year, month, activeSections,
                    checks, customTasks, notes, onToggle, onAddCustom, onDeleteCustom,
                    onToggleCustom, onEditCustom, onEditDaySection, onDeleteDaySection,
                    onSetNote, onClose }) {
  const [editingId,      setEditingId]      = useState(null);
  const [editTaskData,   setEditTaskData]   = useState({});
  const [editSecId,      setEditSecId]      = useState(null);
  const [editSecData,    setEditSecData]    = useState({});
  const [confirmDelSec,  setConfirmDelSec]  = useState(null);
  const [hoveredSecId,   setHoveredSecId]   = useState(null);
  // New rich task form state
  const [showAddForm,    setShowAddForm]    = useState(false);
  const [newTaskData,    setNewTaskData]    = useState({ label:"", sub:"", icon:"💡", color:"#818cf8" });

  const weekend = isWeekend(year, month, date);

  const dayChecks   = checks[dKey]      || {};
  const dayCustom   = customTasks[dKey] || [];

  const sectionDone = activeSections.filter(s => dayChecks[s.id]).length;
  const customDone  = dayCustom.filter(t => t.done).length;
  const total       = activeSections.length + dayCustom.length;
  const done        = sectionDone + customDone;
  const pct         = total === 0 ? 0 : Math.round((done / total) * 100);

  const dayNames    = ["Sunday","Monday","Tuesday","Wednesday","Thursday","Friday","Saturday"];
  const dayOfWeek   = new Date(year, month, date).getDay();

  const inputStyle = {
    flex:1, background:"rgba(255,255,255,0.05)", border:"1px solid rgba(255,255,255,0.1)",
    borderRadius:8, padding:"8px 10px", color:"#f1f5f9", fontSize:12,
    fontFamily:"'Manrope',sans-serif",
  };

  function startEditSection(sec) {
    setEditSecId(sec.id);
    setEditSecData({ label: sec.label, sub: sec.sub || "", icon: sec.icon, color: sec.color });
  }

  function saveEditSection(secId) {
    if (editSecData.label.trim()) {
      // Pass activeSections so the parent can initialise this day's copy from the global
      // template if it hasn't been customised yet — without needing to re-derive it.
      onEditDaySection(dKey, secId, editSecData, activeSections);
    }
    setEditSecId(null);
  }

  return (
    <div className="panel-enter" style={{
      width:350, flexShrink:0, background:"#0e1420",
      borderLeft:"1px solid rgba(255,255,255,0.08)",
      display:"flex", flexDirection:"column", height:"100%", overflow:"hidden",
    }}>
      {/* Panel header */}
      <div style={{ padding:"18px 18px 14px", borderBottom:"1px solid rgba(255,255,255,0.07)" }}>
        <div style={{ display:"flex", alignItems:"flex-start", justifyContent:"space-between" }}>
          <div>
            <div style={{ fontSize:11, color: weekend ? "#fbbf24" : "#818cf8",
              fontFamily:"'JetBrains Mono',monospace", letterSpacing:"0.1em", marginBottom:2 }}>
              {weekend ? "WEEKEND" : "WEEKDAY"} · {dayNames[dayOfWeek].toUpperCase()}
            </div>
            <div style={{ fontSize:26, fontWeight:800, color:"#f1f5f9", fontFamily:"'Syne',sans-serif", lineHeight:1 }}>
              {String(date).padStart(2,"0")}
              <span style={{ fontSize:14, fontWeight:500, color:"#475569", marginLeft:6 }}>
                {MONTH_NAMES[month]} {year}
              </span>
            </div>
          </div>
          <div style={{ display:"flex", alignItems:"center", gap:10 }}>
            <Ring pct={pct} size={52} stroke={4}
              color={weekend ? "#fbbf24" : "#818cf8"}
              label={`${pct}%`} />
            <IconBtn onClick={onClose} title="Close">✕</IconBtn>
          </div>
        </div>

        {/* Mini stats */}
        <div style={{ display:"flex", gap:12, marginTop:12 }}>
          {[
            { label:"DONE",    val: done,           color:"#34d399" },
            { label:"TOTAL",   val: total,          color:"#94a3b8" },
            { label:"LEFT",    val: total - done,   color:"#f87171" },
          ].map(({ label, val, color }) => (
            <div key={label} style={{ flex:1, background:"rgba(255,255,255,0.04)",
              borderRadius:8, padding:"7px 10px", textAlign:"center" }}>
              <div style={{ fontSize:18, fontWeight:700, color, fontFamily:"'JetBrains Mono',monospace" }}>{val}</div>
              <div style={{ fontSize:9, color:"#475569", fontFamily:"'JetBrains Mono',monospace", letterSpacing:"0.1em" }}>{label}</div>
            </div>
          ))}
        </div>
      </div>

      {/* Task list — flex:1 + minHeight:0 is the key combo for scrolling inside a flex column.
          Without minHeight:0, flex children expand past their container and overflow never fires. */}
      <div className="panel-scroll" style={{ flex:1, minHeight:0, overflowY:"auto", padding:"14px 18px" }}>

        {/* Sections label — clean, no status pill */}
        <div style={{ fontSize:10, color:"#475569", fontFamily:"'JetBrains Mono',monospace",
          letterSpacing:"0.1em", marginBottom:8 }}>SECTIONS</div>

        {activeSections.map(sec => {
          const checked  = !!dayChecks[sec.id];
          const isEditing = editSecId === sec.id;
          const isHovered = hoveredSecId === sec.id;
          const pendingDel = confirmDelSec === sec.id;

          // ── Inline edit mode ──────────────────────────────────
          if (isEditing) {
            return (
              <div key={sec.id} className="fade-in" style={{
                borderRadius:10, marginBottom:6, padding:"10px",
                background:"rgba(99,102,241,0.1)", border:"1px solid rgba(99,102,241,0.35)",
              }}>
                {/* Icon + color row */}
                <div style={{ display:"flex", gap:6, marginBottom:8, flexWrap:"wrap" }}>
                  {ICON_OPTIONS.slice(0,10).map(ic => (
                    <button key={ic} onClick={() => setEditSecData(d => ({...d, icon:ic}))} style={{
                      fontSize:14, background: editSecData.icon===ic ? "rgba(129,140,248,0.3)" : "rgba(255,255,255,0.05)",
                      border: editSecData.icon===ic ? "1px solid #818cf8" : "1px solid transparent",
                      borderRadius:6, width:28, height:28, cursor:"pointer",
                    }}>{ic}</button>
                  ))}
                </div>
                <div style={{ display:"flex", gap:5, marginBottom:8, flexWrap:"wrap" }}>
                  {COLOR_OPTIONS.map(c => (
                    <div key={c} onClick={() => setEditSecData(d => ({...d, color:c}))} style={{
                      width:18, height:18, borderRadius:"50%", background:c, cursor:"pointer",
                      border: editSecData.color===c ? "2px solid white" : "2px solid transparent",
                      transition:"all 0.12s",
                    }} />
                  ))}
                </div>
                <input value={editSecData.label}
                  onChange={e => setEditSecData(d => ({...d, label: e.target.value}))}
                  onKeyDown={e => { if(e.key==="Enter") saveEditSection(sec.id); if(e.key==="Escape") setEditSecId(null); }}
                  placeholder="Section label"
                  style={{...inputStyle, width:"100%", marginBottom:6, fontSize:12}} autoFocus />
                <input value={editSecData.sub}
                  onChange={e => setEditSecData(d => ({...d, sub: e.target.value}))}
                  onKeyDown={e => { if(e.key==="Enter") saveEditSection(sec.id); if(e.key==="Escape") setEditSecId(null); }}
                  placeholder="Subtitle (optional)"
                  style={{...inputStyle, width:"100%", marginBottom:8, fontSize:11}} />
                <div style={{ display:"flex", gap:6 }}>
                  <button onClick={() => saveEditSection(sec.id)} style={{
                    flex:1, padding:"6px", borderRadius:7, border:"none", background:"#6366f1",
                    color:"white", fontSize:11, fontWeight:700, cursor:"pointer", fontFamily:"'Manrope',sans-serif",
                  }}>Save</button>
                  <button onClick={() => setEditSecId(null)} style={{
                    flex:1, padding:"6px", borderRadius:7, border:"1px solid rgba(255,255,255,0.1)",
                    background:"transparent", color:"#94a3b8", fontSize:11, cursor:"pointer", fontFamily:"'Manrope',sans-serif",
                  }}>Cancel</button>
                </div>
              </div>
            );
          }

          // ── Delete confirm mode ───────────────────────────────
          if (pendingDel) {
            return (
              <div key={sec.id} className="fade-in" style={{
                borderRadius:10, marginBottom:6, padding:"10px 12px",
                background:"rgba(248,113,113,0.08)", border:"1px solid rgba(248,113,113,0.3)",
              }}>
                <div style={{ fontSize:11, color:"#fca5a5", fontFamily:"'Manrope',sans-serif", marginBottom:8 }}>
                  Delete <strong>"{sec.label}"</strong>? This removes it from this day only.
                </div>
                <div style={{ display:"flex", gap:6 }}>
                  <button onClick={() => { onDeleteDaySection(dKey, sec.id, activeSections); setConfirmDelSec(null); }} style={{
                    flex:1, padding:"5px", borderRadius:7, border:"none", background:"#ef4444",
                    color:"white", fontSize:11, fontWeight:700, cursor:"pointer", fontFamily:"'Manrope',sans-serif",
                  }}>Delete</button>
                  <button onClick={() => setConfirmDelSec(null)} style={{
                    flex:1, padding:"5px", borderRadius:7, border:"1px solid rgba(255,255,255,0.1)",
                    background:"transparent", color:"#94a3b8", fontSize:11, cursor:"pointer", fontFamily:"'Manrope',sans-serif",
                  }}>Cancel</button>
                </div>
              </div>
            );
          }

          // ── Normal display mode ───────────────────────────────
          return (
            <div key={sec.id}
              onMouseEnter={() => setHoveredSecId(sec.id)}
              onMouseLeave={() => setHoveredSecId(null)}
              style={{ display:"flex", alignItems:"flex-start", gap:8, padding:"9px 10px",
                borderRadius:10, marginBottom:6, transition:"background 0.12s",
                background: checked ? `${sec.color}18` : isHovered ? "rgba(255,255,255,0.04)" : "rgba(255,255,255,0.02)",
                border:`1px solid ${checked ? sec.color+"40" : isHovered ? "rgba(255,255,255,0.1)" : "rgba(255,255,255,0.06)"}`,
              }}>
              {/* Checkbox — toggle on click */}
              <div onClick={() => onToggle(dKey, sec.id)} style={{
                width:17, height:17, borderRadius:5, border:`2px solid ${checked ? sec.color : "rgba(255,255,255,0.2)"}`,
                background: checked ? sec.color : "transparent", flexShrink:0, marginTop:2, cursor:"pointer",
                display:"flex", alignItems:"center", justifyContent:"center", transition:"all 0.15s",
              }}>
                {checked && <svg width="9" height="7" viewBox="0 0 9 7"><path d="M1 3.5L3 6L8 1" stroke="white" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" fill="none"/></svg>}
              </div>

              {/* Label + sub */}
              <div style={{ flex:1, minWidth:0, cursor:"pointer" }} onClick={() => onToggle(dKey, sec.id)}>
                <div style={{ fontSize:12, fontWeight:600, color: checked ? "#f1f5f9" : "#94a3b8",
                  fontFamily:"'Manrope',sans-serif", lineHeight:1.3 }}>
                  <span style={{ marginRight:5 }}>{sec.icon}</span>{sec.label}
                </div>
                {sec.sub && <div style={{ fontSize:10.5, color: checked ? sec.color : "#475569",
                  fontFamily:"'Manrope',sans-serif", marginTop:2 }}>{sec.sub}</div>}
              </div>

              {/* Edit / delete — visible on hover */}
              <div style={{ display:"flex", gap:0, opacity: isHovered ? 1 : 0, transition:"opacity 0.15s", flexShrink:0 }}>
                <IconBtn onClick={() => startEditSection(sec)} title="Edit section (all days)">✏️</IconBtn>
                <IconBtn danger onClick={() => setConfirmDelSec(sec.id)} title="Delete section (all days)">🗑</IconBtn>
              </div>
            </div>
          );
        })}

        {/* Custom tasks */}
        {dayCustom.length > 0 && (
          <>
            <div style={{ fontSize:10, color:"#475569", fontFamily:"'JetBrains Mono',monospace",
              letterSpacing:"0.1em", margin:"14px 0 8px" }}>CUSTOM TASKS</div>
            {dayCustom.map(task => {
              const tc = task.color || "#818cf8";
              const isEditing = editingId === task.id;
              return (
                <div key={task.id} style={{
                  borderRadius:10, marginBottom:6,
                  background: isEditing ? "rgba(99,102,241,0.1)" : task.done ? `${tc}12` : "rgba(255,255,255,0.02)",
                  border: `1px solid ${isEditing ? "rgba(99,102,241,0.35)" : task.done ? tc+"40" : "rgba(255,255,255,0.06)"}`,
                  transition:"background 0.12s",
                }}>
                  {isEditing ? (
                    // ── Inline edit form for custom task ──────────────
                    <div style={{ padding:"10px" }}>
                      <div style={{ display:"flex", gap:5, marginBottom:7, flexWrap:"wrap" }}>
                        {ICON_OPTIONS.slice(0,10).map(ic => (
                          <button key={ic} onClick={() => setEditTaskData(d => ({...d, icon:ic}))} style={{
                            fontSize:14, background: editTaskData.icon===ic ? "rgba(129,140,248,0.3)" : "rgba(255,255,255,0.05)",
                            border: editTaskData.icon===ic ? "1px solid #818cf8" : "1px solid transparent",
                            borderRadius:6, width:28, height:28, cursor:"pointer",
                          }}>{ic}</button>
                        ))}
                      </div>
                      <div style={{ display:"flex", gap:5, marginBottom:7, flexWrap:"wrap" }}>
                        {COLOR_OPTIONS.map(c => (
                          <div key={c} onClick={() => setEditTaskData(d => ({...d, color:c}))} style={{
                            width:18, height:18, borderRadius:"50%", background:c, cursor:"pointer",
                            border: editTaskData.color===c ? "2px solid white" : "2px solid transparent",
                            transition:"all 0.12s",
                          }} />
                        ))}
                      </div>
                      <input value={editTaskData.label||""}
                        onChange={e => setEditTaskData(d => ({...d, label:e.target.value}))}
                        placeholder="Task label"
                        style={{...inputStyle, width:"100%", marginBottom:5, fontSize:12}} autoFocus />
                      <input value={editTaskData.sub||""}
                        onChange={e => setEditTaskData(d => ({...d, sub:e.target.value}))}
                        placeholder="Subtitle (optional)"
                        style={{...inputStyle, width:"100%", marginBottom:8, fontSize:11}} />
                      <div style={{ display:"flex", gap:6 }}>
                        <button onClick={() => { if(editTaskData.label?.trim()){ onEditCustom(dKey, task.id, editTaskData); } setEditingId(null); }} style={{
                          flex:1, padding:"6px", borderRadius:7, border:"none", background:"#6366f1",
                          color:"white", fontSize:11, fontWeight:700, cursor:"pointer", fontFamily:"'Manrope',sans-serif",
                        }}>Save</button>
                        <button onClick={() => setEditingId(null)} style={{
                          flex:1, padding:"6px", borderRadius:7, border:"1px solid rgba(255,255,255,0.1)",
                          background:"transparent", color:"#94a3b8", fontSize:11, cursor:"pointer", fontFamily:"'Manrope',sans-serif",
                        }}>Cancel</button>
                      </div>
                    </div>
                  ) : (
                    // ── Normal display row ─────────────────────────────
                    <div className="task-row" style={{ display:"flex", alignItems:"flex-start", gap:9, padding:"9px 10px" }}>
                      <div onClick={() => onToggleCustom(dKey, task.id)} style={{
                        width:16, height:16, borderRadius:4, border:`2px solid ${task.done ? tc : "rgba(255,255,255,0.2)"}`,
                        background: task.done ? tc : "transparent", flexShrink:0, marginTop:2, cursor:"pointer",
                        display:"flex", alignItems:"center", justifyContent:"center", transition:"all 0.15s",
                      }}>
                        {task.done && <svg width="8" height="6" viewBox="0 0 8 6"><path d="M1 3L3 5.5L7.5 1" stroke="white" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" fill="none"/></svg>}
                      </div>
                      <div style={{ flex:1, minWidth:0, cursor:"pointer" }} onClick={() => onToggleCustom(dKey, task.id)}>
                        <div style={{ fontSize:12, fontWeight:600,
                          color: task.done ? "#475569" : "#e2e8f0",
                          textDecoration: task.done ? "line-through" : "none",
                          fontFamily:"'Manrope',sans-serif", lineHeight:1.3 }}>
                          {task.icon && <span style={{ marginRight:5 }}>{task.icon}</span>}
                          {task.label}
                        </div>
                        {task.sub && <div style={{ fontSize:10.5, color: task.done ? "#374151" : tc,
                          fontFamily:"'Manrope',sans-serif", marginTop:2 }}>{task.sub}</div>}
                      </div>
                      <div style={{ display:"flex", gap:0, flexShrink:0 }}>
                        <IconBtn onClick={() => { setEditingId(task.id); setEditTaskData({label:task.label,sub:task.sub||"",icon:task.icon||"💡",color:task.color||"#818cf8"}); }} title="Edit">✏️</IconBtn>
                        <IconBtn danger onClick={() => onDeleteCustom(dKey, task.id)} title="Delete">✕</IconBtn>
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </>
        )}

        {/* ── Add Custom Task — rich form with icon, color, subtitle ── */}
        <div style={{ marginTop:14 }}>
          <div style={{ display:"flex", alignItems:"center", justifyContent:"space-between", marginBottom:8 }}>
            <div style={{ fontSize:10, color:"#475569", fontFamily:"'JetBrains Mono',monospace", letterSpacing:"0.1em" }}>
              ADD CUSTOM TASK
            </div>
            {!showAddForm && (
              <button onClick={() => setShowAddForm(true)} style={{
                fontSize:10, color:"#818cf8", background:"rgba(99,102,241,0.1)",
                border:"1px solid rgba(99,102,241,0.25)", borderRadius:5,
                padding:"2px 8px", cursor:"pointer", fontFamily:"'Manrope',sans-serif", fontWeight:700,
              }}>+ New</button>
            )}
          </div>

          {showAddForm ? (
            <div className="fade-in" style={{
              borderRadius:10, padding:"12px",
              background:"rgba(99,102,241,0.08)", border:"1px solid rgba(99,102,241,0.25)",
            }}>
              {/* Icon picker */}
              <div style={{ fontSize:9, color:"#6366f1", fontFamily:"'JetBrains Mono',monospace", letterSpacing:"0.1em", marginBottom:6 }}>ICON</div>
              <div style={{ display:"flex", gap:5, marginBottom:10, flexWrap:"wrap" }}>
                {ICON_OPTIONS.map(ic => (
                  <button key={ic} onClick={() => setNewTaskData(d => ({...d, icon:ic}))} style={{
                    fontSize:15, background: newTaskData.icon===ic ? "rgba(129,140,248,0.3)" : "rgba(255,255,255,0.05)",
                    border: newTaskData.icon===ic ? "1px solid #818cf8" : "1px solid transparent",
                    borderRadius:7, width:30, height:30, cursor:"pointer",
                  }}>{ic}</button>
                ))}
              </div>
              {/* Color picker */}
              <div style={{ fontSize:9, color:"#6366f1", fontFamily:"'JetBrains Mono',monospace", letterSpacing:"0.1em", marginBottom:6 }}>COLOR</div>
              <div style={{ display:"flex", gap:7, marginBottom:10, flexWrap:"wrap" }}>
                {COLOR_OPTIONS.map(c => (
                  <div key={c} onClick={() => setNewTaskData(d => ({...d, color:c}))} style={{
                    width:20, height:20, borderRadius:"50%", background:c, cursor:"pointer",
                    border: newTaskData.color===c ? "2px solid white" : "2px solid transparent",
                    boxShadow: newTaskData.color===c ? `0 0 0 2px ${c}55` : "none",
                    transition:"all 0.12s",
                  }} />
                ))}
              </div>
              {/* Label input */}
              <input
                value={newTaskData.label}
                onChange={e => setNewTaskData(d => ({...d, label:e.target.value}))}
                placeholder="Task label (required)"
                style={{...inputStyle, width:"100%", marginBottom:6, fontSize:12}}
                autoFocus
              />
              {/* Subtitle input */}
              <input
                value={newTaskData.sub}
                onChange={e => setNewTaskData(d => ({...d, sub:e.target.value}))}
                placeholder="Subtitle / description (optional)"
                style={{...inputStyle, width:"100%", marginBottom:10, fontSize:11}}
              />
              {/* Buttons */}
              <div style={{ display:"flex", gap:7 }}>
                <button onClick={() => {
                  if (newTaskData.label.trim()) {
                    onAddCustom(dKey, { label: newTaskData.label.trim(), sub: newTaskData.sub.trim(), icon: newTaskData.icon, color: newTaskData.color });
                    setNewTaskData({ label:"", sub:"", icon:"💡", color:"#818cf8" });
                    setShowAddForm(false);
                  }
                }} style={{
                  flex:1, padding:"8px", borderRadius:8, border:"none",
                  background: newTaskData.label.trim() ? "#6366f1" : "#2d3748",
                  color: newTaskData.label.trim() ? "white" : "#64748b",
                  fontSize:12, fontWeight:700, cursor: newTaskData.label.trim() ? "pointer" : "not-allowed",
                  fontFamily:"'Syne',sans-serif", transition:"background 0.15s",
                }}>Add Task</button>
                <button onClick={() => { setShowAddForm(false); setNewTaskData({ label:"", sub:"", icon:"💡", color:"#818cf8" }); }} style={{
                  flex:1, padding:"8px", borderRadius:8,
                  border:"1px solid rgba(255,255,255,0.1)", background:"transparent",
                  color:"#64748b", fontSize:12, cursor:"pointer", fontFamily:"'Manrope',sans-serif",
                }}>Cancel</button>
              </div>
            </div>
          ) : (
            <button onClick={() => setShowAddForm(true)} style={{
              width:"100%", padding:"9px", borderRadius:9,
              border:"1px dashed rgba(99,102,241,0.3)", background:"rgba(99,102,241,0.05)",
              color:"#64748b", fontSize:12, cursor:"pointer", fontFamily:"'Manrope',sans-serif",
              transition:"all 0.15s",
            }}>Click "+ New" or tap here to add a custom task…</button>
          )}
        </div>

        {/* ── NOTES ─────────────────────────────────────────────
            A free-form text area for daily thoughts, observations,
            or anything that doesn't fit a checkbox.               */}
        <div style={{ marginTop:20, paddingTop:16,
          borderTop:"1px solid rgba(255,255,255,0.06)" }}>
          <div style={{ fontSize:10, color:"#475569",
            fontFamily:"'JetBrains Mono',monospace",
            letterSpacing:"0.1em", marginBottom:8 }}>NOTES</div>

          {/* The wrapper owns the border + scroll — textarea never grows the panel */}
          <div style={{
            maxHeight:160, overflowY:"auto",
            borderRadius:10, border:"1px solid rgba(255,255,255,0.08)",
            background:"rgba(255,255,255,0.03)", transition:"border-color 0.15s",
          }}
            onFocusCapture={e => e.currentTarget.style.borderColor = "rgba(99,102,241,0.45)"}
            onBlurCapture={e  => e.currentTarget.style.borderColor = "rgba(255,255,255,0.08)"}
          >
            <textarea
              value={notes[dKey] || ""}
              onChange={e => onSetNote(dKey, e.target.value)}
              placeholder="Jot down anything for this day — reflections, blockers, ideas, learnings…"
              style={{
                width:"100%", background:"transparent", border:"none", borderRadius:10,
                padding:"10px 12px", color:"#e2e8f0", fontSize:12,
                fontFamily:"'Manrope',sans-serif", lineHeight:1.6,
                resize:"none", minHeight:90, outline:"none", display:"block",
              }}
            />
          </div>

          {notes[dKey] && (
            <div style={{ textAlign:"right", fontSize:9,
              color:"#374151", fontFamily:"'JetBrains Mono',monospace", marginTop:4 }}>
              {notes[dKey].length} chars
            </div>
          )}
        </div>

      </div>  {/* end scroll container */}
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════════════
   MAIN APP
═══════════════════════════════════════════════════════════════════ */
export default function PMCalendar() {
  const now = new Date();
  const [viewYear,  setViewYear]  = useState(now.getFullYear());
  const [viewMonth, setViewMonth] = useState(now.getMonth());

  const [sectionHistory, setSectionHistory] = useState([
    { from: "0000-01-01", weekday: DEFAULT_SECTIONS, weekend: WEEKEND_SECTIONS }
  ]);
  const [daySections,  setDaySections]  = useState({});
  const [checks,      setChecks]      = useState({});
  const [customTasks, setCustomTasks] = useState({});
  const [notes,       setNotes]       = useState({});  // { dateKey: string }
  const [selectedDay, setSelectedDay] = useState(null);
  const [showManage,  setShowManage]  = useState(false);

  // loading = true while we wait for storage reads to complete on first mount.
  // We render a splash screen during this time so the user never sees a flash
  // of default data being replaced by their real saved data.
  const [loading, setLoading] = useState(true);
  // saveStatus gives the user a subtle visual confirmation that their data was saved.
  const [saveStatus, setSaveStatus] = useState("idle"); // "idle" | "saving" | "saved"

  // ── STARTUP: hydrate all state from persistent storage ──────────
  // This runs exactly once, when the component first mounts.
  // We read all four keys in parallel using Promise.all for speed,
  // then set each piece of state from the stored value if it exists,
  // or leave it at the default if the key was never written before.
  useEffect(() => {
    async function loadFromStorage() {
      try {
        const [sh, ds, ch, ct, nt] = await Promise.all([
          window.storage.get("pm:sectionHistory").catch(() => null),
          window.storage.get("pm:daySections").catch(()   => null),
          window.storage.get("pm:checks").catch(()        => null),
          window.storage.get("pm:customTasks").catch(()   => null),
          window.storage.get("pm:notes").catch(()         => null),
        ]);
        if (sh) setSectionHistory(JSON.parse(sh.value));
        if (ds) setDaySections(JSON.parse(ds.value));
        if (ch) setChecks(JSON.parse(ch.value));
        if (ct) setCustomTasks(JSON.parse(ct.value));
        if (nt) setNotes(JSON.parse(nt.value));
      } catch (err) {
        // If storage is unavailable or data is corrupt, we silently fall back
        // to the defaults already set above — the app still works, just starts fresh.
        console.warn("Storage read failed, starting fresh:", err);
      } finally {
        // Always clear the loading screen, whether the read succeeded or not.
        setLoading(false);
      }
    }
    loadFromStorage();
  }, []); // empty deps = run once on mount only

  // ── Calendar shape ─────────────────────────────────────────────
  const daysInMonth = getDaysInMonth(viewYear, viewMonth);
  const firstDay    = getFirstDayOfMonth(viewYear, viewMonth);
  const today       = todayKey();

  // Fill grid with null (empty slots) + day numbers
  const gridDays = useMemo(() => {
    const cells = [];
    for (let i = 0; i < firstDay; i++) cells.push(null);
    for (let d = 1; d <= daysInMonth; d++) cells.push(d);
    while (cells.length % 7 !== 0) cells.push(null);
    return cells;
  }, [viewYear, viewMonth, daysInMonth, firstDay]);

  // Resolves which section list applies to a given day, respecting both the
  // versioned global template and any per-day overrides on top of it.
  function getEffectiveSections(dKey) {
    if (daySections[dKey]) return daySections[dKey]; // per-day override takes priority
    const weekend = isWeekend(...dKey.split("-").map((v,i) => i===1 ? Number(v)-1 : Number(v)));
    const global = resolveGlobalSections(dKey, sectionHistory);
    return weekend ? global.weekend : global.weekday;
  }

  // ── Progress calculations ──────────────────────────────────────
  function getDayProgress(day) {
    if (!day) return null;
    const dKey   = dateKey(viewYear, viewMonth, day);
    const secs   = getEffectiveSections(dKey);
    const dc     = checks[dKey] || {};
    const custom = customTasks[dKey] || [];
    const total  = secs.length + custom.length;
    if (total === 0) return { pct: 0, done: 0, total: 0 };
    const done = secs.filter(s => dc[s.id]).length + custom.filter(t => t.done).length;
    return { pct: Math.round((done / total) * 100), done, total };
  }

  const monthProgress = useMemo(() => {
    let totalDone = 0, totalAll = 0;
    for (let d = 1; d <= daysInMonth; d++) {
      const p = getDayProgress(d);
      totalDone += p.done; totalAll += p.total;
    }
    return totalAll === 0 ? 0 : Math.round((totalDone / totalAll) * 100);
  }, [checks, customTasks, sectionHistory, daySections, daysInMonth, viewYear, viewMonth]);

  const completeDays = useMemo(() => {
    let c = 0;
    for (let d = 1; d <= daysInMonth; d++) {
      const p = getDayProgress(d);
      if (p.total > 0 && p.pct === 100) c++;
    }
    return c;
  }, [checks, customTasks, sectionHistory, daySections, daysInMonth, viewYear, viewMonth]);

  // ── Handlers ───────────────────────────────────────────────────
  const toggleSection = useCallback((dKey, sId) => {
    setChecks(prev => ({
      ...prev,
      [dKey]: { ...(prev[dKey] || {}), [sId]: !(prev[dKey]?.[sId]) }
    }));
  }, []);

  // Custom tasks are now rich objects: { id, label, sub, icon, color, done }
  const addCustom = useCallback((dKey, taskObj) => {
    setCustomTasks(prev => ({
      ...prev,
      [dKey]: [...(prev[dKey] || []), { id: uid(), done: false, ...taskObj }]
    }));
  }, []);

  const deleteCustom = useCallback((dKey, id) => {
    setCustomTasks(prev => ({
      ...prev,
      [dKey]: (prev[dKey] || []).filter(t => t.id !== id)
    }));
  }, []);

  const toggleCustom = useCallback((dKey, id) => {
    setCustomTasks(prev => ({
      ...prev,
      [dKey]: (prev[dKey] || []).map(t => t.id === id ? {...t, done: !t.done} : t)
    }));
  }, []);

  // Edit now takes a full taskObj (all fields optional — only provided keys are updated)
  const editCustom = useCallback((dKey, id, taskObj) => {
    setCustomTasks(prev => ({
      ...prev,
      [dKey]: (prev[dKey] || []).map(t => t.id === id ? {...t, ...taskObj} : t)
    }));
  }, []);

  // Save changes from Manage Sections as a new versioned entry.
  // If an entry for today already exists we overwrite it so multiple edits in the same day
  // don't bloat the history array — they're all collapsed into one "today" entry.
  const saveGlobalSections = useCallback((newWeekday, newWeekend) => {
    const t = todayKey();
    setSectionHistory(prev => {
      const last = prev[prev.length - 1];
      if (last.from === t) {
        return [...prev.slice(0, -1), { from: t, weekday: newWeekday, weekend: newWeekend }];
      }
      return [...prev, { from: t, weekday: newWeekday, weekend: newWeekend }];
    });
  }, []);

  // Edit a section only for this specific day. If the day has no override yet, we clone
  // the currently-active global template for it first, then apply the targeted change.
  const editDaySection = useCallback((dKey, secId, data, currentSections) => {
    setDaySections(prev => ({
      ...prev,
      [dKey]: (prev[dKey] ?? currentSections).map(s => s.id === secId ? { ...s, ...data } : s)
    }));
  }, []);

  // Delete a section only for this specific day, and clean up its check state so the
  // progress ring and counters stay numerically correct.
  const deleteDaySection = useCallback((dKey, secId, currentSections) => {
    setDaySections(prev => ({
      ...prev,
      [dKey]: (prev[dKey] ?? currentSections).filter(s => s.id !== secId)
    }));
    setChecks(prev => {
      if (!prev[dKey]?.[secId]) return prev;
      const next = { ...prev, [dKey]: { ...prev[dKey] } };
      delete next[dKey][secId];
      return next;
    });
  }, []);

  // Update the note for a specific day. Passing an empty string effectively clears it.
  const setNote = useCallback((dKey, text) => {
    setNotes(prev => ({ ...prev, [dKey]: text }));
  }, []);

  function navMonth(dir) {
    let m = viewMonth + dir;
    let y = viewYear;
    if (m < 0)  { m = 11; y--; }
    if (m > 11) { m = 0;  y++; }
    setViewMonth(m); setViewYear(y);
    setSelectedDay(null);
  }

  // ── PERSISTENCE: write to storage whenever state changes ────────
  // Each hook watches a single piece of state. The `loading` guard is critical —
  // without it, the hooks would fire on the very first render (before the startup
  // read has completed) and would overwrite any stored data with the defaults.
  // By checking `!loading` before writing, we ensure writes only happen after
  // the initial load has succeeded and the state reflects real user data.

  useEffect(() => {
    if (loading) return;
    let timer;
    setSaveStatus("saving");
    const save = async () => {
      try { await window.storage.set("pm:sectionHistory", JSON.stringify(sectionHistory)); } catch {}
      setSaveStatus("saved");
      timer = setTimeout(() => setSaveStatus("idle"), 1500);
    };
    save();
    return () => clearTimeout(timer);
  }, [sectionHistory, loading]);

  useEffect(() => {
    if (loading) return;
    const save = async () => { try { await window.storage.set("pm:daySections", JSON.stringify(daySections)); } catch {} };
    save();
  }, [daySections, loading]);

  useEffect(() => {
    if (loading) return;
    const save = async () => { try { await window.storage.set("pm:checks", JSON.stringify(checks)); } catch {} };
    save();
  }, [checks, loading]);

  useEffect(() => {
    if (loading) return;
    const save = async () => { try { await window.storage.set("pm:customTasks", JSON.stringify(customTasks)); } catch {} };
    save();
  }, [customTasks, loading]);

  useEffect(() => {
    if (loading) return;
    const save = async () => { try { await window.storage.set("pm:notes", JSON.stringify(notes)); } catch {} };
    save();
  }, [notes, loading]);

  // ── LOADING SCREEN ──────────────────────────────────────────────
  // Shown while storage is being read on first mount. Once loading = false,
  // this unmounts and the real calendar renders with the restored data.
  if (loading) {
    return (
      <div style={{ minHeight:"100vh", background:"#080b12", display:"flex",
        alignItems:"center", justifyContent:"center", flexDirection:"column", gap:16 }}>
        <GlobalStyles />
        {/* Animated ring */}
        <div style={{ position:"relative", width:56, height:56 }}>
          <svg width="56" height="56" style={{ transform:"rotate(-90deg)" }}>
            <circle cx="28" cy="28" r="22" fill="none" stroke="rgba(255,255,255,0.07)" strokeWidth="4" />
            <circle cx="28" cy="28" r="22" fill="none" stroke="#6366f1" strokeWidth="4"
              strokeDasharray="138" strokeDashoffset="0" strokeLinecap="round"
              style={{ animation:"spin 1.2s linear infinite", transformOrigin:"28px 28px" }} />
          </svg>
          <style>{`@keyframes spin { from { stroke-dashoffset: 138; } to { stroke-dashoffset: -138; } }`}</style>
        </div>
        <div style={{ fontSize:13, color:"#475569", fontFamily:"'JetBrains Mono',monospace",
          letterSpacing:"0.1em" }}>LOADING YOUR CALENDAR…</div>
        <div style={{ fontSize:11, color:"#374151", fontFamily:"'Manrope',sans-serif" }}>
          Restoring your saved data
        </div>
      </div>
    );
  }
  return (
    <div style={{ height:"100vh", background:"#080b12", display:"flex", flexDirection:"column",
      fontFamily:"'Manrope',sans-serif", overflow:"hidden" }}>
      <GlobalStyles />

      {/* ── TOP BAR ─────────────────────────────────────────── */}
      <div style={{ padding:"20px 24px 0", display:"flex", alignItems:"center",
        justifyContent:"space-between", flexWrap:"wrap", gap:12 }}>
        {/* Left: title + nav */}
        <div style={{ display:"flex", alignItems:"center", gap:16 }}>
          <div>
            <div style={{ fontSize:10, color:"#6366f1", fontFamily:"'JetBrains Mono',monospace",
              letterSpacing:"0.12em", marginBottom:1 }}>APM CAREER SPRINT</div>
            <div style={{ fontSize:22, fontWeight:800, color:"#f1f5f9", fontFamily:"'Syne',sans-serif",
              lineHeight:1 }}>Study Calendar</div>
          </div>
          <div style={{ display:"flex", alignItems:"center", gap:2, marginLeft:12 }}>
            <button onClick={() => navMonth(-1)} style={{
              background:"rgba(255,255,255,0.05)", border:"1px solid rgba(255,255,255,0.09)",
              borderRadius:8, color:"#94a3b8", width:32, height:32, cursor:"pointer", fontSize:14,
            }}>‹</button>
            <div style={{ minWidth:160, textAlign:"center", fontSize:16, fontWeight:700,
              color:"#f1f5f9", fontFamily:"'Syne',sans-serif" }}>
              {MONTH_NAMES[viewMonth]} {viewYear}
            </div>
            <button onClick={() => navMonth(1)} style={{
              background:"rgba(255,255,255,0.05)", border:"1px solid rgba(255,255,255,0.09)",
              borderRadius:8, color:"#94a3b8", width:32, height:32, cursor:"pointer", fontSize:14,
            }}>›</button>
          </div>
        </div>

        {/* Right: stats + manage button */}
        <div style={{ display:"flex", alignItems:"center", gap:12 }}>
          {/* Month stats */}
          <div style={{ display:"flex", gap:8 }}>
            {[
              { label:"MONTH", val:`${monthProgress}%`,  color:"#818cf8" },
              { label:"COMPLETE DAYS", val: completePad(completeDays), color:"#34d399" },
              { label:"TOTAL DAYS", val: String(daysInMonth), color:"#64748b" },
            ].map(({ label, val, color }) => (
              <div key={label} style={{ background:"rgba(255,255,255,0.04)", border:"1px solid rgba(255,255,255,0.07)",
                borderRadius:10, padding:"7px 12px", textAlign:"center", minWidth:72 }}>
                <div style={{ fontSize:16, fontWeight:700, color, fontFamily:"'JetBrains Mono',monospace" }}>{val}</div>
                <div style={{ fontSize:8.5, color:"#475569", fontFamily:"'JetBrains Mono',monospace", letterSpacing:"0.1em", marginTop:1 }}>{label}</div>
              </div>
            ))}
          </div>

          {/* Month ring */}
          <Ring pct={monthProgress} size={56} stroke={4.5} color="#818cf8" label={`${monthProgress}%`} />

          {/* Save status indicator — subtle, auto-fades after 1.5s */}
          {saveStatus !== "idle" && (
            <div style={{
              fontSize:10, fontFamily:"'JetBrains Mono',monospace", letterSpacing:"0.08em",
              color: saveStatus === "saved" ? "#34d399" : "#475569",
              display:"flex", alignItems:"center", gap:5, transition:"color 0.3s",
            }}>
              {saveStatus === "saving" ? (
                <><span style={{ opacity:0.5 }}>●</span> saving…</>
              ) : (
                <><span>✓</span> saved</>
              )}
            </div>
          )}

          {/* Manage button */}
          <button onClick={() => setShowManage(true)} style={{
            background:"rgba(99,102,241,0.12)", border:"1px solid rgba(99,102,241,0.35)",
            borderRadius:10, color:"#818cf8", padding:"8px 14px", cursor:"pointer",
            fontSize:12, fontWeight:700, fontFamily:"'Manrope',sans-serif",
          }}>⚙ Manage Sections</button>
        </div>
      </div>

      {/* ── CALENDAR + PANEL ────────────────────────────────── */}
      <div style={{ flex:1, display:"flex", overflow:"hidden", marginTop:20 }}>
        {/* Calendar */}
        <div style={{ flex:1, padding:"0 24px 24px", overflowY:"auto" }}>
          {/* Day headers */}
          <div style={{ display:"grid", gridTemplateColumns:"repeat(7,1fr)", gap:5, marginBottom:5 }}>
            {DAY_NAMES.map(d => (
              <div key={d} style={{ textAlign:"center", fontSize:10, fontWeight:700,
                color: d==="Sun"||d==="Sat" ? "#fbbf2480" : "#475569",
                fontFamily:"'JetBrains Mono',monospace", letterSpacing:"0.08em", padding:"6px 0" }}>
                {d}
              </div>
            ))}
          </div>

          {/* Day cells */}
          <div style={{ display:"grid", gridTemplateColumns:"repeat(7,1fr)", gap:5 }}>
            {gridDays.map((day, idx) => {
              if (!day) return <div key={`empty-${idx}`} />;
              const dKey   = dateKey(viewYear, viewMonth, day);
              const isToday = dKey === today;
              const isSel   = selectedDay === day;
              const weekend = isWeekend(viewYear, viewMonth, day);
              const prog    = getDayProgress(day);
              const allDone = prog.total > 0 && prog.pct === 100;

              return (
                <div key={dKey} className="day-cell" onClick={() => setSelectedDay(isSel ? null : day)}
                  style={{
                    borderRadius:11, padding:"9px 8px 8px",
                    border: isToday
                      ? "1.5px solid rgba(99,102,241,0.6)"
                      : isSel
                      ? "1.5px solid rgba(255,255,255,0.2)"
                      : "1px solid rgba(255,255,255,0.06)",
                    background: isToday
                      ? "rgba(99,102,241,0.1)"
                      : isSel
                      ? "rgba(255,255,255,0.06)"
                      : allDone
                      ? "rgba(52,211,153,0.05)"
                      : "rgba(255,255,255,0.02)",
                    cursor:"pointer", transition:"all 0.15s", minHeight:88,
                    display:"flex", flexDirection:"column", gap:4,
                  }}>
                  {/* Date number */}
                  <div style={{ display:"flex", alignItems:"center", justifyContent:"space-between" }}>
                    <div style={{
                      fontSize:13, fontWeight: isToday ? 800 : 600,
                      color: isToday ? "#818cf8" : allDone ? "#34d399" : weekend ? "#fbbf24" : "#94a3b8",
                      fontFamily:"'JetBrains Mono',monospace", lineHeight:1,
                    }}>{String(day).padStart(2,"0")}</div>
                    {allDone && <span style={{ fontSize:11 }}>✅</span>}
                    {isToday && !allDone && (
                      <div style={{ width:5, height:5, borderRadius:"50%", background:"#818cf8" }} />
                    )}
                  </div>

                  {/* Progress bar */}
                  <div style={{ height:2.5, borderRadius:99, background:"rgba(255,255,255,0.07)", overflow:"hidden" }}>
                    <div style={{
                      height:"100%", borderRadius:99, transition:"width 0.3s ease",
                      width:`${prog.pct}%`,
                      background: allDone ? "#34d399" : weekend ? "#fbbf24" : "#6366f1",
                    }} />
                  </div>

                  {/* Done count */}
                  {prog.total > 0 && (
                    <div style={{ fontSize:9.5, color: allDone ? "#34d399" : "#475569",
                      fontFamily:"'JetBrains Mono',monospace", marginTop:1 }}>
                      {prog.done}/{prog.total}
                    </div>
                  )}

                  {/* Task dot row — one dot per section + custom task for this day.
                      Dots fill with the section/task colour when done, else show faint.
                      Cap at MAX_DOTS visible with a "+N" overflow badge if needed. */}
                  {(() => {
                    const MAX_DOTS = 8;
                    const secDots  = getEffectiveSections(dKey).map(s => ({
                      id: s.id,
                      color: s.color,
                      done: !!(checks[dKey]?.[s.id]),
                    }));
                    const custDots = (customTasks[dKey] || []).map(t => ({
                      id: t.id,
                      color: t.color || "#818cf8",
                      done: t.done,
                    }));
                    const allDots   = [...secDots, ...custDots];
                    const visible   = allDots.slice(0, MAX_DOTS);
                    const overflow  = allDots.length - MAX_DOTS;
                    return (
                      <div style={{ display:"flex", gap:2.5, flexWrap:"wrap", marginTop:"auto", alignItems:"center" }}>
                        {visible.map(d => (
                          <div key={d.id} style={{
                            width:6, height:6, borderRadius:"50%",
                            background: d.done ? d.color : "rgba(255,255,255,0.1)",
                            transition:"background 0.15s",
                          }} />
                        ))}
                        {overflow > 0 && (
                          <span style={{
                            fontSize:8, color:"#475569",
                            fontFamily:"'JetBrains Mono',monospace", lineHeight:1,
                          }}>+{overflow}</span>
                        )}
                      </div>
                    );
                  })()}
                </div>
              );
            })}
          </div>

          {/* Legend */}
          <div style={{ display:"flex", gap:16, marginTop:16, flexWrap:"wrap" }}>
            {[
              { dot:"#818cf8", label:"Today" },
              { dot:"#34d399", label:"All done" },
              { dot:"#fbbf24", label:"Weekend" },
              { dot:"rgba(255,255,255,0.15)", label:"Pending" },
            ].map(({ dot, label }) => (
              <div key={label} style={{ display:"flex", alignItems:"center", gap:6 }}>
                <div style={{ width:8, height:8, borderRadius:"50%", background:dot }} />
                <span style={{ fontSize:10, color:"#475569", fontFamily:"'JetBrains Mono',monospace" }}>{label}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Day Panel */}
        {selectedDay && (() => {
          const selDKey   = dateKey(viewYear, viewMonth, selectedDay);
          const selActive = getEffectiveSections(selDKey);
          return (
            <DayPanel
              dKey={selDKey}
              date={selectedDay}
              year={viewYear}
              month={viewMonth}
              activeSections={selActive}
              checks={checks}
              customTasks={customTasks}
              notes={notes}
              onToggle={toggleSection}
              onAddCustom={addCustom}
              onDeleteCustom={deleteCustom}
              onToggleCustom={toggleCustom}
              onEditCustom={editCustom}
              onEditDaySection={editDaySection}
              onDeleteDaySection={deleteDaySection}
              onSetNote={setNote}
              onClose={() => setSelectedDay(null)}
            />
          );
        })()}
      </div>

      {/* Manage Sections Modal — passes the current (latest) weekday + weekend lists,
          and a single onSave that creates/updates today's history entry */}
      {showManage && (() => {
        const latest = sectionHistory[sectionHistory.length - 1];
        return (
          <ManageSectionsModal
            weekdaySections={latest.weekday}
            weekendSections={latest.weekend}
            onSave={saveGlobalSections}
            onClose={() => setShowManage(false)}
          />
        );
      })()}
    </div>
  );
}

// tiny helper used in stats row
function completePad(n) { return String(n).padStart(2, "0"); }
