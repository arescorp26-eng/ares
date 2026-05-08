import type { Metadata, Viewport } from "next";
import { Poppins, Comfortaa } from "next/font/google";
import VersionChecker from "@/components/VersionChecker";
import "./globals.css";

const poppins = Poppins({
  variable: "--font-poppins",
  subsets: ["latin"],
  weight: ["300", "400", "500", "600", "700", "800", "900"],
});

const comfortaa = Comfortaa({
  variable: "--font-comfortaa",
  subsets: ["latin"],
  weight: ["300", "400", "500", "600", "700"],
});

export const metadata: Metadata = {
  title: "Ares – Tutor Inteligente",
  description: "Planificación de estudio con IA, gamificación y análisis de documentos. Tu tutor inteligente para alcanzar el éxito académico.",
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#FDFCEE" },
    { media: "(prefers-color-scheme: dark)", color: "#1A253A" },
  ],
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="es"
      className={`${poppins.variable} ${comfortaa.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col overflow-x-hidden">
        <VersionChecker />
        {children}
      </body>
    </html>
  );
}
