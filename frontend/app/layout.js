import { Inter } from "next/font/google";
import "./globals.css";
import { Providers } from "@/components/providers";
import { LanguageProvider } from "@/components/language-provider";

const inter = Inter({
  subsets: ["latin"],
  variable: "--font-inter",
});

export const metadata = {
  title: "JusticeHub - Court Management System",
  description: "A comprehensive court management platform for legal case tracking, scheduling, and administration.",
};

export default function RootLayout({ children }) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body className={`${inter.variable} font-sans antialiased`}>
        <Providers>
          <LanguageProvider>
            {children}
          </LanguageProvider>
        </Providers>
      </body>
    </html>
  );
}
