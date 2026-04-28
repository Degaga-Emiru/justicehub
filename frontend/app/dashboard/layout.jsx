import { Chatbot } from "@/components/client/chatbot";

export default function DashboardRootLayout({ children }) {
 return (
 <>
 {children}
 <Chatbot />
 </>
 );
}
