export interface ParkingListing {
  id: string;
  title: string;
  description: string;
  location: {
    country: string;
    province: string;
    city: string;
    region: string;
    address: string;
  };
  type: "outdoor" | "indoor" | "covered" | "underground";
  pricing: {
    hourly: number;
    daily: number;
    monthly: number;
  };
  features: string[];
  availability: "available" | "limited" | "full";
  rating: number;
  reviewCount: number;
  providerName: string;
  spots: number;
}

export const parkingListings: ParkingListing[] = [
  {
    id: "p1",
    title: "Downtown Underground Garage",
    description: "Secure underground parking steps from Sainte-Catherine Street. EV charging available.",
    location: { country: "Canada", province: "Quebec", city: "Montreal", region: "Downtown", address: "1200 Rue Peel" },
    type: "underground",
    pricing: { hourly: 5, daily: 25, monthly: 280 },
    features: ["EV Charging", "24/7 Access", "Security Camera", "Heated"],
    availability: "available",
    rating: 4.7,
    reviewCount: 62,
    providerName: "Marc D.",
    spots: 4,
  },
  {
    id: "p2",
    title: "Plateau Residential Driveway",
    description: "Private driveway spot in the heart of the Plateau. Quiet residential area.",
    location: { country: "Canada", province: "Quebec", city: "Montreal", region: "Plateau", address: "4321 Rue Saint-Denis" },
    type: "outdoor",
    pricing: { hourly: 3, daily: 15, monthly: 160 },
    features: ["Residential", "Quiet Area", "Easy Access"],
    availability: "available",
    rating: 4.5,
    reviewCount: 18,
    providerName: "Julie M.",
    spots: 1,
  },
  {
    id: "p3",
    title: "Covered Commercial Lot",
    description: "Large covered lot near the Old Port. Ideal for tourists and downtown workers.",
    location: { country: "Canada", province: "Quebec", city: "Montreal", region: "Old Port", address: "300 Rue de la Commune" },
    type: "covered",
    pricing: { hourly: 6, daily: 30, monthly: 350 },
    features: ["Covered", "24/7 Access", "Security Guard", "Well-lit"],
    availability: "limited",
    rating: 4.3,
    reviewCount: 45,
    providerName: "Pierre B.",
    spots: 2,
  },
  {
    id: "p4",
    title: "Laval Indoor Parking",
    description: "Indoor heated parking near Carrefour Laval. Monthly passes available.",
    location: { country: "Canada", province: "Quebec", city: "Laval", region: "Chomedey", address: "3035 Boul. Le Carrefour" },
    type: "indoor",
    pricing: { hourly: 3, daily: 18, monthly: 200 },
    features: ["Indoor", "Heated", "Near Mall", "Wheelchair Accessible"],
    availability: "available",
    rating: 4.6,
    reviewCount: 22,
    providerName: "Nathalie C.",
    spots: 3,
  },
  {
    id: "p5",
    title: "Old Quebec Tourist Spot",
    description: "Walking distance to Château Frontenac and historic quarter. Outdoor secured lot.",
    location: { country: "Canada", province: "Quebec", city: "Quebec City", region: "Old Quebec", address: "15 Rue Dalhousie" },
    type: "outdoor",
    pricing: { hourly: 4, daily: 22, monthly: 240 },
    features: ["Tourist Area", "Secured", "Walkable"],
    availability: "limited",
    rating: 4.4,
    reviewCount: 37,
    providerName: "Alain P.",
    spots: 2,
  },
  {
    id: "p6",
    title: "Longueuil Metro Parking",
    description: "Steps from Longueuil metro station. Perfect park-and-ride for commuters.",
    location: { country: "Canada", province: "Quebec", city: "Longueuil", region: "Vieux-Longueuil", address: "100 Place Charles-Le Moyne" },
    type: "underground",
    pricing: { hourly: 2, daily: 12, monthly: 140 },
    features: ["Near Metro", "Commuter-Friendly", "24/7 Access"],
    availability: "available",
    rating: 4.8,
    reviewCount: 55,
    providerName: "Daniel L.",
    spots: 5,
  },
  {
    id: "p7",
    title: "Sherbrooke University Lot",
    description: "Budget-friendly outdoor lot near Université de Sherbrooke campus.",
    location: { country: "Canada", province: "Quebec", city: "Sherbrooke", region: "Fleurimont", address: "2500 Boul. de l'Université" },
    type: "outdoor",
    pricing: { hourly: 2, daily: 10, monthly: 100 },
    features: ["Near Campus", "Affordable", "Student-Friendly"],
    availability: "available",
    rating: 4.1,
    reviewCount: 14,
    providerName: "Catherine V.",
    spots: 6,
  },
];

// Cascading location data
export const locationTree: Record<string, Record<string, Record<string, string[]>>> = {
  Canada: {
    Quebec: {
      Montreal: ["Downtown", "Plateau", "Old Port"],
      Laval: ["Chomedey"],
      "Quebec City": ["Old Quebec"],
      Longueuil: ["Vieux-Longueuil"],
      Sherbrooke: ["Fleurimont"],
    },
  },
};

export const parkingTypes = ["outdoor", "indoor", "covered", "underground"] as const;
