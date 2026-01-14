"use client";
import Link from "next/link";
import { useEffect, useRef, useState } from "react";

const steps = ["Dane firmy", "Kontakt", "Oferta", "Zdjęcia", "Podsumowanie"];
const DESC_LIMIT = 500;
const OFFER_LIMIT = 400;
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
    desc: "",
    offer: "",
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
  const apiUrl = process.env.NEXT_PUBLIC_API_URL || "http://127.0.0.1:8000";

  const [submitStatus, setSubmitStatus] = useState<"idle" | "loading" | "success" | "error">("idle");
  const [submitError, setSubmitError] = useState("");
  const [createdCompanyId, setCreatedCompanyId] = useState<number | null>(null);
  const [createdCompanySlug, setCreatedCompanySlug] = useState<string | null>(null);

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
        // Ask user if they want to restore
        if (confirm("Znaleziono zapisany szkic formularza. Czy chcesz go przywrócić?")) {
          // Draft restored
        } else {
          localStorage.removeItem("company_draft");
        }
      } catch (e) {
        localStorage.removeItem("company_draft");
      }
    }
  }, []);

  // Auto-save draft to localStorage
  useEffect(() => {
    const hasData = form.name || form.category || form.address || form.desc || form.offer;
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
        } else if (key === "offer" && value.trim().length > 0 && value.trim().length < 10) {
          newErrors.offer = `Oferta min. 10 znaków (obecnie ${value.trim().length}).`;
        } else if (key === "email" && value.trim() && !validateEmail(value)) {
          newErrors.email = "Nieprawidłowy format e-mail.";
        } else if (key === "phone" && value.trim() && !validatePhone(value)) {
          newErrors.phone = "Nieprawidłowy format telefonu. Użyj formatu: +41, +48 lub 0";
        } else if (key === "website" && value.trim() && !value.startsWith("http")) {
          newErrors.website = "Podaj pełny link (https://...).";
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
      if (!form.name.trim()) newErrors.name = "Podaj nazwę firmy.";
      if (!form.category.trim()) newErrors.category = "Wybierz kategorię.";
      if (!form.address.trim()) newErrors.address = "Podaj adres/miasto.";
    }
    if (current === 1) {
      if (form.desc.trim().length < 20) newErrors.desc = "Opis min. 20 znaków.";
      if (form.offer.trim().length < 10) newErrors.offer = "Podaj ofertę/usługi.";
    }
    if (current === 2) {
      if (!form.phone.trim() && !form.email.trim()) {
        newErrors.phone = "Podaj telefon lub e-mail.";
        newErrors.email = "Podaj telefon lub e-mail.";
      }
      if (form.phone.trim() && !validatePhone(form.phone)) {
        newErrors.phone = "Nieprawidłowy format telefonu. Użyj formatu: +41 lub +48";
      }
      if (form.email.trim() && !validateEmail(form.email)) {
        newErrors.email = "Nieprawidłowy format e-mail.";
      }
      if (form.website && !form.website.startsWith("http")) {
        newErrors.website = "Podaj pełny link (https://...).";
      }
      if (form.facebook && !form.facebook.startsWith("http")) newErrors.facebook = "Podaj pełny link (https://...).";
      if (form.instagram && !form.instagram.startsWith("http")) newErrors.instagram = "Podaj pełny link (https://...).";
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
    `w-full rounded-lg border px-3 py-2 text-base focus:border-primary focus:outline-none focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary ${errors[key] ? "border-red-400" : "border-slate-300"
    }`;

  const filteredAddress = form.address.trim().length >= 2
    ? ADDRESS_SUGGESTIONS.filter((s) =>
      s.label.toLowerCase().includes(form.address.toLowerCase())
    ).slice(0, 5)
    : [];

  const handleFiles = (files: FileList | null) => {
    if (!files || files.length === 0) return;
    const MAX_FILES = 8;
    const MAX_SIZE = 5 * 1024 * 1024; // 5 MB
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
      // Convert main photo to base64 if it's a blob URL
      const imgUrl = await convertBlobUrlToBase64(mainPhoto);

      // Convert additional photos (excluding main) to base64
      const extraUrls = previews.filter((url) => url !== mainPhoto);
      const photos: string[] = [];
      for (const url of extraUrls) {
        const converted = await convertBlobUrlToBase64(url);
        if (converted) photos.push(converted);
      }

      // Find category_id from category name
      const selectedCategory = categories.find((c) => c.name === form.category);
      const category_id = selectedCategory?.id || null;

      const body = {
        name: form.name,
        category_id,
        description: form.desc,
        offer: form.offer,
        phone: form.phone,
        email: form.email,
        website: form.website,
        facebook: form.facebook || null,
        instagram: form.instagram || null,
        address: form.address,
        city: form.city || null,
        canton: form.canton || null,
        postal_code: form.postal_code || null,
        country: "Switzerland",
        // Note: latitude/longitude/tags not implemented yet - can be added later for map features
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

      // Parse address components
      let city = "";
      let canton = "";
      let postal_code = "";

      if (place.address_components) {
        for (const component of place.address_components) {
          const types = component.types;
          if (types.includes("postal_code")) {
            postal_code = component.long_name;
          }
          if (types.includes("locality")) {
            city = component.long_name;
          } else if (types.includes("administrative_area_level_1")) {
            // In Switzerland, this is usually the canton
            canton = component.short_name;
          }
        }
      }

      setForm((prev) => ({ ...prev, address: addr, city, canton, postal_code }));
      setErrors((prev) => {
        const { address, ...rest } = prev;
        return rest;
      });
    });
  }, [placesReady]);

  return (
    <div className="mx-auto max-w-4xl px-4 py-10 space-y-8 sm:px-6">
      <div className="flex items-center gap-2 text-sm text-slate-600">
        <Link href="/" className="hover:text-primary">Strona główna</Link>
        <span>/</span>
        <span className="font-semibold text-slate-900">Dodaj firmę</span>
      </div>

      <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
        <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
          <div>
            <h1 className="text-2xl font-bold text-slate-900">Dodaj firmę</h1>
            <p className="text-sm text-slate-600">
              Wypełnij formularz, aby dodać swoją firmę do katalogu.
            </p>
          </div>
          <Link href="/" className="text-sm font-semibold text-primary hover:text-red-700">
            Wróć
          </Link>
        </div>

        {/* Progress Bar */}
        <div className="mt-4 space-y-2">
          <div className="flex items-center justify-between text-xs text-slate-600">
            <span className="font-semibold">Postęp: {Math.round(((step + 1) / steps.length) * 100)}%</span>
            <span>Krok {step + 1} z {steps.length}</span>
          </div>
          <div className="h-2 w-full rounded-full bg-slate-200 overflow-hidden">
            <div
              className="h-full bg-primary transition-all duration-300 ease-out"
              style={{ width: `${((step + 1) / steps.length) * 100}%` }}
              role="progressbar"
              aria-valuenow={step + 1}
              aria-valuemin={1}
              aria-valuemax={steps.length}
            />
          </div>
        </div>

        <div className="mt-4 flex flex-wrap gap-2 text-xs font-semibold uppercase tracking-wide text-slate-600">
          {steps.map((s, i) => (
            <button
              key={s}
              type="button"
              onClick={() => {
                // Allow clicking on completed steps
                if (i <= step) {
                  setStep(i);
                }
              }}
              className={`rounded-full px-3 py-1 transition-colors ${i === step
                ? "bg-primary text-white"
                : i < step
                  ? "bg-slate-200 text-slate-700 hover:bg-slate-300 cursor-pointer"
                  : "bg-slate-100 text-slate-500 cursor-not-allowed"
                }`}
              disabled={i > step}
              aria-label={`Krok ${i + 1}: ${s}`}
            >
              {i + 1}. {s}
            </button>
          ))}
        </div>

        <form className="mt-6 space-y-6">
          {step === 0 && (
            <>
              <div className="rounded-2xl bg-slate-50 px-4 py-3 text-sm font-semibold text-slate-800">
                Krok 1: dane podstawowe
              </div>
              <div className="grid gap-4 md:grid-cols-2">
                <label className="space-y-1 text-sm text-slate-700">
                  <span className="font-semibold text-slate-900">
                    Nazwa firmy <span className="text-red-500">*</span>
                  </span>
                  <input
                    className={inputClass("name")}
                    placeholder="np. Pol-Bud CH"
                    value={form.name}
                    onChange={handleChange("name")}
                    required
                    aria-required="true"
                  />
                  <span className="text-xs text-slate-500">Pełna nazwa widoczna w katalogu.</span>
                  {errors.name && <span className="text-xs text-red-500">{errors.name}</span>}
                </label>
                <label className="space-y-1 text-sm text-slate-700">
                  <span className="font-semibold text-slate-900">
                    Kategoria <span className="text-red-500">*</span>
                  </span>
                  <select
                    className={inputClass("category")}
                    value={form.category}
                    onChange={handleChange("category")}
                    disabled={loadingCategories}
                    required
                    aria-required="true"
                  >
                    <option value="">Wybierz kategorię...</option>
                    {categories.map((cat) => (
                      <option key={cat.id} value={cat.name}>
                        {cat.name}
                      </option>
                    ))}
                  </select>
                  <span className="text-xs text-slate-500">Wybierz branżę, aby klienci łatwo Cię znaleźli.</span>
                  {errors.category && <span className="text-xs text-red-500">{errors.category}</span>}
                </label>
              </div>

              <div className="grid gap-4 md:grid-cols-3">
                <label className="space-y-1 text-sm text-slate-700 md:col-span-2">
                  <span className="font-semibold text-slate-900">
                    Adres / miasto <span className="text-red-500">*</span>
                  </span>
                  <input
                    ref={addressInputRef}
                    className={inputClass("address")}
                    placeholder="np. Bahnhofstrasse 1, Zürich"
                    value={form.address}
                    onChange={handleChange("address")}
                    autoComplete="off"
                    required
                    aria-required="true"
                  />
                  <span className="text-xs text-slate-500">
                    Dodaj ulicę i miasto. Autocomplete Google (CH) jeśli podasz NEXT_PUBLIC_GOOGLE_MAPS_KEY.
                  </span>
                  {errors.address && <span className="text-xs text-red-500">{errors.address}</span>}
                  {filteredAddress.length > 0 && !googleKey && (
                    <div className="mt-2 rounded-2xl border border-slate-200 bg-white shadow-sm">
                      {filteredAddress.map((s) => (
                        <button
                          key={s.label}
                          type="button"
                          className="flex w-full items-start justify-between px-3 py-2 text-left text-sm text-slate-700 hover:bg-slate-50"
                          onClick={() => {
                            // Parse address from suggestion
                            const parts = s.label.split(",");
                            const city = parts[parts.length - 1]?.trim() || "";
                            setForm((prev) => ({ ...prev, address: s.label, city, canton: s.canton }));
                            setErrors((prev) => {
                              const { address, ...rest } = prev;
                              return rest;
                            });
                          }}
                        >
                          <span>{s.label}</span>
                          <span className="rounded-full bg-slate-100 px-2 py-0.5 text-[11px] font-semibold text-slate-700">
                            {s.canton}
                          </span>
                        </button>
                      ))}
                    </div>
                  )}
                </label>
              </div>
            </>
          )}

          {step === 1 && (
            <>
              <div className="rounded-2xl bg-slate-50 px-4 py-3 text-sm font-semibold text-slate-800">
                Krok 2: opis i oferta
              </div>
              <label className="space-y-1 text-sm text-slate-700">
                <span className="font-semibold text-slate-900">
                  Opis <span className="text-red-500">*</span>
                </span>
                <textarea
                  value={form.desc}
                  onChange={handleChange("desc")}
                  maxLength={DESC_LIMIT}
                  className={inputClass("desc")}
                  rows={4}
                  placeholder="Krótki opis oferty, usług, specjalizacji"
                  required
                  aria-required="true"
                />
                <div className="flex items-center justify-between text-xs text-slate-500">
                  <span>Najważniejsze informacje, dlaczego warto.</span>
                  <span>{form.desc.length} / {DESC_LIMIT}</span>
                </div>
                {errors.desc && <span className="text-xs text-red-500">{errors.desc}</span>}
              </label>

              <label className="space-y-1 text-sm text-slate-700">
                <span className="font-semibold text-slate-900">
                  Oferta / usługi <span className="text-red-500">*</span>
                </span>
                <textarea
                  value={form.offer}
                  onChange={handleChange("offer")}
                  maxLength={OFFER_LIMIT}
                  className={inputClass("offer")}
                  rows={3}
                  placeholder="Wypunktuj główne usługi"
                  required
                  aria-required="true"
                />
                <div className="flex items-center justify-between text-xs text-slate-500">
                  <span>Podaj kilka kluczowych usług, oddzielając je liniami.</span>
                  <span>{form.offer.length} / {OFFER_LIMIT}</span>
                </div>
                {errors.offer && <span className="text-xs text-red-500">{errors.offer}</span>}
              </label>
            </>
          )}

          {step === 2 && (
            <>
              <div className="rounded-2xl bg-slate-50 px-4 py-3 text-sm font-semibold text-slate-800">
                Krok 3: kontakt i tagi
              </div>
              <div className="grid gap-4 md:grid-cols-3">
                <label className="space-y-1 text-sm text-slate-700">
                  <span className="font-semibold text-slate-900">
                    Telefon <span className="text-red-500">*</span>
                  </span>
                  <input
                    type="tel"
                    className={inputClass("phone")}
                    placeholder="+41 79 123 45 67"
                    value={form.phone}
                    onChange={handleChange("phone")}
                    aria-required="true"
                  />
                </label>
                <label className="space-y-1 text-sm text-slate-700 md:col-span-2">
                  <span className="font-semibold text-slate-900">
                    Email <span className="text-red-500">*</span>
                  </span>
                  <input
                    type="email"
                    className={inputClass("email")}
                    placeholder="kontakt@example.com"
                    value={form.email}
                    onChange={handleChange("email")}
                    aria-required="true"
                  />
                  <span className="text-xs text-slate-500">Podaj telefon <strong>lub</strong> e-mail (przynajmniej jedno jest wymagane).</span>
                  {errors.email && <span className="text-xs text-red-500">{errors.email}</span>}
                  {errors.phone && !errors.email && <span className="text-xs text-red-500">{errors.phone}</span>}
                  {!errors.email && !errors.phone && !form.phone.trim() && !form.email.trim() && (
                    <span className="text-xs text-red-500">Podaj telefon lub e-mail.</span>
                  )}
                </label>
              </div>

              <div className="grid gap-4 md:grid-cols-2">
                <label className="space-y-1 text-sm text-slate-700">
                  <span className="font-semibold text-slate-900">Strona www</span>
                  <input
                    type="url"
                    className={inputClass("website")}
                    placeholder="https://..."
                    value={form.website}
                    onChange={handleChange("website")}
                  />
                  {errors.website && <span className="text-xs text-red-500">{errors.website}</span>}
                </label>
                <div className="grid gap-3 sm:grid-cols-2">
                  <label className="space-y-1 text-sm text-slate-700">
                    <span className="flex items-center gap-2 font-semibold text-slate-900">
                      <svg width="14" height="14" viewBox="0 0 24 24" aria-hidden="true" fill="#1877F2">
                        <path d="M22 12.07C22 6.48 17.52 2 11.93 2 6.34 2 1.86 6.48 1.86 12.07c0 4.97 3.65 9.09 8.42 9.93v-7.02H7.9v-2.91h2.38v-2.22c0-2.35 1.4-3.65 3.54-3.65 1.03 0 2.1.18 2.1.18v2.31h-1.18c-1.16 0-1.52.72-1.52 1.46v1.92h2.59l-.41 2.91h-2.18V22c4.77-.84 8.42-4.96 8.42-9.93z" />
                      </svg>
                      Facebook
                    </span>
                    <input
                      className={inputClass("facebook")}
                      placeholder="https://facebook.com/twoj-profil"
                      value={form.facebook}
                      onChange={handleChange("facebook")}
                    />
                    {errors.facebook && <span className="text-xs text-red-500">{errors.facebook}</span>}
                  </label>
                  <label className="space-y-1 text-sm text-slate-700">
                    <span className="flex items-center gap-2 font-semibold text-slate-900">
                      <svg width="14" height="14" viewBox="0 0 24 24" aria-hidden="true" fill="#E1306C">
                        <path d="M7.75 2h8.5C19.55 2 22 4.45 22 7.75v8.5C22 19.55 19.55 22 16.25 22h-8.5C4.45 22 2 19.55 2 16.25v-8.5C2 4.45 4.45 2 7.75 2zm0 2C5.68 4 4 5.68 4 7.75v8.5C4 18.32 5.68 20 7.75 20h8.5C18.32 20 20 18.32 20 16.25v-8.5C20 5.68 18.32 4 16.25 4h-8.5z" />
                        <path d="M12 7.5A4.5 4.5 0 1 1 7.5 12 4.5 4.5 0 0 1 12 7.5zm0 2A2.5 2.5 0 1 0 14.5 12 2.5 2.5 0 0 0 12 9.5zM17 6.25a1 1 0 1 1-1 1 1 1 0 0 1 1-1z" />
                      </svg>
                      Instagram
                    </span>
                    <input
                      className={inputClass("instagram")}
                      placeholder="https://instagram.com/twoj-profil"
                      value={form.instagram}
                      onChange={handleChange("instagram")}
                    />
                    {errors.instagram && <span className="text-xs text-red-500">{errors.instagram}</span>}
                  </label>
                </div>
              </div>
            </>
          )}

          {step === 3 && (
            <>
              <div className="rounded-2xl bg-slate-50 px-4 py-3 text-sm font-semibold text-slate-800">
                Krok 4: zdjęcia
              </div>
              <div className="space-y-2 rounded-2xl border border-slate-200 bg-white p-4 text-sm text-slate-700">
                <div className="font-semibold text-slate-900">Zdjęcie główne</div>
                <div className="flex items-center gap-3">
                  <div className="h-24 w-32 overflow-hidden rounded-xl border border-slate-200 bg-slate-100">
                    {mainPhoto ? (
                      <img src={mainPhoto} alt="Zdjęcie główne" className="h-full w-full object-cover" />
                    ) : (
                      <div className="flex h-full items-center justify-center text-xs text-slate-500">Brak</div>
                    )}
                  </div>
                  <button
                    type="button"
                    onClick={() => mainPhotoInputRef.current?.click()}
                    className="rounded border border-slate-300 px-3 py-2 text-sm font-semibold text-slate-800 hover:border-primary hover:text-primary"
                  >
                    Wybierz zdjęcie główne
                  </button>
                </div>
                <p className="text-xs text-slate-500">
                  Możesz też kliknąć miniaturę poniżej, aby ustawić ją jako zdjęcie główne.
                </p>
                <input
                  ref={mainPhotoInputRef}
                  type="file"
                  accept="image/*"
                  className="hidden"
                  onChange={(e) => {
                    const file = e.target.files?.[0];
                    if (file && file.type.startsWith("image/")) {
                      if (file.size > 5 * 1024 * 1024) {
                        setUploadError("Zdjęcie główne: max 5MB.");
                        return;
                      }
                      const url = URL.createObjectURL(file);
                      setMainPhoto(url);
                      setUploadError("");
                    }
                  }}
                />
              </div>
              <div
                className="space-y-3 rounded-2xl border border-dashed border-slate-300 bg-slate-50 p-4 text-sm text-slate-700"
                onDragOver={(e) => e.preventDefault()}
                onDrop={onDrop}
              >
                <div className="font-semibold text-slate-900">Zdjęcia dodatkowe</div>
                <p className="text-xs text-slate-600">
                  Przeciągnij i upuść lub kliknij, aby wybrać pliki (jpg/png/webp). Limit: 8 zdjęć, max 5MB.
                  <br />
                  <span className="text-slate-500">Uwaga: Obecnie tylko zdjęcie główne jest zapisywane do backendu. Zdjęcia dodatkowe są w podglądzie.</span>
                </p>
                <div className="flex flex-wrap gap-3">
                  {previews.map((src) => (
                    <div
                      key={src}
                      className={`relative h-20 w-28 overflow-hidden rounded-lg border bg-white shadow-sm ${src === mainPhoto ? "border-primary ring-2 ring-primary/40" : "border-slate-200"
                        }`}
                      onClick={() => setMainPhoto(src)}
                    >
                      <img src={src} alt="podgląd" className="h-full w-full object-cover" loading="lazy" />
                      {src === mainPhoto && (
                        <span className="absolute bottom-1 left-1 rounded-full bg-primary px-2 py-0.5 text-[10px] font-semibold text-white shadow">
                          Główne
                        </span>
                      )}
                      <button
                        type="button"
                        className="absolute right-1 top-1 rounded-full bg-white/90 px-1.5 text-[11px] font-bold text-slate-700 shadow hover:bg-white"
                        onClick={(e) => {
                          e.stopPropagation();
                          setPreviews((prev) => prev.filter((p) => p !== src));
                          if (mainPhoto === src) {
                            setMainPhoto((prev) => (prev === src ? null : prev));
                          }
                        }}
                        aria-label="Usuń zdjęcie"
                      >
                        ×
                      </button>
                    </div>
                  ))}
                  <button
                    type="button"
                    onClick={() => fileInputRef.current?.click()}
                    className="flex h-20 w-28 items-center justify-center rounded-lg border-2 border-dashed border-slate-300 bg-white text-xs font-semibold text-slate-600 hover:border-primary hover:text-primary"
                  >
                    Dodaj +
                  </button>
                </div>
                {uploadError && <div className="text-xs text-red-500">{uploadError}</div>}
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/*"
                  multiple
                  className="hidden"
                  onChange={(e) => handleFiles(e.target.files)}
                />
              </div>
            </>
          )}

          {step === 4 && (
            <>
              <div className="rounded-2xl bg-slate-50 px-4 py-3 text-sm font-semibold text-slate-800">
                Krok 5: podsumowanie
              </div>
              <div className="space-y-4 rounded-2xl border border-slate-200 bg-white p-6">
                <h3 className="text-lg font-semibold text-slate-900">Sprawdź dane przed zapisem</h3>

                <div className="grid gap-4 md:grid-cols-2">
                  <div>
                    <h4 className="text-sm font-semibold text-slate-900 mb-2">Dane podstawowe</h4>
                    <div className="space-y-1 text-sm text-slate-700">
                      <p><strong>Nazwa:</strong> {form.name || "—"}</p>
                      <p><strong>Kategoria:</strong> {form.category || "—"}</p>
                      <p><strong>Adres:</strong> {form.address || "—"}</p>
                      {form.city && <p><strong>Miasto:</strong> {form.city}</p>}
                      {form.canton && <p><strong>Kanton:</strong> {form.canton}</p>}
                    </div>
                  </div>

                  <div>
                    <h4 className="text-sm font-semibold text-slate-900 mb-2">Kontakt</h4>
                    <div className="space-y-1 text-sm text-slate-700">
                      {form.phone && <p><strong>Telefon:</strong> {form.phone}</p>}
                      {form.email && <p><strong>Email:</strong> {form.email}</p>}
                      {form.website && <p><strong>Strona:</strong> <a href={form.website} target="_blank" rel="noopener noreferrer" className="text-primary hover:underline">{form.website}</a></p>}
                      {form.facebook && <p><strong>Facebook:</strong> <a href={form.facebook} target="_blank" rel="noopener noreferrer" className="text-primary hover:underline">Link</a></p>}
                      {form.instagram && <p><strong>Instagram:</strong> <a href={form.instagram} target="_blank" rel="noopener noreferrer" className="text-primary hover:underline">Link</a></p>}
                    </div>
                  </div>
                </div>

                {form.desc && (
                  <div>
                    <h4 className="text-sm font-semibold text-slate-900 mb-2">Opis</h4>
                    <p className="text-sm text-slate-700 whitespace-pre-wrap">{form.desc}</p>
                  </div>
                )}

                {form.offer && (
                  <div>
                    <h4 className="text-sm font-semibold text-slate-900 mb-2">Oferta</h4>
                    <p className="text-sm text-slate-700 whitespace-pre-wrap">{form.offer}</p>
                  </div>
                )}

                <div>
                  <h4 className="text-sm font-semibold text-slate-900 mb-2">Zdjęcia</h4>
                  <div className="flex gap-2">
                    {mainPhoto && (
                      <div className="h-20 w-28 overflow-hidden rounded-lg border border-slate-200">
                        <img src={mainPhoto} alt="Zdjęcie główne" className="h-full w-full object-cover" />
                      </div>
                    )}
                    {previews.map((src, idx) => (
                      <div key={idx} className="h-20 w-28 overflow-hidden rounded-lg border border-slate-200">
                        <img src={src} alt={`Zdjęcie ${idx + 1}`} className="h-full w-full object-cover" />
                      </div>
                    ))}
                    {!mainPhoto && previews.length === 0 && (
                      <p className="text-sm text-slate-500">Brak zdjęć</p>
                    )}
                  </div>
                </div>
              </div>
            </>
          )}

          <div className="flex flex-col-reverse gap-3 pt-1 sm:flex-row sm:justify-between sm:gap-4">
            <div className="flex gap-3">
              <Link href="/" className="rounded-lg border border-slate-300 px-4 py-2 text-sm font-semibold text-slate-800 hover:border-slate-400 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary">
                Anuluj
              </Link>
              <button
                type="button"
                onClick={goPrev}
                disabled={step === 0}
                className="rounded-lg border border-slate-300 px-4 py-2 text-sm font-semibold text-slate-800 shadow-sm hover:border-slate-400 disabled:cursor-not-allowed disabled:opacity-60 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary"
              >
                Wstecz
              </button>
            </div>
            <div className="flex gap-3">
              <button
                type="button"
                onClick={step === steps.length - 1 ? submitForm : handleNext}
                disabled={submitStatus === "loading"}
                className="rounded-lg bg-primary px-4 py-2 text-sm font-semibold text-white shadow-sm hover:bg-red-700 disabled:cursor-not-allowed disabled:opacity-60 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary"
              >
                {step === steps.length - 1
                  ? submitStatus === "loading"
                    ? "Zapisywanie..."
                    : "Zapisz"
                  : "Dalej"}
              </button>
            </div>
          </div>
          {submitStatus === "success" && (
            <div className="rounded-xl border border-green-200 bg-green-50 p-4 space-y-3">
              <div className="flex items-start gap-3">
                <svg className="w-5 h-5 text-green-600 flex-shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                <div className="flex-1">
                  <div className="text-sm font-semibold text-green-900 mb-1">Firma została dodana pomyślnie!</div>
                  <p className="text-xs text-green-700 mb-3">
                    Twoja firma została zapisana i pojawi się w katalogu po weryfikacji.
                  </p>
                  {(createdCompanySlug || createdCompanyId) && (
                    <Link
                      href={`/firma/${createdCompanySlug || createdCompanyId}`}
                      className="inline-flex items-center gap-2 rounded-lg bg-green-600 px-4 py-2 text-sm font-semibold text-white hover:bg-green-700 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-green-600"
                    >
                      Zobacz swoją firmę
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                      </svg>
                    </Link>
                  )}
                </div>
              </div>
            </div>
          )}
          {submitStatus === "error" && (
            <div className="rounded-xl border border-red-200 bg-red-50 p-4">
              <div className="flex items-start gap-3">
                <svg className="w-5 h-5 text-red-600 flex-shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                <div className="flex-1">
                  <div className="text-sm font-semibold text-red-900 mb-1">Nie udało się zapisać firmy</div>
                  <p className="text-xs text-red-700">{submitError || "Wystąpił błąd podczas zapisywania. Spróbuj ponownie."}</p>
                </div>
              </div>
            </div>
          )}
        </form>
      </div>
    </div>
  );
}

