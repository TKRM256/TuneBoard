/** ランディングページのアニメーションの部品。OS で「動きを減らす」を選んでいる人には動かさない。 */
import type { ReactNode } from 'react';
import { motion, useReducedMotion } from 'framer-motion';

const EASE = [0.22, 1, 0.36, 1] as const;

interface RevealProps {
  children: ReactNode;
  /** 表示を遅らせる秒数 */
  delay?: number;
  /** 下からせり上がる距離（px） */
  distance?: number;
  className?: string;
  /** true なら、スクロールを待たず最初から表示する */
  immediate?: boolean;
}

/** 見えたときに 1 度だけ、下から現れる。 */
export function Reveal({ children, delay = 0, distance = 24, className, immediate = false }: RevealProps) {
  const reduced = useReducedMotion();
  if (reduced) return <div className={className}>{children}</div>;
  const initial = { opacity: 0, y: distance };
  const shown = { opacity: 1, y: 0 };
  const transition = { duration: 0.7, delay, ease: EASE };
  return immediate ? (
    <motion.div className={className} initial={initial} animate={shown} transition={transition}>{children}</motion.div>
  ) : (
    <motion.div className={className} initial={initial} whileInView={shown} viewport={{ once: true, margin: '-80px' }} transition={transition}>
      {children}
    </motion.div>
  );
}

/** 図の中の印が、順に付く（ポンと現れる）。delay は秒。 */
export function Pop({ children, delay = 0, className }: { children: ReactNode; delay?: number; className?: string }) {
  const reduced = useReducedMotion();
  if (reduced) return <span className={className}>{children}</span>;
  return (
    <motion.span
      className={className}
      initial={{ opacity: 0, scale: 0.2 }}
      whileInView={{ opacity: 1, scale: 1 }}
      viewport={{ once: true }}
      transition={{ type: 'spring', stiffness: 420, damping: 16, delay }}
      style={{ display: 'inline-block' }}
    >
      {children}
    </motion.span>
  );
}

/** 図の中の行や箱が、順に現れる。 */
export function Item({ children, index, className }: { children: ReactNode; index: number; className?: string }) {
  const reduced = useReducedMotion();
  if (reduced) return <div className={className}>{children}</div>;
  return (
    <motion.div
      className={className}
      initial={{ opacity: 0, x: -14 }}
      whileInView={{ opacity: 1, x: 0 }}
      viewport={{ once: true }}
      transition={{ duration: 0.5, delay: 0.1 + index * 0.12, ease: EASE }}
    >
      {children}
    </motion.div>
  );
}

/** 文字のまわりを、丸で囲んでいく（線を引くように描く）。最初の表示のときだけ動く。 */
export function CircleDraw({ children, delay = 0, className }: { children: ReactNode; delay?: number; className?: string }) {
  const reduced = useReducedMotion();
  return (
    <span className={`relative inline-block px-2 ${className ?? ''}`}>
      {children}
      <svg aria-hidden viewBox="0 0 100 40" preserveAspectRatio="none" className="pointer-events-none absolute -inset-x-0.5 -inset-y-0.5 size-[calc(100%+4px)] overflow-visible">
        <motion.ellipse
          cx="50"
          cy="20"
          rx="48"
          ry="18"
          fill="none"
          stroke="#ef4444"
          strokeWidth="2"
          vectorEffect="non-scaling-stroke"
          strokeLinecap="round"
          initial={reduced ? false : { pathLength: 0 }}
          whileInView={{ pathLength: 1 }}
          viewport={{ once: true }}
          transition={{ duration: 0.7, delay, ease: 'easeInOut' }}
        />
      </svg>
    </span>
  );
}
