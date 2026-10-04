import type { Metadata } from "next";
import localFont from "next/font/local";
import "./globals.css";

// IRANSans for everything; display type is the same family at heavier weights (see --font-display).
const text = localFont({
  variable: "--font-text",
  display: "swap",
  src: [
    { path: "../public/font/IRANSansWeb/IRANSansWeb_UltraLight.woff2", weight: "200", style: "normal" },
    { path: "../public/font/IRANSansWeb/IRANSansWeb_Light.woff2", weight: "300", style: "normal" },
    { path: "../public/font/IRANSansWeb/IRANSansWeb.woff2", weight: "400", style: "normal" },
    { path: "../public/font/IRANSansWeb/IRANSansWeb_Medium.woff2", weight: "500", style: "normal" },
    { path: "../public/font/IRANSansWeb/IRANSansWeb_Bold.woff2", weight: "700", style: "normal" },
    { path: "../public/font/IRANSansWeb/IRANSansWeb_Black.woff2", weight: "900", style: "normal" },
  ],
});

export const metadata: Metadata = {
  title: "پژوهش‌یار | از دانش، تا اثر",
  description: "کارت پژوهش‌یار؛ برای جامعهٔ منتخب مؤسسه تحقیق و توسعه دانشمند، با بانک سینا و گرین‌بانک.",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="fa" dir="rtl" className={text.variable}>
      <body>{children}</body>
    </html>
  );
}
