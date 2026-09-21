import type { Metadata, Viewport } from "next";
import { Geist } from "next/font/google";

import { ServiceWorkerRegistration } from "@/components/pwa/service-worker-registration";

import "./globals.css";

const geist = Geist({
  subsets: ["latin"],
  variable: "--font-geist-sans",
});

export const metadata: Metadata = {
  title: {
    default: "SCCVI",
    template: "%s · SCCVI",
  },
  description: "Sistema de Control de Crecimiento y Vacunación Infantil",
  applicationName: "SCCVI",
  appleWebApp: {
    capable: true,
    statusBarStyle: "default",
    title: "SCCVI",
  },
};

export const viewport: Viewport = {
  themeColor: "#07556D",
  width: "device-width",
  initialScale: 1,
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="es" className={geist.variable}>
      <body>
        {children}
        <ServiceWorkerRegistration />
      </body>
    </html>
  );
}
