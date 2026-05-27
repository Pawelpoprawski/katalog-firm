"use client";

import { useState } from "react";

export default function ConfirmActivityPage() {
    const [email, setEmail] = useState("");
    const [loading, setLoading] = useState(false);
    const [message, setMessage] = useState<{ type: "success" | "error"; text: string } | null>(null);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);
        setMessage(null);

        try {
            const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000"}/companies/confirm`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ email }),
            });

            const data = await response.json();

            if (response.ok) {
                setMessage({ type: "success", text: data.message });
                setEmail("");
            } else {
                setMessage({ type: "error", text: data.detail || "Wystąpił błąd" });
            }
        } catch (error) {
            setMessage({ type: "error", text: "Nie można połączyć się z serwerem" });
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="min-h-screen bg-[#F5F6F8] py-12 px-4">
            <div className="max-w-2xl mx-auto">
                <div className="bg-white rounded-md border border-[#E0E3E8] p-8 md:p-12">
                    <div className="space-y-3 mb-8">
                        <span className="hays-red-line" />
                        <h1 className="font-display text-3xl md:text-4xl font-bold text-[#0D2240]">
                            Potwierdź aktywność ogłoszenia
                        </h1>
                    </div>

                    <div className="bg-[#F5F6F8] rounded-md border-l-4 border-[#E1002A] p-5 mb-8">
                        <p className="text-[#1A1A1A] leading-relaxed text-sm">
                            Wprowadź email firmowy, aby potwierdzić, że nadal potrzebujesz u nas ogłoszenia.
                        </p>
                        <p className="text-[#1A1A1A] leading-relaxed text-sm mt-3 font-semibold">
                            Ogłoszenia niepotwierdzone zostaną usunięte.
                        </p>
                        <p className="text-[#555] leading-relaxed text-sm mt-3">
                            Robimy to po to, aby usuwać nieaktywne wpisy co jakiś czas. Dziękujemy!
                        </p>
                    </div>

                    <form onSubmit={handleSubmit} className="space-y-5">
                        <div>
                            <label htmlFor="email" className="block text-xs font-bold text-[#0D2240] uppercase tracking-wider mb-1.5">
                                Email firmowy <span className="text-[#E1002A]">*</span>
                            </label>
                            <input
                                type="email"
                                id="email"
                                value={email}
                                onChange={(e) => setEmail(e.target.value)}
                                required
                                placeholder="firma@example.com"
                                className="w-full px-4 py-3 rounded border border-[#E0E3E8] focus:border-[#E1002A] focus:ring-2 focus:ring-[#E1002A]/10 outline-none transition-all text-sm"
                            />
                        </div>

                        {message && (
                            <div
                                className={`p-4 rounded border-l-4 ${
                                    message.type === "success"
                                        ? "bg-green-50 border-[#10b981] text-green-800"
                                        : "bg-[#FFF0F3] border-[#E1002A] text-[#B8001F]"
                                }`}
                            >
                                <p className="text-sm font-medium">{message.text}</p>
                                {message.type === "error" && message.text.includes("Nie ma takiego") && (
                                    <p className="text-xs mt-2">
                                        Skontaktuj się:{" "}
                                        <a href="mailto:kontakt@polacyszwajcaria.com" className="underline font-semibold">
                                            kontakt@polacyszwajcaria.com
                                        </a>
                                    </p>
                                )}
                            </div>
                        )}

                        <button
                            type="submit"
                            disabled={loading || !email}
                            className="w-full btn-hays disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                            {loading ? "Potwierdzanie..." : "Potwierdź aktywność"}
                        </button>
                    </form>

                    <div className="mt-8 pt-6 border-t border-[#E0E3E8] text-center">
                        <a href="/" className="text-sm text-[#555] hover:text-[#E1002A] transition-colors">
                            ← Powrót do strony głównej
                        </a>
                    </div>
                </div>
            </div>
        </div>
    );
}
