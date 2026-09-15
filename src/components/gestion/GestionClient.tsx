"use client";

import React, { useState } from "react";
import Header from "../Header";
import CsvUploadPanel from "../CsvUploadPanel";
import PdfUploadPanel from "../PdfUploadPanel";

export default function GestionClient() {
  const [tab, setTab] = useState<"estudiantes" | "horarios">("estudiantes");

  return (
    <div className="container" style={{ margin: '0 auto', marginTop: '30px', marginBottom: '30px' }}>
      <Header activeTab="gestion" />

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

      {tab === "estudiantes" && <CsvUploadPanel />}
      {tab === "horarios" && <PdfUploadPanel />}
    </div>
  );
}
