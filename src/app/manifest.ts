import type { MetadataRoute } from "next";

/** PWA: HS/GV "Thêm vào màn hình chính" và mở như một app (chuẩn bị cho Web Push). */
export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "Classroom Edu",
    short_name: "Classroom",
    description: "Giao bài, nộp bài và chấm bài cho giáo viên và học sinh",
    lang: "vi",
    start_url: "/login",
    scope: "/",
    display: "standalone",
    orientation: "portrait",
    background_color: "#faf6f0",
    theme_color: "#b93c0b",
    icons: [
      { src: "/icons/icon-192.png", sizes: "192x192", type: "image/png" },
      { src: "/icons/icon-512.png", sizes: "512x512", type: "image/png" },
      { src: "/icons/icon-maskable-512.png", sizes: "512x512", type: "image/png", purpose: "maskable" },
    ],
  };
}
