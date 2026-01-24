import { Metadata } from "next";
import { Suspense } from "react";

import config from "@/config";

import CTA from "@/components/CTA";
import FAQ from "@/components/FAQ";
import FeaturesAccordion from "@/components/FeaturesAccordion";
import Footer from "@/components/Footer";
import Header from "@/components/Header";
import Hero from "@/components/Hero";
import Pricing from "@/components/Pricing";
import Testimonials3 from "@/components/Testimonials3";

export const metadata: Metadata = {
  title: `${config.appName} - AI-Powered Chore Management for Families`,
  description:
    "Transform household chaos into family harmony with ChoreMinder. AI-powered chore assignment, photo verification, gamification, and smart reminders help kids actually want to help around the house.",
  keywords: [
    "chore management",
    "family chores",
    "kids chores",
    "household management",
    "chore app",
    "family organization",
    "gamified chores",
    "photo verification",
    "smart reminders",
    "parenting app",
  ],
  openGraph: {
    title: `${config.appName} - From Family Chaos to Household Harmony`,
    description:
      "AI-powered chore management that makes kids actually want to help. Photo verification, gamification, and smart reminders included.",
    type: "website",
    url: `https://${config.domainName}`,
  },
  twitter: {
    card: "summary_large_image",
    title: `${config.appName} - AI-Powered Chore Management`,
    description:
      "Transform your household with gamified chores, photo verification, and smart reminders.",
  },
};

export default function LandingPage(): JSX.Element {
  return (
    <>
      <Suspense>
        <Header />
      </Suspense>
      <main>
        <Hero />
        <FeaturesAccordion />
        <Pricing />
        <Testimonials3 />
        <FAQ />
        <CTA />
      </main>
      <Footer />
    </>
  );
}
