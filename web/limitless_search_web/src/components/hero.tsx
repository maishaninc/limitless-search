"use client"

import { motion } from "framer-motion"
import { useLanguage } from "@/lib/i18n"

export function Hero({ children }: { children?: React.ReactNode }) {
  const { t } = useLanguage()

  return (
    <section className="relative min-h-[60vh] flex flex-col items-center justify-center overflow-hidden pt-32 pb-16">
      {/* Background Pattern */}
      <div className="absolute inset-0 z-0 opacity-10 dark:opacity-20 pointer-events-none">
        <div className="absolute inset-0 bg-[linear-gradient(to_right,#80808012_1px,transparent_1px),linear-gradient(to_bottom,#80808012_1px,transparent_1px)] bg-[size:24px_24px]"></div>
      </div>

      <div className="container mx-auto px-4 z-10 flex flex-col items-center text-center">
        <motion.h1
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.1 }}
          className="text-3xl md:text-5xl font-black tracking-tighter mb-12 max-w-4xl"
        >
          {t.hero.title}
        </motion.h1>

        {children && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.3 }}
            className="w-full max-w-2xl mb-12"
          >
            {children}
          </motion.div>
        )}
      </div>
      
      {/* Decorative Circle */}
      <motion.div 
        animate={{ 
          scale: [1, 1.1, 1],
          opacity: [0.3, 0.5, 0.3]
        }}
        transition={{ 
          duration: 8, 
          repeat: Infinity,
          ease: "easeInOut" 
        }}
        className="absolute -bottom-1/2 left-1/2 -translate-x-1/2 w-[1000px] h-[1000px] rounded-full border border-neutral-200 dark:border-neutral-800 -z-10"
      />
    </section>
  )
}
