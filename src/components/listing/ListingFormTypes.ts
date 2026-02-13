export interface ListingFormData {
  category: "" | "parking" | "storage";
  type: string;
  title: string;
  description: string;
  address: string;
  unit: string;
  postalCode: string;
  city: string;
  province: string;
  country: string;
  region: string;
  lat: number | null;
  lng: number | null;
  features: string[];
  availability: string;
  // Parking
  spots: string;
  hourly: string;
  daily: string;
  monthly: string;
  // Storage
  size: string;
  sqft: string;
  weekly: string;
  seasonal: string;
  cancellation: string;
  // Extras
  studentDiscount: boolean;
  studentDiscountPercent: string;
  studentUniversities: string;
  nearbyLandmarks: string[];
  customLandmark: string;
  // Photos
  photos: UploadedPhoto[];
  // Disclaimer
  disclaimerAccepted: boolean;
}

export interface UploadedPhoto {
  url: string;
  path: string; // storage path for deletion
  name: string;
}

export const INITIAL_FORM: ListingFormData = {
  category: "",
  type: "",
  title: "",
  description: "",
  address: "",
  unit: "",
  postalCode: "",
  city: "",
  province: "",
  country: "",
  region: "",
  lat: null,
  lng: null,
  features: [],
  availability: "available",
  spots: "1",
  hourly: "",
  daily: "",
  monthly: "",
  size: "",
  sqft: "",
  weekly: "",
  seasonal: "",
  cancellation: "moderate",
  studentDiscount: false,
  studentDiscountPercent: "10",
  studentUniversities: "",
  nearbyLandmarks: [],
  customLandmark: "",
  photos: [],
  disclaimerAccepted: false,
};

export const STEPS = ["Type", "Location", "Details", "Photos", "Pricing", "Extras", "Review"];

export const PARKING_FEATURES = ["EV Charging", "24/7 Access", "Security Camera", "CCTV", "Heated", "Covered", "Well-lit", "Near Metro", "Wheelchair Accessible", "Gated", "Attendant On-Site"];
export const STORAGE_FEATURES = ["24/7 Access", "Heated", "Climate Controlled", "Security Camera", "CCTV", "Loading Dock", "Drive-in Access", "Insurance Available", "Elevator Access", "Fire Suppression", "Gated", "Ground Floor"];

export const AVAILABILITY_OPTIONS = ["available", "limited", "waitlist", "full"] as const;

export const COMMON_LANDMARKS = [
  "University", "Hospital", "Airport", "Train Station", "Metro Station", "Bus Terminal",
  "Shopping Mall", "Stadium", "Convention Centre", "Tourist Attraction", "Downtown Core",
  "Industrial Park", "Government Building", "Court House",
];
