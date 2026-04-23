"use client";
import React, { useEffect, useRef, useState } from "react";
import Link from "next/link";
import Image from "next/image";
import { useParams, useRouter, useSearchParams } from "next/navigation";

const basePath = process.env.NEXT_PUBLIC_BASE_PATH || '';
const steps = ["Dane firmy", "Kontakt", "Zdjęcia", "Podsumowanie"];
const DESC_LIMIT = 10000; // Merged: description + offer
const NAME_LIMIT = 150;
const MAX_PHOTOS = 8;
const MAX_PHOTO_SIZE_MB = 5;

import { Category } from "@/types";

export default function EditCompanyPage() {
    const { token } = useParams<{ token: string }>();
    const router = useRouter();

    // Loading State
    const [loading, setLoading] = useState(true);
    const [loadError, setLoadError] = useState("");

    // Form State
    const [form, setForm] = useState({
        name: "",
        category: "",
        address: "",
        city: "",
        canton: "",
        postal_code: "",
        desc: "", // Merged: Firma & Usługi
        phone: "",
        email: "",
        website: "",
        facebook: "",
        instagram: ""
    });

    const [categories, setCategories] = useState<Category[]>([]);
    const [loadingCategories, setLoadingCategories] = useState(true);
    const [errors, setErrors] = useState<Record<string, string>>({});
    const [step, setStep] = useState(0);
    const [previews, setPreviews] = useState<string[]>([]);
    const [uploadError, setUploadError] = useState("");
    const [mainPhoto, setMainPhoto] = useState<string | null>(null);
    const [companyId, setCompanyId] = useState<number | null>(null);

    const fileInputRef = useRef<HTMLInputElement | null>(null);
    const mainPhotoInputRef = useRef<HTMLInputElement | null>(null);
    const addressInputRef = useRef<HTMLInputElement | null>(null);
    const [placesReady, setPlacesReady] = useState(false);

    const googleKey = process.env.NEXT_PUBLIC_GOOGLE_MAPS_KEY;
    const apiUrl = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";

    const [submitStatus, setSubmitStatus] = useState<"idle" | "loading" | "success" | "error">("idle");
    const [submitError, setSubmitError] = useState("");

    // Fetch Categories
    useEffect(() => {
        const fetchCategories = async () => {
            try {
                const res = await fetch(`${apiUrl}/categories/`);
                if (res.ok) {
                    const data = await res.json();
                    setCategories(data);
                }
            } catch (e) {
                console.error("Failed to load categories", e);
            } finally {
                setLoadingCategories(false);
            }
        };
        fetchCategories();
    }, [apiUrl]);

    // Google Maps
    useEffect(() => {
        if (!googleKey || typeof window === "undefined") return;
        if (window.google?.maps?.places) {
            setPlacesReady(true);
            return;
        }
        const script = document.createElement("script");
        script.src = `https://maps.googleapis.com/maps/api/js?key=${googleKey}&libraries=places`;
        script.async = true;
        script.onload = () => setPlacesReady(true);
        document.head.appendChild(script);
    }, [googleKey]);

    useEffect(() => {
        if (!placesReady || !addressInputRef.current || !window.google?.maps?.places) return;
        const ac = new window.google.maps.places.Autocomplete(addressInputRef.current as HTMLInputElement, {
            componentRestrictions: { country: "ch" },
            fields: ["formatted_address", "address_components", "geometry"]
        });
        ac.addListener("place_changed", () => {
            const place = ac.getPlace() as any;
            const addr = place.formatted_address || "";
            let city = "";
            let canton = "";
            let postal_code = "";
            if (place.address_components) {
                for (const component of place.address_components) {
                    const types = component.types;
                    if (types.includes("postal_code")) postal_code = component.long_name;
                    if (types.includes("locality")) city = component.long_name;
                    else if (types.includes("administrative_area_level_1")) canton = component.short_name;
                }
            }
            setForm((prev) => ({ ...prev, address: addr, city, canton, postal_code }));
            setErrors((prev) => {
                const { address, ...rest } = prev;
                return rest;
            });
        });
    }, [placesReady]); // Re-attach when placesReady

    // Auto-load company data on mount
    useEffect(() => {
        const loadCompanyData = async () => {
            if (!token || categories.length === 0) return;

            setLoading(true);
            setLoadError("");
            try {
                const res = await fetch(`${apiUrl}/companies/by-token/${token}`);
                if (!res.ok) throw new Error("Nieprawidłowy lub wygasły link edycji.");
                const c = await res.json();

                setCompanyId(c.id);

                // Find category name by ID
                const catName = categories.find(cat => cat.id === c.category_id)?.name || "";

                setForm({
                    name: c.name || "",
                    category: catName,
                    address: c.address || "",
                    city: c.city || "",
                    canton: c.canton || "",
                    postal_code: c.postal_code || "",
                    desc: c.description || "",
                    phone: c.phone || "",
                    email: c.email || "",
                    website: c.website || "",
                    facebook: c.facebook || "",
                    instagram: c.instagram || ""
                });

                if (c.img) setMainPhoto(c.img);
                if (Array.isArray(c.photos)) setPreviews(c.photos);

            } catch (err: any) {
                setLoadError(err.message || "Nie udało się załadować danych firmy.");
            } finally {
                setLoading(false);
            }
        };
        loadCompanyData();
    }, [token, apiUrl, categories]);

    const goNext = () => setStep((s) => Math.min(s + 1, steps.length - 1));
    const goPrev = () => setStep((s) => Math.max(s - 1, 0));

    const handleChange =
        (key: keyof typeof form) =>
            (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
                const value = e.target.value;
                setForm((prev) => ({ ...prev, [key]: value }));

                // Real-time validation
                const newErrors: Record<string, string> = {};
                if (key === "name" && !value.trim()) {
                    newErrors.name = "Podaj nazwę firmy.";
                } else if (key === "category" && !value.trim()) {
                    newErrors.category = "Wybierz kategorię.";
                } else if (key === "address" && !value.trim()) {
                    newErrors.address = "Podaj adres/miasto.";
                } else if (key === "desc" && value.trim().length > 0 && value.trim().length < 20) {
                    newErrors.desc = `Opis min. 20 znaków (obecnie ${value.trim().length}).`;
                } else if (key === "email" && value.trim() && !validateEmail(value)) {
                    newErrors.email = "Nieprawidłowy format e-mail.";
                } else if (key === "phone" && value.trim() && !validatePhone(value)) {
                    newErrors.phone = "Nieprawidłowy format telefonu. Użyj formatu: +41, +48 lub 0";
                } else if (key === "website" && value.trim() && !value.startsWith("http") && !value.startsWith("www.")) {
                    newErrors.website = "Podaj pełny link (https://... lub www....).";
                } else if (key === "facebook" && value.trim() && !value.startsWith("http")) {
                    newErrors.facebook = "Podaj pełny link (https://...).";
                } else if (key === "instagram" && value.trim() && !value.startsWith("http")) {
                    newErrors.instagram = "Podaj pełny link (https://...).";
                }

                setErrors((prev) => {
                    const updated = { ...prev };
                    if (Object.keys(newErrors).length > 0) {
                        Object.assign(updated, newErrors);
                    } else {
                        delete updated[key];
                    }
                    return updated;
                });
            };

    // Validation helpers
    const validateEmail = (email: string): boolean => {
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        return emailRegex.test(email);
    };

    const validatePhone = (phone: string): boolean => {
        // Swiss phone format: +41 or 0 (local)
        // Polish phone format: +48
        const phoneRegex = /^(\+41|0|\+48)[1-9]\d{1,12}$/;
        const cleaned = phone.replace(/[\s-]/g, "");
        return phoneRegex.test(cleaned);
    };

    const validateStep = (current: number) => {
        const newErrors: Record<string, string> = {};
        if (current === 0) {
            // Step 0: "Dane firmy"
            if (!form.name.trim()) newErrors.name = "Podaj nazwę firmy.";
            if (!form.category.trim()) newErrors.category = "Wybierz kategorię.";
            if (!form.address.trim()) newErrors.address = "Podaj adres/miasto.";
        }
        if (current === 1) {
            // Step 1: "Kontakt" - validate email/phone
            if (!form.email.trim()) {
                newErrors.email = "Adres e-mail jest wymagany.";
            } else if (!validateEmail(form.email)) {
                newErrors.email = "Nieprawidłowy format e-mail.";
            }
            if (form.phone.trim() && !validatePhone(form.phone)) {
                newErrors.phone = "Nieprawidłowy format telefonu. Użyj formatu: +41 lub +48";
            }
        }
        if (current === 2) {
            // Step 2: Validate description
            if (form.desc.trim().length < 20) newErrors.desc = "Opis min. 20 znaków.";
        }
        if (current === 3) {
            // Step 3: "Zdjęcia" - validate main photo
            if (!mainPhoto) {
                setUploadError("Zdjęcie główne jest wymagane.");
                return { mainPhoto: "Wymagane" };
            } else {
                setUploadError("");
            }
        }
        return newErrors;
    };

    const handleNext = () => {
        const errs = validateStep(step);
        if (Object.keys(errs).length > 0) {
            setErrors(errs);
            return;
        }
        goNext();
    };

    const inputClass = (key: string) =>
        `w-full rounded-2xl border px-4 py-4 text-base font-medium transition-all focus:ring-4 focus:ring-primary/10 outline-none ${errors[key]
            ? "border-red-400 bg-red-50 dark:bg-red-900/10 focus:border-red-500"
            : "border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 focus:border-primary dark:text-white"
        }`;

    const handleMainPhotoChange = (files: FileList | null) => {
        if (!files || files.length === 0) return;
        const file = files[0];
        if (!file.type.startsWith("image/")) {
            setUploadError("Zdjęcie główne musi być obrazem (JPG/PNG/WebP).");
            return;
        }
        if (file.size > MAX_PHOTO_SIZE_MB * 1024 * 1024) {
            setUploadError(`Zdjęcie główne przekracza ${MAX_PHOTO_SIZE_MB}MB.`);
            return;
        }
        setUploadError("");
        const url = URL.createObjectURL(file);
        setMainPhoto(url);
    };

    const handleFiles = (files: FileList | null) => {
        if (!files || files.length === 0) return;
        const MAX_SIZE = MAX_PHOTO_SIZE_MB * 1024 * 1024;
        const all = Array.from(files);
        const rejectedType = all.filter((f) => !f.type.startsWith("image/"));
        const rejectedSize = all.filter((f) => f.type.startsWith("image/") && f.size > MAX_SIZE);
        const accepted = all.filter((f) => f.type.startsWith("image/") && f.size <= MAX_SIZE);

        const reasons: string[] = [];
        if (rejectedType.length) reasons.push(`${rejectedType.length} plik(ów) z niedozwolonym formatem (wymagane JPG/PNG/WebP)`);
        if (rejectedSize.length) reasons.push(`${rejectedSize.length} zdjęcie(a) przekracza ${MAX_PHOTO_SIZE_MB}MB`);

        const willFit = Math.max(0, MAX_PHOTOS - previews.length);
        const droppedOverLimit = Math.max(0, accepted.length - willFit);
        if (droppedOverLimit > 0) reasons.push(`pominięto ${droppedOverLimit} – limit ${MAX_PHOTOS} zdjęć`);

        setUploadError(reasons.length ? reasons.join(". ") + "." : "");

        const urls = accepted.slice(0, willFit).map((f) => URL.createObjectURL(f));
        setPreviews((prev) => [...prev, ...urls]);
        if (!mainPhoto && urls.length > 0) setMainPhoto(urls[0]);
    };

    const onDrop = (e: React.DragEvent<HTMLDivElement>) => {
        e.preventDefault();
        handleFiles(e.dataTransfer.files);
    };

    const convertBlobUrlToBase64 = async (url: string | null): Promise<string | null> => {
        if (!url) return null;
        if (!url.startsWith("blob:")) return url;
        try {
            const response = await fetch(url);
            const blob = await response.blob();
            const reader = new FileReader();
            const result = await new Promise<string>((resolve, reject) => {
                reader.onloadend = () => resolve(reader.result as string);
                reader.onerror = reject;
                reader.readAsDataURL(blob);
            });
            return result;
        } catch (e) {
            console.error("Failed to convert image:", e);
            return null;
        }
    };

    const updateCompany = async () => {
        setSubmitStatus("loading");
        try {
            const imgUrl = await convertBlobUrlToBase64(mainPhoto);

            // Filter out mainPhoto from previews if it exists there to avoid duplication in 'photos' field
            // But also handle case where mainPhoto is NOT in previews (e.g. freshly uploaded main photo)
            // The logic: mainPhoto goes to 'img', everything else in previews goes to 'photos'

            const extraUrls = previews.filter((url) => url !== mainPhoto);
            const photos: string[] = [];

            for (const url of extraUrls) {
                const converted = await convertBlobUrlToBase64(url);
                if (converted) photos.push(converted);
            }

            const selectedCategory = categories.find((c) => c.name === form.category);
            const category_id = selectedCategory?.id || null;

            const body = {
                payload: {
                    name: form.name,
                    category_id,
                    description: form.desc,
                    phone: form.phone,
                    email: form.email,
                    website: form.website ? (form.website.startsWith("www.") ? `https://${form.website}` : form.website) : null,
                    facebook: form.facebook || null,
                    instagram: form.instagram || null,
                    address: form.address,
                    city: form.city || null,
                    canton: form.canton || null,
                    postal_code: form.postal_code || null,
                    img: imgUrl || null,
                    photos: photos.length ? photos : null,
                },
                edit_token: token
            };

            const res = await fetch(`${apiUrl}/companies/${companyId}`, {
                method: "PUT",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(body)
            });

            if (!res.ok) {
                const text = await res.text();
                throw new Error(`(${res.status}) ${text || "Błąd aktualizacji firmy"}`);
            }
            setSubmitStatus("success");
            // Redirect to company page or home
            router.push("/");
        } catch (err: any) {
            setSubmitStatus("error");
            setSubmitError(err.message || "Nie udało się zaktualizować firmy.");
        }
    };

    // --- RENDER ---

    if (loading) {
        return (
            <div className="min-h-screen flex items-center justify-center p-4">
                <div className="w-full max-w-md bg-white dark:bg-slate-900 rounded-3xl p-12 border border-slate-200 dark:border-slate-800 shadow-2xl space-y-6 text-center animate-fade-in">
                    <div className="mx-auto w-16 h-16 relative">
                        <svg className="animate-spin h-16 w-16 text-primary" fill="none" viewBox="0 0 24 24">
                            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                        </svg>
                    </div>
                    <h1 className="text-2xl font-extrabold text-slate-900 dark:text-white">Ładowanie danych...</h1>
                    <p className="text-sm text-slate-500">Pobieranie informacji o firmie</p>
                </div>
            </div>
        );
    }

    if (loadError) {
        return (
            <div className="min-h-screen flex items-center justify-center p-4">
                <div className="w-full max-w-md bg-white dark:bg-slate-900 rounded-3xl p-8 border border-slate-200 dark:border-slate-800 shadow-2xl space-y-8 animate-fade-in">
                    <div className="text-center space-y-4">
                        <div className="mx-auto w-16 h-16 bg-red-50 dark:bg-red-900/20 rounded-2xl flex items-center justify-center text-red-500 mb-4">
                            <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" strokeWidth={2} /></svg>
                        </div>
                        <h1 className="text-2xl font-extrabold text-slate-900 dark:text-white">Błąd ładowania</h1>
                        <p className="text-sm text-red-500">{loadError}</p>
                    </div>
                    <div className="text-center">
                        <Link href="/" className="inline-block px-8 py-3 bg-primary text-white font-bold rounded-xl hover:bg-primary-dark transition-all">Wróć na stronę główną</Link>
                    </div>
                </div>
            </div>
        );
    }

    if (submitStatus === "success") {
        return (
            <div className="mx-auto max-w-2xl px-4 py-20 text-center space-y-8 animate-fade-in">
                <div className="relative mx-auto w-32 h-32 flex items-center justify-center rounded-4xl bg-green-50 dark:bg-green-900/20 text-green-600 shadow-inner">
                    <svg className="w-16 h-16 animate-scale-in" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                    </svg>
                </div>
                <div className="space-y-4">
                    <h1 className="text-4xl font-extrabold text-slate-900 dark:text-white">Zapisano zmiany!</h1>
                    <p className="text-lg text-slate-600 dark:text-slate-400">Ogłoszenie zostało pomyślnie zaktualizowane.</p>
                </div>
                <div className="flex justify-center gap-4 pt-4">
                    <Link href={`/firma/${companyId}`} className="px-8 py-3 bg-primary text-white font-bold rounded-xl hover:bg-primary-dark transition-all">Zobacz ogłoszenie</Link>
                    <Link href="/" className="px-8 py-3 bg-slate-100 text-slate-600 font-bold rounded-xl hover:bg-slate-200 transition-all">Strona główna</Link>
                </div>
            </div>
        );
    }

    // REUSING UI FROM ADD PAGE
    return (
        <div className="mx-auto max-w-4xl px-4 py-12 space-y-10 sm:px-6">
            <nav className="flex items-center gap-3 text-sm font-medium animate-fade-in text-slate-500">
                <Link href="/" className="hover:text-primary transition-colors">Start</Link>
                <svg className="w-4 h-4 text-slate-300" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path d="M9 5l7 7-7 7" strokeWidth={2.5} /></svg>
                <span className="text-slate-900 dark:text-white">Edycja danych</span>
            </nav>

            <div className="relative overflow-hidden rounded-4xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-2xl transition-all duration-500">
                <div className="relative p-8 md:p-12 space-y-10">
                    <div className="flex flex-col gap-6 md:flex-row md:items-end md:justify-between">
                        <div className="space-y-2">
                            <span className="inline-block px-3 py-1 rounded-full bg-primary/10 text-primary text-[10px] font-bold uppercase tracking-wider">
                                Tryb Edycji
                            </span>
                            <h1 className="text-3xl font-extrabold text-slate-900 dark:text-white sm:text-4xl">Edytuj swoją firmę</h1>
                            <p className="text-slate-600 dark:text-slate-400 text-lg">
                                Zaktualizuj dane, aby klienci mieli zawsze świeże informacje.
                            </p>
                        </div>
                        <Link
                            href="/"
                            className="group inline-flex items-center gap-2 text-sm font-bold text-slate-500 hover:text-primary transition-all"
                        >
                            <svg className="w-5 h-5 transition-transform group-hover:-translate-x-1" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path d="M15 19l-7-7 7-7" strokeWidth={2.5} strokeLinecap="round" strokeLinejoin="round" /></svg>
                            Anuluj
                        </Link>
                    </div>

                    <div className="space-y-6">
                        <div className="flex flex-wrap items-center justify-between gap-4">
                            <div className="flex flex-wrap gap-2">
                                {steps.map((s, i) => (
                                    <button
                                        key={s}
                                        type="button"
                                        onClick={() => i < step && setStep(i)}
                                        className={`h-10 px-5 rounded-xl text-xs font-bold uppercase tracking-wider transition-all duration-300 ${i === step
                                            ? "bg-primary text-white shadow-lg shadow-primary/25 scale-105"
                                            : i < step
                                                ? "bg-green-50 dark:bg-green-900/20 text-green-600 cursor-pointer hover:bg-green-100"
                                                : "bg-slate-50 dark:bg-slate-800 text-slate-400 cursor-not-allowed"
                                            }`}
                                        disabled={i > step}
                                    >
                                        <span className="mr-2 opacity-50">{i + 1}.</span> {s}
                                    </button>
                                ))}
                            </div>
                        </div>

                        <div className="h-3 w-full rounded-full bg-slate-100 dark:bg-slate-800 p-0.5 overflow-hidden">
                            <div
                                className="h-full bg-gradient-to-r from-primary to-primary-light rounded-full shadow-sm transition-all duration-700 ease-out"
                                style={{ width: `${((step + 1) / steps.length) * 100}%` }}
                            />
                        </div>
                    </div>

                    <div className="animate-slide-up">
                        <form className="space-y-10">
                            {step === 0 && (
                                <div className="space-y-8 animate-fade-in">
                                    <div className="grid gap-8 md:grid-cols-2">
                                        <div className="space-y-3">
                                            <label className="text-sm font-bold text-slate-700 dark:text-slate-300 flex items-center gap-2">
                                                Nazwa firmy <span className="text-primary text-lg leading-none">*</span>
                                            </label>
                                            <input
                                                className={inputClass("name")}
                                                placeholder="np. Pol-Bud CH"
                                                value={form.name}
                                                onChange={handleChange("name")}
                                                maxLength={NAME_LIMIT}
                                                required
                                            />
                                            <div className="flex justify-end text-[10px] font-bold uppercase tracking-widest text-slate-400">
                                                <span className={form.name.length >= NAME_LIMIT ? "text-primary" : ""}>{form.name.length} / {NAME_LIMIT}</span>
                                            </div>
                                            {errors.name && <p className="text-xs font-bold text-red-500 animate-shake">{errors.name}</p>}
                                        </div>

                                        <div className="space-y-3">
                                            <label className="text-sm font-bold text-slate-700 dark:text-slate-300 flex items-center gap-2">
                                                Branża / Kategoria <span className="text-primary text-lg leading-none">*</span>
                                            </label>
                                            <div className="relative group">
                                                <select
                                                    className={`${inputClass("category")} appearance-none`}
                                                    value={form.category}
                                                    onChange={handleChange("category")}
                                                    disabled={loadingCategories}
                                                    required
                                                >
                                                    <option value="">Wybierz kategorię...</option>
                                                    {categories.map((cat) => (
                                                        <option key={cat.id} value={cat.name}>
                                                            {cat.name}
                                                        </option>
                                                    ))}
                                                </select>
                                                <div className="absolute inset-y-0 right-4 flex items-center pointer-events-none text-slate-400 group-hover:text-primary transition-colors">
                                                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path d="M19 9l-7 7-7-7" strokeWidth={2.5} strokeLinecap="round" strokeLinejoin="round" /></svg>
                                                </div>
                                            </div>
                                            {errors.category && <p className="text-xs font-bold text-red-500 animate-shake">{errors.category}</p>}
                                        </div>
                                    </div>

                                    <div className="space-y-3">
                                        <label className="text-sm font-bold text-slate-700 dark:text-slate-300 flex items-center gap-2">
                                            Dokładny adres w Szwajcarii <span className="text-primary text-lg leading-none">*</span>
                                        </label>
                                        <div className="relative">
                                            <input
                                                ref={addressInputRef}
                                                className={inputClass("address")}
                                                placeholder="np. Bahnhofstrasse 1, Zürich"
                                                value={form.address}
                                                onChange={handleChange("address")}
                                                autoComplete="off"
                                                required
                                            />
                                        </div>
                                        {errors.address && <p className="text-xs font-bold text-red-500 animate-shake">{errors.address}</p>}
                                    </div>

                                    <div className="space-y-3">
                                        <label className="text-sm font-bold text-slate-700 dark:text-slate-300">
                                            Firma & Usługi <span className="text-primary text-lg leading-none">*</span>
                                        </label>
                                        <textarea
                                            value={form.desc}
                                            onChange={handleChange("desc")}
                                            maxLength={DESC_LIMIT}
                                            className={`${inputClass("desc")} min-h-[200px] resize-none`}
                                            placeholder="Opisz czym zajmuje się Twoja firma i jakie usługi oferujesz. Możesz wypunktować najważniejsze usługi:&#10;&#10;- Wykończenia wnętrz&#10;- Malowanie i tapetowanie&#10;- Instalacje elektryczne"
                                            required
                                        />
                                        <div className="flex justify-between text-[10px] font-bold uppercase tracking-widest text-slate-400">
                                            <span>Minimum 20 znaków, maksimum 10,000</span>
                                            <span className={form.desc.length >= DESC_LIMIT ? "text-primary" : ""}>
                                                {form.desc.length} / {DESC_LIMIT}
                                            </span>
                                        </div>
                                        {errors.desc && <p className="text-xs font-bold text-red-500 animate-shake">{errors.desc}</p>}
                                    </div>
                                </div>
                            )}

                            {step === 1 && (
                                <div className="space-y-8 animate-fade-in">
                                    <div className="grid gap-8 md:grid-cols-2">
                                        <div className="space-y-3">
                                            <label className="text-sm font-bold text-slate-700 dark:text-slate-300">
                                                Telefon / WhatsApp
                                            </label>
                                            <input
                                                type="tel"
                                                className={inputClass("phone")}
                                                placeholder="+41 79 123 45 67"
                                                value={form.phone}
                                                onChange={handleChange("phone")}
                                            />
                                        </div>
                                        <div className="space-y-3">
                                            <label className="text-sm font-bold text-slate-700 dark:text-slate-300">
                                                Adres E-mail <span className="text-primary text-lg leading-none">*</span>
                                            </label>
                                            <input
                                                type="email"
                                                className={inputClass("email")}
                                                placeholder="kontakt@twoja-firma.ch"
                                                value={form.email}
                                                onChange={handleChange("email")}
                                            />
                                        </div>
                                    </div>
                                    {(errors.phone || errors.email) && (
                                        <p className="text-xs font-bold text-red-500 bg-red-50 dark:bg-red-900/10 p-3 rounded-xl border border-red-100 dark:border-red-900/20">
                                            {errors.phone || errors.email}
                                        </p>
                                    )}

                                    <div className="grid gap-8 md:grid-cols-2">
                                        <div className="space-y-3">
                                            <label className="text-sm font-bold text-slate-700 dark:text-slate-300">Strona internetowa</label>
                                            <input
                                                type="url"
                                                className={inputClass("website")}
                                                placeholder="https://www.twoja-firma.ch"
                                                value={form.website}
                                                onChange={handleChange("website")}
                                            />
                                        </div>
                                        <div className="grid gap-4 sm:grid-cols-2">
                                            <div className="space-y-3">
                                                <label className="text-sm font-bold text-slate-700 dark:text-slate-300 flex items-center gap-2">
                                                    Facebook
                                                </label>
                                                <input
                                                    className={inputClass("facebook")}
                                                    value={form.facebook}
                                                    onChange={handleChange("facebook")}
                                                />
                                            </div>
                                            <div className="space-y-3">
                                                <label className="text-sm font-bold text-slate-700 dark:text-slate-300 flex items-center gap-2">
                                                    Instagram
                                                </label>
                                                <input
                                                    className={inputClass("instagram")}
                                                    value={form.instagram}
                                                    onChange={handleChange("instagram")}
                                                />
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            )}

                            {step === 2 && (
                                <div className="space-y-10 animate-fade-in">
                                    <div className="bg-slate-50 dark:bg-slate-800/50 rounded-3xl p-8 border border-slate-200 dark:border-slate-800 space-y-6">
                                        <div className="flex items-center justify-between">
                                            <div className="space-y-1">
                                                <h3 className="text-lg font-bold text-slate-900 dark:text-white">Zdjęcie główne <span className="text-primary">*</span></h3>
                                                <p className="text-xs text-slate-500">Będzie wyświetlane na liście firm</p>
                                            </div>
                                            <button
                                                type="button"
                                                onClick={() => mainPhotoInputRef.current?.click()}
                                                className="rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 px-4 py-2 text-xs font-bold text-slate-700 dark:text-slate-300 hover:border-primary transition-all"
                                            >
                                                Zmień zdjęcie
                                            </button>
                                        </div>

                                        <div className="relative aspect-video w-full max-w-md mx-auto overflow-hidden rounded-3xl border-4 border-white dark:border-slate-800 shadow-2xl group cursor-pointer" onClick={() => mainPhotoInputRef.current?.click()}>
                                            {mainPhoto ? (
                                                // eslint-disable-next-line @next/next/no-img-element
                                                <img src={mainPhoto} alt="Główne" className="h-full w-full object-contain transition-transform group-hover:scale-105" />
                                            ) : (
                                                <div className="flex flex-col items-center justify-center h-full gap-3 text-slate-400">
                                                    <svg className="w-12 h-12" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" strokeWidth={1.5} strokeLinecap="round" strokeLinejoin="round" /></svg>
                                                    <span className="text-xs font-bold uppercase tracking-wider">Kliknij aby dodać</span>
                                                </div>
                                            )}
                                        </div>
                                        <input ref={mainPhotoInputRef} type="file" accept="image/*" className="hidden" onChange={(e) => handleMainPhotoChange(e.target.files)} />
                                        {uploadError && <p className="text-xs font-bold text-red-500 animate-shake">{uploadError}</p>}
                                    </div>

                                    <div
                                        className="group relative border-2 border-dashed border-slate-200 dark:border-slate-800 rounded-3xl p-10 text-center transition-all hover:border-primary/50 hover:bg-primary/5"
                                        onDragOver={(e) => e.preventDefault()}
                                        onDrop={onDrop}
                                    >
                                        <div className="space-y-4">
                                            <div className="mx-auto w-16 h-16 rounded-2xl bg-slate-50 dark:bg-slate-800 flex items-center justify-center text-slate-400 group-hover:text-primary transition-colors">
                                                <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path d="M12 4v16m8-8H4" strokeWidth={2.5} strokeLinecap="round" strokeLinejoin="round" /></svg>
                                            </div>
                                            <div className="space-y-1">
                                                <h4 className="text-sm font-bold text-slate-900 dark:text-white">Zdjęcia dodatkowe</h4>
                                                <p className="text-xs text-slate-500">Przeciągnij pliki tutaj lub <button type="button" onClick={() => fileInputRef.current?.click()} className="text-primary font-bold hover:underline">wybierz z dysku</button></p>
                                            </div>
                                        </div>
                                        <input ref={fileInputRef} type="file" accept="image/*" multiple className="hidden" onChange={(e) => handleFiles(e.target.files)} />
                                    </div>

                                    {previews.length > 0 && (
                                        <div className="grid gap-4 grid-cols-2 sm:grid-cols-4 md:grid-cols-5">
                                            {previews.map((src, idx) => (
                                                <div
                                                    key={idx}
                                                    className={`group relative aspect-square rounded-2xl overflow-hidden border-2 transition-all ${src === mainPhoto ? "border-primary shadow-lg scale-105 z-10" : "border-transparent opacity-80 hover:opacity-100"}`}
                                                    onClick={() => setMainPhoto(src)}
                                                >
                                                    {/* eslint-disable-next-line @next/next/no-img-element */}
                                                    <img src={src} alt="Podgląd" className="h-full w-full object-contain" />
                                                    <div className="absolute inset-0 bg-slate-900/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                                                        <button
                                                            type="button"
                                                            onClick={(e) => { e.stopPropagation(); setPreviews(prev => prev.filter(p => p !== src)); if (mainPhoto === src) setMainPhoto(null); }}
                                                            className="p-1.5 rounded-lg bg-red-500 text-white shadow-lg hover:scale-110 transition-transform"
                                                        >
                                                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path d="M6 18L18 6M6 6l12 12" strokeWidth={2.5} /></svg>
                                                        </button>
                                                    </div>
                                                    {src === mainPhoto && (
                                                        <div className="absolute top-2 left-2 px-2 py-0.5 rounded-md bg-primary text-[8px] font-black text-white uppercase tracking-tighter">Główne</div>
                                                    )}
                                                </div>
                                            ))}
                                        </div>
                                    )}
                                </div>
                            )}

                            {step === 3 && (
                                <div className="space-y-8 animate-fade-in">
                                    <div className="grid gap-8 md:grid-cols-2">
                                        <div className="bg-slate-50 dark:bg-slate-800/30 rounded-3xl p-6 border border-slate-100 dark:border-slate-800/50 space-y-4">
                                            <div className="flex items-center gap-3">
                                                <div className="p-2 rounded-xl bg-primary/10 text-primary">
                                                    <Image src={`${basePath}/logo.png`} alt="Logo" width={20} height={20} className="w-5 h-5" />
                                                </div>
                                                <h3 className="font-bold text-slate-900 dark:text-white">Podstawowe informacje</h3>
                                            </div>
                                            <dl className="space-y-3 text-sm">
                                                <div className="flex justify-between border-b border-slate-200 dark:border-slate-800/50 pb-2">
                                                    <dt className="text-slate-500">Nazwa</dt>
                                                    <dd className="font-bold text-slate-900 dark:text-white">{form.name}</dd>
                                                </div>
                                                <div className="flex justify-between border-b border-slate-200 dark:border-slate-800/50 pb-2">
                                                    <dt className="text-slate-500">Kategoria</dt>
                                                    <dd className="font-bold text-slate-900 dark:text-white">{form.category}</dd>
                                                </div>
                                                <div className="space-y-1">
                                                    <dt className="text-slate-500">Adres</dt>
                                                    <dd className="font-bold text-slate-900 dark:text-white leading-tight">{form.address}</dd>
                                                </div>
                                            </dl>
                                        </div>

                                        <div className="bg-slate-50 dark:bg-slate-800/30 rounded-3xl p-6 border border-slate-100 dark:border-slate-800/50 space-y-4">
                                            <div className="flex items-center gap-3">
                                                <div className="p-2 rounded-xl bg-primary/10 text-primary">
                                                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" strokeWidth={2} /></svg>
                                                </div>
                                                <h3 className="font-bold text-slate-900 dark:text-white">Kontakt</h3>
                                            </div>
                                            <dl className="space-y-3 text-sm">
                                                <div className="flex justify-between border-b border-slate-200 dark:border-slate-800/50 pb-2">
                                                    <dt className="text-slate-500">E-mail</dt>
                                                    <dd className="font-bold text-slate-900 dark:text-white">{form.email || "—"}</dd>
                                                </div>
                                                <div className="flex justify-between border-b border-slate-200 dark:border-slate-800/50 pb-2">
                                                    <dt className="text-slate-500">Telefon</dt>
                                                    <dd className="font-bold text-slate-900 dark:text-white">{form.phone || "—"}</dd>
                                                </div>
                                                <div className="flex justify-between border-b border-slate-200 dark:border-slate-800/50 pb-2">
                                                    <dt className="text-slate-500">Strona</dt>
                                                    <dd className="font-bold text-slate-900 dark:text-white truncate max-w-[150px]">{form.website || "—"}</dd>
                                                </div>
                                            </dl>
                                        </div>
                                    </div>

                                    {(mainPhoto || previews.length > 0) && (
                                        <div className="bg-white dark:bg-slate-900 rounded-3xl p-6 border-2 border-slate-100 dark:border-slate-800 shadow-lg">
                                            <div className="flex items-center gap-3 mb-4">
                                                <div className="p-2 rounded-xl bg-primary/10 text-primary">
                                                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                                                    </svg>
                                                </div>
                                                <h3 className="font-bold text-lg text-slate-900 dark:text-white">📸 Zdjęcia ({previews.length})</h3>
                                            </div>

                                            <div className={`grid gap-4 ${mainPhoto ? 'md:grid-cols-2' : 'grid-cols-1'}`}>
                                                {mainPhoto && (
                                                    <div className="space-y-2">
                                                        <p className="text-xs font-bold text-primary uppercase tracking-wider">Zdjęcie główne</p>
                                                        <div className="relative aspect-video overflow-hidden rounded-2xl border-4 border-primary/30 shadow-xl">
                                                            {/* eslint-disable-next-line @next/next/no-img-element */}
                                                            <img src={mainPhoto} alt="Główne" className="h-full w-full object-cover" />
                                                            <div className="absolute top-3 left-3 px-3 py-1 rounded-lg bg-primary text-xs font-black text-white shadow-lg uppercase">
                                                                ★ GŁÓWNE
                                                            </div>
                                                        </div>
                                                    </div>
                                                )}

                                                {previews.filter(p => p !== mainPhoto).length > 0 && (
                                                    <div className="space-y-2">
                                                        <p className="text-xs font-bold text-slate-500 uppercase tracking-wider">Dodatkowe zdjęcia ({previews.filter(p => p !== mainPhoto).length})</p>
                                                        <div className="grid grid-cols-2 gap-2">
                                                            {previews.filter(p => p !== mainPhoto).slice(0, 4).map((src, idx) => (
                                                                <div key={idx} className="relative aspect-square overflow-hidden rounded-xl border-2 border-slate-200 dark:border-slate-700 shadow-md hover:scale-105 transition-transform">
                                                                    {/* eslint-disable-next-line @next/next/no-img-element */}
                                                                    <img src={src} alt={`Dodatkowe ${idx + 1}`} className="h-full w-full object-cover" />
                                                                </div>
                                                            ))}
                                                        </div>
                                                        {previews.filter(p => p !== mainPhoto).length > 4 && (
                                                            <p className="text-xs text-slate-500 dark:text-slate-400 text-center font-semibold mt-2">+ {previews.filter(p => p !== mainPhoto).length - 4} więcej zdjęć</p>
                                                        )}
                                                    </div>
                                                )}
                                            </div>
                                        </div>
                                    )}
                                </div>
                            )}

                            {step === 4 && (
                                <div className="space-y-10 animate-fade-in">
                                    <div className="grid gap-8 md:grid-cols-2">
                                        <div className="bg-slate-50 dark:bg-slate-800/30 rounded-3xl p-6 border border-slate-100 dark:border-slate-800/50 space-y-4">
                                            <h3 className="font-bold text-slate-900 dark:text-white">Podstawowe informacje</h3>
                                            <dl className="space-y-3 text-sm">
                                                <div className="flex justify-between border-b border-slate-200 dark:border-slate-800/50 pb-2">
                                                    <dt className="text-slate-500">Nazwa</dt>
                                                    <dd className="font-bold text-slate-900 dark:text-white">{form.name}</dd>
                                                </div>
                                                <div className="flex justify-between border-b border-slate-200 dark:border-slate-800/50 pb-2">
                                                    <dt className="text-slate-500">Kategoria</dt>
                                                    <dd className="font-bold text-slate-900 dark:text-white">{form.category}</dd>
                                                </div>
                                                <div className="space-y-1">
                                                    <dt className="text-slate-500">Adres</dt>
                                                    <dd className="font-bold text-slate-900 dark:text-white leading-tight">{form.address}</dd>
                                                </div>
                                            </dl>
                                        </div>
                                        <div className="bg-slate-50 dark:bg-slate-800/30 rounded-3xl p-6 border border-slate-100 dark:border-slate-800/50 space-y-4">
                                            <h3 className="font-bold text-slate-900 dark:text-white">Kontakt</h3>
                                            <dl className="space-y-3 text-sm">
                                                <div className="flex justify-between border-b border-slate-200 dark:border-slate-800/50 pb-2">
                                                    <dt className="text-slate-500">E-mail</dt>
                                                    <dd className="font-bold text-slate-900 dark:text-white">{form.email || "—"}</dd>
                                                </div>
                                                <div className="flex justify-between border-b border-slate-200 dark:border-slate-800/50 pb-2">
                                                    <dt className="text-slate-500">Telefon</dt>
                                                    <dd className="font-bold text-slate-900 dark:text-white">{form.phone || "—"}</dd>
                                                </div>
                                            </dl>
                                        </div>
                                    </div>
                                </div>
                            )}

                            <div className="flex flex-col-reverse sm:flex-row items-center justify-between gap-6 pt-10 border-t border-slate-100 dark:border-slate-800">
                                <button
                                    type="button"
                                    onClick={goPrev}
                                    disabled={step === 0}
                                    className="w-full sm:w-auto px-8 py-4 rounded-2xl border border-slate-200 dark:border-slate-800 font-bold text-slate-600 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-800 transition-all disabled:opacity-30 disabled:cursor-not-allowed"
                                >
                                    Poprzedni krok
                                </button>

                                <div className="w-full sm:w-auto flex flex-col sm:flex-row gap-4">
                                    {step < steps.length - 1 ? (
                                        <button
                                            type="button"
                                            onClick={handleNext}
                                            className="w-full sm:w-auto px-10 py-4 rounded-2xl bg-primary text-white font-bold shadow-xl shadow-primary/20 hover:bg-primary-dark transition-all hover:scale-105"
                                        >
                                            Następny krok
                                        </button>
                                    ) : (
                                        <button
                                            type="button"
                                            onClick={updateCompany}
                                            disabled={submitStatus === "loading"}
                                            className="w-full sm:w-auto px-10 py-4 rounded-2xl bg-gradient-to-r from-primary to-primary-dark text-white font-bold shadow-xl shadow-primary/25 hover:shadow-2xl hover:scale-105 transition-all text-lg disabled:opacity-70 disabled:cursor-not-allowed"
                                        >
                                            {submitStatus === "loading" ? (
                                                <span className="flex items-center gap-2">
                                                    <svg className="animate-spin h-5 w-5 text-white" fill="none" viewBox="0 0 24 24">
                                                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                                                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                                                    </svg>
                                                    Zapisywanie...
                                                </span>
                                            ) : (
                                                "Zapisz zmiany"
                                            )}
                                        </button>
                                    )}
                                </div>
                            </div>

                            {submitError && (
                                <div className="p-4 rounded-2xl bg-red-50 dark:bg-red-900/20 border border-red-100 dark:border-red-900/50 text-red-600 dark:text-red-400 font-bold text-center animate-shake">
                                    {submitError}
                                </div>
                            )}
                        </form>
                    </div>
                </div>
            </div>
        </div>
    );
}
