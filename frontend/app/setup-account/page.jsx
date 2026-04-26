"use client";

import { useState, useEffect, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { setupAccountPassword, resendOTP } from "@/lib/api";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useLanguage } from "@/components/language-provider";
import { AlertCircle, CheckCircle2, ShieldCheck, ArrowLeft } from "lucide-react";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { PasswordInput } from "@/components/ui/password-input";
import { toast } from "sonner";

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
 
 const [isLoading, setIsLoading] = useState(false);
 const [error, setError] = useState("");
 const { t } = useLanguage();

 useEffect(() => {
 if (emailFromUrl && !formData.email) {
 setFormData(prev => ({ ...prev, email: emailFromUrl }));
 }
 }, [emailFromUrl]);

 const handleSubmit = async (e) => {
 e.preventDefault();
 
 if (formData.new_password !== formData.confirm_password) {
 toast.error(t("passwordsMustMatch"));
 return;
 }

 if (formData.new_password.length < 8) {
 toast.error(t("passwordMinLength"));
 return;
 }

 setIsLoading(true);
 try {
 await setupAccountPassword(formData);
 toast.success("Account activation complete! Your judicial credentials are now active.");
 
 setTimeout(() => {
 router.push("/login?setup=success");
 }, 3000);
 } catch (err) {
 const errMsg = err.message || t("unexpectedError");
 setError(errMsg);
 toast.error(errMsg);
 } finally {
 setIsLoading(false);
 }
 };

 const handleResendOTP = async () => {
 setIsLoading(true);
 try {
 await resendOTP({ email: formData.email, purpose: "ACCOUNT_SETUP" });
 toast.success("A new OTP has been sent to your email.");
 } catch (err) {
 const errMsg = err.message || "Failed to resend OTP";
 setError(errMsg);
 toast.error(errMsg);
 } finally {
 setIsLoading(false);
 }
 };

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
 className="h-12 bg-background border-border rounded-xl focus:ring-primary/20 font-medium"
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
 className="h-12 bg-background border-border rounded-xl focus:ring-primary/20 font-mono text-center text-xl tracking-[0.5em] font-black"
 />
 </div>

 <div className="space-y-2">
 <Label htmlFor="new_password" className="text-xs font-black uppercase tracking-widest text-muted-foreground ml-1">Secure Password</Label>
 <PasswordInput
 id="new_password"
 value={formData.new_password}
 onChange={(e) => setFormData({ ...formData, new_password: e.target.value })}
 required
 placeholder="••••••••"
 className="h-12 bg-background border-border rounded-xl focus:ring-primary/20"
 />
 </div>

 <div className="space-y-2">
 <Label htmlFor="confirm_password" className="text-xs font-black uppercase tracking-widest text-muted-foreground ml-1">{t("confirmPassword") || "Verify Password"}</Label>
 <PasswordInput
 id="confirm_password"
 value={formData.confirm_password}
 onChange={(e) => setFormData({ ...formData, confirm_password: e.target.value })}
 required
 className="h-12 bg-background border-border rounded-xl focus:ring-primary/20"
 />
 </div>

 {error.toLowerCase().includes("expired") ? (
 <Button type="button" onClick={handleResendOTP} className="w-full h-14 rounded-xl font-black bg-gradient-to-r from-amber-500 to-orange-600 hover:from-amber-600 hover:to-orange-700 transition-all duration-300 shadow-xl shadow-amber-500/25 text-white uppercase tracking-widest text-xs" disabled={isLoading}>
 {isLoading ? "Synchronizing..." : "Resend OTP"}
 </Button>
 ) : (
 <Button type="submit" className="w-full h-14 rounded-xl font-black bg-gradient-to-r from-primary to-blue-600 hover:from-primary hover:to-blue-500 transition-all duration-300 shadow-xl shadow-primary/25 hover:shadow-primary/40 text-white uppercase tracking-widest text-xs" disabled={isLoading}>
 {isLoading ? "Synchronizing..." : "Activate Account"}
 </Button>
 )}
 </form>
 </div>
 );
}

export default function SetupAccountPage() {
 const router = useRouter();

 return (
 <div className="min-h-screen flex items-center justify-center bg-background relative overflow-hidden p-6 font-sans">
 {/* Back Button */}
 <Button
 variant="ghost"
 className="absolute top-6 left-6 z-50 rounded-xl hover:bg-muted/50 transition-colors"
 onClick={() => router.push("/login")}
 >
 <ArrowLeft className="mr-2 h-4 w-4" /> Back to Login
 </Button>

 {/* Background Mesh Gradients */}
 <div className="absolute top-0 left-0 w-full h-full -z-10 opacity-30 dark:opacity-20 pointer-events-none">
 <div className="absolute top-[-10%] right-[-10%] w-[60%] h-[60%] bg-primary/10 rounded-full blur-[120px] animate-pulse-slow"></div>
 <div className="absolute bottom-[-10%] left-[-10%] w-[60%] h-[60%] bg-blue-500/10 rounded-full blur-[120px]"></div>
 </div>

 <div className="w-full max-w-md animate-fade-up relative z-10">
 <div className="relative group">
 {/* Background Glow Effect */}
 <div className="absolute -inset-1 bg-gradient-to-r from-primary to-blue-600 rounded-[2rem] blur opacity-10 group-hover:opacity-20 transition duration-1000"></div>
 
 <div className="relative bg-card shadow-sm border-border border-border dark:border-border rounded-[2rem] overflow-hidden shadow-2xl p-8 lg:p-10 space-y-8">
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
