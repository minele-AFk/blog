"use client";

import { useEffect, useState } from 'react';

interface Petal {
  id: number;
  left: string;
  size: number;
  duration: number;
  delay: number;
}

export default function Sakura() {
  const [petals, setPetals] = useState<Petal[]>([]);

  useEffect(() => {
    const generated = Array.from({ length: 35 }).map((_, i) => ({
      id: i,
      left: `${Math.random() * 100}%`,
      size: 8 + Math.random() * 12,
      duration: 6 + Math.random() * 8,
      delay: Math.random() * -15,
    }));
    setPetals(generated);
  }, []);

  return (
    <div className="fixed inset-0 w-full h-full pointer-events-none z-10 overflow-hidden">
      <style>{`
        @keyframes sakuraFall {
          0% { transform: translate(0, -10vh) rotate(0deg); opacity: 0; }
          10% { opacity: 1; }
          80% { opacity: 1; }
          100% { transform: translate(15vw, 110vh) rotate(360deg); opacity: 0; }
        }
      `}</style>

      {petals.map(p => (
        <div
          key={p.id}
          className="absolute top-0 shadow-[0_0_6px_rgba(255,182,193,0.8)]"
            style={{
              background: 'linear-gradient(135deg, #fda4af 0%, #f9a8d4 100%)',
              left: p.left,
            width: `${p.size}px`,
            height: `${p.size * 1.2}px`,
            borderRadius: '100% 0 100% 0',
            animation: `sakuraFall ${p.duration}s linear infinite`,
            animationDelay: `${p.delay}s`,
          }}
        />
      ))}
    </div>
  );
}
