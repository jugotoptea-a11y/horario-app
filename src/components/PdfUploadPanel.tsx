import React, { useState } from "react";
import { previewSchedulesPdf, applySchedulesPdf } from "../actions/gestionActions";

export default function PdfUploadPanel() {
    const [pdfPreview, setPdfPreview] = useState<{ estudiantes: any[], ignored: string[], schedulesToInsert: any[] } | null>(null);
    const [pdfPromo, setPdfPromo] = useState("2024");
    const [isPdfLoading, setIsPdfLoading] = useState(false);
    const [pdfSuccess, setPdfSuccess] = useState("");

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
    );
}
