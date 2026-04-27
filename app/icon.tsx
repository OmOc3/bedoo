import { ImageResponse } from "next/og";
import { LogoMarkArtwork } from "@/components/layout/logo";

export const contentType = "image/png";
export const size = {
  width: 256,
  height: 256,
};

export default function Icon() {
  return new ImageResponse(
    (
      <svg height="256" viewBox="0 0 256 256" width="256" xmlns="http://www.w3.org/2000/svg">
        <rect fill="#031b12" height="256" rx="56" width="256" />
        <g transform="translate(0 4) scale(1.82)">
          <LogoMarkArtwork />
        </g>
      </svg>
    ),
    size,
  );
}
