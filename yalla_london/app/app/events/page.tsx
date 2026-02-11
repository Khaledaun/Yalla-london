"use client";

import { useState, useEffect } from "react";
import Image from "next/image";
import Link from "next/link";
import { useLanguage } from "@/components/language-provider";
import { getTranslation } from "@/lib/i18n";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import {
  ArrowRight,
  MapPin,
  Calendar,
  Clock,
  Star,
  ExternalLink,
  Ticket,
  Search,
  Tag,
  Loader2,
} from "lucide-react";
import { motion } from "framer-motion";

interface EventItem {
  id: string | number;
  title: { en: string; ar: string };
  description: { en: string; ar: string };
  date: string;
  time: string;
  venue: string;
  category: string;
  price: string;
  image: string;
  rating: number;
  bookingUrl: string;
  affiliateTag?: string;
  ticketProvider?: string;
  vipAvailable?: boolean;
  soldOut?: boolean;
}

// Fallback events shown only when DB has no events yet
const FALLBACK_EVENTS: EventItem[] = [
  {
    id: "fallback-1",
    title: {
      en: "Arsenal vs Chelsea - Premier League",
      ar: "\u0623\u0631\u0633\u0646\u0627\u0644 \u0636\u062f \u062a\u0634\u064a\u0644\u0633\u064a - \u0627\u0644\u062f\u0648\u0631\u064a \u0627\u0644\u0625\u0646\u062c\u0644\u064a\u0632\u064a \u0627\u0644\u0645\u0645\u062a\u0627\u0632",
    },
    description: {
      en: "Experience the North London derby at the iconic Emirates Stadium with VIP hospitality packages.",
      ar: "\u0627\u062e\u062a\u0628\u0631 \u062f\u064a\u0631\u0628\u064a \u0634\u0645\u0627\u0644 \u0644\u0646\u062f\u0646 \u0641\u064a \u0627\u0633\u062a\u0627\u062f \u0627\u0644\u0625\u0645\u0627\u0631\u0627\u062a \u0627\u0644\u0623\u064a\u0642\u0648\u0646\u064a \u0645\u0639 \u0628\u0627\u0642\u0627\u062a \u0627\u0644\u0636\u064a\u0627\u0641\u0629 VIP.",
    },
    date: "2026-03-15",
    time: "15:00",
    venue: "Emirates Stadium",
    category: "Football",
    price: "From \u00a3120",
    image:
      "https://images.unsplash.com/photo-1574629810360-7efbbe195018?w=800&h=600&fit=crop",
    rating: 4.9,
    bookingUrl: "https://www.stubhub.co.uk/arsenal-tickets/performer/2161/",
    affiliateTag: "stubhub",
    ticketProvider: "StubHub",
    vipAvailable: true,
  },
  {
    id: "fallback-2",
    title: {
      en: "The Lion King - Musical Theatre",
      ar: "\u0627\u0644\u0623\u0633\u062f \u0627\u0644\u0645\u0644\u0643 - \u0645\u0633\u0631\u062d \u0645\u0648\u0633\u064a\u0642\u064a",
    },
    description: {
      en: "The award-winning musical that brings the Pride Lands to life with stunning costumes and music.",
      ar: "\u0627\u0644\u0645\u0633\u0631\u062d\u064a\u0629 \u0627\u0644\u0645\u0648\u0633\u064a\u0642\u064a\u0629 \u0627\u0644\u062d\u0627\u0626\u0632\u0629 \u0639\u0644\u0649 \u062c\u0648\u0627\u0626\u0632.",
    },
    date: "2026-03-20",
    time: "19:30",
    venue: "Lyceum Theatre",
    category: "Theatre",
    price: "From \u00a345",
    image:
      "https://images.unsplash.com/photo-1503095396549-807759245b35?w=800&h=600&fit=crop",
    rating: 4.8,
    bookingUrl:
      "https://www.ticketmaster.co.uk/the-lion-king-tickets/artist/805987",
    affiliateTag: "ticketmaster",
    ticketProvider: "Ticketmaster",
    vipAvailable: true,
  },
  {
    id: "fallback-3",
    title: {
      en: "Thames Luxury Dinner Cruise",
      ar: "\u0631\u062d\u0644\u0629 \u0639\u0634\u0627\u0621 \u0641\u0627\u062e\u0631\u0629 \u0639\u0644\u0649 \u0646\u0647\u0631 \u0627\u0644\u062a\u0627\u064a\u0645\u0632",
    },
    description: {
      en: "Fine dining on the Thames with views of Tower Bridge, Big Ben, and the London Eye. Halal menu available.",
      ar: "\u0639\u0634\u0627\u0621 \u0641\u0627\u062e\u0631 \u0639\u0644\u0649 \u0627\u0644\u062a\u0627\u064a\u0645\u0632 \u0645\u0639 \u0625\u0637\u0644\u0627\u0644\u0629 \u0639\u0644\u0649 \u062a\u0627\u0648\u0631 \u0628\u0631\u064a\u062f\u062c \u0648\u0628\u064a\u062c \u0628\u0646 \u0648\u0644\u0646\u062f\u0646 \u0622\u064a.",
    },
    date: "2026-03-22",
    time: "19:00",
    venue: "Westminster Pier",
    category: "Experience",
    price: "From \u00a389",
    image:
      "https://images.unsplash.com/photo-1513635269975-59663e0ac1ad?w=800&h=600&fit=crop",
    rating: 4.7,
    bookingUrl: "https://www.viator.com/London/d737",
    affiliateTag: "viator",
    ticketProvider: "Viator",
    vipAvailable: true,
  },
];

const DEFAULT_CATEGORIES = [
  "All",
  "Football",
  "Theatre",
  "Festival",
  "Exhibition",
  "Experience",
];

export default function EventsPage() {
  const { language, isRTL } = useLanguage();
  const t = (key: string) => getTranslation(language, key);
  const [selectedCategory, setSelectedCategory] = useState("All");
  const [searchQuery, setSearchQuery] = useState("");
  const [showVipOnly, setShowVipOnly] = useState(false);
  const [events, setEvents] = useState<EventItem[]>([]);
  const [categories, setCategories] = useState<string[]>(DEFAULT_CATEGORIES);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchEvents() {
      try {
        const res = await fetch("/api/events");
        if (res.ok) {
          const data = await res.json();
          if (data.events && data.events.length > 0) {
            setEvents(data.events);
            if (data.categories?.length > 1) {
              setCategories(data.categories);
            }
          } else {
            // No events in DB yet - use fallback
            setEvents(FALLBACK_EVENTS);
          }
        } else {
          setEvents(FALLBACK_EVENTS);
        }
      } catch {
        setEvents(FALLBACK_EVENTS);
      } finally {
        setLoading(false);
      }
    }
    fetchEvents();
  }, []);

  const filteredEvents = events.filter((event) => {
    const matchesCategory =
      selectedCategory === "All" || event.category === selectedCategory;
    const matchesSearch =
      searchQuery === "" ||
      event.title[language]
        ?.toLowerCase()
        .includes(searchQuery.toLowerCase()) ||
      event.venue.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesVip = !showVipOnly || event.vipAvailable;
    return matchesCategory && matchesSearch && matchesVip;
  });

  const categoryColors: Record<string, string> = {
    Football: "bg-green-100 text-green-800",
    Theatre: "bg-purple-100 text-purple-800",
    Festival: "bg-pink-100 text-pink-800",
    Exhibition: "bg-blue-100 text-blue-800",
    Experience: "bg-amber-100 text-amber-800",
  };

  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr);
    return language === "en"
      ? date.toLocaleDateString("en-GB", {
          weekday: "long",
          year: "numeric",
          month: "long",
          day: "numeric",
        })
      : date.toLocaleDateString("ar-SA", {
          weekday: "long",
          year: "numeric",
          month: "long",
          day: "numeric",
        });
  };

  const handleBooking = (event: EventItem) => {
    if (typeof window !== "undefined") {
      try {
        fetch("/api/analytics/track", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            event: "affiliate_click",
            category: "events",
            label: event.title.en,
            provider: event.ticketProvider,
            affiliateTag: event.affiliateTag,
          }),
        }).catch(() => {});
      } catch {}
      window.open(event.bookingUrl, "_blank", "noopener,noreferrer");
    }
  };

  return (
    <div className={`${isRTL ? "rtl" : "ltr"}`}>
      {/* Hero Section */}
      <section className="relative h-96 flex items-center justify-center overflow-hidden">
        <div className="absolute inset-0">
          <Image
            src="https://images.unsplash.com/photo-1514525253161-7a46d19cd819?w=1200&h=800&fit=crop"
            alt="London Events"
            fill
            className="object-cover"
            priority
          />
          <div className="absolute inset-0 bg-black/50" />
        </div>
        <motion.div
          className="relative z-10 text-center text-white px-6 max-w-4xl mx-auto"
          initial={{ opacity: 0, y: 50 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 1 }}
        >
          <h1 className="text-4xl sm:text-5xl md:text-6xl font-bold mb-6">
            {language === "en"
              ? "London Events & Tickets"
              : "\u0641\u0639\u0627\u0644\u064a\u0627\u062a \u0648\u062a\u0630\u0627\u0643\u0631 \u0644\u0646\u062f\u0646"}
          </h1>
          <p className="text-xl md:text-2xl text-gray-200">
            {language === "en"
              ? "Book premium tickets for the best London experiences"
              : "\u0627\u062d\u062c\u0632 \u062a\u0630\u0627\u0643\u0631 \u0645\u0645\u064a\u0632\u0629 \u0644\u0623\u0641\u0636\u0644 \u062a\u062c\u0627\u0631\u0628 \u0644\u0646\u062f\u0646"}
          </p>
          <div className="flex items-center justify-center gap-4 mt-6">
            <Badge className="bg-white/20 text-white text-sm px-4 py-1">
              <Ticket className="h-4 w-4 mr-1" />
              {language === "en"
                ? "Verified Tickets"
                : "\u062a\u0630\u0627\u0643\u0631 \u0645\u0639\u062a\u0645\u062f\u0629"}
            </Badge>
            <Badge className="bg-white/20 text-white text-sm px-4 py-1">
              <Star className="h-4 w-4 mr-1" />
              {language === "en"
                ? "VIP Packages"
                : "\u0628\u0627\u0642\u0627\u062a VIP"}
            </Badge>
          </div>
        </motion.div>
      </section>

      {/* Search & Filter Bar */}
      <section className="bg-white border-b sticky top-0 z-20">
        <div className="max-w-6xl mx-auto px-4 md:px-6 py-4">
          <div className="flex flex-col md:flex-row gap-4 items-center">
            <div className="relative flex-1 w-full">
              <Search className={`absolute ${isRTL ? 'right-3' : 'left-3'} top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400`} />
              <Input
                placeholder={
                  language === "en"
                    ? "Search events, venues..."
                    : "\u0627\u0628\u062d\u062b \u0639\u0646 \u0641\u0639\u0627\u0644\u064a\u0627\u062a\u060c \u0623\u0645\u0627\u0643\u0646..."
                }
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10"
              />
            </div>
            <div className="flex gap-2 flex-wrap">
              {categories.map((cat) => (
                <Button
                  key={cat}
                  variant={selectedCategory === cat ? "default" : "outline"}
                  size="sm"
                  onClick={() => setSelectedCategory(cat)}
                  className={
                    selectedCategory === cat
                      ? "bg-purple-800 hover:bg-purple-900"
                      : ""
                  }
                >
                  {cat === "All"
                    ? language === "en"
                      ? "All"
                      : "\u0627\u0644\u0643\u0644"
                    : cat}
                </Button>
              ))}
              <Button
                variant={showVipOnly ? "default" : "outline"}
                size="sm"
                onClick={() => setShowVipOnly(!showVipOnly)}
                className={
                  showVipOnly ? "bg-yellow-600 hover:bg-yellow-700" : ""
                }
              >
                <Star className="h-3 w-3 mr-1" /> VIP
              </Button>
            </div>
          </div>
        </div>
      </section>

      {/* Events Grid */}
      <section className="py-12 bg-gray-50">
        <div className="max-w-6xl mx-auto px-6">
          <div className="flex items-center justify-between mb-8">
            <h2 className="text-2xl font-bold text-gray-900">
              {loading
                ? language === "en"
                  ? "Loading Events..."
                  : "\u062c\u0627\u0631\u064a \u062a\u062d\u0645\u064a\u0644 \u0627\u0644\u0641\u0639\u0627\u0644\u064a\u0627\u062a..."
                : language === "en"
                  ? `${filteredEvents.length} Events Available`
                  : `${filteredEvents.length} \u0641\u0639\u0627\u0644\u064a\u0629 \u0645\u062a\u0627\u062d\u0629`}
            </h2>
            <div className="flex items-center gap-2 text-sm text-gray-500">
              <Tag className="h-4 w-4" />
              {language === "en"
                ? "Powered by trusted ticket partners"
                : "\u0645\u062f\u0639\u0648\u0645 \u0645\u0646 \u0634\u0631\u0643\u0627\u0621 \u0627\u0644\u062a\u0630\u0627\u0643\u0631 \u0627\u0644\u0645\u0648\u062b\u0648\u0642\u064a\u0646"}
            </div>
          </div>

          {loading ? (
            <div className="text-center py-20">
              <Loader2 className="h-8 w-8 animate-spin mx-auto text-purple-600 mb-4" />
              <p className="text-gray-500">
                {language === "en"
                  ? "Loading events..."
                  : "\u062c\u0627\u0631\u064a \u062a\u062d\u0645\u064a\u0644 \u0627\u0644\u0641\u0639\u0627\u0644\u064a\u0627\u062a..."}
              </p>
            </div>
          ) : filteredEvents.length === 0 ? (
            <div className="text-center py-20">
              <p className="text-gray-500 text-lg">
                {language === "en"
                  ? "No events match your filters"
                  : "\u0644\u0627 \u062a\u0648\u062c\u062f \u0641\u0639\u0627\u0644\u064a\u0627\u062a \u062a\u0637\u0627\u0628\u0642 \u0627\u0644\u062a\u0635\u0641\u064a\u0629"}
              </p>
              <Button
                variant="outline"
                className="mt-4"
                onClick={() => {
                  setSelectedCategory("All");
                  setSearchQuery("");
                  setShowVipOnly(false);
                }}
              >
                {language === "en"
                  ? "Clear Filters"
                  : "\u0645\u0633\u062d \u0627\u0644\u062a\u0635\u0641\u064a\u0629"}
              </Button>
            </div>
          ) : (
            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
              {filteredEvents.map((event, index) => (
                <motion.div
                  key={event.id}
                  initial={{ opacity: 0, y: 30 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true }}
                  transition={{ duration: 0.6, delay: index * 0.1 }}
                  whileHover={{ scale: 1.02 }}
                >
                  <Card className="overflow-hidden border-0 luxury-shadow hover:shadow-xl transition-all duration-300 bg-white h-full flex flex-col">
                    <div className="relative aspect-video">
                      <Image
                        src={
                          event.image ||
                          "https://images.unsplash.com/photo-1514525253161-7a46d19cd819?w=800&h=600&fit=crop"
                        }
                        alt={event.title[language] || event.title.en}
                        fill
                        sizes="(max-width: 768px) 100vw, (max-width: 1024px) 50vw, 33vw"
                        className="object-cover"
                      />
                      <div className={`absolute top-4 ${isRTL ? 'right-4' : 'left-4'} flex gap-2`}
                        <Badge
                          className={
                            categoryColors[event.category] ||
                            "bg-gray-100 text-gray-800"
                          }
                        >
                          {event.category}
                        </Badge>
                        {event.vipAvailable && (
                          <Badge className="bg-yellow-500 text-white">
                            VIP
                          </Badge>
                        )}
                      </div>
                      <div className={`absolute top-4 ${isRTL ? 'left-4' : 'right-4'} bg-white/90 backdrop-blur-sm px-3 py-1 rounded-full`}>
                        <div className="flex items-center gap-1">
                          <Star className="h-3 w-3 fill-yellow-400 text-yellow-400" />
                          <span className="text-sm font-medium text-gray-900">
                            {event.rating}
                          </span>
                        </div>
                      </div>
                      {event.soldOut && (
                        <div className="absolute inset-0 bg-black/60 flex items-center justify-center">
                          <Badge className="bg-red-600 text-white text-lg px-4 py-2">
                            {language === "en"
                              ? "SOLD OUT"
                              : "\u0646\u0641\u062f\u062a \u0627\u0644\u062a\u0630\u0627\u0643\u0631"}
                          </Badge>
                        </div>
                      )}
                    </div>
                    <CardContent className="p-6 flex-1 flex flex-col">
                      <h3 className="text-xl font-bold mb-2 text-gray-900">
                        {event.title[language] || event.title.en}
                      </h3>
                      <p className="text-gray-600 leading-relaxed mb-4 flex-1">
                        {event.description[language] || event.description.en}
                      </p>
                      <div className="space-y-2 mb-4">
                        <div className="flex items-center gap-2 text-sm text-gray-500">
                          <Calendar className="h-4 w-4 flex-shrink-0" />
                          <span>{formatDate(event.date)}</span>
                        </div>
                        <div className="flex items-center gap-2 text-sm text-gray-500">
                          <Clock className="h-4 w-4 flex-shrink-0" />
                          <span>{event.time}</span>
                        </div>
                        <div className="flex items-center gap-2 text-sm text-gray-500">
                          <MapPin className="h-4 w-4 flex-shrink-0" />
                          <span>{event.venue}</span>
                        </div>
                      </div>
                      {event.ticketProvider && (
                        <div className="mb-4">
                          <span className="inline-flex items-center gap-1 text-xs text-gray-400">
                            <Ticket className="h-3 w-3" />
                            {language === "en"
                              ? "via"
                              : "\u0639\u0628\u0631"}{" "}
                            {event.ticketProvider}
                          </span>
                        </div>
                      )}
                      <div className="flex items-center justify-between mt-auto">
                        <span className="text-lg font-bold text-brand-primary">
                          {event.price}
                        </span>
                        <Button
                          className="bg-brand-primary hover:bg-[#5C0A23] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#8B1538]"
                          disabled={event.soldOut}
                          onClick={() => handleBooking(event)}
                        >
                          {event.soldOut
                            ? language === "en"
                              ? "Sold Out"
                              : "\u0646\u0641\u062f\u062a"
                            : language === "en"
                              ? "Get Tickets"
                              : "\u0627\u062d\u0635\u0644 \u0639\u0644\u0649 \u062a\u0630\u0627\u0643\u0631"}
                          {!event.soldOut && (
                            <ExternalLink
                              className={`h-4 w-4 ${isRTL ? "mr-2 rtl-flip" : "ml-2"}`}
                            />
                          )}
                        </Button>
                      </div>
                    </CardContent>
                  </Card>
                </motion.div>
              ))}
            </div>
          )}
        </div>
      </section>

      {/* Affiliate Partners */}
      <section className="py-12 bg-white">
        <div className="max-w-6xl mx-auto px-6">
          <div className="text-center mb-8">
            <h3 className="text-xl font-semibold text-gray-800 mb-2">
              {language === "en"
                ? "Our Trusted Ticket Partners"
                : "\u0634\u0631\u0643\u0627\u0621 \u0627\u0644\u062a\u0630\u0627\u0643\u0631 \u0627\u0644\u0645\u0648\u062b\u0648\u0642\u064a\u0646"}
            </h3>
            <p className="text-gray-500 text-sm">
              {language === "en"
                ? "We partner with leading ticket providers to bring you the best deals"
                : "\u0646\u062a\u0639\u0627\u0648\u0646 \u0645\u0639 \u0645\u0632\u0648\u062f\u064a \u0627\u0644\u062a\u0630\u0627\u0643\u0631 \u0627\u0644\u0631\u0627\u0626\u062f\u064a\u0646 \u0644\u0646\u0642\u062f\u0645 \u0644\u0643 \u0623\u0641\u0636\u0644 \u0627\u0644\u0639\u0631\u0648\u0636"}
            </p>
          </div>
          <div className="flex justify-center gap-8 flex-wrap">
            {["StubHub", "Ticketmaster", "GetYourGuide", "Viator"].map(
              (partner) => (
                <div
                  key={partner}
                  className="text-center px-6 py-4 rounded-lg border border-gray-100 hover:border-purple-200 hover:bg-purple-50/50 transition-all"
                >
                  <span className="font-semibold text-gray-700">{partner}</span>
                  <span className="block text-xs text-gray-400 mt-1">
                    {language === "en"
                      ? "Verified Partner"
                      : "\u0634\u0631\u064a\u0643 \u0645\u0639\u062a\u0645\u062f"}
                  </span>
                </div>
              ),
            )}
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="py-20 bg-gradient-to-br from-purple-900 via-purple-800 to-yellow-600 text-white">
        <div className="max-w-4xl mx-auto text-center px-6">
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.8 }}
          >
            <h2 className="text-4xl font-bold mb-6">
              {language === "en"
                ? "Can't Find What You're Looking For?"
                : "\u0644\u0627 \u062a\u062c\u062f \u0645\u0627 \u062a\u0628\u062d\u062b \u0639\u0646\u0647\u061f"}
            </h2>
            <p className="text-xl mb-8 text-purple-100">
              {language === "en"
                ? "Contact us for personalized event recommendations and exclusive VIP access"
                : "\u0627\u062a\u0635\u0644 \u0628\u0646\u0627 \u0644\u0644\u062d\u0635\u0648\u0644 \u0639\u0644\u0649 \u062a\u0648\u0635\u064a\u0627\u062a \u0641\u0639\u0627\u0644\u064a\u0627\u062a \u0645\u062e\u0635\u0635\u0629 \u0648\u0648\u0635\u0648\u0644 VIP \u062d\u0635\u0631\u064a"}
            </p>
            <div className="flex gap-4 justify-center flex-wrap">
              <Button
                asChild
                size="lg"
                className="bg-white text-purple-900 hover:bg-gray-100"
              >
                <Link href="/contact">
                  {language === "en"
                    ? "Contact Us"
                    : "\u0627\u062a\u0635\u0644 \u0628\u0646\u0627"}
                  <ArrowRight
                    className={`h-5 w-5 ${isRTL ? "mr-2 rtl-flip" : "ml-2"}`}
                  />
                </Link>
              </Button>
              <Button
                asChild
                size="lg"
                variant="outline"
                className="border-white text-white hover:bg-white/10"
              >
                <Link href="/recommendations">
                  {language === "en"
                    ? "View All Recommendations"
                    : "\u0639\u0631\u0636 \u062c\u0645\u064a\u0639 \u0627\u0644\u062a\u0648\u0635\u064a\u0627\u062a"}
                  <MapPin
                    className={`h-5 w-5 ${isRTL ? "mr-2 rtl-flip" : "ml-2"}`}
                  />
                </Link>
              </Button>
            </div>
          </motion.div>
        </div>
      </section>
    </div>
  );
}
