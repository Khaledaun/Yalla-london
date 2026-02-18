"use client";

/**
 * Remotion Video Composition
 *
 * Renders a VideoTemplateConfig as a Remotion composition.
 * Each scene is a <Sequence>, each element is a React component
 * with animations driven by useCurrentFrame().
 */

import React from "react";
import {
  AbsoluteFill,
  Sequence,
  useCurrentFrame,
  useVideoConfig,
  interpolate,
  spring,
  Easing,
  Img,
} from "remotion";
import { sanitizeSvg } from "@/lib/html-sanitizer";
import type {
  VideoTemplateConfig,
  VideoScene,
  VideoElement,
  AnimationConfig,
  VideoTextProps,
  VideoShapeProps,
  VideoCounterProps,
  VideoImageProps,
} from "@/lib/video/brand-video-engine";

// ─── Main Composition ────────────────────────────────────────────

interface VideoCompositionProps {
  template: VideoTemplateConfig;
}

export const VideoComposition: React.FC<VideoCompositionProps> = ({ template }) => {
  return (
    <AbsoluteFill style={{ backgroundColor: "#000" }}>
      {template.scenes.map((scene) => (
        <Sequence
          key={scene.id}
          from={scene.startFrame}
          durationInFrames={scene.durationFrames}
          name={scene.name}
        >
          <SceneRenderer scene={scene} template={template} />
        </Sequence>
      ))}
    </AbsoluteFill>
  );
};

// ─── Scene Renderer ──────────────────────────────────────────────

const SceneRenderer: React.FC<{ scene: VideoScene; template: VideoTemplateConfig }> = ({
  scene,
  template,
}) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  // Scene transition
  const transitionFrames = scene.transition?.durationFrames || 0;
  const transitionProgress = transitionFrames > 0
    ? interpolate(frame, [0, transitionFrames], [0, 1], { extrapolateRight: "clamp" })
    : 1;

  const transitionStyle = getTransitionStyle(scene.transition?.type || "none", transitionProgress);

  return (
    <AbsoluteFill style={transitionStyle}>
      {/* Background */}
      <SceneBackground background={scene.background} />

      {/* Elements */}
      {scene.elements.map((element) => (
        <ElementRenderer
          key={element.id}
          element={element}
          sceneFrame={frame}
          sceneDuration={scene.durationFrames}
          fps={fps}
          template={template}
        />
      ))}
    </AbsoluteFill>
  );
};

// ─── Background Renderer ─────────────────────────────────────────

const SceneBackground: React.FC<{ background: VideoScene["background"] }> = ({
  background,
}) => {
  const frame = useCurrentFrame();
  const { durationInFrames } = useVideoConfig();

  let bgStyle: React.CSSProperties = {};

  switch (background.type) {
    case "solid":
      bgStyle = { backgroundColor: background.color || "#000" };
      break;
    case "gradient":
      if (background.gradient) {
        bgStyle = {
          background: `linear-gradient(${background.gradient.angle}deg, ${background.gradient.from}, ${background.gradient.to})`,
        };
      }
      break;
    case "image":
    case "video":
      // Ken Burns effect for images
      if (background.image) {
        const scale = interpolate(frame, [0, durationInFrames], [1, 1.08], {
          extrapolateRight: "clamp",
        });
        return (
          <AbsoluteFill>
            <AbsoluteFill
              style={{
                transform: `scale(${scale})`,
                backgroundImage: `url(${background.image})`,
                backgroundSize: "cover",
                backgroundPosition: "center",
              }}
            />
            {background.overlay && (
              <AbsoluteFill
                style={{
                  backgroundColor: background.overlay,
                  opacity: background.overlayOpacity || 0.4,
                }}
              />
            )}
          </AbsoluteFill>
        );
      }
      break;
  }

  return (
    <AbsoluteFill style={bgStyle}>
      {background.overlay && (
        <AbsoluteFill
          style={{
            backgroundColor: background.overlay,
            opacity: background.overlayOpacity || 0.4,
          }}
        />
      )}
    </AbsoluteFill>
  );
};

// ─── Element Renderer ────────────────────────────────────────────

const ElementRenderer: React.FC<{
  element: VideoElement;
  sceneFrame: number;
  sceneDuration: number;
  fps: number;
  template: VideoTemplateConfig;
}> = ({ element, sceneFrame, sceneDuration, fps, template }) => {
  const { width: vw, height: vh } = useVideoConfig();

  // Convert percentage positions to pixels
  const x = (element.x / 100) * vw;
  const y = (element.y / 100) * vh;
  const w = (element.width / 100) * vw;
  const h = (element.height / 100) * vh;

  // Calculate animation styles
  const animStyle = getAnimationStyle(element.animation, sceneFrame, sceneDuration, fps);

  const containerStyle: React.CSSProperties = {
    position: "absolute",
    left: x,
    top: y,
    width: w,
    height: h,
    ...animStyle,
  };

  return (
    <div style={containerStyle}>
      {element.type === "text" && element.text && (
        <TextElement text={element.text} width={w} height={h} />
      )}
      {element.type === "image" && element.image && (
        <ImageElement image={element.image} width={w} height={h} sceneFrame={sceneFrame} sceneDuration={sceneDuration} />
      )}
      {element.type === "shape" && element.shape && (
        <ShapeElement shape={element.shape} width={w} height={h} />
      )}
      {element.type === "logo" && (
        <LogoElement brand={template.brand} width={w} height={h} />
      )}
      {element.type === "counter" && element.counter && (
        <CounterElement counter={element.counter} sceneFrame={sceneFrame} sceneDuration={sceneDuration} fps={fps} />
      )}
    </div>
  );
};

// ─── Text Element ────────────────────────────────────────────────

const TextElement: React.FC<{
  text: VideoTextProps;
  width: number;
  height: number;
}> = ({ text, width, height }) => {
  return (
    <div
      style={{
        width: "100%",
        height: "100%",
        display: "flex",
        alignItems: "center",
        justifyContent:
          text.alignment === "center" ? "center" :
          text.alignment === "right" ? "flex-end" : "flex-start",
      }}
    >
      <p
        style={{
          fontSize: text.fontSize,
          fontFamily: text.fontFamily,
          fontWeight: text.fontWeight,
          color: text.color,
          textAlign: text.alignment,
          lineHeight: text.lineHeight || 1.3,
          letterSpacing: text.letterSpacing ? `${text.letterSpacing}px` : undefined,
          textTransform: text.textTransform || "none",
          textShadow: text.shadow,
          margin: 0,
          width: "100%",
          WebkitLineClamp: text.maxLines,
          overflow: text.maxLines ? "hidden" : undefined,
          display: text.maxLines ? "-webkit-box" : undefined,
          WebkitBoxOrient: text.maxLines ? "vertical" : undefined,
        } as React.CSSProperties}
      >
        {text.content}
      </p>
    </div>
  );
};

// ─── Image Element ───────────────────────────────────────────────

const ImageElement: React.FC<{
  image: VideoImageProps;
  width: number;
  height: number;
  sceneFrame: number;
  sceneDuration: number;
}> = ({ image, width, height, sceneFrame, sceneDuration }) => {
  if (image.placeholder || !image.src) {
    return (
      <div
        style={{
          width: "100%",
          height: "100%",
          backgroundColor: "#E5E7EB",
          borderRadius: image.borderRadius,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          color: "#9CA3AF",
          fontSize: 14,
        }}
      >
        {image.alt || "Image"}
      </div>
    );
  }

  // Optional Ken Burns
  let transform = "";
  if (image.kenBurns) {
    const kb = image.kenBurns;
    const progress = interpolate(sceneFrame, [0, sceneDuration], [0, 1], {
      extrapolateRight: "clamp",
    });
    const scale = interpolate(progress, [0, 1], [kb.startScale, kb.endScale]);
    const tx = interpolate(progress, [0, 1], [kb.startX, kb.endX]);
    const ty = interpolate(progress, [0, 1], [kb.startY, kb.endY]);
    transform = `scale(${scale}) translate(${tx}%, ${ty}%)`;
  }

  return (
    <Img
      src={image.src}
      style={{
        width: "100%",
        height: "100%",
        objectFit: image.objectFit,
        borderRadius: image.borderRadius,
        transform: transform || undefined,
      }}
    />
  );
};

// ─── Shape Element ───────────────────────────────────────────────

const ShapeElement: React.FC<{
  shape: VideoShapeProps;
  width: number;
  height: number;
}> = ({ shape, width, height }) => {
  const style: React.CSSProperties = {
    width: "100%",
    height: "100%",
    backgroundColor: shape.fill,
    border: shape.stroke ? `${shape.strokeWidth || 1}px solid ${shape.stroke}` : undefined,
    borderRadius: shape.shapeType === "circle"
      ? "50%"
      : shape.borderRadius
        ? `${shape.borderRadius}px`
        : undefined,
  };

  return <div style={style} />;
};

// ─── Logo Element ────────────────────────────────────────────────

const LogoElement: React.FC<{
  brand?: VideoCompositionProps["template"]["brand"];
  width: number;
  height: number;
}> = ({ brand, width, height }) => {
  if (brand?.logoSvg) {
    return (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
        }}
        dangerouslySetInnerHTML={{ __html: sanitizeSvg(brand.logoSvg) }}
      />
    );
  }

  return (
    <div
      style={{
        width: "100%",
        height: "100%",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        color: "#FFFFFF",
        fontSize: Math.min(width, height) * 0.4,
        fontWeight: 700,
        fontFamily: "Anybody, sans-serif",
        letterSpacing: 2,
      }}
    >
      {brand?.siteName || "YALLA"}
    </div>
  );
};

// ─── Counter Element ─────────────────────────────────────────────

const CounterElement: React.FC<{
  counter: VideoCounterProps;
  sceneFrame: number;
  sceneDuration: number;
  fps: number;
}> = ({ counter, sceneFrame, sceneDuration, fps }) => {
  const animDuration = Math.min(Math.floor(fps * 0.8), sceneDuration);
  const value = interpolate(
    sceneFrame,
    [0, animDuration],
    [counter.from, counter.to],
    { extrapolateRight: "clamp" },
  );

  return (
    <div
      style={{
        width: "100%",
        height: "100%",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        fontSize: counter.fontSize,
        fontWeight: counter.fontWeight,
        color: counter.color,
        fontFamily: "Anybody, sans-serif",
      }}
    >
      {counter.prefix}{Math.round(value)}{counter.suffix}
    </div>
  );
};

// ─── Animation Helpers ───────────────────────────────────────────

function getAnimationStyle(
  animation: VideoElement["animation"],
  frame: number,
  sceneDuration: number,
  fps: number,
): React.CSSProperties {
  if (!animation) return { opacity: 1 };

  let style: React.CSSProperties = {};

  // Enter animation
  if (animation.enter) {
    const enterStart = animation.enter.delay || 0;
    const enterEnd = enterStart + animation.enter.durationFrames;

    const progress = animation.enter.easing === "spring"
      ? spring({ frame: frame - enterStart, fps, config: { damping: 15, mass: 0.8, stiffness: 120 } })
      : interpolate(frame, [enterStart, enterEnd], [0, 1], {
          extrapolateLeft: "clamp",
          extrapolateRight: "clamp",
          easing: getEasing(animation.enter.easing),
        });

    style = { ...style, ...getEnterStyle(animation.enter.type, progress) };
  }

  // Exit animation
  if (animation.exit) {
    const exitStart = sceneDuration - animation.exit.durationFrames - (animation.exit.delay || 0);
    const exitEnd = exitStart + animation.exit.durationFrames;

    const progress = interpolate(frame, [exitStart, exitEnd], [1, 0], {
      extrapolateLeft: "clamp",
      extrapolateRight: "clamp",
      easing: getEasing(animation.exit.easing),
    });

    style = { ...style, ...getEnterStyle(animation.exit.type, progress) };
  }

  return style;
}

function getEnterStyle(
  type: AnimationConfig["type"],
  progress: number,
): React.CSSProperties {
  switch (type) {
    case "fade":
      return { opacity: progress };
    case "slide-up":
      return { opacity: progress, transform: `translateY(${(1 - progress) * 40}px)` };
    case "slide-down":
      return { opacity: progress, transform: `translateY(${(progress - 1) * 40}px)` };
    case "slide-left":
      return { opacity: progress, transform: `translateX(${(1 - progress) * 60}px)` };
    case "slide-right":
      return { opacity: progress, transform: `translateX(${(progress - 1) * 60}px)` };
    case "scale":
      return { opacity: progress, transform: `scale(${0.6 + progress * 0.4})` };
    case "rotate":
      return { opacity: progress, transform: `rotate(${(1 - progress) * 15}deg)` };
    case "bounce":
      return { opacity: progress, transform: `translateY(${(1 - progress) * 30}px) scale(${0.8 + progress * 0.2})` };
    case "typewriter":
      return { opacity: 1, clipPath: `inset(0 ${(1 - progress) * 100}% 0 0)` };
    case "blur":
      return { opacity: progress, filter: `blur(${(1 - progress) * 10}px)` };
    case "none":
    default:
      return { opacity: 1 };
  }
}

function getTransitionStyle(
  type: string,
  progress: number,
): React.CSSProperties {
  switch (type) {
    case "fade":
      return { opacity: progress };
    case "slide-left":
      return { transform: `translateX(${(1 - progress) * 100}%)` };
    case "slide-right":
      return { transform: `translateX(${(progress - 1) * 100}%)` };
    case "slide-up":
      return { transform: `translateY(${(1 - progress) * 100}%)` };
    case "zoom":
      return { opacity: progress, transform: `scale(${0.8 + progress * 0.2})` };
    case "wipe":
      return { clipPath: `inset(0 ${(1 - progress) * 100}% 0 0)` };
    case "none":
    default:
      return {};
  }
}

function getEasing(easing?: string) {
  switch (easing) {
    case "ease-in":
      return Easing.in(Easing.cubic);
    case "ease-out":
      return Easing.out(Easing.cubic);
    case "ease-in-out":
      return Easing.inOut(Easing.cubic);
    case "linear":
      return Easing.linear;
    default:
      return Easing.out(Easing.cubic);
  }
}

export default VideoComposition;
