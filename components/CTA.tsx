import Image from "next/image";

import config from "@/config";

const CTA = () => {
  return (
    <section className="relative hero overflow-hidden min-h-screen">
      <Image
        src="/images/unsplash_parents_daughters_sofa.jpg"
        alt="Background"
        className="object-cover w-full"
        fill
        priority
      />
      <div className="relative hero-overlay bg-neutral bg-opacity-70"></div>
      <div className="relative hero-content text-center text-neutral-content p-8">
        <div className="flex flex-col items-center max-w-xl p-8 md:p-0">
          <h2 className="font-bold text-3xl md:text-5xl tracking-tight mb-8 md:mb-12">
            Ready to transform your household?
          </h2>
          <p className="text-lg opacity-80 mb-12 md:mb-16">
            Join thousands of families who&apos;ve discovered the secret to
            peaceful, organized homes. Start your free trial today!
          </p>

          <a href="#pricing" className="btn btn-primary btn-wide">
            Start Your Family Trial
          </a>
        </div>
      </div>
    </section>
  );
};

export default CTA;
