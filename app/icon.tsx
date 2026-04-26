import { ImageResponse } from "next/og";

export const contentType = "image/png";
export const size = {
  width: 256,
  height: 256,
};

export default function Icon() {
  return new ImageResponse(
    (
      <div
        style={{
          alignItems: "center",
          background: "#020617",
          borderRadius: 56,
          color: "#f8fafc",
          display: "flex",
          fontFamily: "sans-serif",
          fontSize: 128,
          fontWeight: 800,
          height: "100%",
          justifyContent: "center",
          position: "relative",
          width: "100%",
        }}
      >
        <div
          style={{
            background: "#0f766e",
            borderRadius: 9999,
            height: 42,
            position: "absolute",
            right: 42,
            top: 42,
            width: 42,
          }}
        />
        B
      </div>
    ),
    size,
  );
}
