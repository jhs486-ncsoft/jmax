// useScroll hook - Manual scroll state management for message history
// Supports PgUp/PgDn/Home/End navigation

import { useState, useCallback, useEffect } from "react";

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
  setTotalLines: (n: number) => void;
}

export function useScroll(options: UseScrollOptions): UseScrollResult {
  const { viewportHeight, autoScroll = true } = options;
  const [totalLines, setTotalLines] = useState(options.totalLines);
  const [offset, setOffset] = useState(0);
  const [userScrolled, setUserScrolled] = useState(false);

  const maxOffset = Math.max(0, totalLines - viewportHeight);

  // Clamp offset to valid range
  const clampOffset = useCallback(
    (o: number) => Math.max(0, Math.min(o, maxOffset)),
    [maxOffset]
  );

  const isAtBottom = offset >= maxOffset;

  // Auto-scroll to bottom when new content arrives (if user hasn't scrolled up)
  useEffect(() => {
    if (autoScroll && !userScrolled) {
      setOffset(maxOffset);
    }
  }, [totalLines, maxOffset, autoScroll, userScrolled]);

  const scrollUp = useCallback(
    (lines = 1) => {
      setUserScrolled(true);
      setOffset((prev) => clampOffset(prev - lines));
    },
    [clampOffset]
  );

  const scrollDown = useCallback(
    (lines = 1) => {
      setOffset((prev) => {
        const next = clampOffset(prev + lines);
        if (next >= maxOffset) setUserScrolled(false);
        return next;
      });
    },
    [clampOffset, maxOffset]
  );

  const scrollToTop = useCallback(() => {
    setUserScrolled(true);
    setOffset(0);
  }, []);

  const scrollToBottom = useCallback(() => {
    setUserScrolled(false);
    setOffset(maxOffset);
  }, [maxOffset]);

  const pageUp = useCallback(() => {
    scrollUp(Math.max(1, viewportHeight - 2));
  }, [scrollUp, viewportHeight]);

  const pageDown = useCallback(() => {
    scrollDown(Math.max(1, viewportHeight - 2));
  }, [scrollDown, viewportHeight]);

  return {
    state: {
      offset,
      totalLines,
      viewportHeight,
      isAtBottom,
    },
    scrollUp,
    scrollDown,
    scrollToTop,
    scrollToBottom,
    pageUp,
    pageDown,
    setTotalLines,
  };
}
