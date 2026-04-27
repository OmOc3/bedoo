import { ImageResponse } from "next/og";

const ECOPEST_MARK_PATH =
  "M50 5C29.566 5 14 20.296 14 40.104c0 22.981 24.799 40.769 33.319 46.279a4.924 4.924 0 0 0 5.362 0C61.201 80.873 86 63.085 86 40.104C86 20.296 70.434 5 50 5Zm0 12c13.958 0 24 9.66 24 23.14 0 13.316-11.656 25.497-19.064 31.761a7.64 7.64 0 0 1-9.872 0C37.656 65.637 26 53.456 26 40.14 26 26.66 36.042 17 50 17Zm-24 42h13.5V41.2c0-5.42 4.284-9.2 10.5-9.2s10.5 3.78 10.5 9.2V59H74V41.2C74 28.952 64.138 20 50 20S26 28.952 26 41.2V59Zm19-14h10v10H45V45Z";

export const contentType = "image/png";
export const size = {
  width: 180,
  height: 180,
};

export default function AppleIcon() {
  return new ImageResponse(
    (
      <svg height="180" viewBox="0 0 100 100" width="180" xmlns="http://www.w3.org/2000/svg">
        <rect fill="#0f766e" height="100" rx="22" width="100" />
        <path d={ECOPEST_MARK_PATH} fill="#ffffff" fillRule="evenodd" />
      </svg>
    ),
    size,
  );
}
