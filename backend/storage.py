from __future__ import annotations

import json
import logging
import re
import threading
import time
import secrets
from pathlib import Path
from typing import Any, Optional
import unicodedata

from .geocoding import geocode_address, build_full_address
from .settings import get_settings

logger = logging.getLogger(__name__)


BASE_DIR = Path(__file__).resolve().parent
DATA_DIR = BASE_DIR / "data"

USERS_FILE = DATA_DIR / "users.json"
CATEGORIES_FILE = DATA_DIR / "categories.json"
COMPANIES_FILE = DATA_DIR / "companies.json"
REVIEWS_FILE = DATA_DIR / "reviews.json"
REPORTS_FILE = DATA_DIR / "reports.json"
STATS_FILE = DATA_DIR / "stats.json"

_lock = threading.RLock()  # Reentrant lock - allows nested locks


def _now_ts() -> float:
    return time.time()


def _ensure_file(path: Path, default_value: Any) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)
    if not path.exists():
        path.write_text(json.dumps(default_value, ensure_ascii=False, indent=2), encoding="utf-8")


def init_storage() -> None:
    """
    Initializes JSON "DB" files in backend/data/.
    This mirrors the idea from the `react` repo (file-based persistence).
    """
    _ensure_file(USERS_FILE, [])
    _ensure_file(COMPANIES_FILE, [])
    _ensure_file(REVIEWS_FILE, [])
    _ensure_file(REPORTS_FILE, [])
    _ensure_file(STATS_FILE, [])

    # Seed categories only if file doesn't exist yet (or is empty)
    _ensure_file(CATEGORIES_FILE, [])
    cats = _read_list(CATEGORIES_FILE)
    if not cats:
        seed = [
            {"id": 1, "name": "Budownictwo", "slug": "budownictwo", "description": "Remonty, wykończenia, budowa."},
            {"id": 2, "name": "Transport", "slug": "transport", "description": "Przeprowadzki, przewozy, logistyka."},
            {"id": 3, "name": "Zdrowie", "slug": "zdrowie", "description": "Lekarze, fizjo, usługi zdrowotne."},
            {"id": 4, "name": "Finanse", "slug": "finanse", "description": "Księgowość, podatki, ubezpieczenia."},
            {"id": 5, "name": "Gastronomia", "slug": "gastronomia", "description": "Restauracje, catering, piekarnie."},
            {"id": 6, "name": "IT", "slug": "it", "description": "Strony www, aplikacje, serwis komputerów."},
            {"id": 7, "name": "Edukacja", "slug": "edukacja", "description": "Korepetycje, kursy językowe, szkolenia."},
            {"id": 8, "name": "Beauty & Wellness", "slug": "beauty-wellness", "description": "Salony fryzjerskie, spa, wellness."},
            {"id": 9, "name": "Nieruchomości", "slug": "nieruchomosci", "description": "Agencje nieruchomości, zarządzanie."},
            {"id": 10, "name": "Prawo", "slug": "prawo", "description": "Kancelarie prawne, doradztwo prawne."},
        ]
        _write_list(CATEGORIES_FILE, seed)

    # Seed dummy companies if file is empty
    companies = _read_list(COMPANIES_FILE)
    if not companies:
        demo_user = get_or_create_demo_user()
        # Map category names to category_ids (assuming categories were seeded)
        cat_map = {}
        for cat in cats:
            name_lower = (cat.get("name") or "").lower()
            if "budownictwo" in name_lower or "budowa" in name_lower:
                cat_map["Budownictwo"] = cat.get("id")
            elif "transport" in name_lower or "logistyka" in name_lower:
                cat_map["Transport"] = cat.get("id")
            elif "zdrowie" in name_lower:
                cat_map["Zdrowie"] = cat.get("id")
            elif "finanse" in name_lower or "podatki" in name_lower:
                cat_map["Finanse"] = cat.get("id")
            elif "gastronomia" in name_lower:
                cat_map["Gastronomia"] = cat.get("id")
            elif "it" in name_lower or "software" in name_lower:
                cat_map["IT"] = cat.get("id")
            elif "edukacja" in name_lower:
                cat_map["Edukacja"] = cat.get("id")
            elif "beauty" in name_lower or "wellness" in name_lower:
                cat_map["Beauty & Wellness"] = cat.get("id")
            elif "nieruchomosci" in name_lower:
                cat_map["Nieruchomości"] = cat.get("id")
            elif "prawo" in name_lower:
                cat_map["Prawo"] = cat.get("id")
        
        seed_companies = [
            {
                "id": 1,
                "name": "Pol-Bud CH",
                "description": "Remonty, wykończenia, instalacje. Polsko-szwajcarska ekipa z wieloletnim doświadczeniem.",
                "offer": "Remonty mieszkań i domów, wykończenia wnętrz, instalacje elektryczne i hydrauliczne. Prace wykończeniowe, malowanie, układanie płytek.",
                "phone": "+41 44 123 45 67",
                "email": "kontakt@polbud-ch.ch",
                "website": "https://polbud-ch.ch",
                "address": "Bahnhofstrasse 10, Zürich",
                "city": "Zürich",
                "canton": "ZH",
                "postal_code": "8001",
                "country": "Switzerland",
                "category_id": cat_map.get("Budownictwo"),
                "owner_id": int(demo_user["id"]),
                "is_active": True,
                "is_verified": False,
                "img": "https://images.unsplash.com/photo-1503389152951-9f343605f61e?auto=format&fit=crop&w=600&q=80",
                "created_at": _now_ts() - 86400 * 30,
            },
            {
                "id": 2,
                "name": "Alpen IT Solutions",
                "description": "Aplikacje web/mobile, wsparcie chmurowe, integracje. Zespół programistów z Polski i Szwajcarii.",
                "offer": "Tworzenie aplikacji webowych i mobilnych, migracja do chmury, integracje systemów, wsparcie techniczne.",
                "phone": "+41 31 234 56 78",
                "email": "info@alpen-it.ch",
                "website": "https://alpen-it.ch",
                "address": "Bundesplatz 5, Bern",
                "city": "Bern",
                "canton": "BE",
                "postal_code": "3003",
                "country": "Switzerland",
                "category_id": cat_map.get("IT"),
                "owner_id": int(demo_user["id"]),
                "is_active": True,
                "is_verified": False,
                "img": "https://images.unsplash.com/photo-1527430253228-e93688616381?auto=format&fit=crop&w=600&q=80",
                "created_at": _now_ts() - 86400 * 25,
            },
            {
                "id": 3,
                "name": "LexPol Tax",
                "description": "Rozliczenia CH/PL, spory podatkowe, doradztwo dla firm. Specjalizacja w podatkach polsko-szwajcarskich.",
                "offer": "Rozliczenia podatkowe CH/PL, doradztwo podatkowe, reprezentacja przed urzędami, zakładanie firm w Szwajcarii.",
                "phone": "+41 22 345 67 89",
                "email": "biuro@lexpol-tax.ch",
                "website": "https://lexpol-tax.ch",
                "address": "Rue du Rhône 15, Genève",
                "city": "Genève",
                "canton": "GE",
                "postal_code": "1204",
                "country": "Switzerland",
                "category_id": cat_map.get("Finanse"),
                "owner_id": int(demo_user["id"]),
                "is_active": True,
                "is_verified": False,
                "img": "https://images.unsplash.com/photo-1450101215322-bf5cd27642fc?auto=format&fit=crop&w=600&q=80",
                "created_at": _now_ts() - 86400 * 20,
            },
            {
                "id": 4,
                "name": "Klinika Bella",
                "description": "Kosmetologia, masaże, konsultacje dietetyczne. Profesjonalna opieka zdrowotna i estetyczna.",
                "offer": "Zabiegi kosmetyczne, masaże relaksacyjne i lecznicze, konsultacje dietetyczne, depilacja laserowa.",
                "phone": "+41 41 456 78 90",
                "email": "rezerwacja@klinika-bella.ch",
                "website": "https://klinika-bella.ch",
                "address": "Pilatusstrasse 8, Luzern",
                "city": "Luzern",
                "canton": "LU",
                "postal_code": "6003",
                "country": "Switzerland",
                "category_id": cat_map.get("Zdrowie"),
                "owner_id": int(demo_user["id"]),
                "is_active": True,
                "is_verified": False,
                "img": "https://images.unsplash.com/photo-1506617420156-8e4536971650?auto=format&fit=crop&w=600&q=80",
                "created_at": _now_ts() - 86400 * 15,
            },
            {
                "id": 5,
                "name": "Trans-Pol Express",
                "description": "Przeprowadzki, przewóz paczek CH-PL-CH, magazynowanie. Szybka i bezpieczna usługa transportowa.",
                "offer": "Przeprowadzki lokalne i międzynarodowe, przewóz paczek i przesyłek CH-PL-CH, magazynowanie, pakowanie.",
                "phone": "+41 61 567 89 01",
                "email": "zamowienia@transpol-express.ch",
                "website": "https://transpol-express.ch",
                "address": "Freie Strasse 25, Basel",
                "city": "Basel",
                "canton": "BS",
                "postal_code": "4001",
                "country": "Switzerland",
                "category_id": cat_map.get("Transport"),
                "owner_id": int(demo_user["id"]),
                "is_active": True,
                "is_verified": False,
                "img": "https://images.unsplash.com/photo-1508444845599-5c89863b0f07?auto=format&fit=crop&w=600&q=80",
                "created_at": _now_ts() - 86400 * 10,
            },
            {
                "id": 6,
                "name": "Pierogi Chalet",
                "description": "Pierogi, bigos, catering na eventy, dostawy w kantonie Zug. Autentyczna polska kuchnia w Szwajcarii.",
                "offer": "Świeże pierogi ruskie i mięsne, bigos, gołąbki, catering na eventy firmowe i prywatne, dostawy w kantonie Zug.",
                "phone": "+41 41 678 90 12",
                "email": "zamowienia@pierogi-chalet.ch",
                "website": "https://pierogi-chalet.ch",
                "address": "Bahnhofstrasse 12, Zug",
                "city": "Zug",
                "canton": "ZG",
                "postal_code": "6300",
                "country": "Switzerland",
                "category_id": cat_map.get("Gastronomia"),
                "owner_id": int(demo_user["id"]),
                "is_active": True,
                "is_verified": False,
                "img": "https://images.unsplash.com/photo-1467003909585-2f8a72700288?auto=format&fit=crop&w=600&q=80",
                "created_at": _now_ts() - 86400 * 5,
            },
            {
                "id": 7,
                "name": "Swiss-Pol Edu",
                "description": "Korepetycje z matematyki, fizyki, języków obcych. Przygotowanie do matury i egzaminów szwajcarskich.",
                "offer": "Korepetycje online i stacjonarne, kursy językowe (PL, DE, FR, EN), przygotowanie do egzaminów, wsparcie w nauce.",
                "phone": "+41 44 789 01 23",
                "email": "kontakt@swisspol-edu.ch",
                "website": "https://swisspol-edu.ch",
                "address": "Limmatstrasse 20, Zürich",
                "city": "Zürich",
                "canton": "ZH",
                "postal_code": "8001",
                "country": "Switzerland",
                "category_id": cat_map.get("Edukacja"),
                "owner_id": int(demo_user["id"]),
                "is_active": True,
                "is_verified": True,
                "img": "https://images.unsplash.com/photo-1503676260728-1c00da094a0b?auto=format&fit=crop&w=600&q=80",
                "created_at": _now_ts() - 86400 * 28,
            },
            {
                "id": 8,
                "name": "Alpine Beauty Studio",
                "description": "Salon fryzjerski i kosmetyczny. Stylizacja, koloryzacja, zabiegi pielęgnacyjne twarzy i ciała.",
                "offer": "Strzyżenie damskie i męskie, koloryzacja, przedłużanie włosów, manicure, pedicure, zabiegi na twarz, depilacja.",
                "phone": "+41 21 890 12 34",
                "email": "rezerwacja@alpine-beauty.ch",
                "website": "https://alpine-beauty.ch",
                "address": "Avenue de la Gare 8, Lausanne",
                "city": "Lausanne",
                "canton": "VD",
                "postal_code": "1003",
                "country": "Switzerland",
                "category_id": cat_map.get("Beauty & Wellness"),
                "owner_id": int(demo_user["id"]),
                "is_active": True,
                "is_verified": False,
                "img": "https://images.unsplash.com/photo-1560472354-b33ff0c44a43?auto=format&fit=crop&w=600&q=80",
                "created_at": _now_ts() - 86400 * 22,
            },
            {
                "id": 9,
                "name": "Pol-Real Estate",
                "description": "Agencja nieruchomości specjalizująca się w mieszkaniach i domach dla Polaków w Szwajcarii.",
                "offer": "Kupno, sprzedaż, wynajem nieruchomości, doradztwo inwestycyjne, zarządzanie nieruchomościami, wyceny.",
                "phone": "+41 31 901 23 45",
                "email": "biuro@pol-real.ch",
                "website": "https://pol-real.ch",
                "address": "Spitalgasse 15, Bern",
                "city": "Bern",
                "canton": "BE",
                "postal_code": "3011",
                "country": "Switzerland",
                "category_id": cat_map.get("Nieruchomości"),
                "owner_id": int(demo_user["id"]),
                "is_active": True,
                "is_verified": True,
                "img": "https://images.unsplash.com/photo-1560518883-ce09059eeffa?auto=format&fit=crop&w=600&q=80",
                "created_at": _now_ts() - 86400 * 18,
            },
            {
                "id": 10,
                "name": "Kancelaria Pol-Swiss Legal",
                "description": "Kancelaria prawna specjalizująca się w prawie szwajcarskim i polskim. Sprawy imigracyjne, rodzinne, biznesowe.",
                "offer": "Porady prawne, reprezentacja przed sądami, sprawy imigracyjne, prawo rodzinne, prawo pracy, zakładanie firm.",
                "phone": "+41 22 012 34 56",
                "email": "kontakt@polswiss-legal.ch",
                "website": "https://polswiss-legal.ch",
                "address": "Rue du Mont-Blanc 10, Genève",
                "city": "Genève",
                "canton": "GE",
                "postal_code": "1201",
                "country": "Switzerland",
                "category_id": cat_map.get("Prawo"),
                "owner_id": int(demo_user["id"]),
                "is_active": True,
                "is_verified": True,
                "img": "https://images.unsplash.com/photo-1589829545856-d10d557cf95f?auto=format&fit=crop&w=600&q=80",
                "created_at": _now_ts() - 86400 * 12,
            },
            {
                "id": 11,
                "name": "Zakład Elektryczny Nowak",
                "description": "Instalacje elektryczne, naprawy, modernizacje. Certyfikowani elektrycy z wieloletnim doświadczeniem.",
                "offer": "Instalacje elektryczne w nowych i starych budynkach, naprawy awarii, modernizacje, instalacje fotowoltaiczne.",
                "phone": "+41 44 123 78 90",
                "email": "info@elektryk-nowak.ch",
                "website": "https://elektryk-nowak.ch",
                "address": "Seestrasse 25, Zürich",
                "city": "Zürich",
                "canton": "ZH",
                "postal_code": "8001",
                "country": "Switzerland",
                "category_id": cat_map.get("Budownictwo"),
                "owner_id": int(demo_user["id"]),
                "is_active": True,
                "is_verified": False,
                "img": "https://images.unsplash.com/photo-1558618666-fcd25c85cd64?auto=format&fit=crop&w=600&q=80",
                "created_at": _now_ts() - 86400 * 35,
            },
            {
                "id": 12,
                "name": "Polski Sklep Online",
                "description": "Sklep internetowy z polskimi produktami spożywczymi. Dostawa w całej Szwajcarii.",
                "offer": "Polskie produkty spożywcze, słodycze, konserwy, przyprawy, napoje. Dostawa kurierem w 24-48h.",
                "phone": "+41 61 234 56 78",
                "email": "zamowienia@polski-sklep.ch",
                "website": "https://polski-sklep.ch",
                "address": "Rheinstrasse 5, Basel",
                "city": "Basel",
                "canton": "BS",
                "postal_code": "4051",
                "country": "Switzerland",
                "category_id": cat_map.get("Gastronomia"),
                "owner_id": int(demo_user["id"]),
                "is_active": True,
                "is_verified": False,
                "img": "https://images.unsplash.com/photo-1556910096-6f5e72db6803?auto=format&fit=crop&w=600&q=80",
                "created_at": _now_ts() - 86400 * 8,
            },
            {
                "id": 13,
                "name": "Med-Pol Clinic",
                "description": "Klinika medyczna z polskojęzycznymi lekarzami. Konsultacje, badania, szczepienia.",
                "offer": "Konsultacje lekarskie, badania laboratoryjne, szczepienia, medycyna rodzinna, pediatria, ginekologia.",
                "phone": "+41 41 345 67 89",
                "email": "rezerwacja@medpol-clinic.ch",
                "website": "https://medpol-clinic.ch",
                "address": "Weinmarkt 3, Luzern",
                "city": "Luzern",
                "canton": "LU",
                "postal_code": "6004",
                "country": "Switzerland",
                "category_id": cat_map.get("Zdrowie"),
                "owner_id": int(demo_user["id"]),
                "is_active": True,
                "is_verified": True,
                "img": "https://images.unsplash.com/photo-1576091160399-112ba8d25d1f?auto=format&fit=crop&w=600&q=80",
                "created_at": _now_ts() - 86400 * 40,
            },
            {
                "id": 14,
                "name": "Swift Logistics CH",
                "description": "Usługi logistyczne i spedycyjne. Transport międzynarodowy, magazynowanie, obsługa celna.",
                "offer": "Transport towarów CH-PL-CH, spedycja, magazynowanie, obsługa celna, ubezpieczenia transportowe.",
                "phone": "+41 44 456 78 90",
                "email": "info@swift-logistics.ch",
                "website": "https://swift-logistics.ch",
                "address": "Industriestrasse 10, Zürich",
                "city": "Zürich",
                "canton": "ZH",
                "postal_code": "8005",
                "country": "Switzerland",
                "category_id": cat_map.get("Transport"),
                "owner_id": int(demo_user["id"]),
                "is_active": True,
                "is_verified": False,
                "img": "https://images.unsplash.com/photo-1550751827-4bd374c3f58b?auto=format&fit=crop&w=600&q=80",
                "created_at": _now_ts() - 86400 * 14,
            },
            {
                "id": 15,
                "name": "TechSupport Pro",
                "description": "Serwis komputerów, naprawa telefonów, wsparcie IT dla firm i osób prywatnych.",
                "offer": "Naprawa komputerów i laptopów, serwis telefonów, instalacja oprogramowania, wsparcie zdalne, sieci komputerowe.",
                "phone": "+41 31 567 89 01",
                "email": "kontakt@techsupport-pro.ch",
                "website": "https://techsupport-pro.ch",
                "address": "Kramgasse 30, Bern",
                "city": "Bern",
                "canton": "BE",
                "postal_code": "3011",
                "country": "Switzerland",
                "category_id": cat_map.get("IT"),
                "owner_id": int(demo_user["id"]),
                "is_active": True,
                "is_verified": False,
                "img": "https://images.unsplash.com/photo-1519389950473-47ba0277781c?auto=format&fit=crop&w=600&q=80",
                "created_at": _now_ts() - 86400 * 7,
            },
        ]
        _write_list(COMPANIES_FILE, seed_companies)

    # Seed dummy reviews if file is empty
    reviews = _read_list(REVIEWS_FILE)
    if not reviews:
        demo_user = get_or_create_demo_user()
        seed_reviews = [
            # Pol-Bud CH (id: 1)
            {"id": 1, "author_id": int(demo_user["id"]), "company_id": 1, "rating": 5, "comment": "Świetna obsługa i terminowość! Polecam.", "created_at": _now_ts() - 86400 * 5},
            {"id": 2, "author_id": int(demo_user["id"]), "company_id": 1, "rating": 4, "comment": "Dobra komunikacja, profesjonalna ekipa.", "created_at": _now_ts() - 86400 * 3},
            {"id": 3, "author_id": int(demo_user["id"]), "company_id": 1, "rating": 5, "comment": "Remont wykonany perfekcyjnie, bardzo zadowolony!", "created_at": _now_ts() - 86400 * 10},
            # Alpen IT Solutions (id: 2)
            {"id": 4, "author_id": int(demo_user["id"]), "company_id": 2, "rating": 5, "comment": "Bardzo pomocni, szybka reakcja na problemy IT.", "created_at": _now_ts() - 86400 * 7},
            {"id": 5, "author_id": int(demo_user["id"]), "company_id": 2, "rating": 5, "comment": "Profesjonalne podejście, aplikacja działa świetnie!", "created_at": _now_ts() - 86400 * 4},
            {"id": 6, "author_id": int(demo_user["id"]), "company_id": 2, "rating": 4, "comment": "Dobra współpraca, polecam dla firm.", "created_at": _now_ts() - 86400 * 12},
            # LexPol Tax (id: 3)
            {"id": 7, "author_id": int(demo_user["id"]), "company_id": 3, "rating": 4, "comment": "Pomogli mi z rozliczeniem podatków CH/PL. Dziękuję!", "created_at": _now_ts() - 86400 * 10},
            {"id": 8, "author_id": int(demo_user["id"]), "company_id": 3, "rating": 5, "comment": "Bardzo kompetentni w sprawach podatkowych.", "created_at": _now_ts() - 86400 * 8},
            # Klinika Bella (id: 4)
            {"id": 9, "author_id": int(demo_user["id"]), "company_id": 4, "rating": 5, "comment": "Fantastyczna klinika, miła obsługa i świetne efekty.", "created_at": _now_ts() - 86400 * 2},
            {"id": 10, "author_id": int(demo_user["id"]), "company_id": 4, "rating": 5, "comment": "Najlepszy masaż w mieście! Wrócę na pewno.", "created_at": _now_ts() - 86400 * 15},
            {"id": 11, "author_id": int(demo_user["id"]), "company_id": 4, "rating": 4, "comment": "Profesjonalne zabiegi, miła atmosfera.", "created_at": _now_ts() - 86400 * 9},
            # Trans-Pol Express (id: 5)
            {"id": 12, "author_id": int(demo_user["id"]), "company_id": 5, "rating": 4, "comment": "Przeprowadzka przebiegła sprawnie, polecam!", "created_at": _now_ts() - 86400 * 6},
            {"id": 13, "author_id": int(demo_user["id"]), "company_id": 5, "rating": 5, "comment": "Szybka i bezpieczna usługa, wszystko dotarło w idealnym stanie.", "created_at": _now_ts() - 86400 * 11},
            # Pierogi Chalet (id: 6)
            {"id": 14, "author_id": int(demo_user["id"]), "company_id": 6, "rating": 5, "comment": "Najlepsze pierogi w Szwajcarii! 🥟", "created_at": _now_ts() - 86400 * 1},
            {"id": 15, "author_id": int(demo_user["id"]), "company_id": 6, "rating": 5, "comment": "Autentyczny smak Polski, catering na event był hitem!", "created_at": _now_ts() - 86400 * 13},
            {"id": 16, "author_id": int(demo_user["id"]), "company_id": 6, "rating": 4, "comment": "Dobre jedzenie, szybka dostawa.", "created_at": _now_ts() - 86400 * 7},
            # Swiss-Pol Edu (id: 7)
            {"id": 17, "author_id": int(demo_user["id"]), "company_id": 7, "rating": 5, "comment": "Świetni nauczyciele, syn poprawił oceny z matematyki!", "created_at": _now_ts() - 86400 * 20},
            {"id": 18, "author_id": int(demo_user["id"]), "company_id": 7, "rating": 5, "comment": "Kurs niemieckiego bardzo pomocny, polecam!", "created_at": _now_ts() - 86400 * 16},
            {"id": 19, "author_id": int(demo_user["id"]), "company_id": 7, "rating": 4, "comment": "Dobre przygotowanie do egzaminów.", "created_at": _now_ts() - 86400 * 12},
            # Alpine Beauty Studio (id: 8)
            {"id": 20, "author_id": int(demo_user["id"]), "company_id": 8, "rating": 5, "comment": "Fantastyczna stylizacja, jestem zachwycona!", "created_at": _now_ts() - 86400 * 18},
            {"id": 21, "author_id": int(demo_user["id"]), "company_id": 8, "rating": 4, "comment": "Profesjonalna obsługa, miła atmosfera.", "created_at": _now_ts() - 86400 * 14},
            # Pol-Real Estate (id: 9)
            {"id": 22, "author_id": int(demo_user["id"]), "company_id": 9, "rating": 5, "comment": "Pomogli znaleźć idealne mieszkanie, bardzo pomocni!", "created_at": _now_ts() - 86400 * 17},
            {"id": 23, "author_id": int(demo_user["id"]), "company_id": 9, "rating": 4, "comment": "Profesjonalna obsługa, szybka transakcja.", "created_at": _now_ts() - 86400 * 11},
            {"id": 24, "author_id": int(demo_user["id"]), "company_id": 9, "rating": 5, "comment": "Najlepsza agencja dla Polaków w CH!", "created_at": _now_ts() - 86400 * 6},
            # Kancelaria Pol-Swiss Legal (id: 10)
            {"id": 25, "author_id": int(demo_user["id"]), "company_id": 10, "rating": 5, "comment": "Pomogli w sprawie imigracyjnej, bardzo kompetentni prawnicy.", "created_at": _now_ts() - 86400 * 19},
            {"id": 26, "author_id": int(demo_user["id"]), "company_id": 10, "rating": 4, "comment": "Dobra reprezentacja, sprawa zakończona sukcesem.", "created_at": _now_ts() - 86400 * 10},
            # Zakład Elektryczny Nowak (id: 11)
            {"id": 27, "author_id": int(demo_user["id"]), "company_id": 11, "rating": 5, "comment": "Szybka naprawa, profesjonalna obsługa, polecam!", "created_at": _now_ts() - 86400 * 25},
            {"id": 28, "author_id": int(demo_user["id"]), "company_id": 11, "rating": 4, "comment": "Dobra jakość pracy, uczciwe ceny.", "created_at": _now_ts() - 86400 * 21},
            {"id": 29, "author_id": int(demo_user["id"]), "company_id": 11, "rating": 5, "comment": "Instalacja fotowoltaiczna wykonana perfekcyjnie!", "created_at": _now_ts() - 86400 * 14},
            # Polski Sklep Online (id: 12)
            {"id": 30, "author_id": int(demo_user["id"]), "company_id": 12, "rating": 5, "comment": "Szybka dostawa, świeże produkty, jak w Polsce!", "created_at": _now_ts() - 86400 * 8},
            {"id": 31, "author_id": int(demo_user["id"]), "company_id": 12, "rating": 4, "comment": "Dobra jakość, szeroki wybór polskich produktów.", "created_at": _now_ts() - 86400 * 5},
            # Med-Pol Clinic (id: 13)
            {"id": 32, "author_id": int(demo_user["id"]), "company_id": 13, "rating": 5, "comment": "Lekarze mówią po polsku, bardzo pomocni i kompetentni!", "created_at": _now_ts() - 86400 * 30},
            {"id": 33, "author_id": int(demo_user["id"]), "company_id": 13, "rating": 5, "comment": "Najlepsza klinika dla Polaków, polecam całej rodzinie!", "created_at": _now_ts() - 86400 * 22},
            {"id": 34, "author_id": int(demo_user["id"]), "company_id": 13, "rating": 4, "comment": "Profesjonalna opieka, miła obsługa.", "created_at": _now_ts() - 86400 * 16},
            # Swift Logistics CH (id: 14)
            {"id": 35, "author_id": int(demo_user["id"]), "company_id": 14, "rating": 4, "comment": "Szybka i niezawodna usługa transportowa.", "created_at": _now_ts() - 86400 * 13},
            {"id": 36, "author_id": int(demo_user["id"]), "company_id": 14, "rating": 5, "comment": "Paczki dotarły szybko i bezpiecznie, polecam!", "created_at": _now_ts() - 86400 * 9},
            # TechSupport Pro (id: 15)
            {"id": 37, "author_id": int(demo_user["id"]), "company_id": 15, "rating": 5, "comment": "Naprawili laptop w jeden dzień, super obsługa!", "created_at": _now_ts() - 86400 * 6},
            {"id": 38, "author_id": int(demo_user["id"]), "company_id": 15, "rating": 4, "comment": "Dobra pomoc techniczna, szybka reakcja.", "created_at": _now_ts() - 86400 * 3},
            {"id": 39, "author_id": int(demo_user["id"]), "company_id": 15, "rating": 5, "comment": "Profesjonalne wsparcie IT dla naszej firmy!", "created_at": _now_ts() - 86400 * 17},
        ]
        _write_list(REVIEWS_FILE, seed_reviews)


def _read_list(path: Path) -> list[dict]:
    _ensure_file(path, [])
    raw = path.read_text(encoding="utf-8")
    try:
        data = json.loads(raw)
        return data if isinstance(data, list) else []
    except Exception as e:
        logger.warning("Failed to read %s: %s, returning empty list", path, e)
        return []


def _write_list(path: Path, data: list[dict]) -> None:
    tmp = path.with_suffix(path.suffix + ".tmp")
    tmp.write_text(json.dumps(data, ensure_ascii=False, indent=2), encoding="utf-8")
    tmp.replace(path)


def generate_slug(text: str) -> str:
    """Generate URL-friendly slug from text (lowercase, no Polish chars, dashes)."""
    if not text:
        return ""
    # Normalize unicode (NFD) and remove diacritics
    text = unicodedata.normalize("NFD", text)
    text = "".join(c for c in text if unicodedata.category(c) != "Mn")
    # Convert to lowercase and replace spaces/special chars with dashes
    text = re.sub(r"[^\w\s-]", "", text.lower())
    text = re.sub(r"[-\s]+", "-", text)
    return text.strip("-")


def _next_id(items: list[dict]) -> int:
    max_id = 0
    for it in items:
        try:
            max_id = max(max_id, int(it.get("id") or 0))
        except Exception:
            continue
    return max_id + 1


from datetime import datetime

def _get_today_str():
    return datetime.now().strftime("%Y-%m-%d")

def _update_stats(company_id: int, field: str):
    """Update stats for a specific day and company."""
    if field not in ("views", "clicks"):
        return
    
    today = _get_today_str()
    with _lock:
        stats = _read_list(STATS_FILE)
        
        # Find entry for today and company
        found = False
        for entry in stats:
            if entry.get("date") == today and entry.get("company_id") == company_id:
                entry[field] = (entry.get(field) or 0) + 1
                found = True
                break
        
        if not found:
            stats.append({
                "date": today,
                "company_id": company_id,
                "views": 1 if field == "views" else 0,
                "clicks": 1 if field == "clicks" else 0
            })
            
        _write_list(STATS_FILE, stats)


# ---------- Users ----------
def get_or_create_demo_user() -> dict:
    with _lock:
        users = _read_list(USERS_FILE)
        demo = next((u for u in users if (u.get("email") or "").lower() == "demo@example.com"), None)
        if demo:
            return demo
        user = {
            "id": _next_id(users),
            "email": "demo@example.com",
            "hashed_password": "demo",  # for dev only; real auth later
            "full_name": "Demo User",
            "is_admin": False,
            "created_at": _now_ts(),
        }
        users.append(user)
        _write_list(USERS_FILE, users)
        return user


def find_user_by_email(email: str) -> Optional[dict]:
    if not email:
        return None
    with _lock:
        users = _read_list(USERS_FILE)
        return next((u for u in users if (u.get("email") or "").lower() == email.lower()), None)


def create_user(email: str, hashed_password: str, full_name: Optional[str]) -> dict:
    with _lock:
        users = _read_list(USERS_FILE)
        if any((u.get("email") or "").lower() == email.lower() for u in users):
            raise ValueError("Email exists")
        user = {
            "id": _next_id(users),
            "email": email,
            "hashed_password": hashed_password,
            "full_name": full_name,
            "is_admin": False,
            "created_at": _now_ts(),
        }
        users.append(user)
        _write_list(USERS_FILE, users)
        return user


# ---------- Categories ----------
def list_categories() -> list[dict]:
    with _lock:
        return _read_list(CATEGORIES_FILE)


def create_category(payload: dict) -> dict:
    with _lock:
        cats = _read_list(CATEGORIES_FILE)
        slug = (payload.get("slug") or "").strip().lower()
        if any((c.get("slug") or "").lower() == slug for c in cats):
            raise ValueError("Slug exists")
        cat = {"id": _next_id(cats), **payload}
        cats.append(cat)
        _write_list(CATEGORIES_FILE, cats)
        return cat


def update_category(category_id: int, payload: dict) -> dict:
    """Update an existing category."""
    with _lock:
        cats = _read_list(CATEGORIES_FILE)
        for cat in cats:
            if cat.get("id") == category_id:
                cat.update(payload)
                _write_list(CATEGORIES_FILE, cats)
                return cat
        raise KeyError("Category not found")


def delete_category(category_id: int) -> None:
    """Delete a category by ID."""
    with _lock:
        cats = _read_list(CATEGORIES_FILE)
        original_len = len(cats)
        cats = [c for c in cats if c.get("id") != category_id]
        if len(cats) == original_len:
            raise KeyError("Category not found")
        _write_list(CATEGORIES_FILE, cats)


# ---------- Companies ----------
def list_companies() -> list[dict]:
    """List all companies, ensuring they have slugs."""
    with _lock:
        companies = _read_list(COMPANIES_FILE)
        # Ensure all companies have slugs
        updated = False
        for company in companies:
            if not company.get("slug"):
                company["slug"] = generate_slug(company.get("name", "")) or f"firma-{company.get('id')}"
                updated = True
        if updated:
            _write_list(COMPANIES_FILE, companies)
        return companies


def get_company(company_id: int) -> Optional[dict]:
    with _lock:
        companies = _read_list(COMPANIES_FILE)
        return next((c for c in companies if int(c.get("id") or 0) == company_id), None)


def get_company_by_slug(slug: str) -> Optional[dict]:
    """Get company by slug."""
    with _lock:
        companies = _read_list(COMPANIES_FILE)
        return next((c for c in companies if (c.get("slug") or "").lower() == slug.lower()), None)


def create_company(payload: dict) -> dict:
    with _lock:
        companies = _read_list(COMPANIES_FILE)
        demo_user = get_or_create_demo_user()
        
        # Generate slug if not provided
        slug = payload.get("slug") or generate_slug(payload.get("name", ""))
        if not slug:
            slug = f"firma-{_next_id(companies)}"

        
        # Ensure unique slug
        base_slug = slug
        counter = 1
        while any((c.get("slug") or "").lower() == slug.lower() for c in companies):
            slug = f"{base_slug}-{counter}"
            counter += 1
        
        # Geocode address if coordinates not provided
        if not payload.get('latitude') or not payload.get('longitude'):
            settings = get_settings()
            api_key = settings.get('google_maps_api_key')
            if api_key:
                full_address = build_full_address(
                    address=payload.get('address', ''),
                    city=payload.get('city', ''),
                    canton=payload.get('canton', ''),
                    postal_code=payload.get('postal_code', ''),
                    country='Switzerland'
                )
                coords = geocode_address(full_address, api_key)
                if coords:
                    payload['latitude'] = coords[0]
                    payload['longitude'] = coords[1]
        
        company = {
            **payload,  # Apply payload first
            "id": _next_id(companies),
            "owner_id": int(demo_user["id"]),
            "is_active": True,
            "is_verified": False,
            "slug": slug,  # Ensure calculated slug is used
            "status": payload.get("status", "draft"),  # ✨ NEW: Default to draft status
            "edit_token": secrets.token_urlsafe(32),
            "views": 0,
            "clicks": 0,
            "created_at": _now_ts(),
        }
        companies.append(company)
        _write_list(COMPANIES_FILE, companies)
        return company


def update_company(company_id: int, updates: dict) -> dict:
    with _lock:
        companies = _read_list(COMPANIES_FILE)
        for idx, c in enumerate(companies):
            if int(c.get("id") or 0) != company_id:
                continue
            merged = {**c, **updates, "id": company_id, "updated_at": _now_ts()}
            companies[idx] = merged
            _write_list(COMPANIES_FILE, companies)
            return merged
        raise KeyError("Not found")


def delete_company(company_id: int) -> None:
    with _lock:
        companies = _read_list(COMPANIES_FILE)
        new_list = [c for c in companies if int(c.get("id") or 0) != company_id]
        if len(new_list) == len(companies):
            raise KeyError("Not found")
        _write_list(COMPANIES_FILE, new_list)


# ---------- Stats ----------
def increment_view(company_id: int) -> None:
    with _lock:
        companies = _read_list(COMPANIES_FILE)
        for idx, c in enumerate(companies):
            if int(c.get("id") or 0) == company_id:
                c["views"] = (c.get("views") or 0) + 1
                companies[idx] = c
                _write_list(COMPANIES_FILE, companies)
                
                # Update granular stats
                _update_stats(company_id, "views")
                return


def increment_click(company_id: int) -> None:
    with _lock:
        companies = _read_list(COMPANIES_FILE)
        for idx, c in enumerate(companies):
            if int(c.get("id") or 0) == company_id:
                c["clicks"] = (c.get("clicks") or 0) + 1
                companies[idx] = c
                _write_list(COMPANIES_FILE, companies)
                
                # Update granular stats
                _update_stats(company_id, "clicks")
                return


def verify_edit_token(token: str, email: str) -> Optional[dict]:
    with _lock:
        companies = _read_list(COMPANIES_FILE)
        for c in companies:
            if c.get("edit_token") == token:
                # Basic email check (case insensitive)
                if (c.get("email") or "").strip().lower() == email.strip().lower():
                    return c
        return None
def list_reviews(company_id: Optional[int] = None) -> list[dict]:
    with _lock:
        reviews = _read_list(REVIEWS_FILE)
        if company_id:
            return [r for r in reviews if int(r.get("company_id") or 0) == int(company_id)]
        return reviews


def create_review(payload: dict) -> dict:
    logger.info("storage.create_review called with payload: %s", payload)
    try:
        with _lock:
            reviews = _read_list(REVIEWS_FILE)
            logger.info("Loaded %d reviews from file", len(reviews))
            demo_user = get_or_create_demo_user()
            logger.info("Using demo user id=%s", demo_user.get("id"))

            company_id = payload.get("company_id")
            logger.info("Looking for company_id=%s", company_id)
            company: Optional[dict] = None
            if company_id:
                company = get_company(int(company_id))
            if not company:
                # fallback: first company or create minimal demo
                companies = _read_list(COMPANIES_FILE)
                logger.info("Company not found, checking companies list (len=%d)", len(companies))
                if companies:
                    company = companies[0]
                    logger.info("Using first company id=%s", company.get("id"))
                else:
                    logger.info("No companies, creating demo company")
                    company = create_company({"name": "Demo Company", "country": "Switzerland"})

            review = {
                "id": _next_id(reviews),
                "author_id": int(demo_user["id"]),
                "company_id": int(company["id"]),
                "rating": int(payload.get("rating") or 0),
                "comment": payload.get("comment"),
                "ip_address": payload.get("ip_address", "unknown"),
                "created_at": _now_ts(),
            }
            logger.info("Created review object: %s", review)
            reviews.append(review)
            _write_list(REVIEWS_FILE, reviews)
            logger.info("Saved review to file, total reviews: %d", len(reviews))
            return review
    except Exception as e:
        logger.exception("Error in create_review: %s", e)
        raise


# ---------- Reports (review abuse) ----------
def delete_review(review_id: int) -> None:
    """Delete a review by ID."""
    with _lock:
        reviews = _read_list(REVIEWS_FILE)
        new_list = [r for r in reviews if int(r.get("id") or 0) != review_id]
        if len(new_list) == len(reviews):
            raise KeyError("Review not found")
        _write_list(REVIEWS_FILE, new_list)


def list_reports() -> list[dict]:
    with _lock:
        return _read_list(REPORTS_FILE)


def create_report(payload: dict) -> dict:
    with _lock:
        reports = _read_list(REPORTS_FILE)
        report = {
            "id": _next_id(reports),
            "review_id": int(payload.get("review_id") or 0),
            "reason": (payload.get("reason") or "").strip() or "Brak powodu",
            "created_at": _now_ts(),
        }
        reports.append(report)
        _write_list(REPORTS_FILE, reports)
        return report

def get_daily_stats(days: int = 30) -> list[dict]:
    with _lock:
        stats = _read_list(STATS_FILE)
        # Aggregate by date
        aggregated: dict[str, dict] = {}
        for entry in stats:
            date = entry.get("date", "")
            if date not in aggregated:
                aggregated[date] = {"date": date, "views": 0, "clicks": 0}
            aggregated[date]["views"] += entry.get("views", 0)
            aggregated[date]["clicks"] += entry.get("clicks", 0)
        # Sort by date and return last N days
        sorted_stats = sorted(aggregated.values(), key=lambda x: x["date"])
        return sorted_stats[-days:]


# Settings management
SETTINGS_FILE = DATA_DIR / "settings.json"


def get_settings() -> dict:
    """Get application settings including social media links."""
    try:
        if not SETTINGS_FILE.exists():
            # Create default settings
            default_settings = {
                "social_media": {
                    "facebook": "",
                    "youtube": "",
                    "instagram": "",
                    "tiktok": "",
                    "facebook_group": ""
                }
            }
            with open(SETTINGS_FILE, "w", encoding="utf-8") as f:
                json.dump(default_settings, f, indent=2, ensure_ascii=False)
            return default_settings
        
        with open(SETTINGS_FILE, "r", encoding="utf-8") as f:
            return json.load(f)
    except Exception as e:
        logger.error(f"Error reading settings: {e}")
        return {"social_media": {}}


def update_social_media(social_media: dict) -> dict:
    """Update social media links."""
    settings = get_settings()
    settings["social_media"] = social_media
    
    with open(SETTINGS_FILE, "w", encoding="utf-8") as f:
        json.dump(settings, f, indent=2, ensure_ascii=False)
    
    return settings


def get_newsletter_count() -> int:
    """Get the number of random companies to show in newsletter."""
    settings = get_settings()
    return settings.get("newsletter_count", 5)  # Default to 5


def update_newsletter_count(count: int) -> dict:
    """Update the number of random companies for newsletter."""
    settings = get_settings()
    settings["newsletter_count"] = max(1, min(count, 50))  # Clamp between 1 and 50
    
    with open(SETTINGS_FILE, "w", encoding="utf-8") as f:
        json.dump(settings, f, indent=2, ensure_ascii=False)
    
    return settings

def update_sort_order(sort_order: str) -> dict:
    """Update the sort order for homepage company display."""
    settings = get_settings()
    settings["sort_order"] = sort_order
    
    with open(SETTINGS_FILE, "w", encoding="utf-8") as f:
        json.dump(settings, f, indent=2, ensure_ascii=False)
    
    return settings
