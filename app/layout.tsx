import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Campograma WCS | SV Sports Scientist",
  description: "Análisis físico interactivo de partidos con datos GPS Catapult OpenField."
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return <html lang="es"><body>{children}</body></html>;
}
