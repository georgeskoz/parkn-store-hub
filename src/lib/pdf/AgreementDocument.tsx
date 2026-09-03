import { Document, Page, Text, View, StyleSheet } from "@react-pdf/renderer";
import type { ReceiptData } from "./types";

const styles = StyleSheet.create({
  page: { padding: 40, fontSize: 10, fontFamily: "Helvetica", color: "#1a1a2e" },
  brand: { fontSize: 18, fontWeight: 700, color: "#1B4F72", marginBottom: 2 },
  subtitle: { fontSize: 12, color: "#374151", marginBottom: 16 },
  section: { marginBottom: 14 },
  sectionTitle: {
    fontSize: 8,
    color: "#6b7280",
    textTransform: "uppercase",
    letterSpacing: 0.5,
    marginBottom: 6,
  },
  card: { backgroundColor: "#f8fafc", borderRadius: 6, padding: 12 },
  row: { flexDirection: "row", justifyContent: "space-between", marginBottom: 4 },
  rowLabel: { color: "#6b7280" },
  rowValue: { fontWeight: 500 },
  peopleRow: { flexDirection: "row", gap: 24, marginBottom: 14 },
  personBlock: { flex: 1 },
  metaLabel: { fontSize: 8, color: "#6b7280" },
  metaValue: { fontSize: 11, fontWeight: 700 },
  clauseTitle: { fontSize: 10, fontWeight: 700, marginTop: 8, marginBottom: 3 },
  clauseBody: { fontSize: 9, color: "#374151", lineHeight: 1.5 },
  footer: { position: "absolute", bottom: 30, left: 40, right: 40, fontSize: 8, color: "#9ca3af" },
});

// See ReceiptDocument.tsx's fmtDate for why this parses Y-M-D directly
// instead of `new Date(iso).toLocaleDateString()` -- the latter rolls a
// UTC-midnight ISO date back a day in any timezone west of UTC.
function fmtDate(iso: string): string {
  const [y, m, d] = iso.slice(0, 10).split("-").map(Number);
  if (!y || !m || !d) return "—";
  const date = new Date(y, m - 1, d);
  return date.toLocaleDateString("en-US", { year: "numeric", month: "long", day: "numeric" });
}

// issuedAt is a genuine instant (when this PDF was generated), not a
// calendar date -- see ReceiptDocument.tsx's fmtInstant. Should read back
// in the viewer's actual local time, so this stays a plain `new Date(iso)`
// rather than the Y-M-D parsing fmtDate uses.
function fmtInstant(iso: string): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "—";
  return d.toLocaleDateString("en-US", { year: "numeric", month: "long", day: "numeric" });
}

function money(n: number): string {
  return `$${n.toFixed(2)}`;
}

export function AgreementDocument({ data }: { data: ReceiptData }) {
  const categoryLabel = data.category === "parking" ? "parking space" : data.category === "storage" ? "storage space" : "space";

  return (
    <Document title={`SpotsVault Rental Agreement — ${data.listingTitle}`}>
      <Page size="A4" style={styles.page}>
        <Text style={styles.brand}>SpotsVault</Text>
        <Text style={styles.subtitle}>Rental Agreement — Booking #{data.bookingId.slice(0, 8).toUpperCase()}</Text>

        <View style={styles.peopleRow}>
          <View style={styles.personBlock}>
            <Text style={styles.metaLabel}>Host ("Provider")</Text>
            <Text style={styles.metaValue}>{data.hostName}</Text>
          </View>
          <View style={styles.personBlock}>
            <Text style={styles.metaLabel}>Renter ("Seeker")</Text>
            <Text style={styles.metaValue}>{data.renterName}</Text>
          </View>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Rented space</Text>
          <View style={styles.card}>
            <Text style={{ fontSize: 11, fontWeight: 700, marginBottom: 6 }}>{data.listingTitle}</Text>
            {data.listingAddress && (
              <View style={styles.row}>
                <Text style={styles.rowLabel}>Address</Text>
                <Text style={styles.rowValue}>{data.listingAddress}</Text>
              </View>
            )}
            <View style={styles.row}>
              <Text style={styles.rowLabel}>Rental period start</Text>
              <Text style={styles.rowValue}>{fmtDate(data.startDate)}</Text>
            </View>
            <View style={styles.row}>
              <Text style={styles.rowLabel}>Rental period end</Text>
              <Text style={styles.rowValue}>{fmtDate(data.endDate)}</Text>
            </View>
            <View style={styles.row}>
              <Text style={styles.rowLabel}>Total price</Text>
              <Text style={styles.rowValue}>{money(data.total)}</Text>
            </View>
          </View>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Terms</Text>

          <Text style={styles.clauseTitle}>1. Agreement</Text>
          <Text style={styles.clauseBody}>
            This agreement confirms that the Provider has agreed to rent the {categoryLabel} described above to the
            Seeker for the period stated, in exchange for the total price stated, facilitated through the SpotsVault
            platform.
          </Text>

          <Text style={styles.clauseTitle}>2. Use of space</Text>
          <Text style={styles.clauseBody}>
            The Seeker agrees to use the space only for its stated purpose ({categoryLabel}) and only for the
            duration of the rental period. The Seeker is responsible for any items placed in or vehicles parked in
            the space during that period.
          </Text>

          <Text style={styles.clauseTitle}>3. Payment</Text>
          <Text style={styles.clauseBody}>
            Payment of {money(data.total)} was collected by SpotsVault at the time of booking and is held and
            released to the Provider per SpotsVault's standard payout process.
          </Text>

          <Text style={styles.clauseTitle}>4. Cancellations and disputes</Text>
          <Text style={styles.clauseBody}>
            Cancellations, refunds, and disputes are governed by SpotsVault's published cancellation policy and
            Terms of Service, available at spotsvault.com/terms.
          </Text>

          <Text style={styles.clauseTitle}>5. No signature required</Text>
          <Text style={styles.clauseBody}>
            This document is generated automatically to summarize the terms both parties agreed to when the booking
            was made and confirmed through SpotsVault. It does not require a signature to be valid.
          </Text>
        </View>

        <Text style={styles.footer}>
          SpotsVault · Generated {fmtInstant(data.issuedAt)} for booking #{data.bookingId.slice(0, 8).toUpperCase()} ·
          support@spotsvault.com
        </Text>
      </Page>
    </Document>
  );
}
