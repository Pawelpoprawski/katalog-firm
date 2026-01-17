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
        <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 py-16 px-4">
            <div className="max-w-2xl mx-auto">
                <div className="bg-white rounded-2xl shadow-xl p-8 md:p-12">
                    {/* Header */}
                    <div className="text-center mb-8">
                        <h1 className="text-3xl md:text-4xl font-bold text-slate-900 mb-4">
                            Potwierdź Aktywność Ogłoszenia
                        </h1>
                        <div className="w-20 h-1 bg-primary mx-auto rounded-full mb-6"></div>
                    </div>

                    {/* Description */}
                    <div className="bg-slate-50 rounded-xl p-6 mb-8 border border-slate-200">
                        <p className="text-slate-700 leading-relaxed text-center">
                            Wprowadź email firmowy aby potwierdzić, że nadal potrzebujesz u nas ogłoszenia.
                            <br />
                            <br />
                            <strong>Ogłoszenia niepotwierdzone zostaną usunięte.</strong>
                            <br />
                            <br />
                            Robimy to po to, aby usuwać nieaktywne usługi co jakiś czas. Dziękujemy!
                        </p>
                    </div>

                    {/* Form */}
                    <form onSubmit={handleSubmit} className="space-y-6">
                        <div>
                            <label htmlFor="email" className="block text-sm font-bold text-slate-700 mb-2">
                                Email Firmowy *
                            </label>
                            <input
                                type="email"
                                id="email"
                                value={email}
                                onChange={(e) => setEmail(e.target.value)}
                                required
                                placeholder="firma@example.com"
                                className="w-full px-4 py-3 rounded-xl border border-slate-300 focus:border-primary focus:ring-2 focus:ring-primary/20 outline-none transition-all text-base"
                            />
                        </div>

                        {/* Message */}
                        {message && (
                            <div
                                className={`p-4 rounded-xl border ${message.type === "success"
                                        ? "bg-green-50 border-green-200 text-green-800"
                                        : "bg-red-50 border-red-200 text-red-800"
                                    }`}
                            >
                                <p className="text-sm font-medium text-center">{message.text}</p>
                                {message.type === "error" && message.text.includes("Nie ma takiego") && (
                                    <p className="text-xs mt-2 text-center">
                                        Skontaktuj się:{" "}
                                        <a href="mailto:kontakt@polacyszwajcaria.com" className="underline font-semibold">
                                            kontakt@polacyszwajcaria.com
                                        </a>
                                    </p>
                                )}
                            </div>
                        )}

                        {/* Submit Button */}
                        <button
                            type="submit"
                            disabled={loading || !email}
                            className="w-full bg-primary hover:bg-primary-light text-white font-bold py-4 px-6 rounded-xl transition-colors disabled:opacity-50 disabled:cursor-not-allowed shadow-lg hover:shadow-xl"
                        >
                            {loading ? "Potwierdzanie..." : "Potwierdź Aktywność"}
                        </button>
                    </form>

                    {/* Back Link */}
                    <div className="mt-8 text-center">
                        <a href="/" className="text-sm text-slate-600 hover:text-primary transition-colors">
                            ← Powrót do strony głównej
                        </a>
                    </div>
                </div>
            </div>
        </div>
    );
}
