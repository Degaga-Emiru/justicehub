"use client";

import { useState, useEffect, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { setupAccountPassword } from "@/lib/api";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useLanguage } from "@/components/language-provider";
import { AlertCircle, CheckCircle2 } from "lucide-react";
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
            setSuccess("Account setup complete! You can now log in.");
            
            // Redirect to login after a brief delay
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
            <div className="text-center space-y-6">
                <div className="flex justify-center">
                    <CheckCircle2 className="h-16 w-16 text-green-500" />
                </div>
                <h1 className="text-2xl font-bold tracking-tight">Account Ready</h1>
                <p className="text-muted-foreground">{success}</p>
                <p className="text-sm text-muted-foreground">Redirecting to login...</p>
            </div>
        );
    }

    return (
        <div className="space-y-6">
            <div className="space-y-2 text-center">
                <h1 className="text-3xl font-bold tracking-tight">Set Up Account</h1>
                <p className="text-muted-foreground">
                    Enter the OTP sent to your email and choose a password
                </p>
            </div>

            {error && (
                <Alert variant="destructive">
                    <AlertCircle className="h-4 w-4" />
                    <AlertDescription>{error}</AlertDescription>
                </Alert>
            )}

            <form onSubmit={handleSubmit} className="space-y-4">
                <div className="space-y-2">
                    <Label htmlFor="email">{t("email")}</Label>
                    <Input
                        id="email"
                        type="email"
                        value={formData.email}
                        onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                        required
                        disabled={!!emailFromUrl}
                    />
                </div>
                
                <div className="space-y-2">
                    <Label htmlFor="otp">6-Digit OTP</Label>
                    <Input
                        id="otp"
                        type="text"
                        maxLength={6}
                        value={formData.otp}
                        onChange={(e) => setFormData({ ...formData, otp: e.target.value.replace(/\D/g, "") })}
                        required
                        placeholder="123456"
                    />
                </div>

                <div className="space-y-2">
                    <Label htmlFor="new_password">New Password</Label>
                    <Input
                        id="new_password"
                        type="password"
                        value={formData.new_password}
                        onChange={(e) => setFormData({ ...formData, new_password: e.target.value })}
                        required
                        placeholder="At least 8 characters"
                    />
                </div>

                <div className="space-y-2">
                    <Label htmlFor="confirm_password">{t("confirmPassword")}</Label>
                    <Input
                        id="confirm_password"
                        type="password"
                        value={formData.confirm_password}
                        onChange={(e) => setFormData({ ...formData, confirm_password: e.target.value })}
                        required
                    />
                </div>

                <Button type="submit" className="w-full" disabled={isLoading}>
                    {isLoading ? t("verify") + "..." : "Complete Setup"}
                </Button>
            </form>
        </div>
    );
}

export default function SetupAccountPage() {
    return (
        <div className="container flex h-screen w-screen flex-col items-center justify-center">
            <div className="mx-auto flex w-full flex-col justify-center space-y-6 sm:w-[350px]">
                <Suspense fallback={<div>Loading form...</div>}>
                    <SetupAccountForm />
                </Suspense>
            </div>
        </div>
    );
}
