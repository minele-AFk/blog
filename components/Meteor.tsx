"use client";

import { useEffect, useState } from 'react';

interface Meteor {
  id: number;
  top: string;
  left: string;
  size: number;
  duration: number;
  delay: number;
}

export default function Meteor() {
  const [meteors, setMeteors] = useState<Meteor[]>([]);

  useEffect(() => {
    const generated = Array.from({ length: 15 }).map((_, i) => ({
      id: i,
      top: `${Math.random() * 50}%`,
      left: `${Math.random() * 100}%`,
      size: 2 + Math.random() * 3,
      duration: 1 + Math.random() * 2,
      delay: Math.random() * -10,
    }));
    setMeteors(generated);
  }, []);

  return (
    <div className="fixed inset-0 w-full h-full pointer-events-none z-10 overflow-hidden">
      <style>{`
        @keyframes meteorFall {
          0% {
            transform: translate(0, 0) rotate(-45deg);
            opacity: 1;
          }
          70% {
            opacity: 1;
          }
          100% {
            transform: translate(-30vw, 60vh) rotate(-45deg);
            opacity: 0;
          }
        }
        @keyframes meteorTail {
          0% { opacity: 0; }
          20% { opacity: 1; }
          100% { opacity: 0; }
        }
      `}</style>

      {meteors.map(m => (
        <div
          key={m.id}
          className="absolute"
          style={{
            top: m.top,
            left: m.left,
            width: `${m.size}px`,
            height: `${m.size}px`,
            backgroundColor: '#fff',
            borderRadius: '50%',
            boxShadow: '0 0 10px 2px rgba(255, 255, 255, 0.8), 0 0 20px 4px rgba(100, 150, 255, 0.4)',
            animation: `meteorFall ${m.duration}s linear infinite`,
            animationDelay: `${m.delay}s`,
          }}
        >
          {/* 流星拖尾 - 在流星右上方（运动反方向） */}
          <div
            style={{
              position: 'absolute',
              top: '50%',
              left: '100%',
              width: '80px',
              height: '2px',
              background: 'linear-gradient(to right, rgba(255,255,255,0.8), transparent)',
              transform: 'translateY(-50%)',
              animation: `meteorTail ${m.duration}s linear infinite`,
              animationDelay: `${m.delay}s`,
            }}
          />
        </div>
      ))}
    </div>
  );
}
