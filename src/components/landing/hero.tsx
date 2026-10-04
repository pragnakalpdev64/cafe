"use client";

import { ArrowRight, Leaf } from "lucide-react";
import { motion, useScroll, useTransform } from "motion/react";
import dynamic from "next/dynamic";
import Link from "next/link";
import { useCallback, useEffect, useRef, useState } from "react";
import type { PlaceLabel, SceneQuality, ToppingGroup } from "@/components/three/hero-scene";
import { LogoWordmark } from "@/components/brand/logo";
import { Button } from "@/components/ui/button";
import { BowlPoster } from "./bowl-poster";

const HeroScene = dynamic(() => import("@/components/three/hero-scene"), { ssr: false });

type Tier = SceneQuality | "off";

// Kept in sync with TOPPINGS in hero-scene (imported as a type only so three.js stays out of this chunk).
const LABELS: Pick<ToppingGroup, "label" | "value">[] = [
  { label: "Paneer", value: "+12 g protein" },
  { label: "Chickpeas & corn", value: "+7 g protein" },
  { label: "Cherry tomatoes", value: "Vitamin C" },
  { label: "Cucumber & avocado", value: "Fresh crunch" },
];

function pickTier(): Tier {
  if (typeof window === "undefined") return "off";
  if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return "off";
  const nav = navigator as Navigator & { connection?: { saveData?: boolean }; deviceMemory?: number };
  if (nav.connection?.saveData) return "off";
  const canvas = document.createElement("canvas");
  if (!canvas.getContext("webgl2") && !canvas.getContext("webgl")) return "off";
  const cores = nav.hardwareConcurrency ?? 4;
  const memory = nav.deviceMemory ?? 4;
  return cores <= 4 || memory <= 3 ? "low" : "high";
}

type HeroProps = {
  pick: { name: string; protein: number; kcal: number };
};

export function Hero({ pick }: HeroProps) {
  const sectionRef = useRef<HTMLElement>(null);
  const { scrollYProgress } = useScroll({ target: sectionRef, offset: ["start start", "end end"] });
  const [tier, setTier] = useState<Tier | null>(null);
  const [active, setActive] = useState(true);
  const [sceneReady, setSceneReady] = useState(false);
  const labelRefs = useRef<(HTMLDivElement | null)[]>([]);

  const placeLabel = useCallback<PlaceLabel>((index, x, y, visibility) => {
    const el = labelRefs.current[index];
    if (!el) return;
    // keep labels on screen on narrow phones
    const half = el.offsetWidth / 2 + 8;
    const clampedX = Math.min(Math.max(x, half), window.innerWidth - half);
    el.style.opacity = String(visibility);
    el.style.transform = `translate3d(${clampedX}px, ${y}px, 0) translate(-50%, -50%)`;
  }, []);

  // Mount WebGL only after the first paint so the poster is the LCP element.
  useEffect(() => {
    const run = () => setTier(pickTier());
    if ("requestIdleCallback" in window) {
      const id = window.requestIdleCallback(run, { timeout: 1200 });
      return () => window.cancelIdleCallback(id);
    }
    const id = setTimeout(run, 300);
    return () => clearTimeout(id);
  }, []);

  // Stop rendering when the hero is off-screen.
  useEffect(() => {
    const el = sectionRef.current;
    if (!el) return;
    const io = new IntersectionObserver(([entry]) => setActive(entry.isIntersecting), { rootMargin: "100px" });
    io.observe(el);
    return () => io.disconnect();
  }, []);


  const introOpacity = useTransform(scrollYProgress, [0, 0.3], [1, 0]);
  const introY = useTransform(scrollYProgress, [0, 0.3], [0, -40]);
  const storyOpacity = useTransform(scrollYProgress, [0.45, 0.62, 0.92, 1], [0, 1, 1, 0.9]);
  const storyY = useTransform(scrollYProgress, [0.45, 0.62], [40, 0]);
  const cueOpacity = useTransform(scrollYProgress, [0, 0.08], [1, 0]);

  const showCanvas = tier === "high" || tier === "low";

  return (
    <section ref={sectionRef} className="relative h-[240svh] bg-background text-foreground">
      <div className="sticky top-0 h-svh overflow-hidden">
        {/* fresh studio backdrop: green and orange light washes, like the logo */}
        <div
          aria-hidden
          className="absolute inset-0 opacity-90 dark:opacity-60"
          style={{
            background:
              "radial-gradient(55% 55% at 74% 58%, rgba(255,169,51,0.30), transparent 70%), radial-gradient(45% 45% at 12% 12%, rgba(34,197,94,0.22), transparent 70%), radial-gradient(35% 35% at 95% 5%, rgba(21,128,61,0.18), transparent 70%)",
          }}
        />
        <div
          aria-hidden
          className="absolute inset-0 opacity-[0.05] mix-blend-multiply dark:mix-blend-overlay"
          style={{
            backgroundImage:
              "url(\"data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='120' height='120'%3E%3Cfilter id='n'%3E%3CfeTurbulence baseFrequency='0.9' numOctaves='2'/%3E%3C/filter%3E%3Crect width='120' height='120' filter='url(%23n)'/%3E%3C/svg%3E\")",
          }}
        />

        <div
          className={`absolute inset-0 transition-opacity duration-700 ${sceneReady ? "opacity-0" : "opacity-100"}`}
        >
          <BowlPoster />
        </div>
        {showCanvas && (
          <div
            className={`absolute inset-0 transition-opacity duration-700 ${sceneReady ? "opacity-100" : "opacity-0"}`}
          >
            <HeroScene progress={scrollYProgress} quality={tier} active={active} placeLabel={placeLabel} onReady={() => setSceneReady(true)} />
            <div className="pointer-events-none absolute inset-0 z-10" aria-hidden>
              {LABELS.map((l, i) => (
                <div
                  key={l.label}
                  ref={(el) => {
                    labelRefs.current[i] = el;
                  }}
                  className="absolute top-0 left-0 rounded-full border border-white/60 bg-white/85 px-3 py-1 text-xs whitespace-nowrap text-hh-ink shadow-lg shadow-hh-green-deep/15 backdrop-blur-md will-change-transform dark:border-white/10 dark:bg-hh-ink/80 dark:text-white"
                  style={{ opacity: 0 }}
                >
                  <span className="font-semibold">{l.label}</span>
                  <span className="tabular ml-2 text-brand-text">{l.value}</span>
                </div>
              ))}
            </div>
          </div>
        )}

        <div className="relative mx-auto flex h-full max-w-6xl flex-col px-5 pt-24 md:justify-center md:pt-0">
          <motion.div style={{ opacity: introOpacity, y: introY }} className="max-w-xl">
            <p className="mb-5 inline-flex items-center gap-2 rounded-full border border-hh-green/20 bg-hh-green/10 px-3 py-1 text-xs font-semibold tracking-wide text-secondary-foreground uppercase backdrop-blur">
              <Leaf className="size-3.5" aria-hidden /> 100% vegetarian café
            </p>
            <h1>
              <LogoWordmark priority className="h-auto w-[min(88vw,24rem)] lg:w-[30rem] drop-shadow-[0_10px_18px_rgba(21,128,61,0.18)]" />
            </h1>
            <p className="mt-5 max-w-md text-lg text-pretty text-muted-foreground md:text-xl">
              Protein from real food. Salads, chaats, sandwiches and oats bowls made fresh every day.
            </p>
            <div className="mt-8 flex flex-wrap gap-3">
              <Button
                asChild
                size="lg"
                className="h-12 rounded-full bg-cta px-6 text-base font-semibold text-cta-foreground shadow-lg shadow-hh-orange/30 hover:bg-hh-orange-light"
              >
                <Link href="/menu">
                  View menu <ArrowRight data-icon="inline-end" />
                </Link>
              </Button>
              <Button
                asChild
                size="lg"
                variant="outline"
                className="h-12 rounded-full border-hh-green/30 bg-transparent px-6 text-base text-secondary-foreground hover:bg-hh-green/10"
              >
                <a href="#visit">Visit us</a>
              </Button>
            </div>
          </motion.div>

          <motion.div
            style={{ opacity: storyOpacity, y: storyY }}
            className="pointer-events-none absolute inset-x-5 top-24 max-w-md md:top-1/2 md:-translate-y-1/2"
          >
            <p className="tagline text-xs text-hh-green dark:text-hh-green-light">Today&apos;s pick, unpacked</p>
            <h2 className="mt-3 text-4xl font-bold text-balance md:text-5xl">{pick.name}</h2>
            <dl className="mt-6 flex gap-8">
              <div>
                <dt className="text-xs text-muted-foreground uppercase">Protein</dt>
                <dd className="tabular text-3xl font-semibold text-hh-green dark:text-hh-green-light">{pick.protein} g</dd>
              </div>
              <div>
                <dt className="text-xs text-muted-foreground uppercase">Energy</dt>
                <dd className="tabular text-3xl font-semibold text-brand-text">{pick.kcal} kcal</dd>
              </div>
            </dl>
            <p className="mt-4 text-sm text-muted-foreground">Every gram comes from the bowl, not a powder tub.</p>
          </motion.div>
        </div>

        <motion.div
          style={{ opacity: cueOpacity }}
          className="absolute bottom-6 left-1/2 flex -translate-x-1/2 flex-col items-center gap-2 text-xs text-muted-foreground"
          aria-hidden
        >
          Scroll to unpack the salad
          <span className="h-8 w-px animate-pulse bg-hh-green/50" />
        </motion.div>
      </div>
    </section>
  );
}
