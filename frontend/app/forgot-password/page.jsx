"use client";

import { AuthForm } from "@/components/auth/auth-form";
import { AuthContainer } from "@/components/auth/auth-container";
import { useLanguage } from "@/components/language-provider";
import { Scale, ArrowLeft } from "lucide-react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";

export default function ForgotPasswordPage() {
  const { t } = useLanguage();
  const router = useRouter();

  return (
    <div className="min-h-screen grid lg:grid-cols-2 bg-background relative overflow-hidden font-sans">
      {/* Global Back Button */}
      <div className="absolute top-8 left-8 lg:left-8 z-50 animate-fade-in">
        <Button
          variant="ghost"
          size="sm"
          onClick={() => router.push("/login")}
          className="flex items-center gap-2 font-bold text-muted-foreground hover:text-primary hover:bg-transparent group transition-colors px-0"
        >
          <div className="w-10 h-10 rounded-full bg-card/50 backdrop-blur-md border border-border/50 flex items-center justify-center group-hover:bg-primary group-hover:text-primary-foreground transition-all shadow-lg group-active:scale-95">
            <ArrowLeft className="h-5 w-5" />
          </div>
        </Button>
      </div>

      {/* Left Branding Panel */}
      <div className="hidden lg:block relative overflow-hidden bg-black group">
        <img 
          src="/lady_justice.jpg" 
          alt="Lady Justice" 
          className="absolute inset-0 w-full h-full object-cover transform scale-105 group-hover:scale-110 transition-transform duration-[20s] ease-out opacity-90"
        />
        <div className="absolute inset-0 bg-gradient-to-r from-transparent via-background/40 to-background z-10 pointer-events-none"></div>
        <div className="absolute inset-0 bg-gradient-to-t from-background/80 via-transparent to-background/30 z-10 pointer-events-none"></div>
      </div>

      {/* Right Form Panel */}
      <div className="flex items-center justify-center p-8 lg:p-16 relative">
        <AuthContainer showBackArrow={false}>
          <AuthForm type="forgot-password" />
        </AuthContainer>
      </div>
    </div>
  );
}
