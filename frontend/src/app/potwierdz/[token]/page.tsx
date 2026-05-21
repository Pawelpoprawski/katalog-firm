"use client";

import { useEffect, useState } from "react";
import Link from "next/link";

export default function ConfirmByTokenPage({ params }: { params: { token: string } }) {
    const [state, setState] = useState<"loading" | "success" | "error">("loading");
    const [message, setMessage] = useState<string>("Potwierdzamy Waszą usługę...");
    const [companyName, setCompanyName] = useState<string>("");

    useEffect(() => {
        const apiUrl = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";
        fetch(`${apiUrl}/companies/confirm-token`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ token: params.token }),
        })
            .then(async (res) => {
                const data = await res.json();
                if (res.ok) {
                    setState("success");
                    setMessage(data.message || "Aktywność potwierdzona.");
                    setCompanyName(data.company_name || "");
                } else {
                    setState("error");
                    setMessage(data.detail || "Nie udało się potwierdzić. Link może być nieprawidłowy.");
                }
            })
            .catch(() => {
                setState("error");
                setMessage("Nie można połączyć się z serwerem. Spróbuj ponownie za chwilę.");
            });
    }, [params.token]);

    return (
        <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 py-16 px-4 flex items-center justify-center">
            <div className="max-w-xl w-full">
                <div className="bg-white rounded-2xl shadow-xl p-8 md:p-12 text-center">
                    {state === "loading" && (
                        <>
                            <div className="w-16 h-16 mx-auto mb-6 rounded-full border-4 border-slate-200 border-t-primary animate-spin"></div>
                            <h1 className="text-2xl font-bold text-slate-900 mb-2">Potwierdzamy...</h1>
                            <p className="text-slate-600">{message}</p>
                        </>
                    )}

                    {state === "success" && (
                        <>
                            <div className="w-16 h-16 mx-auto mb-6 rounded-full bg-green-100 flex items-center justify-center">
                                <svg className="w-10 h-10 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                                </svg>
                            </div>
                            <h1 className="text-3xl font-bold text-slate-900 mb-4">Dziękujemy!</h1>
                            <div className="w-20 h-1 bg-primary mx-auto rounded-full mb-6"></div>
                            {companyName && (
                                <p className="text-slate-700 text-lg mb-2">
                                    Usługa <strong>{companyName}</strong>
                                </p>
                            )}
                            <p className="text-slate-600 leading-relaxed mb-8">{message}</p>
                            <Link
                                href="/"
                                className="inline-block px-6 py-3 rounded-xl bg-primary text-white font-bold hover:bg-primary-dark transition-all"
                            >
                                Wróć na stronę główną
                            </Link>
                        </>
                    )}

                    {state === "error" && (
                        <>
                            <div className="w-16 h-16 mx-auto mb-6 rounded-full bg-red-100 flex items-center justify-center">
                                <svg className="w-10 h-10 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M6 18L18 6M6 6l12 12" />
                                </svg>
                            </div>
                            <h1 className="text-2xl font-bold text-slate-900 mb-4">Coś poszło nie tak</h1>
                            <p className="text-slate-600 leading-relaxed mb-2">{message}</p>
                            <p className="text-sm text-slate-500 mb-8">
                                Skontaktuj się:{" "}
                                <a href="mailto:kontakt@polacyszwajcaria.com" className="underline font-semibold">
                                    kontakt@polacyszwajcaria.com
                                </a>
                            </p>
                            <Link
                                href="/potwierdz"
                                className="inline-block px-6 py-3 rounded-xl border border-slate-300 text-slate-700 font-bold hover:bg-slate-50 transition-all"
                            >
                                Potwierdź przez email
                            </Link>
                        </>
                    )}
                </div>
            </div>
        </div>
    );
}
