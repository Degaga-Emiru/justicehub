import { DashboardLayout } from "@/components/layout/dashboard-layout";
import { Chatbot } from "@/components/client/chatbot";

export default function DefendantLayout({ children }) {
    return (
        <DashboardLayout>
            {children}
            <Chatbot />
        </DashboardLayout>
    );
}
