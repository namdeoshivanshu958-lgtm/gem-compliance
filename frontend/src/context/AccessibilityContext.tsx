import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react'

export type FontSize = 'normal' | 'large' | 'xlarge'
export type Language = 'en' | 'hi'

interface AccessibilityContextType {
  fontSize: FontSize
  setFontSize: (size: FontSize) => void
  language: Language
  setLanguage: (lang: Language) => void
  highContrast: boolean
  setHighContrast: (val: boolean) => void
  t: (key: string, defaultText: string) => string
}

const AccessibilityContext = createContext<AccessibilityContextType | undefined>(undefined)

const HINDI_TRANSLATIONS: Record<string, string> = {
  // Top bar
  'gov_india': 'भारत सरकार',
  'mopng': 'पेट्रोलियम एवं प्राकृतिक गैस मंत्रालय',
  'cpcl': 'चेन्नई पेट्रोलियम कॉर्पोरेशन लिमिटेड (सीपीसीएल)',
  'sign_in': 'पोर्टल लॉगिन',
  'sign_out': 'लॉगआउट',
  'prototype_notice': 'एसआईएच 2026 प्रदर्शन प्रोटोटाइप | जीईएम खरीद अनुपालन सत्यापन',

  // Navigation
  'nav_home': 'मुख्य पृष्ठ',
  'nav_active_tenders': 'सक्रिय निविदाएं',
  'nav_compliance': 'अनुपालन सत्यापन',
  'nav_quick_services': 'त्वरित सेवाएं',
  'nav_audit_vault': 'ब्लॉकचेन ऑडिट वॉल्ट',
  'nav_vendor_registration': 'विक्रेता पंजीकरण',
  'nav_vendor_portal': 'विक्रेता पोर्टल',
  'nav_officer_console': 'अधिकारी कंसोल',
  'nav_help': 'सहायता एवं निर्देश',

  // Homepage
  'hero_tag': 'निश्चयात्मक नियम-आधारित इंजन (DETERMINISTIC ENGINE)',
  'hero_title': 'एआई-संचालित एकीकृत बोली अनुपालन सत्यापन मंच',
  'hero_subtitle': 'दस्तावेज़ की एआई-सहायता प्राप्त समझ, निश्चयात्मक नियमों के आधार पर मूल्यांकन और छेड़छाड़-रहित ब्लॉकचेन ऑडिट ट्रेल।',
  'btn_open_portal': 'सत्यापन पोर्टल खोलें',
  'btn_audit_vault': 'ब्लॉकचेन वॉल्ट देखें',
  'official_notice': 'आधिकारिक सूचना',
  'quick_services_title': 'नागरिक एवं विक्रेता त्वरित सेवाएं',
  'compliance_stats_title': 'मंच अनुपालन सांख्यिकी',
  'how_it_works': 'सत्यापन प्रक्रिया कैसे कार्य करती है',
  'security_trust': 'सुरक्षा, पारदर्शिता एवं विश्वास',

  // Actions
  'search_placeholder': 'निविदा संख्या, शीर्षक, विक्रेता, जीएसटी नंबर दर्ज करें...',
  'filter_all': 'सभी',
  'filter_equipment': 'उपकरण',
  'filter_services': 'सेवाएं',
  'filter_safety': 'सुरक्षा',
  'filter_chemicals': 'रसायन',
}

export function AccessibilityProvider({ children }: { children: ReactNode }) {
  const [fontSize, setFontSizeState] = useState<FontSize>(() => {
    return (localStorage.getItem('gem_font_size') as FontSize) || 'normal'
  })
  const [language, setLanguageState] = useState<Language>(() => {
    return (localStorage.getItem('gem_lang') as Language) || 'en'
  })
  const [highContrast, setHighContrastState] = useState<boolean>(() => {
    return localStorage.getItem('gem_high_contrast') === 'true'
  })

  useEffect(() => {
    const root = document.documentElement
    root.classList.remove('font-size-normal', 'font-size-large', 'font-size-xlarge')
    root.classList.add(`font-size-${fontSize}`)
    localStorage.setItem('gem_font_size', fontSize)
  }, [fontSize])

  useEffect(() => {
    const root = document.documentElement
    if (highContrast) {
      root.classList.add('high-contrast')
    } else {
      root.classList.remove('high-contrast')
    }
    localStorage.setItem('gem_high_contrast', String(highContrast))
  }, [highContrast])

  const setFontSize = (size: FontSize) => setFontSizeState(size)
  const setLanguage = (lang: Language) => {
    setLanguageState(lang)
    localStorage.setItem('gem_lang', lang)
  }
  const setHighContrast = (val: boolean) => setHighContrastState(val)

  const t = (key: string, defaultText: string): string => {
    if (language === 'hi' && HINDI_TRANSLATIONS[key]) {
      return HINDI_TRANSLATIONS[key]
    }
    return defaultText
  }

  return (
    <AccessibilityContext.Provider
      value={{
        fontSize,
        setFontSize,
        language,
        setLanguage,
        highContrast,
        setHighContrast,
        t,
      }}
    >
      {children}
    </AccessibilityContext.Provider>
  )
}

export function useAccessibility() {
  const ctx = useContext(AccessibilityContext)
  if (!ctx) throw new Error('useAccessibility must be used within AccessibilityProvider')
  return ctx
}
