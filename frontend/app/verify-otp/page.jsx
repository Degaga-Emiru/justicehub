"use client";

import { useState, Suspense } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { useAuthStore } from "@/store/auth-store";
import { useRouter, useSearchParams } from "next/navigation";
import { useLanguage } from "@/components/language-provider";
import { Loader2, ShieldCheck } from "lucide-react";

const otpSchema = z.object({
    otp: z.string().length(6, "OTP must be 6 digits"),
    email: z.string().email(),
});

function VerifyOTPContent() {
    const [isLoading, setIsLoading] = useState(false);
    const [isResending, setIsResending] = useState(false);
    const [error, setError] = useState("");
    const [success, setSuccess] = useState("");
    const { verifyOTP, resendOTP } = useAuthStore();
    const router = useRouter();
    const searchParams = useSearchParams();
    const { t } = useLanguage();

    const emailParam = searchParams.get("email") || "";

    const {
        register,
        handleSubmit,
        formState: { errors },
    } = useForm({
        resolver: zodResolver(otpSchema),
        defaultValues: {
            email: emailParam,
            otp: "",
        },
    });

    const onSubmit = async (data) => {
        setIsLoading(true);
        setError("");
        setSuccess("");

        try {
            const result = await verifyOTP(data.email, data.otp);
            if (result.success) {
                setSuccess(t("otpVerified"));
                setTimeout(() => {
                    router.push("/login");
                }, 2000);
            } else {
                setError(result.error);
            }
        } catch (err) {
            setError(t("unexpectedError"));
        } finally {
            setIsLoading(false);
        }
    };

    const handleResend = async () => {
        if (!emailParam) {
            setError("Email is missing. Cannot resend OTP.");
            return;
        }

        setIsResending(true);
        setError("");
        setSuccess("");

        try {
            const result = await resendOTP(emailParam);
            if (result.success) {
                setSuccess("New OTP sent to your email.");
            } else {
                setError(result.error);
            }
        } catch (err) {
            setError(t("unexpectedError"));
        } finally {
            setIsResending(false);
        }
    };

    return (
        <div className="min-h-screen flex items-center justify-center bg-muted/30 p-6">
            <Card className="w-full max-w-md mx-auto shadow-2xl border-primary/10">
                <CardHeader className="space-y-1 items-center text-center">
                    <div className="w-12 h-12 bg-primary rounded-xl flex items-center justify-center mb-2 shadow-inner">
                        <ShieldCheck className="h-6 w-6 text-primary-foreground" />
                    </div>
                    <CardTitle className="text-2xl font-bold tracking-tight text-primary">
                        {t("verifyOTP")}
                    </CardTitle>
                    <CardDescription>
                        {t("otpSentTo")} <span className="font-medium text-foreground">{emailParam}</span>
                    </CardDescription>
                </CardHeader>
                <form onSubmit={handleSubmit(onSubmit)}>
                    <CardContent className="space-y-4">
                        {error && (
                            <div className="bg-destructive/15 text-destructive text-sm p-3 rounded-md text-center">
                                {error}
                            </div>
                        )}
                        {success && (
                            <div className="bg-green-100 text-green-800 text-sm p-3 rounded-md text-center">
                                {success}
                            </div>
                        )}

                        <div className="space-y-2">
                            <Label htmlFor="otp">{t("enterOTP")}</Label>
                            <Input
                                id="otp"
                                type="text"
                                maxLength={6}
                                placeholder="123456"
                                className="text-center text-2xl tracking-[0.5em] font-bold"
                                {...register("otp")}
                            />
                            {errors.otp && <p className="text-xs text-destructive text-center">{errors.otp.message}</p>}
                        </div>
                    </CardContent>
                    <CardFooter className="flex flex-col gap-4">
                        <Button className="w-full" type="submit" disabled={isLoading}>
                            {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                            {t("verify")}
                        </Button>
                        <Button
                            variant="ghost"
                            className="w-full text-xs"
                            type="button"
                            onClick={handleResend}
                            disabled={isResending}
                        >
                            {isResending && <Loader2 className="mr-2 h-3 w-3 animate-spin" />}
                            {t("resendOTP")}
                        </Button>
                    </CardFooter>
                </form>
            </Card>
        </div>
    );
}

export default function VerifyOTPPage() {
    return (
        <Suspense fallback={
            <div className="min-h-screen flex items-center justify-center bg-muted/30">
                <Loader2 className="h-8 w-8 animate-spin text-primary" />
            </div>
        }>
            <VerifyOTPContent />
        </Suspense>
    );
}

