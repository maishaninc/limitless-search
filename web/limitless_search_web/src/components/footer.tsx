"use client"

import { useLanguage } from "@/lib/i18n"

export function Footer() {
  const { t } = useLanguage()
  const currentYear = new Date().getFullYear()

  return (
    <footer className="py-12 border-t border-neutral-200 dark:border-neutral-800 bg-neutral-50 dark:bg-black text-center transition-colors duration-300">
      <div className="container mx-auto px-4">
        <div className="text-2xl font-bold tracking-tighter mb-8">
          FREE<span className="bg-black text-white dark:bg-white dark:text-black px-1 ml-1">ANIME</span>.ORG
        </div>
        
        <div className="flex flex-wrap justify-center gap-x-8 gap-y-4 mb-10 text-sm font-medium text-neutral-600 dark:text-neutral-400">
          <a href="#" className="hover:text-black dark:hover:text-white transition-colors">{t.footer.terms}</a>
          <a href="#" className="hover:text-black dark:hover:text-white transition-colors">{t.footer.privacy}</a>
          <a href="#" className="hover:text-black dark:hover:text-white transition-colors">{t.footer.security}</a>
          <a href="#" className="hover:text-black dark:hover:text-white transition-colors">{t.footer.regions}</a>
          <a href="#" className="hover:text-black dark:hover:text-white transition-colors">{t.footer.cookies}</a>
          <a href="#" className="hover:text-black dark:hover:text-white transition-colors">{t.footer.doNotShare}</a>
        </div>

        <p className="text-xs text-neutral-500">
          {t.footer.rights.replace('{year}', currentYear.toString())}
        </p>
      </div>
    </footer>
  )
}