"use client";

import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import Link from "next/link";
import { useState } from "react";
import { Loader2, Scale } from "lucide-react";
import { useAuthStore } from "@/store/auth-store";
import { useRouter } from "next/navigation";
import { useLanguage } from "@/components/language-provider";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { AlertCircle } from "lucide-react";

const loginSchema = z.object({
    email: z.string().email("invalidEmail"),
    password: z.string().min(6, "passwordMinLength"),
});

const signupSchema = z.object({
    first_name: z.string().min(2, "nameMinLength"),
    last_name: z.string().min(2, "nameMinLength"),
    email: z.string().email("invalidEmail"),
    phone_number: z.string().min(7, "phoneMinLength"),
    password: z.string().min(8, "passwordMinLength"),
    confirm_password: z.string().min(8, "passwordMinLength"),
}).refine((data) => data.password === data.confirm_password, {
    message: "passwordsMustMatch",
    path: ["confirm_password"],
});

const forgotPasswordSchema = z.object({
    email: z.string().email("invalidEmail"),
});

const getApiUrl = () => process.env.NEXT_PUBLIC_API_URL || "http://127.0.0.1:8000/api";

export function AuthForm({ type = "login", onTypeChange }) {
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState("");
    const [success, setSuccess] = useState("");
    const { login, signup } = useAuthStore();
    const router = useRouter();
    const { t } = useLanguage();

    const schema = type === "signup" ? signupSchema : type === "forgot-password" ? forgotPasswordSchema : loginSchema;

    const {
        register,
        handleSubmit,
        formState: { errors },
    } = useForm({
        resolver: zodResolver(schema),
        defaultValues: {
            email: "",
            password: "",
            confirm_password: "",
            first_name: "",
            last_name: "",
            phone_number: "",
        },
    });

    const onSubmit = async (data) => {
        setIsLoading(true);
        setError("");
        setSuccess("");

        try {
            if (type === "login") {
                const result = await login(data.email, data.password);
                if (result.success) {
                    const roleRouteMap = {
                        // Backend uppercase roles
                        CITIZEN: "client",
                        JUDGE: "judge",
                        ADMIN: "admin",
                        LAWYER: "client",
                        CLERK: "clerk",
                        DEFENDANT: "client",
                        // Lowercase fallbacks
                        citizen: "client",
                        judge: "judge",
                        admin: "admin",
                        lawyer: "client",
                        clerk: "clerk",
                        defendant: "client",
                    };
                    const route = roleRouteMap[result.role] || "client";
                    router.push(`/dashboard/${route}`);
                } else {
                    setError(result.error || t("invalidCredentials"));
                }
            } else if (type === "signup") {
                const result = await signup(
                    data.first_name,
                    data.last_name,
                    data.email,
                    data.phone_number,
                    data.password,
                    data.confirm_password
                );
                if (result.success) {
                    router.push(`/verify-otp?email=${encodeURIComponent(data.email)}`);
                } else {
                    setError(result.error || t("failedCreateAccount"));
                }
            } else {
                // Forgot password – call the real API
                try {
                    const res = await fetch(`${getApiUrl()}/auth/forgot-password/`, {
                        method: "POST",
                        headers: { "Content-Type": "application/json" },
                        body: JSON.stringify({ email: data.email }),
                    });
                    if (res.ok) {
                        setSuccess(t("resetLinkSent"));
                    } else {
                        const err = await res.json().catch(() => ({}));
                        setError(err.detail || err.email?.[0] || t("unexpectedError"));
                    }
                } catch {
                    setError(t("unexpectedError"));
                }
            }
        } catch (err) {
            setError(t("unexpectedError"));
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <Card className="w-full max-w-md mx-auto shadow-2xl border-primary/10 transition-all duration-300">
            <CardHeader className="space-y-1 items-center text-center">
                <div className="w-12 h-12 bg-primary rounded-xl flex items-center justify-center mb-2 shadow-inner">
                    <Scale className="h-6 w-6 text-primary-foreground" />
                </div>
                <CardTitle className="text-2xl font-bold tracking-tight text-primary">
                    {type === "login" ? t("welcomeBack") : type === "signup" ? t("createAccount") : t("resetPassword")}
                </CardTitle>
                <CardDescription>
                    {type === "login"
                        ? t("enterCredentials")
                        : type === "signup"
                            ? t("enterDetails")
                            : t("enterEmailReset")}
                </CardDescription>
            </CardHeader>
            <form onSubmit={handleSubmit(onSubmit)}>
                <CardContent className="space-y-4">
                    {error && (
                        <Alert variant="destructive" className="animate-in fade-in slide-in-from-top-2">
                            <AlertCircle className="h-4 w-4" />
                            <AlertDescription>{error}</AlertDescription>
                        </Alert>
                    )}
                    {success && (
                        <Alert className="bg-green-50 text-green-900 border-green-200">
                            <AlertDescription>{success}</AlertDescription>
                        </Alert>
                    )}

                    {type === "signup" && (
                        <div className="grid grid-cols-2 gap-3 animate-in fade-in slide-in-from-bottom-2 duration-300">
                            <div className="space-y-2">
                                <Label htmlFor="first_name">{t("firstName") || "First Name"}</Label>
                                <Input id="first_name" placeholder="John" {...register("first_name")} />
                                {errors.first_name && <p className="text-xs text-destructive">{t(errors.first_name.message)}</p>}
                            </div>
                            <div className="space-y-2">
                                <Label htmlFor="last_name">{t("lastName") || "Last Name"}</Label>
                                <Input id="last_name" placeholder="Doe" {...register("last_name")} />
                                {errors.last_name && <p className="text-xs text-destructive">{t(errors.last_name.message)}</p>}
                            </div>
                        </div>
                    )}

                    <div className="space-y-2">
                        <Label htmlFor="email">{t("email")}</Label>
                        <Input id="email" type="email" placeholder="name@example.com" {...register("email")} />
                        {errors.email && <p className="text-xs text-destructive">{t(errors.email.message)}</p>}
                    </div>

                    {type === "signup" && (
                        <div className="space-y-2 animate-in fade-in slide-in-from-bottom-2 duration-300 delay-75">
                            <Label htmlFor="phone_number">{t("phoneNumber") || "Phone Number"}</Label>
                            <Input id="phone_number" type="tel" placeholder="+251 9xx xxx xxx" {...register("phone_number")} />
                            {errors.phone_number && <p className="text-xs text-destructive">{t(errors.phone_number.message)}</p>}
                        </div>
                    )}

                    {type !== "forgot-password" && (
                        <div className="space-y-2">
                            <div className="flex items-center justify-between">
                                <Label htmlFor="password">{t("password")}</Label>
                                {type === "login" && (
                                    <Link href="/forgot-password" className="text-xs text-primary underline-offset-4 hover:underline">
                                        {t("forgotDetails")}
                                    </Link>
                                )}
                            </div>
                            <Input id="password" type="password" {...register("password")} />
                            {errors.password && <p className="text-xs text-destructive">{t(errors.password.message)}</p>}
                        </div>
                    )}

                    {type === "signup" && (
                        <div className="space-y-2 animate-in fade-in slide-in-from-bottom-2 duration-300 delay-100">
                            <Label htmlFor="confirm_password">{t("confirmPassword") || "Confirm Password"}</Label>
                            <Input id="confirm_password" type="password" {...register("confirm_password")} />
                            {errors.confirm_password && <p className="text-xs text-destructive">{t(errors.confirm_password.message)}</p>}
                        </div>
                    )}
                </CardContent>
                <CardFooter className="flex flex-col gap-4">
                    <Button className="w-full transition-transform active:scale-[0.98]" type="submit" disabled={isLoading}>
                        {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                        {type === "login" ? t("signIn") : type === "signup" ? t("signUp") : t("sendResetLink")}
                    </Button>

                    <div className="text-center text-sm text-muted-foreground">
                        {type === "login" ? (
                            <>
                                {t("noAccount")}{" "}
                                {onTypeChange ? (
                                    <button type="button" onClick={() => onTypeChange("signup")} className="text-primary font-medium underline-offset-4 hover:underline">
                                        {t("signUp")}
                                    </button>
                                ) : (
                                    <Link href="/signup" className="text-primary font-medium underline-offset-4 hover:underline">
                                        {t("signUp")}
                                    </Link>
                                )}
                            </>
                        ) : type === "signup" ? (
                            <>
                                {t("hasAccount")}{" "}
                                {onTypeChange ? (
                                    <button type="button" onClick={() => onTypeChange("login")} className="text-primary font-medium underline-offset-4 hover:underline">
                                        {t("signIn")}
                                    </button>
                                ) : (
                                    <Link href="/login" className="text-primary font-medium underline-offset-4 hover:underline">
                                        {t("signIn")}
                                    </Link>
                                )}
                            </>
                        ) : (
                            <>
                                <Link href="/login" className="text-primary font-medium underline-offset-4 hover:underline">
                                    {t("signIn")}
                                </Link>
                            </>
                        )}
                    </div>
                </CardFooter>
            </form>
        </Card>
    );
}
