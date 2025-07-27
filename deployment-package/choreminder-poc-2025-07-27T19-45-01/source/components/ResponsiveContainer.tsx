"use client";

import { ReactNode } from "react";

interface ResponsiveContainerProps {
  children: ReactNode;
  maxWidth?: "sm" | "md" | "lg" | "xl" | "2xl" | "full";
  className?: string;
  padding?: "none" | "sm" | "md" | "lg";
  background?: "none" | "white" | "gradient" | "primary" | "secondary";
}

const ResponsiveContainer = ({
  children,
  maxWidth = "xl",
  className = "",
  padding = "md",
  background = "none",
}: ResponsiveContainerProps) => {
  const maxWidthClasses = {
    sm: "max-w-sm",
    md: "max-w-md",
    lg: "max-w-lg",
    xl: "max-w-7xl",
    "2xl": "max-w-7xl",
    full: "max-w-full",
  };

  const paddingClasses = {
    none: "",
    sm: "p-2",
    md: "p-4 md:p-6",
    lg: "p-6 md:p-8",
  };

  const backgroundClasses = {
    none: "",
    white: "bg-white shadow-lg rounded-xl border border-base-200",
    gradient:
      "bg-gradient-to-br from-white to-base-50 shadow-xl rounded-xl border border-base-200",
    primary: "bg-primary text-primary-content shadow-xl rounded-xl",
    secondary: "bg-secondary text-secondary-content shadow-xl rounded-xl",
  };

  return (
    <div
      className={`
      w-full mx-auto 
      ${maxWidthClasses[maxWidth]} 
      ${paddingClasses[padding]} 
      ${backgroundClasses[background]}
      ${className}
    `}
    >
      {children}
    </div>
  );
};

export default ResponsiveContainer;
