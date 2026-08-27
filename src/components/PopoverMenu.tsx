import { AnimatePresence, MotionConfig, motion } from "framer-motion";
import type { ReactNode } from "react";

/**
 * Shared popover/dropdown shell with origin-aware entry + exit animation.
 *
 * Motion values follow the design-eng playbook:
 *  - Never scale from 0 — start at 0.95 with opacity so the popover
 *    reads as material that exists but is hidden, not something born
 *    out of nothing.
 *  - Transform origin sits at the trigger edge (top-left / top-right),
 *    never center — the menu grows from where the user clicked.
 *  - Enter is a strong ease-out at 180ms (fast, responsive); exit is
 *    snappier at 120ms so dismissal never feels sluggish.
 *  - A backdrop fades in/out at 120ms; the backdrop is transparent and
 *    only closes the menu on outside press.
 *  - prefers-reduced-motion: transform animation is skipped, opacity
 *    fades remain so the open/close state is still legible.
 */

const EASE_OUT = [0.23, 1, 0.32, 1] as const;

interface PopoverMenuProps {
  open: boolean;
  anchor: HTMLElement | null;
  onClose: () => void;
  children: ReactNode;
  /** Minimum menu width; defaults to the trigger width. */
  width?: number;
  /** Which edge of the trigger the menu should grow from. */
  align?: "left" | "right";
}

export function PopoverMenu({
  open,
  anchor,
  onClose,
  children,
  width,
  align = "left",
}: PopoverMenuProps) {
  return (
    <MotionConfig reducedMotion="user">
      <AnimatePresence>
        {open && anchor && (
          <motion.div
            key="popover-backdrop"
            className="popover-backdrop"
            onClick={onClose}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.12 }}
          />
        )}
        {open && anchor && (
          <PopoverContent
            key="popover-menu"
            anchor={anchor}
            width={width}
            align={align}
          >
            {children}
          </PopoverContent>
        )}
      </AnimatePresence>
    </MotionConfig>
  );
}

function PopoverContent({
  anchor,
  width,
  align,
  children,
}: {
  anchor: HTMLElement;
  width?: number;
  align: "left" | "right";
  children: ReactNode;
}) {
  const rect = anchor.getBoundingClientRect();
  return (
    <motion.div
      className="popover-menu"
      style={{
        position: "fixed",
        left: align === "left" ? rect.left : undefined,
        right: align === "right" ? window.innerWidth - rect.right : undefined,
        top: rect.bottom + 4,
        minWidth: width ?? rect.width,
        transformOrigin: align === "left" ? "top left" : "top right",
      }}
      initial={{ opacity: 0, scale: 0.95, y: -4 }}
      animate={{ opacity: 1, scale: 1, y: 0 }}
      exit={{
        opacity: 0,
        scale: 0.97,
        y: -2,
        transition: { duration: 0.12, ease: EASE_OUT },
      }}
      transition={{ duration: 0.18, ease: EASE_OUT }}
    >
      {children}
    </motion.div>
  );
}
