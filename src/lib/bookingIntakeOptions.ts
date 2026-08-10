export const VEHICLE_TYPES = [
  "Car",
  "Truck",
  "Van",
  "SUV",
  "Motorcycle",
  "RV/Motorhome",
  "Trailer",
  "Other",
];

export const VEHICLE_MAKES = [
  "Toyota",
  "Honda",
  "Ford",
  "Chevrolet",
  "Dodge",
  "BMW",
  "Mercedes",
  "Audi",
  "Hyundai",
  "Kia",
  "Nissan",
  "Volkswagen",
  "Tesla",
  "Ram",
  "GMC",
  "Jeep",
  "Subaru",
  "Mazda",
  "Other",
];

export const VEHICLE_COLOURS = [
  "White",
  "Black",
  "Silver/Grey",
  "Red",
  "Blue",
  "Green",
  "Yellow",
  "Orange",
  "Brown",
  "Gold",
  "Other",
];

export const CA_PROVINCES = [
  ["AB", "Alberta"],
  ["BC", "British Columbia"],
  ["MB", "Manitoba"],
  ["NB", "New Brunswick"],
  ["NL", "Newfoundland and Labrador"],
  ["NS", "Nova Scotia"],
  ["NT", "Northwest Territories"],
  ["NU", "Nunavut"],
  ["ON", "Ontario"],
  ["PE", "Prince Edward Island"],
  ["QC", "Quebec"],
  ["SK", "Saskatchewan"],
  ["YT", "Yukon"],
] as const;

export const US_STATES = [
  ["AL","Alabama"],["AK","Alaska"],["AZ","Arizona"],["AR","Arkansas"],["CA","California"],
  ["CO","Colorado"],["CT","Connecticut"],["DE","Delaware"],["DC","District of Columbia"],
  ["FL","Florida"],["GA","Georgia"],["HI","Hawaii"],["ID","Idaho"],["IL","Illinois"],
  ["IN","Indiana"],["IA","Iowa"],["KS","Kansas"],["KY","Kentucky"],["LA","Louisiana"],
  ["ME","Maine"],["MD","Maryland"],["MA","Massachusetts"],["MI","Michigan"],["MN","Minnesota"],
  ["MS","Mississippi"],["MO","Missouri"],["MT","Montana"],["NE","Nebraska"],["NV","Nevada"],
  ["NH","New Hampshire"],["NJ","New Jersey"],["NM","New Mexico"],["NY","New York"],
  ["NC","North Carolina"],["ND","North Dakota"],["OH","Ohio"],["OK","Oklahoma"],
  ["OR","Oregon"],["PA","Pennsylvania"],["RI","Rhode Island"],["SC","South Carolina"],
  ["SD","South Dakota"],["TN","Tennessee"],["TX","Texas"],["UT","Utah"],["VT","Vermont"],
  ["VA","Virginia"],["WA","Washington"],["WV","West Virginia"],["WI","Wisconsin"],["WY","Wyoming"],
] as const;

export const PROVINCE_STATE_GROUPS = [
  { label: "Canada", options: CA_PROVINCES.map(([v, l]) => ({ value: `CA-${v}`, label: l })) },
  { label: "United States", options: US_STATES.map(([v, l]) => ({ value: `US-${v}`, label: l })) },
];

const VEHICLE_TYPE_SLUGS: Record<string, string> = {
  "Car": "car",
  "Truck": "truck",
  "Van": "van",
  "SUV": "suv",
  "Motorcycle": "motorcycle",
  "RV/Motorhome": "rv",
  "Trailer": "trailer",
};

const VEHICLE_COLOUR_SLUGS: Record<string, string> = {
  "White": "white",
  "Black": "black",
  "Silver/Grey": "silverGrey",
  "Red": "red",
  "Blue": "blue",
  "Green": "green",
  "Yellow": "yellow",
  "Orange": "orange",
  "Brown": "brown",
  "Gold": "gold",
};

const CA_PROVINCE_SLUGS: Record<string, string> = {
  AB: "alberta", BC: "britishColumbia", MB: "manitoba", NB: "newBrunswick",
  NL: "newfoundlandLabrador", NS: "novaScotia", NT: "northwestTerritories",
  NU: "nunavut", ON: "ontario", PE: "princeEdwardIsland", QC: "quebec",
  SK: "saskatchewan", YT: "yukon",
};

/** Translates a VEHICLE_TYPES value for display; "Other" is handled via common.other by the caller. */
export function getVehicleTypeLabel(t: (key: string) => string, value: string): string {
  const slug = VEHICLE_TYPE_SLUGS[value];
  return slug ? t(`bookingIntake.vehicleType.${slug}`) : value === "Other" ? t("common.other") : value;
}

/** Translates a VEHICLE_COLOURS value for display; "Other" is handled via common.other by the caller. */
export function getVehicleColourLabel(t: (key: string) => string, value: string): string {
  const slug = VEHICLE_COLOUR_SLUGS[value];
  return slug ? t(`bookingIntake.vehicleColour.${slug}`) : value === "Other" ? t("common.other") : value;
}

/** Builds the province/state Select groups with translated Canadian province names.
 * US state names are intentionally left in English (see bilingual rollout notes). */
export function getProvinceStateGroups(t: (key: string, opts?: Record<string, unknown>) => string) {
  return [
    {
      label: t("bookingIntake.canada"),
      options: CA_PROVINCES.map(([v, l]) => ({
        value: `CA-${v}`,
        label: CA_PROVINCE_SLUGS[v] ? t(`bookingIntake.province.${CA_PROVINCE_SLUGS[v]}`) : l,
      })),
    },
    {
      label: t("bookingIntake.unitedStates"),
      options: US_STATES.map(([v, l]) => ({ value: `US-${v}`, label: l })),
    },
  ];
}

export const STORAGE_CATEGORIES: { key: string; label: string }[] = [
  { key: "furniture", label: "Furniture (sofas, beds, tables, chairs)" },
  { key: "boxes", label: "Boxes / Bins" },
  { key: "appliances", label: "Appliances (fridge, washer, dryer, etc.)" },
  { key: "electronics", label: "Electronics (TV, computer, etc.)" },
  { key: "clothing", label: "Clothing / Wardrobe" },
  { key: "vehicle", label: "Vehicle (car, motorcycle, ATV)" },
  { key: "equipment", label: "Equipment / Tools" },
  { key: "sports", label: "Sports / Outdoor gear" },
  { key: "other", label: "Other" },
];

export const STORAGE_SIZES = [
  { value: "small", label: "Small — fits in a car trunk" },
  { value: "medium", label: "Medium — fits in a minivan" },
  { value: "large", label: "Large — requires a moving truck" },
  { value: "xlarge", label: "Extra Large — full storage unit" },
];

export function buildTimeSlots(stepMinutes = 30): string[] {
  const out: string[] = [];
  for (let m = 0; m < 24 * 60; m += stepMinutes) {
    const h = Math.floor(m / 60).toString().padStart(2, "0");
    const mm = (m % 60).toString().padStart(2, "0");
    out.push(`${h}:${mm}`);
  }
  return out;
}
