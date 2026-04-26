"use client";

import { useState, useEffect, Suspense } from "react";
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
import { Loader2, ShieldCheck, Timer } from "lucide-react";
import { AuthContainer } from "@/components/auth/auth-container";
import { toast } from "sonner";

const otpSchema = z.object({
 otp: z.string().length(6, "OTP must be 6 digits"),
 email: z.string().email(),
});

function VerifyOTPContent() {
 const [isLoading, setIsLoading] = useState(false);
 const [isResending, setIsResending] = useState(false);
 const [timeLeft, setTimeLeft] = useState(300); // 5 minutes in seconds
 const { verifyOTP, resendOTP } = useAuthStore();
 const router = useRouter();
 const searchParams = useSearchParams();
 const { t } = useLanguage();

 const emailParam = searchParams.get("email") || "";
 const purpose = searchParams.get("purpose") || "VERIFICATION";

 // Timer logic
 useEffect(() => {
 if (timeLeft <= 0) return;
 const timer = setInterval(() => {
 setTimeLeft((prev) => prev - 1);
 }, 1000);
 return () => clearInterval(timer);
 }, [timeLeft]);

 const formatTime = (seconds) => {
 const mins = Math.floor(seconds / 60);
 const secs = seconds % 60;
 return `${mins.toString().padStart(2, "0")}:${secs.toString().padStart(2, "0")}`;
 };

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

 try {
 const result = await verifyOTP(data.email, data.otp, purpose);
 if (result.success) {
 toast.success(t("otpVerified") || "OTP Verified Successfully");
 
 // Redirection logic based on purpose
 setTimeout(() => {
 if (purpose === "ACCOUNT_SETUP") {
 router.push(`/setup-account?email=${encodeURIComponent(data.email)}&otp=${encodeURIComponent(data.otp)}`);
 } else if (purpose === "PASSWORD_RESET") {
 router.push(`/reset-password?email=${encodeURIComponent(data.email)}&otp=${encodeURIComponent(data.otp)}&purpose=${purpose}`);
 } else {
 router.push("/login");
 }
 }, 1500);
 } else {
 toast.error(result.error);
 }
 } catch (err) {
 toast.error(t("unexpectedError") || "An unexpected error occurred");
 } finally {
 setIsLoading(false);
 }
 };

 const handleResend = async () => {
 if (!emailParam) {
 toast.error("Email is missing. Cannot resend OTP.");
 return;
 }

 setIsResending(true);

 try {
 const result = await resendOTP(emailParam, purpose);
 if (result.success) {
 toast.success("New OTP sent to your email.");
 setTimeLeft(300); // Reset timer
 } else {
 toast.error(result.error);
 }
 } catch (err) {
 toast.error(t("unexpectedError") || "An unexpected error occurred");
 } finally {
 setIsResending(false);
 }
 };

 return (
 <AuthContainer>
 <Card className="relative bg-card shadow-sm border-border border-border dark:border-border rounded-[2rem] overflow-hidden shadow-2xl transition-all duration-500 hover:shadow-primary/5">
 <CardHeader className="space-y-4 items-center text-center pb-8 pt-10 px-8">
 <div className="w-16 h-16 bg-gradient-to-br from-primary to-blue-600 rounded-2xl flex items-center justify-center mb-2 shadow-lg shadow-primary/20 transform -rotate-3 group-hover:rotate-0 transition-transform duration-500">
 <ShieldCheck className="h-8 w-8 text-white" />
 </div>
 <div className="space-y-1">
 <CardTitle className="text-3xl font-black font-display tracking-tight text-foreground">
 {t("verifyOTP") || "Verify OTP"}
 </CardTitle>
 <CardDescription className="text-muted-foreground font-medium text-base">
 {t("otpSentTo") || "OTP sent to"}: <br /> 
 <span className="font-bold text-primary mt-1 inline-block">{emailParam}</span>
 </CardDescription>
 </div>
 </CardHeader>
 <form onSubmit={handleSubmit(onSubmit)}>
 <CardContent className="space-y-6 px-8">
 <div className="space-y-3">
 <Label htmlFor="otp" className="text-xs font-bold uppercase tracking-widest text-muted-foreground/80 ml-1">{t("enterOTP") || "Enter 6-digit OTP"}</Label>
 <Input
 id="otp"
 type="text"
 maxLength={6}
 placeholder="0 0 0 0 0 0"
 className="h-20 text-center text-4xl tracking-[0.2em] font-black font-display bg-background border-border rounded-2xl focus:ring-4 focus:ring-primary/10 transition-all shadow-inner"
 {...register("otp")}
 />
 {errors.otp && <p className="text-[10px] font-bold text-destructive uppercase tracking-tight text-center mt-1">{errors.otp.message}</p>}
 </div>

 {/* Countdown Timer */}
 <div className="flex flex-col items-center justify-center space-y-2 py-2">
 <div className="flex items-center gap-2 text-sm font-bold text-muted-foreground bg-secondary/30 px-4 py-2 rounded-full border border-border/50">
 <Timer className={`h-4 w-4 ${timeLeft < 60 ? "text-destructive animate-pulse" : "text-primary"}`} />
 <span>OTP expires in {formatTime(timeLeft)}</span>
 </div>
 </div>
 </CardContent>
 <CardFooter className="flex flex-col gap-6 px-8 pb-10 pt-6">
 <Button className="w-full h-14 rounded-xl font-bold bg-gradient-to-r from-primary to-blue-600 hover:from-primary hover:to-blue-500 transition-all duration-300 shadow-lg shadow-primary/25 hover:shadow-primary/40 active:scale-[0.98] text-white" type="submit" disabled={isLoading}>
 {isLoading && <Loader2 className="mr-2 h-5 w-5 animate-spin" />}
 {t("verify") || "Verify OTP"}
 </Button>
 
 <div className="w-full flex justify-center">
 <Button
 variant="ghost"
 className={`text-xs font-black uppercase tracking-widest px-0 group/resend transition-all ${timeLeft > 0 ? "text-muted-foreground/40 cursor-not-allowed" : "text-primary hover:bg-transparent"}`}
 type="button"
 onClick={handleResend}
 disabled={isResending || timeLeft > 0}
 >
 {isResending ? (
 <Loader2 className="mr-2 h-4 w-4 animate-spin" />
 ) : (
 <>
 {timeLeft > 0 ? (
 <span>Resend OTP available in {formatTime(timeLeft)}</span>
 ) : (
 <span className="group-hover/resend:underline underline-offset-4">{t("resendOTP") || "Resend OTP"}</span>
 )}
 </>
 )}
 </Button>
 </div>
 </CardFooter>
 </form>
 </Card>
 </AuthContainer>
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
