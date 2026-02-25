'use client'

import Image from 'next/image'

const LLM_PROMPT = `I'm learning about Brian Fending as a technology leader and want to understand his background and expertise. What are his areas of focus, what kind of problems has he solved, and what makes his experience stand out? Summarize the highlights from brianfending.com including recent articles and tools.brianfending.com.`

interface LLMPlatform {
  name: string
  url: string
  imagePath: string
  paramName: 'q' | 'text'
}

declare global {
  interface Window {
    gtag?: (command: string, eventName: string, params: Record<string, string>) => void
  }
}

export default function LLMPriming() {
  const trackLLMClick = (platform: string) => {
    // Track analytics event
    if (typeof window !== 'undefined' && window.gtag) {
      window.gtag('event', 'llm_prompt_click', {
        'llm_platform': platform,
        'site': 'ai.brianfending',
        'prompt_version': 'v1_2025_11'
      })
    }
  }

  const platforms: LLMPlatform[] = [
    {
      name: 'ChatGPT',
      url: 'https://chat.openai.com/',
      paramName: 'q',
      imagePath: '/llm-icons/chatgpt.webp'
    },
    {
      name: 'Claude',
      url: 'https://claude.ai/new',
      paramName: 'q',
      imagePath: '/llm-icons/claude.webp'
    },
    {
      name: 'Perplexity',
      url: 'https://www.perplexity.ai/search/new',
      paramName: 'q',
      imagePath: '/llm-icons/perplexity.webp'
    },
    {
      name: 'Gemini',
      url: 'https://www.google.com/search?udm=50&aep=11',
      paramName: 'q',
      imagePath: '/llm-icons/gemini.webp'
    },
    {
      name: 'Grok',
      url: 'https://x.com/i/grok',
      paramName: 'text',
      imagePath: '/llm-icons/grok.webp'
    }
  ]

  const getLLMUrl = (platform: LLMPlatform) => {
    const encodedPrompt = encodeURIComponent(LLM_PROMPT)
    const separator = platform.url.includes('?') ? '&' : '?'
    return `${platform.url}${separator}${platform.paramName}=${encodedPrompt}`
  }

  return (
    <div className="text-center">
      <h3 className="text-gray-700 text-base font-medium mb-3">
        « OR »
      </h3>
      <p className="text-gray-600 text-sm mb-4">
        Ask other AIs about Brian Fending
      </p>
      <div className="flex justify-center items-center gap-4 flex-wrap">
        {platforms.map((platform) => (
          <a
            key={platform.name}
            href={getLLMUrl(platform)}
            target="_blank"
            rel="noopener noreferrer"
            onClick={() => trackLLMClick(platform.name.toLowerCase())}
            aria-label={`Ask ${platform.name} about Brian Fending`}
            className="transition-opacity duration-200 hover:opacity-80 transform hover:scale-105"
            title={platform.name}
          >
            <Image
              src={platform.imagePath}
              alt={`${platform.name} AI search`}
              width={50}
              height={50}
              className="rounded-lg"
            />
          </a>
        ))}
      </div>
    </div>
  )
}
