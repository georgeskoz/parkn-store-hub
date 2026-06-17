export interface AvailabilitySlot {
  dayOfWeek: number; // 0 = Sun … 6 = Sat
  startTime: string; // "HH:MM"
  endTime: string;   // "HH:MM"
}

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
  weekly: string;
  monthly: string;
  // Parking availability schedule
  availabilitySlots: AvailabilitySlot[];
  // Storage
  size: string;
  sqft: string;
  seasonal: string;
  cancellation: string;
  // Storage rental terms
  minMonths: string;
  rentalStartDate: string; // YYYY-MM-DD
  seasonalRental: boolean;
  seasonStartMonth: string; // 1-12
  seasonEndMonth: string;   // 1-12
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
  weekly: "",
  monthly: "",
  availabilitySlots: [],
  size: "",
  sqft: "",
  seasonal: "",
  cancellation: "moderate",
  minMonths: "1",
  rentalStartDate: "",
  seasonalRental: false,
  seasonStartMonth: "11",
  seasonEndMonth: "4",
  studentDiscount: false,
  studentDiscountPercent: "10",
  studentUniversities: "",
  nearbyLandmarks: [],
  customLandmark: "",
  photos: [],
  disclaimerAccepted: false,
};

export const DAYS_OF_WEEK = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
export const MONTHS = [
  "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December",
];

export const STEPS = ["Type", "Location", "Details", "Photos", "Pricing", "Extras", "Review"];

export const PARKING_FEATURES = ["EV Charging", "24/7 Access", "Security Camera", "CCTV", "Heated", "Covered", "Well-lit", "Near Metro", "Wheelchair Accessible", "Gated", "Attendant On-Site"];
export const STORAGE_FEATURES = ["24/7 Access", "Heated", "Climate Controlled", "Security Camera", "CCTV", "Loading Dock", "Drive-in Access", "Insurance Available", "Elevator Access", "Fire Suppression", "Gated", "Ground Floor"];

export const AVAILABILITY_OPTIONS = ["available", "limited", "waitlist", "full"] as const;

export const COMMON_LANDMARKS = [
  "University", "Hospital", "Airport", "Train Station", "Metro Station", "Bus Terminal",
  "Shopping Mall", "Stadium", "Convention Centre", "Tourist Attraction", "Downtown Core",
  "Industrial Park", "Government Building", "Court House",
];
