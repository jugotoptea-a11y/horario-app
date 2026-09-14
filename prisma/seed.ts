import { PrismaClient } from '@prisma/client';
import * as fs from 'fs';
import * as _xlsx from 'xlsx';
import path from 'path';

const xlsx: any = (_xlsx as any).readFile ? _xlsx : ((_xlsx as any).default || _xlsx);

const prisma = new PrismaClient();

// Helper para normalizar texto
function normalizar(text: string | null | undefined): string {
  if (!text) return "";
  return text.toString().normalize("NFKD").replace(/[\u0300-\u036f]/g, "").replace(/\s+/g, " ").trim().toLowerCase();
}

async function main() {
  const rutaExcel = path.join(process.cwd(), 'Información.xlsx');

  console.log("Limpiando base de datos (Estudiantes y Horarios)...");
  await prisma.schedule.deleteMany();
  await prisma.student.deleteMany();

  console.log(`Procesando ${rutaExcel}...`);
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
    console.warn(`No se encontró el Excel en: ${rutaExcel}. Por favor, asegúrate de colocar Información.xlsx en la raíz del proyecto.`);
    return;
  }

  // Insertar todos los estudiantes en la BD
  console.log("Insertando estudiantes (y solo estudiantes de Información.xlsx)...");
  await prisma.student.createMany({
      data: Array.from(studentsMap.values()),
      skipDuplicates: true
  });

  console.log("Poblado de estudiantes completado. (Ejecuta scripts/cargar_horarios.ts para los horarios).");
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
