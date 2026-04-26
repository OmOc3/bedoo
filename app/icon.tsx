import { ImageResponse } from "next/og";
import { MAWQI3_MARK_PATH } from "@/components/layout/logo";

export const contentType = "image/png";
export const size = {
  width: 256,
  height: 256,
};

export default function Icon() {
  return new ImageResponse(
    (
      <svg height="256" viewBox="0 0 100 100" width="256" xmlns="http://www.w3.org/2000/svg">
        <rect fill="#f8fafc" height="100" rx="22" width="100" />
        <path d={MAWQI3_MARK_PATH} fill="#0f766e" fillRule="evenodd" />
      </svg>
    ),
    size,
  );
}
