// useModelSelector hook - Manages model list navigation and selection
// Hardcoded model list for GitHub Copilot API compatible models

import { useState, useCallback } from "react";
import type { AgentCore } from "../../agent/agent-core.js";

/** Available models via GitHub Copilot API */
export const AVAILABLE_MODELS = [
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
  models: ModelInfo[];
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

  return {
    models: [...AVAILABLE_MODELS],
    selectedIndex,
    activeModel,
    moveUp,
    moveDown,
    confirm,
  };
}
