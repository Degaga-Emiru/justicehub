"use client";

import { useState } from "react";
import { AuthForm } from "@/components/auth/auth-form";
import { useLanguage } from "@/components/language-provider";

export default function LoginPage() {
    const { t } = useLanguage();
    const [authType, setAuthType] = useState("login");

    return (
        <div className="min-h-screen grid lg:grid-cols-2 bg-muted/30">
            <div className="hidden lg:flex flex-col justify-center p-12 bg-sidebar-background text-white relative overflow-hidden">
                <div className="absolute inset-0 bg-gradient-to-br from-sidebar-background to-primary/20" />
                <div className="relative z-10 max-w-lg mx-auto transition-all duration-500 animate-in fade-in slide-in-from-left-4">
                    <h1 className="text-4xl font-bold mb-6">
                        {authType === "login" ? t("loginTitle") : t("createAccount")}
                    </h1>
                    <p className="text-lg text-sidebar-foreground/80 mb-8">
                        {authType === "login" ? t("loginSubtitle") : t("enterDetails")}
                    </p>
                    <div className="grid grid-cols-2 gap-4">
                        <div className="p-4 rounded-lg bg-white/5 border border-white/10">
                            <h3 className="font-semibold mb-1">{t("securePrivate")}</h3>
                            <p className="text-sm text-sidebar-foreground/60">{t("secureDesc")}</p>
                        </div>
                        <div className="p-4 rounded-lg bg-white/5 border border-white/10">
                            <h3 className="font-semibold mb-1">{t("realTimeUpdates")}</h3>
                            <p className="text-sm text-sidebar-foreground/60">{t("realTimeDesc")}</p>
                        </div>
                    </div>
                </div>
            </div>
            <div className="flex items-center justify-center p-6 lg:p-12 relative">
                {/* 
                    Using the `key` prop here forces React to completely unmount and remount 
                    the AuthForm component whenever the form type changes.
                    This cleanly resets the underlying react-hook-form state without side effects.
                */}
                <div className="w-full animate-in fade-in zoom-in-95 duration-300 relative z-10">
                    <AuthForm key={authType} type={authType} onTypeChange={setAuthType} />
                </div>
            </div>
        </div>
    );
}
