export interface StorageListing {
  id: string;
  title: string;
  description: string;
  location: {
    city: string;
    region: string;
    province: string;
    country: string;
    address: string;
    lat: number;
    lng: number;
  };
  type: "indoor" | "outdoor" | "heated" | "climate-controlled";
  size: string; // e.g. "10x10", "5x10"
  sqft: number;
  pricing: {
    daily: number;
    weekly: number;
    monthly: number;
    seasonal: number; // 4-month block
  };
  features: string[];
  availability: "available" | "limited" | "waitlist";
  rating: number;
  reviewCount: number;
  imageUrl: string;
  providerName: string;
  cancellationPolicy: "flexible" | "moderate" | "strict";
}

export const storageListings: StorageListing[] = [
  {
    id: "s1",
    title: "Heated Garage Unit — Downtown",
    description: "Secure heated garage space in the heart of downtown Montreal. 24/7 access with keypad entry.",
    location: { city: "Montreal", region: "Montreal Island", province: "Quebec", country: "Canada", address: "450 Rue Saint-Jacques", lat: 45.5017, lng: -73.5673 },
    type: "heated",
    size: "10x20",
    sqft: 200,
    pricing: { daily: 12, weekly: 65, monthly: 220, seasonal: 780 },
    features: ["24/7 Access", "Heated", "Security Camera", "Keypad Entry", "Lighting"],
    availability: "available",
    rating: 4.8,
    reviewCount: 34,
    imageUrl: "/placeholder.svg",
    providerName: "Marc D.",
    cancellationPolicy: "moderate",
  },
  {
    id: "s2",
    title: "Climate-Controlled Locker",
    description: "Perfect for sensitive items. Temperature and humidity controlled unit near Old Port.",
    location: { city: "Montreal", region: "Montreal Island", province: "Quebec", country: "Canada", address: "120 Rue de la Commune", lat: 45.5048, lng: -73.5538 },
    type: "climate-controlled",
    size: "5x10",
    sqft: 50,
    pricing: { daily: 8, weekly: 45, monthly: 160, seasonal: 560 },
    features: ["Climate Controlled", "Insurance Available", "Ground Floor", "24/7 Access"],
    availability: "available",
    rating: 4.9,
    reviewCount: 21,
    imageUrl: "/placeholder.svg",
    providerName: "Sophie L.",
    cancellationPolicy: "flexible",
  },
  {
    id: "s3",
    title: "Outdoor Covered Parking Pad",
    description: "Large covered outdoor pad suitable for RVs, boats, or multiple vehicles. Gated compound.",
    location: { city: "Laval", region: "Laval", province: "Quebec", country: "Canada", address: "890 Boul. des Laurentides", lat: 45.5700, lng: -73.7490 },
    type: "outdoor",
    size: "20x30",
    sqft: 600,
    pricing: { daily: 18, weekly: 100, monthly: 340, seasonal: 1200 },
    features: ["Gated", "Covered", "RV/Boat Friendly", "Drive-in Access"],
    availability: "limited",
    rating: 4.5,
    reviewCount: 12,
    imageUrl: "/placeholder.svg",
    providerName: "Jean-Pierre R.",
    cancellationPolicy: "strict",
  },
  {
    id: "s4",
    title: "Indoor Self-Storage Unit",
    description: "Clean indoor unit in a secure building with elevator access. Great for furniture and boxes.",
    location: { city: "Quebec City", region: "Quebec Metro", province: "Quebec", country: "Canada", address: "55 Rue du Pont", lat: 46.8139, lng: -71.2080 },
    type: "indoor",
    size: "10x10",
    sqft: 100,
    pricing: { daily: 7, weekly: 38, monthly: 130, seasonal: 460 },
    features: ["Elevator Access", "Security Camera", "Clean", "Dry"],
    availability: "available",
    rating: 4.6,
    reviewCount: 28,
    imageUrl: "/placeholder.svg",
    providerName: "Amélie T.",
    cancellationPolicy: "moderate",
  },
  {
    id: "s5",
    title: "Premium Heated Warehouse Bay",
    description: "Large heated warehouse bay ideal for commercial storage, seasonal inventory, or vehicle collections.",
    location: { city: "Longueuil", region: "South Shore", province: "Quebec", country: "Canada", address: "2100 Boul. Roland-Therrien", lat: 45.5312, lng: -73.5185 },
    type: "heated",
    size: "20x20",
    sqft: 400,
    pricing: { daily: 25, weekly: 140, monthly: 480, seasonal: 1700 },
    features: ["Heated", "Loading Dock", "Forklift Access", "24/7 Access", "Fire Suppression"],
    availability: "available",
    rating: 4.7,
    reviewCount: 9,
    imageUrl: "/placeholder.svg",
    providerName: "François G.",
    cancellationPolicy: "strict",
  },
  {
    id: "s6",
    title: "Budget Outdoor Lot Space",
    description: "Affordable fenced outdoor lot space for general storage. Ideal for trailers or equipment.",
    location: { city: "Sherbrooke", region: "Eastern Townships", province: "Quebec", country: "Canada", address: "340 Rue King Ouest", lat: 45.3794, lng: -71.9294 },
    type: "outdoor",
    size: "15x15",
    sqft: 225,
    pricing: { daily: 5, weekly: 28, monthly: 90, seasonal: 320 },
    features: ["Fenced", "Drive-in Access", "Affordable"],
    availability: "available",
    rating: 4.2,
    reviewCount: 15,
    imageUrl: "/placeholder.svg",
    providerName: "Luc B.",
    cancellationPolicy: "flexible",
  },
];

export const storageTypes = ["indoor", "outdoor", "heated", "climate-controlled"] as const;
export const durationOptions = ["daily", "weekly", "monthly", "seasonal"] as const;
export type DurationOption = typeof durationOptions[number];

export const cities = [...new Set(storageListings.map(l => l.location.city))];
export const regions = [...new Set(storageListings.map(l => l.location.region))];
