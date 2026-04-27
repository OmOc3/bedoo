import { cn } from "@/lib/utils";

const BRAND_COLORS = {
  ant: "#ffffff",
  ecoDark: "#0f172a",
  ecoLight: "#f8fafc",
  leafDark: "#0b6b3b",
  leafLight: "#22c55e",
  pestBlue: "#2f87d8",
  subtitleDark: "#475569",
  subtitleLight: "#dbeafe",
  vein: "#dcfce7",
} as const;

export function LogoMarkArtwork() {
  return (
    <>
      <path
        d="M66 122c-22-5-40-17-50-35C7 71 8 49 18 31c10-17 27-29 47-31-7 16-12 33-14 50-3 25 0 49 15 72Z"
        fill={BRAND_COLORS.leafDark}
      />
      <path
        d="M70 122c-5-30-3-55 6-78 8-21 22-39 40-52 12 14 18 32 17 52-1 35-24 64-63 78Z"
        fill={BRAND_COLORS.leafLight}
      />
      <path
        d="M46 27c-7 17-10 35-8 53 1 11 4 22 9 32"
        fill="none"
        stroke={BRAND_COLORS.vein}
        strokeLinecap="round"
        strokeWidth="5"
      />
      <g transform="translate(20 18) rotate(-18 50 42)">
        <ellipse cx="79" cy="23" fill={BRAND_COLORS.ant} rx="10" ry="7" />
        <ellipse cx="57" cy="35" fill={BRAND_COLORS.ant} rx="18" ry="13" />
        <ellipse cx="33" cy="45" fill={BRAND_COLORS.ant} rx="13" ry="10" />
        <circle cx="83" cy="22" fill={BRAND_COLORS.leafLight} r="2" />
        <path
          d="M84 17c7-9 14-13 22-13M84 23c9-2 18-1 27 4"
          fill="none"
          stroke={BRAND_COLORS.ant}
          strokeLinecap="round"
          strokeWidth="4"
        />
        <path
          d="M42 33 18 18M56 36 28 25M70 37 44 30M44 49 17 61M58 50 31 69M72 48 46 79"
          fill="none"
          stroke={BRAND_COLORS.ant}
          strokeLinecap="round"
          strokeWidth="4.5"
        />
      </g>
    </>
  );
}

interface LogoSvgProps {
  className?: string;
  title?: string;
}

interface LogoLockupSvgProps extends LogoSvgProps {
  inverse?: boolean;
}

export function LogoMarkSvg({ className, title = "EcoPest" }: LogoSvgProps) {
  return (
    <svg
      aria-label={title}
      className={cn("block h-12 w-12", className)}
      role="img"
      viewBox="0 0 140 140"
      xmlns="http://www.w3.org/2000/svg"
    >
      <LogoMarkArtwork />
    </svg>
  );
}

export function LogoLockupSvg({ className, inverse = false, title = "EcoPest Pest Control Team" }: LogoLockupSvgProps) {
  const ecoColor = inverse ? BRAND_COLORS.ecoLight : BRAND_COLORS.ecoDark;
  const subtitleColor = inverse ? BRAND_COLORS.subtitleLight : BRAND_COLORS.subtitleDark;

  return (
    <svg
      aria-label={title}
      className={cn("block h-16 w-auto", className)}
      role="img"
      viewBox="0 0 390 140"
      xmlns="http://www.w3.org/2000/svg"
    >
      <g transform="translate(0 0)">
        <LogoMarkArtwork />
      </g>
      <text fill={ecoColor} fontFamily="Arial, Helvetica, sans-serif" fontSize="58" fontWeight="700" x="145" y="70">
        eco
      </text>
      <text
        fill={BRAND_COLORS.pestBlue}
        fontFamily="Arial, Helvetica, sans-serif"
        fontSize="58"
        fontWeight="700"
        x="232"
        y="70"
      >
        pest
      </text>
      <text
        fill={subtitleColor}
        fontFamily="Arial, Helvetica, sans-serif"
        fontSize="24"
        fontWeight="700"
        letterSpacing="0.6"
        x="145"
        y="102"
      >
        Pest Control Team
      </text>
    </svg>
  );
}
