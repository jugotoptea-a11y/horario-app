"use client";

import React, { useState, useEffect } from "react";
import { buscarDisponibilidad, getHorarioClases, getEstudiantes } from "../../actions/homeActions";
import Header from "../Header";
import SearchFilters from "../SearchFilters";
import AvailableStudentsTable from "../AvailableStudentsTable";
import WeeklyTimetable from "../WeeklyTimetable";
import StudentScheduleModal from "../StudentScheduleModal";
import { toMin } from "../../utils/constants";

export default function MainClient({ initPromociones, initEstudiantes }: { initPromociones: string[], initEstudiantes: any[] }) {
  const [modo, setModo] = useState<"disponibilidad" | "antidisponibilidad">("disponibilidad");
  const [selPromociones, setSelPromociones] = useState<string[]>([]);
  const [estudiantes, setEstudiantes] = useState<any[]>(initEstudiantes);
  const [selEstudiantes, setSelEstudiantes] = useState<string[]>([]);
  
  const [selDias, setSelDias] = useState<string[]>([]);
  const [intervalosGlobal, setIntervalosGlobal] = useState({ inicio: "", fin: "" });
  const [intervalosDia, setIntervalosDia] = useState<Record<string, { inicio: string, fin: string }[]>>({});

  const [resultadoDisponibles, setResultadoDisponibles] = useState<any[]>([]);
  const [resultadoHorario, setResultadoHorario] = useState<any[]>([]);
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);

  // Modal features
  const [modalStudent, setModalStudent] = useState<any | null>(null);
  const [modalHorario, setModalHorario] = useState<any[]>([]);

  const openModal = async (est: any) => {
    setModalStudent(est);
    const hor = await getHorarioClases([est.nombre_completo]);
    setModalHorario(hor);
  };

  useEffect(() => {
    async function updateEstudiantes() {
      const data = await getEstudiantes(selPromociones);
      setEstudiantes(data);
      setSelEstudiantes(prev => prev.filter(name => data.some((e: any) => e.nombre_completo === name)));
    }
    updateEstudiantes();
  }, [selPromociones]);

  const handleBuscar = async (e: React.FormEvent) => {
    e.preventDefault();
    
    const intervalosData: Record<string, {inicio: number, fin: number}[]> = {};
    for (const dia of selDias) {
      let bloques = intervalosDia[dia] || [];
      if (bloques.length === 0) bloques = [{inicio: '', fin: ''}];
      
      const mappedBloques = bloques.map(b => {
        const ini = b.inicio || intervalosGlobal.inicio;
        const fin = b.fin || intervalosGlobal.fin;
        return {
          inicio: toMin(ini) || 6 * 60,
          fin: toMin(fin) || 22 * 60
        };
      });
      intervalosData[dia] = mappedBloques;
    }

    const res = await buscarDisponibilidad(modo, selDias, intervalosData, selPromociones, selEstudiantes);
    setResultadoDisponibles(res.disponibles);

    if (selEstudiantes.length > 0 && !selEstudiantes.includes("TODOS")) {
      const hor = await getHorarioClases(selEstudiantes);
      setResultadoHorario(hor);
    } else {
      setResultadoHorario([]);
    }
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
        estudiantes={estudiantes}
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
        handleBuscar={handleBuscar}
      />

      <AvailableStudentsTable 
        estudiantes={resultadoDisponibles} 
        modo={modo} 
        onStudentClick={openModal} 
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
