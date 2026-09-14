import { PrismaClient } from '@prisma/client';
import * as fs from 'fs';
import path from 'path';
import pdf from 'pdf-parse';

const prisma = new PrismaClient();

// Helper para normalizar texto para coincidencias
function normalizar(text: string | null | undefined): string {
  if (!text) return "";
  return text.toString().normalize("NFKD").replace(/[\u0300-\u036f]/g, "").replace(/\s+/g, " ").trim().toLowerCase();
}

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

const DIAS = ["LUNES", "MARTES", "MIERCOLES", "JUEVES", "VIERNES", "SABADO", "DOMINGO"];
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
        if (!codeMatch) {
            i++;
            continue;
        }
        
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
            for (const hor of horarios) {
                rows.push({ ...base, ...hor });
            }
        } else {
            rows.push({ ...base, Dia: "", Hora_Inicio: "", Hora_Fin: "" });
        }
    }
    return rows;
}

// Fallback logic for when text is parsed loosely (simulating the table logic if possible)
// Because `pdf-parse` loses table structure, we try a best-effort line-by-line if `parseNewFormat` fails.
function parseFallback(text: string) {
    // This is a minimal fallback. Since `pdf-parse` mixes table columns into consecutive lines,
    // precise table extraction without geometry (like pdfplumber has) is near impossible.
    // In most cases `parseNewFormat` covers the Next format. If it doesn't, we return empty array.
    return [];
}

async function extractFromPdf(pdfPath: string, promocion: string) {
    const dataBuffer = fs.readFileSync(pdfPath);
    const data = await pdf(dataBuffer);
    const fullText = data.text;

    const header = parseHeader(fullText);
    let rows = parseNewFormat(fullText);
    
    if (rows.length === 0) {
        rows = parseFallback(fullText);
    }

    return rows.map(r => ({
        Promocion: promocion,
        Periodo: header.Periodo,
        ID_Estudiante: header.ID_Estudiante,
        Nombre_Estudiante: header.Nombre_Estudiante,
        ...r
    }));
}

async function main() {
  const baseDir = path.join(process.cwd(), 'H');
  
  console.log(`Leyendo PDFs directamente usando TypeScript desde ${baseDir}...`);
  
  if (!fs.existsSync(baseDir)) {
      console.log(`La carpeta ${baseDir} no existe. Por favor, créala y coloca los PDFs allí.`);
      return;
  }

  const allRows: any[] = [];
  const promocionDirs = fs.readdirSync(baseDir, { withFileTypes: true })
      .filter(dirent => dirent.isDirectory())
      .map(dirent => dirent.name);

  for (const promocion of promocionDirs) {
      const promoPath = path.join(baseDir, promocion);
      
      const getPdfFiles = (dir: string): string[] => {
          let results: string[] = [];
          const list = fs.readdirSync(dir);
          for (const file of list) {
              const fullPath = path.join(dir, file);
              const stat = fs.statSync(fullPath);
              if (stat && stat.isDirectory()) results = results.concat(getPdfFiles(fullPath));
              else if (file.toLowerCase().endsWith('.pdf')) results.push(fullPath);
          }
          return results;
      };

      const pdfs = getPdfFiles(promoPath);
      if (pdfs.length === 0) continue;

      console.log(`Promoción: ${promocion} - ${pdfs.length} PDFs`);
      for (const pdfPath of pdfs) {
          try {
              const rows = await extractFromPdf(pdfPath, promocion);
              allRows.push(...rows);
          } catch (e) {
              console.error(`Error procesando ${pdfPath}:`, e);
          }
      }
  }

  if (allRows.length === 0) {
      console.log("No se extrajeron datos de los PDFs.");
      return;
  }

  console.log(`Se extrajeron ${allRows.length} registros (materias/franjas) de los PDFs.`);
  
  // Cargar estudiantes actuales a memoria para buscar rápido
  const allStudents = await prisma.student.findMany({
      select: { id: true, nombre_norm: true, nombre_completo: true, correo: true }
  });

  console.log("Mapeando horarios a estudiantes por nombre (priorizando perfiles completos)...");
  const schedulesToInsert = [];
  let noMatchCount = 0;

  for (const record of allRows) {
      const nombreEstudiante = record.Nombre_Estudiante;
      const normNombre = normalizar(nombreEstudiante);
      const pdfWords = normNombre.split(" ").filter(w => w.length > 2);
      
      let matchedStudentId: string | undefined = undefined;
      
      // Buscar coincidencias por nombre (al menos 2 palabras clave coincidentes)
      let possibleMatches = allStudents.filter(s => {
          const dbWords = s.nombre_norm.split(" ");
          const matchCount = pdfWords.filter(w => dbWords.includes(w)).length;
          return matchCount >= (pdfWords.length < 2 ? 1 : 2);
      });

      if (possibleMatches.length > 0) {
          // Priorizar el perfil "base" (el que tiene correo/información completa)
          const conBase = possibleMatches.filter(s => s.correo);
          if (conBase.length > 0) {
              matchedStudentId = conBase[0].id;
          } else {
              matchedStudentId = possibleMatches[0].id;
          }
      }
      
      // Si a pesar de todo no existe, ignoramos (como lo pidió el usuario, no crear falsos)
      if (!matchedStudentId) {
          noMatchCount++;
          continue;
      }
      
      const dia = record.Dia?.trim().toUpperCase();
      const horaInicioStr = record.Hora_Inicio;
      const horaFinStr = record.Hora_Fin;
      const materia = record.Materia;
      
      if (!dia || !horaInicioStr || !horaFinStr || !materia) {
          continue; // Falta información vital
      }

      const horaInicioMin = convertir24(horaInicioStr);
      const horaFinMin = convertir24(horaFinStr);

      schedulesToInsert.push({
          studentId: matchedStudentId,
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

  console.log(`Se ignoraron ${noMatchCount} registros que no coincidieron con estudiantes de Información.xlsx.`);
  console.log(`Preparando inserción de ${schedulesToInsert.length} horarios a la base de datos...`);

  console.log("Limpiando tabla Schedule (para evitar duplicados en recargas)...");
  await prisma.schedule.deleteMany();

  const chunkSize = 5000;
  for (let i = 0; i < schedulesToInsert.length; i += chunkSize) {
      const chunk = schedulesToInsert.slice(i, i + chunkSize);
      await prisma.schedule.createMany({ data: chunk });
      console.log(`Insertados ${i + chunk.length} de ${schedulesToInsert.length} horarios...`);
  }

  console.log("¡Carga de horarios completada exitosamente sin usar Python ni CSV!");
}

main()
  .then(async () => {
    await prisma.$disconnect();
  })
  .catch(async (e) => {
    console.error("Fallo inesperado:", e);
    await prisma.$disconnect();
    process.exit(1);
  });
