import Image from "next/image";
import { cn } from "@/lib/utils";

const LOGO_ASSETS = {
  lockup: {
    height: 1088,
    src: "/brand/ecopest-lockup.png",
    width: 1826,
  },
  mark: {
    height: 1128,
    src: "/brand/ecopest-mark.png",
    width: 1128,
  },
} as const;

interface LogoSvgProps {
  className?: string;
  title?: string;
}

interface LogoLockupSvgProps extends LogoSvgProps {
  inverse?: boolean;
}

export function LogoMarkSvg({ className, title = "EcoPest" }: LogoSvgProps) {
  return (
    <Image
      alt={title}
      className={cn("block h-12 w-12 object-contain", className)}
      height={LOGO_ASSETS.mark.height}
      src={LOGO_ASSETS.mark.src}
      width={LOGO_ASSETS.mark.width}
    />
  );
}

export function LogoLockupSvg({ className, inverse: _inverse = false, title = "EcoPest Pest Control Team" }: LogoLockupSvgProps) {
  return (
    <Image
      alt={title}
      className={cn("block h-16 w-auto object-contain", className)}
      height={LOGO_ASSETS.lockup.height}
      priority
      src={LOGO_ASSETS.lockup.src}
      width={LOGO_ASSETS.lockup.width}
    />
  );
}
