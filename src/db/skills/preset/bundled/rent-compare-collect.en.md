---
name: Rent listing collector
description: Extract comparable structured JSON from a rental listing page. Do not rank listings or recommend a winner.
---

# Purpose

From the current **rental listing page**, extract comparable fields and output a single listing JSON for storage. That JSON can also be handed to **Rental pitfall check** (the check skill does not require JSON).

This Skill **only collects**. Do not output risk conclusions or which listing is better.

# Output rules

- Output **exactly one** JSON object that matches the contract below.
- Do not output explanatory prose or chatter outside Markdown fences.
- Use `null` for unknown fields; use `[]` for empty arrays.
- If key fields (`cost.rentMonthly`, `space.areaSqm`, city or community, `rentType`) are missing, still emit them as `null`. Do not invent values.
- Prefer **English** for controlled enums and clear labels (`rentType`, payment cadence, water/electric type, facing, floor band, etc.). Free-text titles and place names may follow the page language when a natural English form is unclear.

# Do not extract

- Agent **personal** names, phone numbers, WeChat IDs (not needed for comparison, and privacy-sensitive)
- Complaint hotlines, penalty-record entry points, sample-contract marketing copy and buttons
- Recommended listings and nearby listing lists
- Photo URL inventories and photo counts (unless the user explicitly wants floor-plan images only)
- Page analytics pixels and share QR codes

> The agency/operator **company or brand** must be extracted; see `agency`. Do not extract personal contact details.

# Field derivation

- `flags.commercialWaterOrElectric`: commercial water or commercial electricity → `true`
- `flags.noElevatorAndHighFloor`: no elevator and a high floor → `true`
- When `rentType` is `entire`: `coliving.households` and `coliving.occupiedRooms` are both `null` (do not fill them from bedroom count)
- When `rentType` is `shared`: fill numbers if the page states how many households / occupied rooms; otherwise `null`. Do not use `space.bedrooms` as household count
- Map local page labels for entire-unit / shared housing to `entire` / `shared`
- `location.nearestSubway`: keep the nearest 1–3 stations, sorted by `distanceMeters` ascending
- `cost.tenantPays` = tenant-paid items; `cost.landlordPays` = landlord-paid items
- `space.elevator`: yes → `true`, no → `false`
- If the page marks a must-have facility as missing, put it in `facilities.unavailable` (especially: bed, fridge, washer, AC, water heater, broadband)
- `agency.partyType`: infer listing-party type from page copy; use `unknown` if unsure; do not guess `sublessor`
  - `agency`: brokerage intermediary (e.g. Lianjia, 5i5j)
  - `brand_apartment`: branded / managed apartments (e.g. Ziroom, Xiangyu, Jikezu)
  - `sublessor`: clearly a sublessor / re-let / master-lease
  - `landlord`: landlord direct let
  - `unknown`: cannot tell

# Field notes (English keys ↔ page labels)

JSON keys stay in English. Align extraction with on-page labels. This table is for mapping only — **do not** copy it into the output JSON.

## Top level

| Field | Page / meaning |
|------|-----------|
| `id` | Listing id (e.g. Lianjia `BJ…` / houseCode) |
| `url` | Detail-page URL |
| `title` | Listing title |
| `rentType` | Lease type: `entire` / `shared` |

## `coliving` (entire-unit stays empty)

| Field | Page / meaning |
|------|-----------|
| `households` | How many households share (entire → `null`; not stated → `null`) |
| `occupiedRooms` | How many rooms are occupied (entire → `null`; not the same as `space.bedrooms`) |

## `agency` listing party (broker / brand / sublessor, etc.)

| Field | Page / meaning |
|------|-----------|
| `platform` | Hosting platform (e.g. Lianjia, Beike, Xianyu) |
| `brand` | Product or brand name (e.g. Jikezu, Ziroom; else `null`) |
| `company` | Operating / brokerage company name if shown |
| `partyType` | `agency` / `brand_apartment` / `sublessor` / `landlord` / `unknown` |
| `productType` | Product form (e.g. standard let, hassle-free let; else `null`) |
| `note` | Short on-page phrase that helps classify the party (optional; else `null`) |

## `cost`

| Field | Page / meaning |
|------|-----------|
| `rentMonthly` | Rent (CNY / month) |
| `paymentMethod` | Payment cadence (monthly / quarterly / yearly, etc.) |
| `deposit` | Deposit (CNY) |
| `agencyFee` | Agency / brokerage fee (CNY, usually one-off) |
| `serviceFeeYearly` | Service fee (CNY / year) |
| `tenantPays` | Costs the tenant pays |
| `landlordPays` | Costs the landlord pays |

## `location`

| Field | Page / meaning |
|------|-----------|
| `city` / `district` / `bizcircle` / `community` | City / district / biz circle / community |
| `coordinates` | `longitude`, `latitude` |
| `nearestSubway` | Nearby metro: `station`, `lines`, `distanceMeters` |

## `space`

| Field | Page / meaning |
|------|-----------|
| `bedrooms` / `livingRooms` / `bathrooms` | Beds / living rooms / baths |
| `areaSqm` | Area (㎡) |
| `orientation` | Facing |
| `floorLevel` | Floor band (high / mid / low) |
| `totalFloors` | Total floors |
| `elevator` | Elevator (yes → `true`, no → `false`) |
| `decoration` | Fit-out (e.g. fully furnished) |
| `parking` | Parking |

## `utilities`

| Field | Page / meaning |
|------|-----------|
| `water` | Water (residential / commercial) |
| `electricity` | Electricity (residential / commercial) |
| `gas` | Gas |
| `heating` | Heating (district / self-heating, etc.) |

## `facilities`

| Field | Page / meaning |
|------|-----------|
| `available` | Present amenities |
| `unavailable` | Explicitly missing amenities |

## `lease` (not rent, not layout)

| Field | Page / meaning |
|------|-----------|
| `checkIn` | **Move-in** (when you can move in, e.g. “anytime”) |
| `viewing` | **Viewing** (when you can visit) |
| `leaseTerm` | **Term** (minimum / agreed length; “no data” → `null`) |

## `tags` / `flags`

| Field | Meaning |
|------|------|
| `tags` | Listing tags |
| `flags.commercialWaterOrElectric` | Commercial water or electricity |
| `flags.noElevatorAndHighFloor` | No elevator and high floor |

# Output contract

The model must **only** output JSON in this shape (keep field names and types):

```json
{
  "id": "string",
  "url": "string",
  "title": "string",
  "rentType": "entire | shared",
  "coliving": {
    "households": "number|null",
    "occupiedRooms": "number|null"
  },
  "agency": {
    "platform": "string|null",
    "brand": "string|null",
    "company": "string|null",
    "partyType": "agency | brand_apartment | sublessor | landlord | unknown",
    "productType": "string|null",
    "note": "string|null"
  },
  "cost": {
    "rentMonthly": "number",
    "paymentMethod": "string|null",
    "deposit": "number|null",
    "agencyFee": "number|null",
    "serviceFeeYearly": "number|null",
    "tenantPays": ["string"],
    "landlordPays": ["string"]
  },
  "location": {
    "city": "string|null",
    "district": "string|null",
    "bizcircle": "string|null",
    "community": "string|null",
    "coordinates": {
      "longitude": "string|number|null",
      "latitude": "string|number|null"
    },
    "nearestSubway": [
      {
        "station": "string",
        "lines": ["string"],
        "distanceMeters": "number"
      }
    ]
  },
  "space": {
    "bedrooms": "number|null",
    "livingRooms": "number|null",
    "bathrooms": "number|null",
    "areaSqm": "number|null",
    "orientation": ["string"],
    "floorLevel": "string|null",
    "totalFloors": "number|null",
    "elevator": "boolean|null",
    "decoration": "string|null",
    "parking": "string|null"
  },
  "utilities": {
    "water": "string|null",
    "electricity": "string|null",
    "gas": "boolean|null",
    "heating": "string|null"
  },
  "facilities": {
    "available": ["string"],
    "unavailable": ["string"]
  },
  "lease": {
    "checkIn": "string|null",
    "viewing": "string|null",
    "leaseTerm": "string|null"
  },
  "tags": ["string"],
  "flags": {
    "commercialWaterOrElectric": "boolean",
    "noElevatorAndHighFloor": "boolean"
  }
}
```

> `lease`: `checkIn` → move-in, `viewing` → viewing, `leaseTerm` → term. Output still uses English keys. `rentType` must be `entire` or `shared`.

# Example (Lianjia entire-unit page; shape only)

```json
{
  "id": "BJ2196277172245626880",
  "url": "https://bj.lianjia.com/zufang/BJ2196277172245626880.html",
  "title": "Entire · Xinbi Street 3bd 1lr South/North",
  "rentType": "entire",
  "coliving": {
    "households": null,
    "occupiedRooms": null
  },
  "agency": {
    "platform": "Lianjia",
    "brand": "Jikezu",
    "company": "Huiju Chanyan",
    "partyType": "brand_apartment",
    "productType": "standard let",
    "note": "Intermediate product between standard let and hassle-free let"
  },
  "cost": {
    "rentMonthly": 12500,
    "paymentMethod": "quarterly",
    "deposit": 12500,
    "agencyFee": 12500,
    "serviceFeeYearly": 0,
    "tenantPays": ["water", "electricity", "gas", "parking"],
    "landlordPays": ["property management fee", "heating fee"]
  },
  "location": {
    "city": "Beijing",
    "district": "Xicheng",
    "bizcircle": "Xidan",
    "community": "Xinbi Street",
    "coordinates": {
      "longitude": "116.38656460069",
      "latitude": "39.908054939761"
    },
    "nearestSubway": [
      {
        "station": "Hepingmen",
        "lines": ["Line 2"],
        "distanceMeters": 438
      },
      {
        "station": "Xuanwumen",
        "lines": ["Line 2", "Line 4 Daxing"],
        "distanceMeters": 616
      }
    ]
  },
  "space": {
    "bedrooms": 3,
    "livingRooms": 1,
    "bathrooms": 2,
    "areaSqm": 108.77,
    "orientation": ["south", "north"],
    "floorLevel": "high floor",
    "totalFloors": 6,
    "elevator": false,
    "decoration": "fully renovated",
    "parking": null
  },
  "utilities": {
    "water": "residential",
    "electricity": "residential",
    "gas": true,
    "heating": "self-heating"
  },
  "facilities": {
    "available": ["washer", "AC", "wardrobe", "fridge", "water heater", "bed", "radiator", "natural gas"],
    "unavailable": ["TV", "broadband"]
  },
  "lease": {
    "checkIn": "anytime",
    "viewing": "view anytime",
    "leaseTerm": null
  },
  "tags": ["renovated", "two bathrooms", "view anytime"],
  "flags": {
    "commercialWaterOrElectric": false,
    "noElevatorAndHighFloor": true
  }
}
```

# Related Skill

For a pitfall check, use **Rental pitfall check** (input format is unrestricted; this Skill’s JSON is only optional material).
