'use client'

/**
 * Design 2: Immersive Experience
 * Inspired by: Aman Resorts, Four Seasons, Belmond, LVMH
 * Full-screen imagery, cinematic storytelling, luxury hospitality aesthetic
 */

import { useState, useEffect } from 'react'
import Image from 'next/image'
import Link from 'next/link'

export default function ImmersiveExperienceDesign() {
  const [currentSlide, setCurrentSlide] = useState(0)
  const [scrolled, setScrolled] = useState(false)

  const heroSlides = [
    {
      image: "https://images.unsplash.com/photo-1513635269975-59663e0ac1ad?w=1920",
      title: "Discover London",
      subtitle: "Through Arabian Eyes"
    },
    {
      image: "https://images.unsplash.com/photo-1566073771259-6a8506099945?w=1920",
      title: "Exceptional Stays",
      subtitle: "Curated for You"
    },
    {
      image: "https://images.unsplash.com/photo-1414235077428-338989a2e8c0?w=1920",
      title: "Culinary Excellence",
      subtitle: "Halal Fine Dining"
    }
  ]

  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentSlide((prev) => (prev + 1) % heroSlides.length)
    }, 6000)
    return () => clearInterval(timer)
  }, [heroSlides.length])

  useEffect(() => {
    const handleScroll = () => setScrolled(window.scrollY > 50)
    window.addEventListener('scroll', handleScroll)
    return () => window.removeEventListener('scroll', handleScroll)
  }, [])

  return (
    <div className="min-h-screen bg-black text-white">
      {/* Navigation - Floating Transparent */}
      <nav className={`fixed top-0 left-0 right-0 z-50 transition-all duration-500 ${
        scrolled ? 'bg-black/90 backdrop-blur-md py-4' : 'bg-transparent py-6'
      }`}>
        <div className="max-w-[1600px] mx-auto px-8 flex items-center justify-between">
          <Link href="/mock/design-2" className="flex flex-col items-center">
            <span className="text-3xl font-light tracking-[0.5em] text-white">YALLA</span>
            <span className="text-[10px] tracking-[0.4em] text-white/60 uppercase mt-1">London</span>
          </Link>

          <div className="hidden lg:flex items-center gap-12 text-sm tracking-[0.15em] uppercase">
            <a href="#" className="text-white/70 hover:text-white transition">Experiences</a>
            <a href="#" className="text-white/70 hover:text-white transition">Dining</a>
            <a href="#" className="text-white/70 hover:text-white transition">Hotels</a>
            <a href="#" className="text-white/70 hover:text-white transition">Concierge</a>
          </div>

          <div className="flex items-center gap-8">
            <button className="text-white/70 hover:text-white text-sm tracking-wide">عربي</button>
            <button className="border border-white/30 text-white px-6 py-3 text-xs tracking-[0.2em] uppercase hover:bg-white hover:text-black transition">
              Book Now
            </button>
          </div>
        </div>
      </nav>

      {/* Hero - Full Screen Slider */}
      <section className="relative h-screen">
        {heroSlides.map((slide, index) => (
          <div
            key={index}
            className={`absolute inset-0 transition-opacity duration-1000 ${
              index === currentSlide ? 'opacity-100' : 'opacity-0'
            }`}
          >
            <Image
              src={slide.image}
              alt={slide.title}
              fill
              className="object-cover"
              priority={index === 0}
            />
            <div className="absolute inset-0 bg-black/40" />
          </div>
        ))}

        {/* Hero Content */}
        <div className="absolute inset-0 flex items-center justify-center">
          <div className="text-center">
            <h1 className="text-6xl md:text-8xl font-extralight tracking-[0.2em] mb-4">
              {heroSlides[currentSlide].title}
            </h1>
            <p className="text-xl md:text-2xl font-light tracking-[0.3em] text-white/80 uppercase">
              {heroSlides[currentSlide].subtitle}
            </p>
            <button className="mt-12 border border-white/50 text-white px-10 py-4 text-sm tracking-[0.3em] uppercase hover:bg-white hover:text-black transition">
              Begin Journey
            </button>
          </div>
        </div>

        {/* Slide Indicators */}
        <div className="absolute bottom-12 left-1/2 -translate-x-1/2 flex gap-3">
          {heroSlides.map((_, index) => (
            <button
              key={index}
              onClick={() => setCurrentSlide(index)}
              className={`w-12 h-[2px] transition-all ${
                index === currentSlide ? 'bg-white' : 'bg-white/30'
              }`}
            />
          ))}
        </div>

        {/* Scroll Indicator */}
        <div className="absolute bottom-12 right-12 flex flex-col items-center gap-2">
          <span className="text-xs tracking-[0.2em] uppercase text-white/50 rotate-90 origin-center translate-y-8">
            Scroll
          </span>
          <div className="w-[1px] h-16 bg-white/30 mt-12">
            <div className="w-full h-1/3 bg-white animate-pulse" />
          </div>
        </div>
      </section>

      {/* Introduction - Cinematic Typography */}
      <section className="py-32 px-8">
        <div className="max-w-4xl mx-auto text-center">
          <span className="text-amber-500 text-sm tracking-[0.4em] uppercase">Welcome</span>
          <h2 className="text-4xl md:text-5xl font-extralight leading-relaxed mt-8 mb-8">
            Where the timeless elegance of British heritage meets the warmth of Arabian hospitality
          </h2>
          <p className="text-white/60 text-lg leading-relaxed max-w-2xl mx-auto">
            We curate extraordinary experiences for travelers who appreciate the finer things—
            thoughtfully selected, authentically halal, and delivered with impeccable attention to detail.
          </p>
        </div>
      </section>

      {/* Featured Experiences - Full Width Cards */}
      <section className="pb-32">
        <div className="max-w-[1600px] mx-auto px-8">
          {/* Experience 1 */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-0 mb-1">
            <div className="relative aspect-[4/3] lg:aspect-auto overflow-hidden">
              <Image
                src="https://images.unsplash.com/photo-1414235077428-338989a2e8c0?w=1200"
                alt="Fine Dining"
                fill
                className="object-cover hover:scale-105 transition duration-700"
              />
            </div>
            <div className="bg-neutral-900 p-12 lg:p-16 flex flex-col justify-center">
              <span className="text-amber-500 text-xs tracking-[0.3em] uppercase">Gastronomy</span>
              <h3 className="text-3xl lg:text-4xl font-light mt-4 mb-6">
                Halal Fine Dining Collection
              </h3>
              <p className="text-white/60 leading-relaxed mb-8">
                Fifteen Michelin-starred establishments, each offering dedicated halal menus crafted
                by world-renowned chefs. From Japanese omakase to French haute cuisine.
              </p>
              <a href="#" className="inline-flex items-center gap-4 text-sm tracking-[0.2em] uppercase text-amber-500 hover:text-amber-400 transition group">
                Explore Restaurants
                <svg className="w-5 h-5 group-hover:translate-x-2 transition" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M17 8l4 4m0 0l-4 4m4-4H3" />
                </svg>
              </a>
            </div>
          </div>

          {/* Experience 2 - Reversed */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-0 mb-1">
            <div className="bg-neutral-900 p-12 lg:p-16 flex flex-col justify-center order-2 lg:order-1">
              <span className="text-amber-500 text-xs tracking-[0.3em] uppercase">Residences</span>
              <h3 className="text-3xl lg:text-4xl font-light mt-4 mb-6">
                Exceptional Hotels & Suites
              </h3>
              <p className="text-white/60 leading-relaxed mb-8">
                Hand-selected properties offering Arabic-speaking concierge, halal in-room dining,
                Qibla direction, and family suites designed for extended stays.
              </p>
              <a href="#" className="inline-flex items-center gap-4 text-sm tracking-[0.2em] uppercase text-amber-500 hover:text-amber-400 transition group">
                View Properties
                <svg className="w-5 h-5 group-hover:translate-x-2 transition" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M17 8l4 4m0 0l-4 4m4-4H3" />
                </svg>
              </a>
            </div>
            <div className="relative aspect-[4/3] lg:aspect-auto overflow-hidden order-1 lg:order-2">
              <Image
                src="https://images.unsplash.com/photo-1566073771259-6a8506099945?w=1200"
                alt="Luxury Hotel"
                fill
                className="object-cover hover:scale-105 transition duration-700"
              />
            </div>
          </div>

          {/* Experience 3 */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-0">
            <div className="relative aspect-[4/3] lg:aspect-auto overflow-hidden">
              <Image
                src="https://images.unsplash.com/photo-1441986300917-64674bd600d8?w=1200"
                alt="Shopping"
                fill
                className="object-cover hover:scale-105 transition duration-700"
              />
            </div>
            <div className="bg-neutral-900 p-12 lg:p-16 flex flex-col justify-center">
              <span className="text-amber-500 text-xs tracking-[0.3em] uppercase">Lifestyle</span>
              <h3 className="text-3xl lg:text-4xl font-light mt-4 mb-6">
                Private Shopping Experiences
              </h3>
              <p className="text-white/60 leading-relaxed mb-8">
                After-hours access to Harrods, personal stylists at Selfridges, and bespoke
                shopping itineraries tailored to your preferences.
              </p>
              <a href="#" className="inline-flex items-center gap-4 text-sm tracking-[0.2em] uppercase text-amber-500 hover:text-amber-400 transition group">
                Arrange Visit
                <svg className="w-5 h-5 group-hover:translate-x-2 transition" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M17 8l4 4m0 0l-4 4m4-4H3" />
                </svg>
              </a>
            </div>
          </div>
        </div>
      </section>

      {/* Quote Section */}
      <section className="py-32 px-8 bg-gradient-to-b from-black to-neutral-900">
        <div className="max-w-4xl mx-auto text-center">
          <svg className="w-16 h-16 text-amber-500/30 mx-auto mb-8" fill="currentColor" viewBox="0 0 24 24">
            <path d="M14.017 21v-7.391c0-5.704 3.731-9.57 8.983-10.609l.995 2.151c-2.432.917-3.995 3.638-3.995 5.849h4v10h-9.983zm-14.017 0v-7.391c0-5.704 3.748-9.57 9-10.609l.996 2.151c-2.433.917-3.996 3.638-3.996 5.849h3.983v10h-9.983z" />
          </svg>
          <blockquote className="text-3xl md:text-4xl font-extralight leading-relaxed italic text-white/90">
            "The attention to our cultural needs was exceptional. Every restaurant, every hotel—
            it felt like they truly understood us."
          </blockquote>
          <p className="mt-8 text-white/50 tracking-wide">— Guest from Dubai</p>
        </div>
      </section>

      {/* Concierge CTA */}
      <section className="relative h-[70vh] flex items-center justify-center">
        <Image
          src="https://images.unsplash.com/photo-1529655683826-aba9b3e77383?w=1920"
          alt="London view"
          fill
          className="object-cover"
        />
        <div className="absolute inset-0 bg-black/60" />
        <div className="relative z-10 text-center px-8">
          <span className="text-amber-500 text-xs tracking-[0.4em] uppercase">Personal Service</span>
          <h2 className="text-4xl md:text-6xl font-extralight mt-6 mb-8 tracking-wide">
            24/7 Concierge
          </h2>
          <p className="text-white/70 text-lg max-w-xl mx-auto mb-10">
            Your dedicated Arabic-speaking concierge, available around the clock for reservations,
            recommendations, and bespoke experiences.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <button className="bg-white text-black px-10 py-4 text-sm tracking-[0.2em] uppercase hover:bg-amber-500 hover:text-white transition">
              Contact Concierge
            </button>
            <button className="border border-white/50 text-white px-10 py-4 text-sm tracking-[0.2em] uppercase hover:bg-white hover:text-black transition">
              WhatsApp
            </button>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="py-20 px-8 bg-black border-t border-white/10">
        <div className="max-w-[1600px] mx-auto">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-12 mb-16">
            <div>
              <span className="text-2xl font-light tracking-[0.4em]">YALLA</span>
              <p className="text-white/40 text-sm mt-4 leading-relaxed">
                Curating exceptional London experiences for discerning travelers.
              </p>
            </div>
            <div>
              <h4 className="text-xs tracking-[0.2em] uppercase text-white/50 mb-4">Discover</h4>
              <ul className="space-y-3 text-sm text-white/70">
                <li><a href="#" className="hover:text-white transition">Dining</a></li>
                <li><a href="#" className="hover:text-white transition">Hotels</a></li>
                <li><a href="#" className="hover:text-white transition">Experiences</a></li>
                <li><a href="#" className="hover:text-white transition">Shopping</a></li>
              </ul>
            </div>
            <div>
              <h4 className="text-xs tracking-[0.2em] uppercase text-white/50 mb-4">Services</h4>
              <ul className="space-y-3 text-sm text-white/70">
                <li><a href="#" className="hover:text-white transition">Concierge</a></li>
                <li><a href="#" className="hover:text-white transition">Airport Transfers</a></li>
                <li><a href="#" className="hover:text-white transition">Private Tours</a></li>
                <li><a href="#" className="hover:text-white transition">Event Planning</a></li>
              </ul>
            </div>
            <div>
              <h4 className="text-xs tracking-[0.2em] uppercase text-white/50 mb-4">Connect</h4>
              <ul className="space-y-3 text-sm text-white/70">
                <li><a href="#" className="hover:text-white transition">Instagram</a></li>
                <li><a href="#" className="hover:text-white transition">WhatsApp</a></li>
                <li><a href="#" className="hover:text-white transition">Newsletter</a></li>
              </ul>
            </div>
          </div>
          <div className="flex flex-col md:flex-row items-center justify-between pt-8 border-t border-white/10">
            <p className="text-white/30 text-sm">© 2025 Yalla London. All rights reserved.</p>
            <div className="flex gap-8 text-sm text-white/30 mt-4 md:mt-0">
              <a href="#" className="hover:text-white/60">Privacy</a>
              <a href="#" className="hover:text-white/60">Terms</a>
            </div>
          </div>
        </div>
      </footer>

      {/* Navigation between designs */}
      <div className="fixed bottom-8 right-8 flex gap-3">
        <Link href="/mock/design-1" className="bg-white text-black shadow-lg px-4 py-2 text-sm hover:bg-amber-500 hover:text-white transition">
          ← Design 1
        </Link>
        <Link href="/mock/design-3" className="bg-white text-black shadow-lg px-4 py-2 text-sm hover:bg-amber-500 hover:text-white transition">
          Design 3 →
        </Link>
      </div>
    </div>
  )
}
