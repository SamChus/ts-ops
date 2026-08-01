import PDFDocument from "pdfkit";

type Person = { id: string; name?: string; email?: string };

export const generateInvoicePdf = async (opts: {
  invoice: any;
  booking: any;
  apartment: any;
  guest: Person;
  agent: Person;
}): Promise<Buffer> => {
  const { invoice, booking, apartment, guest, agent } = opts;

  return new Promise<Buffer>((resolve, reject) => {
    try {
      const doc = new PDFDocument({ size: "A4", margin: 50 });
      const chunks: Buffer[] = [];

      doc.on("data", (chunk: Buffer) => chunks.push(chunk));
      doc.on("end", () => resolve(Buffer.concat(chunks)));

      // Header
      doc.fontSize(20).text("INVOICE", { align: "right" });
      doc.moveDown();

      // Invoice meta
      doc.fontSize(12).text(`Invoice Number: ${invoice.invoice_number}`);
      doc.text(
        `Date: ${new Date(invoice.created_at || Date.now()).toLocaleString()}`,
      );
      doc.moveDown();

      // From / To
      doc.fontSize(12).text(`Agent: ${agent?.name || ""}`);
      doc.text(`Agent Email: ${agent?.email || ""}`);
      doc.moveDown();

      doc.text(`Guest: ${guest?.name || ""}`);
      doc.text(`Guest Email: ${guest?.email || ""}`);
      doc.moveDown();

      // Booking/apartment details
      doc.text(`Property: ${apartment?.title || ""}`);
      doc.text(`Check-in: ${booking.check_in}`);
      doc.text(`Check-out: ${booking.check_out}`);
      doc.moveDown();

      // Amounts table
      doc.text(`Sub Total: ${Number(invoice.sub_total).toFixed(2)}`);
      doc.text(`Tax: ${Number(invoice.tax_amount).toFixed(2)}`);
      doc.text(`Total: ${Number(invoice.total_amount).toFixed(2)}`, {
        underline: true,
      });

      doc.moveDown(2);
      doc.fontSize(10).text("Thank you for your booking.");

      doc.end();
    } catch (err) {
      reject(err);
    }
  });
};

export default generateInvoicePdf;
