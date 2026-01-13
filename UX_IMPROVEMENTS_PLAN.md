# Plan Poprawek UX - Katalog Firm CH
## Analiza UX i 30 proponowanych poprawek

---

## 🎯 STRONA GŁÓWNA (page.tsx)

### 1. **Brak wyszukiwarki firm**
- **Problem**: Użytkownik nie może szybko wyszukać firmy po nazwie
- **Rozwiązanie**: Dodać pole wyszukiwania z autocomplete w headerze lub nad listą firm
- **Priorytet**: Wysoki

### 2. **Filtry są tylko wizualne (hardcoded)**
- **Problem**: Filtry "Wszystkie", "Ocena 4+", "Zürich" nie działają
- **Rozwiązanie**: Zaimplementować funkcjonalne filtry z możliwością wyboru kantonu, oceny, kategorii
- **Priorytet**: Wysoki

### 3. **Brak sortowania listy firm**
- **Problem**: Nie można sortować po ocenie, nazwie, dacie dodania
- **Rozwiązanie**: Dodać dropdown sortowania: "Najwyżej oceniane", "Najnowsze", "A-Z"
- **Priorytet**: Średni

### 4. **Mapa nie jest interaktywna**
- **Problem**: Mapa to tylko iframe, nie pokazuje lokalizacji firm
- **Rozwiązanie**: Dodać markery na mapie dla każdej firmy z możliwością kliknięcia
- **Priorytet**: Wysoki

### 5. **Brak paginacji lub infinite scroll**
- **Problem**: Wszystkie firmy na jednej stronie - problem przy dużej liczbie
- **Rozwiązanie**: Dodać paginację (np. 12 firm na stronę) lub infinite scroll
- **Priorytet**: Średni

### 6. **Brak wskaźnika liczby firm**
- **Problem**: Użytkownik nie wie ile firm jest w katalogu
- **Rozwiązanie**: Dodać licznik "Znaleziono X firm" nad listą
- **Priorytet**: Niski

### 7. **Brak breadcrumbs na stronie głównej**
- **Problem**: Brak nawigacji breadcrumb (choć nie jest krytyczne na głównej)
- **Rozwiązanie**: Opcjonalne - można pominąć na głównej, ale dodać na podstronach
- **Priorytet**: Niski

### 8. **CTA sekcja mogłaby być bardziej atrakcyjna**
- **Problem**: CTA jest dobre, ale mogłoby mieć ikonę lub lepszą wizualizację
- **Rozwiązanie**: Dodać ikonę, animację hover, lub ilustrację
- **Priorytet**: Niski

---

## 📝 FORMULARZ DODAWANIA FIRMY (add-company/page.tsx)

### 9. **Brak wskaźnika postępu wizualnego**
- **Problem**: Tylko numery kroków, brak paska postępu
- **Rozwiązanie**: Dodać pasek postępu (progress bar) pokazujący % ukończenia
- **Priorytet**: Średni

### 10. **Brak możliwości zapisania draftu**
- **Problem**: Jeśli użytkownik przerwie wypełnianie, traci dane
- **Rozwiązanie**: Auto-zapis do localStorage jako draft
- **Priorytet**: Średni

### 11. **Brak podglądu przed wysłaniem**
- **Problem**: Użytkownik nie widzi podsumowania przed zapisem
- **Rozwiązanie**: Dodać krok "Podsumowanie" przed zapisem
- **Priorytet**: Średni

### 12. **Brak walidacji w czasie rzeczywistym**
- **Problem**: Błędy pokazują się dopiero po kliknięciu "Dalej"
- **Rozwiązanie**: Walidacja inline podczas wpisywania (np. długość opisu)
- **Priorytet**: Średni

### 13. **Brak wskazówek dla wymaganych pól**
- **Problem**: Nie widać które pola są wymagane (brak *)
- **Rozwiązanie**: Dodać czerwoną gwiazdkę (*) przy wymaganych polach
- **Priorytet**: Wysoki

### 14. **Brak możliwości cofnięcia się i edycji poprzednich kroków**
- **Problem**: Trzeba kliknąć "Wstecz" wiele razy
- **Rozwiązanie**: Dodać możliwość kliknięcia w numer kroku aby wrócić
- **Priorytet**: Średni

### 15. **Brak komunikatu sukcesu z linkiem do firmy**
- **Problem**: Po zapisaniu nie widać co dalej
- **Rozwiązanie**: Po sukcesie pokazać komunikat z linkiem do dodanej firmy
- **Priorytet**: Wysoki

### 16. **Brak możliwości dodania wielu zdjęć do backendu**
- **Problem**: Tylko główne zdjęcie jest zapisywane
- **Rozwiązanie**: Zaimplementować upload wielu zdjęć do backendu
- **Priorytet**: Średni

### 17. **Brak weryfikacji formatu email/telefonu**
- **Problem**: Można wpisać nieprawidłowy email/telefon
- **Rozwiązanie**: Dodać regex walidację dla email i format telefonu (+41...)
- **Priorytet**: Średni

### 18. **Brak możliwości wyboru zdjęcia głównego z previews**
- **Problem**: Jeśli użytkownik doda wiele zdjęć, pierwsze staje się głównym
- **Rozwiązanie**: Dodać możliwość oznaczenia zdjęcia jako "główne"
- **Priorytet**: Niski

---

## 🏢 STRONA SZCZEGÓŁÓW FIRMY (companies/[slug]/page.tsx)

### 19. **Brak przycisku "Udostępnij"**
- **Problem**: Użytkownik nie może łatwo udostępnić firmy
- **Rozwiązanie**: Dodać przycisk share z możliwością skopiowania linku
- **Priorytet**: Średni

### 20. **Brak mapy z lokalizacją firmy**
- **Problem**: Tylko adres tekstowy, brak wizualizacji na mapie
- **Rozwiązanie**: Dodać małą mapę z markerem lokalizacji firmy
- **Priorytet**: Wysoki

### 21. **Brak możliwości wydrukowania informacji**
- **Problem**: Nie można wydrukować danych firmy
- **Rozwiązanie**: Dodać przycisk "Drukuj" z wersją do druku
- **Priorytet**: Niski

### 22. **Brak daty dodania recenzji**
- **Problem**: Nie widać kiedy recenzja została dodana
- **Rozwiązanie**: Dodać timestamp "2 dni temu", "3 tygodnie temu"
- **Priorytet**: Średni

### 23. **Brak możliwości sortowania recenzji**
- **Problem**: Recenzje w losowej kolejności
- **Rozwiązanie**: Dodać sortowanie: "Najnowsze", "Najstarsze", "Najwyżej ocenione"
- **Priorytet**: Niski

### 24. **Brak możliwości zgłoszenia recenzji**
- **Problem**: Nie można zgłosić nieprawidłowej recenzji
- **Rozwiązanie**: Dodać przycisk "Zgłoś" przy każdej recenzji
- **Priorytet**: Niski

### 25. **Przycisk "Skontaktuj się" nie działa**
- **Problem**: Przycisk nie ma funkcjonalności
- **Rozwiązanie**: Dodać modal z formularzem kontaktowym lub przekierowanie do email/tel
- **Priorytet**: Wysoki

### 26. **Brak możliwości dodania do ulubionych**
- **Problem**: Użytkownik nie może zapisać firmy
- **Rozwiązanie**: Dodać przycisk "Zapisz" z localStorage
- **Priorytet**: Niski

---

## 📂 STRONA KATEGORII (categories/[slug]/page.tsx)

### 27. **Brak filtra w kategorii**
- **Problem**: Nie można filtrować firm w kategorii (np. po kantonie)
- **Rozwiązanie**: Dodać filtry: kanton, ocena, miasto
- **Priorytet**: Średni

### 28. **Brak sortowania w kategorii**
- **Problem**: Brak możliwości sortowania firm w kategorii
- **Rozwiązanie**: Dodać sortowanie jak na stronie głównej
- **Priorytet**: Średni

---

## 🎨 LAYOUT I OGÓLNE

### 29. **Brak logo/favicon**
- **Problem**: Brak ikony strony w przeglądarce
- **Rozwiązanie**: Dodać favicon.ico i logo w headerze
- **Priorytet**: Średni

### 30. **Brak footer z informacjami**
- **Problem**: Brak stopki z linkami, kontaktem, regulaminem
- **Rozwiązanie**: Dodać footer z: O nas, Kontakt, Regulamin, Polityka prywatności
- **Priorytet**: Średni

### 31. **Brak wersji mobilnej menu (hamburger)**
- **Problem**: Menu w headerze może być za długie na mobile
- **Rozwiązanie**: Dodać hamburger menu dla mobile (< 768px)
- **Priorytet**: Wysoki

### 32. **Brak animacji przejść między stronami**
- **Problem**: Przejścia są ostre, brak płynności
- **Rozwiązanie**: Dodać smooth transitions i loading states
- **Priorytet**: Niski

### 33. **Brak dark mode**
- **Problem**: Tylko jasny motyw
- **Rozwiązanie**: Dodać przełącznik dark/light mode
- **Priorytet**: Niski

### 34. **Brak komunikatu o cookies**
- **Problem**: Brak informacji o cookies (wymagane w EU/CH)
- **Rozwiązanie**: Dodać banner cookie consent
- **Priorytet**: Średni (wymagane prawne)

---

## 📊 PODSUMOWANIE PRIORYTETÓW

### 🔴 WYSOKI PRIORYTET (10 poprawek):
1. Wyszukiwarka firm
2. Funkcjonalne filtry
3. Interaktywna mapa z markerami
4. Wskaźniki wymaganych pól (*)
5. Komunikat sukcesu z linkiem
6. Mapa z lokalizacją na stronie firmy
7. Funkcjonalny przycisk "Skontaktuj się"
8. Hamburger menu dla mobile
9. Walidacja email/telefonu
10. Sortowanie listy firm

### 🟡 ŚREDNI PRIORYTET (12 poprawek):
11. Pasek postępu w formularzu
12. Auto-zapis draftu
13. Podgląd przed wysłaniem
14. Walidacja w czasie rzeczywistym
15. Klikalne numery kroków
16. Upload wielu zdjęć
17. Przycisk "Udostępnij"
18. Data dodania recenzji
19. Filtry w kategorii
20. Sortowanie w kategorii
21. Logo/favicon
22. Footer
23. Cookie consent

### 🟢 NISKI PRIORYTET (11 poprawek):
24. Licznik firm
25. CTA z ikoną
26. Wybór zdjęcia głównego
27. Przycisk "Drukuj"
28. Sortowanie recenzji
29. Zgłaszanie recenzji
30. Ulubione firmy
31. Animacje przejść
32. Dark mode
33. Paginacja/infinite scroll

---

## 🎯 REKOMENDACJA ROZPOCZĘCIA

Zacznij od poprawek WYSOKIEGO PRIORYTETU, szczególnie:
1. Wyszukiwarka
2. Funkcjonalne filtry
3. Wskaźniki wymaganych pól
4. Hamburger menu
5. Interaktywna mapa

Te poprawki znacząco poprawią UX i użyteczność strony.

