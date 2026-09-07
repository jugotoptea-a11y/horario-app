import { PrismaClient } from '@prisma/client';
import * as fs from 'fs';
import { parse } from 'csv-parse/sync';
import * as _xlsx from 'xlsx';
import path from 'path';

const xlsx: any = (_xlsx as any).readFile ? _xlsx : ((_xlsx as any).default || _xlsx);

const prisma = new PrismaClient();

// Helper para normalizar texto
function normalizar(text: string | null | undefined): string {
  if (!text) return "";
  return text.toString().normalize("NFKD").replace(/[\u0300-\u036f]/g, "").replace(/\s+/g, " ").trim().toLowerCase();
}

// Convertir hora (ej. "06:30" o "02:30 PM") a minutos desde medianoche
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

// Convertir de formato Date o String Excel a String HH:mm
function formatearHora(horaRaw: any): string {
    if (!horaRaw) return "";
    const min = convertir24(horaRaw.toString());
    const h = Math.floor(min / 60);
    const m = min % 60;
    return `${h.toString().padStart(2, '0')}:${m.toString().padStart(2, '0')}`;
}

async function main() {
  const rutaAnterior = path.join('C:\\Users\\sebas\\Downloads\\HORARIO');
  const rutaCsv = path.join(rutaAnterior, 'horarios_extraidos.csv');
  const rutaExcel = path.join(rutaAnterior, 'Información.xlsx');

  console.log("Limpiando base de datos...");
  await prisma.schedule.deleteMany();
  await prisma.student.deleteMany();

  console.log("Procesando Información.xlsx...");
  const studentsMap = new Map();
  if (fs.existsSync(rutaExcel)) {
    const workbook = xlsx.readFile(rutaExcel);
    const sheetName = workbook.SheetNames[0];
    const sheet = workbook.Sheets[sheetName];
    const rawRows: any[][] = xlsx.utils.sheet_to_json(sheet, { header: 1 });
    let headerIdx = rawRows.findIndex(r => Array.isArray(r) && r.some(c => {
      const s = String(c || '').toUpperCase();
      return s === 'ID' || s === 'DOCUMENTO' || s.includes('IDENTIFICACION');
    }));
    if (headerIdx === -1) headerIdx = 0;

    const rawData = xlsx.utils.sheet_to_json(sheet, { range: headerIdx });
    
    for (const row of rawData as Record<string, any>[]) {
      const findVal = (keys: string[]) => {
        for (const k of keys) {
          for (const [col, val] of Object.entries(row)) {
            if (col.trim().toUpperCase() === k.toUpperCase()) return val;
          }
        }
        return undefined;
      };

      const doc = findVal(['ID', 'Documento', 'Identificacion', 'ID_Estudiante']);
      const nombre = findVal(['Nombres y apellidos', 'Nombre y apellidos', 'Nombre', 'Nombre_Estudiante']);
      const promo = findVal(['PROM', 'Promo', 'Promocion', 'Promoción']);
      const correo = findVal(['CORREO', 'Correo', 'Email', 'Correo electrónico']);
      const contacto = findVal(['CONTACTO', 'Contacto', 'Telefono', 'Teléfono', 'Celular']);
      const municipio = findVal(['MUNICIPIO', 'Municipio', 'Ciudad']);
      const programa = findVal(['PROGRAMA', 'Programa', 'Carrera']);

      if (doc && nombre) {
        const docStr = String(doc).trim().replace(/\.0$/, "");
        studentsMap.set(docStr, {
          id: docStr,
          nombre_completo: String(nombre).trim(),
          nombre_norm: normalizar(nombre),
          promo: promo ? String(promo).trim() : null,
          correo: correo ? String(correo).trim() : null,
          contacto: contacto ? String(contacto).trim() : null,
          municipio: municipio ? String(municipio).trim() : null,
          programa: programa ? String(programa).trim() : null,
        });
      }
    }
    console.log(`Leídos ${studentsMap.size} estudiantes del Excel.`);
  } else {
    console.warn(`No se encontró el Excel en: ${rutaExcel}`);
  }

  console.log("Procesando horarios_extraidos.csv...");
  if (fs.existsSync(rutaCsv)) {
    const csvContent = fs.readFileSync(rutaCsv, 'utf-8');
    const records = parse(csvContent, { columns: true, skip_empty_lines: true, bom: true });

    let creados = 0;

    // Agrupar los horarios por estudiante
    for (const record of records) {
        const nombreEstudiante = record['Nombre_Estudiante'];
        const docEstudiante = record['ID_Estudiante'];
        const promo = record['Promocion'];
        
        if (!nombreEstudiante) continue;
        
        const normNombre = normalizar(nombreEstudiante);
        const docStr = docEstudiante ? String(docEstudiante).trim().replace(/\.0$/, "") : "";
        
        let studentData = docStr ? studentsMap.get(docStr) : undefined;
        
        // Fallback: si no cruzó por ID, intentar por nombre
        if (!studentData) {
            studentData = Array.from(studentsMap.values()).find((s: any) => s.nombre_norm === normNombre);
        }
        
        // Si no está en el Excel, crear uno básico con la info del CSV
        if (!studentData) {
            function toTitleCase(str: string) {
              return str.replace(/\w\S*/g, txt => txt.charAt(0).toUpperCase() + txt.substring(1).toLowerCase());
            }
            
            studentData = {
                id: docStr || `temp_${creados++}`,
                nombre_completo: toTitleCase(nombreEstudiante.trim()),
                nombre_norm: normNombre,
                promo: promo ? String(promo).trim() : null,
            };
            if (docStr) studentsMap.set(docStr, studentData);
            else studentsMap.set(normNombre, studentData);
        }
    }

    // Insertar todos los estudiantes en la BD
    console.log("Insertando estudiantes...");
    await prisma.student.createMany({
        data: Array.from(studentsMap.values()),
        skipDuplicates: true
    });

    console.log("Insertando horarios...");
    const schedules = [];
    for (const record of records) {
        const nombreEstudiante = record['Nombre_Estudiante'];
        const docEstudiante = record['ID_Estudiante'];
        const docStr = docEstudiante ? String(docEstudiante).trim().replace(/\.0$/, "") : "";
        const normNombre = normalizar(nombreEstudiante);
        
        let studentData = docStr ? studentsMap.get(docStr) : undefined;
        if (!studentData) {
            studentData = Array.from(studentsMap.values()).find((s: any) => s.nombre_norm === normNombre);
        }
        
        const dia = record['Dia']?.trim().toUpperCase();
        const horaInicioStr = record['Hora_Inicio'];
        const horaFinStr = record['Hora_Fin'];
        const materia = record['Materia'];
        
        if (!studentData || !studentData.id || !dia || !horaInicioStr || !horaFinStr || !materia) {
            continue;
        }

        const horaInicioMin = convertir24(horaInicioStr);
        const horaFinMin = convertir24(horaFinStr);

        schedules.push({
            studentId: studentData.id,
            promocion: record['Promocion'] || null,
            periodo: record['Periodo'] || null,
            dia: dia,
            hora_inicio: formatearHora(horaInicioStr),
            hora_fin: formatearHora(horaFinStr),
            hora_inicio_min: horaInicioMin,
            hora_fin_min: horaFinMin,
            prog: record['Prog'] || null,
            codigo_clase: record['Codigo_Clase'] || null,
            materia: String(materia).trim(),
            docente: record['Docente'] || null,
        });
    }

    // Prisma no soporta createMany con miles y miles muy grandes de una, así que lo dividimos (chunks)
    const chunkSize = 5000;
    for (let i = 0; i < schedules.length; i += chunkSize) {
        const chunk = schedules.slice(i, i + chunkSize);
        await prisma.schedule.createMany({ data: chunk });
        console.log(`Insertados ${i + chunk.length} de ${schedules.length} horarios...`);
    }

  } else {
    console.error(`No se encontró el CSV en: ${rutaCsv}`);
  }

  console.log("Migración completada.");
}

main()
  .then(async () => {
    await prisma.$disconnect();
  })
  .catch(async (e) => {
    console.error(e);
    await prisma.$disconnect();
    process.exit(1);
  });
