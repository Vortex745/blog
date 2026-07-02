import { useLayoutEffect } from "react";
import { playHeroOpening } from "../scripts/hero-opening";

interface HeroOpeningProps {
  title: string;
}

function renderChars(title: string) {
  return title.split("").map((char, index) => (
    <span
      key={index}
      className="hero-opening__char"
      aria-hidden="true"
      style={{ display: "inline-block" }}
    >
      {char === " " ? "\u00A0" : char}
    </span>
  ));
}

export function HeroOpening({ title }: HeroOpeningProps) {
  useLayoutEffect(() => {
    const cleanup = playHeroOpening({ title });
    return () => {
      cleanup();
    };
  }, [title]);

  return (
    <div className="hero-opening" data-hero-opening aria-hidden="true">
      <h1 className="hero-opening__title">{renderChars(title)}</h1>
    </div>
  );
}
