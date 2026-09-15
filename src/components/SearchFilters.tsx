import React, { Dispatch, SetStateAction, useEffect, useRef } from 'react';
import { DIAS, HORAS, toMin } from '../utils/constants';

interface SearchFiltersProps {
  modo: 'disponibilidad' | 'antidisponibilidad';
  setModo: Dispatch<SetStateAction<'disponibilidad' | 'antidisponibilidad'>>;
  initPromociones: string[];
  selPromociones: string[];
  setSelPromociones: Dispatch<SetStateAction<string[]>>;
  estudiantes: any[];
  selEstudiantes: string[];
  setSelEstudiantes: Dispatch<SetStateAction<string[]>>;
  isDropdownOpen: boolean;
  setIsDropdownOpen: Dispatch<SetStateAction<boolean>>;
  selDias: string[];
  setSelDias: Dispatch<SetStateAction<string[]>>;
  intervalosGlobal: { inicio: string, fin: string };
  setIntervalosGlobal: Dispatch<SetStateAction<{ inicio: string, fin: string }>>;
  intervalosDia: Record<string, { inicio: string, fin: string }[]>;
  setIntervalosDia: Dispatch<SetStateAction<Record<string, { inicio: string, fin: string }[]>>>;
  handleBuscar: (e: React.FormEvent) => void;
}

export default function SearchFilters({
  modo, setModo,
  initPromociones, selPromociones, setSelPromociones,
  estudiantes, selEstudiantes, setSelEstudiantes, isDropdownOpen, setIsDropdownOpen,
  selDias, setSelDias,
  intervalosGlobal, setIntervalosGlobal,
  intervalosDia, setIntervalosDia,
  handleBuscar
}: SearchFiltersProps) {
  
  const dropdownRef = useRef<HTMLDivElement>(null);
  
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsDropdownOpen(false);
      }
    }
    function handleEscape(event: KeyboardEvent) {
      if (event.key === 'Escape') {
        setIsDropdownOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    document.addEventListener("keydown", handleEscape);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
      document.removeEventListener("keydown", handleEscape);
    };
  }, [setIsDropdownOpen]);

  const isTodasPromo = selPromociones.includes("TODAS") || selPromociones.length === 0;

  return (
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
      <div className={`multiselect-dropdown ${isDropdownOpen ? 'open' : ''}`} ref={dropdownRef}>
        <div className="dropdown-toggle" onClick={() => setIsDropdownOpen(!isDropdownOpen)}>
          {selEstudiantes.length === 0 || selEstudiantes.includes("TODOS") 
            ? "-- Todos --" 
            : selEstudiantes.length === 1 ? selEstudiantes[0] : `${selEstudiantes.length} estudiantes seleccionados`}
        </div>
        <div className="dropdown-menu">
          <label className="est-label est-todos-label" onClick={() => { setSelEstudiantes([]); }} style={{cursor: 'pointer', userSelect: 'none', fontWeight: 600}}>
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
  );
}
