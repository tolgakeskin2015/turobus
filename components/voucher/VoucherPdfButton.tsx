"use client";

import { useState } from "react";
import { FaDownload } from "react-icons/fa";

type VoucherPdfButtonProps = {
  targetId: string;
  fileName: string;
};

export default function VoucherPdfButton({
  targetId,
  fileName,
}: VoucherPdfButtonProps) {
  const [loading, setLoading] = useState(false);

  async function downloadPdf() {
    const element = document.getElementById(targetId);

    if (!element) {
      window.alert("Voucher belgesi bulunamadı.");
      return;
    }

    setLoading(true);

    try {
      const [{ default: html2canvas }, { jsPDF }] =
        await Promise.all([
          import("html2canvas-pro"),
          import("jspdf"),
        ]);

      const canvas = await html2canvas(element, {
        scale: 2,
        backgroundColor: "#ffffff",
        useCORS: true,
        logging: false,
      });

      const imageData = canvas.toDataURL(
        "image/jpeg",
        0.96
      );

      const pdf = new jsPDF({
        orientation: "portrait",
        unit: "mm",
        format: "a4",
      });

      const pageWidth = pdf.internal.pageSize.getWidth();
      const pageHeight = pdf.internal.pageSize.getHeight();

      const imageWidth = pageWidth;
      const imageHeight =
        (canvas.height * imageWidth) / canvas.width;

      let remainingHeight = imageHeight;
      let position = 0;

      pdf.addImage(
        imageData,
        "JPEG",
        0,
        position,
        imageWidth,
        imageHeight,
        undefined,
        "FAST"
      );

      remainingHeight -= pageHeight;

      while (remainingHeight > 0) {
        position = remainingHeight - imageHeight;

        pdf.addPage();

        pdf.addImage(
          imageData,
          "JPEG",
          0,
          position,
          imageWidth,
          imageHeight,
          undefined,
          "FAST"
        );

        remainingHeight -= pageHeight;
      }

      const safeFileName = fileName
        .replace(/[^a-zA-Z0-9-_]/g, "-")
        .replace(/-+/g, "-");

      pdf.save(`${safeFileName}.pdf`);
    } catch (error) {
      console.error("PDF oluşturma hatası:", error);

      const message =
        error instanceof Error
          ? error.message
          : "Bilinmeyen PDF hatası";

      window.alert(
        "PDF oluşturulamadı: " + message
      );
    } finally {
      setLoading(false);
    }
  }

  return (
    <button
      type="button"
      disabled={loading}
      onClick={downloadPdf}
      className="inline-flex min-h-12 items-center justify-center gap-2 rounded-xl bg-emerald-600 px-6 text-sm font-black text-white transition hover:bg-emerald-700 disabled:cursor-not-allowed disabled:opacity-60"
    >
      <FaDownload />

      {loading
        ? "PDF hazırlanıyor..."
        : "PDF Voucher İndir"}
    </button>
  );
}
