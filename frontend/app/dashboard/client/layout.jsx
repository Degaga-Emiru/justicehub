import { DashboardLayout } from "@/components/layout/dashboard-layout";

export default function ClientLayout({ children }) {
 return (
 <DashboardLayout>
 {children}
 </DashboardLayout>
 );
}
