import { getPromociones, getEstudiantes } from "../actions/homeActions";
import MainClient from "../components/home/MainClient";

export default async function Home() {
  const prom = await getPromociones();
  const est = await getEstudiantes();

  return (
    <>
      <MainClient initPromociones={prom} initEstudiantes={est} />
    </>
  );
}
