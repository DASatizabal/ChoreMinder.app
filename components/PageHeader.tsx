"use client";

import { ReactNode } from "react";

interface PageHeaderProps {
  title: string;
  description?: string;
  icon?: string;
  children?: ReactNode;
  actions?: ReactNode;
  breadcrumbs?: Array<{
    label: string;
    href?: string;
    active?: boolean;
  }>;
  gradient?: boolean;
  size?: "sm" | "md" | "lg";
}

const PageHeader = ({ 
  title, 
  description, 
  icon, 
  children, 
  actions,
  breadcrumbs,
  gradient = false,
  size = "md"
}: PageHeaderProps) => {

  const sizeClasses = {
    sm: {
      title: "text-2xl md:text-3xl",
      description: "text-base",
      icon: "text-4xl",
      padding: "py-4 md:py-6"
    },
    md: {
      title: "text-3xl md:text-4xl",
      description: "text-lg",
      icon: "text-5xl md:text-6xl", 
      padding: "py-6 md:py-8"
    },
    lg: {
      title: "text-4xl md:text-5xl",
      description: "text-xl",
      icon: "text-6xl md:text-7xl",
      padding: "py-8 md:py-12"
    }
  };

  const backgroundClass = gradient 
    ? "bg-gradient-to-r from-primary via-secondary to-accent text-white"
    : "bg-base-100";

  return (
    <div className={`${backgroundClass} ${gradient ? 'shadow-lg' : ''}`}>
      <div className={`container mx-auto px-4 ${sizeClasses[size].padding}`}>
        {/* Breadcrumbs */}
        {breadcrumbs && breadcrumbs.length > 0 && (
          <div className="breadcrumbs text-sm mb-4">
            <ul>
              {breadcrumbs.map((crumb, index) => (
                <li key={index}>
                  {crumb.href && !crumb.active ? (
                    <a href={crumb.href} className={gradient ? "text-white/80 hover:text-white" : ""}>
                      {crumb.label}
                    </a>
                  ) : (
                    <span className={`${crumb.active ? 'font-bold' : ''} ${gradient ? 'text-white' : ''}`}>
                      {crumb.label}
                    </span>
                  )}
                </li>
              ))}
            </ul>
          </div>
        )}

        {/* Main Header Content */}
        <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-6">
          {/* Title Section */}
          <div className="flex-1">
            <div className="flex items-center gap-4 mb-2">
              {icon && (
                <div className={`${sizeClasses[size].icon} ${gradient ? 'drop-shadow-lg' : ''}`}>
                  {icon}
                </div>
              )}
              <h1 className={`
                font-bold ${sizeClasses[size].title} 
                ${gradient ? 'text-white drop-shadow-lg' : 'text-base-content'}
              `}>
                {title}
              </h1>
            </div>
            
            {description && (
              <p className={`
                ${sizeClasses[size].description} 
                ${gradient ? 'text-white/90' : 'text-base-content/70'} 
                max-w-2xl
              `}>
                {description}
              </p>
            )}
            
            {children && (
              <div className="mt-4">
                {children}
              </div>
            )}
          </div>

          {/* Actions */}
          {actions && (
            <div className="flex-shrink-0">
              {actions}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default PageHeader;