import Image from "next/image";

import config from "@/config";

import TestimonialsAvatars from "./TestimonialsAvatars";

const Hero = () => {
  return (
    <section className="max-w-7xl mx-auto bg-base-100 flex flex-col lg:flex-row items-center justify-center gap-16 lg:gap-20 px-8 py-8 lg:py-20">
      <div className="flex flex-col gap-10 lg:gap-14 items-center justify-center text-center lg:text-left lg:items-start">
        <h1 className="font-extrabold text-4xl lg:text-6xl tracking-tight">
          From Family Chaos to Household Harmony
        </h1>
        <p className="text-lg opacity-80 leading-relaxed">
          ChoreMinder transforms household management with AI-powered chore
          assignment, smart reminders, and gamified tracking. Watch your kids
          actually *want* to help around the house while you enjoy a more
          organized, peaceful home.
        </p>
        <a href="#pricing" className="btn btn-primary btn-wide">
          Start Your Free Family Trial
        </a>

        <TestimonialsAvatars priority={true} />
      </div>
      <div className="lg:w-full">
        <Image
          src="https://images.unsplash.com/photo-1609220136736-443140cffec6?q=80&w=2070&auto=format&fit=crop"
          alt="Happy family organizing household chores together"
          className="w-full rounded-lg"
          priority={true}
          width={500}
          height={500}
        />
      </div>
    </section>
  );
};

export default Hero;
