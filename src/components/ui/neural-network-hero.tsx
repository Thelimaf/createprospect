import { useRef, useEffect, useState } from 'react';
import { useGSAP } from '@gsap/react';
import gsap from 'gsap';

gsap.registerPlugin(useGSAP);

// ===================== Animated Background =====================
function AnimatedBackground() {
  const containerRef = useRef<HTMLDivElement>(null);

  useGSAP(
    () => {
      if (!containerRef.current) return;
      
      gsap.set(containerRef.current, {
        filter: 'blur(20px)',
        scale: 1.1,
        autoAlpha: 0.7
      });
      
      gsap.to(containerRef.current, {
        filter: 'blur(0px)',
        scale: 1,
        autoAlpha: 1,
        duration: 1.5,
        ease: 'power3.out',
        delay: 0.3
      });
    },
    { scope: containerRef }
  );

  return (
    <div 
      ref={containerRef}
      className="absolute inset-0 -z-10 overflow-hidden"
      style={{ willChange: 'transform, filter' }}
    >
      {/* Animated gradient orbs */}
      <div className="absolute -left-1/4 -top-1/4 h-[600px] w-[600px] animate-blob rounded-full bg-primary/30 mix-blend-multiply blur-3xl" />
      <div className="absolute -right-1/4 top-1/4 h-[500px] w-[500px] animate-blob animation-delay-2000 rounded-full bg-accent/30 mix-blend-multiply blur-3xl" />
      <div className="absolute -bottom-1/4 left-1/3 h-[550px] w-[550px] animate-blob animation-delay-4000 rounded-full bg-primary/20 mix-blend-multiply blur-3xl" />
      
      {/* Neural network grid pattern */}
      <div 
        className="absolute inset-0 opacity-20"
        style={{
          backgroundImage: `
            radial-gradient(circle at 1px 1px, hsl(var(--primary) / 0.3) 1px, transparent 0)
          `,
          backgroundSize: '40px 40px'
        }}
      />
      
      {/* Animated connection lines */}
      <svg className="absolute inset-0 h-full w-full opacity-10" xmlns="http://www.w3.org/2000/svg">
        <defs>
          <linearGradient id="lineGradient" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="hsl(var(--primary))" stopOpacity="0" />
            <stop offset="50%" stopColor="hsl(var(--primary))" stopOpacity="1" />
            <stop offset="100%" stopColor="hsl(var(--primary))" stopOpacity="0" />
          </linearGradient>
        </defs>
        <g className="animate-pulse">
          <line x1="10%" y1="20%" x2="30%" y2="40%" stroke="url(#lineGradient)" strokeWidth="1" />
          <line x1="30%" y1="40%" x2="50%" y2="30%" stroke="url(#lineGradient)" strokeWidth="1" />
          <line x1="50%" y1="30%" x2="70%" y2="50%" stroke="url(#lineGradient)" strokeWidth="1" />
          <line x1="70%" y1="50%" x2="90%" y2="35%" stroke="url(#lineGradient)" strokeWidth="1" />
          <line x1="20%" y1="60%" x2="40%" y2="70%" stroke="url(#lineGradient)" strokeWidth="1" />
          <line x1="40%" y1="70%" x2="60%" y2="60%" stroke="url(#lineGradient)" strokeWidth="1" />
          <line x1="60%" y1="60%" x2="80%" y2="75%" stroke="url(#lineGradient)" strokeWidth="1" />
        </g>
        <g className="animate-pulse" style={{ animationDelay: '1s' }}>
          <circle cx="10%" cy="20%" r="3" fill="hsl(var(--primary))" />
          <circle cx="30%" cy="40%" r="4" fill="hsl(var(--primary))" />
          <circle cx="50%" cy="30%" r="3" fill="hsl(var(--accent))" />
          <circle cx="70%" cy="50%" r="4" fill="hsl(var(--primary))" />
          <circle cx="90%" cy="35%" r="3" fill="hsl(var(--accent))" />
          <circle cx="20%" cy="60%" r="3" fill="hsl(var(--accent))" />
          <circle cx="40%" cy="70%" r="4" fill="hsl(var(--primary))" />
          <circle cx="60%" cy="60%" r="3" fill="hsl(var(--primary))" />
          <circle cx="80%" cy="75%" r="4" fill="hsl(var(--accent))" />
        </g>
      </svg>
      
      {/* Overlay gradient for better text readability */}
      <div className="absolute inset-0 bg-gradient-to-b from-background/80 via-background/50 to-background" />
    </div>
  );
}

// ===================== HERO =====================
interface HeroProps {
  title: string;
  titleHighlight?: string;
  description: string;
  badgeText?: string;
  badgeLabel?: string;
  ctaButtons?: Array<{ text: string; href: string; primary?: boolean }>;
  microDetails?: Array<string>;
}

export default function NeuralNetworkHero({
  title,
  titleHighlight,
  description,
  badgeText = "Generative Surfaces",
  badgeLabel = "New",
  ctaButtons = [
    { text: "Get started", href: "#get-started", primary: true },
    { text: "View showcase", href: "#showcase" }
  ],
  microDetails = ["Low-weight font", "Tight tracking", "Subtle motion"]
}: HeroProps) {
  const sectionRef = useRef<HTMLElement>(null);
  const headerRef = useRef<HTMLHeadingElement>(null);
  const paraRef = useRef<HTMLParagraphElement>(null);
  const ctaRef = useRef<HTMLDivElement>(null);
  const badgeRef = useRef<HTMLDivElement>(null);
  const microRef = useRef<HTMLDivElement>(null);

  useGSAP(
    () => {
      // Animate title words
      if (headerRef.current) {
        const titleSpans = headerRef.current.querySelectorAll('.animate-word');
        gsap.set(titleSpans, {
          filter: 'blur(16px)',
          yPercent: 30,
          autoAlpha: 0,
          scale: 1.06,
          transformOrigin: '50% 100%',
        });

        gsap.to(titleSpans, {
          filter: 'blur(0px)',
          yPercent: 0,
          autoAlpha: 1,
          scale: 1,
          duration: 0.9,
          stagger: 0.15,
          ease: 'power3.out',
          delay: 0.4,
        });
      }

      // Animate other elements
      if (badgeRef.current) {
        gsap.set(badgeRef.current, { autoAlpha: 0, y: -8 });
      }
      if (paraRef.current) {
        gsap.set(paraRef.current, { autoAlpha: 0, y: 8 });
      }
      if (ctaRef.current) {
        gsap.set(ctaRef.current, { autoAlpha: 0, y: 8 });
      }
      if (microRef.current) {
        const microItems = Array.from(microRef.current.children);
        gsap.set(microItems, { autoAlpha: 0, y: 6 });
      }

      const tl = gsap.timeline({
        defaults: { ease: 'power3.out' },
        delay: 0.2
      });

      if (badgeRef.current) {
        tl.to(badgeRef.current, { autoAlpha: 1, y: 0, duration: 0.5 }, 0.0);
      }

      if (paraRef.current) {
        tl.to(paraRef.current, { autoAlpha: 1, y: 0, duration: 0.5 }, 0.8);
      }
      
      if (ctaRef.current) {
        tl.to(ctaRef.current, { autoAlpha: 1, y: 0, duration: 0.5 }, 1.0);
      }
      
      if (microRef.current) {
        const microItems = Array.from(microRef.current.children);
        tl.to(microItems, { autoAlpha: 1, y: 0, duration: 0.5, stagger: 0.1 }, 1.2);
      }
    },
    { scope: sectionRef }
  );

  // Split title into words for animation
  const titleWords = title.split(' ');

  return (
    <section
      ref={sectionRef}
      className="relative flex min-h-[90vh] w-full flex-col items-center justify-center overflow-hidden px-6 py-24 pt-32"
    >
      <AnimatedBackground />

      <div className="relative z-10 mx-auto flex max-w-4xl flex-col items-center text-center">
        {/* Badge */}
        <div
          ref={badgeRef}
          className="mb-6 inline-flex items-center gap-2 rounded-full border border-border bg-secondary/50 px-4 py-2 text-sm backdrop-blur-sm"
        >
          <span className="rounded-full bg-primary px-2 py-0.5 text-xs font-medium text-primary-foreground">
            {badgeLabel}
          </span>
          <span className="text-muted-foreground">{badgeText}</span>
        </div>

        {/* Title */}
        <h1
          ref={headerRef}
          className="text-4xl font-bold leading-tight tracking-tight text-foreground sm:text-5xl md:text-6xl lg:text-7xl"
        >
          <span className="block">
            {titleWords.map((word, i) => (
              <span key={i} className="animate-word inline-block mr-[0.25em]">
                {word}
              </span>
            ))}
          </span>
          {titleHighlight && (
            <span className="block gradient-text">
              {titleHighlight.split(' ').map((word, i) => (
                <span key={i} className="animate-word inline-block mr-[0.25em]">
                  {word}
                </span>
              ))}
            </span>
          )}
        </h1>

        {/* Description */}
        <p
          ref={paraRef}
          className="mt-6 max-w-2xl text-lg text-muted-foreground md:text-xl"
        >
          {description}
        </p>

        {/* CTA Buttons */}
        <div ref={ctaRef} className="mt-10 flex flex-wrap justify-center gap-4">
          {ctaButtons.map((button, index) => (
            <a
              key={index}
              href={button.href}
              className={`inline-flex items-center justify-center rounded-lg px-6 py-3 text-sm font-medium transition-all duration-200 ${
                button.primary
                  ? 'bg-primary text-primary-foreground shadow-glow hover:bg-primary/90'
                  : 'border border-border bg-secondary/50 text-foreground backdrop-blur-sm hover:bg-secondary'
              }`}
            >
              {button.text}
            </a>
          ))}
        </div>

        {/* Micro Details */}
        <div
          ref={microRef}
          className="mt-12 flex flex-wrap justify-center gap-6 text-sm text-muted-foreground"
        >
          {microDetails.map((detail, index) => (
            <div key={index} className="flex items-center gap-2">
              <span className="h-1.5 w-1.5 rounded-full bg-primary" />
              <span>{detail}</span>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
