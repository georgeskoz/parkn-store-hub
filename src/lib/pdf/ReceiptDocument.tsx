import { Document, Page, Text, View, StyleSheet } from "@react-pdf/renderer";
import type { ReceiptData } from "./types";

const styles = StyleSheet.create({
  page: { padding: 40, fontSize: 10, fontFamily: "Helvetica", color: "#1a1a2e" },
  brand: { fontSize: 18, fontWeight: 700, color: "#1B4F72", marginBottom: 2 },
  subtitle: { fontSize: 12, color: "#374151", marginBottom: 16 },
  metaRow: { flexDirection: "row", justifyContent: "space-between", marginBottom: 16 },
  metaLabel: { fontSize: 8, color: "#6b7280" },
  metaValue: { fontSize: 10, fontWeight: 700 },
  section: { marginBottom: 16 },
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
  divider: { borderBottomWidth: 1, borderBottomColor: "#e5e7eb", marginVertical: 8 },
  totalRow: { flexDirection: "row", justifyContent: "space-between", marginTop: 4 },
  totalLabel: { fontSize: 12, fontWeight: 700 },
  totalValue: { fontSize: 12, fontWeight: 700 },
  peopleRow: { flexDirection: "row", gap: 24 },
  personBlock: { flex: 1 },
  footer: { position: "absolute", bottom: 30, left: 40, right: 40, fontSize: 8, color: "#9ca3af" },
});

// start_date/end_date are calendar dates for the booking, not instants --
// formatting via `new Date(iso).toLocaleDateString()` reads them back in
// the local viewer's timezone, which rolls a UTC-midnight ISO string back
// to the previous day anywhere west of UTC (confirmed: a 2026-09-05
// booking rendered as "September 4" while generating a sample PDF).
// Parsing just the Y-M-D and constructing a local-midnight Date keeps the
// displayed date stable regardless of the renderer's timezone.
function fmtDate(iso: string): string {
  const [y, m, d] = iso.slice(0, 10).split("-").map(Number);
  if (!y || !m || !d) return "—";
  const date = new Date(y, m - 1, d);
  return date.toLocaleDateString("en-US", { year: "numeric", month: "long", day: "numeric" });
}

// issuedAt is a genuine instant (when this PDF was generated), not a
// calendar date -- unlike fmtDate above, this should read back in the
// viewer's actual local time, which is exactly what a plain `new
// Date(iso)` already does. Keeping it separate so a future edit to
// fmtDate's calendar-date parsing doesn't accidentally get applied here
// too and start showing this in UTC instead of local time.
function fmtInstant(iso: string): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "—";
  return d.toLocaleDateString("en-US", { year: "numeric", month: "long", day: "numeric" });
}

function money(n: number): string {
  return `$${n.toFixed(2)}`;
}

export function ReceiptDocument({ data }: { data: ReceiptData }) {
  const categoryLabel = data.category === "parking" ? "Parking" : data.category === "storage" ? "Storage" : "Booking";

  return (
    <Document title={`SpotsVault Receipt — ${data.listingTitle}`}>
      <Page size="A4" style={styles.page}>
        <Text style={styles.brand}>SpotsVault</Text>
        <Text style={styles.subtitle}>Booking Receipt</Text>

        <View style={styles.metaRow}>
          <View>
            <Text style={styles.metaLabel}>Booking reference</Text>
            <Text style={styles.metaValue}>#{data.bookingId.slice(0, 8).toUpperCase()}</Text>
          </View>
          <View>
            <Text style={styles.metaLabel}>Issued</Text>
            <Text style={styles.metaValue}>{fmtInstant(data.issuedAt)}</Text>
          </View>
          <View>
            <Text style={styles.metaLabel}>Status</Text>
            <Text style={styles.metaValue}>{data.status.charAt(0).toUpperCase() + data.status.slice(1)}</Text>
          </View>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Listing</Text>
          <View style={styles.card}>
            <Text style={{ fontSize: 12, fontWeight: 700, marginBottom: 2 }}>{data.listingTitle}</Text>
            <Text style={{ color: "#6b7280", marginBottom: 8 }}>
              {categoryLabel}{data.listingAddress ? ` · ${data.listingAddress}` : ""}
            </Text>
            <View style={styles.row}>
              <Text style={styles.rowLabel}>Check-in</Text>
              <Text style={styles.rowValue}>{fmtDate(data.startDate)}</Text>
            </View>
            <View style={styles.row}>
              <Text style={styles.rowLabel}>Check-out</Text>
              <Text style={styles.rowValue}>{fmtDate(data.endDate)}</Text>
            </View>
          </View>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Parties</Text>
          <View style={styles.peopleRow}>
            <View style={styles.personBlock}>
              <Text style={styles.metaLabel}>Renter</Text>
              <Text style={styles.metaValue}>{data.renterName}</Text>
            </View>
            <View style={styles.personBlock}>
              <Text style={styles.metaLabel}>Host</Text>
              <Text style={styles.metaValue}>{data.hostName}</Text>
            </View>
          </View>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Price breakdown</Text>
          <View style={styles.card}>
            <View style={styles.row}>
              <Text style={styles.rowLabel}>Subtotal</Text>
              <Text style={styles.rowValue}>{money(data.subtotal)}</Text>
            </View>
            {data.taxLineItems.map((item) => (
              <View style={styles.row} key={item.name}>
                <Text style={styles.rowLabel}>{item.name}</Text>
                <Text style={styles.rowValue}>{money(item.amount)}</Text>
              </View>
            ))}
            <View style={styles.divider} />
            <View style={styles.totalRow}>
              <Text style={styles.totalLabel}>Total paid</Text>
              <Text style={styles.totalValue}>{money(data.total)}</Text>
            </View>
          </View>
        </View>

        <Text style={styles.footer}>
          SpotsVault · This receipt was generated automatically and reflects the amount charged for booking
          #{data.bookingId.slice(0, 8).toUpperCase()}. Questions? support@spotsvault.com
        </Text>
      </Page>
    </Document>
  );
}
