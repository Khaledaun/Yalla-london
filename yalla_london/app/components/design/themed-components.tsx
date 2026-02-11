'use client'

import React from 'react'
import { motion } from 'framer-motion'
import type { DestinationTheme } from '@/lib/design/destination-themes'
import type { AnimationPreset } from '@/lib/design/animation-presets'

// ═══════════════════════════════════════════════════════
//  THEMED HERO SECTION
// ═══════════════════════════════════════════════════════

interface ThemedHeroProps {
  theme: DestinationTheme
  anim: AnimationPreset
  title: string
  titleAr?: string
  subtitle?: string
  subtitleAr?: string
  backgroundImage?: string
  ctaLabel?: string
  ctaHref?: string
  locale?: 'en' | 'ar'
}

export function ThemedHero({
  theme, anim, title, titleAr, subtitle, subtitleAr,
  backgroundImage, ctaLabel, ctaHref, locale = 'en'
}: ThemedHeroProps) {
  const isRTL = locale === 'ar'
  const displayTitle = isRTL && titleAr ? titleAr : title
  const displaySubtitle = isRTL && subtitleAr ? subtitleAr : subtitle

  return (
    <section
      className="relative w-full min-h-[70vh] flex items-center justify-center overflow-hidden"
      style={{ background: backgroundImage ? undefined : theme.gradients.hero }}
      dir={isRTL ? 'rtl' : 'ltr'}
    >
      {backgroundImage && (
        <>
          <div
            className="absolute inset-0 bg-cover bg-center"
            style={{ backgroundImage: `url(${backgroundImage})` }}
          />
          <div
            className="absolute inset-0"
            style={{ background: theme.gradients.overlay }}
          />
        </>
      )}

      <div className="relative z-10 text-center px-6 max-w-4xl mx-auto">
        <motion.h1
          initial={anim.entrance.hidden}
          animate={anim.entrance.visible}
          transition={anim.entrance.transition}
          className="text-4xl md:text-6xl lg:text-7xl font-bold leading-tight mb-6"
          style={{
            fontFamily: `'${isRTL ? theme.typography.displayFontAr : theme.typography.displayFont}', serif`,
            color: theme.colors.textOnPrimary,
            fontWeight: theme.typography.headingWeight,
            letterSpacing: theme.typography.letterSpacing.tight,
          }}
        >
          {displayTitle}
        </motion.h1>

        {displaySubtitle && (
          <motion.p
            initial={{ ...anim.entrance.hidden, y: 40 }}
            animate={anim.entrance.visible}
            transition={{ ...anim.entrance.transition, delay: 0.2 }}
            className="text-lg md:text-xl mb-8 max-w-2xl mx-auto"
            style={{
              fontFamily: `'${isRTL ? theme.typography.bodyFontAr : theme.typography.bodyFont}', sans-serif`,
              color: `${theme.colors.textOnPrimary}CC`,
            }}
          >
            {displaySubtitle}
          </motion.p>
        )}

        {ctaLabel && (
          <motion.a
            href={ctaHref || '#'}
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ ...anim.entrance.transition, delay: 0.4 }}
            whileHover={anim.hover}
            className="inline-block px-8 py-4 font-semibold text-base rounded-full transition-all"
            style={{
              background: theme.gradients.cta,
              color: theme.colors.textOnSecondary,
              boxShadow: theme.shadows.button,
              borderRadius: theme.shape.borderRadius.full,
              fontFamily: `'${theme.typography.bodyFont}', sans-serif`,
            }}
          >
            {ctaLabel}
          </motion.a>
        )}
      </div>

      {/* Decorative pattern */}
      {theme.patterns.backgroundTexture && (
        <div
          className="absolute inset-0 pointer-events-none"
          style={{ background: theme.patterns.backgroundTexture }}
        />
      )}
    </section>
  )
}

// ═══════════════════════════════════════════════════════
//  THEMED CONTENT CARD
// ═══════════════════════════════════════════════════════

interface ThemedCardProps {
  theme: DestinationTheme
  anim: AnimationPreset
  title: string
  titleAr?: string
  description?: string
  descriptionAr?: string
  image?: string
  tag?: string
  href?: string
  locale?: 'en' | 'ar'
  index?: number
}

export function ThemedCard({
  theme, anim, title, titleAr, description, descriptionAr,
  image, tag, href, locale = 'en', index = 0
}: ThemedCardProps) {
  const isRTL = locale === 'ar'
  const displayTitle = isRTL && titleAr ? titleAr : title
  const displayDesc = isRTL && descriptionAr ? descriptionAr : description

  const Wrapper = href ? motion.a : motion.div
  const wrapperProps = href ? { href } : {}

  return (
    <Wrapper
      {...wrapperProps}
      initial={anim.entrance.hidden}
      whileInView={anim.entrance.visible}
      viewport={{ once: true, margin: '-50px' }}
      transition={{ ...anim.entrance.transition, delay: index * anim.stagger.staggerChildren }}
      whileHover={anim.hover}
      className="group block overflow-hidden cursor-pointer"
      style={{
        borderRadius: theme.shape.borderRadius.lg,
        boxShadow: theme.shadows.card,
        background: theme.colors.surface,
        border: `${theme.shape.borderWidth} ${theme.shape.borderStyle} ${theme.colors.border}`,
      }}
      dir={isRTL ? 'rtl' : 'ltr'}
    >
      {/* Image */}
      {image && (
        <div className="relative aspect-[16/10] overflow-hidden">
          <div
            className="w-full h-full bg-cover bg-center transition-transform duration-500 group-hover:scale-105"
            style={{ backgroundImage: `url(${image})` }}
          />
          <div
            className="absolute inset-0"
            style={{ background: theme.gradients.card }}
          />
          {tag && (
            <span
              className="absolute top-4 left-4 px-3 py-1 text-xs font-semibold uppercase tracking-wider"
              style={{
                background: theme.colors.secondary,
                color: theme.colors.textOnSecondary,
                borderRadius: theme.shape.borderRadius.full,
                letterSpacing: theme.typography.letterSpacing.wide,
                fontFamily: `'${theme.typography.bodyFont}', sans-serif`,
              }}
            >
              {tag}
            </span>
          )}
        </div>
      )}

      {/* Content */}
      <div className="p-5">
        <h3
          className="text-lg font-bold mb-2 line-clamp-2"
          style={{
            fontFamily: `'${isRTL ? theme.typography.headingFontAr : theme.typography.headingFont}', serif`,
            color: theme.colors.text,
            fontWeight: theme.typography.headingWeight,
          }}
        >
          {displayTitle}
        </h3>
        {displayDesc && (
          <p
            className="text-sm line-clamp-3"
            style={{
              fontFamily: `'${isRTL ? theme.typography.bodyFontAr : theme.typography.bodyFont}', sans-serif`,
              color: theme.colors.textMuted,
            }}
          >
            {displayDesc}
          </p>
        )}
      </div>
    </Wrapper>
  )
}

// ═══════════════════════════════════════════════════════
//  THEMED SECTION WRAPPER
// ═══════════════════════════════════════════════════════

interface ThemedSectionProps {
  theme: DestinationTheme
  anim: AnimationPreset
  title: string
  titleAr?: string
  subtitle?: string
  subtitleAr?: string
  children: React.ReactNode
  variant?: 'default' | 'muted' | 'primary'
  locale?: 'en' | 'ar'
}

export function ThemedSection({
  theme, anim, title, titleAr, subtitle, subtitleAr,
  children, variant = 'default', locale = 'en'
}: ThemedSectionProps) {
  const isRTL = locale === 'ar'
  const displayTitle = isRTL && titleAr ? titleAr : title
  const displaySubtitle = isRTL && subtitleAr ? subtitleAr : subtitle

  const bg = variant === 'muted'
    ? theme.gradients.subtle
    : variant === 'primary'
      ? theme.gradients.hero
      : theme.colors.background

  const textColor = variant === 'primary' ? theme.colors.textOnPrimary : theme.colors.text
  const mutedColor = variant === 'primary' ? `${theme.colors.textOnPrimary}99` : theme.colors.textMuted

  return (
    <section
      className="py-16 md:py-24 px-6"
      style={{ background: bg }}
      dir={isRTL ? 'rtl' : 'ltr'}
    >
      <div className="max-w-6xl mx-auto">
        {/* Decorative line */}
        <motion.div
          initial={{ scaleX: 0 }}
          whileInView={{ scaleX: 1 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6, ease: [0.4, 0, 0.2, 1] }}
          className="w-20 h-1 mb-6 origin-left"
          style={{ background: theme.patterns.decorativeBorder }}
        />

        <motion.h2
          initial={anim.scrollReveal.hidden}
          whileInView={anim.scrollReveal.visible}
          viewport={{ once: true }}
          transition={anim.scrollReveal.transition}
          className="text-3xl md:text-4xl font-bold mb-4"
          style={{
            fontFamily: `'${isRTL ? theme.typography.headingFontAr : theme.typography.headingFont}', serif`,
            color: textColor,
            fontWeight: theme.typography.headingWeight,
          }}
        >
          {displayTitle}
        </motion.h2>

        {displaySubtitle && (
          <motion.p
            initial={anim.scrollReveal.hidden}
            whileInView={anim.scrollReveal.visible}
            viewport={{ once: true }}
            transition={{ ...anim.scrollReveal.transition, delay: 0.1 }}
            className="text-lg mb-12 max-w-2xl"
            style={{
              fontFamily: `'${isRTL ? theme.typography.bodyFontAr : theme.typography.bodyFont}', sans-serif`,
              color: mutedColor,
            }}
          >
            {displaySubtitle}
          </motion.p>
        )}

        {children}
      </div>
    </section>
  )
}

// ═══════════════════════════════════════════════════════
//  THEMED CTA BUTTON
// ═══════════════════════════════════════════════════════

interface ThemedButtonProps {
  theme: DestinationTheme
  anim: AnimationPreset
  label: string
  labelAr?: string
  href?: string
  onClick?: () => void
  variant?: 'primary' | 'secondary' | 'outline'
  size?: 'sm' | 'md' | 'lg'
  locale?: 'en' | 'ar'
}

export function ThemedButton({
  theme, anim, label, labelAr, href, onClick,
  variant = 'primary', size = 'md', locale = 'en'
}: ThemedButtonProps) {
  const isRTL = locale === 'ar'
  const displayLabel = isRTL && labelAr ? labelAr : label

  const sizeClasses = {
    sm: 'px-4 py-2 text-sm',
    md: 'px-6 py-3 text-base',
    lg: 'px-8 py-4 text-lg',
  }

  const styles: React.CSSProperties = variant === 'primary'
    ? {
        background: theme.gradients.cta,
        color: theme.colors.textOnSecondary,
        boxShadow: theme.shadows.button,
      }
    : variant === 'secondary'
      ? {
          background: theme.colors.primary,
          color: theme.colors.textOnPrimary,
        }
      : {
          background: 'transparent',
          color: theme.colors.primary,
          border: `2px solid ${theme.colors.primary}`,
        }

  const Component = href ? motion.a : motion.button

  return (
    <Component
      href={href}
      onClick={onClick}
      whileHover={anim.hover}
      whileTap={{ scale: 0.97 }}
      className={`inline-flex items-center justify-center font-semibold transition-all ${sizeClasses[size]}`}
      style={{
        ...styles,
        borderRadius: theme.shape.borderRadius.full,
        fontFamily: `'${isRTL ? theme.typography.bodyFontAr : theme.typography.bodyFont}', sans-serif`,
      }}
    >
      {displayLabel}
    </Component>
  )
}

// ═══════════════════════════════════════════════════════
//  THEMED FEATURE GRID
// ═══════════════════════════════════════════════════════

interface ThemedFeatureProps {
  theme: DestinationTheme
  anim: AnimationPreset
  icon: React.ReactNode
  title: string
  titleAr?: string
  description: string
  descriptionAr?: string
  locale?: 'en' | 'ar'
  index?: number
}

export function ThemedFeature({
  theme, anim, icon, title, titleAr, description, descriptionAr,
  locale = 'en', index = 0
}: ThemedFeatureProps) {
  const isRTL = locale === 'ar'
  const displayTitle = isRTL && titleAr ? titleAr : title
  const displayDesc = isRTL && descriptionAr ? descriptionAr : description

  return (
    <motion.div
      initial={anim.entrance.hidden}
      whileInView={anim.entrance.visible}
      viewport={{ once: true }}
      transition={{ ...anim.entrance.transition, delay: index * anim.stagger.staggerChildren }}
      whileHover={anim.hover}
      className="p-6 text-center"
      style={{
        borderRadius: theme.shape.borderRadius.lg,
        background: theme.colors.surface,
        border: `${theme.shape.borderWidth} ${theme.shape.borderStyle} ${theme.colors.border}`,
        boxShadow: theme.shadows.card,
      }}
      dir={isRTL ? 'rtl' : 'ltr'}
    >
      <div
        className="w-14 h-14 mx-auto mb-4 flex items-center justify-center rounded-full"
        style={{
          background: `${theme.colors.primary}15`,
          color: theme.colors.primary,
        }}
      >
        {icon}
      </div>
      <h3
        className="text-base font-bold mb-2"
        style={{
          fontFamily: `'${isRTL ? theme.typography.headingFontAr : theme.typography.headingFont}', serif`,
          color: theme.colors.text,
        }}
      >
        {displayTitle}
      </h3>
      <p
        className="text-sm"
        style={{
          fontFamily: `'${isRTL ? theme.typography.bodyFontAr : theme.typography.bodyFont}', sans-serif`,
          color: theme.colors.textMuted,
        }}
      >
        {displayDesc}
      </p>
    </motion.div>
  )
}

// ═══════════════════════════════════════════════════════
//  THEMED TESTIMONIAL
// ═══════════════════════════════════════════════════════

interface ThemedTestimonialProps {
  theme: DestinationTheme
  anim: AnimationPreset
  quote: string
  quoteAr?: string
  author: string
  role?: string
  avatar?: string
  locale?: 'en' | 'ar'
}

export function ThemedTestimonial({
  theme, anim, quote, quoteAr, author, role, avatar, locale = 'en'
}: ThemedTestimonialProps) {
  const isRTL = locale === 'ar'
  const displayQuote = isRTL && quoteAr ? quoteAr : quote

  return (
    <motion.blockquote
      initial={anim.scrollReveal.hidden}
      whileInView={anim.scrollReveal.visible}
      viewport={{ once: true }}
      transition={anim.scrollReveal.transition}
      className="p-8 relative"
      style={{
        borderRadius: theme.shape.borderRadius.xl,
        background: theme.colors.surface,
        boxShadow: theme.shadows.elevated,
        borderLeft: isRTL ? 'none' : `4px solid ${theme.colors.secondary}`,
        borderRight: isRTL ? `4px solid ${theme.colors.secondary}` : 'none',
      }}
      dir={isRTL ? 'rtl' : 'ltr'}
    >
      <p
        className="text-lg italic mb-6"
        style={{
          fontFamily: `'${isRTL ? theme.typography.headingFontAr : theme.typography.headingFont}', serif`,
          color: theme.colors.text,
        }}
      >
        &ldquo;{displayQuote}&rdquo;
      </p>
      <footer className="flex items-center gap-3">
        {avatar ? (
          <div
            className="w-10 h-10 rounded-full bg-cover bg-center"
            style={{ backgroundImage: `url(${avatar})` }}
          />
        ) : (
          <div
            className="w-10 h-10 rounded-full flex items-center justify-center font-bold text-sm"
            style={{ background: theme.colors.primary, color: theme.colors.textOnPrimary }}
          >
            {author.charAt(0)}
          </div>
        )}
        <div>
          <cite className="not-italic font-semibold text-sm" style={{ color: theme.colors.text }}>
            {author}
          </cite>
          {role && (
            <p className="text-xs" style={{ color: theme.colors.textMuted }}>{role}</p>
          )}
        </div>
      </footer>
    </motion.blockquote>
  )
}

// ═══════════════════════════════════════════════════════
//  THEMED BADGE / TAG
// ═══════════════════════════════════════════════════════

interface ThemedBadgeProps {
  theme: DestinationTheme
  label: string
  variant?: 'primary' | 'secondary' | 'accent' | 'outline'
}

export function ThemedBadge({ theme, label, variant = 'primary' }: ThemedBadgeProps) {
  const styles: React.CSSProperties = variant === 'primary'
    ? { background: theme.colors.primary, color: theme.colors.textOnPrimary }
    : variant === 'secondary'
      ? { background: theme.colors.secondary, color: theme.colors.textOnSecondary }
      : variant === 'accent'
        ? { background: `${theme.colors.accent}20`, color: theme.colors.accent }
        : { background: 'transparent', color: theme.colors.primary, border: `1px solid ${theme.colors.primary}` }

  return (
    <span
      className="inline-block px-3 py-1 text-xs font-semibold uppercase tracking-wider"
      style={{
        ...styles,
        borderRadius: theme.shape.borderRadius.full,
        letterSpacing: theme.typography.letterSpacing.wide,
        fontFamily: `'${theme.typography.bodyFont}', sans-serif`,
      }}
    >
      {label}
    </span>
  )
}
