'use client'

import { useState, useEffect } from 'react'
import Image from 'next/image'
import Link from 'next/link'
import { useParams, notFound } from 'next/navigation'
import { useLanguage } from '@/components/language-provider'
import { getTranslation } from '@/lib/i18n'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import {
  Users,
  Star,
  Linkedin,
  Twitter,
  Instagram,
  Globe,
  Mail,
  ArrowLeft,
  Sparkles,
  Award,
  Code,
  Brain,
  Palette,
  BarChart3,
  PenTool,
  Megaphone,
  Heart,
  Briefcase,
  Plane,
  ChevronRight,
  GraduationCap,
  BookOpen,
  Trophy,
  Lightbulb,
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
  expertise: {
    id: string
    proficiency: string
    years_experience: number | null
    is_primary: boolean
    description_en: string | null
    description_ar: string | null
    skill: {
      id: string
      slug: string
      name_en: string
      name_ar: string | null
      category: string
      description_en: string | null
      description_ar: string | null
      icon: string | null
      color: string | null
    }
  }[]
}

const CATEGORY_INFO: Record<
  string,
  { label_en: string; label_ar: string; icon: React.ReactNode; color: string }
> = {
  ENGINEERING: { label_en: 'Engineering', label_ar: 'الهندسة', icon: <Code className="h-5 w-5" />, color: 'bg-blue-500' },
  AI_ML: { label_en: 'AI & Machine Learning', label_ar: 'الذكاء الاصطناعي', icon: <Brain className="h-5 w-5" />, color: 'bg-purple-500' },
  DESIGN: { label_en: 'Design', label_ar: 'التصميم', icon: <Palette className="h-5 w-5" />, color: 'bg-pink-500' },
  DATA: { label_en: 'Data', label_ar: 'البيانات', icon: <BarChart3 className="h-5 w-5" />, color: 'bg-green-500' },
  CONTENT: { label_en: 'Content', label_ar: 'المحتوى', icon: <PenTool className="h-5 w-5" />, color: 'bg-orange-500' },
  MARKETING: { label_en: 'Marketing', label_ar: 'التسويق', icon: <Megaphone className="h-5 w-5" />, color: 'bg-red-500' },
  PSYCHOLOGY: { label_en: 'Psychology', label_ar: 'علم النفس', icon: <Heart className="h-5 w-5" />, color: 'bg-indigo-500' },
  BUSINESS: { label_en: 'Business', label_ar: 'الأعمال', icon: <Briefcase className="h-5 w-5" />, color: 'bg-slate-500' },
  TRAVEL: { label_en: 'Travel', label_ar: 'السفر', icon: <Plane className="h-5 w-5" />, color: 'bg-cyan-500' },
}

const PROFICIENCY_INFO: Record<string, { label_en: string; label_ar: string; icon: React.ReactNode; color: string }> = {
  LEARNING: { label_en: 'Learning', label_ar: 'يتعلم', icon: <BookOpen className="h-4 w-4" />, color: 'bg-yellow-500' },
  PROFICIENT: { label_en: 'Proficient', label_ar: 'متمكن', icon: <GraduationCap className="h-4 w-4" />, color: 'bg-blue-500' },
  EXPERT: { label_en: 'Expert', label_ar: 'خبير', icon: <Trophy className="h-4 w-4" />, color: 'bg-green-500' },
  THOUGHT_LEADER: { label_en: 'Thought Leader', label_ar: 'قائد فكري', icon: <Lightbulb className="h-4 w-4" />, color: 'bg-purple-500' },
}

export default function TeamMemberProfilePage() {
  const params = useParams()
  const slug = params.slug as string
  const { language, isRTL } = useLanguage()
  const t = (key: string) => getTranslation(language, key)

  const [member, setMember] = useState<TeamMember | null>(null)
  const [loading, setLoading] = useState(true)
  const [notFoundState, setNotFoundState] = useState(false)

  useEffect(() => {
    const fetchMember = async () => {
      setLoading(true)
      try {
        const response = await fetch(`/api/team/${slug}`)
        const data = await response.json()

        if (data.success) {
          setMember(data.data)
        } else {
          setNotFoundState(true)
        }
      } catch (error) {
        console.error('Error fetching team member:', error)
        setNotFoundState(true)
      } finally {
        setLoading(false)
      }
    }

    if (slug) {
      fetchMember()
    }
  }, [slug])

  const getInitials = (name: string) => {
    return name
      .split(' ')
      .map((n) => n[0])
      .join('')
      .toUpperCase()
      .slice(0, 2)
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-purple-600" />
      </div>
    )
  }

  if (notFoundState || !member) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <Users className="mx-auto h-16 w-16 text-gray-400 mb-4" />
          <h1 className="text-2xl font-bold mb-2">
            {language === 'en' ? 'Team member not found' : 'لم يتم العثور على العضو'}
          </h1>
          <p className="text-gray-600 mb-6">
            {language === 'en'
              ? 'The team member you are looking for does not exist.'
              : 'العضو الذي تبحث عنه غير موجود.'}
          </p>
          <Button asChild>
            <Link href="/team">
              <ArrowLeft className="h-4 w-4 mr-2" />
              {language === 'en' ? 'Back to Team' : 'العودة للفريق'}
            </Link>
          </Button>
        </div>
      </div>
    )
  }

  const getName = () => (language === 'ar' && member.name_ar ? member.name_ar : member.name_en)
  const getTitle = () => (language === 'ar' && member.title_ar ? member.title_ar : member.title_en)
  const getBio = () => (language === 'ar' && member.bio_ar ? member.bio_ar : member.bio_en)

  const getSkillName = (skill: TeamMember['expertise'][0]['skill']) =>
    language === 'ar' && skill.name_ar ? skill.name_ar : skill.name_en

  const getCategoryLabel = (category: string) =>
    CATEGORY_INFO[category]?.[language === 'ar' ? 'label_ar' : 'label_en'] || category

  const getProficiencyLabel = (proficiency: string) =>
    PROFICIENCY_INFO[proficiency]?.[language === 'ar' ? 'label_ar' : 'label_en'] || proficiency

  // Group skills by category
  const skillsByCategory = member.expertise.reduce((acc, exp) => {
    const category = exp.skill.category
    if (!acc[category]) {
      acc[category] = []
    }
    acc[category].push(exp)
    return acc
  }, {} as Record<string, typeof member.expertise>)

  const primarySkills = member.expertise.filter((e) => e.is_primary)

  return (
    <div className={`min-h-screen ${isRTL ? 'rtl' : 'ltr'}`}>
      {/* Hero Section with Cover Image */}
      <section className="relative">
        {/* Cover Image */}
        <div className="h-64 md:h-80 bg-gradient-to-br from-purple-600 to-yellow-500 relative overflow-hidden">
          {member.cover_image_url && (
            <Image
              src={member.cover_image_url}
              alt=""
              fill
              className="object-cover opacity-50"
              priority
            />
          )}
          <div className="absolute inset-0 bg-gradient-to-t from-gray-900/80 to-transparent" />
        </div>

        {/* Back Button */}
        <div className="absolute top-6 left-6 z-10">
          <Link href="/team">
            <Button variant="secondary" size="sm" className="bg-white/90 hover:bg-white">
              <ArrowLeft className="h-4 w-4 mr-2" />
              {language === 'en' ? 'Back to Team' : 'العودة للفريق'}
            </Button>
          </Link>
        </div>

        {/* Profile Info Overlay */}
        <div className="max-w-4xl mx-auto px-6 relative">
          <div className="absolute bottom-0 transform translate-y-1/2 flex items-end gap-6">
            <Avatar className="h-32 w-32 md:h-40 md:w-40 border-4 border-white shadow-xl">
              <AvatarImage src={member.avatar_url || undefined} />
              <AvatarFallback className="text-4xl bg-purple-100 text-purple-800">
                {getInitials(member.name_en)}
              </AvatarFallback>
            </Avatar>
          </div>
        </div>
      </section>

      {/* Main Content */}
      <section className="pt-24 pb-16 bg-white">
        <div className="max-w-4xl mx-auto px-6">
          {/* Header Info */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="mb-8"
          >
            <div className="flex items-center gap-3 mb-2">
              <h1 className="text-3xl md:text-4xl font-playfair font-bold">{getName()}</h1>
              {member.is_featured && (
                <Badge className="bg-yellow-500 text-gray-900">
                  <Star className="h-3 w-3 mr-1" />
                  {language === 'en' ? 'Featured' : 'مميز'}
                </Badge>
              )}
            </div>
            <p className="text-xl text-purple-600 font-medium mb-4">{getTitle()}</p>

            {/* Social Links */}
            <div className="flex items-center gap-4">
              {member.linkedin_url && (
                <a
                  href={member.linkedin_url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-gray-400 hover:text-blue-600 transition-colors"
                >
                  <Linkedin className="h-6 w-6" />
                </a>
              )}
              {member.twitter_url && (
                <a
                  href={member.twitter_url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-gray-400 hover:text-sky-500 transition-colors"
                >
                  <Twitter className="h-6 w-6" />
                </a>
              )}
              {member.instagram_url && (
                <a
                  href={member.instagram_url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-gray-400 hover:text-pink-500 transition-colors"
                >
                  <Instagram className="h-6 w-6" />
                </a>
              )}
              {member.website_url && (
                <a
                  href={member.website_url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-gray-400 hover:text-gray-600 transition-colors"
                >
                  <Globe className="h-6 w-6" />
                </a>
              )}
              {member.email_public && (
                <a
                  href={`mailto:${member.email_public}`}
                  className="text-gray-400 hover:text-purple-600 transition-colors"
                >
                  <Mail className="h-6 w-6" />
                </a>
              )}
            </div>
          </motion.div>

          {/* Primary Skills */}
          {primarySkills.length > 0 && (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.1 }}
              className="mb-8"
            >
              <h2 className="text-lg font-semibold mb-3 flex items-center gap-2">
                <Award className="h-5 w-5 text-yellow-500" />
                {language === 'en' ? 'Primary Expertise' : 'الخبرات الرئيسية'}
              </h2>
              <div className="flex flex-wrap gap-3">
                {primarySkills.map((exp) => (
                  <Badge
                    key={exp.id}
                    className={`${CATEGORY_INFO[exp.skill.category]?.color || 'bg-gray-500'} text-white px-4 py-2 text-sm`}
                  >
                    {exp.skill.icon && <span className="mr-2">{exp.skill.icon}</span>}
                    {getSkillName(exp.skill)}
                  </Badge>
                ))}
              </div>
            </motion.div>
          )}

          {/* Bio */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
          >
            <Card className="border-0 shadow-lg mb-8">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Users className="h-5 w-5" />
                  {language === 'en' ? 'About' : 'نبذة'}
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="prose prose-purple max-w-none">
                  <p className="text-gray-700 leading-relaxed whitespace-pre-wrap">{getBio()}</p>
                </div>
              </CardContent>
            </Card>
          </motion.div>

          {/* All Skills by Category */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3 }}
          >
            <h2 className="text-2xl font-playfair font-bold mb-6 flex items-center gap-2">
              <Sparkles className="h-6 w-6 text-yellow-500" />
              {language === 'en' ? 'Skills & Expertise' : 'المهارات والخبرات'}
            </h2>

            <div className="grid gap-6">
              {Object.entries(skillsByCategory).map(([category, skills]) => (
                <Card key={category} className="overflow-hidden border-0 shadow-md">
                  <div className={`${CATEGORY_INFO[category]?.color || 'bg-gray-500'} p-4`}>
                    <h3 className="font-bold text-white flex items-center gap-2">
                      {CATEGORY_INFO[category]?.icon}
                      {getCategoryLabel(category)}
                    </h3>
                  </div>
                  <CardContent className="p-4">
                    <div className="space-y-4">
                      {skills.map((exp) => (
                        <div
                          key={exp.id}
                          className="flex items-start gap-4 p-3 rounded-lg bg-gray-50 hover:bg-gray-100 transition-colors"
                        >
                          {exp.skill.icon && (
                            <span className="text-2xl">{exp.skill.icon}</span>
                          )}
                          <div className="flex-1">
                            <div className="flex items-center gap-2 flex-wrap mb-1">
                              <span className="font-medium">{getSkillName(exp.skill)}</span>
                              {exp.is_primary && (
                                <Badge variant="outline" className="text-yellow-600 border-yellow-600">
                                  <Star className="h-3 w-3 mr-1" />
                                  {language === 'en' ? 'Primary' : 'رئيسية'}
                                </Badge>
                              )}
                            </div>
                            <div className="flex items-center gap-3 text-sm">
                              <Badge className={`${PROFICIENCY_INFO[exp.proficiency]?.color || 'bg-gray-500'} text-white`}>
                                {PROFICIENCY_INFO[exp.proficiency]?.icon}
                                <span className="ml-1">{getProficiencyLabel(exp.proficiency)}</span>
                              </Badge>
                              {exp.years_experience && (
                                <span className="text-gray-500">
                                  {exp.years_experience} {language === 'en' ? 'years' : 'سنوات'}
                                </span>
                              )}
                            </div>
                            {exp.description_en && (
                              <p className="text-sm text-gray-600 mt-2">
                                {language === 'ar' && exp.description_ar
                                  ? exp.description_ar
                                  : exp.description_en}
                              </p>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </motion.div>

          {/* Contact CTA */}
          {member.email_public && (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.4 }}
              className="mt-12"
            >
              <Card className="bg-gradient-to-br from-purple-600 to-purple-800 text-white border-0">
                <CardContent className="p-8 text-center">
                  <h3 className="text-2xl font-bold mb-2">
                    {language === 'en' ? `Get in touch with ${member.name_en.split(' ')[0]}` : `تواصل مع ${member.name_ar?.split(' ')[0] || member.name_en.split(' ')[0]}`}
                  </h3>
                  <p className="text-purple-100 mb-6">
                    {language === 'en'
                      ? 'Have questions or want to collaborate? Reach out directly.'
                      : 'لديك أسئلة أو تريد التعاون؟ تواصل مباشرة.'}
                  </p>
                  <Button asChild size="lg" className="bg-white text-purple-800 hover:bg-gray-100">
                    <a href={`mailto:${member.email_public}`}>
                      <Mail className="mr-2 h-5 w-5" />
                      {language === 'en' ? 'Send Email' : 'أرسل بريدًا'}
                    </a>
                  </Button>
                </CardContent>
              </Card>
            </motion.div>
          )}
        </div>
      </section>
    </div>
  )
}
