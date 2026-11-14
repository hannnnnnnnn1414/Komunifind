"use client";

import {
  motion,
  useMotionValue,
  useReducedMotion,
  useScroll,
  useSpring,
  useTransform,
  type MotionValue,
} from "framer-motion";
import { useEffect, useRef, useState } from "react";
import styles from "./PerspectiveTunnelHero.module.css";

export type TunnelItem = {
  src: string;
  title: string;
  href: string;
};

type Stage = {
  width: number;
  height: number;
  isMobile: boolean;
};

const SPRING = { stiffness: 70, damping: 26, mass: 0.5 };

function useStage(): Stage {
  const [stage, setStage] = useState<Stage>({ width: 1440, height: 900, isMobile: false });

  useEffect(() => {
    const update = () =>
      setStage({
        width: window.innerWidth,
        height: window.innerHeight,
        isMobile: window.innerWidth < 768,
      });
    update();
    window.addEventListener("resize", update);
    return () => window.removeEventListener("resize", update);
  }, []);

  return stage;
}

function usePointerParallax(enabled: boolean) {
  const rawX = useMotionValue(0);
  const rawY = useMotionValue(0);
  const x = useSpring(rawX, SPRING);
  const y = useSpring(rawY, SPRING);

  useEffect(() => {
    if (!enabled) return;
    const onMove = (event: PointerEvent) => {
      rawX.set(event.clientX / window.innerWidth - 0.5);
      rawY.set(event.clientY / window.innerHeight - 0.5);
    };
    window.addEventListener("pointermove", onMove, { passive: true });
    return () => window.removeEventListener("pointermove", onMove);
  }, [enabled, rawX, rawY]);

  return { x, y };
}

type TunnelCardProps = {
  item: TunnelItem;
  index: number;
  total: number;
  progress: MotionValue<number>;
  pointer: { x: MotionValue<number>; y: MotionValue<number> };
  stage: Stage;
};

function TunnelCard({ item, index, total, progress, pointer, stage }: TunnelCardProps) {
  const goldenAngle = index * 137.5 * (Math.PI / 180);
  const radiusX = 0.26 + (index % 3) * 0.09;
  const radiusY = 0.24 + (index % 2) * 0.1;
  const rotate = (index % 2 === 0 ? 1 : -1) * (3 + (index % 5) * 2);

  const staggerSpan = 0.55;
  const start = (index / total) * (1 - staggerSpan);
  const end = start + staggerSpan;

  const local = useTransform(progress, [start, end], [0, 1]);
  const farZ = stage.isMobile ? -1100 : -1600;
  const nearZ = stage.isMobile ? 320 : 480;
  const z = useTransform(local, [0, 1], [farZ, nearZ]);
  const opacity = useTransform(local, [0, 0.16, 0.84, 0.99], [0, 1, 1, 0]);

  const width = stage.isMobile
    ? Math.max(120, Math.min(170, stage.width * 0.36))
    : Math.max(170, Math.min(250, stage.width * 0.16));

  const baseX = Math.cos(goldenAngle) * (stage.width * radiusX);
  const baseY = Math.sin(goldenAngle) * (stage.height * radiusY);
  const pan = stage.isMobile ? 18 : 60;

  const transform = useTransform([z, pointer.x, pointer.y], ([currZ, px, py]: number[]) => {
    const offsetX = baseX - px * pan;
    const offsetY = baseY - py * pan;
    return `translate3d(calc(-50% + ${offsetX}px), calc(-50% + ${offsetY}px), ${currZ}px) rotateZ(${rotate}deg)`;
  });

  return (
    <motion.a
      href={item.href}
      aria-label={`Lihat komunitas ${item.title}`}
      className={styles.card}
      style={{ width, transform, opacity, zIndex: index + 1 }}
    >
      <div className={styles.cardInner}>
        <img src={item.src} alt={item.title} draggable={false} loading={index < 3 ? "eager" : "lazy"} />
        <div className={styles.cardCaption}>
          <span>{item.title}</span>
        </div>
      </div>
    </motion.a>
  );
}

type Props = {
  items: TunnelItem[];
};

export function PerspectiveTunnelHero({ items }: Props) {
  const wrapRef = useRef<HTMLDivElement>(null);
  const stage = useStage();
  const reduce = useReducedMotion();
  const pointer = usePointerParallax(!reduce);

  const { scrollYProgress } = useScroll({
    target: wrapRef,
    offset: ["start start", "end end"],
  });
  const smooth = useSpring(scrollYProgress, { stiffness: 80, damping: 30, restDelta: 0.0001 });
  const progress = useTransform(smooth, [0, 1], [0.16, 1]);

  const titleScale = useTransform(progress, [0, 0.55, 1], [0.86, 1, 1.22]);
  const titleOpacity = useTransform(progress, [0, 0.1, 1], [0.6, 1, 1]);


  if (reduce) {
    return (
      <section className={styles.staticWrap} aria-label="Komunitas pilihan">
        <div className={styles.staticInner}>
          <h1 className={styles.staticTitle}>
            Find Your
            <br />
            Community
          </h1>
          <div className={styles.staticStrip}>
            {items.map((item) => (
              <a key={item.href} href={item.href} className={styles.staticCard}>
                <img src={item.src} alt={item.title} />
                <span>{item.title}</span>
              </a>
            ))}
          </div>
        </div>
      </section>
    );
  }

  return (
    <div ref={wrapRef} className={styles.wrap}>
      <div
        className={styles.stage}
        style={{ perspective: stage.isMobile ? "900px" : "1200px" }}
      >
        <div className={styles.dots} aria-hidden="true" />
        <div className={styles.glow} aria-hidden="true" />
        <div className={styles.ringOuter} aria-hidden="true" />
        <div className={styles.ringInner} aria-hidden="true" />

        <motion.div style={{ scale: titleScale, opacity: titleOpacity }} className={styles.titleBlock}>
          <h1 className={styles.title}>
            Find Your
            <br />
            Community
          </h1>
        </motion.div>

        <div className={styles.plane}>
          {items.map((item, index) => (
            <TunnelCard
              key={item.href}
              item={item}
              index={index}
              total={items.length}
              progress={progress}
              pointer={pointer}
              stage={stage}
            />
          ))}
        </div>
      </div>
    </div>
  );
}

export default PerspectiveTunnelHero;
