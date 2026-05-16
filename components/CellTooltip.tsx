"use client";

import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";

interface TipState {
  top: string;
  bot: string;
  x: number;
  y: number;
  placement: "top" | "bottom";
}

const MARGIN = 8;
const GAP = 8;

export function CellTooltip() {
  const [tip, setTip] = useState<TipState | null>(null);
  const [mounted, setMounted] = useState(false);
  const tipRef = useRef<HTMLDivElement | null>(null);
  const currentTargetRef = useRef<Element | null>(null);

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    function position(target: Element) {
      const top = target.getAttribute("data-tt-top");
      const bot = target.getAttribute("data-tt-bot") ?? "";
      if (!top) return;
      const rect = target.getBoundingClientRect();
      const tipEl = tipRef.current;
      const tipW = tipEl?.offsetWidth ?? 0;
      const tipH = tipEl?.offsetHeight ?? 0;
      const vw = window.innerWidth;
      const vh = window.innerHeight;

      let placement: "top" | "bottom" = "top";
      let y = rect.top - GAP - tipH;
      if (y < MARGIN) {
        placement = "bottom";
        y = rect.bottom + GAP;
      }
      // clamp vertically (rare with bottom placement and tiny viewport)
      if (y + tipH > vh - MARGIN) y = Math.max(MARGIN, vh - MARGIN - tipH);

      let x = rect.left + rect.width / 2 - tipW / 2;
      if (x < MARGIN) x = MARGIN;
      if (x + tipW > vw - MARGIN) x = vw - MARGIN - tipW;

      setTip({ top, bot, x, y, placement });
    }

    function onOver(e: MouseEvent) {
      const target = (e.target as Element | null)?.closest?.(
        "[data-tt-top]",
      );
      if (!target) return;
      currentTargetRef.current = target;
      position(target);
    }
    function onOut(e: MouseEvent) {
      const target = (e.target as Element | null)?.closest?.(
        "[data-tt-top]",
      );
      if (!target || target !== currentTargetRef.current) return;
      const related = e.relatedTarget as Element | null;
      if (related && target.contains(related)) return;
      currentTargetRef.current = null;
      setTip(null);
    }
    function onScroll() {
      if (currentTargetRef.current) {
        if (document.contains(currentTargetRef.current)) {
          position(currentTargetRef.current);
        } else {
          currentTargetRef.current = null;
          setTip(null);
        }
      }
    }

    document.addEventListener("mouseover", onOver);
    document.addEventListener("mouseout", onOut);
    window.addEventListener("scroll", onScroll, true);
    window.addEventListener("resize", onScroll);
    return () => {
      document.removeEventListener("mouseover", onOver);
      document.removeEventListener("mouseout", onOut);
      window.removeEventListener("scroll", onScroll, true);
      window.removeEventListener("resize", onScroll);
    };
  }, []);

  // Re-measure once tooltip element renders/changes content
  useEffect(() => {
    if (tip && currentTargetRef.current) {
      const target = currentTargetRef.current;
      const tipEl = tipRef.current;
      if (!tipEl) return;
      const rect = target.getBoundingClientRect();
      const tipW = tipEl.offsetWidth;
      const tipH = tipEl.offsetHeight;
      const vw = window.innerWidth;
      const vh = window.innerHeight;
      let placement: "top" | "bottom" = "top";
      let y = rect.top - GAP - tipH;
      if (y < MARGIN) {
        placement = "bottom";
        y = rect.bottom + GAP;
      }
      if (y + tipH > vh - MARGIN) y = Math.max(MARGIN, vh - MARGIN - tipH);
      let x = rect.left + rect.width / 2 - tipW / 2;
      if (x < MARGIN) x = MARGIN;
      if (x + tipW > vw - MARGIN) x = vw - MARGIN - tipW;
      if (
        x !== tip.x ||
        y !== tip.y ||
        placement !== tip.placement
      ) {
        setTip({ ...tip, x, y, placement });
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tip?.top, tip?.bot]);

  if (!mounted || !tip) return null;

  return createPortal(
    <div
      ref={tipRef}
      className={`cell-tooltip cell-tooltip--${tip.placement}`}
      style={{ left: tip.x, top: tip.y }}
      role="tooltip"
    >
      <div className="cell-tooltip__top">{tip.top}</div>
      {tip.bot && <div className="cell-tooltip__bot">{tip.bot}</div>}
    </div>,
    document.body,
  );
}
