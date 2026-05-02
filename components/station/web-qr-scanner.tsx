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
    <div className="flex flex-col gap-4">
      <style>{`
        @keyframes scanline {
          0% { top: 0%; opacity: 0; }
          10% { opacity: 1; }
          90% { opacity: 1; }
          100% { top: 100%; opacity: 0; }
        }
        .animate-scan-line {
          animation: scanline 2.5s cubic-bezier(0.4, 0, 0.2, 1) infinite;
        }
      `}</style>
      
      {/* Video Container with Scanning UI overlay */}
      <div className="relative w-full overflow-hidden rounded-[1.5rem] bg-black shadow-inner aspect-[3/4] sm:aspect-square md:aspect-video">
        <video className="h-full w-full object-cover" muted playsInline ref={videoRef} />
        
        {/* Scanning Overlay / Targeting Reticle */}
        {isScanning ? (
          <>
            {/* Darkened overlay with a clear cutout */}
            <div className="pointer-events-none absolute inset-0 border-[15vw] border-black/60 transition-all duration-300 sm:border-[60px]">
               {/* Animated Scan Line */}
               <div className="absolute left-0 right-0 h-0.5 w-full bg-teal-400 shadow-[0_0_12px_rgba(45,212,191,1)] animate-scan-line" />
            </div>
            
            {/* Corner Markers */}
            <div className="absolute inset-x-[15vw] inset-y-[15vw] sm:inset-x-[60px] sm:inset-y-[60px] pointer-events-none">
              <div className="absolute top-0 right-0 w-8 h-8 border-t-4 border-r-4 border-teal-400 rounded-tr-lg" />
              <div className="absolute top-0 left-0 w-8 h-8 border-t-4 border-l-4 border-teal-400 rounded-tl-lg" />
              <div className="absolute bottom-0 right-0 w-8 h-8 border-b-4 border-r-4 border-teal-400 rounded-br-lg" />
              <div className="absolute bottom-0 left-0 w-8 h-8 border-b-4 border-l-4 border-teal-400 rounded-bl-lg" />
            </div>
          </>
        ) : (
          <div className="absolute inset-0 flex flex-col items-center justify-center bg-black/80 text-white p-6 text-center">
            <div className="mb-5 flex h-20 w-20 items-center justify-center rounded-full bg-white/10 backdrop-blur-md">
              <svg aria-hidden="true" className="h-10 w-10 text-teal-400" fill="none" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" viewBox="0 0 24 24">
                <path d="M3 7V5a2 2 0 0 1 2-2h2" />
                <path d="M17 3h2a2 2 0 0 1 2 2v2" />
                <path d="M21 17v2a2 2 0 0 1-2 2h-2" />
                <path d="M7 21H5a2 2 0 0 1-2-2v-2" />
                <path d="M8 7v10" />
                <path d="M12 7v10" />
                <path d="M16 7v10" />
              </svg>
            </div>
            <p className="font-bold text-xl">الكاميرا متوقفة</p>
            <p className="mt-3 text-sm text-gray-300 max-w-xs leading-relaxed">
              اضغط على زر البدء بالأسفل لتشغيل الكاميرا ومسح كود المحطة
            </p>
          </div>
        )}
      </div>

      <div className="grid grid-cols-2 gap-3 sm:flex sm:flex-row">
        <button
          className="inline-flex min-h-[56px] items-center justify-center rounded-2xl bg-[var(--primary)] px-4 py-3 text-base font-bold text-[var(--primary-foreground)] shadow-lg shadow-[var(--primary)]/20 transition-all active:scale-[0.98] sm:flex-1"
          disabled={isScanning}
          onClick={() => void startScanner()}
          type="button"
          style={{ opacity: isScanning ? 0.6 : 1 }}
        >
          {isScanning ? (
            <span className="flex items-center gap-2">
              <span className="relative flex h-3 w-3">
                <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-white opacity-75"></span>
                <span className="relative inline-flex h-3 w-3 rounded-full bg-white"></span>
              </span>
              جاري المسح...
            </span>
          ) : (
            "تشغيل الكاميرا"
          )}
        </button>
        <button
          className="inline-flex min-h-[56px] items-center justify-center rounded-2xl border-2 border-[var(--border)] bg-[var(--surface)] px-4 py-3 text-base font-bold text-[var(--foreground)] shadow-sm transition-all hover:bg-[var(--surface-subtle)] active:scale-[0.98] sm:flex-1"
          disabled={!isScanning}
          onClick={stopScanner}
          type="button"
          style={{ opacity: !isScanning ? 0.6 : 1 }}
        >
          إيقاف
        </button>
      </div>

      {message && !isScanning ? (
        <div className="mt-1 flex items-center justify-center rounded-xl bg-teal-50 px-4 py-3 text-sm font-semibold text-teal-700 dark:bg-teal-900/30 dark:text-teal-300" role="status">
          {message}
        </div>
      ) : null}
      
      {error ? (
        <div className="mt-1 flex flex-col items-center gap-3 rounded-xl bg-[var(--danger-soft)] p-5 text-center shadow-sm" role="alert">
          <svg aria-hidden="true" className="h-8 w-8 text-[var(--danger)]" fill="none" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" viewBox="0 0 24 24"><circle cx="12" cy="12" r="10" /><line x1="12" y1="8" x2="12" y2="12" /><line x1="12" y1="16" x2="12.01" y2="16" /></svg>
          <p className="text-sm font-bold text-[var(--danger)] leading-relaxed">{error}</p>
          {error.includes("أعد تحميل الصفحة") ? (
            <button
              className="mt-2 inline-flex min-h-[48px] items-center justify-center rounded-xl bg-[var(--danger)] px-8 py-2 text-sm font-bold text-white shadow-md hover:opacity-90 active:scale-[0.98]"
              onClick={() => window.location.reload()}
              type="button"
            >
              إعادة تحميل الصفحة
            </button>
          ) : null}
        </div>
      ) : null}
      
      {debugInfo ? (
        <details className="mt-2 rounded-xl border border-[var(--border)] bg-[var(--surface-subtle)] p-4">
          <summary className="cursor-pointer text-sm font-bold text-[var(--muted)]">معلومات تقنية (للدعم)</summary>
          <p className="mt-3 break-all rounded-lg bg-[var(--surface)] p-3 font-mono text-[11px] text-[var(--muted-foreground)] leading-relaxed">{debugInfo}</p>
        </details>
      ) : null}
    </div>
  );
}
