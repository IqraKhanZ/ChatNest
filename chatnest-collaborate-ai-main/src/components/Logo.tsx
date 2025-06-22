
import React from "react";

const Logo = ({ size = 40 }: { size?: number }) => (
  <div className="flex items-center gap-3 select-none">
    <span
      style={{
        background: "linear-gradient(135deg, #AD4D5B 0%, #8E3A43 50%, #F4D6D6 100%)",
        WebkitBackgroundClip: "text",
        WebkitTextFillColor: "transparent",
        fontWeight: 700,
        fontSize: size,
        letterSpacing: "-0.02em",
        fontFamily: "'Inter', sans-serif",
      }}
      className="font-bold tracking-tight"
    >
      ChatNest
    </span>
    <div
      className="rounded-full"
      style={{
        width: size / 2.5,
        height: size / 2.5,
        background: "linear-gradient(135deg, #AD4D5B 0%, #8E3A43 50%, #F4D6D6 100%)",
        boxShadow: "0 0 20px rgba(173, 77, 91, 0.3)",
      }}
    />
  </div>
);

export default Logo;
