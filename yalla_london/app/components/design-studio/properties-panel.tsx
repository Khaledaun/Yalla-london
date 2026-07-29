"use client";

import React from "react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Slider } from "@/components/ui/slider";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import type { CanvasActions } from "./design-canvas";
import type { DesignElement } from "@/lib/pdf/brand-design-system";

interface PropertiesPanelProps {
  element: DesignElement | null;
  actions: CanvasActions | null;
}

export default function PropertiesPanel({
  element,
  actions,
}: PropertiesPanelProps) {
  if (!element || !actions) {
    return (
      <div className="p-3 text-sm text-muted-foreground text-center">
        Select an element to edit properties
      </div>
    );
  }

  const update = (updates: Partial<DesignElement>) => {
    actions.updateElement(element.id, updates);
  };

  return (
    <div className="p-3 space-y-4 text-sm">
      <div className="font-medium text-xs uppercase text-muted-foreground">
        {element.type} Properties
      </div>

      {/* Position & Size */}
      <div className="space-y-2">
        <Label className="text-xs">Position & Size</Label>
        <div className="grid grid-cols-2 gap-2">
          <div>
            <Label className="text-[10px] text-muted-foreground">X %</Label>
            <Input
              type="number"
              value={Math.round(element.x * 10) / 10}
              onChange={(e) => update({ x: parseFloat(e.target.value) || 0 })}
              className="h-7 text-xs"
              min={0}
              max={100}
              step={0.5}
            />
          </div>
          <div>
            <Label className="text-[10px] text-muted-foreground">Y %</Label>
            <Input
              type="number"
              value={Math.round(element.y * 10) / 10}
              onChange={(e) => update({ y: parseFloat(e.target.value) || 0 })}
              className="h-7 text-xs"
              min={0}
              max={100}
              step={0.5}
            />
          </div>
          <div>
            <Label className="text-[10px] text-muted-foreground">Width %</Label>
            <Input
              type="number"
              value={Math.round(element.width * 10) / 10}
              onChange={(e) =>
                update({ width: parseFloat(e.target.value) || 1 })
              }
              className="h-7 text-xs"
              min={1}
              max={100}
              step={0.5}
            />
          </div>
          <div>
            <Label className="text-[10px] text-muted-foreground">Height %</Label>
            <Input
              type="number"
              value={Math.round(element.height * 10) / 10}
              onChange={(e) =>
                update({ height: parseFloat(e.target.value) || 1 })
              }
              className="h-7 text-xs"
              min={0.1}
              max={100}
              step={0.5}
            />
          </div>
        </div>
      </div>

      {/* Opacity */}
      <div className="space-y-2">
        <Label className="text-xs">
          Opacity: {Math.round((element.opacity ?? 1) * 100)}%
        </Label>
        <Slider
          value={[(element.opacity ?? 1) * 100]}
          onValueChange={([v]) => update({ opacity: v / 100 })}
          min={0}
          max={100}
          step={5}
        />
      </div>

      {/* Rotation */}
      <div className="space-y-2">
        <Label className="text-xs">Rotation: {element.rotation ?? 0}°</Label>
        <Slider
          value={[element.rotation ?? 0]}
          onValueChange={([v]) => update({ rotation: v })}
          min={-180}
          max={180}
          step={1}
        />
      </div>

      {/* Text Properties */}
      {element.type === "text" && element.text && (
        <div className="space-y-2 border-t pt-3">
          <Label className="text-xs font-medium">Text Settings</Label>

          <div>
            <Label className="text-[10px] text-muted-foreground">Font Size</Label>
            <Input
              type="number"
              value={element.text.fontSize}
              onChange={(e) =>
                update({
                  text: {
                    ...element.text!,
                    fontSize: parseInt(e.target.value) || 16,
                  },
                })
              }
              className="h-7 text-xs"
              min={8}
              max={120}
            />
          </div>

          <div>
            <Label className="text-[10px] text-muted-foreground">Font Family</Label>
            <Select
              value={element.text.fontFamily}
              onValueChange={(v) =>
                update({ text: { ...element.text!, fontFamily: v } })
              }
            >
              <SelectTrigger className="h-7 text-xs">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="Anybody, sans-serif">
                  Anybody
                </SelectItem>
                <SelectItem value="IBM Plex Sans Arabic, sans-serif">IBM Plex Sans Arabic (Arabic)</SelectItem>
                <SelectItem value="Inter, sans-serif">Inter</SelectItem>
                <SelectItem value="Source Serif 4, serif">
                  Source Serif 4
                </SelectItem>
                <SelectItem value="Montserrat, sans-serif">Montserrat</SelectItem>
                <SelectItem value="Georgia, serif">Georgia</SelectItem>
                <SelectItem value="Arial, sans-serif">Arial</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div>
            <Label className="text-[10px] text-muted-foreground">Color</Label>
            <div className="flex gap-2">
              <input
                type="color"
                value={element.text.color}
                onChange={(e) =>
                  update({
                    text: { ...element.text!, color: e.target.value },
                  })
                }
                className="w-7 h-7 rounded border cursor-pointer"
              />
              <Input
                value={element.text.color}
                onChange={(e) =>
                  update({
                    text: { ...element.text!, color: e.target.value },
                  })
                }
                className="h-7 text-xs flex-1"
              />
            </div>
          </div>

          <div>
            <Label className="text-[10px] text-muted-foreground">Line Height</Label>
            <Slider
              value={[(element.text.lineHeight ?? 1.3) * 10]}
              onValueChange={([v]) =>
                update({
                  text: { ...element.text!, lineHeight: v / 10 },
                })
              }
              min={8}
              max={30}
              step={1}
            />
          </div>
        </div>
      )}

      {/* Shape Properties */}
      {element.type === "shape" && element.shape && (
        <div className="space-y-2 border-t pt-3">
          <Label className="text-xs font-medium">Shape Settings</Label>

          <div>
            <Label className="text-[10px] text-muted-foreground">Fill Color</Label>
            <div className="flex gap-2">
              <input
                type="color"
                value={element.shape.fill}
                onChange={(e) =>
                  update({
                    shape: { ...element.shape!, fill: e.target.value },
                  })
                }
                className="w-7 h-7 rounded border cursor-pointer"
              />
              <Input
                value={element.shape.fill}
                onChange={(e) =>
                  update({
                    shape: { ...element.shape!, fill: e.target.value },
                  })
                }
                className="h-7 text-xs flex-1"
              />
            </div>
          </div>

          {element.shape.shapeType === "rectangle" && (
            <div>
              <Label className="text-[10px] text-muted-foreground">
                Border Radius: {element.shape.borderRadius || 0}
              </Label>
              <Slider
                value={[element.shape.borderRadius || 0]}
                onValueChange={([v]) =>
                  update({
                    shape: { ...element.shape!, borderRadius: v },
                  })
                }
                min={0}
                max={50}
                step={1}
              />
            </div>
          )}

          <div>
            <Label className="text-[10px] text-muted-foreground">
              Stroke Width: {element.shape.strokeWidth || 0}
            </Label>
            <Slider
              value={[element.shape.strokeWidth || 0]}
              onValueChange={([v]) =>
                update({
                  shape: {
                    ...element.shape!,
                    strokeWidth: v,
                    stroke: v > 0 ? element.shape!.stroke || "#000000" : undefined,
                  },
                })
              }
              min={0}
              max={10}
              step={1}
            />
          </div>
        </div>
      )}
    </div>
  );
}
