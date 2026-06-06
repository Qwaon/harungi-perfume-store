'use client';

import { MotionConfig } from 'framer-motion';
import { ReactNode } from 'react';

/** Client wrapper so framer-motion's MotionConfig isn't imported into the
 *  server-rendered root layout (which breaks vendor-chunk resolution in dev).
 *  reducedMotion="user" makes all motion respect prefers-reduced-motion. */
export default function MotionProvider({ children }: { children: ReactNode }) {
  return <MotionConfig reducedMotion="user">{children}</MotionConfig>;
}
