import { pdf } from "@react-pdf/renderer";
import type { ReactElement } from "react";

/**
 * Renders a @react-pdf/renderer <Document> to a Blob and triggers a
 * browser download -- used by both the receipt and the agreement "Download
 * as PDF" buttons.
 */
export async function downloadPdf(document: ReactElement, filename: string): Promise<void> {
  const blob = await pdf(document).toBlob();
  const url = URL.createObjectURL(blob);
  const link = window.document.createElement("a");
  link.href = url;
  link.download = filename;
  window.document.body.appendChild(link);
  link.click();
  link.remove();
  URL.revokeObjectURL(url);
}
