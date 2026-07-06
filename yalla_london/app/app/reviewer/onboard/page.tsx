"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";

interface ProfileData {
  name: string;
  bio: string;
  location: string;
  yearsInLocation: number | null;
  expertiseAreas: string[];
  languages: string[];
  linkedinUrl: string;
  instagramUrl: string;
  twitterUrl: string;
  websiteUrl: string;
  acceptedTerms: boolean;
  photoOwnershipAgreed: boolean;
}

const EXPERTISE_OPTIONS = [
  { value: "halal-food", label: "Halal Food & Dining" },
  { value: "luxury-hotels", label: "Luxury Hotels" },
  { value: "family-travel", label: "Family Travel" },
  { value: "budget-travel", label: "Budget Travel" },
  { value: "nightlife", label: "Nightlife & Entertainment" },
  { value: "shopping", label: "Shopping" },
  { value: "culture", label: "Culture & History" },
  { value: "adventure", label: "Adventure Activities" },
  { value: "wellness", label: "Wellness & Spas" },
  { value: "business-travel", label: "Business Travel" },
];

const LANGUAGE_OPTIONS = [
  { value: "en", label: "English" },
  { value: "ar", label: "Arabic" },
  { value: "fr", label: "French" },
  { value: "de", label: "German" },
  { value: "es", label: "Spanish" },
  { value: "tr", label: "Turkish" },
];

export default function ReviewerOnboardPage() {
  const router = useRouter();
  const [step, setStep] = useState(1);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [profile, setProfile] = useState<ProfileData>({
    name: "",
    bio: "",
    location: "",
    yearsInLocation: null,
    expertiseAreas: [],
    languages: ["en"],
    linkedinUrl: "",
    instagramUrl: "",
    twitterUrl: "",
    websiteUrl: "",
    acceptedTerms: false,
    photoOwnershipAgreed: false,
  });

  // Check if user is already onboarded
  useEffect(() => {
    async function checkProfile() {
      try {
        const res = await fetch("/api/reviewer/profile");
        if (res.status === 401) {
          router.push("/reviewer/login");
          return;
        }
        const data = await res.json();
        if (data.reviewer?.status === "active") {
          router.push("/reviewer/dashboard");
          return;
        }
        // Pre-fill any existing data
        if (data.reviewer) {
          setProfile({
            name: data.reviewer.name || "",
            bio: data.reviewer.bio || "",
            location: data.reviewer.location || "",
            yearsInLocation: data.reviewer.yearsInLocation || null,
            expertiseAreas: data.reviewer.expertiseAreas || [],
            languages: data.reviewer.languages || ["en"],
            linkedinUrl: data.reviewer.linkedinUrl || "",
            instagramUrl: data.reviewer.instagramUrl || "",
            twitterUrl: data.reviewer.twitterUrl || "",
            websiteUrl: data.reviewer.websiteUrl || "",
            acceptedTerms: !!data.reviewer.acceptedTermsAt,
            photoOwnershipAgreed: data.reviewer.photoOwnershipAgreed || false,
          });
        }
      } catch (err) {
        console.error("Failed to check profile:", err);
      } finally {
        setLoading(false);
      }
    }
    checkProfile();
  }, [router]);

  const handleSave = async () => {
    setError("");
    setSaving(true);

    try {
      const res = await fetch("/api/reviewer/profile", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: profile.name,
          bio: profile.bio,
          location: profile.location,
          yearsInLocation: profile.yearsInLocation,
          expertiseAreas: profile.expertiseAreas,
          languages: profile.languages,
          linkedinUrl: profile.linkedinUrl || null,
          instagramUrl: profile.instagramUrl || null,
          twitterUrl: profile.twitterUrl || null,
          websiteUrl: profile.websiteUrl || null,
          acceptedTermsAt: profile.acceptedTerms ? new Date().toISOString() : null,
          photoOwnershipAgreed: profile.photoOwnershipAgreed,
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || "Failed to save profile");
      }

      if (step < 4) {
        setStep(step + 1);
      } else {
        router.push("/reviewer/dashboard");
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong");
    } finally {
      setSaving(false);
    }
  };

  const toggleExpertise = (value: string) => {
    setProfile((prev) => ({
      ...prev,
      expertiseAreas: prev.expertiseAreas.includes(value)
        ? prev.expertiseAreas.filter((e) => e !== value)
        : [...prev.expertiseAreas, value],
    }));
  };

  const toggleLanguage = (value: string) => {
    setProfile((prev) => ({
      ...prev,
      languages: prev.languages.includes(value)
        ? prev.languages.filter((l) => l !== value)
        : [...prev.languages, value],
    }));
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 flex items-center justify-center">
        <div className="w-10 h-10 border-4 border-amber-500/30 border-t-amber-500 rounded-full animate-spin"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 py-12 px-4">
      <div className="max-w-2xl mx-auto">
        {/* Header */}
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-white">Welcome to the Team</h1>
          <p className="text-slate-400 mt-2">Let&apos;s set up your reviewer profile</p>
        </div>

        {/* Progress Steps */}
        <div className="flex justify-center gap-2 mb-8">
          {[1, 2, 3, 4].map((s) => (
            <div
              key={s}
              className={`w-12 h-2 rounded-full transition-all ${
                s <= step ? "bg-amber-500" : "bg-slate-700"
              }`}
            />
          ))}
        </div>

        {/* Error */}
        {error && (
          <div className="mb-6 p-4 rounded-lg bg-red-500/10 border border-red-500/20 text-red-400">
            {error}
          </div>
        )}

        {/* Card */}
        <div className="bg-slate-800/50 backdrop-blur-xl rounded-2xl border border-slate-700/50 p-6 shadow-xl">
          {/* Step 1: Basic Info */}
          {step === 1 && (
            <div>
              <h2 className="text-xl font-semibold text-white mb-6">Your Details</h2>
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-slate-300 mb-2">
                    Full Name <span className="text-red-400">*</span>
                  </label>
                  <input
                    type="text"
                    value={profile.name}
                    onChange={(e) => setProfile({ ...profile, name: e.target.value })}
                    placeholder="Your name as it will appear on articles"
                    className="w-full px-4 py-3 rounded-lg bg-slate-900/50 border border-slate-600 text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-amber-500/50"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-300 mb-2">
                    Location
                  </label>
                  <input
                    type="text"
                    value={profile.location}
                    onChange={(e) => setProfile({ ...profile, location: e.target.value })}
                    placeholder="e.g., London, UK"
                    className="w-full px-4 py-3 rounded-lg bg-slate-900/50 border border-slate-600 text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-amber-500/50"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-300 mb-2">
                    Years Living There
                  </label>
                  <input
                    type="number"
                    min="0"
                    max="100"
                    value={profile.yearsInLocation || ""}
                    onChange={(e) =>
                      setProfile({ ...profile, yearsInLocation: e.target.value ? parseInt(e.target.value) : null })
                    }
                    placeholder="How long have you lived there?"
                    className="w-full px-4 py-3 rounded-lg bg-slate-900/50 border border-slate-600 text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-amber-500/50"
                  />
                </div>
              </div>
            </div>
          )}

          {/* Step 2: Bio & Expertise */}
          {step === 2 && (
            <div>
              <h2 className="text-xl font-semibold text-white mb-6">Your Expertise</h2>
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-slate-300 mb-2">
                    Short Bio
                  </label>
                  <textarea
                    value={profile.bio}
                    onChange={(e) => setProfile({ ...profile, bio: e.target.value })}
                    placeholder="Tell us about your experience with travel and the destinations you know well..."
                    rows={4}
                    className="w-full px-4 py-3 rounded-lg bg-slate-900/50 border border-slate-600 text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-amber-500/50 resize-none"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-300 mb-2">
                    Areas of Expertise
                  </label>
                  <div className="flex flex-wrap gap-2">
                    {EXPERTISE_OPTIONS.map((opt) => (
                      <button
                        key={opt.value}
                        type="button"
                        onClick={() => toggleExpertise(opt.value)}
                        className={`px-3 py-2 rounded-lg text-sm transition-all ${
                          profile.expertiseAreas.includes(opt.value)
                            ? "bg-amber-500 text-white"
                            : "bg-slate-700 text-slate-300 hover:bg-slate-600"
                        }`}
                      >
                        {opt.label}
                      </button>
                    ))}
                  </div>
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-300 mb-2">
                    Languages
                  </label>
                  <div className="flex flex-wrap gap-2">
                    {LANGUAGE_OPTIONS.map((opt) => (
                      <button
                        key={opt.value}
                        type="button"
                        onClick={() => toggleLanguage(opt.value)}
                        className={`px-3 py-2 rounded-lg text-sm transition-all ${
                          profile.languages.includes(opt.value)
                            ? "bg-amber-500 text-white"
                            : "bg-slate-700 text-slate-300 hover:bg-slate-600"
                        }`}
                      >
                        {opt.label}
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Step 3: Social Links */}
          {step === 3 && (
            <div>
              <h2 className="text-xl font-semibold text-white mb-2">Social Profiles</h2>
              <p className="text-slate-400 text-sm mb-6">
                Optional: Add your social profiles to build trust with readers
              </p>
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-slate-300 mb-2">
                    LinkedIn
                  </label>
                  <input
                    type="url"
                    value={profile.linkedinUrl}
                    onChange={(e) => setProfile({ ...profile, linkedinUrl: e.target.value })}
                    placeholder="https://linkedin.com/in/yourprofile"
                    className="w-full px-4 py-3 rounded-lg bg-slate-900/50 border border-slate-600 text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-amber-500/50"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-300 mb-2">
                    Instagram
                  </label>
                  <input
                    type="url"
                    value={profile.instagramUrl}
                    onChange={(e) => setProfile({ ...profile, instagramUrl: e.target.value })}
                    placeholder="https://instagram.com/yourhandle"
                    className="w-full px-4 py-3 rounded-lg bg-slate-900/50 border border-slate-600 text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-amber-500/50"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-300 mb-2">
                    Twitter/X
                  </label>
                  <input
                    type="url"
                    value={profile.twitterUrl}
                    onChange={(e) => setProfile({ ...profile, twitterUrl: e.target.value })}
                    placeholder="https://twitter.com/yourhandle"
                    className="w-full px-4 py-3 rounded-lg bg-slate-900/50 border border-slate-600 text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-amber-500/50"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-300 mb-2">
                    Website/Blog
                  </label>
                  <input
                    type="url"
                    value={profile.websiteUrl}
                    onChange={(e) => setProfile({ ...profile, websiteUrl: e.target.value })}
                    placeholder="https://yourwebsite.com"
                    className="w-full px-4 py-3 rounded-lg bg-slate-900/50 border border-slate-600 text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-amber-500/50"
                  />
                </div>
              </div>
            </div>
          )}

          {/* Step 4: Terms */}
          {step === 4 && (
            <div>
              <h2 className="text-xl font-semibold text-white mb-6">Terms & Guidelines</h2>
              <div className="space-y-4">
                <div className="p-4 rounded-lg bg-slate-900/50 border border-slate-600">
                  <h3 className="font-medium text-white mb-2">Content Reviewer Agreement</h3>
                  <div className="text-sm text-slate-400 space-y-2">
                    <p>As a content reviewer, you agree to:</p>
                    <ul className="list-disc list-inside space-y-1">
                      <li>Provide honest, first-hand experience in your reviews</li>
                      <li>Only add information you have personally verified</li>
                      <li>Not copy content from other sources</li>
                      <li>Maintain the quality and tone of the publication</li>
                      <li>Complete assigned reviews within the requested timeframe</li>
                    </ul>
                  </div>
                </div>

                <label className="flex items-start gap-3 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={profile.acceptedTerms}
                    onChange={(e) => setProfile({ ...profile, acceptedTerms: e.target.checked })}
                    className="mt-1 w-5 h-5 rounded border-slate-600 bg-slate-900 text-amber-500 focus:ring-amber-500"
                  />
                  <span className="text-slate-300 text-sm">
                    I have read and agree to the Content Reviewer Agreement
                  </span>
                </label>

                <label className="flex items-start gap-3 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={profile.photoOwnershipAgreed}
                    onChange={(e) => setProfile({ ...profile, photoOwnershipAgreed: e.target.checked })}
                    className="mt-1 w-5 h-5 rounded border-slate-600 bg-slate-900 text-amber-500 focus:ring-amber-500"
                  />
                  <span className="text-slate-300 text-sm">
                    I understand that any photos I upload must be my own work or properly licensed,
                    and I will provide proof of ownership or licensing when requested
                  </span>
                </label>
              </div>
            </div>
          )}

          {/* Navigation */}
          <div className="flex justify-between mt-8">
            {step > 1 && (
              <button
                type="button"
                onClick={() => setStep(step - 1)}
                className="px-6 py-3 rounded-lg border border-slate-600 text-slate-300 hover:bg-slate-700 transition-colors"
              >
                Back
              </button>
            )}
            <button
              type="button"
              onClick={handleSave}
              disabled={
                saving ||
                (step === 1 && !profile.name.trim()) ||
                (step === 4 && (!profile.acceptedTerms || !profile.photoOwnershipAgreed))
              }
              className={`px-6 py-3 rounded-lg bg-gradient-to-r from-amber-500 to-amber-600 text-white font-semibold hover:from-amber-600 hover:to-amber-700 transition-all disabled:opacity-50 disabled:cursor-not-allowed ${
                step === 1 ? "ml-auto" : ""
              }`}
            >
              {saving ? "Saving..." : step === 4 ? "Complete Setup" : "Continue"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
