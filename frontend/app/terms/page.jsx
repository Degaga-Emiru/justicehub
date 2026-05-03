"use client";

import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Scale, ArrowLeft, FileText, CheckCircle, AlertTriangle } from "lucide-react";
import { useRouter } from "next/navigation";

export default function TermsOfServicePage() {
  const router = useRouter();

  return (
    <div className="min-h-screen bg-background text-foreground font-sans selection:bg-primary/20">
      {/* Header */}
      <header className="fixed top-0 z-50 w-full bg-background/80 backdrop-blur-md border-b border-border/40">
        <div className="container mx-auto flex h-20 items-center justify-between px-4 md:px-6">
          <div className="flex items-center gap-3 group cursor-pointer" onClick={() => router.push("/")}>
            <div className="bg-gradient-to-br from-primary to-blue-500 p-2.5 rounded-xl text-white shadow-lg group-hover:scale-110 transition-all">
              <Scale className="h-6 w-6" />
            </div>
            <span className="text-2xl font-black font-display tracking-tight">JusticeHub</span>
          </div>
          <Button variant="ghost" size="sm" onClick={() => router.push("/")} className="gap-2 font-bold rounded-full">
            <ArrowLeft className="h-4 w-4" /> Back to Home
          </Button>
        </div>
      </header>

      <main className="pt-32 pb-20">
        <div className="container px-4 md:px-6 mx-auto max-w-4xl">
          <div className="space-y-12 animate-fade-up">
            <div className="text-center space-y-4">
              <h1 className="text-5xl font-black font-display tracking-tight">Terms of Service</h1>
              <p className="text-muted-foreground font-medium uppercase tracking-widest text-xs">Last Updated: May 2026</p>
            </div>

            <div className="p-6 rounded-2xl bg-amber-500/5 border border-amber-500/20 flex gap-4 items-start">
              <AlertTriangle className="h-6 w-6 text-amber-500 flex-shrink-0 mt-1" />
              <p className="text-sm text-muted-foreground font-medium">
                Please read these terms carefully before using the JusticeHub platform. By accessing or using our services, you agree to be bound by these terms.
              </p>
            </div>

            <section className="space-y-6">
              <h2 className="text-3xl font-black font-display tracking-tight border-b pb-2 flex items-center gap-3">
                <CheckCircle className="h-6 w-6 text-primary" /> 1. Acceptance of Terms
              </h2>
              <p className="text-muted-foreground leading-relaxed">
                JusticeHub provides a digital infrastructure for judicial services. By creating an account, you represent that all information provided is accurate and that you are authorized to act on behalf of the parties you represent.
              </p>
            </section>

            <section className="space-y-6">
              <h2 className="text-3xl font-black font-display tracking-tight border-b pb-2 flex items-center gap-3">
                <CheckCircle className="h-6 w-6 text-primary" /> 2. User Responsibilities
              </h2>
              <p className="text-muted-foreground leading-relaxed">
                Users are responsible for maintaining the confidentiality of their account credentials. Any legal filings made through your account are considered legally binding.
              </p>
              <ul className="list-disc list-inside space-y-2 text-muted-foreground ml-4">
                <li>No filing of fraudulent or malicious documents.</li>
                <li>Respect court protocols and digital hearing guidelines.</li>
                <li>Ensure all contact information is kept up to date.</li>
              </ul>
            </section>

            <section className="space-y-6">
              <h2 className="text-3xl font-black font-display tracking-tight border-b pb-2 flex items-center gap-3">
                <CheckCircle className="h-6 w-6 text-primary" /> 3. Platform Availability
              </h2>
              <p className="text-muted-foreground leading-relaxed">
                While we strive for 100% uptime, JusticeHub is not liable for any delays in legal proceedings caused by technical maintenance or unforeseen outages. Users are encouraged to file documents well before legal deadlines.
              </p>
            </section>

            <section className="space-y-6">
              <h2 className="text-3xl font-black font-display tracking-tight border-b pb-2 flex items-center gap-3">
                <CheckCircle className="h-6 w-6 text-primary" /> 4. Governing Law
              </h2>
              <p className="text-muted-foreground leading-relaxed">
                These terms are governed by the laws of the Federal Democratic Republic of Ethiopia.
              </p>
            </section>
          </div>
        </div>
      </main>

      <footer className="py-12 border-t border-border/40 text-center text-muted-foreground font-medium text-sm">
        <p>&copy; {new Date().getFullYear()} JusticeHub. Developed by CS Students in HU.</p>
      </footer>
    </div>
  );
}
