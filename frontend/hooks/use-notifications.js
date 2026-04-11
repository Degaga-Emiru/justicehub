"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { fetchNotifications } from "@/lib/api";

const getWsUrl = () => {
    // Determine the base WebSocket URL from the HTTP API URL
    const apiUrl = process.env.NEXT_PUBLIC_API_URL || "http://127.0.0.1:8000/api";
    // Convert http to ws, https to wss
    const wsBaseUrl = apiUrl.replace(/^http/, 'ws').replace(/\/api$/, '/ws');
    return wsBaseUrl;
};

const getApiUrl = () => process.env.NEXT_PUBLIC_API_URL || "http://127.0.0.1:8000/api";

export function useNotifications() {
    const [notifications, setNotifications] = useState([]);
    const [unreadCount, setUnreadCount] = useState(0);
    const [isConnected, setIsConnected] = useState(false);
    const wsRef = useRef(null);

    // Initial load
    const loadHistorical = useCallback(async () => {
        try {
            const data = await fetchNotifications();
            setNotifications(data);
            setUnreadCount(data.filter(n => !n.is_read).length);
        } catch (err) {
            console.error("Failed to load historical notifications", err);
        }
    }, []);

    useEffect(() => {
        loadHistorical();
        
        let targetInterval = null;
        
        // Connect to WebSocket
        const token = localStorage.getItem("access_token");
        if (token) {
            const connectWs = () => {
                const wsUrl = `${getWsUrl()}/notifications/?token=${token}`;
                const ws = new WebSocket(wsUrl);
                
                ws.onopen = () => {
                    setIsConnected(true);
                    
                    // Simple ping to keep alive
                    targetInterval = setInterval(() => {
                        if (ws.readyState === WebSocket.OPEN) {
                            ws.send(JSON.stringify({ action: "ping" }));
                        }
                    }, 30000);
                };
                
                ws.onmessage = (event) => {
                    try {
                        const data = JSON.parse(event.data);
                        if (data.type === 'notification') {
                            setNotifications(prev => [data.notification, ...prev]);
                            setUnreadCount(prev => prev + 1);
                        } else if (data.type === 'marked_read') {
                            setNotifications(prev => prev.map(n => 
                                n.id === data.notification_id ? { ...n, is_read: true } : n
                            ));
                            setUnreadCount(prev => Math.max(0, prev - 1));
                        }
                    } catch (e) {
                        console.error("WS msg parse error", e);
                    }
                };
                
                ws.onclose = () => {
                    setIsConnected(false);
                    clearInterval(targetInterval);
                    // Minimal exponential backoff could go here, for now it will just die or reconnect on page reload
                };
                
                wsRef.current = ws;
            };
            
            connectWs();
        }
        
        return () => {
            if (wsRef.current) wsRef.current.close();
            if (targetInterval) clearInterval(targetInterval);
        };
    }, [loadHistorical]);

    const markAsRead = async (notificationId) => {
        // Try WebSocket first
        if (wsRef.current && wsRef.current.readyState === WebSocket.OPEN) {
            wsRef.current.send(JSON.stringify({
                action: "mark_read",
                notification_id: notificationId
            }));
            // Optimistic update
            setNotifications(prev => prev.map(n => 
                n.id === notificationId ? { ...n, is_read: true } : n
            ));
            setUnreadCount(prev => Math.max(0, prev - 1));
        } else {
            // Fallback to HTTP POST
            try {
                const token = localStorage.getItem("access_token");
                const res = await fetch(`${getApiUrl()}/notifications/mark_read/`, {
                    method: "POST",
                    headers: {
                        "Content-Type": "application/json",
                        "Authorization": `Bearer ${token}`
                    },
                    body: JSON.stringify({ notification_ids: [notificationId] })
                });
                if (res.ok) {
                    setNotifications(prev => prev.map(n => 
                        n.id === notificationId ? { ...n, is_read: true } : n
                    ));
                    setUnreadCount(prev => Math.max(0, prev - 1));
                }
            } catch (err) {
                console.error("HTTP mark as read failed", err);
            }
        }
    };

    const markAllAsRead = async () => {
        try {
            const token = localStorage.getItem("access_token");
            const res = await fetch(`${getApiUrl()}/notifications/mark_read/`, {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                    "Authorization": `Bearer ${token}`
                },
                body: JSON.stringify({ mark_all: true })
            });
            if (res.ok) {
                setNotifications(prev => prev.map(n => ({ ...n, is_read: true })));
                setUnreadCount(0);
            }
        } catch (err) {
            console.error("HTTP mark all failed", err);
        }
    };

    return { notifications, unreadCount, markAsRead, markAllAsRead, isConnected };
}
