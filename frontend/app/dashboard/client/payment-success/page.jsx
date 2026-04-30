"use client";

import { Suspense, useEffect, useState } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { confirmPayment } from "@/lib/api";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { CheckCircle2, Loader2, AlertCircle, ArrowRight, ShieldCheck, PartyPopper } from "lucide-react";
import { cn } from "@/lib/utils";

function PaymentSuccessContent() {
    const searchParams = useSearchParams();
    const router = useRouter();
    const queryClient = useQueryClient();
    const [countdown, setCountdown] = useState(5);
    
    // Robust parsing for tx_ref from multiple possible param names
    const txRef = searchParams.get("tx_ref") || searchParams.get("trx_ref") || searchParams.get("reference");
    const caseId = searchParams.get("case_id");

    const { data, isLoading, isError } = useQuery({
        queryKey: ["verify-payment", txRef],
        queryFn: () => confirmPayment(txRef),
        enabled: !!txRef,
        retry: 3,
        retryDelay: 2000,
    });

    useEffect(() => {
        if (data?.status === "SUCCESS" || data?.status === "VERIFIED" || data?.status === "PAID") {
            // Aggressively invalidate all related queries
            queryClient.invalidateQueries(); 
        }

        const timer = setInterval(() => {
            setCountdown((prev) => {
                if (prev <= 1) {
                    clearInterval(timer);
                    const targetPath = caseId || data?.case_id 
                        ? `/dashboard/client/cases/${caseId || data.case_id}` 
                        : "/dashboard/client/cases";
                    
                    // Use window.location.href for a hard redirect to ensure fresh data
                    window.location.href = targetPath;
                    return 0;
                }
                return prev - 1;
            });
        }, 1000);
        return () => clearInterval(timer);
    }, [data, caseId, queryClient]);

    return (
        <div className="flex items-center justify-center min-h-[85vh] p-4 sm:p-6 animate-fade-up bg-slate-950/20">
            <Card className="max-w-md w-full shadow-[0_0_50px_-12px_rgba(16,185,129,0.25)] border-emerald-500/20 bg-slate-900 overflow-hidden text-center">
                <div className="h-2.5 w-full bg-gradient-to-r from-emerald-500 via-emerald-400 to-emerald-600 animate-pulse" />
                
                <CardHeader className="pt-12 pb-6 px-8">
                    <div className="flex justify-center mb-8 relative">
                        <div className="absolute inset-0 bg-emerald-500/20 blur-3xl rounded-full scale-150 animate-pulse" />
                        <div className="h-28 w-28 rounded-[2.5rem] bg-emerald-500 flex items-center justify-center -rotate-3 border-4 border-emerald-400/30 shadow-2xl z-10 transition-transform hover:scale-105 duration-500">
                            <CheckCircle2 className="h-14 w-14 text-slate-950 stroke-[2.5px]" />
                        </div>
                        <PartyPopper className="absolute -top-4 -right-4 h-10 w-10 text-emerald-400 animate-bounce" />
                    </div>
                    <CardTitle className="text-4xl font-black font-display tracking-tight text-white mb-2">
                        Payment Success!
                    </CardTitle>
                    <CardDescription className="text-emerald-400/90 font-bold text-xl px-2 leading-tight">
                        Transaction Verified Successfully
                    </CardDescription>
                </CardHeader>
                
                <CardContent className="p-10 pt-4 space-y-10">
                    <div className="space-y-4">
                        <p className="text-slate-200 text-base font-semibold leading-relaxed">
                            We've successfully processed your filing fee. Your case has been updated and is now moving to the <span className="text-emerald-400 font-black px-1.5 py-0.5 bg-emerald-500/10 rounded-md">ASSIGNED</span> phase.
                        </p>
                        
                        <div className="flex items-center gap-4 p-5 rounded-2xl bg-emerald-500/5 border border-emerald-500/10 text-left group hover:bg-emerald-500/10 transition-colors">
                            <ShieldCheck className="h-8 w-8 text-emerald-500 shrink-0 group-hover:scale-110 transition-transform" />
                            <div className="space-y-1">
                                <p className="text-[10px] font-black text-emerald-500 uppercase tracking-widest">Next Step</p>
                                <p className="text-xs font-bold text-slate-300 leading-tight">
                                    A judge will be assigned to review your filing and schedule your first hearing session.
                                </p>
                            </div>
                        </div>
                    </div>

                    <div className="flex flex-col gap-5">
                        <Button 
                            onClick={() => {
                                const targetPath = caseId || data?.case_id ? `/dashboard/client/cases/${caseId || data?.case_id}` : "/dashboard/client/cases";
                                window.location.href = targetPath;
                            }}
                            className="h-16 rounded-2xl font-black font-display text-lg tracking-tight text-slate-950 bg-emerald-500 hover:bg-emerald-400 shadow-xl shadow-emerald-500/30 transition-all active:scale-95 flex items-center justify-center gap-3 group"
                        >
                            Return to Dashboard
                            <ArrowRight className="h-6 w-6 group-hover:translate-x-1 transition-transform" />
                        </Button>
                        
                        <div className="flex items-center justify-center gap-3">
                            <div className="h-1 w-12 bg-slate-800 rounded-full overflow-hidden">
                                <div className="h-full bg-emerald-500 animate-[progress_5s_linear_infinite]" style={{ width: `${(countdown/5)*100}%` }} />
                            </div>
                            <p className="text-xs font-black text-slate-500 uppercase tracking-[0.25em]">
                                Auto-Redirect in {countdown}s
                            </p>
                            <div className="h-1 w-12 bg-slate-800 rounded-full" />
                        </div>
                    </div>
                </CardContent>
            </Card>
        </div>
    );
}

export default function PaymentSuccessPage() {
    return (
        <Suspense fallback={
            <div className="flex items-center justify-center min-h-[70vh]">
                <Loader2 className="h-12 w-12 animate-spin text-primary" />
            </div>
        }>
            <PaymentSuccessContent />
        </Suspense>
    );
}
