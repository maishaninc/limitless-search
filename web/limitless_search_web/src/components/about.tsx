"use client"

import { motion } from "framer-motion"
import { useLanguage } from "@/lib/i18n"
import { Copy, Check } from "lucide-react"
import { useState, useEffect } from "react"
import Image from "next/image"
import { useTheme } from "next-themes"

export function About() {
  const { t } = useLanguage()
  const { resolvedTheme } = useTheme()
  const [mounted, setMounted] = useState(false)
  const [copied, setCopied] = useState(false)
  const walletAddress = "EWc3cC8kXS3RdK2YhYE1gXX82iuZxqCMjqgMo2R5oXxf"

  useEffect(() => {
    setMounted(true)
  }, [])

  const handleCopy = () => {
    navigator.clipboard.writeText(walletAddress)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  const getIconSuffix = () => {
    return resolvedTheme === "dark" ? "bai" : "hei"
  }

  return (
    <section id="about" className="py-24 bg-white dark:bg-black">
      <div className="container mx-auto px-4">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
          viewport={{ once: true }}
          className="max-w-4xl mx-auto text-center"
        >
          <h2 className="text-3xl md:text-5xl font-bold tracking-tighter mb-8">{t.about.title}</h2>
          <div className="space-y-6 mb-16">
            <p className="text-lg md:text-xl text-neutral-600 dark:text-neutral-400 leading-relaxed">
              {t.about.content}
            </p>
            <p className="text-base md:text-lg font-medium text-black dark:text-white">
              {t.about.contact}
            </p>
          </div>

          {/* Donation Section */}
          <div className="pt-12 border-t border-neutral-200 dark:border-neutral-800">
            <h3 className="text-2xl md:text-3xl font-bold tracking-tighter mb-6">{t.donate.title}</h3>
            <p className="text-lg text-neutral-600 dark:text-neutral-400 mb-8">
              {t.donate.description}
            </p>
            
            <div className="bg-neutral-50 dark:bg-neutral-900 rounded-2xl p-8 border border-neutral-200 dark:border-neutral-800 max-w-2xl mx-auto">
              <p className="text-sm font-medium text-neutral-500 uppercase tracking-wider mb-4">{t.donate.supportedMethods}</p>
              <p className="text-base text-neutral-900 dark:text-white mb-6">
                {t.donate.methodDesc}
              </p>
              
              <div className="relative group">
                <div className="flex items-center justify-between gap-4 bg-white dark:bg-black border border-neutral-200 dark:border-neutral-800 rounded-xl p-4 break-all">
                  <code className="text-sm md:text-base font-mono text-neutral-600 dark:text-neutral-300">
                    {walletAddress}
                  </code>
                  <button
                    onClick={handleCopy}
                    className="p-2 rounded-lg hover:bg-neutral-100 dark:hover:bg-neutral-800 transition-colors shrink-0"
                    aria-label="Copy address"
                  >
                    {copied ? (
                      <Check className="w-5 h-5 text-green-500" />
                    ) : (
                      <Copy className="w-5 h-5 text-neutral-500" />
                    )}
                  </button>
                </div>
              </div>
              
              <p className="text-sm text-neutral-500 mt-6">
                {t.donate.addressNote}
              </p>
            </div>

            <div className="mt-10 max-w-4xl mx-auto">
              <h4 className="text-xl md:text-2xl font-semibold mb-6 text-neutral-900 dark:text-white">
                {t.donate.advantagesTitle}
              </h4>
              <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4">
                {t.donate.advantages.map((advantage, index) => {
                  return (
                    <div 
                      key={index} 
                      className="flex flex-col items-center justify-center gap-3 p-4 rounded-xl bg-neutral-50 dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 hover:bg-neutral-100 dark:hover:bg-neutral-800 transition-colors"
                    >
                      <div className="flex-shrink-0 w-12 h-12 relative flex items-center justify-center">
                        {mounted && (
                          <>
                            {index === 0 && <Image src={`/img/noad-${getIconSuffix()}.svg`} alt="No Ads" width={48} height={48} className="w-full h-full object-contain" />}
                            {index === 1 && <Image src={`/img/Languageimg-${getIconSuffix()}.svg`} alt="Language" width={48} height={48} className="w-full h-full object-contain" />}
                            {index === 2 && <Image src={`/img/golang-${getIconSuffix()}.svg`} alt="Golang" width={48} height={48} className="w-full h-full object-contain" />}
                            {index === 3 && <Image src={`/img/next-${getIconSuffix()}.svg`} alt="Next.js" width={48} height={48} className="w-full h-full object-contain" />}
                            {index === 4 && <Image src={`/img/React-${getIconSuffix()}.svg`} alt="React" width={48} height={48} className="w-full h-full object-contain" />}
                          </>
                        )}
                      </div>
                      <p className="text-sm font-medium text-neutral-900 dark:text-white text-center">
                        {advantage}
                      </p>
                    </div>
                  )
                })}
              </div>
            </div>
          </div>
        </motion.div>
      </div>
    </section>
  )
}
