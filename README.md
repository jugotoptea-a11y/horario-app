# Horario App

Una aplicación robusta construida con **Next.js (App Router)** y **PostgreSQL** para la gestión integral de disponibilidad y cruce de horarios de estudiantes. Permite cargar masivamente información base (vía CSV) y extraer automáticamente horarios de clase desde archivos PDF oficiales, para luego cruzar las disponibilidades y encontrar estudiantes libres en franjas específicas.

##  Arquitectura del Proyecto

El proyecto está organizado de manera integral, abarcando configuración, frontend, backend y base de datos:

```text
horario-app/
├── next.config.ts                # Configuración principal de Next.js
├── package.json                  # Dependencias y scripts del proyecto (npm run dev, etc.)
├── tsconfig.json                 # Configuración del compilador de TypeScript
├── prisma/                       # Archivos de la Base de Datos
│   └── schema.prisma             # Definición del esquema de tablas (Estudiantes y Horarios)
├── public/                       # Archivos estáticos y multimedia
│   └── OA_LOGO.png               # Logo de la aplicación
├── scripts/                      # Scripts de utilidades adicionales
└── src/                          # Código fuente principal de la aplicación
    ├── actions/                  # Lógica de Backend (Server Actions)
    │   ├── gestionActions.ts     # Lógica para procesar PDFs de horarios y CSVs
    │   └── homeActions.ts        # Consultas de disponibilidad y estudiantes
    ├── app/                      # Enrutamiento de Next.js (Sistema de URLs)
    │   ├── gestion/
    │   │   └── page.tsx          # Ruta: /gestion (Módulo de Gestión)
    │   ├── layout.tsx            # Plantilla principal (Root Layout) HTML
    │   ├── page.tsx              # Ruta: / (Módulo de Disponibilidad)
    │   └── globals.css           # Estilos globales y variables CSS
    ├── components/               # Componentes Visuales React (Client Components)
    │   ├── gestion/
    │   │   └── GestionClient.tsx # Contenedor principal de /gestion
    │   ├── home/
    │   │   └── MainClient.tsx    # Contenedor principal de / (Disponibilidad)
    │   ├── CsvUploadPanel.tsx    # Interfaz para subir CSV de estudiantes
    │   ├── PdfUploadPanel.tsx    # Interfaz para subir PDF de horarios
    │   ├── SearchFilters.tsx     # Filtros de promociones, días y horas
    │   ├── AvailableStudentsTable.tsx # Tabla de resultados de estudiantes libres
    │   ├── WeeklyTimetable.tsx   # Gráfico de matriz de tiempo libre común
    │   ├── StudentScheduleModal.tsx # Modal para ver horario individual
    │   └── Header.tsx            # Barra de navegación principal
    ├── lib/
    │   └── prisma.ts             # Instancia Singleton de Prisma ORM
    └── utils/
        └── constants.ts          # Constantes, colores y funciones de cálculo de horas
```

## Requisitos Previos

- **Node.js** (v18 o superior)
- **PostgreSQL** (base de datos local o remota)
- **Git**

## Instalación y Configuración

1. **Instalar dependencias:**
   Ejecuta en la terminal de la raíz del proyecto:
   ```bash
   npm install
   ```

2. **Configurar Variables de Entorno:**
   Asegúrate de tener un archivo `.env` en la raíz del proyecto con tu cadena de conexión a PostgreSQL. Ejemplo:
   ```env
   DATABASE_URL="postgresql://usuario:contraseña@localhost:5432/horariodb"
   ```

3. **Sincronizar la Base de Datos:**
   Si hay cambios pendientes o es la primera vez que configuras la BD:
   ```bash
   npx prisma db push
   # O si usas migraciones completas: npx prisma migrate dev
   ```

##  Ejecución en Desarrollo

Para iniciar el servidor local, ejecuta:

```bash
npm run dev
```

La aplicación estará disponible en `http://localhost:3000`.

## Funcionalidades Principales

### 1. Módulo de Gestión de Datos (`/gestion`)
- **Carga de Estudiantes (CSV):** Permite subir de forma masiva estudiantes usando una plantilla estructurada. Cuenta con validaciones estrictas de campos vacíos, tipos de datos numéricos y prevención de duplicidad (tanto en el documento como en correos/teléfonos cruzados contra la base de datos).
- **Carga de Horarios (PDF):** Lee e interpreta de forma automática los horarios oficiales en formato PDF. Vincula los datos con los estudiantes previamente registrados en el sistema.

### 2. Módulo de Disponibilidad (`/`)
- Filtros interactivos para buscar estudiantes por Promoción.
- Selector de días y horas para cruzar disponibilidades.
- Soporta múltiples estudiantes seleccionados para ver qué espacios tienen libres o cruzados en simultáneo, calculando la matriz de tiempo libre común de manera instantánea.
