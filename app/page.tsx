import { Metadata } from "next";
import { Suspense, ReactNode } from "react";

import CTA from "@/components/CTA";
import FAQ from "@/components/FAQ";
import FeaturesAccordion from "@/components/FeaturesAccordion";
import Footer from "@/components/Footer";
import Header from "@/components/Header";
import Hero from "@/components/Hero";
import Pricing from "@/components/Pricing";
import Problem from "@/components/Problem";
import Testimonials3 from "@/components/Testimonials3";

// Add metadata for SEO
export const metadata: Metadata = {
  title: "ChoreMinder - AI-Powered Family Chore Management",
  description:
    "Tired of the chore wars? Let ChoreMinder keep score and keep the peace. Smart chore assignment, automated reminders, and gamified tracking for happier families.",
  keywords:
    "chore management, family organization, household tasks, parenting tools, chore tracking, family app, smart home, ChoreMinder",
};

export default function Home(): JSX.Element {
  return (
    <>
      <Suspense fallback={<div>Loading...</div>}>
        <Header />
      </Suspense>
      <main>
        {/* FeNAgO - The complete platform for building agentic AI-powered SaaS products */}
        <Hero />
        <Problem />
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
