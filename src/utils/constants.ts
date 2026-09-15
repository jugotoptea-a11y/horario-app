export const HORAS = [
  "06:00 AM", "06:30 AM", "07:00 AM", "07:30 AM", "08:00 AM", "08:30 AM", "09:00 AM", "09:30 AM",
  "10:00 AM", "10:30 AM", "11:00 AM", "11:30 AM", "12:00 PM", "12:30 PM", "01:00 PM", "01:30 PM",
  "02:00 PM", "02:30 PM", "03:00 PM", "03:30 PM", "04:00 PM", "04:30 PM", "05:00 PM", "05:30 PM",
  "06:00 PM", "06:30 PM", "07:00 PM", "07:30 PM", "08:00 PM", "08:30 PM", "09:00 PM", "09:30 PM", "10:00 PM"
];

export const DIAS = ["LUNES", "MARTES", "MIERCOLES", "JUEVES", "VIERNES", "SABADO"];

export const formatMin = (m: number) => {
  let hh = Math.floor(m / 60);
  const mm = m % 60;
  const ampm = hh >= 12 ? 'pm' : 'am';
  if (hh === 0) hh = 12;
  else if (hh > 12) hh -= 12;
  return `${hh}:${mm < 10 ? '0' + mm : mm} ${ampm}`;
};

export const toMin = (hhmm: string) => {
  if (!hhmm) return null;
  const parts = hhmm.trim().split(' ');
  const ampm = parts[1];
  const tiempon = parts[0].split(':');
  let horas = parseInt(tiempon[0]);
  const minutos = parseInt(tiempon[1]);

  if (ampm === 'PM' && horas !== 12) horas += 12;
  if (ampm === 'AM' && horas === 12) horas = 0;
  return horas * 60 + minutos;
};
