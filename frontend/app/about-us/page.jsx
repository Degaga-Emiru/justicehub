"use client";

import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Scale, Users, Shield, Target, ArrowLeft } from "lucide-react";
import { useLanguage } from "@/components/language-provider";
import { useRouter } from "next/navigation";

export default function AboutUsPage() {
  const { t } = useLanguage();
  const router = useRouter();

  return (
    <div className="min-h-screen bg-background text-foreground font-sans selection:bg-primary/20">
      {/* Header */}
      <header className="fixed top-0 z-50 w-full bg-background/80 backdrop-blur-md border-b border-border/40">
        <div className="container mx-auto flex h-20 items-center justify-between px-4 md:px-6">
          <div className="flex items-center gap-3 group cursor-pointer" onClick={() => router.push("/")}>
            <div className="rounded-xl overflow-hidden shadow-lg group-hover:scale-110 transition-all">
              <img src="/logos.jpeg" alt="JusticeHub" className="h-10 w-10 object-cover" />
            </div>
            <span className="text-2xl font-black font-display tracking-tight">JusticeHub</span>
          </div>
          <Button variant="ghost" size="sm" onClick={() => router.push("/")} className="gap-2 font-bold rounded-full">
            <ArrowLeft className="h-4 w-4" /> Back to Home
          </Button>
        </div>
      </header>

      <main className="pt-32 pb-20">
        <div className="container px-4 md:px-6 mx-auto">
          {/* Hero Section */}
          <div className="max-w-3xl mx-auto text-center space-y-8 mb-20 animate-fade-up">
            <h1 className="text-5xl md:text-6xl font-black font-display tracking-tight leading-tight">
              Our Mission for <span className="text-primary">Modern Justice</span>
            </h1>
            <p className="text-xl text-muted-foreground leading-relaxed font-medium">
              JusticeHub is a revolutionary platform developed by dedicated Computer Science students at Hawassa University (HU). Our goal is to digitize the Ethiopian judicial system, starting with local courts like the Hawassa Primary Court.
            </p>
          </div>

          {/* Core Values */}
          <div className="grid md:grid-cols-3 gap-8 mb-32 animate-fade-up" style={{ animationDelay: "100ms" }}>
            <ValueCard 
              icon={<Users className="h-10 w-10 text-primary" />}
              title="Community Driven"
              description="Built by students for the community, ensuring that technology serves the people first."
            />
            <ValueCard 
              icon={<Shield className="h-10 w-10 text-primary" />}
              title="Secure & Reliable"
              description="Implementing the latest security standards to protect sensitive legal information."
            />
            <ValueCard 
              icon={<Target className="h-10 w-10 text-primary" />}
              title="Efficiency First"
              description="Reducing court backlogs through automated workflows and digital documentation."
            />
          </div>

          {/* Team Section Placeholder */}
          <section className="bg-muted/30 rounded-[3rem] p-12 md:p-20 text-center relative overflow-hidden">
            <div className="absolute top-0 right-0 w-96 h-96 bg-primary/5 rounded-full blur-[100px] -translate-y-1/2 translate-x-1/2"></div>
            <div className="relative z-10 space-y-8">
              <h2 className="text-4xl font-black font-display tracking-tight">Developed by HU CS Students</h2>
              <p className="max-w-2xl mx-auto text-lg text-muted-foreground font-medium">
                Our team is passionate about using technology to solve real-world problems in Ethiopia. This project represents our commitment to innovation and social impact.
              </p>
              <div className="flex justify-center gap-4">
                <div className="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center text-primary font-bold text-xl">HU</div>
                <div className="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center text-primary font-bold text-xl">CS</div>
              </div>
            </div>
          </section>
        </div>
      </main>

      <footer className="py-12 border-t border-border/40 text-center text-muted-foreground font-medium text-sm">
        <p>&copy; 2026 JusticeHub. All rights reserved.</p>
      </footer>
    </div>
  );
}

function ValueCard({ icon, title, description }) {
  return (
    <div className="p-8 rounded-[2rem] bg-card border border-border/60 shadow-sm hover:shadow-xl hover:shadow-primary/5 transition-all text-center space-y-4">
      <div className="flex justify-center mb-4">{icon}</div>
      <h3 className="text-2xl font-black font-display tracking-tight">{title}</h3>
      <p className="text-muted-foreground leading-relaxed">{description}</p>
    </div>
  );
}
