"use client";

import React from "react";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Separator } from "@/components/ui/separator";
import {
  Undo2,
  Redo2,
  ZoomIn,
  ZoomOut,
  Download,
  Type,
  Square,
  Circle,
  Image as ImageIcon,
  Minus,
  Trash2,
  Copy,
  Bold,
  Italic,
  AlignLeft,
  AlignCenter,
  AlignRight,
} from "lucide-react";
import type { CanvasActions, CanvasState } from "./design-canvas";
import type { DesignElement } from "@/lib/pdf/brand-design-system";

interface EditorToolbarProps {
  state: CanvasState | null;
  actions: CanvasActions | null;
  selectedElement: DesignElement | null;
}

export default function EditorToolbar({
  state,
  actions,
  selectedElement,
}: EditorToolbarProps) {
  if (!actions || !state) return null;

  const addTextElement = () => {
    const el: DesignElement = {
      id: `text-${Date.now()}`,
      type: "text",
      x: 20,
      y: 40,
      width: 60,
      height: 8,
      text: {
        content: "New Text",
        fontSize: 24,
        fontFamily: "Anybody, sans-serif",
        fontWeight: 400,
        color: "#000000",
        alignment: "center",
        editable: true,
      },
    };
    actions.addElement(el);
  };

  const addShapeElement = (shapeType: "rectangle" | "circle") => {
    const el: DesignElement = {
      id: `shape-${Date.now()}`,
      type: "shape",
      x: 30,
      y: 30,
      width: 40,
      height: shapeType === "circle" ? 40 : 20,
      shape: {
        shapeType,
        fill: "#E5E7EB",
        borderRadius: shapeType === "rectangle" ? 8 : 0,
      },
    };
    actions.addElement(el);
  };

  const addImagePlaceholder = () => {
    const el: DesignElement = {
      id: `img-${Date.now()}`,
      type: "image",
      x: 15,
      y: 20,
      width: 70,
      height: 35,
      image: {
        src: "",
        alt: "Drop image here",
        objectFit: "cover",
        placeholder: true,
      },
    };
    actions.addElement(el);
  };

  const addDivider = () => {
    const el: DesignElement = {
      id: `div-${Date.now()}`,
      type: "divider",
      x: 10,
      y: 50,
      width: 80,
      height: 0.2,
      shape: { shapeType: "line", fill: "#D1D5DB", strokeWidth: 1 },
    };
    actions.addElement(el);
  };

  const handleExport = async () => {
    const dataUrl = await actions.exportToPng();
    if (dataUrl) {
      const a = document.createElement("a");
      a.href = dataUrl;
      a.download = `design-${Date.now()}.png`;
      a.click();
    }
  };

  const updateTextStyle = (key: string, value: unknown) => {
    if (!selectedElement?.text) return;
    actions.updateElement(selectedElement.id, {
      text: { ...selectedElement.text, [key]: value },
    });
  };

  return (
    <div className="bg-white border-b px-3 py-2 flex items-center gap-1 flex-wrap">
      {/* Undo / Redo */}
      <Button
        variant="ghost"
        size="icon"
        onClick={actions.undo}
        disabled={state.historyIndex <= 0}
        title="Undo (Ctrl+Z)"
      >
        <Undo2 className="w-4 h-4" />
      </Button>
      <Button
        variant="ghost"
        size="icon"
        onClick={actions.redo}
        disabled={state.historyIndex >= state.history.length - 1}
        title="Redo (Ctrl+Shift+Z)"
      >
        <Redo2 className="w-4 h-4" />
      </Button>

      <Separator orientation="vertical" className="h-6 mx-1" />

      {/* Add Elements */}
      <Button variant="ghost" size="sm" onClick={addTextElement} title="Add Text">
        <Type className="w-4 h-4 mr-1" />
        Text
      </Button>
      <Button
        variant="ghost"
        size="sm"
        onClick={() => addShapeElement("rectangle")}
        title="Add Rectangle"
      >
        <Square className="w-4 h-4 mr-1" />
        Rect
      </Button>
      <Button
        variant="ghost"
        size="sm"
        onClick={() => addShapeElement("circle")}
        title="Add Circle"
      >
        <Circle className="w-4 h-4 mr-1" />
        Circle
      </Button>
      <Button variant="ghost" size="sm" onClick={addImagePlaceholder} title="Add Image">
        <ImageIcon className="w-4 h-4 mr-1" />
        Image
      </Button>
      <Button variant="ghost" size="sm" onClick={addDivider} title="Add Divider">
        <Minus className="w-4 h-4 mr-1" />
        Line
      </Button>

      <Separator orientation="vertical" className="h-6 mx-1" />

      {/* Text Formatting (when text selected) */}
      {selectedElement?.type === "text" && selectedElement.text && (
        <>
          <Button
            variant={selectedElement.text.fontWeight >= 700 ? "secondary" : "ghost"}
            size="icon"
            onClick={() =>
              updateTextStyle(
                "fontWeight",
                selectedElement.text!.fontWeight >= 700 ? 400 : 700,
              )
            }
            title="Bold"
          >
            <Bold className="w-4 h-4" />
          </Button>
          <Button
            variant={selectedElement.text.alignment === "left" ? "secondary" : "ghost"}
            size="icon"
            onClick={() => updateTextStyle("alignment", "left")}
          >
            <AlignLeft className="w-4 h-4" />
          </Button>
          <Button
            variant={selectedElement.text.alignment === "center" ? "secondary" : "ghost"}
            size="icon"
            onClick={() => updateTextStyle("alignment", "center")}
          >
            <AlignCenter className="w-4 h-4" />
          </Button>
          <Button
            variant={selectedElement.text.alignment === "right" ? "secondary" : "ghost"}
            size="icon"
            onClick={() => updateTextStyle("alignment", "right")}
          >
            <AlignRight className="w-4 h-4" />
          </Button>

          <Select
            value={String(selectedElement.text.fontSize)}
            onValueChange={(v) => updateTextStyle("fontSize", parseInt(v))}
          >
            <SelectTrigger className="w-16 h-8">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {[10, 12, 14, 16, 18, 20, 24, 28, 32, 36, 42, 48, 56, 64, 72].map(
                (size) => (
                  <SelectItem key={size} value={String(size)}>
                    {size}
                  </SelectItem>
                ),
              )}
            </SelectContent>
          </Select>

          <input
            type="color"
            value={selectedElement.text.color}
            onChange={(e) => updateTextStyle("color", e.target.value)}
            className="w-8 h-8 rounded border cursor-pointer"
            title="Text color"
          />

          <Separator orientation="vertical" className="h-6 mx-1" />
        </>
      )}

      {/* Shape color (when shape selected) */}
      {selectedElement?.type === "shape" && selectedElement.shape && (
        <>
          <span className="text-xs text-muted-foreground">Fill:</span>
          <input
            type="color"
            value={selectedElement.shape.fill}
            onChange={(e) =>
              actions.updateElement(selectedElement.id, {
                shape: { ...selectedElement.shape!, fill: e.target.value },
              })
            }
            className="w-8 h-8 rounded border cursor-pointer"
          />
          <Separator orientation="vertical" className="h-6 mx-1" />
        </>
      )}

      {/* Delete */}
      {selectedElement && (
        <Button
          variant="ghost"
          size="icon"
          onClick={() => actions.deleteElement(selectedElement.id)}
          title="Delete (Backspace)"
        >
          <Trash2 className="w-4 h-4 text-destructive" />
        </Button>
      )}

      <div className="flex-1" />

      {/* Zoom */}
      <Button
        variant="ghost"
        size="icon"
        onClick={() => actions.setZoom(state.zoom - 0.1)}
        disabled={state.zoom <= 0.3}
      >
        <ZoomOut className="w-4 h-4" />
      </Button>
      <span className="text-xs w-12 text-center">{Math.round(state.zoom * 100)}%</span>
      <Button
        variant="ghost"
        size="icon"
        onClick={() => actions.setZoom(state.zoom + 0.1)}
        disabled={state.zoom >= 3}
      >
        <ZoomIn className="w-4 h-4" />
      </Button>

      <Separator orientation="vertical" className="h-6 mx-1" />

      {/* Export */}
      <Button variant="default" size="sm" onClick={handleExport}>
        <Download className="w-4 h-4 mr-1" />
        Export PNG
      </Button>
    </div>
  );
}
