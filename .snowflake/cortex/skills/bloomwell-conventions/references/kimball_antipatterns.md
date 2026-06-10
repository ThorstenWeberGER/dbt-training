# Kimball Anti-Patterns — Fehler, Ursachen & Lösungen

> **Zweck:** Nachschlagewerk für Data Engineers und Modeler. Zeigt die häufigsten Fehler in dimensionalen Datenmodellen, warum sie entstehen, welchen Schaden sie anrichten und wie man sie verhindert oder behebt.
> **Basis:** Kimball Group Methodology, ergänzt um Bloomwell-spezifische Konventionen.

---

## Inhaltsverzeichnis

1. [Grain-Fehler](#1-grain-fehler)
2. [Fact Table Fehler](#2-fact-table-fehler)
3. [Dimension Fehler](#3-dimension-fehler)
4. [SCD-Fehler](#4-scd-fehler)
5. [Schlüssel-Fehler](#5-schlüssel-fehler)
6. [Maßzahl-Fehler (Measures)](#6-maßzahl-fehler-measures)
7. [Architektur-Fehler](#7-architektur-fehler)
8. [Bloomwell-spezifische Fehler](#8-bloomwell-spezifische-fehler)
9. [Schnell-Checkliste vor Go-Live](#9-schnell-checkliste-vor-go-live)

---

## 1. Grain-Fehler

Grain-Fehler sind die gefährlichsten Fehler im dimensionalen Modell. Sie entstehen früh, werden spät entdeckt, und sind teuer zu reparieren.

---

### 1.1 Gemischter Grain in einer Fact Table

**Symptom:** Eine Fact Table enthält Zeilen auf unterschiedlichen Detailebenen — z.B. Einzeltransaktionen und Monatszusammenfassungen im selben Modell.

**Warum es passiert:** Zwei Business-Anfragen in einem Modell beantwortet, um Entwicklungszeit zu sparen.

**Schaden:** SUM() liefert falsche Ergebnisse. Aggregationen doppelzählen oder unterschätzen.

```sql
-- ❌ FALSCH: Zeile 1 ist eine einzelne Transaktion, Zeile 2 ein Monatssummary
| order_key | customer_key | amount  | grain_hint         |
|-----------|-------------|---------|---------------------|
| 1001      | 42          | 150.00  | einzelne Bestellung |
| NULL      | 42          | 4200.00 | Monatssumme April   |

-- SUM(amount) ergibt 4350.00 — total falsch
```

**Lösung:** Ein Grain — eine Fact Table. Zwei Grains — zwei Fact Tables.

```sql
-- ✅ RICHTIG
fct_order          -- Grain: eine Zeile pro Bestellung
fct_order_monthly  -- Grain: eine Zeile pro Kunde pro Monat (Periodic Snapshot)
```

**Prävention:** Grain **zuerst** deklarieren, vor dem ersten DDL-Statement. Dokumentieren als Pflicht in dbt YAML:

```yaml
models:
  - name: fct_prescription
    description: >
      Grain: one prescription event per patient per doctor per prescription_date.
```

> **Faustregel:** Wenn du den Grain nicht in einem Satz beschreiben kannst, ist das Modell falsch.

---

### 1.2 Zu grobes Grain (Over-Aggregation)

**Symptom:** Die Fact Table speichert nur Aggregationen (Tagessummen, Monatsumsätze), nicht atomare Ereignisse.

**Warum es passiert:** Speicherbedenken, oder das Team denkt nur an aktuelle Dashboard-Anforderungen.

**Schaden:** Drilldown ist unmöglich. Neue Analysefragen können nie beantwortet werden. Das Modell muss von Grund auf neu gebaut werden.

```sql
-- ❌ FALSCH: Nur Tagessummen gespeichert
| sales_date | product_key | total_amount |
|------------|-------------|--------------|
| 2024-03-01 | 88          | 4200.00      |

-- Frage: "Wie viele einzelne Transaktionen gab es?" → nicht beantwortbar
-- Frage: "Welche Kunden kauften dieses Produkt?" → nicht beantwortbar
```

**Lösung:** Immer auf atomarem Grain laden. Aggregationen werden on-the-fly oder als `mrt_`-Mart-Tabelle berechnet.

**Prävention:** Defaultregel: niedrigstes verfügbares Grain aus der Quelle laden. Aggregieren in Gold (`mrt_`), nie in Silver.

---

### 1.3 Zu feines Grain (Under-Aggregation)

**Symptom:** Jedes Raw-Event landet als separate Zeile — inkl. System-Pings, Heartbeats, oder technische Duplikate.

**Warum es passiert:** "Wir nehmen alles, dann können wir später entscheiden."

**Schaden:** Fact Table wächst exponentiell. Queries werden langsam. Business-Metriken stimmen nicht, weil technische Events mitzählen.

**Lösung:** Business-Ereignisse definieren, bevor das Modell gebaut wird. Technical Events in Bronze filtern, nicht bis Gold durchreichen.

---

## 2. Fact Table Fehler

---

### 2.1 Beschreibende Attribute direkt in der Fact Table

**Symptom:** Die Fact Table enthält Textspalten wie `customer_name`, `product_category`, `status_label`.

**Warum es passiert:** "Ich brauche das im Report, also leg ich's direkt rein."

**Schaden:**
- Dieselbe Information wird tausende Male gespeichert (jede Transaktion trägt den Kundennamen)
- Keine Filtermöglichkeit über Dimensions-Attribute ohne JOIN
- Änderungen am Attribut (z.B. Namenskorrektur) erfordern Millionen Zeilen-Updates

```sql
-- ❌ FALSCH
CREATE TABLE fct_sales (
    order_key        INT,
    customer_name    VARCHAR(100),   -- gehört in dim_customer
    product_category VARCHAR(50),    -- gehört in dim_product
    sales_amount     DECIMAL(10,2)
);

-- ✅ RICHTIG
CREATE TABLE fct_sales (
    order_key     INT,
    customer_key  INT REFERENCES dim_customer(customer_key),  -- FK zur Dimension
    product_key   INT REFERENCES dim_product(product_key),
    sales_amount  DECIMAL(10,2)
);
```

**Prävention:** Fact Tables enthalten nur: numerische Maßzahlen, Foreign Keys zu Dimensionen, und Degenerate Dimensions (z.B. `order_number`). Alles andere gehört in eine Dimension.

---

### 2.2 Flags und Kategorien direkt in der Fact Table

**Symptom:** Viele Boolean-Spalten oder Low-Cardinality-Codes direkt in der Fact Table: `is_rush_order`, `payment_method`, `shipping_channel`.

**Warum es passiert:** Einfachste Lösung: Spalte hinzufügen.

**Schaden:** Fact Table wird breiter statt schneller. Filterlogik verstreut sich. Bei vielen Flags entsteht ein Verwaltungsalptraum.

**Lösung:** Junk Dimension erstellen — alle Low-Cardinality-Flags in eine eigene Dimension bündeln.

```sql
-- ✅ RICHTIG: Junk Dimension
CREATE TABLE dim_order_flags (
    order_flags_key   INT PRIMARY KEY,
    is_rush_order     BOOLEAN,
    is_gift_wrap      BOOLEAN,
    payment_method    VARCHAR(20),   -- 'credit_card', 'paypal', 'invoice'
    shipping_channel  VARCHAR(20)    -- 'express', 'standard', 'pickup'
);

-- Fact Table bekommt nur einen FK
CREATE TABLE fct_sales (
    order_key        INT,
    customer_key     INT,
    order_flags_key  INT REFERENCES dim_order_flags(order_flags_key),
    sales_amount     DECIMAL(10,2)
);
```

**Prävention:** Mehr als 3 Flags/Codes in einer Fact Table → Junk Dimension prüfen.

---

### 2.3 NULL Foreign Keys in der Fact Table

**Symptom:** Einige FK-Spalten in der Fact Table sind NULL, weil der dazugehörige Dimensionseintrag fehlt oder nicht zutrifft.

**Warum es passiert:** "Nicht jede Bestellung hat einen Promotionscode, also lassen wir das NULL."

**Schaden:**
- `JOIN` auf die Dimension verliert diese Zeilen (INNER JOIN) oder bläht die Query auf (LEFT JOIN mit NULL-Handling)
- Aggregationen zählen NULL-Zeilen falsch oder gar nicht
- BI-Tools verhalten sich inkonsistent bei NULL FK

```sql
-- ❌ FALSCH
| order_key | promotion_key | sales_amount |
|-----------|---------------|--------------|
| 1001      | 55            | 150.00       |
| 1002      | NULL          | 200.00       |  ← geht bei INNER JOIN verloren

-- ✅ RICHTIG: Sentinel-Eintrag in der Dimension
INSERT INTO dim_promotion (promotion_key, promotion_name)
VALUES (-1, 'No Promotion');

| order_key | promotion_key | sales_amount |
|-----------|---------------|--------------|
| 1001      | 55            | 150.00       |
| 1002      | -1            | 200.00       |  ← bleibt immer erhalten
```

**Prävention:** Für jede optionale Dimension einen Sentinel-Eintrag anlegen (`-1` oder `0` als Key, `'Not Applicable'` / `'Unknown'` als Label). Niemals NULL als FK zulassen.

---

### 2.4 YTD und laufende Summen als Maßzahlen gespeichert

**Symptom:** Die Fact Table speichert `ytd_sales`, `running_total`, `cumulative_revenue`.

**Warum es passiert:** Das BI-Tool wurde als zu schwach eingeschätzt, oder der Report wurde direkt aus dem Modell gebaut.

**Schaden:**
- Doppelzählung bei Aggregation: `SUM(ytd_sales)` über alle Monate ergibt Unsinn
- Non-additive Maßzahl — kann nicht über Dimensionen summiert werden
- ETL wird komplex und fehleranfällig

**Lösung:** Nur atomare, additive Basismaßzahlen speichern. Laufende Summen im BI-Layer oder in `mrt_`-Tabellen berechnen.

```sql
-- ❌ FALSCH
| month_key | customer_key | ytd_revenue |
|-----------|-------------|--------------|
| 2024-01   | 42          | 1000.00      |
| 2024-02   | 42          | 2300.00      |
-- SUM(ytd_revenue) = 3300 — falsch, richtig wäre 2300

-- ✅ RICHTIG
| month_key | customer_key | monthly_revenue |
|-----------|-------------|-----------------|
| 2024-01   | 42          | 1000.00         |
| 2024-02   | 42          | 1300.00         |
-- SUM(monthly_revenue) = 2300 ✓
-- YTD = Window Function im BI-Layer: SUM(monthly_revenue) OVER (PARTITION BY customer_key ORDER BY month_key)
```

---

## 3. Dimension Fehler

---

### 3.1 Snowflaking — übernormalisierte Dimensionen

**Symptom:** Hierarchien werden in separate Tabellen ausgelagert: `dim_product` → `dim_subcategory` → `dim_category` → `dim_department`.

**Warum es passiert:** Normalisierungsreflex aus dem OLTP-Datenbankdesign.

**Schaden:**
- Jede Query braucht mehrere JOINs, um eine einfache Filterfrage zu beantworten
- BI-Tools kommen nicht gut mit normalisierten Schemas klar
- Entwicklungszeit steigt, Abfrageperformance sinkt

```sql
-- ❌ FALSCH: Snowflake Schema
dim_product → (subcategory_key) → dim_subcategory → (category_key) → dim_category

-- Query: "Umsatz nach Kategorie"
SELECT c.category_name, SUM(f.sales_amount)
FROM fct_sales f
JOIN dim_product p      ON f.product_key = p.product_key
JOIN dim_subcategory sc ON p.subcategory_key = sc.subcategory_key
JOIN dim_category c     ON sc.category_key = c.category_key
GROUP BY c.category_name;

-- ✅ RICHTIG: Flache Dimension
CREATE TABLE dim_product (
    product_key      INT PRIMARY KEY,
    product_name     VARCHAR(200),
    subcategory_name VARCHAR(100),   -- denormalisiert
    category_name    VARCHAR(100),   -- denormalisiert
    department_name  VARCHAR(100)    -- denormalisiert
);

-- Query wird trivial:
SELECT p.category_name, SUM(f.sales_amount)
FROM fct_sales f
JOIN dim_product p ON f.product_key = p.product_key
GROUP BY p.category_name;
```

**Prävention:** Hierarchien in der Dimension flach denormalisieren. Speicher ist günstig. Entwickler- und Analysten-Zeit ist es nicht.

---

### 3.2 Codes ohne lesbare Bezeichnungen

**Symptom:** Dimensionen enthalten nur Codes, aber keine beschreibenden Labels: `status = 'A'`, `type_code = '03'`.

**Warum es passiert:** Direkte Übernahme aus dem Source-System ohne Anreicherung.

**Schaden:**
- Analysten müssen Lookup-Tabellen konsultieren
- BI-Reports zeigen unlesbare Werte
- Filter im Dashboard ergeben keinen Sinn für Business-User

```sql
-- ❌ FALSCH
dim_appointment:
| appointment_key | status_code |
|-----------------|-------------|
| 1               | 'A'         |
| 2               | 'C'         |
| 3               | 'NS'        |

-- ✅ RICHTIG
dim_appointment:
| appointment_key | status_code | status_name  | status_description              |
|-----------------|-------------|--------------|----------------------------------|
| 1               | 'A'         | 'Active'     | 'Appointment is confirmed'       |
| 2               | 'C'         | 'Cancelled'  | 'Cancelled by patient or clinic' |
| 3               | 'NS'        | 'No Show'    | 'Patient did not appear'         |
```

**Prävention:** Jeder Code bekommt ein menschenlesbares `_name`-Gegenstück in der Dimension. Source-Codes werden bewahrt (`_id` Suffix), nie überschrieben.

---

### 3.3 Nicht-konforme Dimensionen

**Symptom:** `dim_patient` existiert zweimal — einmal für das Prescription-Modell, einmal für das Appointment-Modell — mit leicht unterschiedlichen Attributen und Keys.

**Warum es passiert:** Teams arbeiten isoliert. Jedes Team baut seine eigene Version.

**Schaden:**
- Cross-Domain-Analysen sind unmöglich (Prescription JOIN Appointment bricht auf Key-Konflikte)
- Dieselbe Entität hat unterschiedliche Surrogate Keys in verschiedenen Modellen
- Doppelte Wartung, doppelte Bugs

**Lösung:** Eine Dimension — eine Wahrheit. Alle Fact Tables referenzieren dieselbe `dim_patient` in Silver. Gold-Marts nutzen Views oder Subsets, keine eigene Kopie.

**Prävention:** Bus Matrix vor Entwicklungsbeginn erstellen: Fact Tables (Zeilen) × Dimensionen (Spalten). Jede Dimension darf nur einmal vorkommen.

---

### 3.4 Dimension wächst im selben Tempo wie die Fact Table

**Symptom:** `dim_order` hat fast genauso viele Zeilen wie `fct_order_line`.

**Warum es passiert:** Degenerate Dimensions wurden als vollwertige Dimensionen modelliert.

**Schaden:** Unnötiger Speicher und Join-Overhead für Attribute, die keine echten Dimensionseigenschaften haben.

**Diagnose:** Wenn eine "Dimension" nur aus dem Business-Key besteht (z.B. `order_number`) und keine eigenen Attribute hat — ist es eine Degenerate Dimension.

**Lösung:** Degenerate Dimensions direkt in der Fact Table speichern, ohne eigene Dimensionstabelle.

```sql
-- ❌ FALSCH: Eigene Tabelle für reinen Business-Key
CREATE TABLE dim_order (
    order_key    INT PRIMARY KEY,
    order_number VARCHAR(20)    -- einzige Spalte außer dem Key
);

-- ✅ RICHTIG: Direkt in der Fact Table als Degenerate Dimension
CREATE TABLE fct_order_line (
    order_line_key  INT PRIMARY KEY,
    order_number    VARCHAR(20),    -- degenerate dimension — kein FK nötig
    customer_key    INT REFERENCES dim_customer(customer_key),
    product_key     INT REFERENCES dim_product(product_key),
    quantity        INT,
    line_amount     DECIMAL(10,2)
);
```

---

## 4. SCD-Fehler

---

### 4.1 SCD-Strategie nicht deklariert

**Symptom:** Das ETL wurde gebaut, bevor das Team entschieden hat, ob `dim_patient.address` historisiert wird oder nicht.

**Warum es passiert:** Die Frage wurde als "technisches Detail" für später aufgeschoben.

**Schaden:** Bei einer Adressänderung eines Patienten überschreibt das ETL den alten Wert (Type 1). Alle historischen Prescriptions zeigen nun die neue Adresse — historische Analysen sind korrumpiert.

**Prävention:** Für jedes Attribut in jeder Dimension **vor** dem ersten ETL-Run deklarieren:

```yaml
# dbt YAML — SCD-Strategie dokumentieren
models:
  - name: dim_patient
    description: >
      SCD Type 2 on: address, insurance_provider.
      SCD Type 1 on: email, phone_number (corrections only, no history needed).
      SCD Type 0 on: birth_date, patient_id (never changes).
```

---

### 4.2 SCD Type 2 ohne `is_current` Flag und `expiry_date`

**Symptom:** Die Dimension hat eine `effective_date`-Spalte, aber kein `is_current`-Flag. Queries müssen `MAX(effective_date)` berechnen, um die aktuelle Zeile zu finden.

**Warum es passiert:** "Wir brauchen das Flag nicht, wir können es berechnen."

**Schaden:** Jeder Query auf die Dimension wird langsam und komplex. Window Functions auf großen Dimensionen sind teuer.

```sql
-- ❌ FALSCH: Kein is_current Flag
SELECT *
FROM dim_patient
WHERE patient_id = 'P-1234'
  AND effective_date = (
      SELECT MAX(effective_date) FROM dim_patient WHERE patient_id = 'P-1234'
  );

-- ✅ RICHTIG: Mit is_current und expiry_date
SELECT *
FROM dim_patient
WHERE patient_id = 'P-1234'
  AND is_current = TRUE;
```

**Standard-SCD2-Struktur:**

```sql
CREATE TABLE dim_patient (
    patient_key        INT PRIMARY KEY,      -- surrogate, eindeutig pro Version
    patient_id         VARCHAR(20),          -- business key, wiederholt sich über Versionen
    patient_name       VARCHAR(100),
    address            VARCHAR(200),
    effective_date     DATE NOT NULL,
    expiry_date        DATE,                 -- NULL = aktuell gültig
    is_current         BOOLEAN NOT NULL,
    PRIMARY KEY (patient_key)
);
```

---

### 4.3 SCD Type 2 auf volatilen Attributen

**Symptom:** Die Dimension historisiert ein Attribut, das sich täglich oder stündlich ändert (z.B. `last_login_at`, `session_count`).

**Warum es passiert:** "Wir wollen alles historisieren, sicher ist sicher."

**Schaden:** Die Dimension wächst unkontrolliert. Joins werden langsamer. Der Mehrwert der Historisierung ist minimal.

**Lösung:** Type 4 (Mini-Dimension) für schnell ändernde Attribute, oder in eine separate Fact Table auslagern.

---

## 5. Schlüssel-Fehler

---

### 5.1 Source-System Keys als Surrogate Keys verwendet

**Symptom:** Der Primary Key der Dimension ist der Business-Key aus dem Source-System: `patient_key = hubspot_contact_id`.

**Warum es passiert:** "Der Key aus HubSpot ist stabil, wir brauchen keinen eigenen."

**Schaden:**
- Zweites Source-System (z.B. Xpertyme) hat andere IDs — Key-Kollisionen bei der Integration
- Bei SCD Type 2 wird dieselbe Entität mehrfach als Zeile gespeichert — Business-Key kann nicht mehr als PK dienen
- ETL-Reihenfolge wird abhängig von Source-System-IDs

```sql
-- ❌ FALSCH
CREATE TABLE dim_patient (
    hubspot_contact_id  VARCHAR(20) PRIMARY KEY,  -- source key als PK
    patient_name        VARCHAR(100)
);

-- ✅ RICHTIG
CREATE TABLE dim_patient (
    patient_key         INT PRIMARY KEY,           -- eigener Surrogate Key
    patient_id          VARCHAR(20),               -- business key (_id suffix)
    hubspot_contact_id  VARCHAR(20),               -- source reference
    patient_name        VARCHAR(100)
);
```

**Ausnahme:** Stabile Referenzdaten (ISO-Ländercodes, Währungscodes) können den Business-Key als PK verwenden — wenn Stabilität explizit dokumentiert ist.

---

### 5.2 `_key` und `_id` Suffixe vertauscht

**Symptom:** Ein Surrogate Key heißt `patient_id`, oder ein Business-Key heißt `patient_key`.

**Warum es passiert:** Konvention wurde nicht konsequent angewendet.

**Schaden:** Andere Entwickler und BI-Tools bauen auf falschen Annahmen auf. Joins brechen oder liefern falsche Ergebnisse.

**Regel — keine Ausnahmen:**

| Suffix | Bedeutung |
|--------|-----------|
| `_key` | Surrogate Integer Key — intern generiert |
| `_id`  | Business/Natural Key — aus dem Source-System |

---

### 5.3 Fehlende Constraints und dbt-Tests

**Symptom:** Silver- und Gold-Tabellen haben weder `PRIMARY KEY` / `FOREIGN KEY` Constraints noch dbt-Tests auf den Key-Spalten.

**Warum es passiert:** "Snowflake enforced sie sowieso nicht, warum der Aufwand?"

**Schaden:**
- Keine ER-Diagram-Generierung möglich
- Cortex AI kann Join-Pfade nicht ableiten
- Datenfehler (doppelte Keys, verwaiste FKs) werden nicht erkannt
- CI gibt kein Signal bei Datenqualitätsproblemen

**Pflicht für Silver und Gold:**

```sql
-- Constraint (Metadata)
ALTER TABLE dim_patient ADD PRIMARY KEY (patient_key);
ALTER TABLE fct_prescription ADD FOREIGN KEY (patient_key)
  REFERENCES dim_patient (patient_key);
```

```yaml
# dbt Test (Enforcement)
- name: patient_key
  tests:
    - unique
    - not_null
- name: pharmacy_key
  tests:
    - relationships:
        to: ref('dim_pharmacy')
        field: pharmacy_key
```

---

## 6. Maßzahl-Fehler (Measures)

---

### 6.1 Additivität nicht dokumentiert

**Symptom:** Eine Maßzahl ist in der Fact Table, aber nirgendwo steht, ob sie summierbar ist.

**Warum es passiert:** "Das ist doch offensichtlich."

**Schaden:** Ein Analyst summiert `account_balance` über alle Monate — Ergebnis ist faktisch falsch (semi-additive Maßzahl).

**Pflicht für jede Maßzahl:**

```yaml
columns:
  - name: sales_amount
    description: "Additive. Umsatz in Cent. Kann über alle Dimensionen summiert werden."
  - name: account_balance
    description: "Semi-additiv. Kontostand in Cent. Summierbar über Accounts, NICHT über Zeit. Für Zeitvergleiche AVG oder LAST verwenden."
  - name: fill_ratio
    description: "Non-additiv. Verhältnis dispensed/prescribed. Niemals summieren — Zähler und Nenner separat aggregieren."
```

---

### 6.2 Ratios und Prozentsätze direkt als Maßzahl gespeichert

**Symptom:** Die Fact Table speichert `fill_rate = 0.87`, `margin_pct = 0.32`.

**Warum es passiert:** Der Report braucht die Zahl so — warum nicht direkt speichern?

**Schaden:** `SUM(fill_rate)` über mehrere Produkte ergibt Unsinn. Ratios sind non-additiv.

**Lösung:** Immer Zähler und Nenner separat speichern, Ratio im BI-Layer berechnen.

```sql
-- ❌ FALSCH
| product_key | fill_rate |
|-------------|-----------|
| 10          | 0.90      |
| 11          | 0.70      |
-- SUM(fill_rate) = 1.60 → bedeutungslos

-- ✅ RICHTIG
| product_key | prescribed_quantity | dispensed_quantity |
|-------------|--------------------|--------------------|
| 10          | 100                | 90                 |
| 11          | 50                 | 35                 |
-- fill_rate = SUM(dispensed_quantity) / SUM(prescribed_quantity) = 125/150 = 0.833 ✓
```

---

## 7. Architektur-Fehler

---

### 7.1 Fact Table direkt aus Bronze befüllt (Layer-Skip)

**Symptom:** Ein ETL-Job liest direkt aus `BRONZE.HUBSPOT.deals` und schreibt in `SILVER.dim_pipeline`.

**Warum es passiert:** "Weniger Layer = weniger Latenz."

**Schaden:**
- Keine Silver-Zwischenschicht als Qualitätspuffer
- Datentypfehler, Duplikate und NULL-Probleme aus Bronze landen ungeprüft in Gold
- Silver kann nicht ohne Neuaufbau von Gold wiederhergestellt werden

**Regel:** Bronze → Staging → Silver → Gold. Jeder Layer hat seinen Vertrag. Kein Skip ohne explizite Dokumentation und Team-Review.

---

### 7.2 Aggregationen in Silver statt Gold

**Symptom:** Silver-Modelle enthalten `GROUP BY`, `SUM()`, vorgefertigte KPIs.

**Warum es passiert:** "Der Report braucht das schnell."

**Schaden:**
- Silver verliert seine Rolle als "Single Source of Truth" auf atomarem Grain
- Gold-Modelle können Silver nicht mehr als zuverlässige Basis nutzen
- Bei neuen Analysefragen müssen Silver-Modelle aufgebrochen werden

**Regel:** Silver = bereinigt, konformiert, atomares Grain. Aggregationen gehören in Gold (`mrt_`-Tabellen).

---

### 7.3 Viele-zu-Viele ohne Bridge Table

**Symptom:** Eine Promotion gilt für mehrere Produkte. Der ETL löst das durch Duplikation der Fact-Zeile — einmal pro Promotion.

**Warum es passiert:** Bridge Tables wirken komplex. Duplikation ist einfacher.

**Schaden:** `SUM(sales_amount)` doppelzählt — einmal pro Promotion. Ergebnisse sind schlicht falsch.

```sql
-- ❌ FALSCH: Duplikation der Fact-Zeile
| order_key | promotion_key | sales_amount |
|-----------|---------------|--------------|
| 1001      | 55            | 200.00       |  ← selbe Bestellung
| 1001      | 56            | 200.00       |  ← nochmal, andere Promotion
-- SUM = 400.00 statt 200.00

-- ✅ RICHTIG: Bridge Table mit Weighting Factor
bridge_order_promotion:
| order_key | promotion_key | weighting_factor |
|-----------|---------------|-----------------|
| 1001      | 55            | 0.5             |
| 1001      | 56            | 0.5             |

-- Korrekte Aggregation:
SELECT SUM(f.sales_amount * b.weighting_factor)  -- = 200.00 ✓
FROM fct_sales f
JOIN bridge_order_promotion b ON f.order_key = b.order_key
```

---

## 8. Bloomwell-spezifische Fehler

---

### 8.1 Layer-Name im Tabellennamen wiederholen

```sql
-- ❌ FALSCH
BRONZE.HUBSPOT.brz_hubspot_contacts   -- "brz" und "hubspot" doppelt
SILVER.APPOINTMENTS.silver_dim_patient -- "silver" im Namen

-- ✅ RICHTIG
BRONZE.HUBSPOT.contacts
SILVER.APPOINTMENTS.dim_patient
```

---

### 8.2 SCD-Typ im Tabellennamen kodieren

```sql
-- ❌ FALSCH
dim_patient_scd2
dim_pipeline_type2

-- ✅ RICHTIG
dim_patient   -- SCD-Strategie in dbt YAML dokumentieren
```

---

### 8.3 Nicht-universelle Abkürzungen

```sql
-- ❌ FALSCH
appt_key      -- "appt" für appointment
rx_date       -- "rx" für prescription
pharm_key     -- "pharm" für pharmacy

-- ✅ RICHTIG
appointment_key
prescription_date
pharmacy_key
```

---

### 8.4 Staging-Modelle als Tabellen materialisieren

```yaml
# ❌ FALSCH
models:
  - name: hubspot__contacts
    config:
      materialized: table   # Staging nie als Tabelle

# ✅ RICHTIG
models:
  - name: hubspot__contacts
    config:
      materialized: view    # oder ephemeral
```

---

### 8.5 Silver/Gold ohne Grain-Statement oder Spalten-Beschreibungen

```yaml
# ❌ FALSCH — CI schlägt fehl
models:
  - name: fct_prescription
    description: "Prescriptions."   # kein Grain, unvollständig

# ✅ RICHTIG
models:
  - name: fct_prescription
    description: >
      Grain: one prescription event per patient per doctor per prescription_date.
      Enthält alle ausgestellten Rezepte aus dem Pharmacy-System.
    columns:
      - name: prescription_key
        description: "Surrogate Key. Generiert via MD5-Hash über patient_id, doctor_id, prescription_date."
        tests: [unique, not_null]
```

---

## 9. Schnell-Checkliste vor Go-Live

Vor jedem Merge in Production:

**Grain & Struktur**
- [ ] Grain in einem Satz dokumentiert (dbt YAML `description`)
- [ ] Kein gemischter Grain in einer Fact Table
- [ ] Keine Textspalten oder Flags direkt in der Fact Table
- [ ] Keine NULL Foreign Keys — Sentinel-Einträge (`-1`) vorhanden
- [ ] Viele-zu-Viele-Beziehungen über Bridge Tables gelöst

**Maßzahlen**
- [ ] Additivität für jede Maßzahl dokumentiert (additiv / semi-additiv / non-additiv)
- [ ] Keine YTD- oder laufende Summen als gespeicherte Maßzahlen
- [ ] Ratios als Zähler + Nenner gespeichert, nicht als Prozentwert

**Dimensionen**
- [ ] Hierarchien in der Dimension flach denormalisiert (kein Snowflaking)
- [ ] Jeder Code hat ein lesbares `_name`-Gegenstück
- [ ] Dimensionen sind konformiert (keine lokalen Kopien)
- [ ] SCD-Strategie pro Attribut deklariert (in dbt YAML)
- [ ] SCD2-Dimensionen haben `effective_date`, `expiry_date`, `is_current`

**Schlüssel**
- [ ] Surrogate Keys (`_key`) für alle Silver/Gold-Dimensionen
- [ ] Business Keys (`_id`) als separate Spalte erhalten
- [ ] Keine Source-System-Keys als Surrogate Key verwendet
- [ ] `PRIMARY KEY` und `FOREIGN KEY` Constraints gesetzt (Silver + Gold)
- [ ] dbt `unique` + `not_null` Tests auf allen `_key`-Spalten
- [ ] dbt `relationships` Test auf allen FK-Spalten

**Bloomwell-Konventionen**
- [ ] Layer-Name nicht im Tabellennamen wiederholt
- [ ] SCD-Typ nicht im Tabellennamen kodiert
- [ ] Keine nicht-universellen Abkürzungen
- [ ] Staging-Modelle als `view` oder `ephemeral` materialisiert
- [ ] Silver/Gold: vollständige Modell- und Spalten-Beschreibungen (CI-Pflicht)

---

*Letzte Aktualisierung: März 2026 · Maintainer: Data Engineering Team*
