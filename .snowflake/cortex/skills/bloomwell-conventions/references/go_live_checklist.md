# Go-Live Checkliste — Dimensionales Modell

> Vor jedem Merge in Production vollständig abhaken. Kein Punkt darf übersprungen werden.

---

## Grain & Struktur

- [ ] Grain in **einem Satz** in der dbt YAML `description` dokumentiert
- [ ] Kein gemischter Grain in einer Fact Table — zwei Grains = zwei Fact Tables
- [ ] Keine Textspalten oder Flags direkt in der Fact Table (→ Dimension oder Junk Dimension)
- [ ] Keine NULL Foreign Keys — Sentinel-Einträge (`-1`, `'Not Applicable'`) vorhanden
- [ ] Viele-zu-Viele-Beziehungen über Bridge Tables mit `weighting_factor` gelöst

## Maßzahlen (Measures)

- [ ] Additivität für jede Maßzahl dokumentiert: additiv / semi-additiv / non-additiv
- [ ] Keine YTD- oder laufenden Summen als gespeicherte Maßzahlen (→ BI-Layer)
- [ ] Ratios als Zähler + Nenner gespeichert — nicht als Prozentwert direkt

## Dimensionen

- [ ] Hierarchien in der Dimension flach denormalisiert — kein Snowflaking
- [ ] Jeder Code hat ein menschenlesbares `_name`-Gegenstück
- [ ] Dimensionen sind konformiert — keine lokalen Kopien derselben Entität
- [ ] SCD-Strategie für jedes Attribut in dbt YAML deklariert (Type 0 / 1 / 2)
- [ ] SCD2-Dimensionen haben `effective_date`, `expiry_date`, `is_current`

## Schlüssel

- [ ] Surrogate Keys (`_key`) für alle Silver/Gold-Dimensionen
- [ ] Business Keys (`_id`) als separate Spalte erhalten, nicht überschrieben
- [ ] Keine Source-System-Keys als Surrogate Key verwendet
- [ ] `PRIMARY KEY` und `FOREIGN KEY` Constraints gesetzt (Silver + Gold)
- [ ] dbt `unique` + `not_null` Tests auf allen `_key`-Spalten
- [ ] dbt `relationships` Test auf allen FK-Spalten

## Bloomwell-Konventionen

- [ ] Layer-Name nicht im Tabellennamen wiederholt (`contacts` nicht `brz_hubspot_contacts`)
- [ ] SCD-Typ nicht im Tabellennamen kodiert (`dim_patient` nicht `dim_patient_scd2`)
- [ ] Keine nicht-universellen Abkürzungen (`appointment` nicht `appt`)
- [ ] Staging-Modelle als `view` oder `ephemeral` materialisiert — nie als `table`
- [ ] Silver/Gold: vollständige Modell- und Spalten-Beschreibungen vorhanden (CI-Pflicht)
- [ ] `persist_docs` in `dbt_project.yml` aktiv für Silver und Gold

## dbt & CI

- [ ] Alle neuen Spalten in YAML dokumentiert
- [ ] Grain-Statement im Modell-`description` vorhanden (Silver + Gold)
- [ ] Keine fehlenden `not_null` Tests auf Pflichtfeldern
- [ ] `PRIMARY KEY` und `FOREIGN KEY` Constraints via post-hook gesetzt
- [ ] CI-Pipeline lokal simuliert und fehlerfrei

---

*Referenz: `references/datawarehouse_sql_styleguide.md` · `references/kimball_antipatterns.md`*
*Letzte Aktualisierung: März 2026*
