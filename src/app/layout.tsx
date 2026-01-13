import type { Metadata } from "next";
import { Outfit } from "next/font/google";
import CalendlyWidget from "@/components/CalendlyWidget";
import "./globals.css";

const outfit = Outfit({ subsets: ["latin"] });

export const metadata: Metadata = {
    title: "Lead Generation Conversion Analyzer",
    description: "Analyze your website's conversion ability.",
};

export default function RootLayout({
    children,
}: Readonly<{
    children: React.ReactNode;
}>) {
    return (
        <html lang="sv">
            <head>
                <link href="https://assets.calendly.com/assets/external/widget.css" rel="stylesheet" />
            </head>
            <body className={`${outfit.className} antialiased`}>
                {children}
                <CalendlyWidget />
            </body>
        </html>
    );
}
