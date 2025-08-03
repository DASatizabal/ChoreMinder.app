import { Metadata } from "next";

// Add metadata for SEO
export const metadata: Metadata = {
  title: "ChoreMinder - Coming Soon",
  description: "ChoreMinder is under construction. We're building something amazing for families!",
};

export default function UnderConstruction(): JSX.Element {
  return (
    <div className="min-h-screen bg-gradient-to-br from-primary to-secondary flex items-center justify-center">
      <div className="text-center text-white px-8">
        <div className="mb-8">
          <h1 className="text-6xl font-bold mb-4">🚧</h1>
          <h1 className="text-4xl md:text-6xl font-bold mb-4">Under Construction</h1>
          <p className="text-xl md:text-2xl mb-8 opacity-90">
            We're building something amazing for families!
          </p>
          <p className="text-lg opacity-75">
            ChoreMinder will be launching soon with AI-powered chore management.
          </p>
        </div>
        
        <div className="animate-bounce">
          <div className="w-16 h-16 mx-auto bg-white bg-opacity-20 rounded-full flex items-center justify-center">
            <div className="w-8 h-8 bg-white rounded-full animate-pulse"></div>
          </div>
        </div>
      </div>
    </div>
  );
}