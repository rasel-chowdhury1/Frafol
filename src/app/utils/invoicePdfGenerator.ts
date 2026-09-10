import PDFDocument from "pdfkit";
import path from "path";

const PRIMARY_COLOR = "#AD2B08";
const TEXT_COLOR = "#333333";
const MUTED_COLOR = "#777777";
const SUPPORT_EMAIL = "cvak@frafol.sk";

// Roboto is embedded (rather than pdfkit's built-in Helvetica) because Helvetica's
// WinAnsi encoding can't render Slovak diacritics like "č" (e.g. "Odporúča").
const FONT_REGULAR = path.join(process.cwd(), "assets/fonts/Roboto-Regular.ttf");
const FONT_BOLD = path.join(process.cwd(), "assets/fonts/Roboto-Bold.ttf");

export interface FrafolChoiceInvoicePdfParams {
  invoiceNumber: string;
  invoiceDate: string;
  transactionId: string;
  paymentMethod?: string;
  professionalName: string;
  companyName?: string;
  ICO?: string;
  DIC?: string;
  IC_DPH?: string;
  streetAddress?: string;
  town?: string;
  country?: string;
  planDays: number;
  basePrice: number;
  vatAmount?: number;
  totalPrice: number;
  currency?: string;
}

const rowText = (
  doc: PDFKit.PDFDocument,
  y: number,
  columns: { text: string; x: number; width: number; align?: "left" | "right" }[],
  options: { bold?: boolean; color?: string; size?: number } = {},
) => {
  doc
    .font(options.bold ? "Roboto-Bold" : "Roboto")
    .fontSize(options.size || 10)
    .fillColor(options.color || TEXT_COLOR);

  columns.forEach((col) => {
    doc.text(col.text, col.x, y, { width: col.width, align: col.align || "left" });
  });
};

export const generateFrafolChoiceInvoicePdf = (
  params: FrafolChoiceInvoicePdfParams,
): Promise<Buffer> => {
  return new Promise((resolve, reject) => {
    const doc = new PDFDocument({ size: "A4", margin: 50 });
    const chunks: Buffer[] = [];

    doc.on("data", (chunk) => chunks.push(chunk));
    doc.on("end", () => resolve(Buffer.concat(chunks)));
    doc.on("error", reject);

    doc.registerFont("Roboto", FONT_REGULAR);
    doc.registerFont("Roboto-Bold", FONT_BOLD);

    const currency = params.currency || "EUR";
    const pageWidth = doc.page.width - doc.page.margins.left - doc.page.margins.right;
    const leftX = doc.page.margins.left;

    // ===== Header =====
    doc.font("Roboto-Bold").fontSize(24).fillColor(PRIMARY_COLOR).text("FRAFOL", leftX, 50);
    doc
      .font("Roboto")
      .fontSize(9)
      .fillColor(MUTED_COLOR)
      .text(SUPPORT_EMAIL, leftX, 80);

    doc
      .font("Roboto-Bold")
      .fontSize(18)
      .fillColor(TEXT_COLOR)
      .text("INVOICE", leftX, 50, { width: pageWidth, align: "right" });
    doc
      .font("Roboto")
      .fontSize(10)
      .fillColor(MUTED_COLOR)
      .text(`Invoice / Order ID: ${params.invoiceNumber}`, leftX, 78, { width: pageWidth, align: "right" })
      .text(`Date: ${params.invoiceDate}`, leftX, 92, { width: pageWidth, align: "right" });

    doc.moveTo(leftX, 120).lineTo(leftX + pageWidth, 120).strokeColor("#e0e0e0").stroke();

    // ===== Bill To / Payment Info =====
    const colWidth = pageWidth / 2 - 10;

    doc.font("Roboto-Bold").fontSize(11).fillColor(TEXT_COLOR).text("Bill To", leftX, 140);
    doc
      .font("Roboto")
      .fontSize(10)
      .fillColor(MUTED_COLOR)
      .text(params.companyName || params.professionalName, leftX, 158, { width: colWidth });

    let billY = 158;
    doc.fontSize(10);
    if (params.companyName) {
      billY += 15;
      doc.text(params.professionalName, leftX, billY, { width: colWidth });
    }
    if (params.streetAddress) {
      billY += 15;
      const addressLine = [params.streetAddress, params.town, params.country].filter(Boolean).join(", ");
      doc.text(addressLine, leftX, billY, { width: colWidth });
    }
    if (params.ICO) {
      billY += 15;
      doc.text(`ICO: ${params.ICO}`, leftX, billY, { width: colWidth });
    }
    if (params.DIC) {
      billY += 15;
      doc.text(`DIC: ${params.DIC}`, leftX, billY, { width: colWidth });
    }
    if (params.IC_DPH) {
      billY += 15;
      doc.text(`IC DPH: ${params.IC_DPH}`, leftX, billY, { width: colWidth });
    }

    const rightColX = leftX + colWidth + 20;
    doc.font("Roboto-Bold").fontSize(11).fillColor(TEXT_COLOR).text("Payment Details", rightColX, 140);
    doc
      .font("Roboto")
      .fontSize(10)
      .fillColor(MUTED_COLOR)
      .text(`Transaction ID: ${params.transactionId}`, rightColX, 158, { width: colWidth })
      .text(`Payment Date: ${params.invoiceDate}`, rightColX, 173, { width: colWidth });
    if (params.paymentMethod) {
      doc.text(`Payment Method: ${params.paymentMethod}`, rightColX, 188, { width: colWidth });
    }

    // ===== Order Details / Line Items table =====
    const tableTop = Math.max(billY, 188) + 40;
    const col1X = leftX;
    const col1W = pageWidth * 0.55;
    const col2X = leftX + col1W;
    const col2W = pageWidth * 0.2;
    const col3X = col2X + col2W;
    const col3W = pageWidth - col1W - col2W;

    doc
      .rect(leftX, tableTop, pageWidth, 24)
      .fill("#f5f5f5");

    rowText(
      doc,
      tableTop + 7,
      [
        { text: "Description", x: col1X + 8, width: col1W - 8 },
        { text: "Duration", x: col2X, width: col2W },
        { text: "Amount", x: col3X, width: col3W - 8, align: "right" },
      ],
      { bold: true, color: MUTED_COLOR, size: 9 },
    );

    let rowY = tableTop + 24 + 12;
    rowText(doc, rowY, [
      { text: "Frafol Choice (Odznak Odporúča Frafol)", x: col1X + 8, width: col1W - 8 },
      { text: `${params.planDays} days`, x: col2X, width: col2W },
      { text: `${params.basePrice.toFixed(2)} ${currency}`, x: col3X, width: col3W - 8, align: "right" },
    ]);

    if (params.vatAmount && params.vatAmount > 0) {
      rowY += 20;
      rowText(doc, rowY, [
        { text: "VAT", x: col1X + 8, width: col1W - 8, },
        { text: "", x: col2X, width: col2W },
        { text: `${params.vatAmount.toFixed(2)} ${currency}`, x: col3X, width: col3W - 8, align: "right" },
      ], { color: MUTED_COLOR });
    }

    rowY += 26;
    doc.moveTo(leftX, rowY - 8).lineTo(leftX + pageWidth, rowY - 8).strokeColor("#e0e0e0").stroke();

    rowText(
      doc,
      rowY,
      [
        { text: "Total Paid", x: col1X + 8, width: col1W - 8 },
        { text: "", x: col2X, width: col2W },
        { text: `${params.totalPrice.toFixed(2)} ${currency}`, x: col3X, width: col3W - 8, align: "right" },
      ],
      { bold: true, color: PRIMARY_COLOR, size: 12 },
    );

    // ===== Footer =====
    const footerY = rowY + 60;
    doc
      .font("Roboto")
      .fontSize(9)
      .fillColor(MUTED_COLOR)
      .text(
        "This invoice confirms the purchase of the Frafol Choice service between the Professional and Frafol.",
        leftX,
        footerY,
        { width: pageWidth, align: "center" },
      )
      .text(`Questions? Contact us at ${SUPPORT_EMAIL}`, leftX, footerY + 14, {
        width: pageWidth,
        align: "center",
      });

    doc.end();
  });
};
