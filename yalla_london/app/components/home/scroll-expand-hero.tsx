'use client';

import {
  useEffect,
  useRef,
  useState,
  ReactNode,
} from 'react';
import Image from 'next/image';
import { motion } from 'framer-motion';
import { ChevronDown } from 'lucide-react';

interface ScrollExpandHeroProps {
  mediaType?: 'video' | 'image';
  mediaSrc: string;
  posterSrc?: string;
  bgImageSrc: string;
  title?: string;
  subtitle?: string;
  scrollHint?: string;
  children?: ReactNode;
}

const ScrollExpandHero = ({
  mediaType = 'video',
  mediaSrc,
  posterSrc,
  bgImageSrc,
  title = 'Discover London',
  subtitle = 'Your guide to the extraordinary',
  scrollHint = 'Scroll to explore',
  children,
}: ScrollExpandHeroProps) => {
  const [scrollProgress, setScrollProgress] = useState<number>(0);
  const [showContent, setShowContent] = useState<boolean>(false);
  const [mediaFullyExpanded, setMediaFullyExpanded] = useState<boolean>(false);
  const [isMobileState, setIsMobileState] = useState<boolean>(false);

  const sectionRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    setScrollProgress(0);
    setShowContent(false);
    setMediaFullyExpanded(false);
  }, [mediaType]);

  useEffect(() => {
    // On mobile/touch devices, skip scroll-hijacking entirely — auto-expand immediately
    // This fixes the INP violation where passive:false + preventDefault() blocked ALL touch for 3s
    const isTouchDevice = window.matchMedia('(pointer: coarse)').matches || window.innerWidth < 768;
    if (isTouchDevice) {
      setScrollProgress(1);
      setMediaFullyExpanded(true);
      setShowContent(true);
      return undefined;
    }

    // Desktop-only: scroll-expand animation via wheel events (no touch listeners needed)
    const handleWheel = (e: globalThis.WheelEvent) => {
      if (mediaFullyExpanded && e.deltaY < 0 && window.scrollY <= 5) {
        setMediaFullyExpanded(false);
        e.preventDefault();
      } else if (!mediaFullyExpanded) {
        e.preventDefault();
        const scrollDelta = e.deltaY * 0.0009;
        const newProgress = Math.min(
          Math.max(scrollProgress + scrollDelta, 0),
          1
        );
        setScrollProgress(newProgress);

        if (newProgress >= 1) {
          setMediaFullyExpanded(true);
          setShowContent(true);
        } else if (newProgress < 0.75) {
          setShowContent(false);
        }
      }
    };

    window.addEventListener('wheel', handleWheel, { passive: false });

    // Auto-expand after 3s if desktop user hasn't scrolled through the hero manually
    const autoExpandTimer = setTimeout(() => {
      setScrollProgress(1);
      setMediaFullyExpanded(true);
      setShowContent(true);
    }, 3000);

    return () => {
      window.removeEventListener('wheel', handleWheel);
      clearTimeout(autoExpandTimer);
    };
  }, [scrollProgress, mediaFullyExpanded]);

  useEffect(() => {
    const checkIfMobile = (): void => {
      setIsMobileState(window.innerWidth < 768);
    };

    checkIfMobile();
    window.addEventListener('resize', checkIfMobile);

    return () => window.removeEventListener('resize', checkIfMobile);
  }, []);

  const mediaWidth = 300 + scrollProgress * (isMobileState ? 650 : 1250);
  const mediaHeight = 400 + scrollProgress * (isMobileState ? 200 : 400);
  const textTranslateX = Math.min(scrollProgress * (isMobileState ? 80 : 150), isMobileState ? 80 : 150);

  // Split title into words for animation
  const titleWords = title.split(' ');
  const firstHalf = titleWords.slice(0, Math.ceil(titleWords.length / 2)).join(' ');
  const secondHalf = titleWords.slice(Math.ceil(titleWords.length / 2)).join(' ');

  return (
    <div
      ref={sectionRef}
      className="transition-colors duration-700 ease-in-out overflow-x-hidden bg-yl-cream"
      style={!mediaFullyExpanded ? { overscrollBehavior: 'none' } : undefined}
    >
      <section className="relative flex flex-col items-center justify-start min-h-[100dvh]">
        <div className="relative w-full flex flex-col items-center min-h-[100dvh]">
          {/* Background Image with Fade */}
          <motion.div
            className="absolute inset-0 z-0 h-full"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 - scrollProgress }}
            transition={{ duration: 0.1 }}
          >
            <Image
              src={bgImageSrc}
              alt="London skyline"
              width={1920}
              height={1080}
              className="w-full h-full"
              style={{
                objectFit: 'cover',
                objectPosition: 'center',
              }}
              priority
            />
            {/* Elegant overlay with brand gradient */}
            <div className="absolute inset-0 bg-gradient-to-b from-london-900/40 via-london-900/20 to-london-900/60" />
            {/* Subtle pattern overlay */}
            <div className="absolute inset-0 bg-pattern-arabesque opacity-30" />
          </motion.div>

          <div className="container mx-auto flex flex-col items-center justify-start relative z-10">
            <div className="flex flex-col items-center justify-center w-full h-[100dvh] relative">
              {/* Expanding Media Container */}
              <div
                className="absolute z-0 top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 transition-none rounded-card overflow-hidden"
                style={{
                  width: `${mediaWidth}px`,
                  height: `${mediaHeight}px`,
                  maxWidth: '95vw',
                  maxHeight: '85vh',
                  boxShadow: '0 25px 80px rgba(200, 50, 43, 0.25), 0 10px 30px rgba(0, 0, 0, 0.2)',
                }}
              >
                {mediaType === 'video' ? (
                  mediaSrc.includes('youtube.com') ? (
                    <div className="relative w-full h-full pointer-events-none">
                      <iframe
                        width="100%"
                        height="100%"
                        src={
                          mediaSrc.includes('embed')
                            ? mediaSrc +
                              (mediaSrc.includes('?') ? '&' : '?') +
                              'autoplay=1&mute=1&loop=1&controls=0&showinfo=0&rel=0&disablekb=1&modestbranding=1'
                            : mediaSrc.replace('watch?v=', 'embed/') +
                              '?autoplay=1&mute=1&loop=1&controls=0&showinfo=0&rel=0&disablekb=1&modestbranding=1&playlist=' +
                              mediaSrc.split('v=')[1]
                        }
                        className="w-full h-full rounded-card"
                        frameBorder="0"
                        allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                        allowFullScreen
                      />
                      <div className="absolute inset-0 z-10 pointer-events-none" />
                      <motion.div
                        className="absolute inset-0 bg-london-900/30 rounded-card"
                        initial={{ opacity: 0.7 }}
                        animate={{ opacity: 0.4 - scrollProgress * 0.3 }}
                        transition={{ duration: 0.2 }}
                      />
                    </div>
                  ) : (
                    <div className="relative w-full h-full pointer-events-none">
                      <video
                        src={mediaSrc}
                        poster={posterSrc}
                        autoPlay
                        muted
                        loop
                        playsInline
                        preload="auto"
                        className="w-full h-full object-cover rounded-card"
                        controls={false}
                        disablePictureInPicture
                        disableRemotePlayback
                      />
                      <div className="absolute inset-0 z-10 pointer-events-none" />
                      <motion.div
                        className="absolute inset-0 bg-london-900/30 rounded-card"
                        initial={{ opacity: 0.7 }}
                        animate={{ opacity: 0.4 - scrollProgress * 0.3 }}
                        transition={{ duration: 0.2 }}
                      />
                    </div>
                  )
                ) : (
                  <div className="relative w-full h-full">
                    <Image
                      src={mediaSrc}
                      alt={title || 'London'}
                      width={1920}
                      height={1080}
                      className="w-full h-full object-cover rounded-card"
                      priority
                    />
                    <motion.div
                      className="absolute inset-0 bg-london-900/40 rounded-card"
                      initial={{ opacity: 0.7 }}
                      animate={{ opacity: 0.5 - scrollProgress * 0.3 }}
                      transition={{ duration: 0.2 }}
                    />
                  </div>
                )}

                {/* Scroll hint below media */}
                <motion.div
                  className="flex flex-col items-center text-center relative z-10 mt-4"
                  animate={{ opacity: 1 - scrollProgress * 2 }}
                >
                  {scrollHint && scrollProgress < 0.3 && (
                    <div className="flex flex-col items-center gap-2">
                      <p className="text-gold-400 font-medium text-sm tracking-wider uppercase">
                        {scrollHint}
                      </p>
                      <motion.div
                        animate={{ y: [0, 8, 0] }}
                        transition={{ duration: 1.5, repeat: Infinity }}
                      >
                        <ChevronDown className="w-5 h-5 text-gold-400" />
                      </motion.div>
                    </div>
                  )}
                </motion.div>
              </div>

              {/* Animated Title - Splits and moves apart */}
              <div className="flex items-center justify-center text-center gap-4 w-full relative z-10 flex-col mix-blend-normal">
                <motion.h1
                  className="text-3xl sm:text-4xl md:text-6xl lg:text-8xl font-serif font-bold text-yl-cream drop-shadow-lg"
                  style={{
                    transform: `translateX(-${textTranslateX}vw)`,
                    textShadow: '0 4px 30px rgba(200, 50, 43, 0.5)'
                  }}
                >
                  {firstHalf}
                </motion.h1>
                <motion.h1
                  className="text-3xl sm:text-4xl md:text-6xl lg:text-8xl font-serif font-bold text-center text-yl-cream drop-shadow-lg"
                  style={{
                    transform: `translateX(${textTranslateX}vw)`,
                    textShadow: '0 4px 30px rgba(200, 50, 43, 0.5)'
                  }}
                >
                  {secondHalf}
                </motion.h1>

                {/* Subtitle */}
                <motion.p
                  className="text-lg md:text-xl text-gold-300 font-light tracking-widest uppercase mt-4"
                  style={{ opacity: 1 - scrollProgress * 1.5 }}
                >
                  {subtitle}
                </motion.p>
              </div>
            </div>

            {/* Content revealed after expansion */}
            <motion.section
              className="flex flex-col w-full px-8 py-16 md:px-16 lg:py-24 bg-yl-cream"
              initial={{ opacity: 0 }}
              animate={{ opacity: showContent ? 1 : 0 }}
              transition={{ duration: 0.7 }}
            >
              {children}
            </motion.section>
          </div>
        </div>
      </section>
    </div>
  );
};

export default ScrollExpandHero;
