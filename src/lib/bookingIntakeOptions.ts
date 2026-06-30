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
