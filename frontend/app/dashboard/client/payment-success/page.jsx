"use client";

import { Suspense, useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { confirmPayment } from "@/lib/api";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  CheckCircle2,
  Loader2,
  ArrowRight,
  ShieldCheck,
  PartyPopper,
  XCircle,
} from "lucide-react";

function PaymentSuccessContent() {
  const searchParams = useSearchParams();
  const queryClient = useQueryClient();
  const [countdown, setCountdown] = useState(8);

  // tx_ref and case_id are always present — the backend now appends them to the Chapa return_url.
  // Format: /dashboard/client/payment-success/?tx_ref=CASE-xxx&case_id=yyy
  const txRef =
    searchParams.get("tx_ref") ||
    searchParams.get("trx_ref") ||
    searchParams.get("reference");
  const caseId = searchParams.get("case_id");

  const { data, isLoading, isError } = useQuery({
    queryKey: ["verify-payment", txRef],
    queryFn: () => confirmPayment(txRef),
    enabled: !!txRef,
    retry: 3,
    retryDelay: 2000,
    staleTime: 0,
  });

  const isSuccess =
    data?.status === "SUCCESS" ||
    data?.status === "VERIFIED" ||
    data?.status === "PAID";

  const targetCaseId = caseId || data?.case_id;
  const targetPath = targetCaseId
    ? `/dashboard/client/cases/${targetCaseId}`
    : "/dashboard/client/cases";

  // Invalidate cached queries so the case page shows the updated status immediately
  useEffect(() => {
    if (isSuccess) {
      queryClient.invalidateQueries();
    }
  }, [isSuccess, queryClient]);

  // Countdown only starts once verification is confirmed successful
  useEffect(() => {
    if (!isSuccess) return;
    const timer = setInterval(() => {
      setCountdown((prev) => {
        if (prev <= 1) {
          clearInterval(timer);
          window.location.href = targetPath;
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
    return () => clearInterval(timer);
  }, [isSuccess, targetPath]);

  // ── Loading state ────────────────────────────────────────────────────────────
  if (!txRef || isLoading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[85vh] gap-6 p-4 bg-slate-950/20">
        <div className="h-24 w-24 rounded-[2rem] bg-primary/10 flex items-center justify-center shadow-xl">
          <Loader2 className="h-12 w-12 animate-spin text-primary" />
        </div>
        <div className="text-center space-y-2 max-w-sm">
          <p className="text-xl font-black text-white">Verifying Your Payment…</p>
          <p className="text-sm text-slate-400 font-medium leading-relaxed">
            Please wait while we confirm your transaction with Chapa.{" "}
            <span className="text-yellow-400 font-bold">Do not close this page.</span>
          </p>
        </div>
      </div>
    );
  }

  // ── Error / verification failed state ─────────────────────────────────────
  if (isError || (data && !isSuccess)) {
    return (
      <div className="flex items-center justify-center min-h-[85vh] p-4 bg-slate-950/20">
        <Card className="max-w-md w-full shadow-xl border-red-500/20 bg-slate-900 overflow-hidden text-center">
          <div className="h-2.5 w-full bg-gradient-to-r from-red-600 to-red-400" />
          <CardHeader className="pt-10 pb-4 px-8">
            <div className="flex justify-center mb-6">
              <div className="h-24 w-24 rounded-[2rem] bg-red-500/10 flex items-center justify-center">
                <XCircle className="h-12 w-12 text-red-500" />
              </div>
            </div>
            <CardTitle className="text-3xl font-black text-white mb-2">
              Verification Failed
            </CardTitle>
            <CardDescription className="text-red-400 font-semibold text-base">
              We could not confirm your payment with Chapa.
            </CardDescription>
          </CardHeader>
          <CardContent className="p-8 pt-2 space-y-6">
            <p className="text-slate-300 text-sm font-medium leading-relaxed">
              Your payment may not have completed successfully, or there was a
              temporary issue. Please return to your case — if the fee is still
              showing as unpaid you can retry the payment at any time.
            </p>
            <Button
              onClick={() => (window.location.href = targetPath)}
              className="w-full h-14 rounded-2xl font-black text-base bg-red-500 hover:bg-red-400 text-white flex items-center justify-center gap-2"
            >
              Return to My Case
              <ArrowRight className="h-5 w-5" />
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  // ── Success state ─────────────────────────────────────────────────────────
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
            Payment Verified!
          </CardTitle>
          <CardDescription className="text-emerald-400/90 font-bold text-lg px-2 leading-tight">
            Your case fee has been confirmed
          </CardDescription>
        </CardHeader>

        <CardContent className="p-10 pt-4 space-y-8">
          <div className="space-y-4">
            <p className="text-slate-200 text-sm font-semibold leading-relaxed">
              Your Chapa payment has been verified and your case is now
              progressing to the{" "}
              <span className="text-emerald-400 font-black px-1.5 py-0.5 bg-emerald-500/10 rounded-md">
                JUDGE ASSIGNMENT
              </span>{" "}
              phase — a judge will be automatically matched to your case based
              on its category.
            </p>

            <div className="space-y-3 text-left">
              <div className="flex items-start gap-4 p-4 rounded-2xl bg-emerald-500/5 border border-emerald-500/10 group hover:bg-emerald-500/10 transition-colors">
                <CheckCircle2 className="h-6 w-6 text-emerald-500 shrink-0 mt-0.5" />
                <div>
                  <p className="text-[10px] font-black text-emerald-500 uppercase tracking-widest mb-0.5">
                    Completed
                  </p>
                  <p className="text-xs font-bold text-slate-300">
                    Payment successfully verified with Chapa
                  </p>
                </div>
              </div>

              <div className="flex items-start gap-4 p-4 rounded-2xl bg-blue-500/5 border border-blue-500/10 group hover:bg-blue-500/10 transition-colors">
                <ShieldCheck className="h-6 w-6 text-blue-400 shrink-0 mt-0.5" />
                <div>
                  <p className="text-[10px] font-black text-blue-400 uppercase tracking-widest mb-0.5">
                    Next Step
                  </p>
                  <p className="text-xs font-bold text-slate-300">
                    A judge specialised in your case category has been
                    automatically assigned. You will receive an SMS and
                    notification once the first hearing is scheduled.
                  </p>
                </div>
              </div>
            </div>
          </div>

          <div className="flex flex-col gap-4">
            <Button
              onClick={() => (window.location.href = targetPath)}
              className="h-14 rounded-2xl font-black font-display text-base tracking-tight text-slate-950 bg-emerald-500 hover:bg-emerald-400 shadow-xl shadow-emerald-500/30 transition-all active:scale-95 flex items-center justify-center gap-3 group"
            >
              View My Case
              <ArrowRight className="h-5 w-5 group-hover:translate-x-1 transition-transform" />
            </Button>

            <div className="flex items-center justify-center gap-3">
              <div className="h-1 w-12 bg-slate-800 rounded-full overflow-hidden">
                <div
                  className="h-full bg-emerald-500 transition-all duration-1000 ease-linear"
                  style={{ width: `${(countdown / 8) * 100}%` }}
                />
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
    <Suspense
      fallback={
        <div className="flex items-center justify-center min-h-[70vh]">
          <Loader2 className="h-12 w-12 animate-spin text-primary" />
        </div>
      }
    >
      <PaymentSuccessContent />
    </Suspense>
  );
}
