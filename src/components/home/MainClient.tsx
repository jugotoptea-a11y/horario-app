"use client";

import React, { useState, useEffect, useMemo } from "react";
import Header from "../Header";
import SearchFilters from "../SearchFilters";
import AvailableStudentsTable from "../AvailableStudentsTable";
import WeeklyTimetable from "../WeeklyTimetable";
import StudentScheduleModal from "../StudentScheduleModal";
import { toMin } from "../../utils/constants";

interface MainClientProps {
  initPromociones: string[];
  initAllStudents?: any[];
  initEstudiantes?: any[];
}

export default function MainClient({ initPromociones, initAllStudents = [], initEstudiantes = [] }: MainClientProps) {
  const [modo, setModo] = useState<"disponibilidad" | "antidisponibilidad">("disponibilidad");
  const [selPromociones, setSelPromociones] = useState<string[]>([]);
  const allStudents = useMemo(() => initAllStudents.length > 0 ? initAllStudents : initEstudiantes, [initAllStudents, initEstudiantes]);
  const [selEstudiantes, setSelEstudiantes] = useState<string[]>([]);
  
  const [selDias, setSelDias] = useState<string[]>([]);
  const [intervalosGlobal, setIntervalosGlobal] = useState({ inicio: "", fin: "" });
  const [intervalosDia, setIntervalosDia] = useState<Record<string, { inicio: string, fin: string }[]>>({});

  const [isDropdownOpen, setIsDropdownOpen] = useState(false);

  // Modal features
  const [modalStudent, setModalStudent] = useState<any | null>(null);
  const [modalHorario, setModalHorario] = useState<any[]>([]);

  // Estudiantes filtrados por promoción para el dropdown de selección de estudiantes
  const estudiantesDropdown = useMemo(() => {
    if (selPromociones.length === 0 || selPromociones.includes("TODAS")) {
      return allStudents;
    }
    return allStudents.filter(s => s.promo && selPromociones.includes(s.promo));
  }, [allStudents, selPromociones]);

  // Si cambia la promoción seleccionada, descartar estudiantes seleccionados que ya no pertenezcan
  useEffect(() => {
    setSelEstudiantes(prev => prev.filter(name => estudiantesDropdown.some((e: any) => e.nombre_completo === name)));
  }, [estudiantesDropdown]);

  // Estudiantes base según filtro de promoción y selección de estudiantes
  const baseEstudiantes = useMemo(() => {
    return allStudents.filter(student => {
      if (selPromociones.length > 0 && !selPromociones.includes("TODAS")) {
        if (!student.promo || !selPromociones.includes(student.promo)) {
          return false;
        }
      }
      if (selEstudiantes.length > 0 && !selEstudiantes.includes("TODOS")) {
        if (!selEstudiantes.includes(student.nombre_completo)) {
          return false;
        }
      }
      return true;
    });
  }, [allStudents, selPromociones, selEstudiantes]);

  // Cálculo 100% instantáneo y automático de disponibilidad/antidisponibilidad en memoria
  const resultadoDisponibles = useMemo(() => {
    if (!selDias || selDias.length === 0) {
      return [];
    }

    const intervalosData: Record<string, { inicio: number, fin: number }[]> = {};
    for (const dia of selDias) {
      let bloques = intervalosDia[dia] || [];
      if (bloques.length === 0) bloques = [{ inicio: '', fin: '' }];

      intervalosData[dia] = bloques.map(b => {
        const ini = b.inicio || intervalosGlobal.inicio;
        const fin = b.fin || intervalosGlobal.fin;
        return {
          inicio: toMin(ini) || 6 * 60,
          fin: toMin(fin) || 22 * 60
        };
      });
    }

    const ocupadosSet = new Set<string>();

    for (const student of baseEstudiantes) {
      for (const sch of (student.schedules || [])) {
        const diaIntervalos = intervalosData[sch.dia];
        if (!diaIntervalos) continue;

        for (const inter of diaIntervalos) {
          if (sch.hora_fin_min > inter.inicio && sch.hora_inicio_min < inter.fin) {
            ocupadosSet.add(student.id);
            break;
          }
        }
        if (ocupadosSet.has(student.id)) break;
      }
    }

    if (modo === "antidisponibilidad") {
      return baseEstudiantes.filter(s => ocupadosSet.has(s.id));
    } else {
      return baseEstudiantes.filter(s => !ocupadosSet.has(s.id));
    }
  }, [baseEstudiantes, selDias, intervalosDia, intervalosGlobal, modo]);

  // Cálculo instantáneo del horario para estudiantes seleccionados
  const resultadoHorario = useMemo(() => {
    if (selEstudiantes.length === 0 || selEstudiantes.includes("TODOS")) {
      return [];
    }
    const selSet = new Set(selEstudiantes);
    const matched = allStudents.filter(s => selSet.has(s.nombre_completo));
    return matched.flatMap(student =>
      (student.schedules || []).map((sch: any) => ({
        ...sch,
        student
      }))
    );
  }, [allStudents, selEstudiantes]);

  const openModal = (est: any) => {
    setModalStudent(est);
    const found = allStudents.find(s => s.id === est.id || s.nombre_completo === est.nombre_completo);
    const hor = found
      ? (found.schedules || []).map((sch: any) => ({ ...sch, student: found }))
      : [];
    setModalHorario(hor);
  };

  return (
    <div className="container" style={{ margin: '0 auto', marginTop: '30px', marginBottom: '30px' }}>
      <Header activeTab="disponibilidad" />

      <h2>Buscar estudiantes disponibles</h2>

      <SearchFilters 
        modo={modo}
        setModo={setModo}
        initPromociones={initPromociones}
        selPromociones={selPromociones}
        setSelPromociones={setSelPromociones}
        estudiantes={estudiantesDropdown}
        selEstudiantes={selEstudiantes}
        setSelEstudiantes={setSelEstudiantes}
        isDropdownOpen={isDropdownOpen}
        setIsDropdownOpen={setIsDropdownOpen}
        selDias={selDias}
        setSelDias={setSelDias}
        intervalosGlobal={intervalosGlobal}
        setIntervalosGlobal={setIntervalosGlobal}
        intervalosDia={intervalosDia}
        setIntervalosDia={setIntervalosDia}
      />

      <AvailableStudentsTable 
        estudiantes={resultadoDisponibles} 
        modo={modo} 
        onStudentClick={openModal} 
        hasSelectedDays={selDias.length > 0}
      />

      <WeeklyTimetable 
        horarios={resultadoHorario} 
        title={`Horario semanal — ${selEstudiantes.length > 0 && !selEstudiantes.includes("TODOS") ? selEstudiantes.join(', ').substring(0, 60) + (selEstudiantes.join(', ').length > 60 ? '...' : '') : 'Todos'}`} 
      />

      <StudentScheduleModal 
        student={modalStudent} 
        horario={modalHorario} 
        onClose={() => setModalStudent(null)} 
      />
    </div>
  );
}
