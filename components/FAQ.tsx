"use client";

import { useRef, useState } from "react";
import type { JSX } from "react";

// <FAQ> component is a lsit of <Item> component
// Just import the FAQ & add your FAQ content to the const faqList arrayy below.

interface FAQItemProps {
  question: string;
  answer: JSX.Element;
}

const faqList: FAQItemProps[] = [
  {
    question: "How old do kids need to be to use ChoreMinder?",
    answer: (
      <div className="space-y-2 leading-relaxed">
        <p>
          ChoreMinder works great for kids aged 4 and up! Younger children (4-7)
          can participate with photo submissions and simple tasks, while older
          kids can manage their own accounts and handle more complex chores. The
          gamification elements are designed to engage all age groups.
        </p>
      </div>
    ),
  },
  {
    question: "What if my child doesn't have a smartphone?",
    answer: (
      <p>
        No problem! Parents can manage everything from their account, including
        submitting photos on behalf of younger children. ChoreMinder also works
        on tablets, computers, and we have a simple web interface that works on
        any device.
      </p>
    ),
  },
  {
    question: "Can I customize the chores and rewards?",
    answer: (
      <div className="space-y-2 leading-relaxed">
        <p>
          Absolutely! You can create custom chores, set your own point values,
          design family-specific rewards, and adjust difficulty levels. The AI
          suggestions learn from your family's preferences to make better
          recommendations over time.
        </p>
      </div>
    ),
  },
  {
    question: "Is there a free trial?",
    answer: (
      <p>
        Yes! We offer a 14-day free trial with full access to all features. No
        credit card required to start. After the trial, you can choose the plan
        that best fits your family size and needs.
      </p>
    ),
  },
  {
    question: "How does photo verification work?",
    answer: (
      <div className="space-y-2 leading-relaxed">
        <p>
          Kids take photos of completed chores using the app. Parents receive
          notifications and can quickly approve or request improvements. This
          creates accountability, reduces arguments about whether tasks were
          done, and builds trust between parents and children.
        </p>
      </div>
    ),
  },
];

const FaqItem = ({ item }: { item: FAQItemProps }) => {
  const accordion = useRef<HTMLDivElement>(null);
  const [isOpen, setIsOpen] = useState(false);

  return (
    <li>
      <button
        className="relative flex gap-2 items-center w-full py-5 text-base font-semibold text-left border-t md:text-lg border-base-content/10"
        onClick={(e) => {
          e.preventDefault();
          setIsOpen(!isOpen);
        }}
        aria-expanded={isOpen}
      >
        <span
          className={`flex-1 text-base-content ${isOpen ? "text-primary" : ""}`}
        >
          {item?.question}
        </span>
        <svg
          className={`flex-shrink-0 w-4 h-4 ml-auto fill-current`}
          viewBox="0 0 16 16"
          xmlns="http://www.w3.org/2000/svg"
        >
          <rect
            y="7"
            width="16"
            height="2"
            rx="1"
            className={`transform origin-center transition duration-200 ease-out ${
              isOpen && "rotate-180"
            }`}
          />
          <rect
            y="7"
            width="16"
            height="2"
            rx="1"
            className={`transform origin-center rotate-90 transition duration-200 ease-out ${
              isOpen && "rotate-180 hidden"
            }`}
          />
        </svg>
      </button>

      <div
        ref={accordion}
        className={`transition-all duration-300 ease-in-out opacity-80 overflow-hidden`}
        style={
          isOpen
            ? { maxHeight: accordion.current?.scrollHeight, opacity: 1 }
            : { maxHeight: 0, opacity: 0 }
        }
      >
        <div className="pb-5 leading-relaxed">{item?.answer}</div>
      </div>
    </li>
  );
};

const FAQ = () => {
  return (
    <section className="bg-base-200" id="faq">
      <div className="py-24 px-8 max-w-7xl mx-auto flex flex-col md:flex-row gap-12">
        <div className="flex flex-col text-left basis-1/2">
          <p className="inline-block font-semibold text-primary mb-4">FAQ</p>
          <p className="sm:text-4xl text-3xl font-extrabold text-base-content">
            Frequently Asked Questions
          </p>
        </div>

        <ul className="basis-1/2">
          {faqList.map((item, i) => (
            <FaqItem key={i} item={item} />
          ))}
        </ul>
      </div>
    </section>
  );
};

export default FAQ;
