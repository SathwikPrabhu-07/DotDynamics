import React from "react";

interface RainbowBorderProps {
    children: React.ReactNode;
    className?: string;
}

export const RainbowBorder: React.FC<RainbowBorderProps> = ({ children, className = "" }) => {
    return (
        <div className={`rainbow-border-wrap ${className}`}>
            {children}

            <style>{`
        .rainbow-border-wrap {
          position: relative;
          border-radius: 16px;
          padding: 2px;
          isolation: isolate;
        }
        .rainbow-border-wrap::before,
        .rainbow-border-wrap::after {
          content: '';
          position: absolute;
          inset: 0;
          border-radius: 16px;
          background: linear-gradient(
            45deg,
            #fb0094,
            #0000ff,
            #00ff00,
            #ffff00,
            #ff0000,
            #fb0094,
            #0000ff,
            #00ff00,
            #ffff00,
            #ff0000
          );
          background-size: 400%;
          z-index: -1;
          animation: rainbow-rotate 20s linear infinite;
        }
        .rainbow-border-wrap::after {
          filter: blur(40px);
          opacity: 0.5;
        }
        .rainbow-border-wrap > *:first-child {
          position: relative;
          z-index: 1;
          border-radius: 14px;
        }
        @keyframes rainbow-rotate {
          0% { background-position: 0 0; }
          50% { background-position: 400% 0; }
          100% { background-position: 0 0; }
        }
      `}</style>
        </div>
    );
};

export default RainbowBorder;
