"use client";

import { useRouter } from "next/navigation";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";

interface BarcodeDetectorResult {
  rawValue?: string;
}

interface BarcodeDetectorInstance {
  detect(image: ImageBitmapSource): Promise<BarcodeDetectorResult[]>;
}

interface BarcodeDetectorConstructor {
  new (options?: { formats?: string[] }): BarcodeDetectorInstance;
}

declare global {
  interface Window {
    BarcodeDetector?: BarcodeDetectorConstructor;
  }
}

function extractStationIdFromQr(value: string): string | null {
  const match = value.match(/\/station\/([^/?#]+)\/report/);

  return match?.[1] ? decodeURIComponent(match[1]) : null;
}

export function WebQrScanner() {
  const router = useRouter();
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const frameRequestRef = useRef<number | null>(null);
  const [isScanning, setIsScanning] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [debugInfo, setDebugInfo] = useState<string | null>(null);
  const supportsBarcodeDetector = useMemo(() => {
    if (typeof window === "undefined") return false;
    const hasBarcodeDetector = typeof window.BarcodeDetector !== "undefined";
    const userAgent = navigator.userAgent;
    const isChromeMobile = /Chrome/.test(userAgent) && /Mobile/.test(userAgent);
    const isAndroid = /Android/.test(userAgent);
    const isIOS = /iPhone|iPad|iPod/.test(userAgent);
    console.log("[QR Scanner] BarcodeDetector available:", hasBarcodeDetector);
    console.log("[QR Scanner] User agent:", userAgent);
    console.log("[QR Scanner] Chrome Mobile:", isChromeMobile, "Android:", isAndroid, "iOS:", isIOS);
    return hasBarcodeDetector;
  }, []);

  const stopScanner = useCallback(() => {
    if (frameRequestRef.current !== null) {
      cancelAnimationFrame(frameRequestRef.current);
      frameRequestRef.current = null;
    }

    if (streamRef.current) {
      for (const track of streamRef.current.getTracks()) {
        track.stop();
      }
      streamRef.current = null;
    }

    const video = videoRef.current;
    if (video) {
      video.srcObject = null;
    }

    setIsScanning(false);
  }, []);

  const startScanner = useCallback(async () => {
    // Check for secure context (HTTPS) requirement
    if (typeof window !== "undefined" && window.isSecureContext === false) {
      setError("الكاميرا تحتاج اتصال آمن (HTTPS). لا يمكن المسح عبر HTTP.");
      return;
    }

    // Check if mediaDevices is available
    if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
      setError("المتصفح لا يدعم الوصول للكاميرا. جرب متصفح حديث (Chrome, Safari, Edge).");
      return;
    }

    // Check for BarcodeDetector support
    if (!supportsBarcodeDetector) {
      const isChromeMobile = /Chrome/.test(navigator.userAgent) && /Mobile/.test(navigator.userAgent);
      const browserInfo = isChromeMobile ? " (Chrome Mobile detected)" : "";
      setDebugInfo(`BarcodeDetector API not available${browserInfo}. UserAgent: ${navigator.userAgent.slice(0, 50)}...`);
      setError("متصفحك لا يدعم ميزة مسح QR التلقائي. استخدم الإدخال اليدوي أو جرب Chrome/Safari المحدث على الكمبيوتر.");
      return;
    }

    setError(null);
    setMessage("جاري تشغيل الكاميرا...");

    try {
      let stream: MediaStream;

      // Mobile Chrome works better with exact constraints sometimes
      try {
        stream = await navigator.mediaDevices.getUserMedia({
          audio: false,
          video: {
            facingMode: { ideal: "environment" },
            width: { ideal: 1280 },
            height: { ideal: 720 },
          },
        });
      } catch (firstError) {
        console.warn("First camera attempt failed, trying exact environment:", firstError);
        // Second try: exact environment facing mode
        try {
          stream = await navigator.mediaDevices.getUserMedia({
            audio: false,
            video: {
              facingMode: { exact: "environment" },
            },
          });
        } catch (secondError) {
          console.warn("Exact environment failed, trying any camera:", secondError);
          // Final fallback: any camera
          stream = await navigator.mediaDevices.getUserMedia({
            audio: false,
            video: true,
          });
        }
      }

      streamRef.current = stream;
      const video = videoRef.current;

      if (!video) {
        stopScanner();
        setError("تعذر تهيئة الكاميرا. حاول مرة أخرى.");
        return;
      }

      video.srcObject = stream;
      await video.play();

      const BarcodeDetector = window.BarcodeDetector;
      if (!BarcodeDetector) {
        stopScanner();
        setError("تعذر تشغيل ماسح QR على هذا المتصفح. BarcodeDetector غير متاح.");
        return;
      }

      let detector: BarcodeDetectorInstance;
      try {
        detector = new BarcodeDetector({ formats: ["qr_code"] });
      } catch (detectorError) {
        console.error("BarcodeDetector creation failed:", detectorError);
        stopScanner();
        setError("تعذر تهيئة ماسح QR. جرب متصفحًا آخر.");
        return;
      }

      setIsScanning(true);

      const tick = async (): Promise<void> => {
        if (!videoRef.current || videoRef.current.readyState < HTMLMediaElement.HAVE_ENOUGH_DATA) {
          frameRequestRef.current = requestAnimationFrame(() => {
            void tick();
          });
          return;
        }

        try {
          const results = await detector.detect(videoRef.current);
          const rawValue = results[0]?.rawValue;

          if (rawValue) {
            const stationId = extractStationIdFromQr(rawValue);
            if (stationId) {
              stopScanner();
              router.push(`/station/${stationId}/report`);
              return;
            }

            setError("تم مسح QR لكنه ليس رابط محطة صالح.");
          }
        } catch {
          setError("تعذر قراءة QR حاليًا. حرّك الكاميرا قليلاً وحاول مرة أخرى.");
        }

        frameRequestRef.current = requestAnimationFrame(() => {
          void tick();
        });
      };

      frameRequestRef.current = requestAnimationFrame(() => {
        void tick();
      });
    } catch (err) {
      console.error("Camera access error:", err);
      const errorMessage = err instanceof Error ? err.message : String(err);
      // Show specific error for debugging
      if (errorMessage.includes("Permission denied") || errorMessage.includes("NotAllowed")) {
        setError("تم رفض صلاحية الكاميرا. تأكد من السماح للمتصفح بالوصول في إعدادات الموقع.");
      } else if (errorMessage.includes("NotFound")) {
        setError("لم يتم العثور على كاميرا. تأكد من توصيل كاميرا بالجهاز.");
      } else if (errorMessage.includes("NotReadable") || errorMessage.includes("Source")) {
        setError("الكاميرا مشغولة من تطبيق آخر. أغلق التطبيقات الأخرى وحاول مرة أخرى.");
      } else if (errorMessage.includes("HTTPS") || errorMessage.includes("secure context")) {
        setError("الكاميرا تحتاج اتصال آمن (HTTPS). تأكد من استخدام https://");
      } else {
        setError(`تعذر الوصول إلى الكاميرا: ${errorMessage}`);
      }
      stopScanner();
    }
  }, [router, stopScanner, supportsBarcodeDetector]);

  useEffect(() => {
    return () => {
      stopScanner();
    };
  }, [stopScanner]);

  return (
    <div className="space-y-3">
      <p className="text-sm font-semibold text-slate-800">المسح بالكاميرا (ويب)</p>
      <p className="text-xs leading-5 text-slate-500">اضغط تشغيل الكاميرا ثم وجّهها إلى QR الخاص بالمحطة.</p>

      <div className="overflow-hidden rounded-xl border border-slate-200 bg-slate-100">
        <video className="h-56 w-full object-cover" muted playsInline ref={videoRef} />
      </div>

      <div className="flex flex-wrap gap-2">
        <button
          className="inline-flex min-h-11 items-center justify-center rounded-lg bg-teal-700 px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-teal-600 disabled:cursor-not-allowed disabled:opacity-60"
          disabled={isScanning}
          onClick={() => void startScanner()}
          type="button"
        >
          {isScanning ? "جاري المسح..." : "تشغيل الكاميرا"}
        </button>
        <button
          className="inline-flex min-h-11 items-center justify-center rounded-lg border border-slate-200 bg-white px-4 py-2 text-sm font-semibold text-slate-700 transition-colors hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-60"
          disabled={!isScanning}
          onClick={stopScanner}
          type="button"
        >
          إيقاف
        </button>
      </div>

      {message ? <p className="text-xs text-slate-600">{message}</p> : null}
      {error ? <p className="text-xs font-medium text-red-700">{error}</p> : null}
      {debugInfo ? (
        <details className="mt-2">
          <summary className="cursor-pointer text-xs text-slate-400">معلومات تقنية (للدعم)</summary>
          <p className="mt-1 break-all text-[10px] text-slate-400">{debugInfo}</p>
        </details>
      ) : null}
    </div>
  );
}
