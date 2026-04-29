"use client";

import { useState, useEffect, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { useAuthStore } from "@/store/auth-store";
import { useLanguage } from "@/components/language-provider";
import { Loader2, KeyRound, ArrowLeft } from "lucide-react";
import { AuthContainer } from "@/components/auth/auth-container";
import { PasswordInput } from "@/components/ui/password-input";
import { toast } from "sonner";

const resetPasswordSchema = z.object({
  email: z.string().email("invalidEmail"),
  otp: z.string().length(6, "OTP must be 6 digits"),
  new_password: z.string()
    .min(9, "Password must be at least 9 characters long")
    .refine(val => /[a-zA-Z]/.test(val), { message: "Password must contain at least one letter" }),
  confirm_password: z.string().min(1, "Please confirm your password"),
}).refine((data) => data.new_password === data.confirm_password, {
  message: "passwordsMustMatch",
  path: ["confirm_password"],
});

function ResetPasswordContent() {
  const [isLoading, setIsLoading] = useState(false);
  const { resetPassword, setupAdminAccount } = useAuthStore();
  const router = useRouter();
  const searchParams = useSearchParams();
  const { t } = useLanguage();

  const emailParam = searchParams.get("email") || "";
  const otpParam = searchParams.get("otp") || "";
  const purpose = searchParams.get("purpose") || "PASSWORD_RESET";

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm({
    resolver: zodResolver(resetPasswordSchema),
    defaultValues: {
      email: emailParam,
      otp: otpParam,
      new_password: "",
      confirm_password: "",
    },
  });

  const onSubmit = async (data) => {
    setIsLoading(true);
    
    try {
      let result;
      if (purpose === "ACCOUNT_SETUP") {
        result = await setupAdminAccount(data.email, data.otp, data.new_password, data.confirm_password);
      } else {
        result = await resetPassword(data.email, data.otp, data.new_password, data.confirm_password);
      }

      if (result.success) {
        const successMsg = purpose === "ACCOUNT_SETUP" 
          ? "Your account has been activated successfully. Now login."
          : "Password reset successfully.";
        toast.success(successMsg);
        
        setTimeout(() => {
          router.push("/login");
        }, 3000);
      } else {
        toast.error(result.error);
      }
    } catch (err) {
      toast.error(t("unexpectedError") || "An unexpected error occurred");
    } finally {
      setIsLoading(false);
    }
  };

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
          <Card className="relative bg-card shadow-sm border-border border-border dark:border-border rounded-[2rem] overflow-hidden shadow-2xl transition-all duration-500 hover:shadow-primary/5 w-full max-w-md">
            <CardHeader className="space-y-3 items-center text-center pb-8 pt-10 px-8">
              <div className="w-16 h-16 bg-gradient-to-br from-primary to-blue-600 rounded-2xl flex items-center justify-center mb-2 shadow-lg shadow-primary/20 transform -rotate-3 group-hover:rotate-0 transition-transform duration-500">
                <KeyRound className="h-8 w-8 text-white" />
              </div>
              <div className="space-y-1">
                <CardTitle className="text-3xl font-black font-display tracking-tight text-foreground">
                  {purpose === "ACCOUNT_SETUP" ? "Activate Account" : "Reset Password"}
                </CardTitle>
                <CardDescription className="text-muted-foreground font-medium text-base">
                  {purpose === "ACCOUNT_SETUP" 
                    ? "Complete your account setup to start using the portal." 
                    : "Please choose a strong password to secure your account."}
                </CardDescription>
              </div>
            </CardHeader>
            <form onSubmit={handleSubmit(onSubmit)}>
              <CardContent className="space-y-5 px-8">
                <div className="space-y-2">
                  <Label htmlFor="email" className="text-xs font-bold uppercase tracking-wider text-muted-foreground ml-1">Email</Label>
                  <Input 
                    id="email" 
                    type="email" 
                    {...register("email")} 
                    readOnly={!!emailParam}
                    className={`h-12 bg-background border-border rounded-xl focus:ring-primary/20 ${!!emailParam ? "opacity-70 cursor-not-allowed" : ""}`} 
                  />
                  {errors.email && <p className="text-[10px] font-bold text-destructive uppercase tracking-tight ml-1">{t(errors.email.message) || errors.email.message}</p>}
                </div>
                <div className="space-y-2">
                  <Label htmlFor="otp" className="text-xs font-bold uppercase tracking-wider text-muted-foreground ml-1">OTP Code</Label>
                  <Input 
                    id="otp" 
                    type="text" 
                    maxLength={6}
                    {...register("otp")} 
                    readOnly={!!otpParam}
                    className={`h-12 bg-background border-border rounded-xl focus:ring-primary/20 ${!!otpParam ? "opacity-70 cursor-not-allowed" : ""}`} 
                  />
                  {errors.otp && <p className="text-[10px] font-bold text-destructive uppercase tracking-tight ml-1">{errors.otp.message}</p>}
                </div>

                <div className="space-y-2">
                  <Label htmlFor="new_password" title="New Password" className="text-xs font-bold uppercase tracking-wider text-muted-foreground ml-1">New Password</Label>
                  <PasswordInput id="new_password" placeholder="Min 9 characters + 1 letter" {...register("new_password")} className="h-12 bg-background border-border rounded-xl focus:ring-primary/20" />
                  {errors.new_password && <p className="text-[10px] font-bold text-destructive uppercase tracking-tight ml-1">{errors.new_password.message}</p>}
                </div>

                <div className="space-y-2">
                  <Label htmlFor="confirm_password" className="text-xs font-bold uppercase tracking-wider text-muted-foreground ml-1">Confirm Password</Label>
                  <PasswordInput id="confirm_password" {...register("confirm_password")} className="h-12 bg-background border-border rounded-xl focus:ring-primary/20" />
                  {errors.confirm_password && <p className="text-[10px] font-bold text-destructive uppercase tracking-tight ml-1">{t(errors.confirm_password.message) || errors.confirm_password.message}</p>}
                </div>
              </CardContent>
              <CardFooter className="flex flex-col gap-6 px-8 pb-10 pt-6">
                <Button className="w-full h-14 rounded-xl font-bold bg-gradient-to-r from-primary to-blue-600 hover:from-primary hover:to-blue-500 transition-all duration-300 shadow-lg shadow-primary/25 hover:shadow-primary/40 active:scale-[0.98] text-white" type="submit" disabled={isLoading}>
                  {isLoading && <Loader2 className="mr-2 h-5 w-5 animate-spin" />}
                  {purpose === "ACCOUNT_SETUP" ? "Activate Account" : "Update Password"}
                </Button>
              </CardFooter>
            </form>
          </Card>
        </AuthContainer>
      </div>
    </div>
  );
}

export default function ResetPasswordPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen flex items-center justify-center bg-muted/30">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    }>
      <ResetPasswordContent />
    </Suspense>
  );
}
