"use client";

import { useState, useRef, useEffect } from "react";
import { MessageSquare, X, Send, Bot, User } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { chatMessages } from "@/lib/mock-data";
import { cn } from "@/lib/utils";

export function Chatbot() {
 const [isOpen, setIsOpen] = useState(false);
 const [messages, setMessages] = useState(chatMessages);
 const [inputValue, setInputValue] = useState("");
 const scrollRef = useRef(null);

 useEffect(() => {
 if (scrollRef.current) {
 scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
 }
 }, [messages, isOpen]);

 const handleSend = () => {
 if (!inputValue.trim()) return;

 const newUserMsg = {
 id: messages.length + 1,
 sender: "user",
 text: inputValue,
 time: "Just now",
 };
 setMessages((prev) => [...prev, newUserMsg]);
 setInputValue("");

 // Simulate bot response
 setTimeout(() => {
 const botResponse = {
 id: messages.length + 2,
 sender: "bot",
 text: "I understand you're asking about that. Could you please provide your case number so I can look it up?",
 time: "Just now",
 };
 setMessages((prev) => [...prev, botResponse]);
 }, 1000);
 };

 return (
 <>
 <Button
 className="fixed bottom-6 right-6 h-14 w-14 rounded-full shadow-xl z-50 transition-transform hover:scale-105"
 size="icon"
 onClick={() => setIsOpen(!isOpen)}
 >
 {isOpen ? <X className="h-6 w-6" /> : <MessageSquare className="h-6 w-6" />}
 </Button>

 {isOpen && (
 <Card className="fixed bottom-24 right-6 w-80 sm:w-96 shadow-2xl z-50 animate-slide-in border-primary/20">
 <CardHeader className="bg-primary text-primary-foreground p-4 rounded-t-xl flex flex-row items-center justify-between space-y-0">
 <div className="flex items-center gap-2">
 <Bot className="h-5 w-5" />
 <CardTitle className="text-base">JusticeBot Assistant</CardTitle>
 </div>
 </CardHeader>
 <CardContent className="p-0 flex flex-col h-[400px]">
 <div className="flex-1 overflow-y-auto p-4 space-y-4" ref={scrollRef}>
 {messages.map((msg) => (
 <div
 key={msg.id}
 className={cn(
 "flex gap-2 max-w-[85%]",
 msg.sender === "user" ? "ml-auto flex-row-reverse" : ""
 )}
 >
 <div
 className={cn(
 "h-8 w-8 rounded-full flex items-center justify-center shrink-0",
 msg.sender === "user" ? "bg-primary text-primary-foreground" : "bg-muted"
 )}
 >
 {msg.sender === "user" ? <User className="h-4 w-4" /> : <Bot className="h-4 w-4" />}
 </div>
 <div
 className={cn(
 "rounded-lg p-3 text-sm",
 msg.sender === "user"
 ? "bg-primary text-primary-foreground rounded-tr-none"
 : "bg-muted text-foreground rounded-tl-none"
 )}
 >
 <p>{msg.text}</p>
 <span className="text-[10px] opacity-70 mt-1 block">{msg.time}</span>
 </div>
 </div>
 ))}
 </div>
 <div className="p-4 border-t bg-background rounded-b-xl">
 <form
 onSubmit={(e) => {
 e.preventDefault();
 handleSend();
 }}
 className="flex gap-2"
 >
 <Input
 placeholder="Ask a legal question..."
 value={inputValue}
 onChange={(e) => setInputValue(e.target.value)}
 className="flex-1"
 />
 <Button type="submit" size="icon" disabled={!inputValue.trim()}>
 <Send className="h-4 w-4" />
 </Button>
 </form>
 </div>
 </CardContent>
 </Card>
 )}
 </>
 );
}
