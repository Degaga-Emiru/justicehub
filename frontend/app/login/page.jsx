"use client";

import { useState } from "react";
import { AuthForm } from "@/components/auth/auth-form";
import { AuthContainer } from "@/components/auth/auth-container";
import { useLanguage } from "@/components/language-provider";
import { Scale, ArrowLeft } from "lucide-react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";

export default function LoginPage() {
 const { t } = useLanguage();
 const router = useRouter();
 const [authType, setAuthType] = useState("login");

 return (
 <div className="min-h-screen grid lg:grid-cols-2 bg-background relative overflow-hidden font-sans">
 {/* Global Back Button */}
 <div className="absolute top-8 left-8 lg:left-8 z-50 animate-fade-in">
 <Button
 variant="ghost"
 size="sm"
 onClick={() => router.push("/")}
 className="flex items-center gap-2 font-bold text-muted-foreground hover:text-primary hover:bg-transparent group transition-colors px-0"
 >
 <div className="w-10 h-10 rounded-full bg-card/50 backdrop-blur-md border border-border/50 flex items-center justify-center group-hover:bg-primary group-hover:text-primary-foreground transition-all shadow-lg group-active:scale-95">
 <ArrowLeft className="h-5 w-5" />
 </div>
 </Button>
 </div>
 {/* Background Mesh Gradients */}
 <div className="absolute top-0 left-0 w-full h-full -z-10 opacity-30 dark:opacity-20 pointer-events-none">
 <div className="absolute top-[-10%] left-[-10%] w-[50%] h-[50%] bg-primary/10 rounded-full blur-[120px] animate-pulse-slow"></div>
 <div className="absolute bottom-[-10%] right-[-10%] w-[50%] h-[50%] bg-blue-500/10 rounded-full blur-[120px]"></div>
 </div>

 {/* Left Branding Panel */}
 <div className="hidden lg:block relative overflow-hidden bg-black group">
 <img 
 src="/lady_justice.png" 
 alt="Lady Justice" 
 className="absolute inset-0 w-full h-full object-cover transform scale-105 group-hover:scale-110 transition-transform duration-[20s] ease-out opacity-90"
 />
 {/* Smooth gradient overlays to blend seamlessly into the right side and background */}
 <div className="absolute inset-0 bg-gradient-to-r from-transparent via-background/40 to-background z-10 pointer-events-none"></div>
 <div className="absolute inset-0 bg-gradient-to-t from-background/80 via-transparent to-background/30 z-10 pointer-events-none"></div>
 <div className="absolute inset-0 bg-[url('https://grainy-gradients.vercel.app/noise.svg')] opacity-[0.04] mix-blend-overlay z-20"></div>
 </div>

 {/* Right Form Panel */}
 <div className="flex items-center justify-center p-8 lg:p-16 relative">
 <AuthContainer showBackArrow={false}>
 <AuthForm key={authType} type={authType} onTypeChange={setAuthType} />
 </AuthContainer>
 </div>
 </div>
 );
}