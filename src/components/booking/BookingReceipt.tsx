import { useState } from "react";
import { useTranslation } from "react-i18next";
import { format } from "date-fns";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { toast } from "@/hooks/use-toast";
import { Printer, Mail, Download, FileText, Loader2, MapPin, Calendar } from "lucide-react";
import { getDateFnsLocale } from "@/lib/dateLocale";
import { supabase } from "@/integrations/supabase/client";
import { ReceiptDocument } from "@/lib/pdf/ReceiptDocument";
import { AgreementDocument } from "@/lib/pdf/AgreementDocument";
import { downloadPdf } from "@/lib/pdf/download";
import type { ReceiptData } from "@/lib/pdf/types";

function money(n: number): string {
  return `$${n.toFixed(2)}`;
}

// start_date/end_date are calendar dates for the booking, not instants --
// `new Date(iso)` + local-timezone formatting rolls a UTC-midnight ISO
// string back a day anywhere west of UTC (same bug fixed in
// ReceiptDocument.tsx/AgreementDocument.tsx's fmtDate). Parsing just the
// Y-M-D keeps the displayed date stable regardless of viewer timezone.
function parseCalendarDate(iso: string): Date {
  const [y, m, d] = iso.slice(0, 10).split("-").map(Number);
  return new Date(y, (m || 1) - 1, d || 1);
}

export function BookingReceipt({ data }: { data: ReceiptData }) {
  const { t } = useTranslation();
  const [resending, setResending] = useState(false);
  const [downloadingReceipt, setDownloadingReceipt] = useState(false);
  const [downloadingAgreement, setDownloadingAgreement] = useState(false);

  const categoryLabel =
    data.category === "parking" ? t("search.parking") : data.category === "storage" ? t("search.storage") : t("booking.booking");

  const handlePrint = () => window.print();

  const handleResendEmail = async () => {
    setResending(true);
    try {
      const { data: res, error } = await supabase.functions.invoke("resend-booking-email", {
        body: { bookingId: data.bookingId },
      });
      if (error || res?.error) throw new Error(res?.error || error?.message);
      toast({
        title: t("receipt.emailResent"),
        description: t("receipt.emailResentTo", { email: res?.sentTo ?? "" }),
      });
    } catch (e: any) {
      toast({ title: t("receipt.emailResendFailed"), description: e.message, variant: "destructive" });
    } finally {
      setResending(false);
    }
  };

  const handleDownloadReceipt = async () => {
    setDownloadingReceipt(true);
    try {
      await downloadPdf(<ReceiptDocument data={data} />, `spotsvault-receipt-${data.bookingId.slice(0, 8)}.pdf`);
    } catch (e: any) {
      toast({ title: t("receipt.downloadFailed"), description: e.message, variant: "destructive" });
    } finally {
      setDownloadingReceipt(false);
    }
  };

  const handleDownloadAgreement = async () => {
    setDownloadingAgreement(true);
    try {
      await downloadPdf(<AgreementDocument data={data} />, `spotsvault-agreement-${data.bookingId.slice(0, 8)}.pdf`);
    } catch (e: any) {
      toast({ title: t("receipt.downloadFailed"), description: e.message, variant: "destructive" });
    } finally {
      setDownloadingAgreement(false);
    }
  };

  return (
    <div id="receipt-print-area">
      <Card className="card-shadow">
        <CardHeader>
          <div className="flex items-start justify-between gap-3">
            <div>
              <p className="text-xs text-muted-foreground uppercase tracking-wide">
                {t("receipt.bookingReference")} #{data.bookingId.slice(0, 8).toUpperCase()}
              </p>
              <CardTitle className="text-lg mt-1">{data.listingTitle}</CardTitle>
              {data.listingAddress && (
                <p className="text-sm text-muted-foreground flex items-center gap-1 mt-1">
                  <MapPin className="w-3 h-3" /> {data.listingAddress}
                </p>
              )}
            </div>
            <Badge variant="secondary" className="capitalize shrink-0">
              {categoryLabel}
            </Badge>
          </div>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <p className="text-xs text-muted-foreground">{t("bookingConfirmation.checkIn")}</p>
              <p className="text-sm font-medium text-foreground flex items-center gap-1">
                <Calendar className="w-3 h-3" /> {format(parseCalendarDate(data.startDate), "MMM d, yyyy", { locale: getDateFnsLocale() })}
              </p>
            </div>
            <div>
              <p className="text-xs text-muted-foreground">{t("bookingConfirmation.checkOut")}</p>
              <p className="text-sm font-medium text-foreground flex items-center gap-1">
                <Calendar className="w-3 h-3" /> {format(parseCalendarDate(data.endDate), "MMM d, yyyy", { locale: getDateFnsLocale() })}
              </p>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4 border-t border-border pt-4">
            <div>
              <p className="text-xs text-muted-foreground">{t("receipt.renter")}</p>
              <p className="text-sm font-medium text-foreground">{data.renterName}</p>
            </div>
            <div>
              <p className="text-xs text-muted-foreground">{t("receipt.host")}</p>
              <p className="text-sm font-medium text-foreground">{data.hostName}</p>
            </div>
          </div>

          <div className="border-t border-border pt-4 space-y-2 text-sm">
            <div className="flex justify-between">
              <span className="text-muted-foreground">{t("receipt.subtotal")}</span>
              <span>{money(data.subtotal)}</span>
            </div>
            {data.taxLineItems.map((item) => (
              <div key={item.name} className="flex justify-between text-muted-foreground text-xs">
                <span>{item.name}</span>
                <span>{money(item.amount)}</span>
              </div>
            ))}
            <div className="flex justify-between font-bold text-foreground border-t border-border pt-2">
              <span>{t("listingDetail.total")}</span>
              <span>{money(data.total)}</span>
            </div>
          </div>

          <div className="flex flex-wrap gap-2 print:hidden">
            <Button variant="outline" size="sm" onClick={handlePrint}>
              <Printer className="w-4 h-4 mr-1.5" /> {t("receipt.print")}
            </Button>
            <Button variant="outline" size="sm" onClick={handleResendEmail} disabled={resending}>
              {resending ? <Loader2 className="w-4 h-4 mr-1.5 animate-spin" /> : <Mail className="w-4 h-4 mr-1.5" />}
              {t("receipt.resendEmail")}
            </Button>
            <Button variant="outline" size="sm" onClick={handleDownloadReceipt} disabled={downloadingReceipt}>
              {downloadingReceipt ? <Loader2 className="w-4 h-4 mr-1.5 animate-spin" /> : <Download className="w-4 h-4 mr-1.5" />}
              {t("receipt.downloadPdf")}
            </Button>
            <Button variant="outline" size="sm" onClick={handleDownloadAgreement} disabled={downloadingAgreement}>
              {downloadingAgreement ? <Loader2 className="w-4 h-4 mr-1.5 animate-spin" /> : <FileText className="w-4 h-4 mr-1.5" />}
              {t("receipt.downloadAgreement")}
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
