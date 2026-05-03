import { Inter, Outfit } from "next/font/google";
import "./globals.css";
import { Providers } from "@/components/providers";
import { LanguageProvider } from "@/components/language-provider";

const inter = Inter({
 subsets: ["latin"],
 variable: "--font-inter",
});

const outfit = Outfit({
 subsets: ["latin"],
 variable: "--font-outfit",
});

export const metadata = {
 title: "JusticeHub - Court Management System",
 description: "A comprehensive court management platform for legal case tracking, scheduling, and administration.",
 icons: {
   icon: "/logos.jpeg",
   shortcut: "/logos.jpeg",
   apple: "/logos.jpeg",
 },
};

export default function RootLayout({ children }) {
 return (
 <html lang="en" suppressHydrationWarning>
 <body className={`${inter.variable} ${outfit.variable} font-sans antialiased bg-background text-foreground selection:bg-primary/20`}>
 <Providers>
 <LanguageProvider>
 {children}
 </LanguageProvider>
 </Providers>
 </body>
 </html>
 );
}
