import type { Metadata } from "next";
import { Reem_Kufi, Vazirmatn } from "next/font/google";
import "./globals.css";

// Square Kufic display: its straight strokes and right angles answer the card's circuit traces.
const display = Reem_Kufi({ variable: "--font-display", subsets: ["arabic"], weight: "variable" });
const text = Vazirmatn({ variable: "--font-text", subsets: ["arabic", "latin"], weight: "variable" });

export const metadata: Metadata = {
  title: "پژوهش‌یار | از دانش، تا اثر",
  description: "کارت پژوهش‌یار؛ برای جامعهٔ منتخب مؤسسه تحقیق و توسعه دانشمند، با بانک سینا و گرین‌بانک.",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="fa" dir="rtl" className={`${display.variable} ${text.variable}`}>
      <body>{children}</body>
    </html>
  );
}
