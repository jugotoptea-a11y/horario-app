import React from 'react';
import { DIAS, formatMin } from '../utils/constants';

export interface TimetableItem {
  dia: string;
  hora_inicio_min: number;
  hora_fin_min: number;
  materia: string;
  docente?: string;
  codigo_clase?: string;
  codigo?: string;
}

interface WeeklyTimetableProps {
  horarios: TimetableItem[];
  title?: string;
  compact?: boolean;
}

export default function WeeklyTimetable({ horarios, title, compact = false }: WeeklyTimetableProps) {
  if (horarios.length === 0) return compact ? (
    <p style={{ color: '#666' }}>No hay horario disponible.</p>
  ) : null;
  
  const allMins = horarios.flatMap(h => [h.hora_inicio_min, h.hora_fin_min]);
  let minMin = Math.min(...allMins);
  let maxMin = Math.max(...allMins);
  let startSlot = Math.floor(minMin / 30) * 30;
  let endSlot = Math.ceil(maxMin / 30) * 30;
  if (endSlot <= startSlot) endSlot = startSlot + 30;

  const slots = [];
  for (let m = startSlot; m < endSlot; m += 30) slots.push(m);

  const rowHeight = compact ? 26 : 28;
  const colWidth = compact ? '75px' : '80px';
  const headerHeight = compact ? '35px' : '40px';

  return (
    <div className={compact ? "" : "horario-section"} style={compact ? {} : { marginTop: '30px', background: 'white', borderRadius: '16px', padding: '20px', border: '1px solid rgba(163,22,26,0.15)', boxShadow: '0 8px 30px rgba(0,0,0,0.05)' }}>
      {title && (
        <h3 style={compact ? { color: 'var(--cuc-auburn)', textTransform: 'uppercase', marginBottom: '15px' } : { textTransform: 'uppercase', color: 'var(--cuc-auburn)' }}>{title}</h3>
      )}
      <div className={compact ? "timetable-shell" : "horario-visual-content"}>
        <div className={compact ? "" : "timetable-shell"} style={compact ? { overflowX: 'auto' } : { overflowX: 'auto', borderRadius: '12px', border: '1px solid #e2e8f0', marginTop: '16px' }}>
          <div style={{ minWidth: '760px', position: 'relative' }}>
            <table className="timetable" style={{ width: '100%', borderCollapse: 'collapse', fontSize: compact ? '12px' : '13px', tableLayout: 'fixed' }}>
              <thead>
                <tr style={{ height: headerHeight }}>
                  <th style={{ background: 'linear-gradient(145deg, var(--cuc-auburn), var(--cuc-red-deep))', color: 'white', padding: compact ? '8px' : '10px 6px', width: colWidth, boxSizing: 'border-box' }}>HORAS</th>
                  {DIAS.map(d => <th key={d} style={{ background: 'linear-gradient(145deg, var(--cuc-auburn), var(--cuc-red-deep))', color: 'white', padding: compact ? '8px' : '10px 6px', width: `calc((100% - ${colWidth}) / 6)`, boxSizing: 'border-box' }}>{d}</th>)}
                </tr>
              </thead>
              <tbody>
                {slots.map((m) => (
                  <tr key={m}>
                    <td className="hora-col" style={{ background: compact ? '#f3f3f3' : '#f8fafc', padding: '4px', textAlign: 'center', fontWeight: 'bold', color: compact ? 'inherit' : '#475569', borderRight: compact ? 'none' : '1px solid #e2e8f0', width: colWidth, height: `${rowHeight}px` }}>{formatMin(m)}</td>
                    {DIAS.map(d => <td key={d} style={{ borderBottom: compact ? 'none' : '1px solid #f1f5f9', borderRight: compact ? 'none' : '1px solid #f1f5f9', border: compact ? '1px solid #e4d3d3' : undefined, height: `${rowHeight}px` }}></td>)}
                  </tr>
                ))}
              </tbody>
            </table>
            <div style={{ position: 'absolute', top: headerHeight, left: 0, right: 0, bottom: 0, pointerEvents: 'none' }}>
              {horarios.map((clase, i) => {
                const cIdx = DIAS.indexOf(clase.dia);
                if (cIdx === -1) return null;
                const sMin = clase.hora_inicio_min;
                const eMin = clase.hora_fin_min;
                const sIdx = Math.floor((sMin - startSlot) / 30);
                const span = Math.ceil((eMin - sMin) / 30);
                return (
                  <div key={i} className="clase-block" style={{
                    position: 'absolute',
                    top: `${sIdx * rowHeight}px`,
                    left: `calc(${colWidth} + ${cIdx} * calc((100% - ${colWidth}) / 6) + 2px)`,
                    width: `calc((100% - ${colWidth}) / 6 - 4px)`,
                    height: `${Math.max(span * rowHeight, parseInt(headerHeight))}px`,
                    background: 'var(--cuc-auburn)',
                    color: 'white',
                    borderRadius: compact ? '5px' : '6px',
                    padding: compact ? '4px' : '6px',
                    fontSize: compact ? '10px' : '11px',
                    overflow: 'hidden',
                    display: 'flex',
                    flexDirection: 'column',
                    boxShadow: compact ? 'none' : '0 4px 6px rgba(0,0,0,0.1)',
                    pointerEvents: 'auto'
                  }}>
                    <span style={{ fontWeight: 'bold', lineHeight: compact ? 1.1 : 1.2 }}>{clase.materia}</span>
                    {!compact && <span style={{ fontSize: '9.5px', marginTop: '2px', opacity: 0.9 }}>{clase.docente || ''}</span>}
                    <span style={compact ? {} : { fontSize: '10px', marginTop: '2px', opacity: 0.9 }}>{formatMin(sMin)} - {formatMin(eMin)}</span>
                    {!compact && <span className="codigo-clase" style={{ background: 'rgba(0,0,0,0.2)', padding: '2px 4px', borderRadius: '4px', marginTop: '4px', fontSize: '10px', fontFamily: 'monospace', textAlign: 'center' }}>{clase.codigo_clase || clase.codigo || ''}</span>}
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
