import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "SCCVI",
  description: "Sistema de Control de Crecimiento y Vacunación Infantil",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="es">
      <body>{children}</body>
    </html>
  );
}
