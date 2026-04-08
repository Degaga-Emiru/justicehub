"use client";

import React, { createContext, useContext, useState, useEffect } from "react";
import { translations } from "@/lib/translations";

const LanguageContext = createContext({
    language: "en",
    setLanguage: () => { },
    t: (key) => key,
});

export function LanguageProvider({ children }) {
    // Try to load from localStorage, default to 'en'
    const [language, setLanguage] = useState("en");

    // Load saved preference on mount
    useEffect(() => {
        const saved = localStorage.getItem("justicehub-lang");
        if (saved && (saved === "en" || saved === "am")) {
            setLanguage(saved);
        }
    }, []);

    // Update localStorage when language changes
    useEffect(() => {
        localStorage.setItem("justicehub-lang", language);
        // Update HTML lang attribute for accessibility
        document.documentElement.lang = language;
    }, [language]);

    const t = (key) => {
        // If key has dots (e.g., 'features.title'), split it? 
        // For now, our dictionary is flat-ish, but let's handle simple keys
        // If key not found, fallback to key itself
        return translations[language][key] || key;
    };

    return (
        <LanguageContext.Provider value={{ language, setLanguage, t }}>
            {children}
        </LanguageContext.Provider>
    );
}

export const useLanguage = () => useContext(LanguageContext);
