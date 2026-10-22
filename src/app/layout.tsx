import type { Metadata } from "next";
import { Public_Sans, Source_Serif_4 } from "next/font/google";
import { SessionProvider } from "next-auth/react";
import { BRAND } from "@/lib/constants";
import "./globals.css";

const publicSans = Public_Sans({
  variable: "--font-public-sans",
  subsets: ["latin"],
});

// Títulos y cifras grandes: le da el tono de estudio profesional.
const sourceSerif = Source_Serif_4({
  variable: "--font-source-serif",
  subsets: ["latin"],
  weight: ["500", "600"],
});

export const metadata: Metadata = {
  title: `${BRAND.name} · ${BRAND.tagline}`,
  description: `Portal de recibos de sueldo del Estudio ${BRAND.name}.`,
  robots: { index: false, follow: false },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="es" className={`${publicSans.variable} ${sourceSerif.variable} h-full antialiased`}>
      <body className="min-h-full">
        {/* Necesario para que la pantalla de cambio de clave pueda refrescar
            el token con update() sin obligar a volver a loguearse. */}
        <SessionProvider>{children}</SessionProvider>
      </body>
    </html>
  );
}
