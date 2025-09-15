'use client'

import React, { useState, useEffect } from 'react'
import { Moon, Sun, Monitor } from 'lucide-react'
import { Button } from '@/components/ui/button'

type Theme = 'light' | 'dark' | 'system'

export function ThemeToggle() {
  const [theme, setTheme] = useState<Theme>('system')
  const [mounted, setMounted] = useState(false)

  useEffect(() => {
    setMounted(true)
    const savedTheme = localStorage.getItem('theme') as Theme || 'system'
    setTheme(savedTheme)
    applyTheme(savedTheme)
  }, [])

  const applyTheme = (newTheme: Theme) => {
    const root = document.documentElement
    
    if (newTheme === 'system') {
      const systemTheme = window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light'
      root.classList.toggle('dark', systemTheme === 'dark')
    } else {
      root.classList.toggle('dark', newTheme === 'dark')
    }
  }

  const toggleTheme = () => {
    const themes: Theme[] = ['light', 'dark', 'system']
    const currentIndex = themes.indexOf(theme)
    const nextTheme = themes[(currentIndex + 1) % themes.length]
    
    setTheme(nextTheme)
    localStorage.setItem('theme', nextTheme)
    applyTheme(nextTheme)
  }

  if (!mounted) {
    return (
      <Button
        variant="outline"
        size="sm"
        className="w-9 h-9 p-0"
        disabled
      >
        <Monitor className="h-4 w-4" />
      </Button>
    )
  }

  const getIcon = () => {
    switch (theme) {
      case 'light':
        return <Sun className="h-4 w-4" />
      case 'dark':
        return <Moon className="h-4 w-4" />
      case 'system':
        return <Monitor className="h-4 w-4" />
    }
  }

  const getLabel = () => {
    switch (theme) {
      case 'light':
        return 'Switch to dark mode'
      case 'dark':
        return 'Switch to system mode'
      case 'system':
        return 'Switch to light mode'
    }
  }

  return (
    <Button
      variant="outline"
      size="sm"
      onClick={toggleTheme}
      className="w-9 h-9 p-0 btn-ghost-modern"
      title={getLabel()}
    >
      {getIcon()}
    </Button>
  )
}

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  useEffect(() => {
    // Listen for system theme changes
    const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)')
    const handleChange = () => {
      const savedTheme = localStorage.getItem('theme') as Theme
      if (savedTheme === 'system' || !savedTheme) {
        document.documentElement.classList.toggle('dark', mediaQuery.matches)
      }
    }

    mediaQuery.addEventListener('change', handleChange)
    return () => mediaQuery.removeEventListener('change', handleChange)
  }, [])

  return <>{children}</>
}
