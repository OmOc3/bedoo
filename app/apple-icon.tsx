import { ImageResponse } from "next/og";
import { LogoMarkArtwork } from "@/components/layout/logo";

export const contentType = "image/png";
export const size = {
  width: 180,
  height: 180,
};

export default function AppleIcon() {
  return new ImageResponse(
    (
      <svg height="180" viewBox="0 0 180 180" width="180" xmlns="http://www.w3.org/2000/svg">
        <rect fill="#031b12" height="180" rx="40" width="180" />
        <g transform="translate(-2 2) scale(1.3)">
          <LogoMarkArtwork />
        </g>
      </svg>
    ),
    size,
  );
}
