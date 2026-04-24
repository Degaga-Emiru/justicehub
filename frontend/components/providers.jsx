"use client";

import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { useAuthStore } from "@/store/auth-store";
import { useEffect, useState } from "react";
import { Toaster } from "sonner";

export function Providers({ children }) {
 const { initAuth } = useAuthStore();
 const [queryClient] = useState(
 () =>
 new QueryClient({
 defaultOptions: {
 queries: {
 staleTime: 60 * 1000,
 refetchOnWindowFocus: false,
 },
 },
 })
 );

 useEffect(() => {
 initAuth();
 }, [initAuth]);

 return (
 <QueryClientProvider client={queryClient}>
 {children}
 <Toaster />
 </QueryClientProvider>
 );
}
