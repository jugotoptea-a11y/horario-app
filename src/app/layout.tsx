import type { Metadata } from "next";
import { Red_Hat_Display } from "next/font/google";
import "./globals.css";

const redHatDisplay = Red_Hat_Display({
  subsets: ["latin"],
  weight: ["400", "500", "600", "700", "800", "900"],
  variable: "--font-red-hat",
});

export const metadata: Metadata = {
  title: "Buscador de Disponibilidad - CUC",
  description: "Buscador de disponibilidad de horarios Universidad de la Costa",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="es" className={redHatDisplay.variable}>
      <body className={redHatDisplay.className}>
        {children}
      </body>
    </html>
  );
}
