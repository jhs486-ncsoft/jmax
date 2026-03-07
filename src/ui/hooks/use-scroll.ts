// useScroll hook - Manual scroll state management for message history
// Supports PgUp/PgDn/Home/End navigation

import { useState, useCallback, useEffect, useMemo, useRef } from "react";

export interface ScrollState {
  /** Current scroll offset (line index of top visible line) */
  offset: number;
  /** Total number of content lines */
  totalLines: number;
  /** Number of visible lines in the viewport */
  viewportHeight: number;
  /** Whether the view is scrolled to the bottom */
  isAtBottom: boolean;
}

export interface UseScrollOptions {
  /** Total number of content lines */
  totalLines: number;
  /** Number of visible lines in the viewport */
  viewportHeight: number;
  /** Auto-scroll to bottom when new content is added */
  autoScroll?: boolean;
}

export interface UseScrollResult {
  state: ScrollState;
  scrollUp: (lines?: number) => void;
  scrollDown: (lines?: number) => void;
  scrollToTop: () => void;
  scrollToBottom: () => void;
  pageUp: () => void;
  pageDown: () => void;
}

export function useScroll(options: UseScrollOptions): UseScrollResult {
  const { totalLines, viewportHeight, autoScroll = true } = options;
  const [offset, setOffset] = useState(0);
  const userScrolledRef = useRef(false);

  const maxOffset = Math.max(0, totalLines - viewportHeight);

  // Clamp offset to valid range
  const clampOffset = useCallback(
    (o: number) => Math.max(0, Math.min(o, maxOffset)),
    [maxOffset]
  );

  // Clamp current offset if maxOffset shrunk (e.g., messages cleared)
  const clampedOffset = Math.min(offset, maxOffset);
  if (clampedOffset !== offset) {
    // Synchronous correction — avoid an extra render cycle
    setOffset(clampedOffset);
  }

  const isAtBottom = clampedOffset >= maxOffset;

  // Auto-scroll to bottom when totalLines changes (if user hasn't scrolled up)
  const prevTotalLinesRef = useRef(totalLines);
  useEffect(() => {
    if (totalLines !== prevTotalLinesRef.current) {
      prevTotalLinesRef.current = totalLines;
      if (autoScroll && !userScrolledRef.current) {
        setOffset(maxOffset);
      }
    }
  }, [totalLines, maxOffset, autoScroll]);

  const scrollUp = useCallback(
    (lines = 1) => {
      userScrolledRef.current = true;
      setOffset((prev) => clampOffset(prev - lines));
    },
    [clampOffset]
  );

  const scrollDown = useCallback(
    (lines = 1) => {
      setOffset((prev) => {
        const next = clampOffset(prev + lines);
        if (next >= maxOffset) userScrolledRef.current = false;
        return next;
      });
    },
    [clampOffset, maxOffset]
  );

  const scrollToTop = useCallback(() => {
    userScrolledRef.current = true;
    setOffset(0);
  }, []);

  const scrollToBottom = useCallback(() => {
    userScrolledRef.current = false;
    setOffset(maxOffset);
  }, [maxOffset]);

  const pageUp = useCallback(() => {
    scrollUp(Math.max(1, viewportHeight - 2));
  }, [scrollUp, viewportHeight]);

  const pageDown = useCallback(() => {
    scrollDown(Math.max(1, viewportHeight - 2));
  }, [scrollDown, viewportHeight]);

  // Memoize the state object to avoid new reference on every render
  const state = useMemo<ScrollState>(
    () => ({
      offset: clampedOffset,
      totalLines,
      viewportHeight,
      isAtBottom,
    }),
    [clampedOffset, totalLines, viewportHeight, isAtBottom]
  );

  // ANTI-FLICKER: Memoize the return object so parent components that
  // destructure the result don't trigger re-renders from a new object reference.
  return useMemo(() => ({
    state,
    scrollUp,
    scrollDown,
    scrollToTop,
    scrollToBottom,
    pageUp,
    pageDown,
  }), [state, scrollUp, scrollDown, scrollToTop, scrollToBottom, pageUp, pageDown]);
}
