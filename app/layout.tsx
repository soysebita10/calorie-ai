import type { Metadata, Viewport } from "next";
import type { ReactNode } from "react";
import "./styles.css";
import "./auth.css";
import "./meals.css";

const title = "CalorieAI — Track Your Calories Smarter";

export const metadata: Metadata = {
  title,
  description:
    "CalorieAI is an AI-powered calorie tracker. Snap a photo or describe your meal to estimate calories, protein, carbs, and fats. Created by Sebastian Nieves.",
  authors: [{ name: "Sebastian Nieves" }],
  openGraph: {
    title,
    description:
      "Snap a photo or describe your meal. CalorieAI estimates calories, protein, carbs, and fats in seconds.",
    type: "website",
  },
  icons: { icon: { url: "/favicon.svg", type: "image/svg+xml" } },
};

export const viewport: Viewport = { themeColor: "#16a34a" };

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="en">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="" />
        <link
          href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800&display=swap"
          rel="stylesheet"
        />
      </head>
      <body>{children}</body>
    </html>
  );
}
