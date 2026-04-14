"use client";

import Link from "next/link";
import Image from "next/image";
import { useEffect, useState, useRef, useCallback } from "react";
import { useRouter } from "next/navigation";
import { MarkerClusterer } from "@googlemaps/markerclusterer";

const basePath = process.env.NEXT_PUBLIC_BASE_PATH || '';

// Google Maps types
declare global {
  interface Window {
    google?: any;
  }
}

const mapboxToken = process.env.NEXT_PUBLIC_MAPBOX_TOKEN;
const googleMapsKey = process.env.NEXT_PUBLIC_GOOGLE_MAPS_KEY;

const MAP_BOUNDS = {
  minLat: 45.5,
  maxLat: 48.5,
  minLng: 5.5,
  maxLng: 11.0
};

const CANTON_COORDS: Record<string, { lat: number; lng: number }> = {
  ZH: { lat: 47.3769, lng: 8.5417 },
  BE: { lat: 46.948, lng: 7.447 },
  GE: { lat: 46.2044, lng: 6.1432 },
  LU: { lat: 47.0502, lng: 8.3093 },
  BS: { lat: 47.5596, lng: 7.5886 },
  ZG: { lat: 47.1662, lng: 8.5155 },
  VD: { lat: 46.5197, lng: 6.6323 }
};

// Define Company type to match backend schema
type Company = {
  id: number;
  name: string;
  slug?: string;
  short_description?: string;
  description?: string;
  offer?: string;
  phone?: string;
  whatsapp?: string;
  email?: string;
  website?: string;
  address?: string;
  city: string;
  canton: string;
  postal_code?: string;
  country: string;
  latitude?: number;
  longitude?: number;
  tags?: string;
  is_verified: boolean;
  is_active: boolean;
  owner_id: number;
  category_id?: number;
  // Computed fields for display
  category?: string;
  rating?: number;
  img?: string;
  is_promoted?: boolean;
  created_at?: number;
  views?: number;
  clicks?: number;
};

type Category = {
  id: number;
  name: string;
  slug: string;
  description?: string;
};

type MapBounds = { north: number; south: number; east: number; west: number };
const DEFAULT_CH_BOUNDS: MapBounds = { north: 48.5, south: 45.5, east: 11.0, west: 5.5 };
const DEFAULT_CENTER = { lat: 46.8, lng: 8.2 };

export default function HomePage() {
  const router = useRouter();
  const [companies, setCompanies] = useState<Company[]>([]);
  const [filteredCompanies, setFilteredCompanies] = useState<Company[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadingCategories, setLoadingCategories] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedCanton, setSelectedCanton] = useState<string>("");
  const [selectedCategory, setSelectedCategory] = useState<number | null>(null);
  const [minRating] = useState<number>(0);
  const [favorites, setFavorites] = useState<number[]>([]);
  const [sortOrder, setSortOrder] = useState<'newest' | 'random' | 'alphabetical'>('random');
  const [currentPage, setCurrentPage] = useState(1);
  const [mapsReady, setMapsReady] = useState(false);
  const [mapBounds, setMapBounds] = useState<MapBounds | null>(DEFAULT_CH_BOUNDS);
  const [isCategoryDropdownOpen, setIsCategoryDropdownOpen] = useState(false);
  const [showMap, setShowMap] = useState(true); // Always show map (changed from false)
  const [isMobile, setIsMobile] = useState(false); // Mobile detection
  const mapRef = useRef<HTMLDivElement>(null);
  const mapInstanceRef = useRef<any>(null);
  const markersRef = useRef<any[]>([]);
  const clustererRef = useRef<MarkerClusterer | null>(null);
  const mapInitializedRef = useRef(false);
  const idleTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const userInteractingRef = useRef(false); // Track if user is interacting with map
  const PAGE_SIZE = 24;
  const apiUrl = process.env.NEXT_PUBLIC_API_URL || "http://127.0.0.1:8000";

  // Impression tracking - batch send viewed company IDs
  const viewedIdsRef = useRef<Set<number>>(new Set());
  const flushTimerRef = useRef<NodeJS.Timeout | null>(null);

  const flushImpressions = useCallback(() => {
    if (viewedIdsRef.current.size === 0) return;
    const ids = Array.from(viewedIdsRef.current);
    viewedIdsRef.current.clear();
    fetch(`${apiUrl}/companies/batch-view`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(ids),
    }).catch(() => {});
  }, [apiUrl]);

  // Flush on unmount or page hide
  useEffect(() => {
    const handleVisibilityChange = () => {
      if (document.hidden) flushImpressions();
    };
    document.addEventListener("visibilitychange", handleVisibilityChange);
    return () => {
      document.removeEventListener("visibilitychange", handleVisibilityChange);
      flushImpressions();
    };
  }, [flushImpressions]);

  const trackImpression = useCallback((companyId: number) => {
    if (viewedIdsRef.current.has(companyId)) return;
    viewedIdsRef.current.add(companyId);
    // Debounce flush - send batch every 3 seconds
    if (flushTimerRef.current) clearTimeout(flushTimerRef.current);
    flushTimerRef.current = setTimeout(flushImpressions, 3000);
  }, [flushImpressions]);

  // Category icons mapping
  const categoryIcons: Record<string, string> = {
    "Beauty": "💄",
    "CV & Tłumaczenia": "📝",
    "Edukacja": "📚",
    "Fotografia": "📸",
    "Gastronomia": "🍽️",
    "Remont": "🔨",
    "Różne": "🌟",
    "Transport": "🚚",
    "Sprzątanie": "🧹",
    "Zdrowie": "⚕️",
    "default": "🏢"
  };

  const goToCompany = (slug?: string, id?: number) => {
    const target = `/firma/${slug || id}`;
    router.push(target); // Next.js router automatycznie dodaje basePath
  };

  const goToAdd = () => {
    router.push(`/dodaj`);
  };

  // Enrich companies with approximate coordinates (based on canton)
  const withCoords = (company: Company) => {
    if (
      company.latitude !== undefined &&
      company.longitude !== undefined &&
      Number.isFinite(company.latitude) &&
      Number.isFinite(company.longitude)
    ) {
      return { ...company, coords: { lat: company.latitude, lng: company.longitude } };
    }
    const coords = CANTON_COORDS[company.canton as keyof typeof CANTON_COORDS];
    if (!coords || !Number.isFinite(coords.lat) || !Number.isFinite(coords.lng)) {
      // Return company without coords instead of null - will be shown in list but not on map
      return { ...company, coords: null };
    }
    return { ...company, coords };
  };

  const isBoundsValid = (b: MapBounds | null) => {
    if (!b) return false;
    const spansOk = (b.north - b.south) < 30 && (b.east - b.west) < 30;
    const inRegion =
      b.north <= 55 && b.south >= 40 && b.east <= 15 && b.west >= 0;
    return Number.isFinite(b.north) && Number.isFinite(b.south) && Number.isFinite(b.east) && Number.isFinite(b.west) && spansOk && inRegion;
  };

  // Base filtered list for list/map (search/category/canton/rating)
  const baseFiltered = companies.filter((c) => {
    // Search
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      const hit =
        (c.name || "").toLowerCase().includes(q) ||
        (c.short_description || "").toLowerCase().includes(q) ||
        (c.description || "").toLowerCase().includes(q) ||
        (c.city || "").toLowerCase().includes(q) ||
        (c.canton || "").toLowerCase().includes(q) ||
        (c.category || "").toLowerCase().includes(q);
      if (!hit) return false;
    }
    // Canton
    if (selectedCanton && c.canton !== selectedCanton) return false;
    // Category
    if (selectedCategory && c.category_id !== selectedCategory) return false;
    // Rating (currently minRating=0, kept for future)
    if (minRating > 0 && (c.rating || 0) < minRating) return false;
    return true;
  });

  // Apply map bounds if valid to keep list == map (but include companies without coords in list)
  const filteredWithBounds = isBoundsValid(mapBounds) && mapsReady
    ? baseFiltered.map(withCoords).filter((enriched) => {
      // Companies without coords are included in list
      if (!enriched.coords) return true;
      const { lat, lng } = enriched.coords;
      return (
        lat <= (mapBounds as MapBounds).north &&
        lat >= (mapBounds as MapBounds).south &&
        lng <= (mapBounds as MapBounds).east &&
        lng >= (mapBounds as MapBounds).west
      );
    })
    : baseFiltered.map(withCoords);

  // Only companies with valid coords go on the map
  const companiesWithCoordsAll = filteredWithBounds
    .filter((c) => c.coords !== null)
    .filter(
      (c): c is Company & { coords: { lat: number; lng: number } } =>
        c.coords !== null && Number.isFinite(c.coords.lat) && Number.isFinite(c.coords.lng)
    );

  const projectToPercent = (lat: number, lng: number) => {
    const latRange = MAP_BOUNDS.maxLat - MAP_BOUNDS.minLat;
    const lngRange = MAP_BOUNDS.maxLng - MAP_BOUNDS.minLng;
    const latPercent = 100 - ((lat - MAP_BOUNDS.minLat) / latRange) * 100;
    const lngPercent = ((lng - MAP_BOUNDS.minLng) / lngRange) * 100;
    return { top: `${latPercent}%`, left: `${lngPercent}%` };
  };

  // Mobile detection
  useEffect(() => {
    const checkMobile = () => {
      const mobile = window.innerWidth < 768;
      setIsMobile(mobile);
    };
    checkMobile();
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

  // Fetch companies with stale-while-revalidate caching
  useEffect(() => {
    const CACHE_TTL = 5 * 60 * 1000; // 5 minutes

    const getCached = <T,>(key: string): T | null => {
      try {
        const raw = localStorage.getItem(key);
        if (!raw) return null;
        const { data, ts } = JSON.parse(raw);
        if (Date.now() - ts > CACHE_TTL) return null;
        return data as T;
      } catch { return null; }
    };

    const setCache = <T,>(key: string, data: T) => {
      try { localStorage.setItem(key, JSON.stringify({ data, ts: Date.now() })); } catch {}
    };

    // Show cached data immediately
    const cachedCompanies = getCached<Company[]>('swr_companies');
    const cachedCategories = getCached<Category[]>('swr_categories');
    const cachedSortOrder = getCached<"newest" | "random" | "alphabetical">('swr_sort_order');

    if (cachedCompanies && cachedCompanies.length > 0) {
      setCompanies(cachedCompanies);
      setFilteredCompanies(cachedCompanies);
      setLoading(false);
    }
    if (cachedCategories) {
      setCategories(cachedCategories);
      setLoadingCategories(false);
    }
    if (cachedSortOrder) {
      setSortOrder(cachedSortOrder);
    }

    // Fetch fresh data in background
    const fetchData = async () => {
      try {
        const res = await fetch(`${apiUrl}/companies/`);
        if (!res.ok) throw new Error(`HTTP error! status: ${res.status}`);
        const data = await res.json();
        const companiesList: Company[] = Array.isArray(data) ? data : (data.companies || []);
        setCompanies(companiesList);
        setFilteredCompanies(companiesList);
        setCache('swr_companies', companiesList);
      } catch (e: any) {
        if (!cachedCompanies) setError(e.message);
      } finally {
        setLoading(false);
      }

      try {
        const res = await fetch(`${apiUrl}/categories/`);
        if (!res.ok) throw new Error(`HTTP error! status: ${res.status}`);
        const data: Category[] = await res.json();
        setCategories(data);
        setCache('swr_categories', data);
      } catch (e: any) {
        console.error("Failed to fetch categories:", e);
      } finally {
        setLoadingCategories(false);
      }

      try {
        const res = await fetch(`${apiUrl}/settings`);
        if (res.ok) {
          const settings = await res.json();
          const order = settings.sort_order || 'random';
          setSortOrder(order);
          setCache('swr_sort_order', order);
        }
      } catch (e) {
        console.error("Failed to fetch settings:", e);
      }
    };

    fetchData();
  }, [apiUrl]);

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

  // Get unique cantons and categories for filters
  const cantons = Array.from(new Set(companies.map((c) => c.canton).filter(Boolean))).sort();

  // Load Google Maps API script with delay for better performance
  // List loads immediately, map loads 2 seconds later
  useEffect(() => {
    if (!googleMapsKey || typeof window === "undefined") return;
    if (window.google?.maps) {
      setMapsReady(true);
      return;
    }

    // Delay map loading to prioritize list rendering (especially on mobile)
    const delayTimer = setTimeout(() => {
      const script = document.createElement("script");
      script.src = `https://maps.googleapis.com/maps/api/js?key=${googleMapsKey}`;
      script.async = true;
      script.defer = true;
      script.onload = () => setMapsReady(true);
      script.onerror = () => console.error("Failed to load Google Maps API");
      document.head.appendChild(script);
    }, 2000); // 2 second delay - list shows immediately, map loads after

    return () => clearTimeout(delayTimer);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Initialize Google Maps with markers
  useEffect(() => {
    if (!mapsReady || !mapRef.current || !window.google?.maps || companiesWithCoordsAll.length === 0) return;

    // Initialize map
    if (!mapInstanceRef.current) {
      mapInstanceRef.current = new window.google.maps.Map(mapRef.current, {
        center: DEFAULT_CENTER,
        zoom: 7,
        mapTypeId: window.google.maps.MapTypeId.ROADMAP,
        disableDefaultUI: false,
        zoomControl: true,
        mapTypeControl: false,
        scaleControl: true,
        streetViewControl: false,
        rotateControl: false,
        fullscreenControl: true,
      });
    }

    const map = mapInstanceRef.current;

    // Clear existing clusterer and markers
    if (clustererRef.current) {
      clustererRef.current.clearMarkers();
      clustererRef.current = null;
    }
    markersRef.current.forEach((marker) => marker.setMap(null));
    markersRef.current = [];

    // Create custom marker icon (red pin with white border)
    const createMarkerIcon = () => {
      // Use a custom SVG icon for better appearance
      const svgIcon = `
        <svg width="32" height="40" viewBox="0 0 32 40" xmlns="http://www.w3.org/2000/svg">
          <path d="M16 0C10.48 0 6 4.48 6 10c0 5.4 8.5 18 10 18s10-12.6 10-18c0-5.52-4.48-10-10-10z" fill="#dc2626" stroke="#ffffff" stroke-width="2"/>
          <circle cx="16" cy="10" r="4" fill="#ffffff"/>
        </svg>
      `;

      return {
        url: `data:image/svg+xml;charset=UTF-8,${encodeURIComponent(svgIcon)}`,
        scaledSize: new window.google.maps.Size(32, 40),
        anchor: new window.google.maps.Point(16, 40),
      };
    };

    // Add markers for each company
    companiesWithCoordsAll.forEach((company) => {
      const marker = new window.google.maps.Marker({
        position: { lat: company.coords.lat, lng: company.coords.lng },
        map: null, // Don't add directly to map, clusterer will handle it
        title: company.name,
        icon: createMarkerIcon(),
        animation: window.google.maps.Animation.DROP,
      });

      marker.addListener("click", () => {
        goToCompany(company.slug, company.id);
      });

      markersRef.current.push(marker);
    });

    // Create marker clusterer with custom renderer
    if (markersRef.current.length > 0) {
      // Custom cluster renderer with click handler
      const renderClusterWithClick = ({ count, position }: { count: number; position: any }) => {
        const color = count > 10 ? "#dc2626" : count > 5 ? "#f97316" : "#3b82f6";
        const size = count > 10 ? 56 : count > 5 ? 50 : 44;

        const clusterMarker = new window.google.maps.Marker({
          position,
          icon: {
            url: `data:image/svg+xml;charset=UTF-8,${encodeURIComponent(`
              <svg width="${size}" height="${size}" viewBox="0 0 ${size} ${size}" xmlns="http://www.w3.org/2000/svg">
                <circle cx="${size / 2}" cy="${size / 2}" r="${size / 2 - 3}" fill="${color}" stroke="#ffffff" stroke-width="3"/>
                <text x="${size / 2}" y="${size / 2}" font-family="Arial, sans-serif" font-size="${count > 10 ? 16 : 14}" font-weight="bold" fill="white" text-anchor="middle" dominant-baseline="central">${count}</text>
              </svg>
            `)}`,
            scaledSize: new window.google.maps.Size(size, size),
            anchor: new window.google.maps.Point(size / 2, size / 2),
          },
          zIndex: Number(window.google.maps.Marker.MAX_ZINDEX) + count,
        });

        // Add click handler to cluster marker
        clusterMarker.addListener("click", () => {
          // Find markers in this cluster
          const clusterMarkers = markersRef.current.filter(m => {
            const mPos = m.getPosition();
            const cPos = clusterMarker.getPosition();
            if (!mPos || !cPos) return false;
            // Check if marker is close to cluster position (within ~0.1 degrees)
            const latDiff = Math.abs(mPos.lat() - cPos.lat());
            const lngDiff = Math.abs(mPos.lng() - cPos.lng());
            return latDiff < 0.1 && lngDiff < 0.1;
          });

          if (clusterMarkers.length === 1) {
            // Single marker - go to company page
            const marker = clusterMarkers[0];
            const company = companiesWithCoordsAll.find(c => {
              const mPos = marker.getPosition();
              return mPos && Math.abs(mPos.lat() - c.coords.lat) < 0.01 && Math.abs(mPos.lng() - c.coords.lng) < 0.01;
            });
            if (company) {
              goToCompany(company.slug, company.id);
            }
          } else {
            // Multiple markers - zoom in but limit max zoom
            const bounds = new window.google.maps.LatLngBounds();
            clusterMarkers.forEach((marker) => {
              const pos = marker.getPosition();
              if (pos) bounds.extend(pos);
            });

            // Fit bounds with padding
            map.fitBounds(bounds, {
              top: 50,
              right: 50,
              bottom: 50,
              left: 50,
            });

            // Limit zoom to max level 13
            setTimeout(() => {
              const currentZoom = map.getZoom() || 7;
              if (currentZoom > 13) {
                map.setZoom(13);
              }
            }, 100);
          }
        });

        return clusterMarker;
      };

      clustererRef.current = new MarkerClusterer({
        map: map,
        markers: markersRef.current,
        renderer: {
          render: renderClusterWithClick,
        },
        algorithmOptions: {
          maxZoom: 13, // Maksymalny zoom dla klastrów - nie będzie grupować powyżej zoom 13
        },
      });

      // Listen for zoom changes to prevent over-zooming when clicking clusters
      map.addListener("zoom_changed", () => {
        const currentZoom = map.getZoom() || 7;
        if (currentZoom > 13) {
          map.setZoom(13);
        }
      });

      // Track user interactions to enable bounds sync only after user action
      map.addListener("dragstart", () => {
        userInteractingRef.current = true;
      });

      map.addListener("zoom_changed", () => {
        // Only set interacting flag if map is already initialized (user zoom, not programmatic)
        if (mapInitializedRef.current) {
          userInteractingRef.current = true;
        }
      });

      // Sync map bounds to filter list only when user interacts
      map.addListener("idle", () => {
        if (!userInteractingRef.current) return; // Skip if programmatic change

        if (idleTimeoutRef.current) {
          clearTimeout(idleTimeoutRef.current);
        }
        idleTimeoutRef.current = setTimeout(() => {
          const bounds = map.getBounds();
          if (!bounds) return;
          const json = bounds.toJSON();
          const next = {
            north: json.north,
            south: json.south,
            east: json.east,
            west: json.west,
          };
          if (isBoundsValid(next)) {
            setMapBounds(next);
          }
          userInteractingRef.current = false; // Reset after processing
        }, 300);
      });
      // Fit bounds only once on init to avoid bouncing on user zoom/pan
      if (!mapInitializedRef.current) {
        const bounds = new window.google.maps.LatLngBounds();
        markersRef.current.forEach((marker) => {
          const pos = marker.getPosition();
          if (pos) bounds.extend(pos);
        });
        if (!bounds.isEmpty()) {
          const padding = { top: 50, right: 50, bottom: 50, left: 50 };
          map.fitBounds(bounds, padding);
        } else {
          map.setCenter(DEFAULT_CENTER);
          map.setZoom(7);
        }
        mapInitializedRef.current = true;
      }
    } else {
      // No markers: reset to Switzerland view
      map.setCenter(DEFAULT_CENTER);
      map.setZoom(7);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [mapsReady, companies.length, selectedCategory, searchQuery, selectedCanton, router]);

  useEffect(() => {
    return () => {
      if (idleTimeoutRef.current) {
        clearTimeout(idleTimeoutRef.current);
      }
    };
  }, []);

  // Filter and sort companies
  useEffect(() => {
    // Stable ordering: promoted first, then by rating desc, then name
    const sorted = [...filteredWithBounds].sort((a, b) => {
      if (a.is_promoted && !b.is_promoted) return -1;
      if (!a.is_promoted && b.is_promoted) return 1;
      const ra = a.rating || 0;
      const rb = b.rating || 0;
      if (rb !== ra) return rb - ra;
      return a.name.localeCompare(b.name, "pl");
    });

    setFilteredCompanies(sorted);
    setCurrentPage(1);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [companies, searchQuery, selectedCanton, selectedCategory, minRating, mapBounds, mapsReady]);

  const totalPages = Math.max(1, Math.ceil(filteredCompanies.length / PAGE_SIZE));

  // Apply sorting based on admin settings
  // Separate promoted and non-promoted companies
  const promotedCompanies = filteredCompanies.filter(c => c.is_promoted);
  const regularCompanies = filteredCompanies.filter(c => !c.is_promoted);

  // Apply sorting to each group separately
  if (sortOrder === 'newest') {
    promotedCompanies.sort((a, b) => (b.created_at || 0) - (a.created_at || 0));
    regularCompanies.sort((a, b) => (b.created_at || 0) - (a.created_at || 0));
  } else if (sortOrder === 'alphabetical') {
    promotedCompanies.sort((a, b) => a.name.localeCompare(b.name, 'pl'));
    regularCompanies.sort((a, b) => a.name.localeCompare(b.name, 'pl'));
  } else if (sortOrder === 'random') {
    // Fisher-Yates shuffle for promoted companies
    for (let i = promotedCompanies.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [promotedCompanies[i], promotedCompanies[j]] = [promotedCompanies[j], promotedCompanies[i]];
    }
    // Fisher-Yates shuffle for regular companies
    for (let i = regularCompanies.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [regularCompanies[i], regularCompanies[j]] = [regularCompanies[j], regularCompanies[i]];
    }
  }

  // Combine: promoted companies first, then regular companies
  const sortedCompanies = [...promotedCompanies, ...regularCompanies];

  const paginatedCompanies = sortedCompanies.slice(
    (currentPage - 1) * PAGE_SIZE,
    currentPage * PAGE_SIZE
  );

  return (
    <div className="mx-auto max-w-7xl px-4 py-12 space-y-24 sm:px-6 lg:px-8">
      {/* Loading handled by skeleton cards below */}

      {/* HERO */}
      <section className="relative overflow-hidden rounded-4xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-2xl transition-all duration-500">
        <div className="absolute top-0 right-0 -mr-20 -mt-20 w-96 h-96 bg-primary/5 rounded-full blur-3xl" />
        <div className="absolute bottom-0 left-0 -ml-20 -mb-20 w-96 h-96 bg-primary/5 rounded-full blur-3xl" />

        <div className="relative grid gap-12 p-8 md:p-12 lg:grid-cols-[1.2fr,1fr] items-center">
          <div className="space-y-8 animate-fade-in">
            <h1 className="text-4xl font-black tracking-tight text-slate-900 dark:text-white sm:text-5xl lg:text-6xl leading-[1.1]">
              Znajdź <span className="bg-gradient-to-r from-primary to-primary-dark bg-clip-text text-transparent">sprawdzone</span> firmy w Szwajcarii
            </h1>
            <p className="text-lg text-slate-600 dark:text-slate-400 leading-relaxed max-w-2xl">
              {loading ? "Największa baza" : <><span className="font-bold text-primary">{filteredCompanies.length}</span></>} polskich usług w bazie. Przeglądaj na mapie i filtruj po branży. Dołącz do największej społeczności polskich przedsiębiorców w Szwajcarii.
            </p>
            <div className="flex flex-wrap gap-4">
              <Link
                href="/dodaj"
                onClick={(e) => {
                  e.preventDefault();
                  goToAdd();
                }}
                className="rounded-2xl bg-primary px-8 py-4 font-bold text-white shadow-xl shadow-primary/20 hover:bg-primary-dark transition-all hover:scale-105 active:scale-95 flex items-center gap-2"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" /></svg>
                Dodaj usługę za darmo
              </Link>
            </div>
          </div>

          {/* MAPA - Interactive Map */}
          <div id="mapa" className="relative h-[500px] overflow-hidden rounded-3xl border-2 border-slate-200 dark:border-slate-700 shadow-2xl group transition-all duration-500 hover:shadow-primary/20">
            {googleMapsKey ? (
              <div ref={mapRef} className="h-full w-full" aria-label="Mapa firm na Google Maps" />
            ) : (
              <div className="flex items-center justify-center h-full bg-gradient-to-br from-slate-50 to-slate-100 dark:from-slate-800 dark:to-slate-900">
                <div className="text-center">
                  <svg className="w-16 h-16 mx-auto mb-3 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 20l-5.447-2.724A1 1 0 013 16.382V5.618a1 1 0 011.447-.894L9 7m0 13l6-3m-6 3V7m6 10l4.553 2.276A1 1 0 0021 18.382V7.618a1 1 0 00-.553-.894L15 4m0 13V4m0 0L9 7" />
                  </svg>
                  <p className="text-slate-500 dark:text-slate-400 font-medium">Mapa wymaga klucza API</p>
                </div>
              </div>
            )}
          </div>
        </div>
      </section>

      {/* LISTA FIRM */}
      <section id="oferty" className="space-y-8">
        {/* Search and Category Filter - responsive row */}
        <div className="flex flex-col sm:flex-row sm:items-center gap-3 sm:gap-4">
          {/* Category Dropdown */}
          <div className="relative flex-shrink-0">
            <button
              onClick={() => setIsCategoryDropdownOpen(!isCategoryDropdownOpen)}
              className="group flex items-center gap-3 rounded-2xl border-2 border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 px-5 py-3 text-sm font-bold text-slate-800 dark:text-slate-200 hover:border-primary/50 focus:border-primary focus:ring-4 focus:ring-primary/10 outline-none cursor-pointer transition-all shadow-sm hover:shadow-md w-full sm:w-auto sm:min-w-[200px]"
            >
              <span className="text-lg">
                {selectedCategory
                  ? (categoryIcons[categories.find(c => c.id === selectedCategory)?.name || ""] || categoryIcons.default)
                  : categoryIcons.default
                }
              </span>
              <span className="flex-1 text-left">
                {selectedCategory
                  ? categories.find(c => c.id === selectedCategory)?.name
                  : "Wszystkie branże"
                }
              </span>
              <svg
                className={`w-4 h-4 text-slate-400 transition-transform duration-300 ${isCategoryDropdownOpen ? 'rotate-180' : ''}`}
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
              </svg>
            </button>

            {isCategoryDropdownOpen && (
              <>
                {/* Backdrop to close dropdown */}
                <div
                  className="fixed inset-0 z-10"
                  onClick={() => setIsCategoryDropdownOpen(false)}
                />

                {/* Dropdown menu */}
                <div className="absolute z-20 mt-2 w-full min-w-[280px] rounded-2xl border-2 border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 shadow-2xl overflow-hidden animate-fade-in">
                  <div className="max-h-[400px] overflow-y-auto custom-scrollbar">
                    {/* All categories option */}
                    <button
                      onClick={() => {
                        setSelectedCategory(null);
                        setIsCategoryDropdownOpen(false);
                      }}
                      className={`w-full flex items-center gap-3 px-6 py-3 text-left text-sm font-bold transition-all hover:bg-primary/10 ${!selectedCategory
                        ? 'bg-primary/20 text-primary dark:text-primary-light'
                        : 'text-slate-700 dark:text-slate-300'
                        }`}
                    >
                      <span className="text-xl">{categoryIcons.default}</span>
                      <span className="flex-1">Wszystkie branże</span>
                      {!selectedCategory && (
                        <svg className="w-5 h-5 text-primary" fill="currentColor" viewBox="0 0 20 20">
                          <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                        </svg>
                      )}
                    </button>

                    {/* Divider */}
                    <div className="border-t border-slate-200 dark:border-slate-700" />

                    {/* Category options */}
                    {categories.map((cat) => (
                      <button
                        key={cat.id}
                        onClick={() => {
                          setSelectedCategory(cat.id);
                          setIsCategoryDropdownOpen(false);
                        }}
                        className={`w-full flex items-center gap-3 px-6 py-3 text-left text-sm font-bold transition-all hover:bg-primary/10 ${selectedCategory === cat.id
                          ? 'bg-primary/20 text-primary dark:text-primary-light'
                          : 'text-slate-700 dark:text-slate-300'
                          }`}
                      >
                        <span className="text-xl">{categoryIcons[cat.name] || categoryIcons.default}</span>
                        <span className="flex-1">{cat.name}</span>
                        <span className="text-xs font-normal text-slate-400 bg-slate-100 dark:bg-slate-700 px-2 py-0.5 rounded-full">{companies.filter(c => c.category_id === cat.id).length}</span>
                        {selectedCategory === cat.id && (
                          <svg className="w-5 h-5 text-primary" fill="currentColor" viewBox="0 0 20 20">
                            <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                          </svg>
                        )}
                      </button>
                    ))}
                  </div>
                </div>
              </>
            )}
          </div>

          {/* Search Bar - narrower on desktop */}
          <div className="relative w-full sm:w-80 md:w-96 group">
            <div className="absolute inset-y-0 left-0 flex items-center pl-4 pointer-events-none text-slate-400 group-focus-within:text-primary transition-colors">
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" /></svg>
            </div>
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Szukaj..."
              className="w-full pl-10 pr-4 py-3 rounded-2xl border-2 border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-base font-medium focus:border-primary focus:ring-4 focus:ring-primary/10 transition-all outline-none dark:text-white"
            />
          </div>

          {/* Results count - pushed to right on desktop */}
          {!loading && (
            <div className="hidden md:flex items-center gap-2 ml-auto text-sm text-slate-500">
              <span className="font-bold text-primary">{filteredCompanies.length}</span>
              <span>wyników</span>
            </div>
          )}
        </div>
        {loading ? (
          <div className="grid gap-8 sm:grid-cols-2 lg:grid-cols-3">
            {[...Array(6)].map((_, i) => (
              <div
                key={i}
                className="group flex flex-col overflow-hidden rounded-4xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-sm animate-pulse"
              >
                <div className="relative h-60 bg-slate-200 dark:bg-slate-800" />
                <div className="flex flex-1 flex-col p-6 space-y-4">
                  <div className="flex items-start justify-between gap-4">
                    <div className="h-7 bg-slate-200 dark:bg-slate-800 rounded-lg w-3/4" />
                    <div className="h-7 w-12 bg-slate-200 dark:bg-slate-800 rounded-lg shrink-0" />
                  </div>
                  <div className="h-4 bg-slate-200 dark:bg-slate-800 rounded-lg w-1/2" />
                  <div className="space-y-2">
                    <div className="h-4 bg-slate-200 dark:bg-slate-800 rounded-lg w-full" />
                    <div className="h-4 bg-slate-200 dark:bg-slate-800 rounded-lg w-4/5" />
                  </div>
                  <div className="pt-4 mt-auto border-t border-slate-100 dark:border-slate-800">
                    <div className="h-4 bg-slate-200 dark:bg-slate-800 rounded-lg w-1/3" />
                  </div>
                </div>
              </div>
            ))}
          </div>
        ) : filteredCompanies.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 text-center rounded-4xl border-2 border-dashed border-slate-200 dark:border-slate-800">
            <div className="bg-slate-100 dark:bg-slate-800 p-4 rounded-3xl mb-4">
              <svg className="w-12 h-12 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9.172 9.172a4 4 0 015.656 0M9 10h.01M15 10h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
            </div>
            <h3 className="text-xl font-bold text-slate-900 dark:text-white">Nie znaleziono polskich usług</h3>
            <p className="text-slate-500 mt-2 max-w-xs">Zmień filtry lub spróbuj innego wyszukiwania.</p>
            <button onClick={() => { setSearchQuery(""); setSelectedCategory(null); }} className="mt-6 font-bold text-primary hover:underline">Wyczyść wszystkie filtry</button>
          </div>
        ) : (
          <div className="space-y-12">
            <div className="grid gap-8 sm:grid-cols-2 lg:grid-cols-3">
              {paginatedCompanies.map((item) => {
                const categoryName = categories.find(c => c.id === item.category_id)?.name || item.category || "Inne";
                return (
                  <Link
                    key={item.id}
                    href={`/firma/${item.slug || item.id}`}
                    onClick={(e) => {
                      e.preventDefault();
                      goToCompany(item.slug, item.id);
                    }}
                    ref={(el) => {
                      if (!el) return;
                      const observer = new IntersectionObserver(
                        ([entry]) => {
                          if (entry.isIntersecting) {
                            trackImpression(item.id);
                            observer.disconnect();
                          }
                        },
                        { threshold: 0.5 }
                      );
                      observer.observe(el);
                    }}
                    className={`group flex flex-col overflow-hidden rounded-4xl border bg-white dark:bg-slate-900 shadow-sm hover:shadow-2xl hover-lift transition-all duration-500 ${item.is_promoted
                      ? "border-yellow-400 ring-2 ring-yellow-400/50 shadow-yellow-100"
                      : "border-slate-200 dark:border-slate-800 hover:border-primary/20"
                      }`}
                  >
                    <div className="relative h-60 overflow-hidden">
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img
                        src={item.img || "/default-company.png"}
                        alt={item.name}
                        className="h-full w-full object-contain transition-transform duration-700 group-hover:scale-110"
                        loading="lazy"
                      />
                      <div className="absolute inset-0 bg-gradient-to-t from-slate-900/60 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
                      <div className="absolute top-4 left-4 flex gap-2">
                        {item.is_promoted && (
                          <span className="bg-yellow-400 text-yellow-900 py-1.5 px-3 rounded-xl text-[10px] font-bold uppercase tracking-wider">
                            ⭐ Promowana
                          </span>
                        )}
                        <span className="glass py-1.5 px-3 rounded-xl text-[10px] font-bold text-slate-900 dark:text-white uppercase tracking-wider backdrop-blur-md">
                          {categoryName}
                        </span>
                      </div>

                    </div>

                    <div className="flex flex-1 flex-col p-6 space-y-4">
                      <div className="flex items-start justify-between gap-4">
                        <h3 className="text-xl font-bold text-slate-900 dark:text-white group-hover:text-primary transition-colors leading-tight line-clamp-2">
                          {item.name}
                        </h3>
                        {item.rating && (
                          <div className="flex items-center gap-1 shrink-0 rounded-lg bg-green-50 dark:bg-green-900/30 px-2 py-1 text-green-700 dark:text-green-400 font-bold text-sm">
                            ★ {item.rating.toFixed(1)}
                          </div>
                        )}
                      </div>
                      {(item.city || item.canton || item.address) && (
                        <div className="flex items-center gap-2 text-sm text-slate-500 dark:text-slate-400">
                          <svg className="w-4 h-4 text-primary" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" /></svg>
                          {[item.city, item.canton].filter(Boolean).join(", ") || item.address}
                        </div>
                      )}
                      <p className="text-sm text-slate-600 dark:text-slate-400 line-clamp-2 leading-relaxed">
                        {item.short_description || (item.description || "").replace(/<[^>]*>/g, '') || "Brak opisu firmy w katalogu."}
                      </p>

                      <div className="pt-4 mt-auto border-t border-slate-100 dark:border-slate-800 flex justify-between items-center group/btn">
                        <div className="flex items-center gap-3">
                          <span className="text-sm font-bold text-slate-900 dark:text-white group-hover:text-primary transition-colors">Zobacz szczegóły</span>
                          {(item.views || 0) > 0 && (
                            <span className="flex items-center gap-1 text-xs text-slate-400">
                              <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" /></svg>
                              {item.views}
                            </span>
                          )}
                        </div>
                        <div className="h-8 w-8 rounded-full bg-slate-50 dark:bg-slate-800 flex items-center justify-center text-slate-400 group-hover/btn:bg-primary group-hover/btn:text-white transition-all transform group-hover/btn:translate-x-1">
                          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" /></svg>
                        </div>
                      </div>
                    </div>
                  </Link>
                );
              })}
            </div>

            {/* PAGINACJA */}
            {totalPages > 1 && (
              <div className="flex items-center justify-center gap-2 pt-8">
                <button
                  type="button"
                  onClick={() => { setCurrentPage((p) => Math.max(1, p - 1)); document.getElementById('oferty')?.scrollIntoView({ behavior: 'smooth' }); }}
                  disabled={currentPage === 1}
                  className="p-3 rounded-2xl border border-slate-200 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-800 disabled:opacity-30 transition-all"
                >
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" /></svg>
                </button>
                <div className="flex flex-wrap gap-2 justify-center">
                  {[...Array(totalPages)].map((_, i) => (
                    <button
                      key={i}
                      onClick={() => { setCurrentPage(i + 1); document.getElementById('oferty')?.scrollIntoView({ behavior: 'smooth' }); }}
                      className={`h-11 w-11 rounded-2xl font-bold transition-all ${currentPage === i + 1 ? 'bg-primary text-white shadow-lg shadow-primary/20 scale-110' : 'bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-400 hover:border-primary/50'}`}
                    >
                      {i + 1}
                    </button>
                  ))}
                </div>
                <button
                  type="button"
                  onClick={() => { setCurrentPage((p) => Math.min(totalPages, p + 1)); document.getElementById('oferty')?.scrollIntoView({ behavior: 'smooth' }); }}
                  disabled={currentPage === totalPages}
                  className="p-3 rounded-2xl border border-slate-200 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-800 disabled:opacity-30 transition-all"
                >
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" /></svg>
                </button>
              </div>
            )}
          </div>
        )}
      </section>

      {/* CTA SECTION */}
      <section className="animate-slide-up">
        <div className="relative overflow-hidden rounded-4xl bg-primary px-8 py-16 dark:bg-primary/90">
          <div className="absolute top-0 left-0 w-full h-full bg-[url('https://www.transparenttextures.com/patterns/carbon-fibre.png')] opacity-10" />
          <div className="relative z-10 flex flex-col lg:flex-row items-center justify-between gap-12 text-center lg:text-left">
            <div className="space-y-4">
              <h2 className="text-4xl font-extrabold text-white">Rozwijaj swój biznes z nami</h2>
              <p className="text-xl text-white/80 max-w-lg">
                Dodaj swoją usługę do katalogu i dotrzyj do tysięcy Polaków mieszkających w Szwajcarii.
              </p>
            </div>
            <div className="flex flex-col sm:flex-row gap-6">
              <Link
                href="/dodaj"
                onClick={(e) => {
                  e.preventDefault();
                  goToAdd();
                }}
                className="rounded-2xl bg-white px-10 py-5 text-lg font-bold text-primary shadow-2xl transition-all hover:scale-105 active:scale-95"
              >
                + Dodaj swoją usługę za darmo
              </Link>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}

