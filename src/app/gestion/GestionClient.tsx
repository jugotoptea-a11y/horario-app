"use client";

import React, { useState } from "react";
import { previewStudentsCsv, applyStudentsCsv, previewSchedulesPdf, applySchedulesPdf } from "./actions";

export default function GestionClient() {
  const [tab, setTab] = useState<"estudiantes" | "horarios">("estudiantes");

  // State for CSV Upload
  const [csvPreview, setCsvPreview] = useState<any[] | null>(null);
  const [isCsvLoading, setIsCsvLoading] = useState(false);
  const [csvSuccess, setCsvSuccess] = useState("");

  // State for PDF Upload
  const [pdfPreview, setPdfPreview] = useState<{ estudiantes: any[], ignored: string[], schedulesToInsert: any[] } | null>(null);
  const [pdfPromo, setPdfPromo] = useState("2024");
  const [isPdfLoading, setIsPdfLoading] = useState(false);
  const [pdfSuccess, setPdfSuccess] = useState("");

  const downloadCsvTemplate = () => {
    const headers = "Documento,Nombre,Promocion,Correo,Contacto,Municipio,Programa\n";
    const blob = new Blob([headers], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.setAttribute("href", url);
    link.setAttribute("download", "plantilla_estudiantes.csv");
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handleCsvFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!e.target.files || e.target.files.length === 0) return;
    const file = e.target.files[0];
    
    setIsCsvLoading(true);
    setCsvSuccess("");
    try {
      const formData = new FormData();
      formData.append("file", file);
      const preview = await previewStudentsCsv(formData);
      setCsvPreview(preview);
    } catch (error: any) {
      alert("Error procesando CSV: " + error.message);
    }
    setIsCsvLoading(false);
  };

  const confirmCsv = async () => {
    if (!csvPreview || !window.confirm("¿Está seguro de aplicar estos cambios en la base de datos?")) return;
    
    setIsCsvLoading(true);
    try {
      const res = await applyStudentsCsv(csvPreview);
      setCsvSuccess(`¡Se crearon ${res.creados} y se actualizaron ${res.actualizados} estudiantes correctamente!`);
      setCsvPreview(null);
    } catch (error: any) {
      alert("Error aplicando cambios: " + error.message);
    }
    setIsCsvLoading(false);
  };

  const handlePdfFiles = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!e.target.files || e.target.files.length === 0) return;
    
    setIsPdfLoading(true);
    setPdfSuccess("");
    try {
      const formData = new FormData();
      Array.from(e.target.files).forEach(f => formData.append("files", f));
      
      const preview = await previewSchedulesPdf(formData, pdfPromo);
      setPdfPreview(preview);
    } catch (error: any) {
      alert("Error procesando PDFs: " + error.message);
    }
    setIsPdfLoading(false);
  };

  const confirmPdf = async () => {
    if (!pdfPreview || !window.confirm("¿Está seguro de aplicar estos horarios? Se reemplazarán los horarios anteriores de los estudiantes identificados.")) return;
    
    setIsPdfLoading(true);
    try {
      const total = await applySchedulesPdf(pdfPreview.schedulesToInsert);
      setPdfSuccess(`¡Se cargaron ${total} materias/franjas en total exitosamente!`);
      setPdfPreview(null);
    } catch (error: any) {
      alert("Error guardando horarios: " + error.message);
    }
    setIsPdfLoading(false);
  };

  return (
    <div className="container" style={{ margin: '0 auto', marginTop: '30px', marginBottom: '30px' }}>
      <nav className="top-menu" style={{ display: 'flex', gap: '10px' }}>
        <a className="menu-link" href="/" style={{ textDecoration: 'none', color: '#666' }}>Disponibilidad</a>
        <a className="menu-link active" href="/gestion">Gestión de Datos</a>
      </nav>

      <h2>Módulo de Gestión</h2>

      <div style={{ display: 'flex', gap: '15px', marginBottom: '20px' }}>
        <button type="button" 
            style={{ padding: '10px 20px', background: tab === 'estudiantes' ? 'var(--cuc-auburn)' : '#ccc', color: 'white', border: 'none', borderRadius: '8px', cursor: 'pointer' }}
            onClick={() => setTab('estudiantes')}>
            1. Cargar Estudiantes (CSV)
        </button>
        <button type="button" 
            style={{ padding: '10px 20px', background: tab === 'horarios' ? 'var(--cuc-auburn)' : '#ccc', color: 'white', border: 'none', borderRadius: '8px', cursor: 'pointer' }}
            onClick={() => setTab('horarios')}>
            2. Cargar Horarios (PDFs)
        </button>
      </div>

      {tab === "estudiantes" && (
        <div style={{ background: '#f8fafc', padding: '20px', borderRadius: '12px', border: '1px solid #e2e8f0' }}>
            <h3>Actualizar tabla de Estudiantes</h3>
            <p style={{ fontSize: '14px', color: '#475569', marginBottom: '15px' }}>
                Sube un archivo CSV para añadir o actualizar la información base de los estudiantes. Solo los estudiantes registrados aquí podrán tener un horario asignado posteriormente.
            </p>
            
            <button type="button" onClick={downloadCsvTemplate} style={{ marginBottom: '20px', background: '#333', color: 'white', padding: '8px 16px', borderRadius: '6px', fontSize: '13px' }}>
                ↓ Descargar plantilla CSV
            </button>

            <div style={{ border: '2px dashed #cbd5e1', padding: '30px', textAlign: 'center', borderRadius: '8px', background: 'white' }}>
                <input type="file" accept=".csv" id="csvUpload" style={{ display: 'none' }} onChange={handleCsvFile} />
                <label htmlFor="csvUpload" style={{ cursor: 'pointer', color: 'var(--cuc-auburn)', fontWeight: 'bold' }}>
                    {isCsvLoading ? "Procesando archivo..." : "Haz clic aquí para seleccionar el archivo CSV"}
                </label>
            </div>

            {csvSuccess && <div style={{ marginTop: '15px', padding: '10px', background: '#dcfce7', color: '#166534', borderRadius: '6px' }}>{csvSuccess}</div>}

            {csvPreview && (
                <div style={{ marginTop: '30px' }}>
                    <h4>Vista Previa ({csvPreview.length} registros encontrados)</h4>
                    <div style={{ maxHeight: '300px', overflowY: 'auto', border: '1px solid #e2e8f0', borderRadius: '8px', marginTop: '10px' }}>
                        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '13px' }}>
                            <thead style={{ background: '#f1f5f9', position: 'sticky', top: 0 }}>
                                <tr>
                                    <th style={{ padding: '8px', textAlign: 'left', borderBottom: '1px solid #cbd5e1' }}>Documento</th>
                                    <th style={{ padding: '8px', textAlign: 'left', borderBottom: '1px solid #cbd5e1' }}>Nombre</th>
                                    <th style={{ padding: '8px', textAlign: 'left', borderBottom: '1px solid #cbd5e1' }}>Promoción</th>
                                    <th style={{ padding: '8px', textAlign: 'center', borderBottom: '1px solid #cbd5e1' }}>Acción</th>
                                </tr>
                            </thead>
                            <tbody>
                                {csvPreview.map((s, i) => (
                                    <tr key={i} style={{ borderBottom: '1px solid #f1f5f9' }}>
                                        <td style={{ padding: '8px' }}>{s.id}</td>
                                        <td style={{ padding: '8px' }}>{s.nombre_completo}</td>
                                        <td style={{ padding: '8px' }}>{s.promo}</td>
                                        <td style={{ padding: '8px', textAlign: 'center' }}>
                                            <span style={{ background: s.estado === 'Nuevo' ? '#dbeafe' : '#fef9c3', color: s.estado === 'Nuevo' ? '#1e40af' : '#854d0e', padding: '2px 8px', borderRadius: '12px', fontSize: '11px' }}>
                                                {s.estado}
                                            </span>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                    
                    <button type="button" onClick={confirmCsv} disabled={isCsvLoading} style={{ marginTop: '20px', padding: '12px 24px', background: 'var(--cuc-auburn)', color: 'white', border: 'none', borderRadius: '8px', fontWeight: 'bold', cursor: 'pointer' }}>
                        Confirmar y Guardar Cambios
                    </button>
                </div>
            )}
        </div>
      )}

      {tab === "horarios" && (
        <div style={{ background: '#f8fafc', padding: '20px', borderRadius: '12px', border: '1px solid #e2e8f0' }}>
            <h3>Actualizar Horarios desde PDFs</h3>
            <p style={{ fontSize: '14px', color: '#475569', marginBottom: '15px' }}>
                Simula la antigua "carpeta H". Selecciona la promoción y sube uno o múltiples archivos PDF. El sistema cruzará la información con los estudiantes actuales. Si el estudiante ya tenía un horario, será reemplazado.
            </p>
            
            <div style={{ marginBottom: '20px' }}>
                <label style={{ fontWeight: 'bold', display: 'block', marginBottom: '8px', fontSize: '13px' }}>Promoción de los archivos a subir:</label>
                <input type="text" value={pdfPromo} onChange={e => setPdfPromo(e.target.value)} style={{ padding: '8px', borderRadius: '6px', border: '1px solid #ccc', width: '150px' }} />
            </div>

            <div style={{ border: '2px dashed #cbd5e1', padding: '30px', textAlign: 'center', borderRadius: '8px', background: 'white' }}>
                <input type="file" accept=".pdf" multiple id="pdfUpload" style={{ display: 'none' }} onChange={handlePdfFiles} />
                <label htmlFor="pdfUpload" style={{ cursor: 'pointer', color: 'var(--cuc-auburn)', fontWeight: 'bold' }}>
                    {isPdfLoading ? "Analizando PDFs, por favor espera..." : "Haz clic aquí para seleccionar múltiples PDFs"}
                </label>
            </div>

            {pdfSuccess && <div style={{ marginTop: '15px', padding: '10px', background: '#dcfce7', color: '#166534', borderRadius: '6px' }}>{pdfSuccess}</div>}

            {pdfPreview && (
                <div style={{ marginTop: '30px' }}>
                    <h4>Resumen de Extracción</h4>
                    
                    {pdfPreview.ignored.length > 0 && (
                        <div style={{ marginBottom: '20px', padding: '15px', background: '#fee2e2', borderRadius: '8px', border: '1px solid #fca5a5' }}>
                            <h5 style={{ color: '#991b1b', marginTop: 0 }}>Archivos Ignorados o sin coincidencias ({pdfPreview.ignored.length})</h5>
                            <ul style={{ fontSize: '12px', color: '#7f1d1d', margin: 0, paddingLeft: '20px', maxHeight: '100px', overflowY: 'auto' }}>
                                {pdfPreview.ignored.map((ig, i) => <li key={i}>{ig}</li>)}
                            </ul>
                        </div>
                    )}

                    <h5>Estudiantes Identificados ({pdfPreview.estudiantes.length})</h5>
                    <div style={{ maxHeight: '300px', overflowY: 'auto', border: '1px solid #e2e8f0', borderRadius: '8px', marginTop: '10px' }}>
                        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '13px' }}>
                            <thead style={{ background: '#f1f5f9', position: 'sticky', top: 0 }}>
                                <tr>
                                    <th style={{ padding: '8px', textAlign: 'left', borderBottom: '1px solid #cbd5e1' }}>Nombre</th>
                                    <th style={{ padding: '8px', textAlign: 'center', borderBottom: '1px solid #cbd5e1' }}>Materias Extraídas</th>
                                    <th style={{ padding: '8px', textAlign: 'center', borderBottom: '1px solid #cbd5e1' }}>Acción a ejecutar</th>
                                </tr>
                            </thead>
                            <tbody>
                                {pdfPreview.estudiantes.map((s, i) => (
                                    <tr key={i} style={{ borderBottom: '1px solid #f1f5f9' }}>
                                        <td style={{ padding: '8px' }}>{s.nombre}</td>
                                        <td style={{ padding: '8px', textAlign: 'center' }}>{s.materiasCount}</td>
                                        <td style={{ padding: '8px', textAlign: 'center' }}>
                                            <span style={{ background: s.estado === 'Nuevo' ? '#dbeafe' : '#fef9c3', color: s.estado === 'Nuevo' ? '#1e40af' : '#854d0e', padding: '2px 8px', borderRadius: '12px', fontSize: '11px' }}>
                                                {s.estado === 'Nuevo' ? 'Asignación Nueva' : 'Reemplazo de Horario'}
                                            </span>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                    
                    <button type="button" onClick={confirmPdf} disabled={isPdfLoading || pdfPreview.estudiantes.length === 0} style={{ marginTop: '20px', padding: '12px 24px', background: 'var(--cuc-auburn)', color: 'white', border: 'none', borderRadius: '8px', fontWeight: 'bold', cursor: 'pointer' }}>
                        Confirmar y Guardar Horarios
                    </button>
                </div>
            )}
        </div>
      )}

    </div>
  );
}
