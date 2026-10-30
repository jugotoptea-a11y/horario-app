import { getPromociones, getAllStudentsWithSchedules } from "../actions/homeActions";
import MainClient from "../components/home/MainClient";

export default async function Home() {
  const [prom, allStudents] = await Promise.all([
    getPromociones(),
    getAllStudentsWithSchedules()
  ]);

  return (
    <>
      <MainClient initPromociones={prom} initAllStudents={allStudents} />
    </>
  );
}
