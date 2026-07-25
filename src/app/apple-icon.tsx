import { ImageResponse } from "next/og";

export const size = { width: 180, height: 180 };
export const contentType = "image/png";

/** Home-screen / Apple touch icon — Y.A.W.N sawblade mark. */
export default function AppleIcon() {
  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          background: "#fffef8",
          borderRadius: 36,
          border: "8px solid #000",
        }}
      >
        <svg width="128" height="128" viewBox="0 0 64 64">
          <path
            fill="#000"
            d="M32 4l3.2 7.4 7.6-2.6-2.2 7.7 7.1 3.7-5.5 5.7 5.5 5.7-7.1 3.7 2.2 7.7-7.6-2.6L32 60l-3.2-7.4-7.6 2.6 2.2-7.7-7.1-3.7 5.5-5.7-5.5-5.7 7.1-3.7-2.2-7.7 7.6 2.6L32 4z"
          />
          <circle cx="32" cy="32" r="10" fill="#fffef8" />
          <circle cx="32" cy="32" r="4.5" fill="#000" />
        </svg>
      </div>
    ),
    { ...size }
  );
}
