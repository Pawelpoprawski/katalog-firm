import time
from secrets import token_urlsafe
from backend import storage

companies = storage._read_list(storage.COMPANIES_FILE)
existing_slugs = { (c.get("slug") or "").lower() for c in companies }
demo = storage.get_or_create_demo_user()

new_entries = [
    {
        "name": "Helvetic Clean Pro",
        "short_description": "Profesjonalne sprzÄ…tanie domÃ³w i biur w Vaud.",
        "description": "ZespÃ³Å‚ polsko-szwajcarski. SprzÄ…tanie cykliczne, mycie okien, pranie tapicerek, wsparcie przy przeprowadzkach.",
        "offer": "SprzÄ…tanie mieszkaÅ„ i domÃ³w â€¢ Serwis biurowy â€¢ Mycie okien â€¢ SprzÄ…tanie po remoncie â€¢ Ozonowanie â€¢ Pranie tapicerek",
        "phone": "+41 78 555 32 10",
        "email": "kontakt@helveticclean.ch",
        "website": "https://helveticclean.ch",
        "facebook": "https://facebook.com/helveticclean",
        "instagram": "https://instagram.com/helveticclean",
        "address": "Avenue de la Gare 10, Lausanne",
        "city": "Lausanne",
        "canton": "VD",
        "postal_code": "1003",
        "country": "Switzerland",
        "category_id": 1,
        "is_promoted": False,
        "img": None,
        "photos": None,
    },
    {
        "name": "Swiss Move Express",
        "short_description": "Przeprowadzki i transport CH-EU-CH w 24h",
        "description": "Przeprowadzki mieszkaÅ„ i biur, magazynowanie, utylizacja mebli. PolskojÄ™zyczna obsÅ‚uga, ubezpieczenie cargo.",
        "offer": "Przeprowadzki lokalne i miÄ™dzynarodowe â€¢ Transport palet â€¢ Utylizacja mebli â€¢ Magazyn krÃ³tkoterminowy â€¢ Ekipa do pakowania",
        "phone": "+41 76 900 44 55",
        "email": "biuro@swissmove-express.ch",
        "website": "https://swissmove-express.ch",
        "facebook": "https://facebook.com/swissmoveexpress",
        "instagram": "https://instagram.com/swissmoveexpress",
        "address": "Badenerstrasse 120, ZÃ¼rich",
        "city": "ZÃ¼rich",
        "canton": "ZH",
        "postal_code": "8004",
        "country": "Switzerland",
        "category_id": 2,
        "is_promoted": True,
        "img": None,
        "photos": None,
    },
    {
        "name": "AlpTax Advisors",
        "short_description": "Podatki CH/PL, ksiÄ™gowoÅ›Ä‡ spÃ³Å‚ek i prywatnych",
        "description": "DwujÄ™zyczny zespÃ³Å‚ doradcÃ³w. Rozliczenia roczne, VAT, optymalizacja dla samozatrudnionych i GmbH, konsultacje online.",
        "offer": "Rozliczenia PIT CH â€¢ VAT/MWST â€¢ ZakÅ‚adanie GmbH â€¢ KsiÄ™gowoÅ›Ä‡ bieÅ¼Ä…ca â€¢ Konsultacje podatkowe PL/CH",
        "phone": "+41 41 710 20 15",
        "email": "office@alptax.ch",
        "website": "https://alptax.ch",
        "facebook": "https://facebook.com/alptax",
        "instagram": "https://instagram.com/alptax",
        "address": "Bahnhofstrasse 7, Zug",
        "city": "Zug",
        "canton": "ZG",
        "postal_code": "6300",
        "country": "Switzerland",
        "category_id": 4,
        "is_promoted": True,
        "img": None,
        "photos": None,
    },
    {
        "name": "Geneva Legal Partners",
        "short_description": "Kancelaria PL/FR/EN â€“ prawo rodzinne i imigracyjne",
        "description": "Prawnicy z uprawnieniami w CH. Sprawy rodzinne, umowy, pobyty, spory pracownicze. Konsultacje online i w biurze.",
        "offer": "Prawo rodzinne â€¢ Prawo pracy â€¢ Kontrakty â€¢ Pozwolenia na pobyt â€¢ Spory cywilne",
        "phone": "+41 22 740 12 90",
        "email": "contact@genevalegal.ch",
        "website": "https://genevalegal.ch",
        "facebook": "https://facebook.com/genevalegal",
        "instagram": "https://instagram.com/genevalegal",
        "address": "Rue du RhÃ´ne 25, GenÃ¨ve",
        "city": "GenÃ¨ve",
        "canton": "GE",
        "postal_code": "1204",
        "country": "Switzerland",
        "category_id": 10,
        "is_promoted": False,
        "img": None,
        "photos": None,
    },
    {
        "name": "Alpine Wellness & Spa",
        "short_description": "Day spa z polskÄ… obsÅ‚ugÄ… w Interlaken",
        "description": "MasaÅ¼e, sauny, zabiegi na twarz i ciaÅ‚o. Vouchery, pakiety dla par, wieczory panienskie. Naturalne kosmetyki.",
        "offer": "MasaÅ¼e klasyczne i sportowe â€¢ Sauna i jacuzzi â€¢ Zabiegi na twarz â€¢ Pakiety SPA dla par â€¢ Vouchery prezentowe",
        "phone": "+41 79 332 44 88",
        "email": "hello@alpine-wellness.ch",
        "website": "https://alpine-wellness.ch",
        "facebook": "https://facebook.com/alpinewellness",
        "instagram": "https://instagram.com/alpinewellness",
        "address": "HÃ¶heweg 60, Interlaken",
        "city": "Interlaken",
        "canton": "BE",
        "postal_code": "3800",
        "country": "Switzerland",
        "category_id": 8,
        "is_promoted": False,
        "img": None,
        "photos": None,
    },
    {
        "name": "Zurich Dev Studio",
        "short_description": "Software house: web, mobile, AI integracje",
        "description": "MaÅ‚y zespÃ³Å‚ seniorÃ³w. Next.js, Node, Python, integracje ERP/CRM, audyty bezpieczeÅ„stwa, utrzymanie SLA 24/7.",
        "offer": "Aplikacje web â€¢ Aplikacje mobilne â€¢ Integracje API â€¢ UX/UI â€¢ Audyty bezpieczeÅ„stwa â€¢ Utrzymanie 24/7",
        "phone": "+41 78 210 11 22",
        "email": "hi@zurichdev.studio",
        "website": "https://zurichdev.studio",
        "facebook": "https://facebook.com/zurichdevstudio",
        "instagram": "https://instagram.com/zurichdevstudio",
        "address": "Hardstrasse 201, ZÃ¼rich",
        "city": "ZÃ¼rich",
        "canton": "ZH",
        "postal_code": "8005",
        "country": "Switzerland",
        "category_id": 6,
        "is_promoted": True,
        "img": None,
        "photos": None,
    },
    {
        "name": "PolTaste Bistro",
        "short_description": "Polskie smaki w centrum Basel â€“ lunch i catering",
        "description": "Pierogi, Å¼urek, schabowy, catering na eventy firmowe. Menu dnia, dowÃ³z w Basel, opcje wege.",
        "offer": "Lunch dnia â€¢ Catering firmowy â€¢ Dania wege â€¢ Wypieki â€¢ Dostawa w Basel",
        "phone": "+41 61 310 77 22",
        "email": "zamowienia@poltaste.ch",
        "website": "https://poltaste.ch",
        "facebook": "https://facebook.com/poltaste",
        "instagram": "https://instagram.com/poltaste",
        "address": "Freie Strasse 40, Basel",
        "city": "Basel",
        "canton": "BS",
        "postal_code": "4001",
        "country": "Switzerland",
        "category_id": 5,
        "is_promoted": False,
        "img": None,
        "photos": None,
    },
    {
        "name": "EduPol Academy",
        "short_description": "Kursy PL/DE/EN, matura i egzaminy szwajcarskie",
        "description": "Nauczyciele z CH i PL. Korepetycje online/stacjonarnie, przygotowanie do Gymi, matura, kursy jÄ™zykowe dla dorosÅ‚ych.",
        "offer": "Korepetycje matematyka/fizyka â€¢ Kursy DE/EN/FR â€¢ Przygotowanie do egzaminÃ³w Gymi â€¢ Kursy dla dorosÅ‚ych",
        "phone": "+41 31 511 60 22",
        "email": "biuro@edupol-academy.ch",
        "website": "https://edupol-academy.ch",
        "facebook": "https://facebook.com/edupolacademy",
        "instagram": "https://instagram.com/edupolacademy",
        "address": "Monbijoustrasse 20, Bern",
        "city": "Bern",
        "canton": "BE",
        "postal_code": "3011",
        "country": "Switzerland",
        "category_id": 7,
        "is_promoted": False,
        "img": None,
        "photos": None,
    },
    {
        "name": "LakeView Dental",
        "short_description": "Klinika dentystyczna w Luzern â€“ PL/DE/EN",
        "description": "Stomatologia zachowawcza, implanty, higienizacja, stomatologia dzieciÄ™ca. Nowoczesny sprzÄ™t, pÅ‚atnoÅ›Ä‡ ratalna.",
        "offer": "Profilaktyka i higienizacja â€¢ Leczenie kanaÅ‚owe â€¢ Implanty â€¢ Stomatologia dzieciÄ™ca â€¢ Wybielanie",
        "phone": "+41 41 210 45 80",
        "email": "recepcja@lakeviewdental.ch",
        "website": "https://lakeviewdental.ch",
        "facebook": "https://facebook.com/lakeviewdental",
        "instagram": "https://instagram.com/lakeviewdental",
        "address": "Pilatusstrasse 18, Luzern",
        "city": "Luzern",
        "canton": "LU",
        "postal_code": "6003",
        "country": "Switzerland",
        "category_id": 3,
        "is_promoted": True,
        "img": None,
        "photos": None,
    },
    {
        "name": "Helvetia Realty",
        "short_description": "NieruchomoÅ›ci premium w Zurychu i okolicach",
        "description": "PoÅ›rednictwo, due diligence, wsparcie expatÃ³w, wynajem dÅ‚ugoterminowy. Doradztwo inwestycyjne i zarzÄ…dzanie najmem.",
        "offer": "Kupno/sprzedaÅ¼ mieszkaÅ„ â€¢ Wynajem premium â€¢ ZarzÄ…dzanie najmem â€¢ Due diligence â€¢ Home staging",
        "phone": "+41 44 255 11 77",
        "email": "office@helvetiarealty.ch",
        "website": "https://helvetiarealty.ch",
        "facebook": "https://facebook.com/helvetiarealty",
        "instagram": "https://instagram.com/helvetiarealty",
        "address": "Talstrasse 33, ZÃ¼rich",
        "city": "ZÃ¼rich",
        "canton": "ZH",
        "postal_code": "8001",
        "country": "Switzerland",
        "category_id": 9,
        "is_promoted": False,
        "img": None,
        "photos": None,
    },
]


def unique_slug(name: str) -> str:
    base = storage.generate_slug(name) or "firma"
    candidate = base
    idx = 1
    while candidate.lower() in existing_slugs:
        candidate = f"{base}-{idx}"
        idx += 1
    existing_slugs.add(candidate.lower())
    return candidate

for entry in new_entries:
    entry = dict(entry)
    entry["id"] = storage._next_id(companies)
    entry["slug"] = unique_slug(entry["name"])
    entry["owner_id"] = int(demo["id"])
    entry["status"] = entry.get("status", "published")
    entry["edit_token"] = token_urlsafe(32)
    entry["views"] = 0
    entry["clicks"] = 0
    entry["created_at"] = time.time()
    entry.setdefault("is_verified", False)
    companies.append(entry)

storage._write_list(storage.COMPANIES_FILE, companies)
print(f"Added {len(new_entries)} companies. Total now: {len(companies)}")