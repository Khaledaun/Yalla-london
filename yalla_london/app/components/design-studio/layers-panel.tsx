"use client";

import React from "react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Type,
  Square,
  Image as ImageIcon,
  Minus,
  Eye,
  EyeOff,
  Lock,
  Unlock,
  Trash2,
  ChevronUp,
  ChevronDown,
} from "lucide-react";
import type { CanvasActions, CanvasState } from "./design-canvas";
import type { DesignElement } from "@/lib/pdf/brand-design-system";

interface LayersPanelProps {
  state: CanvasState | null;
  actions: CanvasActions | null;
}

const TYPE_ICONS: Record<string, React.ReactNode> = {
  text: <Type className="w-3 h-3" />,
  shape: <Square className="w-3 h-3" />,
  image: <ImageIcon className="w-3 h-3" />,
  divider: <Minus className="w-3 h-3" />,
  logo: <Type className="w-3 h-3" />,
  qr: <Square className="w-3 h-3" />,
};

function getElementLabel(el: DesignElement): string {
  if (el.text?.content) {
    return el.text.content.length > 20
      ? el.text.content.slice(0, 20) + "..."
      : el.text.content;
  }
  if (el.image?.alt) return el.image.alt;
  if (el.shape?.shapeType) return el.shape.shapeType;
  return el.id;
}

export default function LayersPanel({ state, actions }: LayersPanelProps) {
  if (!state || !actions) {
    return (
      <div className="p-3 text-sm text-muted-foreground text-center">
        Load a template to see layers
      </div>
    );
  }

  const currentPage = state.template.pages[state.activePage];
  if (!currentPage) return null;

  const elements = [...currentPage.elements].reverse(); // Top layer first

  return (
    <div className="space-y-1">
      {/* Page Selector */}
      {state.template.pages.length > 1 && (
        <div className="flex items-center gap-1 px-2 pb-2 border-b mb-2">
          {state.template.pages.map((_, idx) => (
            <Button
              key={idx}
              variant={state.activePage === idx ? "default" : "outline"}
              size="sm"
              className="h-7 text-xs"
              onClick={() => actions.setActivePage(idx)}
            >
              Page {idx + 1}
            </Button>
          ))}
        </div>
      )}

      {/* Layers List */}
      <div className="text-xs font-medium text-muted-foreground px-2 pb-1">
        {elements.length} element{elements.length !== 1 ? "s" : ""}
      </div>

      {elements.map((el) => {
        const isSelected = state.selectedElementId === el.id;
        return (
          <div
            key={el.id}
            className={`flex items-center gap-2 px-2 py-1.5 rounded cursor-pointer transition-colors ${
              isSelected
                ? "bg-primary/10 border border-primary/30"
                : "hover:bg-muted"
            }`}
            onClick={() => actions.selectElement(el.id)}
          >
            <span className="text-muted-foreground">
              {TYPE_ICONS[el.type] || <Square className="w-3 h-3" />}
            </span>
            <span className="text-xs flex-1 truncate">{getElementLabel(el)}</span>
            <Badge variant="outline" className="text-[9px] px-1 py-0">
              {el.type}
            </Badge>
            {el.locked && <Lock className="w-3 h-3 text-muted-foreground" />}
          </div>
        );
      })}

      {elements.length === 0 && (
        <div className="text-xs text-muted-foreground text-center py-4">
          No elements yet. Add elements from the toolbar.
        </div>
      )}
    </div>
  );
}
