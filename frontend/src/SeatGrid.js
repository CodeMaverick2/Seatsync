import React from 'react';

// mode = 'book' (default) or 'cancel'
// in book mode: green/yellow seats are selectable, red are not
// in cancel mode: red (booked) seats are selectable, others are not
function SeatGrid({ seats, selectedIds, onToggle, mode }) {

  function getSeatStyle(seat) {
    const isSelected = selectedIds.includes(seat.id);
    const isCancel = mode === 'cancel';

    let bg = '#22c55e';
    if (seat.booked) bg = '#ef4444';
    if (seat.locked) bg = '#f59e0b';

    // in cancel mode, dim non-booked seats so the user knows only red is clickable
    const dimmed = isCancel ? !seat.booked : false;

    return {
      width: '48px',
      height: '43px',
      borderRadius: '6px 6px 3px 3px',
      background: bg,
      border: isSelected ? '2px solid #fff' : '2px solid transparent',
      boxShadow: isSelected ? '0 0 0 2px #fff' : 'inset 0 -3px 0 rgba(0,0,0,0.25)',
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      justifyContent: 'center',
      cursor: dimmed ? 'default' : 'pointer',
      fontSize: '11px',
      fontWeight: '700',
      color: 'rgba(255,255,255,0.9)',
      userSelect: 'none',
      opacity: dimmed ? 0.3 : 1,
      transition: 'opacity 0.15s',
    };
  }

  function handleClick(seat) {
    if (mode === 'cancel') {
      if (seat.booked) onToggle(seat.id);
    } else {
      if (!seat.booked) onToggle(seat.id);
    }
  }

  function getTitle(seat) {
    if (mode === 'cancel') {
      return seat.booked ? 'Click to select for cancellation' : 'Only booked seats can be cancelled';
    }
    if (seat.booked) return 'Already booked';
    if (seat.locked) return 'Locked - select to book';
    return 'Available - click to select';
  }

  const rows = [];
  for (let i = 0; i < seats.length; i += 10) {
    rows.push(seats.slice(i, i + 10));
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '7px', alignItems: 'center' }}>
      {rows.map((row, rowIndex) => (
        <div key={rowIndex} style={{ display: 'flex', gap: '6px', alignItems: 'center' }}>
          <span style={{ width: '20px', fontSize: '11px', color: '#475569', textAlign: 'right', fontWeight: '600', flexShrink: 0 }}>
            {String.fromCharCode(65 + rowIndex)}
          </span>
          {row.map((seat, i) => (
            <React.Fragment key={seat.id}>
              {i === 5 && <div style={{ width: '16px' }} />}
              <div
                style={getSeatStyle(seat)}
                onClick={() => handleClick(seat)}
                title={getTitle(seat)}
              >
                <div>{seat.id + 1}</div>
              </div>
            </React.Fragment>
          ))}
        </div>
      ))}
    </div>
  );
}

export default SeatGrid;
