"use client";

import { useState } from "react";
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
} from "lucide-react";
import { motion } from "framer-motion";

interface EventItem {
  id: number;
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

const events: EventItem[] = [
  {
    id: 1,
    title: {
      en: "Arsenal vs Chelsea - Premier League",
      ar: "أرسنال ضد تشيلسي - الدوري الإنجليزي الممتاز",
    },
    description: {
      en: "Experience the North London derby at the iconic Emirates Stadium with VIP hospitality packages.",
      ar: "اختبر ديربي شمال لندن في استاد الإمارات الأيقوني مع باقات الضيافة VIP.",
    },
    date: "2026-03-15",
    time: "15:00",
    venue: "Emirates Stadium",
    category: "Football",
    price: "From £120",
    image: "https://i.ytimg.com/vi/I1vtWKrQgNg/maxresdefault.jpg",
    rating: 4.9,
    bookingUrl: "https://www.stubhub.co.uk/arsenal-tickets/performer/2161/",
    affiliateTag: "stubhub",
    ticketProvider: "StubHub",
    vipAvailable: true,
  },
  {
    id: 2,
    title: {
      en: "The Lion King - Musical Theatre",
      ar: "الأسد الملك - مسرح موسيقي",
    },
    description: {
      en: "The award-winning musical that brings the Pride Lands to life with stunning costumes and music.",
      ar: "المسرحية الموسيقية الحائزة على جوائز التي تحيي أراضي الكبرياء بالأزياء والموسيقى المذهلة.",
    },
    date: "2026-03-20",
    time: "19:30",
    venue: "Lyceum Theatre",
    category: "Theatre",
    price: "From £45",
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
    id: 3,
    title: {
      en: "Chelsea vs Manchester City - Premier League",
      ar: "تشيلسي ضد مانشستر سيتي - الدوري الإنجليزي",
    },
    description: {
      en: "Watch two Premier League giants clash at Stamford Bridge. Premium hospitality available.",
      ar: "شاهد عمالقة الدوري الإنجليزي في ستامفورد بريدج. ضيافة مميزة متوفرة.",
    },
    date: "2026-04-05",
    time: "16:30",
    venue: "Stamford Bridge",
    category: "Football",
    price: "From £150",
    image:
      "https://images.unsplash.com/photo-1551698618-1dfe5d97d256?w=800&h=600&fit=crop",
    rating: 4.9,
    bookingUrl: "https://www.stubhub.co.uk/chelsea-tickets/performer/24/",
    affiliateTag: "stubhub",
    ticketProvider: "StubHub",
    vipAvailable: true,
  },
  {
    id: 4,
    title: {
      en: "Wicked - West End Musical",
      ar: "ويكد - مسرحية ويست إند الموسيقية",
    },
    description: {
      en: "The untold story of the witches of Oz. A spectacular show at the Apollo Victoria Theatre.",
      ar: "القصة غير المروية لساحرات أوز. عرض مذهل في مسرح أبولو فيكتوريا.",
    },
    date: "2026-03-25",
    time: "19:30",
    venue: "Apollo Victoria Theatre",
    category: "Theatre",
    price: "From £30",
    image:
      "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=800&h=600&fit=crop",
    rating: 4.8,
    bookingUrl: "https://www.ticketmaster.co.uk/wicked-tickets/artist/1046581",
    affiliateTag: "ticketmaster",
    ticketProvider: "Ticketmaster",
    vipAvailable: false,
  },
  {
    id: 5,
    title: {
      en: "Tottenham vs Liverpool - Premier League",
      ar: "توتنهام ضد ليفربول - الدوري الإنجليزي",
    },
    description: {
      en: "Premier League action at the state-of-the-art Tottenham Hotspur Stadium. VIP boxes available.",
      ar: "أكشن الدوري الإنجليزي في استاد توتنهام هوتسبر الحديث. لوجات VIP متاحة.",
    },
    date: "2026-04-12",
    time: "17:30",
    venue: "Tottenham Hotspur Stadium",
    category: "Football",
    price: "From £95",
    image:
      "https://images.unsplash.com/photo-1574629810360-7efbbe195018?w=800&h=600&fit=crop",
    rating: 4.8,
    bookingUrl:
      "https://www.stubhub.co.uk/tottenham-hotspur-tickets/performer/7490/",
    affiliateTag: "stubhub",
    ticketProvider: "StubHub",
    vipAvailable: true,
  },
  {
    id: 6,
    title: { en: "London Food Festival 2026", ar: "مهرجان لندن للطعام 2026" },
    description: {
      en: "Taste the world at London's premier food festival. Halal options, celebrity chefs, and VIP dining.",
      ar: "تذوق العالم في مهرجان لندن الرائد للطعام. خيارات حلال، طهاة مشاهير، وتجارب VIP.",
    },
    date: "2026-05-01",
    time: "11:00",
    venue: "Regent's Park",
    category: "Festival",
    price: "From £25",
    image:
      "https://images.unsplash.com/photo-1555939594-58d7cb561ad1?w=800&h=600&fit=crop",
    rating: 4.6,
    bookingUrl: "https://www.ticketmaster.co.uk",
    affiliateTag: "ticketmaster",
    ticketProvider: "Ticketmaster",
    vipAvailable: true,
  },
  {
    id: 7,
    title: { en: "Immersive Van Gogh Experience", ar: "تجربة فان جوخ الغامرة" },
    description: {
      en: "Step inside Van Gogh's masterpieces in this stunning immersive digital art experience.",
      ar: "ادخل إلى عالم لوحات فان جوخ في هذه التجربة الفنية الرقمية الغامرة المذهلة.",
    },
    date: "2026-03-01",
    time: "10:00",
    venue: "The Old Truman Brewery",
    category: "Exhibition",
    price: "From £20",
    image:
      "https://images.unsplash.com/photo-1541367777708-7905fe3296c0?w=800&h=600&fit=crop",
    rating: 4.7,
    bookingUrl: "https://www.getyourguide.com/london-l57/",
    affiliateTag: "getyourguide",
    ticketProvider: "GetYourGuide",
    vipAvailable: false,
  },
  {
    id: 8,
    title: {
      en: "Thames Luxury Dinner Cruise",
      ar: "رحلة عشاء فاخرة على نهر التايمز",
    },
    description: {
      en: "Fine dining on the Thames with views of Tower Bridge, Big Ben, and the London Eye. Halal menu available.",
      ar: "عشاء فاخر على التايمز مع إطلالة على تاور بريدج وبيج بن ولندن آي. قائمة حلال متوفرة.",
    },
    date: "2026-03-22",
    time: "19:00",
    venue: "Westminster Pier",
    category: "Experience",
    price: "From £89",
    image:
      "https://images.unsplash.com/photo-1513635269975-59663e0ac1ad?w=800&h=600&fit=crop",
    rating: 4.7,
    bookingUrl: "https://www.viator.com/London/d737",
    affiliateTag: "viator",
    ticketProvider: "Viator",
    vipAvailable: true,
  },
];

const categories = [
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

  const filteredEvents = events.filter((event) => {
    const matchesCategory =
      selectedCategory === "All" || event.category === selectedCategory;
    const matchesSearch =
      searchQuery === "" ||
      event.title[language].toLowerCase().includes(searchQuery.toLowerCase()) ||
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
          <h1 className="text-5xl md:text-6xl font-bold mb-6">
            {language === "en"
              ? "London Events & Tickets"
              : "فعاليات وتذاكر لندن"}
          </h1>
          <p className="text-xl md:text-2xl text-gray-200">
            {language === "en"
              ? "Book premium tickets for the best London experiences"
              : "احجز تذاكر مميزة لأفضل تجارب لندن"}
          </p>
          <div className="flex items-center justify-center gap-4 mt-6">
            <Badge className="bg-white/20 text-white text-sm px-4 py-1">
              <Ticket className="h-4 w-4 mr-1" />
              {language === "en" ? "Verified Tickets" : "تذاكر معتمدة"}
            </Badge>
            <Badge className="bg-white/20 text-white text-sm px-4 py-1">
              <Star className="h-4 w-4 mr-1" />
              {language === "en" ? "VIP Packages" : "باقات VIP"}
            </Badge>
          </div>
        </motion.div>
      </section>

      {/* Search & Filter Bar */}
      <section className="bg-white border-b sticky top-0 z-20">
        <div className="max-w-6xl mx-auto px-6 py-4">
          <div className="flex flex-col md:flex-row gap-4 items-center">
            <div className="relative flex-1 w-full">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
              <Input
                placeholder={
                  language === "en"
                    ? "Search events, venues..."
                    : "ابحث عن فعاليات، أماكن..."
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
                  {cat === "All" ? (language === "en" ? "All" : "الكل") : cat}
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
              {language === "en"
                ? `${filteredEvents.length} Events Available`
                : `${filteredEvents.length} فعالية متاحة`}
            </h2>
            <div className="flex items-center gap-2 text-sm text-gray-500">
              <Tag className="h-4 w-4" />
              {language === "en"
                ? "Powered by trusted ticket partners"
                : "مدعوم من شركاء التذاكر الموثوقين"}
            </div>
          </div>

          {filteredEvents.length === 0 ? (
            <div className="text-center py-20">
              <p className="text-gray-500 text-lg">
                {language === "en"
                  ? "No events match your filters"
                  : "لا توجد فعاليات تطابق التصفية"}
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
                {language === "en" ? "Clear Filters" : "مسح التصفية"}
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
                        src={event.image}
                        alt={event.title[language]}
                        fill
                        className="object-cover"
                      />
                      <div className="absolute top-4 left-4 flex gap-2">
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
                      <div className="absolute top-4 right-4 bg-white/90 backdrop-blur-sm px-3 py-1 rounded-full">
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
                            {language === "en" ? "SOLD OUT" : "نفدت التذاكر"}
                          </Badge>
                        </div>
                      )}
                    </div>
                    <CardContent className="p-6 flex-1 flex flex-col">
                      <h3 className="text-xl font-bold mb-2 text-gray-900">
                        {event.title[language]}
                      </h3>
                      <p className="text-gray-600 leading-relaxed mb-4 flex-1">
                        {event.description[language]}
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
                            {language === "en" ? "via" : "عبر"}{" "}
                            {event.ticketProvider}
                          </span>
                        </div>
                      )}
                      <div className="flex items-center justify-between mt-auto">
                        <span className="text-lg font-bold text-purple-800">
                          {event.price}
                        </span>
                        <Button
                          className="bg-purple-800 hover:bg-purple-900"
                          disabled={event.soldOut}
                          onClick={() => handleBooking(event)}
                        >
                          {event.soldOut
                            ? language === "en"
                              ? "Sold Out"
                              : "نفدت"
                            : language === "en"
                              ? "Get Tickets"
                              : "احصل على تذاكر"}
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
                : "شركاء التذاكر الموثوقين"}
            </h3>
            <p className="text-gray-500 text-sm">
              {language === "en"
                ? "We partner with leading ticket providers to bring you the best deals"
                : "نتعاون مع مزودي التذاكر الرائدين لنقدم لك أفضل العروض"}
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
                    {language === "en" ? "Verified Partner" : "شريك معتمد"}
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
                : "لا تجد ما تبحث عنه؟"}
            </h2>
            <p className="text-xl mb-8 text-purple-100">
              {language === "en"
                ? "Contact us for personalized event recommendations and exclusive VIP access"
                : "اتصل بنا للحصول على توصيات فعاليات مخصصة ووصول VIP حصري"}
            </p>
            <div className="flex gap-4 justify-center flex-wrap">
              <Button
                asChild
                size="lg"
                className="bg-white text-purple-900 hover:bg-gray-100"
              >
                <Link href="/contact">
                  {language === "en" ? "Contact Us" : "اتصل بنا"}
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
                    : "عرض جميع التوصيات"}
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
