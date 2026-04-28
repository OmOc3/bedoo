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

const scannerFrameIntervalMs = 250;

function extractStationIdFromQr(value: string): string | null {
  const match = value.match(/\/station\/([^/?#]+)\/report/);

  return match?.[1] ? decodeURIComponent(match[1]) : null;
}

export function WebQrScanner() {
  const router = useRouter();
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const frameRequestRef = useRef<number | null>(null);
  const scannerSessionRef = useRef(0);
  const [isScanning, setIsScanning] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [debugInfo, setDebugInfo] = useState<string | null>(null);
  const supportsBarcodeDetector = useMemo(() => {
    if (typeof window === "undefined") return false;
    const hasBarcodeDetector = typeof window.BarcodeDetector !== "undefined";
    return hasBarcodeDetector;
  }, []);

  const stopScanner = useCallback(() => {
    scannerSessionRef.current += 1;

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
    setMessage(null);
  }, []);

  const startScanner = useCallback(async () => {
    // Check for secure context (HTTPS) requirement
    if (typeof window !== "undefined" && window.isSecureContext === false) {
      setMessage(null);
      setError("الكاميرا تحتاج اتصال آمن (HTTPS). لا يمكن المسح عبر HTTP.");
      return;
    }

    // Check if mediaDevices is available
    if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
      setMessage(null);
      setError("المتصفح لا يدعم الوصول للكاميرا. جرب متصفح حديث (Chrome, Safari, Edge).");
      return;
    }

    // Check for BarcodeDetector support
    if (!supportsBarcodeDetector) {
      const isChromeMobile = /Chrome/.test(navigator.userAgent) && /Mobile/.test(navigator.userAgent);
      const browserInfo = isChromeMobile ? " (Chrome Mobile detected)" : "";
      setDebugInfo(`BarcodeDetector API not available${browserInfo}. UserAgent: ${navigator.userAgent.slice(0, 50)}...`);
      setMessage(null);
      setError("متصفحك لا يدعم ميزة مسح QR التلقائي. استخدم الإدخال اليدوي أو جرب Chrome/Safari المحدث على الكمبيوتر.");
      return;
    }

    setError(null);
    setDebugInfo(null);
    setMessage("جاري تشغيل الكاميرا...");

    try {
      // Check permission state first (if supported)
      if (navigator.permissions && navigator.permissions.query) {
        try {
          const permissionStatus = await navigator.permissions.query({ name: "camera" as PermissionName });
          if (permissionStatus.state === "denied") {
            setMessage(null);
            setError("تم رفض صلاحية الكاميرا. تأكد من السماح للمتصفح بالوصول في إعدادات الموقع، ثم أعد تحميل الصفحة.");
            return;
          }
        } catch {
          // Some browsers don't support querying camera permission, continue anyway
        }
      }

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
        // Second try: exact environment facing mode
        try {
          stream = await navigator.mediaDevices.getUserMedia({
            audio: false,
            video: {
              facingMode: { exact: "environment" },
            },
          });
        } catch (secondError) {
          setDebugInfo(
            [
              firstError instanceof Error ? firstError.message : String(firstError),
              secondError instanceof Error ? secondError.message : String(secondError),
            ].join(" | "),
          );
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
      setMessage("الكاميرا تعمل. وجّهها إلى QR المحطة.");

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
        setDebugInfo(detectorError instanceof Error ? detectorError.message : String(detectorError));
        stopScanner();
        setError("تعذر تهيئة ماسح QR. جرب متصفحًا آخر.");
        return;
      }

      setIsScanning(true);
      scannerSessionRef.current += 1;
      const scannerSession = scannerSessionRef.current;
      let lastDetectionAt = 0;

      const scheduleTick = (): void => {
        if (scannerSessionRef.current !== scannerSession) {
          return;
        }

        frameRequestRef.current = requestAnimationFrame(() => {
          void tick();
        });
      };

      const tick = async (): Promise<void> => {
        if (scannerSessionRef.current !== scannerSession) {
          return;
        }

        if (!videoRef.current || videoRef.current.readyState < HTMLMediaElement.HAVE_ENOUGH_DATA) {
          scheduleTick();
          return;
        }

        const now = performance.now();
        if (now - lastDetectionAt < scannerFrameIntervalMs) {
          scheduleTick();
          return;
        }
        lastDetectionAt = now;

        try {
          const results = await detector.detect(videoRef.current);
          const rawValue = results[0]?.rawValue;

          if (rawValue) {
            const stationId = extractStationIdFromQr(rawValue);
            if (stationId) {
              stopScanner();
              router.push(`/station/${encodeURIComponent(stationId)}/report`);
              return;
            }

            setError("تم مسح QR لكنه ليس رابط محطة صالح.");
          }
        } catch {
          setError("تعذر قراءة QR حاليًا. حرّك الكاميرا قليلاً وحاول مرة أخرى.");
        }

        scheduleTick();
      };

      scheduleTick();
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : String(err);
      setDebugInfo(errorMessage);
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
      {error ? (
        <div className="flex flex-wrap items-center gap-2">
          <p className="text-xs font-medium text-red-700">{error}</p>
          {error.includes("أعد تحميل الصفحة") ? (
            <button
              className="rounded bg-red-100 px-2 py-1 text-[10px] font-semibold text-red-700 hover:bg-red-200"
              onClick={() => window.location.reload()}
              type="button"
            >
              إعادة تحميل
            </button>
          ) : null}
        </div>
      ) : null}
      {debugInfo ? (
        <details className="mt-2">
          <summary className="cursor-pointer text-xs text-slate-400">معلومات تقنية (للدعم)</summary>
          <p className="mt-1 break-all text-[10px] text-slate-400">{debugInfo}</p>
        </details>
      ) : null}
    </div>
  );
}
