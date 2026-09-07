import { getPromociones, getEstudiantes } from "./actions";
import MainClient from "./MainClient";

export default async function Home() {
  const prom = await getPromociones();
  const est = await getEstudiantes();

  return (
    <>
      <MainClient initPromociones={prom} initEstudiantes={est} />
    </>
  );
}
