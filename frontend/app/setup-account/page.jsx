"use client";

import { useState, useEffect, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { setupAccountPassword } from "@/lib/api";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useLanguage } from "@/components/language-provider";
import { AlertCircle, CheckCircle2, ShieldCheck } from "lucide-react";
import { Alert, AlertDescription } from "@/components/ui/alert";

function SetupAccountForm() {
    const router = useRouter();
    const searchParams = useSearchParams();
    const emailFromUrl = searchParams.get("email") || "";
    
    const [formData, setFormData] = useState({
        email: emailFromUrl,
        otp: "",
        new_password: "",
        confirm_password: "",
    });
    
    const [error, setError] = useState("");
    const [success, setSuccess] = useState("");
    const [isLoading, setIsLoading] = useState(false);
    const { t } = useLanguage();

    useEffect(() => {
        if (emailFromUrl && !formData.email) {
            setFormData(prev => ({ ...prev, email: emailFromUrl }));
        }
    }, [emailFromUrl]);

    const handleSubmit = async (e) => {
        e.preventDefault();
        setError("");
        
        if (formData.new_password !== formData.confirm_password) {
            setError(t("passwordsMustMatch"));
            return;
        }

        if (formData.new_password.length < 8) {
            setError(t("passwordMinLength"));
            return;
        }

        setIsLoading(true);
        try {
            await setupAccountPassword(formData);
            setSuccess("Account activation complete! Your judicial credentials are now active.");
            
            setTimeout(() => {
                router.push("/login?setup=success");
            }, 3000);
        } catch (err) {
            setError(err.message || t("unexpectedError"));
        } finally {
            setIsLoading(false);
        }
    };

    if (success) {
        return (
            <div className="text-center space-y-6 py-6 animate-fade-up">
                <div className="flex justify-center">
                    <div className="h-20 w-20 rounded-[2rem] bg-emerald-500/10 flex items-center justify-center border border-emerald-500/20 shadow-xl">
                        <CheckCircle2 className="h-10 w-10 text-emerald-500" />
                    </div>
                </div>
                <div className="space-y-2">
                    <h1 className="text-3xl font-black font-display tracking-tight text-foreground">Access Restored</h1>
                    <p className="text-muted-foreground font-medium text-lg">{success}</p>
                </div>
                <div className="pt-4">
                    <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-muted/50 text-xs font-bold text-muted-foreground border border-white/10 uppercase tracking-widest">
                        <span className="h-2 w-2 rounded-full bg-primary animate-pulse"></span>
                        Redirecting to Command Panel
                    </div>
                </div>
            </div>
        );
    }

    return (
        <div className="space-y-8 animate-fade-up">
            <div className="space-y-3 text-center">
                <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-primary/10 text-primary text-[10px] font-black uppercase tracking-widest mb-2">
                    <ShieldCheck className="h-3 w-3" /> Secure Intake
                </div>
                <h1 className="text-4xl font-black font-display tracking-tight text-foreground">Initialize Access</h1>
                <p className="text-muted-foreground font-medium">
                    Authenticate your identity and establish your encrypted credentials.
                </p>
            </div>

            {error && (
                <Alert variant="destructive" className="glass border-destructive/50 animate-in fade-in slide-in-from-top-2">
                    <AlertCircle className="h-4 w-4" />
                    <AlertDescription className="font-bold">{error}</AlertDescription>
                </Alert>
            )}

            <form onSubmit={handleSubmit} className="space-y-5">
                <div className="space-y-2">
                    <Label htmlFor="email" className="text-xs font-black uppercase tracking-widest text-muted-foreground ml-1">Identity (Email)</Label>
                    <Input
                        id="email"
                        type="email"
                        value={formData.email}
                        onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                        required
                        disabled={!!emailFromUrl}
                        className="h-12 bg-background/50 border-white/20 rounded-xl focus:ring-primary/20 font-medium"
                    />
                </div>
                
                <div className="space-y-2">
                    <Label htmlFor="otp" className="text-xs font-black uppercase tracking-widest text-muted-foreground ml-1">Verification OTP</Label>
                    <Input
                        id="otp"
                        type="text"
                        maxLength={6}
                        value={formData.otp}
                        onChange={(e) => setFormData({ ...formData, otp: e.target.value.replace(/\D/g, "") })}
                        required
                        placeholder="000000"
                        className="h-12 bg-background/50 border-white/20 rounded-xl focus:ring-primary/20 font-mono text-center text-xl tracking-[0.5em] font-black"
                    />
                </div>

                <div className="space-y-2">
                    <Label htmlFor="new_password" className="text-xs font-black uppercase tracking-widest text-muted-foreground ml-1">Secure Password</Label>
                    <Input
                        id="new_password"
                        type="password"
                        value={formData.new_password}
                        onChange={(e) => setFormData({ ...formData, new_password: e.target.value })}
                        required
                        placeholder="••••••••"
                        className="h-12 bg-background/50 border-white/20 rounded-xl focus:ring-primary/20"
                    />
                </div>

                <div className="space-y-2">
                    <Label htmlFor="confirm_password" className="text-xs font-black uppercase tracking-widest text-muted-foreground ml-1">{t("confirmPassword") || "Verify Password"}</Label>
                    <Input
                        id="confirm_password"
                        type="password"
                        value={formData.confirm_password}
                        onChange={(e) => setFormData({ ...formData, confirm_password: e.target.value })}
                        required
                        className="h-12 bg-background/50 border-white/20 rounded-xl focus:ring-primary/20"
                    />
                </div>

                <Button type="submit" className="w-full h-14 rounded-xl font-black bg-gradient-to-r from-primary to-blue-600 hover:from-primary hover:to-blue-500 transition-all duration-300 shadow-xl shadow-primary/25 hover:shadow-primary/40 text-white uppercase tracking-widest text-xs" disabled={isLoading}>
                    {isLoading ? "Synchronizing..." : "Activate Account"}
                </Button>
            </form>
        </div>
    );
}

export default function SetupAccountPage() {
    return (
        <div className="min-h-screen flex items-center justify-center bg-background relative overflow-hidden p-6 font-sans">
            {/* Background Mesh Gradients */}
            <div className="absolute top-0 left-0 w-full h-full -z-10 opacity-30 dark:opacity-20 pointer-events-none">
                <div className="absolute top-[-10%] right-[-10%] w-[60%] h-[60%] bg-primary/10 rounded-full blur-[120px] animate-pulse-slow"></div>
                <div className="absolute bottom-[-10%] left-[-10%] w-[60%] h-[60%] bg-blue-500/10 rounded-full blur-[120px]"></div>
            </div>

            <div className="w-full max-w-md animate-fade-up">
                <div className="relative group">
                    {/* Background Glow Effect */}
                    <div className="absolute -inset-1 bg-gradient-to-r from-primary to-blue-600 rounded-[2rem] blur opacity-10 group-hover:opacity-20 transition duration-1000"></div>
                    
                    <div className="relative glass-card border-white/20 dark:border-white/10 rounded-[2rem] overflow-hidden shadow-2xl p-8 lg:p-10 space-y-8">
                        <Suspense fallback={
                            <div className="flex flex-col items-center justify-center space-y-4 py-12">
                                <div className="h-12 w-12 border-4 border-primary/20 border-t-primary rounded-full animate-spin"></div>
                                <p className="text-sm font-black uppercase tracking-widest text-muted-foreground animate-pulse">Initializing Setup...</p>
                            </div>
                        }>
                            <SetupAccountForm />
                        </Suspense>
                    </div>
                </div>
            </div>
        </div>
    );
}
