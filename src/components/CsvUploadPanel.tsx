"use client";

import React, { useState } from "react";
import { previewStudentsCsv, applyStudentsCsv } from "../actions/gestionActions";

export default function CsvUploadPanel() {
  const [csvPreview, setCsvPreview] = useState<any[] | null>(null);
  const [isCsvLoading, setIsCsvLoading] = useState(false);
  const [csvSuccess, setCsvSuccess] = useState("");
  const [allowUpdate, setAllowUpdate] = useState(false);

  const downloadCsvTemplate = () => {
    const headers = "Documento,Primer Nombre,Segundo Nombre,Primer Apellido,Segundo Apellido,Promocion,Correo,Contacto,Municipio,Programa\n";
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
      formData.append("allowUpdate", allowUpdate.toString());
      const preview = await previewStudentsCsv(formData);
      setCsvPreview(preview);
    } catch (error: any) {
      alert("Error procesando CSV: " + error.message);
    }
    setIsCsvLoading(false);
  };

  const hasErrors = csvPreview?.some(r => r.errores && r.errores.length > 0) ?? false;

  const confirmCsv = async () => {
    if (hasErrors) return alert("Por favor, corrige los errores en el archivo antes de continuar.");
    if (!csvPreview || !window.confirm("¿Está seguro de aplicar estos cambios en la base de datos?")) return;
    
    setIsCsvLoading(true);
    try {
      // Filtrar campos necesarios para el action
      const validos = csvPreview.map(s => ({
        id: s.id,
        nombre_completo: s.nombre_completo,
        promo: s.promo,
        correo: s.correo,
        contacto: s.contacto,
        municipio: s.municipio,
        programa: s.programa,
        estado: s.estado
      }));
      const res = await applyStudentsCsv(validos);
      setCsvSuccess(`¡Se crearon ${res.creados} y se actualizaron ${res.actualizados} estudiantes correctamente!`);
      setCsvPreview(null);
    } catch (error: any) {
      alert("Error aplicando cambios: " + error.message);
    }
    setIsCsvLoading(false);
  };

  return (
    <div style={{ background: '#f8fafc', padding: '20px', borderRadius: '12px', border: '1px solid #e2e8f0' }}>
      <h3>Actualizar tabla de Estudiantes</h3>
      <p style={{ fontSize: '14px', color: '#475569', marginBottom: '15px' }}>
          Sube un archivo CSV para añadir estudiantes. Asegúrate de respetar el formato exacto de las columnas.
      </p>
      
      <label style={{ display: 'flex', alignItems: 'center', marginBottom: '15px', fontSize: '13px', cursor: 'pointer', background: '#e2e8f0', padding: '10px', borderRadius: '8px', width: 'fit-content' }}>
        <input type="checkbox" checked={allowUpdate} onChange={e => setAllowUpdate(e.target.checked)} style={{ marginRight: '8px', cursor: 'pointer' }} />
        Permitir actualizar los datos de estudiantes que ya existen en la base de datos (si el documento coincide).
      </label>

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
              <h4>Vista Previa ({csvPreview.length} registros analizados)</h4>
              
              {hasErrors && (
                <div style={{ marginBottom: '15px', padding: '10px', background: '#fee2e2', color: '#991b1b', borderRadius: '6px', fontSize: '13px' }}>
                  <strong>Se encontraron errores.</strong> Por favor corrige el archivo y súbelo nuevamente. No podrás guardar hasta que todas las filas sean válidas.
                </div>
              )}

              <div style={{ maxHeight: '400px', overflowY: 'auto', border: '1px solid #e2e8f0', borderRadius: '8px', marginTop: '10px' }}>
                  <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '13px' }}>
                      <thead style={{ background: '#f1f5f9', position: 'sticky', top: 0 }}>
                          <tr>
                              <th style={{ padding: '8px', textAlign: 'left', borderBottom: '1px solid #cbd5e1' }}>Documento</th>
                              <th style={{ padding: '8px', textAlign: 'left', borderBottom: '1px solid #cbd5e1' }}>Nombre Compuesto</th>
                              <th style={{ padding: '8px', textAlign: 'center', borderBottom: '1px solid #cbd5e1' }}>Acción</th>
                              <th style={{ padding: '8px', textAlign: 'left', borderBottom: '1px solid #cbd5e1' }}>Estado / Errores</th>
                          </tr>
                      </thead>
                      <tbody>
                          {csvPreview.map((s, i) => {
                            const errs = s.errores || [];
                            const isError = errs.length > 0;
                            return (
                              <tr key={i} style={{ borderBottom: '1px solid #f1f5f9', background: isError ? '#fef2f2' : 'white' }}>
                                  <td style={{ padding: '8px' }}>{s.id || '-'}</td>
                                  <td style={{ padding: '8px' }}>{s.nombre_completo || '-'}</td>
                                  <td style={{ padding: '8px', textAlign: 'center' }}>
                                      {isError ? (
                                        <span style={{ color: '#dc2626', fontWeight: 'bold' }}>✗ Rechazado</span>
                                      ) : (
                                        <span style={{ background: s.estado === 'Nuevo' ? '#dbeafe' : '#fef9c3', color: s.estado === 'Nuevo' ? '#1e40af' : '#854d0e', padding: '2px 8px', borderRadius: '12px', fontSize: '11px' }}>
                                            {s.estado}
                                        </span>
                                      )}
                                  </td>
                                  <td style={{ padding: '8px', color: isError ? '#dc2626' : '#16a34a' }}>
                                    {isError ? (
                                      <ul style={{ margin: 0, paddingLeft: '15px' }}>
                                        {errs.map((e: string, idx: number) => <li key={idx}>{e}</li>)}
                                      </ul>
                                    ) : (
                                      "✓ Válido"
                                    )}
                                  </td>
                              </tr>
                            );
                          })}
                      </tbody>
                  </table>
              </div>
              
              <button type="button" onClick={confirmCsv} disabled={isCsvLoading || hasErrors} style={{ marginTop: '20px', padding: '12px 24px', background: hasErrors ? '#ccc' : 'var(--cuc-auburn)', color: 'white', border: 'none', borderRadius: '8px', fontWeight: 'bold', cursor: hasErrors ? 'not-allowed' : 'pointer' }}>
                  Confirmar y Guardar Cambios
              </button>
          </div>
      )}
    </div>
  );
}
