"use client";

/**
 * Remotion Video Player — embeddable preview player
 *
 * Uses @remotion/player to render interactive video previews
 * in the browser without server-side rendering.
 */

import React, { useCallback, useMemo, useRef, useState } from "react";
import { Player, type PlayerRef } from "@remotion/player";
import { VideoComposition } from "./video-composition";
import type { VideoTemplateConfig } from "@/lib/video/brand-video-engine";

// The Player component requires Record<string, unknown>, so we cast
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const VideoCompositionForPlayer = VideoComposition as any;
import { Button } from "@/components/ui/button";
import { Slider } from "@/components/ui/slider";
import {
  Play,
  Pause,
  SkipBack,
  SkipForward,
  Volume2,
  VolumeX,
  Maximize,
  Download,
} from "lucide-react";

interface VideoPlayerProps {
  template: VideoTemplateConfig;
  autoPlay?: boolean;
  loop?: boolean;
  showControls?: boolean;
  className?: string;
  onExport?: () => void;
}

export default function VideoPlayer({
  template,
  autoPlay = false,
  loop = true,
  showControls = true,
  className = "",
  onExport,
}: VideoPlayerProps) {
  const playerRef = useRef<PlayerRef>(null);
  const [isPlaying, setIsPlaying] = useState(autoPlay);
  const [currentFrame, setCurrentFrame] = useState(0);
  const [muted, setMuted] = useState(true);

  const inputProps = useMemo(() => ({ template }), [template]);

  const togglePlay = useCallback(() => {
    if (!playerRef.current) return;
    if (isPlaying) {
      playerRef.current.pause();
    } else {
      playerRef.current.play();
    }
    setIsPlaying(!isPlaying);
  }, [isPlaying]);

  const seekToStart = useCallback(() => {
    playerRef.current?.seekTo(0);
    setCurrentFrame(0);
  }, []);

  const seekToEnd = useCallback(() => {
    playerRef.current?.seekTo(template.durationFrames - 1);
    setCurrentFrame(template.durationFrames - 1);
  }, [template.durationFrames]);

  const handleFrameUpdate = useCallback((e: { detail: { frame: number } }) => {
    setCurrentFrame(e.detail.frame);
  }, []);

  const currentTime = (currentFrame / template.fps).toFixed(1);
  const totalTime = (template.durationFrames / template.fps).toFixed(1);

  // Determine player aspect ratio / size
  const isVertical = template.height > template.width;
  const maxHeight = isVertical ? 600 : 400;
  const aspectRatio = template.width / template.height;
  const playerWidth = isVertical ? maxHeight * aspectRatio : maxHeight * aspectRatio;
  const playerHeight = maxHeight;

  return (
    <div className={`flex flex-col items-center gap-3 ${className}`}>
      {/* Player */}
      <div
        className="relative bg-black rounded-lg overflow-hidden shadow-xl"
        style={{
          width: Math.min(playerWidth, 600),
          height: Math.min(playerHeight, 600),
        }}
      >
        <Player
          ref={playerRef}
          component={VideoCompositionForPlayer}
          inputProps={inputProps}
          durationInFrames={template.durationFrames}
          compositionWidth={template.width}
          compositionHeight={template.height}
          fps={template.fps}
          autoPlay={autoPlay}
          loop={loop}
          style={{ width: "100%", height: "100%" }}
          controls={false}
        />
      </div>

      {/* Controls */}
      {showControls && (
        <div className="flex items-center gap-2 w-full max-w-[600px] px-2">
          {/* Playback */}
          <Button variant="ghost" size="icon" className="h-8 w-8" onClick={seekToStart}>
            <SkipBack className="w-4 h-4" />
          </Button>
          <Button variant="ghost" size="icon" className="h-8 w-8" onClick={togglePlay}>
            {isPlaying ? <Pause className="w-4 h-4" /> : <Play className="w-4 h-4" />}
          </Button>
          <Button variant="ghost" size="icon" className="h-8 w-8" onClick={seekToEnd}>
            <SkipForward className="w-4 h-4" />
          </Button>

          {/* Timeline */}
          <div className="flex-1 flex items-center gap-2">
            <span className="text-xs text-muted-foreground w-10 text-right">
              {currentTime}s
            </span>
            <Slider
              value={[currentFrame]}
              min={0}
              max={template.durationFrames - 1}
              step={1}
              onValueChange={([v]) => {
                playerRef.current?.seekTo(v);
                setCurrentFrame(v);
              }}
              className="flex-1"
            />
            <span className="text-xs text-muted-foreground w-10">
              {totalTime}s
            </span>
          </div>

          {/* Mute */}
          <Button
            variant="ghost"
            size="icon"
            className="h-8 w-8"
            onClick={() => {
              setMuted(!muted);
              if (playerRef.current) {
                playerRef.current.setVolume(muted ? 1 : 0);
              }
            }}
          >
            {muted ? <VolumeX className="w-4 h-4" /> : <Volume2 className="w-4 h-4" />}
          </Button>

          {/* Export */}
          {onExport && (
            <Button variant="ghost" size="icon" className="h-8 w-8" onClick={onExport}>
              <Download className="w-4 h-4" />
            </Button>
          )}
        </div>
      )}

      {/* Info bar */}
      <div className="flex items-center gap-4 text-xs text-muted-foreground">
        <span>{template.width}x{template.height}</span>
        <span>{template.fps} fps</span>
        <span>{totalTime}s</span>
        <span className="capitalize">{template.format.replace("-", " ")}</span>
      </div>
    </div>
  );
}
