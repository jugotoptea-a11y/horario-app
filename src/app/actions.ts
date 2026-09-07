"use server";
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

export async function getPromociones() {
  const proms = await prisma.student.findMany({
    select: { promo: true },
    where: { promo: { not: "" } },
    distinct: ['promo']
  });
  return proms.map(p => p.promo).filter((p): p is string => p !== null).sort().reverse();
}

export async function getEstudiantes(promociones?: string[]) {
  const whereClausule = promociones && promociones.length > 0 && !promociones.includes("TODAS") 
    ? { promo: { in: promociones } } 
    : {};

  const students = await prisma.student.findMany({
    where: whereClausule,
    orderBy: { nombre_norm: 'asc' },
    select: { id: true, nombre_completo: true, promo: true }
  });
  return students;
}

export async function getHorarioEstudiante(nombre: string) {
  const student = await prisma.student.findFirst({
    where: { OR: [ { nombre_completo: nombre }, { nombre_norm: nombre.toLowerCase() } ] },
    include: { schedules: true }
  });

  if (!student) return null;
  return student;
}

export async function buscarDisponibilidad(
  modo: "disponibilidad" | "antidisponibilidad",
  dias: string[],
  intervalosPorDia: Record<string, { inicio: number, fin: number }[]>,
  promociones?: string[],
  estudiantesSel?: string[]
) {
  const wherePromos = promociones && promociones.length > 0 && !promociones.includes("TODAS")
    ? { promo: { in: promociones } }
    : {};
  
  const whereNames = estudiantesSel && estudiantesSel.length > 0 && !estudiantesSel.includes("TODOS")
    ? { nombre_completo: { in: estudiantesSel } }
    : {};

  // Traer a todos los estudiantes filtrados base
  const estudiantes = await prisma.student.findMany({
    where: { ...wherePromos, ...whereNames },
    select: { id: true, nombre_completo: true, promo: true, correo: true, contacto: true }
  });

  if (!dias || dias.length === 0) return { disponibles: [], todosEstudiantes: estudiantes };

  // Buscar todos los IDs ocupados para las condiciones especificadas
  let ocupadosUnion = new Set<string>();

  for (const dia of dias) {
    const intervalos = intervalosPorDia[dia] || [];
    for (const inter of intervalos) {
      // Un schedule choca con el intervalo si:
      // no (fin_clase <= inicio_intervalo O inicio_clase >= fin_intervalo)
      // es decir: fin_clase > inicio_intervalo Y inicio_clase < fin_intervalo
      const choques = await prisma.schedule.findMany({
        where: {
          dia: dia,
          hora_fin_min: { gt: inter.inicio },
          hora_inicio_min: { lt: inter.fin }
        },
        select: { studentId: true }
      });
      for (const c of choques) ocupadosUnion.add(c.studentId);
    }
  }

  let resultIds: string[] = [];
  
  if (modo === "antidisponibilidad") {
    // Los que SI están ocupados en cualquiera de los bloques seleccionados
    resultIds = Array.from(ocupadosUnion);
  } else {
    // Disponibilidad: Los que NO están ocupados en NINGUNO de los bloques
    resultIds = estudiantes
      .map(e => e.id)
      .filter(id => !ocupadosUnion.has(id));
  }

  const disponiblesInfo = estudiantes.filter(e => resultIds.includes(e.id));
  return { 
    disponibles: disponiblesInfo,
    todosEstudiantes: estudiantes 
  };
}

// Retorna el horario de clases para la visualización global
export async function getHorarioClases(
  estudiantesSel: string[],
  promociones?: string[]
) {
    if (!estudiantesSel || estudiantesSel.length === 0 || estudiantesSel.includes("TODOS")) return [];

    const schedules = await prisma.schedule.findMany({
        where: {
            student: {
                nombre_completo: { in: estudiantesSel }
            }
        },
        include: { student: true }
    });

    return schedules;
}
