import { useEffect, useState } from "react";

interface Props {
  onDone?: () => void;
}

export default function LoadingPage({ onDone }: Props) {
  const [dots, setDots] = useState(0);

  // Animate dots
  useEffect(() => {
    const interval = setInterval(() => {
      setDots(prev => (prev + 1) % 4);
    }, 400);
    return () => clearInterval(interval);
  }, []);

  // Call onDone after 2.5 seconds to proceed to the app
  useEffect(() => {
    const timer = setTimeout(() => {
      onDone?.();
    }, 2500);
    return () => clearTimeout(timer);
  }, [onDone]);

  return (
    <div className="min-h-screen bg-background flex flex-col items-center justify-center">
      <div className="flex flex-col items-center gap-6 animate-in fade-in-0 zoom-in-95 duration-700">
        {/* Logo image */}
        <div className="relative">
          <div className="absolute inset-0 rounded-full bg-primary/20 blur-2xl scale-150 animate-pulse" />
          <div className="relative w-32 h-32 flex items-center justify-center">
            <img
              src="/parsley.png"
              alt="SalsaHub"
              className="w-full h-full object-contain drop-shadow-[0_0_24px_rgba(145,247,142,0.4)]"
            />
          </div>
        </div>

        {/* Brand name */}
        <div className="text-center">
          <h1 className="text-3xl font-bold tracking-tight" style={{ fontFamily: "Manrope, sans-serif" }}>
            <span className="text-foreground">Salsa</span>
            <span className="text-primary">Hub</span>
          </h1>
          <p className="text-xs text-muted-foreground mt-1 tracking-widest uppercase">Dashboard</p>
        </div>

        {/* Loading dots */}
        <div className="flex items-center gap-1.5 mt-4">
          {[0, 1, 2].map(i => (
            <div
              key={i}
              className="w-1.5 h-1.5 rounded-full bg-primary transition-all duration-300"
              style={{
                opacity: dots > i ? 1 : 0.25,
                transform: dots > i ? "scale(1.3)" : "scale(1)"
              }}
            />
          ))}
        </div>
      </div>
    </div>
  );
}
