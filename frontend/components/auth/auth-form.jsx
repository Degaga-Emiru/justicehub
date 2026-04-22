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
import { AlertCircle, Eye, EyeOff } from "lucide-react";
import { PasswordInput } from "@/components/ui/password-input";

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
    const { login, signup, forgotPassword } = useAuthStore();
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
                        CITIZEN: "client",
                        JUDGE: "judge",
                        ADMIN: "admin",
                        LAWYER: "client",
                        CLERK: "clerk",
                        DEFENDANT: "defendant",
                        REGISTRAR: "registrar",
                    };
                    const normalizedRole = typeof result.role === 'string' ? result.role.toUpperCase() : "CITIZEN";
                    const route = roleRouteMap[normalizedRole] || "client";
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
                const result = await forgotPassword(data.email);
                if (result.success) {
                    router.push(`/verify-otp?email=${encodeURIComponent(data.email)}&purpose=PASSWORD_RESET`);
                } else {
                    setError(result.error);
                }
            }
        } catch (err) {
            setError(t("unexpectedError"));
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <div className="w-full max-w-md mx-auto relative group">
            {/* Background Glow Effect */}
            <div className="absolute -inset-1 bg-gradient-to-r from-primary to-blue-600 rounded-[2rem] blur opacity-10 group-hover:opacity-20 transition duration-1000"></div>
            
            <Card className="relative glass-card border-white/20 dark:border-white/10 rounded-[2rem] overflow-hidden shadow-2xl transition-all duration-500 hover:shadow-primary/5">
                <CardHeader className="space-y-3 items-center text-center pb-8 pt-10">
                    <div className="w-16 h-16 bg-gradient-to-br from-primary to-blue-600 rounded-2xl flex items-center justify-center mb-2 shadow-lg shadow-primary/20 transform -rotate-3 group-hover:rotate-0 transition-transform duration-500">
                        <Scale className="h-8 w-8 text-white" />
                    </div>
                    <div className="space-y-1">
                        <CardTitle className="text-3xl font-black font-display tracking-tight text-foreground">
                            {type === "login" ? t("welcomeBack") : type === "signup" ? t("createAccount") : t("resetPassword")}
                        </CardTitle>
                        <CardDescription className="text-muted-foreground font-medium text-base">
                            {type === "login"
                                ? t("enterCredentials")
                                : type === "signup"
                                    ? t("enterDetails")
                                    : t("enterEmailReset")}
                        </CardDescription>
                    </div>
                </CardHeader>
                <form onSubmit={handleSubmit(onSubmit)}>
                    <CardContent className="space-y-5 px-8">
                        {error && (
                            <Alert variant="destructive" className="animate-in fade-in slide-in-from-top-2 glass border-destructive/50">
                                <AlertCircle className="h-4 w-4" />
                                <AlertDescription className="font-medium">{error}</AlertDescription>
                            </Alert>
                        )}
                        {success && (
                            <Alert className="bg-emerald-500/10 text-emerald-600 border-emerald-500/20 glass">
                                <AlertDescription className="font-bold">{success}</AlertDescription>
                            </Alert>
                        )}

                        {type === "signup" && (
                            <div className="grid grid-cols-2 gap-4 animate-in fade-in slide-in-from-bottom-2 duration-300">
                                <div className="space-y-2">
                                    <Label htmlFor="first_name" className="text-xs font-bold uppercase tracking-wider text-muted-foreground ml-1">{t("firstName") || "First Name"}</Label>
                                    <Input id="first_name" placeholder="John" {...register("first_name")} className="h-12 bg-background/50 border-white/20 rounded-xl focus:ring-primary/20" />
                                    {errors.first_name && <p className="text-[10px] font-bold text-destructive uppercase tracking-tight ml-1">{t(errors.first_name.message)}</p>}
                                </div>
                                <div className="space-y-2">
                                    <Label htmlFor="last_name" className="text-xs font-bold uppercase tracking-wider text-muted-foreground ml-1">{t("lastName") || "Last Name"}</Label>
                                    <Input id="last_name" placeholder="Doe" {...register("last_name")} className="h-12 bg-background/50 border-white/20 rounded-xl focus:ring-primary/20" />
                                    {errors.last_name && <p className="text-[10px] font-bold text-destructive uppercase tracking-tight ml-1">{t(errors.last_name.message)}</p>}
                                </div>
                            </div>
                        )}

                        <div className="space-y-2">
                            <Label htmlFor="email" className="text-xs font-bold uppercase tracking-wider text-muted-foreground ml-1">{t("email")}</Label>
                            <Input id="email" type="email" placeholder="name@example.com" {...register("email")} className="h-12 bg-background/50 border-white/20 rounded-xl focus:ring-primary/20" />
                            {errors.email && <p className="text-[10px] font-bold text-destructive uppercase tracking-tight ml-1">{t(errors.email.message)}</p>}
                        </div>

                        {type === "signup" && (
                            <div className="space-y-2 animate-in fade-in slide-in-from-bottom-2 duration-300 delay-75">
                                <Label htmlFor="phone_number" className="text-xs font-bold uppercase tracking-wider text-muted-foreground ml-1">{t("phoneNumber") || "Phone Number"}</Label>
                                <Input id="phone_number" type="tel" placeholder="+251 9xx xxx xxx" {...register("phone_number")} className="h-12 bg-background/50 border-white/20 rounded-xl focus:ring-primary/20" />
                                {errors.phone_number && <p className="text-[10px] font-bold text-destructive uppercase tracking-tight ml-1">{t(errors.phone_number.message)}</p>}
                            </div>
                        )}

                        {type !== "forgot-password" && (
                            <div className="space-y-2">
                                <div className="flex items-center justify-between">
                                    <Label htmlFor="password" title={t("password")} className="text-xs font-bold uppercase tracking-wider text-muted-foreground ml-1">{t("password")}</Label>
                                    {type === "login" && (
                                        <Link href="/forgot-password" className="text-xs font-bold text-primary hover:text-blue-500 transition-colors mr-1">
                                            {t("forgotDetails")}
                                        </Link>
                                    )}
                                </div>
                                <PasswordInput id="password" {...register("password")} className="h-12 bg-background/50 border-white/20 rounded-xl focus:ring-primary/20" />
                                {errors.password && <p className="text-[10px] font-bold text-destructive uppercase tracking-tight ml-1">{t(errors.password.message)}</p>}
                            </div>
                        )}

                        {type === "signup" && (
                            <div className="space-y-2 animate-in fade-in slide-in-from-bottom-2 duration-300 delay-100">
                                <Label htmlFor="confirm_password" className="text-xs font-bold uppercase tracking-wider text-muted-foreground ml-1">{t("confirmPassword") || "Confirm Password"}</Label>
                                <PasswordInput id="confirm_password" {...register("confirm_password")} className="h-12 bg-background/50 border-white/20 rounded-xl focus:ring-primary/20" />
                                {errors.confirm_password && <p className="text-[10px] font-bold text-destructive uppercase tracking-tight ml-1">{t(errors.confirm_password.message)}</p>}
                            </div>
                        )}
                    </CardContent>
                    <CardFooter className="flex flex-col gap-6 px-8 pb-10 pt-6">
                        <Button className="w-full h-14 rounded-xl font-bold bg-gradient-to-r from-primary to-blue-600 hover:from-primary hover:to-blue-500 transition-all duration-300 shadow-lg shadow-primary/25 hover:shadow-primary/40 active:scale-[0.98] text-white" type="submit" disabled={isLoading}>
                            {isLoading && <Loader2 className="mr-2 h-5 w-5 animate-spin" />}
                            {type === "login" ? t("signIn") : type === "signup" ? t("signUp") : t("sendResetLink")}
                        </Button>

                        <div className="text-center text-sm font-semibold text-muted-foreground space-y-4">
                            <div className="space-y-2">
                                {(type === "login" || type === "signup") && (
                                    <p className="text-xs text-muted-foreground font-medium">
                                        If your account is created by Admin, reset your password by{" "}
                                        <Link href="/setup-account" className="text-primary font-bold hover:text-blue-600 underline underline-offset-4">
                                            clicking here
                                        </Link>
                                    </p>
                                )}
                            </div>

                            <div>
                                {type === "login" ? (
                                    <>
                                        {t("noAccount")}{" "}
                                        {onTypeChange ? (
                                            <button type="button" onClick={() => onTypeChange("signup")} className="text-primary font-bold hover:text-blue-500 transition-colors">
                                                {t("signUp")}
                                            </button>
                                        ) : (
                                            <Link href="/signup" className="text-primary font-bold hover:text-blue-500 transition-colors">
                                                {t("signUp")}
                                            </Link>
                                        )}
                                    </>
                                ) : type === "signup" ? (
                                    <>
                                        {t("hasAccount")}{" "}
                                        {onTypeChange ? (
                                            <button type="button" onClick={() => onTypeChange("login")} className="text-primary font-bold hover:text-blue-500 transition-colors">
                                                {t("signIn")}
                                            </button>
                                        ) : (
                                            <Link href="/login" className="text-primary font-bold hover:text-blue-500 transition-colors">
                                                {t("signIn")}
                                            </Link>
                                        )}
                                    </>
                                ) : (
                                    <>
                                        <Link href="/login" className="text-primary font-bold hover:text-blue-500 transition-colors">
                                            {t("signIn")}
                                        </Link>
                                    </>
                                )}
                            </div>
                        </div>
                    </CardFooter>
                </form>
            </Card>
        </div>
    );
}
