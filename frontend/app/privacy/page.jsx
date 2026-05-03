"use client";

import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Scale, ArrowLeft, ShieldCheck, Lock, Eye } from "lucide-react";
import { useRouter } from "next/navigation";

export default function PrivacyPolicyPage() {
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
              <h1 className="text-5xl font-black font-display tracking-tight">Privacy Policy</h1>
              <p className="text-muted-foreground font-medium uppercase tracking-widest text-xs">Last Updated: May 2026</p>
            </div>

            <section className="space-y-6">
              <h2 className="text-3xl font-black font-display tracking-tight border-b pb-2">1. Information We Collect</h2>
              <p className="text-muted-foreground leading-relaxed">
                JusticeHub collects personal information necessary to provide judicial services. This includes your name, contact information, national ID details, and legal documentation related to your cases.
              </p>
              <div className="grid sm:grid-cols-3 gap-6">
                <div className="p-6 rounded-2xl bg-muted/30 border border-border/50 text-center">
                  <ShieldCheck className="h-8 w-8 mx-auto mb-4 text-primary" />
                  <h3 className="font-bold mb-2">Secure Storage</h3>
                  <p className="text-sm text-muted-foreground">All data is encrypted at rest and in transit.</p>
                </div>
                <div className="p-6 rounded-2xl bg-muted/30 border border-border/50 text-center">
                  <Lock className="h-8 w-8 mx-auto mb-4 text-primary" />
                  <h3 className="font-bold mb-2">Strict Access</h3>
                  <p className="text-sm text-muted-foreground">Only authorized judicial personnel can access your data.</p>
                </div>
                <div className="p-6 rounded-2xl bg-muted/30 border border-border/50 text-center">
                  <Eye className="h-8 w-8 mx-auto mb-4 text-primary" />
                  <h3 className="font-bold mb-2">Transparency</h3>
                  <p className="text-sm text-muted-foreground">You can request to see what data we have stored about you.</p>
                </div>
              </div>
            </section>

            <section className="space-y-6">
              <h2 className="text-3xl font-black font-display tracking-tight border-b pb-2">2. How We Use Your Information</h2>
              <p className="text-muted-foreground leading-relaxed">
                Your information is used solely for the purpose of processing legal cases, scheduling hearings, and communicating updates regarding your legal matters. We do not sell or share your data with third parties for marketing purposes.
              </p>
            </section>

            <section className="space-y-6">
              <h2 className="text-3xl font-black font-display tracking-tight border-b pb-2">3. Data Retention</h2>
              <p className="text-muted-foreground leading-relaxed">
                Legal records are retained in accordance with the laws and regulations of the Ethiopian judicial system. Some records may be archived permanently as part of historical court records.
              </p>
            </section>

            <div className="p-8 rounded-[2rem] bg-primary/5 border border-primary/20 text-center">
              <p className="text-lg font-medium text-primary mb-4">Have questions about your privacy?</p>
              <Button className="rounded-full px-8 bg-primary hover:bg-primary/90 text-white font-bold">Contact Privacy Team</Button>
            </div>
          </div>
        </div>
      </main>

      <footer className="py-12 border-t border-border/40 text-center text-muted-foreground font-medium text-sm">
        <p>&copy; {new Date().getFullYear()} JusticeHub. Developed by CS Students in HU.</p>
      </footer>
    </div>
  );
}
