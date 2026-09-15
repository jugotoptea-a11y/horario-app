"use server";

import { parse } from 'csv-parse/sync';
import pdf from 'pdf-parse';
import { prisma } from '../lib/prisma';

// Helper para normalizar texto
function normalizar(text: string | null | undefined): string {
  if (!text) return "";
  return text.toString().normalize("NFKD").replace(/[\u0300-\u036f]/g, "").replace(/\s+/g, " ").trim().toLowerCase();
}

// -------------------------------------------------------------
// ESTUDIANTES (CSV)
// -------------------------------------------------------------

export async function previewStudentsCsv(formData: FormData) {
  const allowUpdate = formData.get("allowUpdate") === "true";
  const file = formData.get("file") as File;
  if (!file) throw new Error("No se proporcionó archivo");

  const text = await file.text();
  const records = parse(text, { columns: true, skip_empty_lines: true, bom: true });

  const currentStudents = await prisma.student.findMany({ select: { id: true, correo: true, contacto: true } });
  const currentIds = new Set(currentStudents.map(s => s.id));
  
  const emailMap = new Map();
  const phoneMap = new Map();
  for (const s of currentStudents) {
    if (s.correo) emailMap.set(s.correo.toLowerCase(), s.id);
    if (s.contacto) phoneMap.set(s.contacto, s.id);
  }

  const csvEmails = new Set();
  const csvPhones = new Set();
  const csvDocs = new Set();

  const results = [];
  
  for (const record of records) {
    const errores: string[] = [];
    
    const idRaw = record["Documento"]?.trim().replace(/\.0$/, "");
    if (!idRaw) errores.push("El documento no puede estar vacío");
    else if (!/^\d+$/.test(idRaw)) errores.push("El documento debe contener solo números");
    const id = idRaw || "";

    const pNombre = record["Primer Nombre"]?.trim();
    const sNombre = record["Segundo Nombre"]?.trim();
    const pApellido = record["Primer Apellido"]?.trim();
    const sApellido = record["Segundo Apellido"]?.trim();
    
    if (!pNombre) errores.push("El primer nombre es obligatorio");
    if (!pApellido) errores.push("El primer apellido es obligatorio");
    if (!sApellido) errores.push("El segundo apellido es obligatorio");

    const parts = [pNombre, sNombre, pApellido, sApellido].filter(Boolean);
    const nombre_completo = parts.join(" ");
    
    if (!nombre_completo) errores.push("No se pudo formar el nombre del estudiante");

    const promo = record["Promocion"]?.trim();
    if (!promo) errores.push("La promoción es obligatoria");

    const correo = record["Correo"]?.trim();
    if (!correo) errores.push("El correo es obligatorio");
    const contacto = record["Contacto"]?.trim();
    if (!contacto) errores.push("El contacto es obligatorio");
    const municipio = record["Municipio"]?.trim();
    if (!municipio) errores.push("El municipio es obligatorio");
    const programa = record["Programa"]?.trim();
    if (!programa) errores.push("El programa es obligatorio");

    const exists = currentIds.has(id);
    if (exists && !allowUpdate) {
      errores.push("El documento ya existe y no habilitaste la opción de actualizar");
    }

    if (id) {
      if (csvDocs.has(id)) errores.push("Documento duplicado en este mismo archivo CSV");
      else csvDocs.add(id);
    }

    if (correo) {
      const lowerCorreo = correo.toLowerCase();
      if (csvEmails.has(lowerCorreo)) errores.push("Correo duplicado en este mismo archivo CSV");
      else csvEmails.add(lowerCorreo);
      
      if (emailMap.has(lowerCorreo) && emailMap.get(lowerCorreo) !== id) {
        errores.push("El correo ya está registrado por otro estudiante en la BD");
      }
    }

    if (contacto) {
      if (csvPhones.has(contacto)) errores.push("Contacto duplicado en este mismo archivo CSV");
      else csvPhones.add(contacto);

      if (phoneMap.has(contacto) && phoneMap.get(contacto) !== id) {
        errores.push("El número de contacto ya está registrado por otro estudiante en la BD");
      }
    }

    results.push({
      id,
      nombre_completo,
      promo: promo || null,
      correo: correo || null,
      contacto: contacto || null,
      municipio: municipio || null,
      programa: programa || null,
      estado: exists ? "Actualizar" : "Nuevo",
      errores
    });
  }

  return results;
}

export async function applyStudentsCsv(students: any[]) {
  let creados = 0;
  let actualizados = 0;

  const transactionOps = students.map(s => {
    const data = {
      nombre_completo: s.nombre_completo,
      nombre_norm: normalizar(s.nombre_completo),
      promo: s.promo,
      correo: s.correo,
      contacto: s.contacto,
      municipio: s.municipio,
      programa: s.programa,
      actualizado_en: new Date().toISOString()
    };
    if (s.estado === "Nuevo") creados++;
    else actualizados++;
    
    return prisma.student.upsert({
      where: { id: s.id },
      update: data,
      create: { id: s.id, ...data }
    });
  });

  await prisma.$transaction(transactionOps);

  return { creados, actualizados };
}

// -------------------------------------------------------------
// HORARIOS (PDF) - REUTILIZANDO LÓGICA DE cargar_horarios.ts
// -------------------------------------------------------------

function convertir24(horaStr: string | null | undefined): number {
  if (!horaStr) return 0;
  const s = horaStr.toString().trim().toLowerCase();
  const match12 = s.match(/(\d{1,2}):(\d{2})\s*(am|pm)/i);
  if (match12) {
    let h = parseInt(match12[1], 10);
    const m = parseInt(match12[2], 10);
    const p = match12[3];
    if (p === "pm" && h !== 12) h += 12;
    if (p === "am" && h === 12) h = 0;
    return h * 60 + m;
  }
  const match24 = s.match(/(\d{1,2}):(\d{2})/);
  if (match24) {
    const h = parseInt(match24[1], 10);
    const m = parseInt(match24[2], 10);
    return h * 60 + m;
  }
  return 0;
}

function formatearHora(horaRaw: any): string {
  if (!horaRaw) return "";
  const min = convertir24(horaRaw.toString());
  const h = Math.floor(min / 60);
  const m = min % 60;
  return `${h.toString().padStart(2, '0')}:${m.toString().padStart(2, '0')}`;
}

const DIA_MAP: Record<string, string> = {
  "LUN": "LUNES", "MAR": "MARTES", "MIE": "MIERCOLES", "JUE": "JUEVES",
  "VIE": "VIERNES", "SAB": "SABADO", "DOM": "DOMINGO"
};

function normalizarDia(dia: string) {
  const key = normalizar(dia).toUpperCase().substring(0, 3);
  return DIA_MAP[key] || "";
}

function parseHeader(text: string) {
  const info = { Periodo: "", ID_Estudiante: "", Nombre_Estudiante: "" };
  let m = text.match(/Periodo\s*[:\-]?\s*(\d+)/i);
  if (m) info.Periodo = m[1];
  m = text.match(/Alumno\s*:\s*([^\n(]+)\(([^)]+)\)/i);
  if (m) {
      info.Nombre_Estudiante = m[1].trim();
      info.ID_Estudiante = m[2].trim();
      return info;
  }
  const textPlain = normalizar(text).toUpperCase();
  m = textPlain.match(/Estudiante\s*[:\-]?\s*(\d+)\s+([A-Z\s]+?)(?=\s+HORAS|\n|$)/);
  if (m) {
      info.ID_Estudiante = m[1];
      info.Nombre_Estudiante = m[2].trim();
  }
  return info;
}

function parseTimeLine(line: string) {
  const day = "(?:Lun|Mar|Mi[eé]|Jue|Vie|S[aá]b|Dom)";
  const pattern = new RegExp(`^(${day}(?:\\s*,\\s*${day})*)\\s+(\\d{1,2}:\\d{2})\\s*-\\s*(\\d{1,2}:\\d{2})`, 'i');
  const match = line.match(pattern);
  if (!match) return [];
  const diasStr = match[1];
  const inicio = match[2];
  const fin = match[3];
  const dias = diasStr.split(/\s*,\s*/).map(normalizarDia).filter(Boolean);
  return dias.map(dia => ({ Dia: dia, Hora_Inicio: inicio, Hora_Fin: fin }));
}

function parseNewFormat(text: string) {
  const rows: any[] = [];
  const lines = text.split('\n').map(l => l.trim().replace(/\s+/g, ' ')).filter(Boolean);
  let i = 0;
  while (i < lines.length) {
      const codeMatch = lines[i].match(/Materia\s*:\s*(.+)$/i);
      if (!codeMatch) { i++; continue; }
      const codigo = codeMatch[1].trim();
      const block = [];
      i++;
      while (i < lines.length && !lines[i].match(/Materia\s*:/i)) {
          block.push(lines[i]);
          i++;
      }
      if (block.length === 0) continue;
      const materiaLines = [];
      let docente = "";
      const horarios = [];
      for (const line of block) {
          const parsedTimes = parseTimeLine(line);
          if (parsedTimes.length > 0) {
              horarios.push(...parsedTimes);
              continue;
          }
          if (line.includes("Grupo ")) {
              docente = line.split("Grupo ")[0].replace(/[|\s]+$/, '').trim();
              continue;
          }
          if (docente) continue;
          if (line.match(/Sin\s+horario|^\d{2}\.\d{2}\.\d{4}|^-$|B\s*\|/i)) continue;
          materiaLines.push(line);
      }
      const materia = materiaLines.join(" ").trim();
      if (!materia || normalizar(materia).toUpperCase().includes("BIVE")) continue;
      const base = { Codigo_Clase: codigo, Materia: materia, Docente: docente, Prog: "" };
      if (horarios.length > 0) {
          for (const hor of horarios) rows.push({ ...base, ...hor });
      }
  }
  return rows;
}

export async function previewSchedulesPdf(formData: FormData, promocion: string) {
  const pdf = require('pdf-parse');
  const files = formData.getAll("files") as File[];
  if (!files || files.length === 0) throw new Error("No se proporcionaron archivos PDF");

  const allStudents = await prisma.student.findMany({ select: { id: true, nombre_norm: true, nombre_completo: true, correo: true } });

  // Saber cuáles ya tienen horario
  const studentsWithSchedule = new Set((await prisma.schedule.findMany({
      select: { studentId: true },
      distinct: ['studentId']
  })).map(s => s.studentId));

  const allRows: any[] = [];
  const validStudents = new Map<string, any>();
  const ignoredPdfs: string[] = [];

  for (const file of files) {
      const buffer = Buffer.from(await file.arrayBuffer());
      const data = await pdf(buffer);
      const fullText = data.text;
      const header = parseHeader(fullText);
      const rows = parseNewFormat(fullText);

      const normNombre = normalizar(header.Nombre_Estudiante);
      const pdfWords = normNombre.split(" ").filter(w => w.length > 2);
      
      let matchedStudent: any = undefined;
      
      const scoredMatches = allStudents.map(s => {
          const dbWords = s.nombre_norm.split(" ");
          const matchCount = pdfWords.filter(w => dbWords.includes(w)).length;
          return { student: s, matchCount };
      }).filter(x => x.matchCount >= (pdfWords.length < 2 ? 1 : 2));

      if (scoredMatches.length > 0) {
          scoredMatches.sort((a, b) => {
              if (b.matchCount !== a.matchCount) return b.matchCount - a.matchCount;
              const aHasBase = a.student.correo ? 1 : 0;
              const bHasBase = b.student.correo ? 1 : 0;
              return bHasBase - aHasBase;
          });
          matchedStudent = scoredMatches[0].student;
      }

      if (!matchedStudent) {
          ignoredPdfs.push(`${file.name} (No coincide con nadie: ${header.Nombre_Estudiante || 'Desconocido'})`);
          continue;
      }

      if (rows.length > 0) {
          const stdId = matchedStudent.id;
          
          if (!validStudents.has(stdId)) {
            validStudents.set(stdId, {
                id: stdId,
                nombre: matchedStudent.nombre_completo,
                estado: studentsWithSchedule.has(stdId) ? "Reemplazar" : "Nuevo",
                materiasCount: 0
            });
          }
          
          validStudents.get(stdId).materiasCount += rows.length;

          allRows.push(...rows.map(r => ({
              Promocion: promocion,
              Periodo: header.Periodo,
              ID_Estudiante: stdId,
              ...r
          })));
      } else {
        ignoredPdfs.push(`${file.name} (No se detectaron materias con el formato esperado)`);
      }
  }

  return {
      estudiantes: Array.from(validStudents.values()),
      ignored: ignoredPdfs,
      schedulesToInsert: allRows // Retornamos esto para que el cliente lo pase de vuelta al confirmar
  };
}

export async function applySchedulesPdf(schedulesData: any[]) {
  if (!schedulesData || schedulesData.length === 0) return 0;

  const schedulesToInsert = [];
  const affectedStudents = new Set<string>();

  for (const record of schedulesData) {
      const dia = record.Dia?.trim().toUpperCase();
      const horaInicioStr = record.Hora_Inicio;
      const horaFinStr = record.Hora_Fin;
      const materia = record.Materia;
      
      if (!dia || !horaInicioStr || !horaFinStr || !materia) continue;

      const horaInicioMin = convertir24(horaInicioStr);
      const horaFinMin = convertir24(horaFinStr);
      
      affectedStudents.add(record.ID_Estudiante);

      schedulesToInsert.push({
          studentId: record.ID_Estudiante,
          promocion: record.Promocion || null,
          periodo: record.Periodo || null,
          dia: dia,
          hora_inicio: formatearHora(horaInicioStr),
          hora_fin: formatearHora(horaFinStr),
          hora_inicio_min: horaInicioMin,
          hora_fin_min: horaFinMin,
          prog: record.Prog || null,
          codigo_clase: record.Codigo_Clase || null,
          materia: String(materia).trim(),
          docente: record.Docente || null,
      });
  }

  // Borrar horarios viejos SOLO de los estudiantes que están siendo actualizados
  await prisma.schedule.deleteMany({
      where: {
          studentId: { in: Array.from(affectedStudents) }
      }
  });

  // Insertar por chunks
  const chunkSize = 5000;
  for (let i = 0; i < schedulesToInsert.length; i += chunkSize) {
      const chunk = schedulesToInsert.slice(i, i + chunkSize);
      await prisma.schedule.createMany({ data: chunk });
  }

  return schedulesToInsert.length;
}
