// ─────────────────────────────────────────────────────────────────────────
// DEV TOOL -- not part of the app build, not imported from anywhere in
// src/. Renders sample Receipt + Agreement PDFs with realistic fixture
// data so the actual visual output can be reviewed (open the two files in
// dev-tools/output/) before shipping changes to
// src/lib/pdf/{ReceiptDocument,AgreementDocument}.tsx.
//
// Run from the repo root: `bun run dev-tools/generate-sample-receipts.tsx`
// ─────────────────────────────────────────────────────────────────────────
import { pdf } from "@react-pdf/renderer";
import { writeFileSync, mkdirSync } from "node:fs";
import { ReceiptDocument } from "../src/lib/pdf/ReceiptDocument";
import { AgreementDocument } from "../src/lib/pdf/AgreementDocument";
import type { ReceiptData } from "../src/lib/pdf/types";

const OUTPUT_DIR = "dev-tools/output";

const sample: ReceiptData = {
  bookingId: "51b716b4-95bc-4f3d-b80a-129f24fe3c52",
  category: "storage",
  status: "confirmed",
  listingTitle: "Climate-Controlled Basement Storage — Plateau",
  listingAddress: "410 Rue Greber, Gatineau, Quebec, Canada",
  startDate: "2026-09-05T00:00:00.000Z",
  endDate: "2026-09-12T00:00:00.000Z",
  renterName: "Sophie Tremblay",
  hostName: "Marc-Andre Bouchard",
  subtotal: 52.0,
  taxLineItems: [
    { name: "GST", rate: 0.05, amount: 2.6 },
    { name: "QST", rate: 0.09975, amount: 5.19 },
  ],
  taxTotal: 7.79,
  total: 59.79,
  platformFee: 5.2,
  hostPayout: 46.8,
  issuedAt: new Date().toISOString(),
};

async function main() {
  mkdirSync(OUTPUT_DIR, { recursive: true });

  const receiptBlob = await pdf(<ReceiptDocument data={sample} />).toBuffer();
  const agreementBlob = await pdf(<AgreementDocument data={sample} />).toBuffer();

  const receiptChunks: Buffer[] = [];
  for await (const chunk of receiptBlob) receiptChunks.push(chunk as Buffer);
  writeFileSync(`${OUTPUT_DIR}/sample-receipt.pdf`, Buffer.concat(receiptChunks));

  const agreementChunks: Buffer[] = [];
  for await (const chunk of agreementBlob) agreementChunks.push(chunk as Buffer);
  writeFileSync(`${OUTPUT_DIR}/sample-agreement.pdf`, Buffer.concat(agreementChunks));

  console.log(`Wrote ${OUTPUT_DIR}/sample-receipt.pdf and ${OUTPUT_DIR}/sample-agreement.pdf`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
