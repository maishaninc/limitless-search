"use client"

import * as React from "react"
import { Moon, Sun, Languages, Menu, X, ChevronDown, Check, Github } from "lucide-react"
import { useTheme } from "next-themes"
import { motion, AnimatePresence } from "framer-motion"
import { useLanguage, languages } from "@/lib/i18n"
import { cn } from "@/lib/utils"

export function Navbar() {
  const { setTheme, resolvedTheme } = useTheme()
  const { language, setLanguage, t } = useLanguage()
  const [mounted, setMounted] = React.useState(false)
  const [isMenuOpen, setIsMenuOpen] = React.useState(false)
  const [isLangOpen, setIsLangOpen] = React.useState(false)

  React.useEffect(() => {
    setMounted(true)
  }, [])

  const toggleMenu = () => setIsMenuOpen(!isMenuOpen)

  // Prevent hydration mismatch
  if (!mounted) return null

  return (
    <nav className="fixed top-0 left-0 right-0 z-50 border-b border-neutral-200 dark:border-neutral-800 bg-white/80 dark:bg-black/80 backdrop-blur-md transition-colors duration-300">
      <div className="container mx-auto px-4 h-16 flex items-center justify-between">
        {/* Logo */}
        <div className="text-2xl font-bold tracking-tighter">
          FREE<span className="bg-black text-white dark:bg-white dark:text-black px-1 ml-1">ANIME</span>.ORG
        </div>

        {/* Desktop Menu */}
        <div className="hidden md:flex items-center gap-8">
          <a href="#" className="text-sm font-medium hover:text-neutral-500 transition-colors">{t.nav.community}</a>
          <a href="#download" className="text-sm font-medium hover:text-neutral-500 transition-colors">{t.nav.download}</a>
          <a href="#about" className="text-sm font-medium hover:text-neutral-500 transition-colors">{t.nav.about}</a>
          <a href="#about" className="text-sm font-medium hover:text-neutral-500 transition-colors">{t.nav.improveCommunity}</a>
        </div>

        {/* Controls */}
        <div className="hidden md:flex items-center gap-4">
          {/* GitHub Button */}
          <a
            href="https://github.com"
            target="_blank"
            rel="noopener noreferrer"
            className="p-2 rounded-full hover:bg-neutral-100 dark:hover:bg-neutral-800 transition-colors"
            aria-label="GitHub"
          >
            <Github size={20} />
          </a>

          {/* Language Switcher (Dropdown) */}
          <div className="relative">
            <button
              onClick={() => setIsLangOpen(!isLangOpen)}
              className="p-2 rounded-full hover:bg-neutral-100 dark:hover:bg-neutral-800 transition-colors flex items-center gap-1 text-xs font-bold border border-neutral-200 dark:border-neutral-800"
            >
              <Languages size={16} />
              {language === 'zh-TW' ? '繁' : language.toUpperCase()}
              <ChevronDown size={12} />
            </button>

            <AnimatePresence>
              {isLangOpen && (
                <motion.div
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: 10 }}
                  className="absolute right-0 top-full mt-2 w-40 bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 rounded-lg shadow-lg overflow-hidden py-1"
                >
                  {languages.map((lang) => (
                    <button
                      key={lang.code}
                      onClick={() => {
                        setLanguage(lang.code);
                        setIsLangOpen(false);
                      }}
                      className="w-full text-left px-4 py-2 text-sm hover:bg-neutral-100 dark:hover:bg-neutral-800 flex items-center justify-between"
                    >
                      {lang.name}
                      {language === lang.code && <Check size={14} />}
                    </button>
                  ))}
                </motion.div>
              )}
            </AnimatePresence>
          </div>

          {/* Theme Toggle */}
          <button
            onClick={() => setTheme(resolvedTheme === "dark" ? "light" : "dark")}
            className="p-2 rounded-full hover:bg-neutral-100 dark:hover:bg-neutral-800 transition-colors"
            aria-label="Toggle Theme"
          >
            {resolvedTheme === "dark" ? <Sun size={20} /> : <Moon size={20} />}
          </button>
        </div>

        {/* Mobile Menu Button */}
        <button className="md:hidden p-2" onClick={toggleMenu}>
          {isMenuOpen ? <X size={24} /> : <Menu size={24} />}
        </button>
      </div>

      {/* Mobile Menu Overlay */}
      <AnimatePresence>
        {isMenuOpen && (
          <motion.div
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            className="absolute top-16 left-0 right-0 bg-white dark:bg-black border-b border-neutral-200 dark:border-neutral-800 md:hidden p-4 flex flex-col gap-4 shadow-2xl"
          >
            <a href="#" className="text-lg font-medium" onClick={toggleMenu}>{t.nav.community}</a>
            <a href="#download" className="text-lg font-medium" onClick={toggleMenu}>{t.nav.download}</a>
            <a href="#about" className="text-lg font-medium" onClick={toggleMenu}>{t.nav.about}</a>
            <a href="#about" className="text-lg font-medium" onClick={toggleMenu}>{t.nav.improveCommunity}</a>
            
            <div className="flex flex-col gap-4 pt-4 border-t border-neutral-200 dark:border-neutral-800">
               {/* Mobile GitHub Button */}
              <a
                href="https://github.com/maishaninc/limitless-search"
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center justify-center gap-2 p-3 rounded-md bg-neutral-100 dark:bg-neutral-900 font-medium"
              >
                <Github size={20} />
                GitHub
              </a>

              <div className="grid grid-cols-2 gap-2">
                {languages.map((lang) => (
                  <button
                    key={lang.code}
                    onClick={() => setLanguage(lang.code)}
                    className={cn(
                      "px-3 py-2 text-sm border rounded-md transition-colors",
                      language === lang.code 
                        ? "bg-black text-white dark:bg-white dark:text-black border-transparent" 
                        : "border-neutral-200 dark:border-neutral-800"
                    )}
                  >
                    {lang.name}
                  </button>
                ))}
              </div>

              <button
                onClick={() => setTheme(resolvedTheme === "dark" ? "light" : "dark")}
                className="flex items-center justify-center gap-2 p-3 rounded-md bg-neutral-100 dark:bg-neutral-900"
              >
                {resolvedTheme === "dark" ? <Sun size={20} /> : <Moon size={20} />}
                {resolvedTheme === "dark" ? "Light Mode" : "Dark Mode"}
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </nav>
  )
}
