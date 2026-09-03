// Shared data shape both the on-screen receipt (BookingReceipt.tsx) and the
// generated PDFs (ReceiptDocument.tsx / AgreementDocument.tsx) render from,
// so the three surfaces can't drift out of sync with each other -- same
// idea as SeekerBookingsList's buildBookingSummary().
export interface TaxLineItem {
  name: string;
  rate: number;
  amount: number;
}

export interface ReceiptData {
  bookingId: string;
  category: string | null; // "parking" | "storage" | null
  status: string;
  listingTitle: string;
  listingAddress: string | null;
  startDate: string; // ISO
  endDate: string; // ISO
  renterName: string;
  hostName: string;
  subtotal: number;
  taxLineItems: TaxLineItem[];
  taxTotal: number;
  total: number;
  platformFee: number | null;
  hostPayout: number | null;
  issuedAt: string; // ISO, "now" at generation time
}
