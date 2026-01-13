"use client";

import { useState, useEffect } from "react";

export function useFavorites() {
    const [favorites, setFavorites] = useState<number[]>([]);
    const [isLoaded, setIsLoaded] = useState(false);

    useEffect(() => {
        if (typeof window === "undefined") return;
        const stored = window.localStorage.getItem("favorites");
        if (stored) {
            try {
                setFavorites(JSON.parse(stored));
            } catch {
                setFavorites([]);
            }
        }
        setIsLoaded(true);
    }, []);

    const toggleFavorite = (id: number) => {
        setFavorites((prev) => {
            const exists = prev.includes(id);
            const next = exists ? prev.filter((x) => x !== id) : [...prev, id];
            if (typeof window !== "undefined") {
                window.localStorage.setItem("favorites", JSON.stringify(next));
            }
            return next;
        });
    };

    const isFavorite = (id: number) => favorites.includes(id);

    return { favorites, toggleFavorite, isFavorite, isLoaded };
}
