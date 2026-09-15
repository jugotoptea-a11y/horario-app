import React from 'react';
import WeeklyTimetable, { TimetableItem } from './WeeklyTimetable';

interface StudentScheduleModalProps {
  student: any;
  horario: TimetableItem[];
  onClose: () => void;
}

export default function StudentScheduleModal({ student, horario, onClose }: StudentScheduleModalProps) {
  if (!student) return null;

  return (
    <div 
      style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 9999, padding: '14px' }} 
      onClick={onClose}
    >
      <div 
        style={{ background: 'white', borderRadius: '10px', maxWidth: '820px', width: '100%', maxHeight: '75vh', overflow: 'auto', padding: '16px', position: 'relative' }} 
        onClick={e => e.stopPropagation()}
      >
        <button 
          onClick={onClose} 
          style={{ position: 'absolute', top: '10px', right: '10px', background: 'transparent', border: 'none', fontSize: '20px', color: 'black', cursor: 'pointer', width: 'auto', padding: '0 10px', boxShadow: 'none' }}
        >
          ×
        </button>
        
        <WeeklyTimetable 
          horarios={horario} 
          title={`Horario de ${student.nombre_completo}`} 
          compact={true} 
        />
      </div>
    </div>
  );
}
