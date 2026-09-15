import React, { useState, useMemo, useRef, useEffect } from 'react';

interface AvailableStudentsTableProps {
  estudiantes: any[];
  modo: 'disponibilidad' | 'antidisponibilidad';
  onStudentClick: (est: any) => void;
}

export default function AvailableStudentsTable({ estudiantes, modo, onStudentClick }: AvailableStudentsTableProps) {
  const [tableFilter, setTableFilter] = useState('');
  const [promoFilter, setPromoFilter] = useState<string[]>([]);
  const [isPromoDropdownOpen, setIsPromoDropdownOpen] = useState(false);
  const [sortConfig, setSortConfig] = useState<{ key: string, direction: 'asc' | 'desc' } | null>(null);
  const [selectedRows, setSelectedRows] = useState<Set<string>>(new Set());
  const [copiedId, setCopiedId] = useState<string | null>(null);
  
  const dropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsPromoDropdownOpen(false);
      }
    }
    function handleEscape(event: KeyboardEvent) {
      if (event.key === 'Escape') {
        setIsPromoDropdownOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    document.addEventListener("keydown", handleEscape);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
      document.removeEventListener("keydown", handleEscape);
    };
  }, [setIsPromoDropdownOpen]);

  const handleCopy = (text: string, id: string) => {
    navigator.clipboard.writeText(text);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 1200);
  };

  const requestSort = (key: string) => {
    let direction: 'asc' | 'desc' = 'asc';
    if (sortConfig && sortConfig.key === key && sortConfig.direction === 'asc') {
      direction = 'desc';
    }
    setSortConfig({ key, direction });
  };

  const sortedAndFilteredResult = useMemo(() => {
    let result = [...estudiantes];
    
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
    
    if (promoFilter.length > 0 && !promoFilter.includes('TODAS')) {
      result = result.filter(e => promoFilter.includes(String(e.promo)));
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
  }, [estudiantes, sortConfig, tableFilter, promoFilter]);

  const promocionesDisponibles = Array.from(new Set(estudiantes.map(e => String(e.promo)))).sort();

  if (estudiantes.length === 0) return null;

  return (
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
        <div style={{ display: 'flex', flexDirection: 'column', position: 'relative' }}>
          <label style={{ fontSize: '12px', fontWeight: 'bold' }}>Filtrar Promoción</label>
          <div className={`multiselect-dropdown ${isPromoDropdownOpen ? 'open' : ''}`} style={{ minWidth: '150px' }} ref={dropdownRef}>
            <div className="dropdown-toggle" onClick={() => setIsPromoDropdownOpen(!isPromoDropdownOpen)} style={{ padding: '6px', borderRadius: '4px', border: '1px solid #ccc', background: 'white', cursor: 'pointer', fontSize: '13px' }}>
              {promoFilter.length === 0 || promoFilter.includes("TODAS") 
                ? "Todas" 
                : promoFilter.length === 1 ? promoFilter[0] : `${promoFilter.length} seleccionadas`}
            </div>
            <div className="dropdown-menu" style={{ position: 'absolute', top: '100%', left: 0, zIndex: 10, background: 'white', border: '1px solid #ccc', borderRadius: '4px', padding: '5px', maxHeight: '200px', overflowY: 'auto', width: '100%', display: isPromoDropdownOpen ? 'block' : 'none', boxShadow: '0 4px 6px rgba(0,0,0,0.1)' }}>
              <label style={{ display: 'flex', alignItems: 'center', padding: '6px', cursor: 'pointer', fontSize: '13px', fontWeight: 'bold', borderBottom: '1px solid #eee' }} onClick={() => { setPromoFilter([]); }}>
                ☐ Todas
              </label>
              {promocionesDisponibles.map(p => (
                <label key={p} style={{ display: 'flex', alignItems: 'center', padding: '6px', cursor: 'pointer', fontSize: '13px' }}>
                  <input type="checkbox" style={{ marginRight: '8px' }} checked={promoFilter.includes(p)} 
                    onChange={(e) => {
                      let next = promoFilter.filter(x => x !== "TODAS");
                      if (e.target.checked) next.push(p);
                      else next = next.filter(x => x !== p);
                      setPromoFilter(next);
                    }} />
                  {p}
                </label>
              ))}
            </div>
          </div>
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
            <tr className="result-row" key={est.id} style={{ cursor: 'pointer' }} onClick={() => onStudentClick(est)}>
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
  );
}
