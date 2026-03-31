import { useEffect, useState } from "react";

interface LoadingPageProps {
  onDone: () => void;
}

export default function LoadingPage({ onDone }: LoadingPageProps) {
  const [progress, setProgress] = useState(0);

  useEffect(() => {
    const startTime = Date.now();
    const duration = 2500;
    const interval = setInterval(() => {
      const elapsed = Date.now() - startTime;
      const newProgress = Math.min((elapsed / duration) * 100, 100);
      setProgress(newProgress);
      if (newProgress >= 100) {
        clearInterval(interval);
        setTimeout(onDone, 100);
      }
    }, 30);
    return () => clearInterval(interval);
  }, [onDone]);

  return (
    <div className="fixed inset-0 bg-background flex flex-col items-center justify-center">
      <div className="mb-8 animate-pulse">
        <img src="/parsley.png" alt="SalsaHub" className="w-20 h-20" />
      </div>
      <h1 className="text-4xl font-bold text-primary font-sans mb-12">SalsaHub</h1>
      <div className="w-64 h-1 bg-surface-mid rounded-full overflow-hidden">
        <div className="h-full bg-primary transition-all duration-100" style={{ width: `${progress}%` }} />
      </div>
    </div>
  );
}
