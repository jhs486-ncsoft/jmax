// useModelSelector hook - Manages model list navigation and selection
// Hardcoded model list for GitHub Copilot API compatible models
//
// ANTI-FLICKER: Returns a stable array reference (never re-created) and
// memoized callbacks so that React.memo() on Sidebar is effective.

import { useState, useCallback, useMemo } from "react";
import type { AgentCore } from "../../agent/agent-core.js";

/** Available models via GitHub Copilot API */
export const AVAILABLE_MODELS: readonly ModelInfo[] = [
  { id: "gpt-4o", label: "GPT-4o", provider: "OpenAI" },
  { id: "gpt-4o-mini", label: "GPT-4o Mini", provider: "OpenAI" },
  { id: "claude-sonnet-4", label: "Claude Sonnet 4", provider: "Anthropic" },
  { id: "claude-3.5-sonnet", label: "Claude 3.5 Sonnet", provider: "Anthropic" },
  { id: "o3-mini", label: "o3-mini", provider: "OpenAI" },
] as const;

export interface ModelInfo {
  id: string;
  label: string;
  provider: string;
}

export interface UseModelSelectorResult {
  /** Stable reference — never changes between renders */
  models: readonly ModelInfo[];
  selectedIndex: number;
  activeModel: string;
  moveUp: () => void;
  moveDown: () => void;
  confirm: () => void;
}

export function useModelSelector(agent: AgentCore): UseModelSelectorResult {
  const [activeModel, setActiveModel] = useState<string>(agent.getModel());

  // selectedIndex tracks the cursor position in the model list
  const initialIndex = AVAILABLE_MODELS.findIndex((m) => m.id === activeModel);
  const [selectedIndex, setSelectedIndex] = useState(
    initialIndex >= 0 ? initialIndex : 0
  );

  const moveUp = useCallback(() => {
    setSelectedIndex((prev) => (prev > 0 ? prev - 1 : AVAILABLE_MODELS.length - 1));
  }, []);

  const moveDown = useCallback(() => {
    setSelectedIndex((prev) => (prev < AVAILABLE_MODELS.length - 1 ? prev + 1 : 0));
  }, []);

  const confirm = useCallback(() => {
    const model = AVAILABLE_MODELS[selectedIndex];
    if (model && model.id !== activeModel) {
      agent.setModel(model.id);
      setActiveModel(model.id);
    }
  }, [agent, selectedIndex, activeModel]);

  // ANTI-FLICKER: Return the module-level constant directly — same reference every render.
  // Never use [...AVAILABLE_MODELS] which creates a new array and breaks React.memo.
  return useMemo(() => ({
    models: AVAILABLE_MODELS,
    selectedIndex,
    activeModel,
    moveUp,
    moveDown,
    confirm,
  }), [selectedIndex, activeModel, moveUp, moveDown, confirm]);
}
