import "server-only";

import { readFile } from "node:fs/promises";
import path from "node:path";
import { Resvg } from "@resvg/resvg-js";
import { PDFDocument, rgb } from "pdf-lib";
import QRCode from "qrcode";
import { createElement } from "react";
import satori from "satori";
import { formatDateRome } from "@/lib/datetime";
import { technicianScanUrl, type StationQrExportItem } from "@/lib/stations/qr-export";

const a4Width = 595.28;
const a4Height = 841.89;
const pdfScale = 2;

/** خط TTF كامل لتحسين التشكيل العربي أمام سلسلة Satori↔opentype (بديلاً عن مجموعة Cairo WOFFF المقسمة). */
const tajawalBoldPath = path.join(process.cwd(), "assets", "fonts", "Tajawal-Bold.ttf");

const stationPdfFontFamily = "Tajawal";
const stationPdfFontWeight = 700 as const;

let tajawalBoldBuffer: Buffer | undefined;

function clampText(value: string, maxLength: number): string {
  const normalized = value.trim().replace(/\s+/g, " ");

  if (normalized.length <= maxLength) {
    return normalized;
  }

  return `${normalized.slice(0, maxLength - 1)}…`;
}

async function getTajawalBold(): Promise<Buffer> {
  if (!tajawalBoldBuffer) {
    tajawalBoldBuffer = await readFile(tajawalBoldPath);
  }

  return tajawalBoldBuffer;
}

async function renderTextPng(input: {
  align?: "center" | "left" | "right";
  color?: string;
  direction?: "ltr" | "rtl";
  /** حجم خط النقطة على الصفحة (قبل ضرب الدقة الداخلية) */
  fontSize: number;
  fontWeight?: 700;
  /** ارتفاع المربع النصي بالنقاط */
  height: number;
  text: string;
  /** عرض المربع النصي بالنقاط */
  width: number;
}): Promise<Buffer> {
  const fontData = await getTajawalBold();
  const w = Math.ceil(input.width * pdfScale);
  const h = Math.ceil(input.height * pdfScale);
  const fontSizePx = Math.round(input.fontSize * pdfScale);
  const direction = input.direction ?? "rtl";
  const textAlign =
    input.align === "left" ? "left" : input.align === "right" ? "right" : ("center" as const);
  const justifyContent =
    input.align === "left" ? "flex-start" : input.align === "right" ? "flex-end" : "center";

  const fontWeightCss = input.fontWeight ?? stationPdfFontWeight;

  const element = createElement(
    "div",
    {
      style: {
        alignItems: "stretch",
        color: input.color ?? "#111827",
        direction,
        display: "flex",
        height: `${h}px`,
        justifyContent,
        width: `${w}px`,
      },
    },
    createElement(
      "div",
      {
        style: {
          color: input.color ?? "#111827",
          direction,
          display: "flex",
          flex: 1,
          flexDirection: "column",
          fontFamily: stationPdfFontFamily,
          fontSize: `${fontSizePx}px`,
          fontWeight: fontWeightCss,
          justifyContent: "center",
          lineHeight: 1.35,
          paddingLeft: `${Math.round(12 * pdfScale)}px`,
          paddingRight: `${Math.round(12 * pdfScale)}px`,
          textAlign,
          whiteSpace: "pre-wrap",
        },
      },
      input.text,
    ),
  );

  const svg = await satori(element, {
    fonts: [{ data: fontData, name: stationPdfFontFamily, style: "normal", weight: stationPdfFontWeight }],
    height: h,
    width: w,
  });

  return new Resvg(svg).render().asPng();
}

async function drawTextImage(
  pdfDoc: PDFDocument,
  page: ReturnType<PDFDocument["addPage"]>,
  input: Parameters<typeof renderTextPng>[0] & { x: number; y: number },
): Promise<void> {
  const pngBytes = await renderTextPng(input);
  const image = await pdfDoc.embedPng(pngBytes);
  page.drawImage(image, {
    height: input.height,
    width: input.width,
    x: input.x,
    y: input.y,
  });
}

function pngBytesFromDataUrl(dataUrl: string): Buffer {
  const [, base64] = dataUrl.split(",", 2);

  if (!base64) {
    throw new Error("Invalid QR image data.");
  }

  return Buffer.from(base64, "base64");
}

/** رأس الصفحة: عربي، اتجاه يمين، حجم بارز لسهولة القراءة */
const scanHintAr = "امسح الرمز ضوئيًا";

export async function createStationQrExportPdf(items: readonly StationQrExportItem[]): Promise<Uint8Array> {
  const pdfDoc = await PDFDocument.create();

  for (const item of items) {
    const page = pdfDoc.addPage([a4Width, a4Height]);
    page.drawRectangle({
      color: rgb(0.975, 0.98, 0.985),
      height: a4Height,
      width: a4Width,
      x: 0,
      y: 0,
    });
    page.drawRectangle({
      borderColor: rgb(0.82, 0.86, 0.9),
      borderWidth: 1,
      color: rgb(1, 1, 1),
      height: a4Height - 96,
      width: a4Width - 96,
      x: 48,
      y: 48,
    });

    const titleWidthPt = a4Width - 96;
    const titleX = 48;

    await drawTextImage(pdfDoc, page, {
      align: "center",
      color: "#0f172a",
      direction: "rtl",
      fontSize: 56,
      fontWeight: 700,
      height: 120,
      text: scanHintAr,
      width: titleWidthPt,
      x: titleX,
      y: 672,
    });

    const qrDataUrl = await QRCode.toDataURL(item.qrCodeValue, {
      errorCorrectionLevel: "H",
      margin: 2,
      type: "image/png",
      width: 900,
    });
    const qrImage = await pdfDoc.embedPng(pngBytesFromDataUrl(qrDataUrl));
    page.drawImage(qrImage, {
      height: 330,
      width: 330,
      x: (a4Width - 330) / 2,
      y: 330,
    });

    const textBlockPt = a4Width - 96;
    const textX = 48;

    await drawTextImage(pdfDoc, page, {
      align: "center",
      color: "#0f172a",
      direction: "rtl",
      fontSize: 44,
      fontWeight: 700,
      height: 80,
      text: clampText(item.label, 56),
      width: textBlockPt,
      x: textX,
      y: 240,
    });
    await drawTextImage(pdfDoc, page, {
      align: "center",
      color: "#334155",
      direction: "rtl",
      fontSize: 32,
      fontWeight: 700,
      height: 58,
      text: `العميل: ${clampText(item.clientName, 60)}`,
      width: textBlockPt,
      x: textX,
      y: 188,
    });
    await drawTextImage(pdfDoc, page, {
      align: "center",
      color: "#475569",
      direction: "rtl",
      fontSize: 28,
      fontWeight: 700,
      height: 52,
      text: `تاريخ الإنشاء: ${formatDateRome(item.createdAt, { locale: "ar-EG" })}`,
      width: textBlockPt,
      x: textX,
      y: 142,
    });
    await drawTextImage(pdfDoc, page, {
      align: "center",
      color: "#64748b",
      direction: "ltr",
      fontSize: 22,
      fontWeight: 700,
      height: 44,
      text: technicianScanUrl,
      width: textBlockPt,
      x: textX,
      y: 78,
    });
  }

  return pdfDoc.save();
}
