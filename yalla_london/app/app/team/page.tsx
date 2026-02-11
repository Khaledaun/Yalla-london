'use client'

import { useState, useEffect } from 'react'
import Image from 'next/image'
import Link from 'next/link'
import { useLanguage } from '@/components/language-provider'
import { getTranslation } from '@/lib/i18n'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import {
  Users,
  Star,
  Linkedin,
  Twitter,
  Instagram,
  Globe,
  Mail,
  ArrowRight,
  Sparkles,
  Code,
  Brain,
  Palette,
  BarChart3,
  PenTool,
  Megaphone,
  Heart,
  Briefcase,
  Plane,
} from 'lucide-react'
import { motion } from 'framer-motion'

interface TeamMember {
  id: string
  slug: string
  name_en: string
  name_ar: string | null
  title_en: string
  title_ar: string | null
  bio_en: string
  bio_ar: string | null
  avatar_url: string | null
  cover_image_url: string | null
  email_public: string | null
  linkedin_url: string | null
  twitter_url: string | null
  instagram_url: string | null
  website_url: string | null
  is_featured: boolean
  expertise?: {
    id: string
    skill: {
      id: string
      name_en: string
      name_ar: string | null
      category: string
      icon: string | null
    }
    proficiency: string
    is_primary: boolean
  }[]
}

const SKILL_CATEGORIES = [
  { value: 'all', label_en: 'All', label_ar: 'الكل', icon: <Users className="h-4 w-4" /> },
  { value: 'ENGINEERING', label_en: 'Engineering', label_ar: 'الهندسة', icon: <Code className="h-4 w-4" /> },
  { value: 'AI_ML', label_en: 'AI & ML', label_ar: 'الذكاء الاصطناعي', icon: <Brain className="h-4 w-4" /> },
  { value: 'DESIGN', label_en: 'Design', label_ar: 'التصميم', icon: <Palette className="h-4 w-4" /> },
  { value: 'DATA', label_en: 'Data', label_ar: 'البيانات', icon: <BarChart3 className="h-4 w-4" /> },
  { value: 'CONTENT', label_en: 'Content', label_ar: 'المحتوى', icon: <PenTool className="h-4 w-4" /> },
  { value: 'MARKETING', label_en: 'Marketing', label_ar: 'التسويق', icon: <Megaphone className="h-4 w-4" /> },
  { value: 'PSYCHOLOGY', label_en: 'Psychology', label_ar: 'علم النفس', icon: <Heart className="h-4 w-4" /> },
  { value: 'BUSINESS', label_en: 'Business', label_ar: 'الأعمال', icon: <Briefcase className="h-4 w-4" /> },
  { value: 'TRAVEL', label_en: 'Travel', label_ar: 'السفر', icon: <Plane className="h-4 w-4" /> },
]

export default function TeamPage() {
  const { language, isRTL } = useLanguage()
  const t = (key: string) => getTranslation(language, key)

  const [members, setMembers] = useState<TeamMember[]>([])
  const [loading, setLoading] = useState(true)
  const [activeCategory, setActiveCategory] = useState('all')

  useEffect(() => {
    fetchMembers()
  }, [activeCategory])

  const fetchMembers = async () => {
    setLoading(true)
    try {
      const params = new URLSearchParams()
      if (activeCategory !== 'all') {
        params.set('skill_category', activeCategory)
      }

      const response = await fetch(`/api/team?${params}`)
      const data = await response.json()

      if (data.success) {
        setMembers(data.data)
      }
    } catch (error) {
      console.error('Error fetching team members:', error)
    } finally {
      setLoading(false)
    }
  }

  const getInitials = (name: string) => {
    return name
      .split(' ')
      .map((n) => n[0])
      .join('')
      .toUpperCase()
      .slice(0, 2)
  }

  const getName = (member: TeamMember) =>
    language === 'ar' && member.name_ar ? member.name_ar : member.name_en

  const getTitle = (member: TeamMember) =>
    language === 'ar' && member.title_ar ? member.title_ar : member.title_en

  const getBio = (member: TeamMember) =>
    language === 'ar' && member.bio_ar ? member.bio_ar : member.bio_en

  const getSkillName = (skill: TeamMember['expertise'][0]['skill']) =>
    language === 'ar' && skill.name_ar ? skill.name_ar : skill.name_en

  // Featured members first
  const sortedMembers = [...members].sort((a, b) => {
    if (a.is_featured && !b.is_featured) return -1
    if (!a.is_featured && b.is_featured) return 1
    return 0
  })

  // Filter by category if needed
  const filteredMembers =
    activeCategory === 'all'
      ? sortedMembers
      : sortedMembers.filter((m) =>
          m.expertise?.some((e) => e.skill.category === activeCategory)
        )

  const featuredMembers = filteredMembers.filter((m) => m.is_featured)

  return (
    <div className={`min-h-screen ${isRTL ? 'rtl' : 'ltr'}`}>
      {/* Hero Section */}
      <section className="relative py-20 bg-gradient-to-br from-purple-900 via-purple-800 to-yellow-600 text-white overflow-hidden">
        <div className="absolute inset-0 opacity-10">
          <div className="absolute top-0 left-0 w-96 h-96 bg-yellow-500 rounded-full blur-3xl" />
          <div className="absolute bottom-0 right-0 w-96 h-96 bg-purple-500 rounded-full blur-3xl" />
        </div>

        <div className="relative max-w-6xl mx-auto px-6">
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8 }}
            className="text-center"
          >
            <div className="flex items-center justify-center gap-3 mb-6">
              <Sparkles className="h-8 w-8 text-yellow-400" />
              <h1 className="text-5xl md:text-6xl font-display font-bold">
                {language === 'en' ? 'Our Team' : 'فريقنا'}
              </h1>
              <Sparkles className="h-8 w-8 text-yellow-400" />
            </div>
            <p className="text-xl md:text-2xl text-purple-100 max-w-3xl mx-auto">
              {language === 'en'
                ? 'World-class experts passionate about creating exceptional experiences'
                : 'خبراء عالميون متحمسون لخلق تجارب استثنائية'}
            </p>
          </motion.div>
        </div>
      </section>

      {/* Category Filter */}
      <section className="py-8 bg-white border-b sticky top-0 z-10">
        <div className="max-w-6xl mx-auto px-6">
          <Tabs value={activeCategory} onValueChange={setActiveCategory}>
            <TabsList className="flex flex-wrap gap-2 h-auto bg-transparent justify-center">
              {SKILL_CATEGORIES.map((cat) => (
                <TabsTrigger
                  key={cat.value}
                  value={cat.value}
                  className="data-[state=active]:bg-purple-800 data-[state=active]:text-white flex items-center gap-2 px-4 py-2"
                >
                  {cat.icon}
                  <span className="hidden sm:inline">
                    {language === 'en' ? cat.label_en : cat.label_ar}
                  </span>
                </TabsTrigger>
              ))}
            </TabsList>
          </Tabs>
        </div>
      </section>

      {/* Featured Team Section */}
      {featuredMembers.length > 0 && activeCategory === 'all' && (
        <section className="py-16 bg-gray-50">
          <div className="max-w-6xl mx-auto px-6">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              className="text-center mb-12"
            >
              <h2 className="text-3xl font-display font-bold gradient-text mb-4">
                {language === 'en' ? 'Featured Experts' : 'الخبراء المميزون'}
              </h2>
              <p className="text-gray-600">
                {language === 'en'
                  ? 'Meet our leading specialists and thought leaders'
                  : 'تعرف على متخصصينا الرائدين وقادة الفكر'}
              </p>
            </motion.div>

            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
              {featuredMembers.slice(0, 3).map((member, index) => (
                <motion.div
                  key={member.id}
                  initial={{ opacity: 0, y: 30 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true }}
                  transition={{ duration: 0.6, delay: index * 0.1 }}
                >
                  <Link href={`/team/${member.slug}`}>
                    <Card className="group overflow-hidden hover:shadow-xl transition-all duration-300 border-0 luxury-shadow h-full">
                      {/* Cover Image */}
                      <div className="relative h-48 bg-gradient-to-br from-purple-600 to-yellow-500">
                        {member.cover_image_url && (
                          <Image
                            src={member.cover_image_url}
                            alt=""
                            fill
                            className="object-cover opacity-60 group-hover:scale-105 transition-transform duration-500"
                          />
                        )}
                        <div className="absolute top-4 right-4">
                          <Badge className="bg-yellow-500 text-gray-900">
                            <Star className="h-3 w-3 mr-1" />
                            {language === 'en' ? 'Featured' : 'مميز'}
                          </Badge>
                        </div>
                      </div>

                      {/* Avatar */}
                      <div className="relative -mt-12 px-6">
                        <Avatar className="h-24 w-24 border-4 border-white shadow-lg">
                          <AvatarImage src={member.avatar_url || undefined} />
                          <AvatarFallback className="text-2xl bg-purple-100 text-purple-800">
                            {getInitials(member.name_en)}
                          </AvatarFallback>
                        </Avatar>
                      </div>

                      <CardContent className="p-6 pt-4">
                        <h3 className="text-xl font-bold mb-1">{getName(member)}</h3>
                        <p className="text-purple-600 font-medium mb-3">{getTitle(member)}</p>

                        {/* Primary Skills */}
                        <div className="flex flex-wrap gap-2 mb-4">
                          {member.expertise
                            ?.filter((e) => e.is_primary)
                            .slice(0, 3)
                            .map((exp) => (
                              <Badge key={exp.id} variant="outline" className="text-xs">
                                {exp.skill.icon && <span className="mr-1">{exp.skill.icon}</span>}
                                {getSkillName(exp.skill)}
                              </Badge>
                            ))}
                        </div>

                        <p className="text-gray-600 text-sm line-clamp-2 mb-4">
                          {getBio(member)}
                        </p>

                        <div className="flex items-center justify-between">
                          {/* Social Links */}
                          <div className="flex items-center gap-2">
                            {member.linkedin_url && (
                              <a
                                href={member.linkedin_url}
                                target="_blank"
                                rel="noopener noreferrer"
                                onClick={(e) => e.stopPropagation()}
                                className="text-gray-400 hover:text-blue-600 transition-colors"
                              >
                                <Linkedin className="h-4 w-4" />
                              </a>
                            )}
                            {member.twitter_url && (
                              <a
                                href={member.twitter_url}
                                target="_blank"
                                rel="noopener noreferrer"
                                onClick={(e) => e.stopPropagation()}
                                className="text-gray-400 hover:text-sky-500 transition-colors"
                              >
                                <Twitter className="h-4 w-4" />
                              </a>
                            )}
                          </div>

                          <span className="text-purple-600 text-sm font-medium group-hover:underline flex items-center gap-1">
                            {language === 'en' ? 'View Profile' : 'عرض الملف'}
                            <ArrowRight className="h-4 w-4 group-hover:translate-x-1 transition-transform" />
                          </span>
                        </div>
                      </CardContent>
                    </Card>
                  </Link>
                </motion.div>
              ))}
            </div>
          </div>
        </section>
      )}

      {/* All Team Members */}
      <section className="py-16 bg-white">
        <div className="max-w-6xl mx-auto px-6">
          {activeCategory !== 'all' && (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="text-center mb-12"
            >
              <h2 className="text-3xl font-display font-bold gradient-text mb-4">
                {SKILL_CATEGORIES.find((c) => c.value === activeCategory)?.[
                  language === 'en' ? 'label_en' : 'label_ar'
                ]}{' '}
                {language === 'en' ? 'Experts' : 'خبراء'}
              </h2>
              <p className="text-gray-600">
                {filteredMembers.length}{' '}
                {language === 'en' ? 'team members' : 'عضو في الفريق'}
              </p>
            </motion.div>
          )}

          {activeCategory === 'all' && filteredMembers.length > featuredMembers.length && (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              className="text-center mb-12"
            >
              <h2 className="text-3xl font-display font-bold gradient-text mb-4">
                {language === 'en' ? 'All Team Members' : 'جميع أعضاء الفريق'}
              </h2>
            </motion.div>
          )}

          {loading ? (
            <div className="flex items-center justify-center py-12">
              <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-purple-600" />
            </div>
          ) : filteredMembers.length === 0 ? (
            <div className="text-center py-12">
              <Users className="mx-auto h-12 w-12 text-gray-400 mb-4" />
              <h3 className="text-lg font-medium text-gray-900 mb-2">
                {language === 'en' ? 'No team members found' : 'لم يتم العثور على أعضاء'}
              </h3>
              <p className="text-gray-500">
                {language === 'en'
                  ? 'Try selecting a different category'
                  : 'حاول اختيار فئة مختلفة'}
              </p>
            </div>
          ) : (
            <div className="grid sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
              {(activeCategory === 'all'
                ? filteredMembers.filter((m) => !m.is_featured)
                : filteredMembers
              ).map((member, index) => (
                <motion.div
                  key={member.id}
                  initial={{ opacity: 0, y: 20 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true }}
                  transition={{ duration: 0.5, delay: index * 0.05 }}
                >
                  <Link href={`/team/${member.slug}`}>
                    <Card className="group hover:shadow-lg transition-all duration-300 h-full">
                      <CardContent className="p-6">
                        <div className="flex flex-col items-center text-center">
                          <Avatar className="h-20 w-20 mb-4 border-2 border-purple-100 group-hover:border-purple-300 transition-colors">
                            <AvatarImage src={member.avatar_url || undefined} />
                            <AvatarFallback className="text-lg bg-purple-100 text-purple-800">
                              {getInitials(member.name_en)}
                            </AvatarFallback>
                          </Avatar>

                          {member.is_featured && (
                            <Badge className="mb-2 bg-yellow-100 text-yellow-800">
                              <Star className="h-3 w-3 mr-1" />
                              {language === 'en' ? 'Featured' : 'مميز'}
                            </Badge>
                          )}

                          <h3 className="font-bold mb-1 group-hover:text-purple-600 transition-colors">
                            {getName(member)}
                          </h3>
                          <p className="text-sm text-gray-600 mb-3">{getTitle(member)}</p>

                          {/* Skills */}
                          <div className="flex flex-wrap justify-center gap-1">
                            {member.expertise?.slice(0, 3).map((exp) => (
                              <Badge key={exp.id} variant="outline" className="text-xs">
                                {exp.skill.icon}
                              </Badge>
                            ))}
                            {member.expertise && member.expertise.length > 3 && (
                              <Badge variant="outline" className="text-xs">
                                +{member.expertise.length - 3}
                              </Badge>
                            )}
                          </div>

                          {/* Social Icons */}
                          <div className="flex items-center gap-2 mt-4">
                            {member.linkedin_url && (
                              <Linkedin className="h-4 w-4 text-gray-400" />
                            )}
                            {member.twitter_url && (
                              <Twitter className="h-4 w-4 text-gray-400" />
                            )}
                            {member.instagram_url && (
                              <Instagram className="h-4 w-4 text-gray-400" />
                            )}
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  </Link>
                </motion.div>
              ))}
            </div>
          )}
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-16 bg-gradient-to-br from-purple-900 to-purple-800 text-white">
        <div className="max-w-4xl mx-auto text-center px-6">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
          >
            <h2 className="text-3xl font-display font-bold mb-4">
              {language === 'en' ? 'Join Our Team' : 'انضم إلى فريقنا'}
            </h2>
            <p className="text-purple-100 mb-8">
              {language === 'en'
                ? "We're always looking for talented individuals to join our mission"
                : 'نحن نبحث دائمًا عن أفراد موهوبين للانضمام إلى مهمتنا'}
            </p>
            <Button asChild size="lg" className="bg-yellow-500 text-gray-900 hover:bg-yellow-400">
              <a href="mailto:careers@yalla-london.com">
                <Mail className="mr-2 h-5 w-5" />
                {language === 'en' ? 'Contact Us' : 'تواصل معنا'}
              </a>
            </Button>
          </motion.div>
        </div>
      </section>
    </div>
  )
}
