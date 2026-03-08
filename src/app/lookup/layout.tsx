import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Product Recall Lookup — SafeGuard Inbox",
  description:
    "Check if a product has been recalled. Search by brand, product name, or model number across CPSC, FDA, USDA, and NHTSA databases — no account required.",
  openGraph: {
    title: "Product Recall Lookup — SafeGuard Inbox",
    description:
      "Search thousands of recalls by brand, product name, or model number. Free, no signup needed.",
    type: "website",
  },
};

export default function LookupLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return children;
}
