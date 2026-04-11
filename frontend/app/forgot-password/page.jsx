"use client";

import { AuthForm } from "@/components/auth/auth-form";

export default function ForgotPasswordPage() {
    return (
        <div className="min-h-screen flex items-center justify-center bg-background relative overflow-hidden p-6 font-sans">
            {/* Background Mesh Gradients */}
            <div className="absolute top-0 left-0 w-full h-full -z-10 opacity-30 dark:opacity-20 pointer-events-none">
                <div className="absolute top-[-10%] right-[-10%] w-[60%] h-[60%] bg-primary/10 rounded-full blur-[120px] animate-pulse-slow"></div>
                <div className="absolute bottom-[-10%] left-[-10%] w-[60%] h-[60%] bg-blue-500/10 rounded-full blur-[120px]"></div>
            </div>

            <div className="w-full max-w-md animate-fade-up">
                <AuthForm type="forgot-password" />
            </div>
        </div>
    );
}
