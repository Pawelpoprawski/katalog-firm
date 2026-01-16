"use client";
import Link from "next/link";
import { useEffect, useRef, useState } from "react";

const steps = ["Dane firmy", "Kontakt", "Zdjęcia", "Podsumowanie"];
const DESC_LIMIT = 10000; // Merged: description + offer
const ADDRESS_SUGGESTIONS = [
  { label: "Bahnhofstrasse 1, Zürich", canton: "ZH" },
  { label: "Bundesplatz 1, Bern", canton: "BE" },
  { label: "Rue du Rhône 10, Genève", canton: "GE" },
  { label: "Freie Strasse 20, Basel", canton: "BS" },
  { label: "Pilatusstrasse 4, Luzern", canton: "LU" },
  { label: "Bahnhofstrasse 10, St. Gallen", canton: "SG" },
  { label: "Bahnhofplatz 1, Winterthur", canton: "ZH" },
  { label: "Bahnhofstrasse 5, Zug", canton: "ZG" },
  { label: "Avenue de la Gare 12, Lausanne", canton: "VD" },
  { label: "Via Nassa 5, Lugano", canton: "TI" }
];

type Category = {
  id: number;
  name: string;
  slug: string;
  description?: string;
};

export default function AddCompanyPage() {
  const [form, setForm] = useState({
    name: "",
    category: "",
    address: "",
    city: "",
    canton: "",
    postal_code: "",
    desc: "", // Merged: Firma & Usługi (20-10,000 chars)
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
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const mainPhotoInputRef = useRef<HTMLInputElement | null>(null);
  const addressInputRef = useRef<HTMLInputElement | null>(null);
  const [placesReady, setPlacesReady] = useState(false);
  const googleKey = process.env.NEXT_PUBLIC_GOOGLE_MAPS_KEY;
  const apiUrl = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";

  const [submitStatus, setSubmitStatus] = useState<"idle" | "loading" | "success" | "error">("idle");
  const [submitError, setSubmitError] = useState("");
  const [createdCompanyId, setCreatedCompanyId] = useState<number | null>(null);
  const [createdCompanySlug, setCreatedCompanySlug] = useState<string | null>(null);
  const [createdEditToken, setCreatedEditToken] = useState<string | null>(null);

  // Fetch categories from backend
  useEffect(() => {
    const fetchCategories = async () => {
      try {
        const res = await fetch(`${apiUrl}/categories/`);
        if (!res.ok) throw new Error("Failed to fetch categories");
        const data: Category[] = await res.json();
        setCategories(data);
      } catch (e) {
        console.error("Failed to load categories:", e);
      } finally {
        setLoadingCategories(false);
      }
    };
    fetchCategories();
  }, [apiUrl]);

  // Load draft from localStorage on mount
  useEffect(() => {
    const draft = localStorage.getItem("company_draft");
    if (draft) {
      try {
        const parsed = JSON.parse(draft);
        setForm(parsed);
      } catch (e) {
        localStorage.removeItem("company_draft");
      }
    }
  }, []);

  // Auto-save draft to localStorage
  useEffect(() => {
    const hasData = form.name || form.category || form.address || form.desc;
    if (hasData) {
      localStorage.setItem("company_draft", JSON.stringify(form));
    }
  }, [form]);

  // Clear draft on successful submit
  useEffect(() => {
    if (submitStatus === "success") {
      localStorage.removeItem("company_draft");
    }
  }, [submitStatus]);

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
          newErrors.phone = "Nieprawidłowy format telefonu. Użyj formatu: +41 lub +48";
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
    // Accept Swiss (+41) and Polish (+48) numbers
    const phoneRegex = /^(\+41|\+48|0)[1-9]\d{1,12}$/;
    const cleaned = phone.replace(/[\s-]/g, "");
    return phoneRegex.test(cleaned);
  };

  const validateStep = (current: number) => {
    const newErrors: Record<string, string> = {};
    if (current === 0) {
      if (!form.name.trim()) newErrors.name = "Podaj nazwę firmy.";
      if (!form.category.trim()) newErrors.category = "Wybierz kategorię.";
      if (!form.address.trim()) newErrors.address = "Podaj adres/miasto.";
    }
    if (current === 1) {
      if (!form.email.trim()) {
        newErrors.email = "Adres e-mail jest wymagany.";
      } else if (!validateEmail(form.email)) {
        newErrors.email = "Nieprawidłowy format e-mail.";
      }

      if (form.phone.trim() && !validatePhone(form.phone)) {
        newErrors.phone = "Nieprawidłowy format telefonu.";
      }
    }
    if (current === 2) {
      // Moved to step 1
    }
    if (current === 3) {
      if (!mainPhoto) {
        setUploadError("Zdjęcie główne jest wymagane.");
        return { mainPhoto: "Wymagane" }; // Stop navigation
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

  const handleFiles = (files: FileList | null) => {
    if (!files || files.length === 0) return;
    const MAX_FILES = 8;
    const MAX_SIZE = 5 * 1024 * 1024;
    const accepted = Array.from(files).filter((f) => f.type.startsWith("image/") && f.size <= MAX_SIZE);
    if (accepted.length !== files.length) {
      setUploadError("Dozwolone tylko obrazy (jpg/png/webp) do 5MB. Limit 8 szt.");
    } else {
      setUploadError("");
    }
    const urls = accepted.map((f) => URL.createObjectURL(f));
    setPreviews((prev) => [...prev, ...urls].slice(0, MAX_FILES));
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

  const submitForm = async () => {
    setSubmitStatus("loading");
    setSubmitError("");
    try {
      const imgUrl = await convertBlobUrlToBase64(mainPhoto);
      const extraUrls = previews.filter((url) => url !== mainPhoto);
      const photos: string[] = [];
      for (const url of extraUrls) {
        const converted = await convertBlobUrlToBase64(url);
        if (converted) photos.push(converted);
      }

      const selectedCategory = categories.find((c) => c.name === form.category);
      const category_id = selectedCategory?.id || null;

      const body = {
        name: form.name,
        category_id,
        description: form.desc, // Merged field
        phone: form.phone,
        email: form.email,
        website: form.website ? (form.website.startsWith("www.") ? `https://${form.website}` : form.website) : null,
        facebook: form.facebook || null,
        instagram: form.instagram || null,
        address: form.address,
        city: form.city || null,
        canton: form.canton || null,
        postal_code: form.postal_code || null,
        country: "Switzerland",
        latitude: null,
        longitude: null,
        tags: null,
        img: imgUrl || null,
        photos: photos.length ? photos : null
      };

      const res = await fetch(`${apiUrl}/companies/`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body)
      });

      if (!res.ok) {
        const text = await res.text();
        throw new Error(`(${res.status}) ${text || "Błąd tworzenia firmy"}`);
      }
      const createdCompany = await res.json();
      setCreatedCompanyId(createdCompany.id);
      setCreatedCompanySlug(createdCompany.slug || null);
      if (createdCompany.edit_token) {
        setCreatedEditToken(createdCompany.edit_token);
      }
      setSubmitStatus("success");
    } catch (err: any) {
      setSubmitStatus("error");
      setSubmitError(err.message || "Nie udało się zapisać. Upewnij się, że backend działa.");
    }
  };

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
  }, [placesReady]);

  if (submitStatus === "success") {
    return (
      <div className="mx-auto max-w-2xl px-4 py-20 text-center space-y-8 animate-fade-in">
        <div className="relative mx-auto w-32 h-32 flex items-center justify-center rounded-4xl bg-green-50 dark:bg-green-900/20 text-green-600 shadow-inner">
          <svg className="w-16 h-16 animate-scale-in" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
          </svg>
          <div className="absolute inset-0 rounded-4xl bg-green-400/20 animate-ping" />
        </div>
        <div className="space-y-4">
          <h1 className="text-4xl font-extrabold text-slate-900 dark:text-white">Firma dodana!</h1>
          <p className="text-lg text-slate-600 dark:text-slate-400 max-w-md mx-auto leading-relaxed">
            Dziękujemy za dodanie firmy do naszego katalogu. Twoje ogłoszenie zostanie sprawdzone przez moderatora i opublikowane w katalogu.
          </p>
        </div>

        {/* Edit Link Section */}
        {createdEditToken && (
          <div className="bg-yellow-50 dark:bg-yellow-900/10 border border-yellow-200 dark:border-yellow-900/30 rounded-3xl p-6 md:p-8 max-w-xl mx-auto space-y-4 text-left shadow-lg">
            <div className="flex items-start gap-3">
              <div className="p-2 rounded-xl bg-yellow-100 dark:bg-yellow-900/30 text-yellow-600 dark:text-yellow-400 shrink-0">
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" strokeWidth={2} /></svg>
              </div>
              <div>
                <h3 className="text-lg font-bold text-slate-900 dark:text-white mb-1">Klucz dostępu do edycji</h3>
                <p className="text-sm text-slate-600 dark:text-slate-400 mb-4">
                  To jest <strong>jedyny sposób</strong> na późniejszą edycję Twojego ogłoszenia bez zakładania konta.
                  Zapisz ten link w bezpiecznym miejscu!
                </p>
                <div className="group relative">
                  <div className="w-full flex items-center gap-2 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-3 pr-12 shadow-inner font-mono text-xs sm:text-sm text-slate-600 dark:text-slate-400">
                    <span className="break-all">{`${typeof window !== 'undefined' ? window.location.origin : ''}/edycja/${createdEditToken}`}</span>
                  </div>
                  <button
                    onClick={() => {
                      const link = `${window.location.origin}/edycja/${createdEditToken}`;
                      navigator.clipboard.writeText(link);
                      alert("Skopiowano link do schowka!");
                    }}
                    className="absolute right-2 top-1/2 -translate-y-1/2 p-2 rounded-lg bg-slate-100 dark:bg-slate-800 hover:bg-primary hover:text-white transition-colors text-slate-500"
                    title="Kopiuj link"
                  >
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" strokeWidth={2} /></svg>
                  </button>
                </div>
                <p className="text-xs text-slate-500 dark:text-slate-500 mt-3">
                  💡 Zgubiłeś link? Możesz się skontaktować przez{" "}
                  <a href="mailto:kontakt@polacyszwajcaria.com" className="text-primary hover:underline font-medium">
                    kontakt@polacyszwajcaria.com
                  </a>
                  {" "}— wtedy wyślemy Ci link do edycji.
                </p>
              </div>
            </div>
          </div>
        )}

        <div className="flex flex-col sm:flex-row gap-4 justify-center pt-4">
          <Link
            href={`/firma/${createdCompanySlug || createdCompanyId}`}
            className="rounded-2xl bg-primary px-8 py-4 font-bold text-white shadow-xl shadow-primary/20 hover:bg-primary-dark transition-all hover:scale-105"
          >
            Zobacz ogłoszenie
          </Link>
          <Link
            href="/"
            className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 px-8 py-4 font-bold text-slate-700 dark:text-slate-300 hover:bg-slate-50 transition-all hover:scale-105"
          >
            Wróć do strony głównej
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-4xl px-4 py-12 space-y-10 sm:px-6">
      {/* Breadcrumbs */}
      <nav className="flex items-center gap-3 text-sm font-medium animate-fade-in text-slate-500">
        <Link href="/" className="hover:text-primary transition-colors">Start</Link>
        <svg className="w-4 h-4 text-slate-300" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path d="M9 5l7 7-7 7" strokeWidth={2.5} /></svg>
        <span className="text-slate-900 dark:text-white">Dodaj firmę</span>
      </nav>

      <div className="relative overflow-hidden rounded-4xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-2xl transition-all duration-500">
        {/* Design Accents */}
        <div className="absolute top-0 right-0 -mr-20 -mt-20 w-80 h-80 bg-primary/5 rounded-full blur-3xl" />

        <div className="relative p-8 md:p-12 space-y-10">
          <div className="flex flex-col gap-6 md:flex-row md:items-end md:justify-between">
            <div className="space-y-2">
              <span className="inline-block px-3 py-1 rounded-full bg-primary/10 text-primary text-[10px] font-bold uppercase tracking-wider">
                Nowe ogłoszenie
              </span>
              <h1 className="text-3xl font-extrabold text-slate-900 dark:text-white sm:text-4xl">Dodaj swoje usługi</h1>
              <p className="text-slate-600 dark:text-slate-400 text-lg">
                Pokaż się tysiącom klientów w Szwajcarii.
              </p>
            </div>
            <Link
              href="/"
              className="group inline-flex items-center gap-2 text-sm font-bold text-slate-500 hover:text-primary transition-all"
            >
              <svg className="w-5 h-5 transition-transform group-hover:-translate-x-1" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path d="M15 19l-7-7 7-7" strokeWidth={2.5} strokeLinecap="round" strokeLinejoin="round" /></svg>
              Anuluj i wróć
            </Link>
          </div>

          {/* Stepper Display */}
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
              <div className="text-right">
                <div className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1">Status postępu</div>
                <div className="text-xl font-black text-primary">{Math.round(((step + 1) / steps.length) * 100)}%</div>
              </div>
            </div>

            <div className="h-3 w-full rounded-full bg-slate-100 dark:bg-slate-800 p-0.5 overflow-hidden">
              <div
                className="h-full bg-gradient-to-r from-primary to-primary-light rounded-full shadow-sm transition-all duration-700 ease-out relative overflow-hidden"
                style={{ width: `${((step + 1) / steps.length) * 100}%` }}
              >
                <div className="absolute inset-0 bg-white/20 animate-pulse-slow" />
              </div>
            </div>
          </div>

          {/* Form Content */}
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
                        required
                      />
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
                      <div className="absolute inset-y-0 left-4 flex items-center pointer-events-none text-slate-400">
                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" strokeWidth={2} /><path d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" strokeWidth={2} /></svg>
                      </div>
                      <input
                        ref={addressInputRef}
                        className={`${inputClass("address")} pl-12`}
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


              {step === 2 && (
                <div className="space-y-8 animate-fade-in">
                  <div className="grid gap-8 md:grid-cols-2">
                    <div className="space-y-3">
                      <label className="text-sm font-bold text-slate-700 dark:text-slate-300">
                        Telefon / WhatsApp
                      </label>
                      <input
                        type="tel"
                        className={inputClass("phone")}
                        placeholder="+41 79 123 45 67 lub +48 600 123 456"
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
                          <svg className="w-4 h-4 text-[#1877F2]" fill="currentColor" viewBox="0 0 24 24"><path d="M22 12.07C22 6.48 17.52 2 11.93 2 6.34 2 1.86 6.48 1.86 12.07c0 4.97 3.65 9.09 8.42 9.93v-7.02H7.9v-2.91h2.38v-2.22c0-2.35 1.4-3.65 3.54-3.65 1.03 0 2.1.18 2.1.18v2.31h-1.18c-1.16 0-1.52.72-1.52 1.46v1.92h2.59l-.41 2.91h-2.18V22c4.77-.84 8.42-4.96 8.42-9.93z" /></svg>
                          Facebook
                        </label>
                        <input
                          className={inputClass("facebook")}
                          placeholder="Link do profilu"
                          value={form.facebook}
                          onChange={handleChange("facebook")}
                        />
                      </div>
                      <div className="space-y-3">
                        <label className="text-sm font-bold text-slate-700 dark:text-slate-300 flex items-center gap-2">
                          <svg className="w-4 h-4 text-[#E1306C]" fill="currentColor" viewBox="0 0 24 24"><path d="M7.75 2h8.5C19.55 2 22 4.45 22 7.75v8.5C22 19.55 19.55 22 16.25 22h-8.5C4.45 22 2 19.55 2 16.25v-8.5C2 4.45 4.45 2 7.75 2zm0 2C5.68 4 4 5.68 4 7.75v8.5C4 18.32 5.68 20 7.75 20h8.5C18.32 20 20 18.32 20 16.25v-8.5C20 5.68 18.32 4 16.25 4h-8.5z" /><path d="M12 7.5A4.5 4.5 0 1 1 7.5 12 4.5 4.5 0 0 1 12 7.5zm0 2A2.5 2.5 0 1 0 14.5 12 2.5 2.5 0 0 0 12 9.5zM17 6.25a1 1 0 1 1-1 1 1 1 0 0 1 1-1z" /></svg>
                          Instagram
                        </label>
                        <input
                          className={inputClass("instagram")}
                          placeholder="Link do profilu"
                          value={form.instagram}
                          onChange={handleChange("instagram")}
                        />
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {step === 3 && (
                <div className="space-y-10 animate-fade-in">
                  <div className={`bg-slate-50 dark:bg-slate-800/50 rounded-3xl p-8 border space-y-6 ${!mainPhoto && uploadError ? 'border-red-400 bg-red-50 dark:bg-red-900/10' : 'border-slate-200 dark:border-slate-800'}`}>
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
                        <img src={mainPhoto} alt="Główne" className="h-full w-full object-contain transition-transform group-hover:scale-105" />
                      ) : (
                        <div className="flex flex-col items-center justify-center h-full gap-3 text-slate-400">
                          <svg className="w-12 h-12" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" strokeWidth={1.5} strokeLinecap="round" strokeLinejoin="round" /></svg>
                          <span className="text-xs font-bold uppercase tracking-wider">Kliknij aby dodać</span>
                        </div>
                      )}
                      <div className="absolute inset-0 bg-primary/20 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                        <span className="bg-white px-4 py-2 rounded-xl text-xs font-bold text-primary shadow-xl">Wybierz nowe</span>
                      </div>
                    </div>

                    {!mainPhoto && uploadError && (
                      <div className="bg-red-100 dark:bg-red-900/20 border border-red-300 dark:border-red-900/30 rounded-xl p-4 flex items-start gap-3">
                        <svg className="w-5 h-5 text-red-600 dark:text-red-400 flex-shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                        </svg>
                        <div>
                          <p className="text-sm font-bold text-red-800 dark:text-red-200">Zdjęcie główne jest wymagane</p>
                          <p className="text-xs text-red-600 dark:text-red-300 mt-1">Dodaj przynajmniej jedno zdjęcie reprezentujące Twoją firmę</p>
                        </div>
                      </div>
                    )}

                    <input ref={mainPhotoInputRef} type="file" accept="image/*" className="hidden" onChange={(e) => handleFiles(e.target.files)} />
                  </div>

                  <div
                    className="group relative border-2 border-dashed border-slate-200 dark:border-slate-800 rounded-3xl p-10 text-center transition-all hover:border-primary/50 hover:bg-primary/5 cursor-pointer"
                    onDragOver={(e) => e.preventDefault()}
                    onDrop={onDrop}
                    onClick={() => fileInputRef.current?.click()}
                  >
                    <div className="space-y-4">
                      <div className="mx-auto w-16 h-16 rounded-2xl bg-slate-50 dark:bg-slate-800 flex items-center justify-center text-slate-400 group-hover:text-primary transition-colors">
                        <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path d="M12 4v16m8-8H4" strokeWidth={2.5} strokeLinecap="round" strokeLinejoin="round" /></svg>
                      </div>
                      <div className="space-y-1">
                        <h4 className="text-sm font-bold text-slate-900 dark:text-white">Zdjęcia dodatkowe</h4>
                        <p className="text-xs text-slate-500">Przeciągnij pliki tutaj lub <button type="button" onClick={(e) => { e.stopPropagation(); fileInputRef.current?.click(); }} className="text-primary font-bold hover:underline">wybierz z dysku</button></p>
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
                  {uploadError && <p className="text-xs font-bold text-red-500 animate-shake text-center">{uploadError}</p>}
                </div>
              )}

              {step === 4 && (
                <div className="space-y-8 animate-fade-in">
                  <div className="grid gap-8 md:grid-cols-2">
                    <div className="bg-slate-50 dark:bg-slate-800/30 rounded-3xl p-6 border border-slate-100 dark:border-slate-800/50 space-y-4">
                      <div className="flex items-center gap-3">
                        <div className="p-2 rounded-xl bg-primary/10 text-primary">
                          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" strokeWidth={2} /></svg>
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

                  {/* Photos Preview */}
                  {previews.length > 0 && (
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
                        {/* Main Photo */}
                        {mainPhoto && (
                          <div className="space-y-2">
                            <p className="text-xs font-bold text-primary uppercase tracking-wider">Zdjęcie główne</p>
                            <div className="relative aspect-video overflow-hidden rounded-2xl border-4 border-primary/30 shadow-xl">
                              <img src={mainPhoto} alt="Główne" className="h-full w-full object-cover" />
                              <div className="absolute top-3 left-3 px-3 py-1 rounded-lg bg-primary text-xs font-black text-white shadow-lg uppercase">
                                ★ GŁÓWNE
                              </div>
                            </div>
                          </div>
                        )}

                        {/* Additional Photos */}
                        {previews.filter(p => p !== mainPhoto).length > 0 && (
                          <div className="space-y-2">
                            <p className="text-xs font-bold text-slate-500 uppercase tracking-wider">Dodatkowe zdjęcia ({previews.filter(p => p !== mainPhoto).length})</p>
                            <div className="grid grid-cols-2 gap-2">
                              {previews.filter(p => p !== mainPhoto).slice(0, 4).map((src, idx) => (
                                <div key={idx} className="relative aspect-square overflow-hidden rounded-xl border-2 border-slate-200 dark:border-slate-700 shadow-md hover:scale-105 transition-transform">
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

                  <div className="space-y-6">
                    <div className="space-y-2">
                      <h4 className="text-sm font-bold text-slate-900 dark:text-white flex items-center gap-2">
                        <div className="w-1.5 h-4 bg-primary rounded-full"></div>
                        Firma & Usługi
                      </h4>
                      <div className="bg-slate-50 dark:bg-slate-800/30 rounded-3xl p-6 border border-slate-100 dark:border-slate-800/50 text-sm text-slate-600 dark:text-slate-400 leading-relaxed whitespace-pre-wrap italic">
                        {form.desc}
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* Navigation Buttons */}
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
                  <button
                    type="button"
                    onClick={step === steps.length - 1 ? submitForm : handleNext}
                    disabled={submitStatus === "loading"}
                    className="w-full sm:w-auto px-10 py-4 rounded-2xl bg-primary font-bold text-white shadow-xl shadow-primary/20 hover:bg-primary-dark transition-all hover:scale-105 active:scale-95 disabled:opacity-50 flex items-center justify-center gap-3"
                  >
                    {submitStatus === "loading" && (
                      <svg className="animate-spin h-5 w-5 text-white" fill="none" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" /><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" /></svg>
                    )}
                    {step === steps.length - 1
                      ? (submitStatus === "loading" ? "Przetwarzanie..." : "Wyślij ogłoszenie do weryfikacji ✨")
                      : "Następny krok"}
                  </button>
                </div>
              </div>

              {submitStatus === "error" && (
                <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-900/30 rounded-2xl p-6 animate-shake">
                  <div className="flex gap-4">
                    <div className="p-2 rounded-xl bg-red-100 dark:bg-red-900/40 text-red-600 dark:text-red-400">
                      <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" strokeWidth={2.5} strokeLinecap="round" strokeLinejoin="round" /></svg>
                    </div>
                    <div>
                      <h4 className="font-bold text-red-900 dark:text-red-300">Wystąpił problem</h4>
                      <p className="text-sm text-red-700 dark:text-red-400 leading-relaxed">{submitError || "Nie udało się zapisać danych. Sprawdź połączenie z internetem i spróbuj ponownie."}</p>
                    </div>
                  </div>
                </div>
              )}
            </form>
          </div>
        </div>
      </div>
    </div>
  );
}
