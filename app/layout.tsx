import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Análisis de Partidos | Unión de Santa Fe",
  description: "Reportes y WCS integrados con datos GPS de partidos."
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return <html lang="es"><body>{children}</body></html>;
}

