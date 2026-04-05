import React, { useState, useEffect } from 'react';
import SeatGrid from './SeatGrid';

const BASE_URL = 'http://localhost:8080';

let toastId = 0;

function useToasts() {
  const [toasts, setToasts] = useState([]);

  function addToast(message, type = 'info', duration = 3500) {
    const id = ++toastId;
    setToasts(prev => [...prev, { id, message, type }]);
    setTimeout(() => setToasts(prev => prev.filter(t => t.id !== id)), duration);
  }

  function removeToast(id) {
    setToasts(prev => prev.filter(t => t.id !== id));
  }

  return { toasts, addToast, removeToast };
}

function cleanNum(raw, min, max) {
  const digits = raw.replace(/\D/g, '');
  if (digits === '') return '';
  const n = Math.min(max, Math.max(min, parseInt(digits, 10)));
  return String(n);
}

function App() {
  const [seats, setSeats] = useState([]);
  const [selectedIds, setSelectedIds] = useState([]);
  const [mode, setMode] = useState('book');
  const { toasts, addToast, removeToast } = useToasts();

  // booking history - stores last 8 actions
  const [history, setHistory] = useState([]);

  const [rangeL, setRangeL] = useState('1');
  const [rangeR, setRangeR] = useState('10');
  const [segResult, setSegResult] = useState(null);

  const [searchFrom, setSearchFrom] = useState('');
  const [avlResult, setAvlResult] = useState(null);

  function loadSeats() {
    fetch(BASE_URL + '/seats')
      .then(res => res.json())
      .then(data => setSeats(data))
      .catch(() => addToast('Cannot reach backend on port 8080. Is Spring Boot running?', 'error', 6000));
  }

  useEffect(() => { loadSeats(); }, []);

  function addHistory(action, seatNums) {
    const entry = {
      id: Date.now(),
      action,
      seats: seatNums,
      time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
    };
    setHistory(prev => [entry, ...prev].slice(0, 8)); // keep last 8
  }

  function toggleSeat(id) {
    if (selectedIds.includes(id)) {
      setSelectedIds(selectedIds.filter(s => s !== id));
    } else {
      setSelectedIds([...selectedIds, id]);
    }
  }

  function switchMode(newMode) {
    setMode(newMode);
    setSelectedIds([]);
  }

  function handleLock() {
    if (selectedIds.length === 0) { addToast('Select at least one seat first.', 'warn'); return; }
    fetch(BASE_URL + '/lock', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ seatIds: selectedIds }),
    })
      .then(res => res.json())
      .then(data => {
        if (data.success.length > 0) {
          addToast('Locked: ' + data.success.map(n => 'Seat ' + n).join(', '), 'success');
          addHistory('Locked', data.success);
        }
        data.errors.forEach(err => addToast(err, 'error'));
        setSelectedIds([]);
        loadSeats();
      })
      .catch(() => addToast('Request failed.', 'error'));
  }

  function handleBook() {
    if (selectedIds.length === 0) { addToast('Select at least one seat first.', 'warn'); return; }
    fetch(BASE_URL + '/book', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ seatIds: selectedIds }),
    })
      .then(res => res.json())
      .then(data => {
        if (data.success.length > 0) {
          addToast('Booked: ' + data.success.map(n => 'Seat ' + n).join(', '), 'success');
          addHistory('Booked', data.success);
        }
        data.errors.forEach(err => addToast(err, 'error'));
        setSelectedIds([]);
        loadSeats();
      })
      .catch(() => addToast('Request failed.', 'error'));
  }

  function handleCancel() {
    if (selectedIds.length === 0) { addToast('Select at least one booked seat to cancel.', 'warn'); return; }
    fetch(BASE_URL + '/cancel', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ seatIds: selectedIds }),
    })
      .then(res => res.json())
      .then(data => {
        if (data.success.length > 0) {
          addToast('Cancelled: ' + data.success.map(n => 'Seat ' + n).join(', '), 'info');
          addHistory('Cancelled', data.success);
        }
        data.errors.forEach(err => addToast(err, 'error'));
        setSelectedIds([]);
        loadSeats();
      })
      .catch(() => addToast('Request failed.', 'error'));
  }

  function handleReset() {
    fetch(BASE_URL + '/reset', { method: 'POST' })
      .then(res => res.json())
      .then(() => {
        addToast('All seats have been reset.', 'info');
        setHistory([]);
        setSelectedIds([]);
        setSegResult(null);
        setAvlResult(null);
        loadSeats();
      })
      .catch(() => addToast('Reset failed.', 'error'));
  }

  function handleSegQuery() {
    const l = parseInt(rangeL, 10);
    const r = parseInt(rangeR, 10);
    if (!rangeL || !rangeR) { addToast('Enter both From and To values.', 'warn'); return; }
    if (l > r) { addToast('From must be less than or equal to To.', 'warn'); return; }
    fetch(BASE_URL + '/availability?l=' + (l - 1) + '&r=' + (r - 1))
      .then(res => res.json())
      .then(data => {
        if (data.error) setSegResult({ ok: false, text: data.error });
        else setSegResult({ ok: true, text: data.availableSeats + ' seat(s) free in seats ' + l + ' to ' + r });
      });
  }

  function handleAvlQuery() {
    const fromIndex = searchFrom === '' ? -1 : parseInt(searchFrom, 10) - 1;
    fetch(BASE_URL + '/next-available?from=' + fromIndex)
      .then(res => res.json())
      .then(data => {
        if (data.error) setAvlResult({ ok: false, text: data.error });
        else {
          const txt = searchFrom
            ? 'Next free seat after seat ' + searchFrom + ': Seat ' + data.displayNumber
            : 'First available seat: Seat ' + data.displayNumber;
          setAvlResult({ ok: true, text: txt });
        }
      });
  }

  const booked = seats.filter(s => s.booked).length;
  const locked = seats.filter(s => s.locked).length;
  const available = seats.filter(s => !s.booked && !s.locked).length;

  return (
    <div style={styles.page}>

      <ToastStack toasts={toasts} onRemove={removeToast} />

      {/* header */}
      <div style={styles.header}>
        <div style={styles.headerInner}>
          <div>
            <h1 style={styles.title}>SeatSync</h1>
            <p style={styles.subtitle}>Smart Seat Booking System</p>
          </div>
          <div style={styles.stats}>
            <StatBadge label="Available" count={available} color="#22c55e" />
            <StatBadge label="Locked" count={locked} color="#f59e0b" />
            <StatBadge label="Booked" count={booked} color="#ef4444" />
            <button onClick={handleReset} style={styles.resetBtn} title="Reset all seats">
              Reset
            </button>
          </div>
        </div>
      </div>

      <div style={styles.body}>

        {/* screen */}
        <div style={{ textAlign: 'center', marginBottom: '10px' }}>
          <div style={styles.screenBar} />
          <span style={styles.screenLabel}>SCREEN THIS WAY</span>
        </div>

        {/* mode toggle */}
        <div style={styles.modeRow}>
          <button
            onClick={() => switchMode('book')}
            style={{ ...styles.modeBtn, ...(mode === 'book' ? styles.modeBtnActive : {}) }}
          >
            Booking Mode
          </button>
          <button
            onClick={() => switchMode('cancel')}
            style={{ ...styles.modeBtn, ...(mode === 'cancel' ? styles.modeBtnCancel : {}) }}
          >
            Cancellation Mode
          </button>
          {mode === 'cancel' && (
            <div style={styles.cancelHint}>
              Click any red (booked) seat to select it for cancellation
            </div>
          )}
        </div>

        {/* seat grid */}
        <div style={{ ...styles.gridCard, ...(mode === 'cancel' ? styles.gridCardCancel : {}) }}>
          {seats.length > 0
            ? <SeatGrid seats={seats} selectedIds={selectedIds} onToggle={toggleSeat} mode={mode} />
            : <p style={{ textAlign: 'center', color: '#475569', padding: '40px 0' }}>Connecting to backend...</p>
          }
        </div>

        {/* legend */}
        <div style={styles.legend}>
          <LegendDot color="#22c55e" label="Available" />
          <LegendDot color="#f59e0b" label="Locked" />
          <LegendDot color="#ef4444" label="Booked" />
          <LegendDot color="transparent" label="Selected" border />
        </div>

        {/* action buttons */}
        <div style={styles.actionRow}>
          {mode === 'book' ? (
            <>
              <button onClick={handleLock} style={{ ...styles.btn, background: '#d97706' }}>
                Lock Seats {selectedIds.length > 0 && <span style={styles.badge}>{selectedIds.length}</span>}
              </button>
              <button onClick={handleBook} style={{ ...styles.btn, background: '#16a34a' }}>
                Book Seats {selectedIds.length > 0 && <span style={styles.badge}>{selectedIds.length}</span>}
              </button>
            </>
          ) : (
            <button onClick={handleCancel} style={{ ...styles.btn, background: '#b91c1c' }}>
              Cancel Booking {selectedIds.length > 0 && <span style={styles.badge}>{selectedIds.length}</span>}
            </button>
          )}
          <button onClick={() => setSelectedIds([])} style={{ ...styles.btn, background: '#334155' }}>
            Clear
          </button>
        </div>

        {/* dsa queries side by side */}
        <div style={styles.queryRow}>

          <div style={styles.queryCard}>
            <div style={styles.queryHeader}>
              <span style={{ ...styles.queryTag, background: '#7c3aed' }}>Segment Tree</span>
              <span style={styles.queryComplexity}>O(log n)</span>
            </div>
            <p style={styles.queryDesc}>Count available seats in a range</p>
            <div style={styles.queryInputRow}>
              <label style={styles.queryLabel}>
                From
                <input type="number" value={rangeL} style={styles.input}
                  onChange={e => setRangeL(cleanNum(e.target.value, 1, 50))}
                  onBlur={() => { if (!rangeL) setRangeL('1'); }} />
              </label>
              <label style={styles.queryLabel}>
                To
                <input type="number" value={rangeR} style={styles.input}
                  onChange={e => setRangeR(cleanNum(e.target.value, 1, 50))}
                  onBlur={() => { if (!rangeR) setRangeR('1'); }} />
              </label>
              <button onClick={handleSegQuery} style={{ ...styles.queryBtn, background: '#7c3aed' }}>Query</button>
            </div>
            {segResult && (
              <div style={{ ...styles.queryResult, borderColor: segResult.ok ? '#7c3aed' : '#ef4444', color: segResult.ok ? '#c4b5fd' : '#fca5a5' }}>
                {segResult.text}
              </div>
            )}
          </div>

          <div style={styles.queryCard}>
            <div style={styles.queryHeader}>
              <span style={{ ...styles.queryTag, background: '#0891b2' }}>AVL Tree</span>
              <span style={styles.queryComplexity}>O(log n)</span>
            </div>
            <p style={styles.queryDesc}>Find next available seat after a position</p>
            <div style={styles.queryInputRow}>
              <label style={styles.queryLabel}>
                After seat
                <input type="number" value={searchFrom} placeholder="any" style={styles.input}
                  onChange={e => setSearchFrom(cleanNum(e.target.value, 1, 50))} />
              </label>
              <button onClick={handleAvlQuery} style={{ ...styles.queryBtn, background: '#0891b2' }}>Find</button>
            </div>
            {avlResult && (
              <div style={{ ...styles.queryResult, borderColor: avlResult.ok ? '#0891b2' : '#ef4444', color: avlResult.ok ? '#7dd3fc' : '#fca5a5' }}>
                {avlResult.text}
              </div>
            )}
          </div>

        </div>

        {/* activity log below */}
        <div style={styles.historyCard}>
          <h3 style={styles.sectionTitle}>Activity Log</h3>
          {history.length === 0
            ? <p style={styles.emptyText}>No activity yet. Lock or book some seats.</p>
            : history.map(entry => (
              <div key={entry.id} style={styles.historyEntry}>
                <span style={{ ...styles.historyTag, ...historyTagColor[entry.action] }}>
                  {entry.action}
                </span>
                <span style={styles.historySeats}>
                  {entry.seats.map(n => 'Seat ' + n).join(', ')}
                </span>
                <span style={styles.historyTime}>{entry.time}</span>
              </div>
            ))
          }
        </div>
      </div>
    </div>
  );
}

function ToastStack({ toasts, onRemove }) {
  return (
    <div style={styles.toastStack}>
      {toasts.map(t => (
        <div key={t.id} style={{ ...styles.toast, ...toastColors[t.type] }}>
          <span style={{ flex: 1 }}>{t.message}</span>
          <button onClick={() => onRemove(t.id)} style={styles.toastClose}>x</button>
        </div>
      ))}
    </div>
  );
}

const toastColors = {
  success: { background: '#14532d', borderColor: '#22c55e', color: '#bbf7d0' },
  error:   { background: '#450a0a', borderColor: '#ef4444', color: '#fecaca' },
  warn:    { background: '#451a03', borderColor: '#f59e0b', color: '#fde68a' },
  info:    { background: '#172554', borderColor: '#3b82f6', color: '#bfdbfe' },
};

const historyTagColor = {
  Locked:    { background: '#451a03', color: '#fde68a' },
  Booked:    { background: '#14532d', color: '#bbf7d0' },
  Cancelled: { background: '#172554', color: '#bfdbfe' },
};

function StatBadge({ label, count, color }) {
  return (
    <div style={{ textAlign: 'center' }}>
      <div style={{ fontSize: '22px', fontWeight: '700', color }}>{count}</div>
      <div style={{ fontSize: '11px', color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.05em' }}>{label}</div>
    </div>
  );
}

function LegendDot({ color, label, border }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '13px', color: '#64748b' }}>
      <div style={{ width: '14px', height: '14px', borderRadius: '3px', background: color, border: border ? '2px solid #94a3b8' : 'none' }} />
      {label}
    </div>
  );
}

const styles = {
  page: { minHeight: '100vh', background: '#0f172a', fontFamily: "'Segoe UI', Arial, sans-serif" },
  header: { background: '#1e293b', borderBottom: '1px solid #1e3a5f', padding: '10px 24px', position: 'sticky', top: 0, zIndex: 10 },
  headerInner: { maxWidth: '1100px', margin: '0 auto', display: 'flex', justifyContent: 'space-between', alignItems: 'center' },
  title: { margin: 0, fontSize: '20px', fontWeight: '700', color: '#f1f5f9' },
  subtitle: { margin: '1px 0 0', fontSize: '11px', color: '#475569' },
  stats: { display: 'flex', gap: '20px', alignItems: 'center' },
  resetBtn: {
    background: 'transparent', border: '1px solid #334155', color: '#64748b',
    padding: '5px 12px', borderRadius: '6px', cursor: 'pointer', fontSize: '12px',
    marginLeft: '8px',
  },
  body: { maxWidth: '1100px', margin: '0 auto', padding: '10px 20px 20px' },
  screenBar: { height: '4px', background: 'linear-gradient(to right, transparent, #3b82f6, transparent)', borderRadius: '4px', marginBottom: '5px' },
  screenLabel: { fontSize: '10px', color: '#94a3b8', letterSpacing: '0.15em', textTransform: 'uppercase' },
  modeRow: { display: 'flex', gap: '8px', marginBottom: '8px', alignItems: 'center', flexWrap: 'wrap' },
  modeBtn: { padding: '6px 14px', borderRadius: '6px', border: '1px solid #334155', background: '#1e293b', color: '#64748b', cursor: 'pointer', fontSize: '12px', fontWeight: '600' },
  modeBtnActive: { background: '#1e3a5f', color: '#93c5fd', borderColor: '#3b82f6' },
  modeBtnCancel: { background: '#450a0a', color: '#fca5a5', borderColor: '#ef4444' },
  cancelHint: { background: '#450a0a', color: '#fca5a5', border: '1px solid #7f1d1d', borderRadius: '6px', padding: '5px 12px', fontSize: '12px' },
  gridCard: { background: '#1e293b', borderRadius: '12px', padding: '14px 20px', border: '1px solid #1e3a5f' },
  gridCardCancel: { border: '1px solid #7f1d1d' },
  legend: { display: 'flex', gap: '16px', justifyContent: 'center', flexWrap: 'wrap', margin: '8px 0' },
  actionRow: { display: 'flex', gap: '10px', justifyContent: 'center', flexWrap: 'wrap', marginBottom: '12px' },
  btn: { color: '#fff', border: 'none', padding: '9px 22px', borderRadius: '8px', cursor: 'pointer', fontSize: '13px', fontWeight: '600', display: 'flex', alignItems: 'center', gap: '8px' },
  badge: { background: 'rgba(0,0,0,0.3)', borderRadius: '10px', padding: '1px 7px', fontSize: '11px' },
  queryRow: { display: 'flex', gap: '14px', flexWrap: 'wrap', marginBottom: '12px' },
  historyCard: { background: '#1e293b', border: '1px solid #1e3a5f', borderRadius: '12px', padding: '16px' },
  sectionTitle: { margin: '0 0 10px', fontSize: '13px', fontWeight: '600', color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.05em' },
  emptyText: { color: '#334155', fontSize: '13px', margin: 0 },
  historyEntry: { display: 'flex', alignItems: 'center', gap: '8px', padding: '6px 0', borderBottom: '1px solid #0f172a', flexWrap: 'wrap' },
  historyTag: { fontSize: '11px', fontWeight: '700', padding: '2px 8px', borderRadius: '4px', flexShrink: 0 },
  historySeats: { fontSize: '13px', color: '#94a3b8', flex: 1 },
  historyTime: { fontSize: '11px', color: '#334155', flexShrink: 0 },
  queryCard: { flex: 1, background: '#1e293b', border: '1px solid #1e3a5f', borderRadius: '12px', padding: '18px 22px' },
  queryHeader: { display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '4px' },
  queryTag: { color: '#fff', fontSize: '12px', fontWeight: '600', padding: '3px 10px', borderRadius: '20px' },
  queryComplexity: { color: '#475569', fontSize: '12px', fontFamily: 'monospace' },
  queryDesc: { color: '#475569', fontSize: '13px', margin: '0 0 12px' },
  queryInputRow: { display: 'flex', gap: '12px', alignItems: 'flex-end', flexWrap: 'wrap' },
  queryLabel: { display: 'flex', flexDirection: 'column', gap: '5px', fontSize: '12px', color: '#64748b' },
  input: { width: '80px', padding: '9px 10px', borderRadius: '6px', border: '1px solid #334155', background: '#0f172a', color: '#f1f5f9', fontSize: '15px', outline: 'none' },
  queryBtn: { color: '#fff', border: 'none', padding: '9px 22px', borderRadius: '6px', cursor: 'pointer', fontSize: '14px', fontWeight: '600' },
  queryResult: { marginTop: '12px', padding: '10px 14px', background: '#0f172a', borderLeft: '3px solid', borderRadius: '6px', fontSize: '13px' },
  toastStack: { position: 'fixed', bottom: '24px', right: '24px', display: 'flex', flexDirection: 'column', gap: '10px', zIndex: 1000, maxWidth: '340px', width: '100%' },
  toast: { display: 'flex', alignItems: 'flex-start', gap: '10px', padding: '12px 14px', borderRadius: '8px', borderLeft: '4px solid', fontSize: '13px', lineHeight: '1.5', boxShadow: '0 4px 20px rgba(0,0,0,0.4)' },
  toastClose: { background: 'none', border: 'none', color: 'inherit', opacity: 0.5, cursor: 'pointer', fontSize: '14px', flexShrink: 0, padding: '0 2px' },
};

export default App;
