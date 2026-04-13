"use client";

import { ArrowLeft } from "lucide-react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";

export function AuthContainer({ children }) {
    const router = useRouter();

    return (
        <div className="min-h-screen flex items-center justify-center bg-background relative overflow-hidden p-6 font-sans">
            {/* Consistent Background Mesh Gradients */}
            <div className="absolute top-0 left-0 w-full h-full -z-10 opacity-30 dark:opacity-20 pointer-events-none">
                <div className="absolute top-[-10%] right-[-10%] w-[60%] h-[60%] bg-primary/10 rounded-full blur-[120px] animate-pulse-slow"></div>
                <div className="absolute bottom-[-10%] left-[-10%] w-[60%] h-[60%] bg-blue-500/10 rounded-full blur-[120px]"></div>
            </div>

            {/* Back Arrow - Always redirects to /login */}
            <div className="absolute top-8 left-8 z-50 animate-fade-in">
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

            <div className="w-full max-w-md relative group animate-fade-up">
                {children}
            </div>
        </div>
    );
}
