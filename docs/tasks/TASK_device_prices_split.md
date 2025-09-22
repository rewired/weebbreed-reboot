- [ ] done

# TASK_device_prices_split

## Goal

Sicherstellen, dass Geräte‑Blueprints **keine** Preis/Wartungsfelder enthalten; Nutzung aus separaten Preisdateien (Balancing).

## Acceptance Criteria

- Device‑Instanz liest technische `settings` aus Blueprint und ökonomische Daten aus Preisdatei.
- Tests: Änderung in Preisdatei wirkt ohne Änderung am Blueprint.

## Steps

1. Loader trennen: `deviceLoader.ts` + `devicePricesLoader.ts`.
2. Zusammenführung zur Laufzeit im Factory‑Konstruktor.
3. Prüfer: Schemas einhalten.
