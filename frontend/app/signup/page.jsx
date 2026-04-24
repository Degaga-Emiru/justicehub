"use client";

import { AuthForm } from "@/components/auth/auth-form";
import { AuthContainer } from "@/components/auth/auth-container";
import { useLanguage } from "@/components/language-provider";
import { Scale } from "lucide-react";

export default function SignupPage() {
 const { t } = useLanguage();

 return (
 <div className="min-h-screen grid lg:grid-cols-2 bg-background relative overflow-hidden font-sans">
 {/* Background Mesh Gradients */}
 <div className="absolute top-0 left-0 w-full h-full -z-10 opacity-30 dark:opacity-20 pointer-events-none">
 <div className="absolute top-[-10%] left-[-10%] w-[50%] h-[50%] bg-primary/10 rounded-full blur-[120px] animate-pulse-slow"></div>
 <div className="absolute bottom-[-10%] right-[-10%] w-[50%] h-[50%] bg-blue-500/10 rounded-full blur-[120px]"></div>
 </div>

 {/* Left Branding Panel */}
 <div className="hidden lg:flex flex-col justify-center p-16 relative overflow-hidden border-r border-border/40">
 {/* Decorative Elements */}
 <div className="absolute inset-0 -z-20">
 <img 
 src="https://images.unsplash.com/photo-1505664194779-8beaceb93744?q=80&w=2000" 
 alt="Court House" 
 className="w-full h-full object-cover opacity-50"
 />
 </div>
 <div className="absolute inset-0 bg-gradient-to-t from-background via-background/20 to-transparent -z-10"></div>
 <div className="absolute top-20 left-20 w-64 h-64 bg-primary/5 rounded-full blur-3xl -z-10"></div>
 
 <div className="relative z-10 max-w-lg animate-fade-up">
 <div className="flex items-center gap-3 mb-12 group cursor-pointer">
 <div className="bg-gradient-to-br from-primary to-blue-600 p-2.5 rounded-xl text-white shadow-lg shadow-primary/20 group-hover:scale-110 transition-transform duration-500">
 <Scale className="h-6 w-6" />
 </div>
 <span className="text-2xl font-black font-display tracking-tight text-foreground">{t("justiceHub")}</span>
 </div>

 <h1 className="text-5xl font-black font-display tracking-tight text-foreground leading-[1.1] mb-6">
 {t("createAccount")}
 </h1>
 <p className="text-xl text-muted-foreground font-medium mb-10 leading-relaxed">
 {t("enterDetails")}
 </p>

 <div className="grid grid-cols-1 gap-6">
 <div className="p-6 rounded-2xl bg-background shadow-sm border-border border-border shadow-sm group hover:border-primary/30 transition-colors duration-300">
 <h3 className="font-bold font-display text-lg mb-2 flex items-center gap-2">
 <span className="h-1.5 w-1.5 rounded-full bg-emerald-500"></span>
 Secure & Private
 </h3>
 <p className="text-muted-foreground font-medium leading-relaxed">Your data is encrypted and protected by blockchain technology.</p>
 </div>
 <div className="p-6 rounded-2xl bg-background shadow-sm border-border border-border shadow-sm group hover:border-primary/30 transition-colors duration-300">
 <h3 className="font-bold font-display text-lg mb-2 flex items-center gap-2">
 <span className="h-1.5 w-1.5 rounded-full bg-blue-500"></span>
 Real-time Updates
 </h3>
 <p className="text-muted-foreground font-medium leading-relaxed">Get instant notifications on your case status and court hearings.</p>
 </div>
 </div>
 </div>

 <div className="absolute bottom-12 left-16 text-xs font-bold text-muted-foreground/60 uppercase tracking-[0.2em] font-display">
 © {new Date().getFullYear()} JusticeHub Global Platform
 </div>
 </div>

 {/* Right Form Panel */}
 <div className="flex items-center justify-center p-8 lg:p-16 relative">
 <AuthContainer>
 <AuthForm type="signup" />
 </AuthContainer>
 </div>
 </div>
 );
}
