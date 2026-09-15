import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  console.log("Limpiando base de datos (Estudiantes y Horarios)...");
  await prisma.schedule.deleteMany();
  await prisma.student.deleteMany();
  console.log("Base de datos limpia.");
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
