"use client";

import React, {
  useState,
  useRef,
  useCallback,
  useEffect,
  useMemo,
} from "react";
import { Stage, Layer, Rect, Text, Line, Circle, Group, Transformer } from "react-konva";
import type Konva from "konva";
import type {
  DesignTemplate,
  DesignElement,
  DesignPage,
} from "@/lib/pdf/brand-design-system";

// ─── Types ───────────────────────────────────────────────────────

export interface CanvasState {
  template: DesignTemplate;
  activePage: number;
  selectedElementId: string | null;
  zoom: number;
  history: DesignPage[][];
  historyIndex: number;
}

export interface CanvasActions {
  selectElement: (id: string | null) => void;
  updateElement: (id: string, updates: Partial<DesignElement>) => void;
  updateText: (id: string, newContent: string) => void;
  addElement: (element: DesignElement) => void;
  deleteElement: (id: string) => void;
  moveElement: (id: string, x: number, y: number) => void;
  resizeElement: (id: string, width: number, height: number) => void;
  undo: () => void;
  redo: () => void;
  setZoom: (zoom: number) => void;
  setActivePage: (page: number) => void;
  exportToPng: () => Promise<string | null>;
  getTemplate: () => DesignTemplate;
}

interface DesignCanvasProps {
  template: DesignTemplate;
  locale?: "en" | "ar";
  onStateChange?: (state: CanvasState) => void;
  onElementSelect?: (element: DesignElement | null) => void;
  actionsRef?: React.MutableRefObject<CanvasActions | null>;
}

// ─── Stage Dimensions ────────────────────────────────────────────

const FORMAT_SIZES: Record<string, { width: number; height: number }> = {
  A4: { width: 595, height: 842 },
  A5: { width: 420, height: 595 },
  letter: { width: 612, height: 792 },
  square: { width: 600, height: 600 },
  story: { width: 540, height: 960 },
  landscape: { width: 842, height: 595 },
};

// ─── Main Canvas Component ───────────────────────────────────────

export default function DesignCanvas({
  template: initialTemplate,
  locale = "en",
  onStateChange,
  onElementSelect,
  actionsRef,
}: DesignCanvasProps) {
  const stageRef = useRef<Konva.Stage>(null);
  const transformerRef = useRef<Konva.Transformer>(null);
  const [editingTextId, setEditingTextId] = useState<string | null>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  // Canvas state
  const [state, setState] = useState<CanvasState>({
    template: initialTemplate,
    activePage: 0,
    selectedElementId: null,
    zoom: 1,
    history: [initialTemplate.pages.map((p) => ({ ...p, elements: [...p.elements] }))],
    historyIndex: 0,
  });

  const stageSize = FORMAT_SIZES[state.template.format] || FORMAT_SIZES.A4;
  const currentPage = state.template.pages[state.activePage];

  // Notify parent of state changes
  useEffect(() => {
    onStateChange?.(state);
  }, [state, onStateChange]);

  // ─── History Management ──────────────────────────────────────

  const pushHistory = useCallback((pages: DesignPage[]) => {
    setState((prev) => {
      const newHistory = prev.history.slice(0, prev.historyIndex + 1);
      newHistory.push(pages.map((p) => ({ ...p, elements: [...p.elements] })));
      return {
        ...prev,
        history: newHistory,
        historyIndex: newHistory.length - 1,
      };
    });
  }, []);

  // ─── Element Actions ─────────────────────────────────────────

  const selectElement = useCallback(
    (id: string | null) => {
      setState((prev) => ({ ...prev, selectedElementId: id }));
      if (id) {
        const el = currentPage?.elements.find((e) => e.id === id);
        onElementSelect?.(el || null);
      } else {
        onElementSelect?.(null);
      }
    },
    [currentPage, onElementSelect],
  );

  const updateElement = useCallback(
    (id: string, updates: Partial<DesignElement>) => {
      setState((prev) => {
        const newPages = prev.template.pages.map((page, idx) => {
          if (idx !== prev.activePage) return page;
          return {
            ...page,
            elements: page.elements.map((el) =>
              el.id === id ? { ...el, ...updates } : el,
            ),
          };
        });
        return {
          ...prev,
          template: { ...prev.template, pages: newPages },
        };
      });
    },
    [],
  );

  const updateText = useCallback(
    (id: string, newContent: string) => {
      setState((prev) => {
        const newPages = prev.template.pages.map((page, idx) => {
          if (idx !== prev.activePage) return page;
          return {
            ...page,
            elements: page.elements.map((el) => {
              if (el.id !== id || !el.text) return el;
              return {
                ...el,
                text: {
                  ...el.text,
                  content: locale === "ar" ? el.text.content : newContent,
                  contentAr: locale === "ar" ? newContent : el.text.contentAr,
                },
              };
            }),
          };
        });
        pushHistory(newPages);
        return {
          ...prev,
          template: { ...prev.template, pages: newPages },
        };
      });
    },
    [locale, pushHistory],
  );

  const addElement = useCallback(
    (element: DesignElement) => {
      setState((prev) => {
        const newPages = prev.template.pages.map((page, idx) => {
          if (idx !== prev.activePage) return page;
          return { ...page, elements: [...page.elements, element] };
        });
        pushHistory(newPages);
        return {
          ...prev,
          template: { ...prev.template, pages: newPages },
          selectedElementId: element.id,
        };
      });
    },
    [pushHistory],
  );

  const deleteElement = useCallback(
    (id: string) => {
      setState((prev) => {
        const newPages = prev.template.pages.map((page, idx) => {
          if (idx !== prev.activePage) return page;
          return {
            ...page,
            elements: page.elements.filter((el) => el.id !== id),
          };
        });
        pushHistory(newPages);
        return {
          ...prev,
          template: { ...prev.template, pages: newPages },
          selectedElementId:
            prev.selectedElementId === id ? null : prev.selectedElementId,
        };
      });
    },
    [pushHistory],
  );

  const moveElement = useCallback(
    (id: string, x: number, y: number) => {
      // Convert pixel coords back to percentage
      const pctX = (x / stageSize.width) * 100;
      const pctY = (y / stageSize.height) * 100;
      updateElement(id, { x: pctX, y: pctY });
    },
    [stageSize, updateElement],
  );

  const resizeElement = useCallback(
    (id: string, width: number, height: number) => {
      const pctW = (width / stageSize.width) * 100;
      const pctH = (height / stageSize.height) * 100;
      updateElement(id, { width: pctW, height: pctH });
    },
    [stageSize, updateElement],
  );

  const undo = useCallback(() => {
    setState((prev) => {
      if (prev.historyIndex <= 0) return prev;
      const newIndex = prev.historyIndex - 1;
      return {
        ...prev,
        historyIndex: newIndex,
        template: { ...prev.template, pages: prev.history[newIndex] },
        selectedElementId: null,
      };
    });
  }, []);

  const redo = useCallback(() => {
    setState((prev) => {
      if (prev.historyIndex >= prev.history.length - 1) return prev;
      const newIndex = prev.historyIndex + 1;
      return {
        ...prev,
        historyIndex: newIndex,
        template: { ...prev.template, pages: prev.history[newIndex] },
        selectedElementId: null,
      };
    });
  }, []);

  const setZoom = useCallback((zoom: number) => {
    setState((prev) => ({ ...prev, zoom: Math.max(0.25, Math.min(3, zoom)) }));
  }, []);

  const setActivePage = useCallback((page: number) => {
    setState((prev) => ({
      ...prev,
      activePage: Math.max(0, Math.min(page, prev.template.pages.length - 1)),
      selectedElementId: null,
    }));
  }, []);

  const exportToPng = useCallback(async (): Promise<string | null> => {
    if (!stageRef.current) return null;
    return stageRef.current.toDataURL({ pixelRatio: 2 });
  }, []);

  const getTemplate = useCallback(() => state.template, [state.template]);

  // Expose actions to parent
  const actions = useMemo<CanvasActions>(
    () => ({
      selectElement,
      updateElement,
      updateText,
      addElement,
      deleteElement,
      moveElement,
      resizeElement,
      undo,
      redo,
      setZoom,
      setActivePage,
      exportToPng,
      getTemplate,
    }),
    [
      selectElement, updateElement, updateText, addElement,
      deleteElement, moveElement, resizeElement,
      undo, redo, setZoom, setActivePage, exportToPng, getTemplate,
    ],
  );

  useEffect(() => {
    if (actionsRef) actionsRef.current = actions;
  }, [actions, actionsRef]);

  // ─── Transformer ─────────────────────────────────────────────

  useEffect(() => {
    const tr = transformerRef.current;
    const stage = stageRef.current;
    if (!tr || !stage) return;

    if (state.selectedElementId) {
      const node = stage.findOne(`#${state.selectedElementId}`);
      if (node) {
        tr.nodes([node]);
        tr.getLayer()?.batchDraw();
      }
    } else {
      tr.nodes([]);
      tr.getLayer()?.batchDraw();
    }
  }, [state.selectedElementId]);

  // ─── Keyboard Shortcuts ──────────────────────────────────────

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (editingTextId) return; // Don't interfere with text editing

      if ((e.metaKey || e.ctrlKey) && e.key === "z") {
        e.preventDefault();
        if (e.shiftKey) redo();
        else undo();
      }
      if (e.key === "Delete" || e.key === "Backspace") {
        if (state.selectedElementId) {
          e.preventDefault();
          deleteElement(state.selectedElementId);
        }
      }
      if (e.key === "Escape") {
        selectElement(null);
        setEditingTextId(null);
      }
    };

    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [state.selectedElementId, editingTextId, undo, redo, deleteElement, selectElement]);

  // ─── Click Away Deselect ─────────────────────────────────────

  const handleStageClick = (e: Konva.KonvaEventObject<MouseEvent | TouchEvent>) => {
    if (e.target === e.target.getStage()) {
      selectElement(null);
      setEditingTextId(null);
    }
  };

  // ─── Text Editing ────────────────────────────────────────────

  const handleTextDblClick = (element: DesignElement, node: Konva.Text) => {
    if (!element.text?.editable) return;

    setEditingTextId(element.id);
    selectElement(element.id);

    // Position textarea over the text node
    const stage = stageRef.current;
    if (!stage) return;

    const stageBox = stage.container().getBoundingClientRect();
    const textPosition = node.absolutePosition();
    const zoom = state.zoom;

    setTimeout(() => {
      if (!textareaRef.current) return;
      const ta = textareaRef.current;
      ta.value = locale === "ar" && element.text?.contentAr
        ? element.text.contentAr
        : element.text?.content || "";
      ta.style.position = "absolute";
      ta.style.top = `${stageBox.top + textPosition.y * zoom}px`;
      ta.style.left = `${stageBox.left + textPosition.x * zoom}px`;
      ta.style.width = `${node.width() * zoom}px`;
      ta.style.height = `${node.height() * zoom}px`;
      ta.style.fontSize = `${(element.text?.fontSize || 16) * zoom}px`;
      ta.style.fontFamily = element.text?.fontFamily || "sans-serif";
      ta.style.fontWeight = String(element.text?.fontWeight || 400);
      ta.style.color = element.text?.color || "#000";
      ta.style.textAlign = element.text?.alignment || "left";
      ta.style.direction = locale === "ar" ? "rtl" : "ltr";
      ta.style.border = "2px solid #3b82f6";
      ta.style.background = "rgba(255,255,255,0.95)";
      ta.style.borderRadius = "4px";
      ta.style.padding = "4px";
      ta.style.outline = "none";
      ta.style.resize = "none";
      ta.style.overflow = "hidden";
      ta.style.zIndex = "1000";
      ta.style.display = "block";
      ta.focus();
      ta.select();
    }, 0);
  };

  const handleTextareaBlur = () => {
    if (editingTextId && textareaRef.current) {
      updateText(editingTextId, textareaRef.current.value);
      textareaRef.current.style.display = "none";
      setEditingTextId(null);
    }
  };

  const handleTextareaKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Escape" || (e.key === "Enter" && !e.shiftKey)) {
      e.preventDefault();
      handleTextareaBlur();
    }
  };

  // ─── Render Background ───────────────────────────────────────

  const renderBackground = () => {
    if (!currentPage) return null;
    const bg = currentPage.background;

    if (bg.type === "solid") {
      return (
        <Rect
          x={0}
          y={0}
          width={stageSize.width}
          height={stageSize.height}
          fill={bg.color || "#FFFFFF"}
        />
      );
    }

    if (bg.type === "gradient" && bg.gradient) {
      const angle = (bg.gradient.angle || 0) * (Math.PI / 180);
      return (
        <Rect
          x={0}
          y={0}
          width={stageSize.width}
          height={stageSize.height}
          fillLinearGradientStartPoint={{
            x: stageSize.width / 2 - Math.cos(angle) * stageSize.width / 2,
            y: stageSize.height / 2 - Math.sin(angle) * stageSize.height / 2,
          }}
          fillLinearGradientEndPoint={{
            x: stageSize.width / 2 + Math.cos(angle) * stageSize.width / 2,
            y: stageSize.height / 2 + Math.sin(angle) * stageSize.height / 2,
          }}
          fillLinearGradientColorStops={[0, bg.gradient.from, 1, bg.gradient.to]}
        />
      );
    }

    return (
      <Rect
        x={0}
        y={0}
        width={stageSize.width}
        height={stageSize.height}
        fill="#FFFFFF"
      />
    );
  };

  // ─── Render Element ──────────────────────────────────────────

  const renderElement = (element: DesignElement) => {
    const x = (element.x / 100) * stageSize.width;
    const y = (element.y / 100) * stageSize.height;
    const width = (element.width / 100) * stageSize.width;
    const height = (element.height / 100) * stageSize.height;
    const isSelected = state.selectedElementId === element.id;

    const commonProps = {
      id: element.id,
      x,
      y,
      opacity: element.opacity ?? 1,
      rotation: element.rotation ?? 0,
      draggable: !element.locked,
      onClick: () => selectElement(element.id),
      onTap: () => selectElement(element.id),
      onDragEnd: (e: Konva.KonvaEventObject<DragEvent>) => {
        moveElement(element.id, e.target.x(), e.target.y());
        pushHistory(state.template.pages);
      },
      onTransformEnd: (e: Konva.KonvaEventObject<Event>) => {
        const node = e.target;
        const scaleX = node.scaleX();
        const scaleY = node.scaleY();
        node.scaleX(1);
        node.scaleY(1);

        moveElement(element.id, node.x(), node.y());
        resizeElement(
          element.id,
          Math.max(10, node.width() * scaleX),
          Math.max(10, node.height() * scaleY),
        );
        pushHistory(state.template.pages);
      },
    };

    switch (element.type) {
      case "text": {
        const textContent = locale === "ar" && element.text?.contentAr
          ? element.text.contentAr
          : element.text?.content || "";

        return (
          <Text
            key={element.id}
            {...commonProps}
            width={width}
            height={height}
            text={editingTextId === element.id ? "" : textContent}
            fontSize={element.text?.fontSize || 16}
            fontFamily={element.text?.fontFamily || "sans-serif"}
            fontStyle={
              (element.text?.fontWeight || 400) >= 700 ? "bold" : "normal"
            }
            fill={element.text?.color || "#000000"}
            align={element.text?.alignment || "left"}
            verticalAlign="middle"
            lineHeight={element.text?.lineHeight || 1.3}
            letterSpacing={element.text?.letterSpacing || 0}
            textDecoration={
              element.text?.textTransform === "uppercase" ? undefined : undefined
            }
            onDblClick={(e) => {
              handleTextDblClick(element, e.target as Konva.Text);
            }}
            onDblTap={(e) => {
              handleTextDblClick(element, e.target as Konva.Text);
            }}
          />
        );
      }

      case "shape": {
        if (element.shape?.shapeType === "circle") {
          const radius = Math.min(width, height) / 2;
          return (
            <Circle
              key={element.id}
              {...commonProps}
              x={x + radius}
              y={y + radius}
              radius={radius}
              fill={element.shape.fill}
              stroke={element.shape.stroke}
              strokeWidth={element.shape.strokeWidth}
            />
          );
        }

        return (
          <Rect
            key={element.id}
            {...commonProps}
            width={width}
            height={height}
            fill={element.shape?.fill}
            stroke={element.shape?.stroke}
            strokeWidth={element.shape?.strokeWidth}
            cornerRadius={element.shape?.borderRadius || 0}
          />
        );
      }

      case "divider": {
        return (
          <Line
            key={element.id}
            {...commonProps}
            points={[0, 0, width, 0]}
            stroke={element.shape?.fill || "#CCCCCC"}
            strokeWidth={element.shape?.strokeWidth || 1}
          />
        );
      }

      case "image": {
        // Render as placeholder rectangle with icon
        const isPlaceholder = element.image?.placeholder || !element.image?.src;
        return (
          <Group key={element.id} {...commonProps}>
            <Rect
              width={width}
              height={height}
              fill={isPlaceholder ? "#E5E7EB" : "#F3F4F6"}
              stroke={isSelected ? "#3b82f6" : "#D1D5DB"}
              strokeWidth={isSelected ? 2 : 1}
              cornerRadius={element.image?.borderRadius || 0}
            />
            {isPlaceholder && (
              <>
                {/* Image icon placeholder */}
                <Text
                  width={width}
                  height={height}
                  text={element.image?.alt || "Drop image here"}
                  fontSize={12}
                  fill="#9CA3AF"
                  align="center"
                  verticalAlign="middle"
                />
              </>
            )}
          </Group>
        );
      }

      default:
        return null;
    }
  };

  // ─── Render ──────────────────────────────────────────────────

  return (
    <div className="relative">
      {/* Canvas */}
      <div
        style={{
          width: stageSize.width * state.zoom,
          height: stageSize.height * state.zoom,
          margin: "0 auto",
          boxShadow: "0 4px 20px rgba(0,0,0,0.15)",
          borderRadius: 4,
          overflow: "hidden",
          background: "#fff",
        }}
      >
        <Stage
          ref={stageRef}
          width={stageSize.width}
          height={stageSize.height}
          scaleX={state.zoom}
          scaleY={state.zoom}
          style={{
            width: stageSize.width * state.zoom,
            height: stageSize.height * state.zoom,
          }}
          onClick={handleStageClick}
          onTap={handleStageClick}
        >
          <Layer>
            {renderBackground()}
            {currentPage?.elements.map(renderElement)}
            <Transformer
              ref={transformerRef}
              boundBoxFunc={(oldBox, newBox) => {
                // Minimum size
                if (newBox.width < 10 || newBox.height < 10) return oldBox;
                return newBox;
              }}
              rotateEnabled
              enabledAnchors={[
                "top-left",
                "top-right",
                "bottom-left",
                "bottom-right",
                "middle-left",
                "middle-right",
                "top-center",
                "bottom-center",
              ]}
            />
          </Layer>
        </Stage>
      </div>

      {/* Floating textarea for text editing */}
      <textarea
        ref={textareaRef}
        style={{ display: "none", position: "fixed" }}
        onBlur={handleTextareaBlur}
        onKeyDown={handleTextareaKeyDown}
      />
    </div>
  );
}
