"use client";

import React, { useState, useEffect, useMemo } from "react";
import { buscarDisponibilidad, getHorarioClases, getEstudiantes } from "./actions";

const HORAS = [
  "06:00 AM", "06:30 AM", "07:00 AM", "07:30 AM", "08:00 AM", "08:30 AM", "09:00 AM", "09:30 AM",
  "10:00 AM", "10:30 AM", "11:00 AM", "11:30 AM", "12:00 PM", "12:30 PM", "01:00 PM", "01:30 PM",
  "02:00 PM", "02:30 PM", "03:00 PM", "03:30 PM", "04:00 PM", "04:30 PM", "05:00 PM", "05:30 PM",
  "06:00 PM", "06:30 PM", "07:00 PM", "07:30 PM", "08:00 PM", "08:30 PM", "09:00 PM", "09:30 PM", "10:00 PM"
];

const DIAS = ["LUNES", "MARTES", "MIERCOLES", "JUEVES", "VIERNES", "SABADO"];

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

  // Table filters and sorting
  const [sortConfig, setSortConfig] = useState<{ key: string, direction: 'asc' | 'desc' } | null>(null);
  const [tableFilter, setTableFilter] = useState('');
  const [promoFilter, setPromoFilter] = useState<string>('TODAS');

  // New features
  const [selectedRows, setSelectedRows] = useState<Set<string>>(new Set());
  const [modalStudent, setModalStudent] = useState<any | null>(null);
  const [modalHorario, setModalHorario] = useState<any[]>([]);
  const [copiedId, setCopiedId] = useState<string | null>(null);

  const handleCopy = (text: string, id: string) => {
    navigator.clipboard.writeText(text);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 1200);
  };

  const openModal = async (est: any) => {
    setModalStudent(est);
    const hor = await getHorarioClases([est.nombre_completo]);
    setModalHorario(hor);
  };

  const formatMin = (m: number) => {
    let hh = Math.floor(m / 60);
    const mm = m % 60;
    const ampm = hh >= 12 ? 'pm' : 'am';
    if (hh === 0) hh = 12;
    else if (hh > 12) hh -= 12;
    return `${hh}:${mm < 10 ? '0' + mm : mm} ${ampm}`;
  };

  useEffect(() => {
    async function updateEstudiantes() {
      const data = await getEstudiantes(selPromociones);
      setEstudiantes(data);
      // Remove any selected students that are no longer in the filtered list
      setSelEstudiantes(prev => prev.filter(name => data.some((e: any) => e.nombre_completo === name)));
    }
    updateEstudiantes();
  }, [selPromociones]);

  // Convierte "06:00 AM" a minutos para Prisma
  const toMin = (hhmm: string) => {
    if (!hhmm) return null;
    const parts = hhmm.trim().split(' ');
    const ampm = parts[1];
    const tiempon = parts[0].split(':');
    let horas = parseInt(tiempon[0]);
    const minutos = parseInt(tiempon[1]);

    if (ampm === 'PM' && horas !== 12) horas += 12;
    if (ampm === 'AM' && horas === 12) horas = 0;
    return horas * 60 + minutos;
  };

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

  const isTodasPromo = selPromociones.includes("TODAS") || selPromociones.length === 0;

  const requestSort = (key: string) => {
    let direction: 'asc' | 'desc' = 'asc';
    if (sortConfig && sortConfig.key === key && sortConfig.direction === 'asc') {
      direction = 'desc';
    }
    setSortConfig({ key, direction });
  };

  const sortedAndFilteredResult = useMemo(() => {
    let result = [...resultadoDisponibles];
    
    if (tableFilter) {
      const lower = tableFilter.toLowerCase();
      result = result.filter(e => 
        e.nombre_completo.toLowerCase().includes(lower) || 
        String(e.id).toLowerCase().includes(lower) || 
        String(e.promo).toLowerCase().includes(lower) ||
        (e.correo && e.correo.toLowerCase().includes(lower)) ||
        (e.contacto && String(e.contacto).toLowerCase().includes(lower))
      );
    }
    
    if (promoFilter && promoFilter !== 'TODAS') {
      result = result.filter(e => String(e.promo) === promoFilter);
    }
    
    if (sortConfig) {
      result.sort((a, b) => {
        let valA = a[sortConfig.key] || '';
        let valB = b[sortConfig.key] || '';
        
        if (sortConfig.key === 'id' || sortConfig.key === 'promo') {
          const numA = Number(valA);
          const numB = Number(valB);
          if (!isNaN(numA) && !isNaN(numB)) {
            return sortConfig.direction === 'asc' ? numA - numB : numB - numA;
          }
        }
        
        if (valA < valB) return sortConfig.direction === 'asc' ? -1 : 1;
        if (valA > valB) return sortConfig.direction === 'asc' ? 1 : -1;
        return 0;
      });
    }
    
    return result;
  }, [resultadoDisponibles, sortConfig, tableFilter, promoFilter]);

  return (
    <div className="container" style={{ margin: '0 auto', marginTop: '30px', marginBottom: '30px' }}>
      <nav className="top-menu" style={{ display: 'flex', gap: '10px' }}>
        <a className="menu-link active" href="/">Disponibilidad</a>
        <a className="menu-link" href="/gestion" style={{ textDecoration: 'none', color: '#666' }}>Gestión de Datos</a>
      </nav>

      <h2>Buscar estudiantes disponibles</h2>

      <form onSubmit={handleBuscar}>
        
        <label>Promoción <small>(selecciona una o varias, o "Todas")</small></label>
        <div className="days-selector">
          <div className="day-checkbox promo-todas">
            <input type="checkbox" id="promo-all" checked={isTodasPromo} onChange={(e) => setSelPromociones(e.target.checked ? ["TODAS"] : [])} />
            <label htmlFor="promo-all" style={isTodasPromo ? {background:'linear-gradient(145deg,#A3161A,#7B1113)', color:'white', borderColor:'#A3161A'} : {}}>
              &#9733; Todas
            </label>
          </div>
          {initPromociones.map((p, idx) => {
            const checked = selPromociones.includes(p);
            return (
              <div className="day-checkbox" key={p}>
                <input type="checkbox" id={`promo-${idx}`} checked={checked} onChange={(e) => {
                  let next = selPromociones.filter(x => x !== "TODAS");
                  if (e.target.checked) next.push(p);
                  else next = next.filter(x => x !== p);
                  next.sort((a, b) => initPromociones.indexOf(a) - initPromociones.indexOf(b));
                  setSelPromociones(next);
                }} />
                <label htmlFor={`promo-${idx}`} data-order={checked ? selPromociones.indexOf(p)+1 : ""}>{p}</label>
              </div>
            );
          })}
        </div>

        <label>Estudiante <small>(selecciona uno o varios, o "Todos")</small></label>
        <div className={`multiselect-dropdown ${isDropdownOpen ? 'open' : ''}`}>
          <div className="dropdown-toggle" onClick={() => setIsDropdownOpen(!isDropdownOpen)}>
            {selEstudiantes.length === 0 || selEstudiantes.includes("TODOS") 
              ? "-- Todos --" 
              : selEstudiantes.length === 1 ? selEstudiantes[0] : `${selEstudiantes.length} estudiantes seleccionados`}
          </div>
          <div className="dropdown-menu">
            <label className="est-label est-todos-label" onClick={() => { setSelEstudiantes([]); setIsDropdownOpen(false); }} style={{cursor: 'pointer', userSelect: 'none', fontWeight: 600}}>
              ☐ -- Todos --
            </label>
            {estudiantes.map(est => (
              <label className="est-label" key={est.nombre_completo}>
                <input type="checkbox" className="est-checkbox" checked={selEstudiantes.includes(est.nombre_completo)} 
                  onChange={(e) => {
                    let next = selEstudiantes.filter(x => x !== "TODOS");
                    if (e.target.checked) next.push(est.nombre_completo);
                    else next = next.filter(x => x !== est.nombre_completo);
                    setSelEstudiantes(next);
                    setIsDropdownOpen(false);
                  }} />
                {est.nombre_completo}
              </label>
            ))}
          </div>
        </div>

        <div className="form-row">
          <div>
            <label>Días</label>
            <div className="days-selector">
              {DIAS.map((d, idx) => {
                const checked = selDias.includes(d);
                return (
                  <div className="day-checkbox" key={d}>
                    <input type="checkbox" id={`day-${idx}`} checked={checked} onChange={(e) => {
                      if(e.target.checked) {
                        const next = [...selDias, d];
                        next.sort((a, b) => DIAS.indexOf(a) - DIAS.indexOf(b));
                        setSelDias(next);
                      }
                      else setSelDias(selDias.filter(x => x !== d));
                    }} />
                    <label htmlFor={`day-${idx}`} data-order={checked ? selDias.indexOf(d)+1 : ""}>{d}</label>
                  </div>
                );
              })}
            </div>
          </div>
        </div>

        {selDias.length === 0 && (
          <div className="form-row" id="forma-horarios-defecto" style={{ display: 'flex' }}>
            <div>
              <label>Hora inicio</label>
              <select value={intervalosGlobal.inicio} onChange={e => setIntervalosGlobal({...intervalosGlobal, inicio: e.target.value})}>
                <option value="">-- Usar por defecto --</option>
                {HORAS.map(h => <option key={h} value={h}>{h}</option>)}
              </select>
            </div>
            <div>
              <label>Hora fin</label>
              <select value={intervalosGlobal.fin} onChange={e => setIntervalosGlobal({...intervalosGlobal, fin: e.target.value})}>
                <option value="">-- Usar por defecto --</option>
                {HORAS.filter(h => {
                  const m = toMin(h) || 0;
                  const gIni = toMin(intervalosGlobal.inicio) || 0;
                  return !(intervalosGlobal.inicio && m <= gIni);
                }).map(h => <option key={h} value={h}>{h}</option>)}
              </select>
            </div>
          </div>
        )}

        <div className="jornadas-container">
          {selDias.map((d, dIdx) => {
             const bloques = intervalosDia[d] || [{inicio: '', fin: ''}];
             return bloques.map((bloque, bIdx) => {
               
               // Logic to disable overlapping hours
               const isHoraDisabled = (h: string, isFin: boolean) => {
                 const m = toMin(h);
                 if (m === null) return false;
                 
                 if (isFin && bloque.inicio) {
                   const curIni = toMin(bloque.inicio);
                   if (curIni !== null && m <= curIni) return true;
                 }
                 
                 for (let i = 0; i < bloques.length; i++) {
                   if (i === bIdx) continue;
                   const b = bloques[i];
                   if (!b.inicio || !b.fin) continue;
                   const bIni = toMin(b.inicio);
                   const bFin = toMin(b.fin);
                   if (bIni === null || bFin === null) continue;
                   
                   if (!isFin) {
                     if (m >= bIni && m < bFin) return true;
                   } else {
                     if (m > bIni && m <= bFin) return true;
                     const curIni = toMin(bloque.inicio);
                     if (curIni !== null && curIni <= bIni && m > bIni) return true;
                   }
                 }
                 return false;
               };

               return (
                 <div className="jornada-row" style={{position: 'relative'}} key={`${d}-${bIdx}`}>
                   <div className="jornada-dia">
                     {bIdx === 0 
                       ? <><span className="numero">{selDias.indexOf(d)+1}</span>{d}</> 
                       : <><span className="numero" style={{visibility:'hidden'}}></span>{d} (bloque {bIdx+1})</>}
                   </div>
                   <div>
                     <label style={{marginTop:0, marginBottom:'4px', fontSize:'12px'}}>Hora inicio</label>
                     <select className="jornada-select" value={bloque.inicio} onChange={(e) => {
                       const val = e.target.value;
                       setIntervalosDia(prev => {
                         const next = {...prev};
                         next[d] = [...(prev[d] || [{inicio:'', fin:''}])];
                         next[d][bIdx] = {...next[d][bIdx], inicio: val};
                         return next;
                       });
                     }}>
                       <option value="">-- Usar por defecto --</option>
                       {HORAS.filter(h => !isHoraDisabled(h, false)).map(h => <option key={h} value={h}>{h}</option>)}
                     </select>
                   </div>
                   <div>
                     <label style={{marginTop:0, marginBottom:'4px', fontSize:'12px'}}>Hora fin</label>
                     <select className="jornada-select" value={bloque.fin} onChange={(e) => {
                       const val = e.target.value;
                       setIntervalosDia(prev => {
                         const next = {...prev};
                         next[d] = [...(prev[d] || [{inicio:'', fin:''}])];
                         next[d][bIdx] = {...next[d][bIdx], fin: val};
                         return next;
                       });
                     }}>
                       <option value="">-- Usar por defecto --</option>
                       {HORAS.filter(h => !isHoraDisabled(h, true)).map(h => <option key={h} value={h}>{h}</option>)}
                     </select>
                   </div>
                   {bIdx > 0 && (
                     <button type="button" style={{position:'absolute', right:'10px', top:'10px', width:'auto', padding:'4px 8px', fontSize:'11px', background:'#e85d75', color: 'white'}} 
                       onClick={() => {
                         setIntervalosDia(prev => {
                           const next = {...prev};
                           next[d] = [...prev[d]];
                           next[d].splice(bIdx, 1);
                           return next;
                         });
                       }}>Eliminar</button>
                   )}
                 </div>
               );
             }).concat(
               <button type="button" key={`add-${d}`} style={{width:'auto', padding:'6px 12px', marginBottom:'12px', background:'var(--cuc-auburn)', fontSize:'12px', color: 'white'}} 
                 onClick={() => {
                   setIntervalosDia(prev => {
                     const next = {...prev};
                     next[d] = [...(prev[d] || [{inicio:'', fin:''}])];
                     next[d].push({inicio:'', fin:''});
                     return next;
                   });
                 }}>+ Añadir bloque horario para {d}</button>
             );
          })}
        </div>

        <div className="modo-toggle-wrapper">
          <span className="modo-toggle-label">Modo de búsqueda</span>
          <div className="modo-toggle">
            <input type="radio" id="modo-disp" value="disponibilidad" checked={modo === "disponibilidad"} onChange={() => setModo("disponibilidad")} />
            <label htmlFor="modo-disp">Disponibilidad</label>
            <input type="radio" id="modo-anti" value="antidisponibilidad" checked={modo === "antidisponibilidad"} onChange={() => setModo("antidisponibilidad")} />
            <label htmlFor="modo-anti">Antidisponibilidad</label>
          </div>
        </div>

        <button type="submit" id="btn-buscar" className={modo === "antidisponibilidad" ? "btn-antidisponibilidad" : ""}>
          {modo === "disponibilidad" ? "Buscar disponibilidad" : "Buscar antidisponibilidad"}
        </button>

      </form>

      {resultadoDisponibles.length > 0 && (
        <div className={`result ${modo === 'antidisponibilidad' ? 'result-antidisponibilidad' : ''}`}>
          <h3>
            {modo === 'antidisponibilidad' ? 'Estudiantes NO disponibles' : 'Estudiantes disponibles'} ({sortedAndFilteredResult.length})
          </h3>
          <div style={{ display: 'flex', gap: '15px', marginBottom: '15px', flexWrap: 'wrap', alignItems: 'center' }}>
            <div style={{ display: 'flex', flexDirection: 'column' }}>
              <label style={{ fontSize: '12px', fontWeight: 'bold' }}>Buscar en tabla</label>
              <input 
                type="text" 
                placeholder="Buscar..." 
                value={tableFilter} 
                onChange={e => setTableFilter(e.target.value)} 
                style={{ padding: '6px', borderRadius: '4px', border: '1px solid #ccc' }}
              />
            </div>
            <div style={{ display: 'flex', flexDirection: 'column' }}>
              <label style={{ fontSize: '12px', fontWeight: 'bold' }}>Filtrar Promoción</label>
              <select 
                value={promoFilter} 
                onChange={e => setPromoFilter(e.target.value)}
                style={{ padding: '6px', borderRadius: '4px', border: '1px solid #ccc' }}
              >
                <option value="TODAS">Todas</option>
                {Array.from(new Set(resultadoDisponibles.map(e => String(e.promo)))).sort().map(p => (
                  <option key={p} value={p}>{p}</option>
                ))}
              </select>
            </div>
          </div>
          <div className="copy-tools" style={{ display: 'flex', gap: '8px', marginBottom: '10px' }}>
            <button type="button" onClick={() => setSelectedRows(new Set(sortedAndFilteredResult.map(e => e.id)))} style={{ width: 'auto', padding: '6px 10px', fontSize: '12px', marginBottom: 0 }}>Seleccionar todo</button>
            <button type="button" onClick={() => setSelectedRows(new Set())} style={{ width: 'auto', padding: '6px 10px', fontSize: '12px', marginBottom: 0 }}>Quitar selección</button>
            <button type="button" onClick={() => {
              const sel = sortedAndFilteredResult.filter(e => selectedRows.has(e.id));
              if (sel.length === 0) return alert('Selecciona al menos una fila');
              const text = ["Nombre\tDocumento\tPromoción\tCorreo\tContacto"].concat(sel.map(e => `${e.nombre_completo}\t${e.id}\t${e.promo}\t${e.correo || ''}\t${e.contacto || ''}`)).join('\n');
              handleCopy(text, 'selected');
            }} style={{ width: 'auto', padding: '6px 10px', fontSize: '12px', marginBottom: 0 }}>{copiedId === 'selected' ? 'Copiado' : 'Copiar seleccionados'}</button>
            <button type="button" onClick={() => {
              const text = ["Nombre\tDocumento\tPromoción\tCorreo\tContacto"].concat(sortedAndFilteredResult.map(e => `${e.nombre_completo}\t${e.id}\t${e.promo}\t${e.correo || ''}\t${e.contacto || ''}`)).join('\n');
              handleCopy(text, 'all');
            }} style={{ width: 'auto', padding: '6px 10px', fontSize: '12px', marginBottom: 0 }}>{copiedId === 'all' ? 'Copiado' : 'Copiar todo'}</button>
          </div>
          <table className="result-table">
            <thead>
              <tr>
                <th style={{width: '34px', textAlign: 'center'}}>
                  <input type="checkbox" checked={selectedRows.size === sortedAndFilteredResult.length && sortedAndFilteredResult.length > 0} onChange={e => {
                    if (e.target.checked) setSelectedRows(new Set(sortedAndFilteredResult.map(e => e.id)));
                    else setSelectedRows(new Set());
                  }} />
                </th>
                <th style={{cursor: 'pointer'}} onClick={() => requestSort('nombre_completo')}>
                  Nombre {sortConfig?.key === 'nombre_completo' ? (sortConfig.direction === 'asc' ? '↑' : '↓') : ''}
                </th>
                <th style={{cursor: 'pointer'}} onClick={() => requestSort('id')}>
                  Documento {sortConfig?.key === 'id' ? (sortConfig.direction === 'asc' ? '↑' : '↓') : ''}
                </th>
                <th style={{cursor: 'pointer'}} onClick={() => requestSort('promo')}>
                  Promoción {sortConfig?.key === 'promo' ? (sortConfig.direction === 'asc' ? '↑' : '↓') : ''}
                </th>
                <th style={{cursor: 'pointer'}} onClick={() => requestSort('correo')}>
                  Correo {sortConfig?.key === 'correo' ? (sortConfig.direction === 'asc' ? '↑' : '↓') : ''}
                </th>
                <th style={{cursor: 'pointer'}} onClick={() => requestSort('contacto')}>
                  Contacto {sortConfig?.key === 'contacto' ? (sortConfig.direction === 'asc' ? '↑' : '↓') : ''}
                </th>
                <th>Acción</th>
              </tr>
            </thead>
            <tbody>
              {sortedAndFilteredResult.map(est => (
                <tr className="result-row" key={est.id} style={{ cursor: 'pointer' }} onClick={() => openModal(est)}>
                  <td style={{textAlign: 'center'}} onClick={e => e.stopPropagation()}>
                    <input type="checkbox" checked={selectedRows.has(est.id)} onChange={e => {
                      const next = new Set(selectedRows);
                      if (e.target.checked) next.add(est.id);
                      else next.delete(est.id);
                      setSelectedRows(next);
                    }} />
                  </td>
                  <td className="est-nombre">{est.nombre_completo}</td>
                  <td className="est-doc">{est.id}</td>
                  <td className="est-promo">{est.promo}</td>
                  <td className="est-correo">{est.correo}</td>
                  <td className="est-contacto">{est.contacto}</td>
                  <td onClick={e => e.stopPropagation()}>
                    <button type="button" onClick={() => handleCopy(`${est.nombre_completo}\t${est.id}\t${est.promo}\t${est.correo || ''}\t${est.contacto || ''}`, est.id)} style={{ width: 'auto', padding: '4px 8px', fontSize: '11px', margin: 0, borderRadius: '6px' }}>
                      {copiedId === est.id ? 'Copiado' : 'Copiar'}
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Main Horario Semanal (Bottom of page) */}
      {resultadoHorario.length > 0 && (
        <div className="horario-section" style={{ marginTop: '30px', background: 'white', borderRadius: '16px', padding: '20px', border: '1px solid rgba(163,22,26,0.15)', boxShadow: '0 8px 30px rgba(0,0,0,0.05)' }}>
          <h3 style={{ textTransform: 'uppercase', color: 'var(--cuc-auburn)' }}>Horario semanal — {selEstudiantes.length > 0 && !selEstudiantes.includes("TODOS") ? selEstudiantes.join(', ').substring(0, 60) + (selEstudiantes.join(', ').length > 60 ? '...' : '') : 'Todos'}</h3>
          
          <div className="horario-visual-content">
            <div className="timetable-shell" style={{ overflowX: 'auto', borderRadius: '12px', border: '1px solid #e2e8f0', marginTop: '16px' }}>
              <div style={{ minWidth: '760px', position: 'relative' }}>
                <table className="timetable" style={{ width: '100%', borderCollapse: 'collapse', fontSize: '13px', tableLayout: 'fixed' }}>
                  <thead>
                    <tr style={{ height: '40px' }}>
                      <th style={{ background: 'linear-gradient(145deg, var(--cuc-auburn), var(--cuc-red-deep))', color: 'white', padding: '10px 6px', width: '80px', boxSizing: 'border-box' }}>HORAS</th>
                      {DIAS.map(d => <th key={d} style={{ background: 'linear-gradient(145deg, var(--cuc-auburn), var(--cuc-red-deep))', color: 'white', padding: '10px 6px', width: 'calc((100% - 80px) / 6)', boxSizing: 'border-box' }}>{d}</th>)}
                    </tr>
                  </thead>
                  <tbody>
                    {(() => {
                      if (resultadoHorario.length === 0) return null;
                      const allMins = resultadoHorario.flatMap(h => [h.hora_inicio_min, h.hora_fin_min]);
                      let minMin = Math.min(...allMins);
                      let maxMin = Math.max(...allMins);
                      let startSlot = Math.floor(minMin / 30) * 30;
                      let endSlot = Math.ceil(maxMin / 30) * 30;
                      if (endSlot <= startSlot) endSlot = startSlot + 30;

                      const slots = [];
                      for (let m = startSlot; m < endSlot; m += 30) slots.push(m);

                      return slots.map((m, i) => (
                        <tr key={m}>
                          <td className="hora-col" style={{ background: '#f8fafc', padding: '4px', textAlign: 'center', fontWeight: 'bold', color: '#475569', borderRight: '1px solid #e2e8f0', width: '80px', height: '28px' }}>{formatMin(m)}</td>
                          {DIAS.map(d => <td key={d} style={{ borderBottom: '1px solid #f1f5f9', borderRight: '1px solid #f1f5f9', height: '28px' }}></td>)}
                        </tr>
                      ));
                    })()}
                  </tbody>
                </table>
                <div style={{ position: 'absolute', top: '40px', left: 0, right: 0, bottom: 0, pointerEvents: 'none' }}>
                  {(() => {
                    if (resultadoHorario.length === 0) return null;
                    const allMins = resultadoHorario.flatMap(h => [h.hora_inicio_min, h.hora_fin_min]);
                    let startSlot = Math.floor(Math.min(...allMins) / 30) * 30;
                    return resultadoHorario.map((clase, i) => {
                      const cIdx = DIAS.indexOf(clase.dia);
                      if (cIdx === -1) return null;
                      const sMin = clase.hora_inicio_min;
                      const eMin = clase.hora_fin_min;
                      const sIdx = Math.floor((sMin - startSlot) / 30);
                      const span = Math.ceil((eMin - sMin) / 30);
                      return (
                        <div key={i} className="clase-block" style={{
                          position: 'absolute',
                          top: `${sIdx * 28}px`,
                          left: `calc(80px + ${cIdx} * calc((100% - 80px) / 6) + 2px)`,
                          width: `calc((100% - 80px) / 6 - 4px)`,
                          height: `${Math.max(span * 28, 40)}px`,
                          background: 'var(--cuc-auburn)',
                          color: 'white',
                          borderRadius: '6px',
                          padding: '6px',
                          fontSize: '11px',
                          overflow: 'hidden',
                          display: 'flex',
                          flexDirection: 'column',
                          boxShadow: '0 4px 6px rgba(0,0,0,0.1)',
                          pointerEvents: 'auto'
                        }}>
                          <span style={{ fontWeight: 'bold', lineHeight: 1.2 }}>{clase.materia}</span>
                          <span style={{ fontSize: '9.5px', marginTop: '2px', opacity: 0.9 }}>{clase.docente || ''}</span>
                          <span style={{ fontSize: '10px', marginTop: '2px', opacity: 0.9 }}>{formatMin(sMin)} - {formatMin(eMin)}</span>
                          <span className="codigo-clase" style={{ background: 'rgba(0,0,0,0.2)', padding: '2px 4px', borderRadius: '4px', marginTop: '4px', fontSize: '10px', fontFamily: 'monospace', textAlign: 'center' }}>{clase.codigo_clase || clase.codigo || ''}</span>
                        </div>
                      );
                    });
                  })()}
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Modal Horario */}
      {modalStudent && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 9999, padding: '14px' }} onClick={() => setModalStudent(null)}>
          <div style={{ background: 'white', borderRadius: '10px', maxWidth: '820px', width: '100%', maxHeight: '75vh', overflow: 'auto', padding: '16px', position: 'relative' }} onClick={e => e.stopPropagation()}>
            <button onClick={() => setModalStudent(null)} style={{ position: 'absolute', top: '10px', right: '10px', background: 'transparent', border: 'none', fontSize: '20px', color: 'black', cursor: 'pointer', width: 'auto', padding: '0 10px', boxShadow: 'none' }}>×</button>
            <h3 style={{ color: 'var(--cuc-auburn)', textTransform: 'uppercase', marginBottom: '15px' }}>Horario de {modalStudent.nombre_completo}</h3>
            
            {modalHorario.length === 0 ? (
              <p style={{ color: '#666' }}>No hay horario disponible.</p>
            ) : (
              <div className="timetable-shell" style={{ overflowX: 'auto' }}>
                <div style={{ minWidth: '760px', position: 'relative' }}>
                  <table className="timetable" style={{ width: '100%', borderCollapse: 'collapse', fontSize: '12px', tableLayout: 'fixed' }}>
                    <thead>
                      <tr style={{ height: '35px' }}>
                        <th style={{ background: 'linear-gradient(145deg, var(--cuc-auburn), var(--cuc-red-deep))', color: 'white', padding: '8px', width: '75px', boxSizing: 'border-box' }}>HORAS</th>
                        {DIAS.map(d => <th key={d} style={{ background: 'linear-gradient(145deg, var(--cuc-auburn), var(--cuc-red-deep))', color: 'white', padding: '8px', width: 'calc((100% - 75px) / 6)', boxSizing: 'border-box' }}>{d}</th>)}
                      </tr>
                    </thead>
                    <tbody>
                      {(() => {
                        if (modalHorario.length === 0) return null;
                        const allMins = modalHorario.flatMap(h => [h.hora_inicio_min, h.hora_fin_min]);
                        let minMin = Math.min(...allMins);
                        let maxMin = Math.max(...allMins);
                        let startSlot = Math.floor(minMin / 30) * 30;
                        let endSlot = Math.ceil(maxMin / 30) * 30;
                        if (endSlot <= startSlot) endSlot = startSlot + 30;

                        const slots = [];
                        for (let m = startSlot; m < endSlot; m += 30) slots.push(m);

                        return slots.map((m, i) => (
                          <tr key={m}>
                            <td className="hora-col" style={{ background: '#f3f3f3', padding: '4px', textAlign: 'center', fontWeight: 'bold', width: '75px', height: '26px' }}>{formatMin(m)}</td>
                            {DIAS.map(d => <td key={d} style={{ border: '1px solid #e4d3d3', height: '26px' }}></td>)}
                          </tr>
                        ));
                      })()}
                    </tbody>
                  </table>
                  <div style={{ position: 'absolute', top: '35px', left: 0, right: 0, bottom: 0, pointerEvents: 'none' }}>
                    {(() => {
                      if (modalHorario.length === 0) return null;
                      const allMins = modalHorario.flatMap(h => [h.hora_inicio_min, h.hora_fin_min]);
                      let startSlot = Math.floor(Math.min(...allMins) / 30) * 30;
                      return modalHorario.map((clase, i) => {
                        const cIdx = DIAS.indexOf(clase.dia);
                        if (cIdx === -1) return null;
                        const sMin = clase.hora_inicio_min;
                        const eMin = clase.hora_fin_min;
                        const sIdx = Math.floor((sMin - startSlot) / 30);
                        const span = Math.ceil((eMin - sMin) / 30);
                        return (
                          <div key={i} className="clase-block" style={{
                            position: 'absolute',
                            top: `${sIdx * 26}px`,
                            left: `calc(75px + ${cIdx} * calc((100% - 75px) / 6) + 2px)`,
                            width: `calc((100% - 75px) / 6 - 4px)`,
                            height: `${Math.max(span * 26, 35)}px`,
                            background: 'var(--cuc-auburn)',
                            color: 'white',
                            borderRadius: '5px',
                            padding: '4px',
                            fontSize: '10px',
                            overflow: 'hidden',
                            display: 'flex',
                            flexDirection: 'column',
                            pointerEvents: 'auto'
                          }}>
                            <span style={{ fontWeight: 'bold', lineHeight: 1.1 }}>{clase.materia}</span>
                            <span>{formatMin(sMin)} - {formatMin(eMin)}</span>
                          </div>
                        );
                      });
                    })()}
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

    </div>
  );
}
