import React, { useState, useEffect } from 'react';

export function FragrancePyramid({ top, heart, base }: { top?: string | null, heart?: string | null, base?: string | null }) {
  const [filled, setFilled] = useState(false);

  useEffect(() => {
    const timer = setTimeout(() => setFilled(true), 300);
    return () => clearTimeout(timer);
  }, []);

  const Bar = ({ label, note, delay }: { label: string, note?: string | null, delay: string }) => {
    if (!note) return null;
    return (
      <div className="flex flex-col gap-1 w-full max-w-sm mx-auto mb-4">
        <span className="text-xs font-bold text-gray-500 uppercase tracking-widest">{label}</span>
        <div className="relative h-8 bg-gray-100 rounded overflow-hidden">
          <div
            className="absolute top-0 right-0 h-full bg-[hsl(var(--primary))] opacity-20 transition-all duration-1000 ease-out"
            style={{ width: filled ? '100%' : '0%', transitionDelay: delay }}
          />
          <div
            className="absolute top-0 right-0 h-full w-1 bg-[hsl(var(--primary))] transition-all duration-1000 ease-out"
            style={{ right: filled ? '100%' : '0%', transitionDelay: delay, transform: 'translateX(100%)' }}
          />
          <div className="absolute inset-0 flex items-center justify-center text-sm font-medium text-gray-900 z-10">
            {note}
          </div>
        </div>
      </div>
    );
  };

  return (
    <div className="py-6 border-t border-b border-gray-100 my-8 text-center">
      <h3 className="font-serif font-bold text-lg mb-6 text-gray-900">الهرم العطري</h3>
      <Bar label="المقدمة" note={top} delay="0ms" />
      <Bar label="القلب" note={heart} delay="200ms" />
      <Bar label="القاعدة" note={base} delay="400ms" />
    </div>
  );
}
