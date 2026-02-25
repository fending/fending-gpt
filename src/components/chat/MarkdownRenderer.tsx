'use client'

import { useEffect, useRef, useState, useMemo, memo, isValidElement } from 'react'
import ReactMarkdown from 'react-markdown'
import remarkGfm from 'remark-gfm'
import { Maximize2, Minimize2 } from 'lucide-react'
import type { Components } from 'react-markdown'

interface MermaidBlockProps {
  chart: string
}

function MermaidBlock({ chart }: MermaidBlockProps) {
  const [svg, setSvg] = useState<string>('')
  const [error, setError] = useState(false)
  const [expanded, setExpanded] = useState(false)
  const [zoom, setZoom] = useState(1)
  const containerRef = useRef<HTMLDivElement>(null)
  const renderedChartRef = useRef<string>('')

  useEffect(() => {
    const trimmed = chart.trim()
    // Skip if we already rendered this exact chart
    if (trimmed === renderedChartRef.current && svg) return

    // Show loader while rendering (not stale error or empty state)
    setError(false)

    let cancelled = false

    async function attemptRender(retries: number) {
      try {
        const mermaid = (await import('mermaid')).default
        mermaid.initialize({
          startOnLoad: false,
          theme: 'neutral',
          securityLevel: 'strict',
          fontFamily: 'var(--font-sans)',
        })

        const tempContainer = document.createElement('div')
        tempContainer.style.position = 'absolute'
        tempContainer.style.left = '-9999px'
        tempContainer.style.top = '-9999px'
        document.body.appendChild(tempContainer)

        const id = `mermaid-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`

        try {
          const { svg: rendered } = await mermaid.render(id, trimmed, tempContainer)
          if (!cancelled) {
            renderedChartRef.current = trimmed
            setSvg(rendered)
            setError(false)
          }
        } finally {
          tempContainer.remove()
          document.getElementById(id)?.remove()
        }
      } catch {
        if (cancelled) return
        if (retries > 0) {
          await new Promise(r => setTimeout(r, 500))
          if (!cancelled) await attemptRender(retries - 1)
        } else {
          setError(true)
        }
      }
    }

    attemptRender(2)
    return () => { cancelled = true }
  }, [chart, svg])

  if (error) {
    return (
      <div className="my-3 rounded-lg border border-amber-200 bg-amber-50 p-3">
        <p className="text-xs text-amber-700">Could not render diagram</p>
      </div>
    )
  }

  if (!svg) {
    return (
      <div className="my-3 flex items-center justify-center rounded-lg border border-gray-200 bg-gray-50 p-6">
        <span className="text-sm text-gray-400">Rendering diagram...</span>
      </div>
    )
  }

  // SVG from mermaid.render() is generated locally, not from user input
  return (
    <>
      <div className="my-3 relative group rounded-lg border border-gray-200 bg-white">
        <button
          onClick={() => setExpanded(true)}
          className="absolute top-2 right-2 z-10 p-1.5 rounded-md bg-white/80 border border-gray-200 text-gray-500 opacity-0 group-hover:opacity-100 transition-opacity hover:bg-gray-100 hover:text-gray-700"
          aria-label="Expand diagram"
        >
          <Maximize2 size={14} />
        </button>
        <div
          ref={containerRef}
          className="flex justify-center overflow-x-auto p-4"
          dangerouslySetInnerHTML={{ __html: svg }}
        />
      </div>

      {expanded && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-8"
          onClick={() => { setExpanded(false); setZoom(1) }}
        >
          <div
            className="relative w-[90vw] h-[85vh] overflow-auto rounded-xl bg-white shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="sticky top-0 z-10 flex items-center justify-end gap-1 px-4 py-2 bg-white/90 backdrop-blur-sm border-b border-gray-100">
              <button
                onClick={() => setZoom(z => Math.max(0.25, z - 0.25))}
                disabled={zoom <= 0.25}
                className="px-2 py-1 text-sm rounded-md bg-gray-100 text-gray-600 hover:bg-gray-200 disabled:opacity-30 disabled:cursor-not-allowed"
              >
                -
              </button>
              <span className="text-xs text-gray-500 w-12 text-center tabular-nums">
                {Math.round(zoom * 100)}%
              </span>
              <button
                onClick={() => setZoom(z => Math.min(3, z + 0.25))}
                disabled={zoom >= 3}
                className="px-2 py-1 text-sm rounded-md bg-gray-100 text-gray-600 hover:bg-gray-200 disabled:opacity-30 disabled:cursor-not-allowed"
              >
                +
              </button>
              <button
                onClick={() => setZoom(1)}
                className="px-2 py-1 text-xs rounded-md bg-gray-100 text-gray-500 hover:bg-gray-200 ml-1"
              >
                Reset
              </button>
              <div className="w-px h-5 bg-gray-200 mx-1" />
              <button
                onClick={() => { setExpanded(false); setZoom(1) }}
                className="p-1.5 rounded-md bg-gray-100 text-gray-600 hover:bg-gray-200 hover:text-gray-800 transition-colors"
                aria-label="Collapse diagram"
              >
                <Minimize2 size={14} />
              </button>
            </div>
            <div
              className="p-6"
              style={{ transform: `scale(${zoom})`, transformOrigin: 'top center' }}
            >
              <div
                className="transition-transform duration-150 w-full"
                dangerouslySetInnerHTML={{
                  __html: svg
                    .replace(/\swidth="[^"]*"/, '')
                    .replace(/\sheight="[^"]*"/, '')
                    .replace(/style="[^"]*"/, '')
                    .replace(/(<svg[^>]*)>/, '$1 style="width:100%;height:auto">')
                }}
              />
            </div>
          </div>
        </div>
      )}
    </>
  )
}

const MemoizedMermaidBlock = memo(MermaidBlock)

function MermaidPlaceholder() {
  return (
    <div className="my-3 flex items-center justify-center rounded-lg border border-gray-200 bg-gray-50 p-6">
      <span className="text-sm text-gray-400">Diagram will render when complete...</span>
    </div>
  )
}

function buildComponents(isStreaming: boolean): Components {
  return {
    code({ className, children, ...props }) {
      const match = /language-(\w+)/.exec(className || '')
      const lang = match?.[1]
      const codeString = String(children).replace(/\n$/, '')

      if (lang === 'mermaid') {
        if (isStreaming) {
          return <MermaidPlaceholder />
        }
        return <MemoizedMermaidBlock chart={codeString} />
      }

      // Inline code (no language class, no block wrapper)
      if (!lang) {
        return (
          <code className="chat-inline-code" {...props}>
            {children}
          </code>
        )
      }

      // Block code with language
      return (
        <code className={className} {...props}>
          {children}
        </code>
      )
    },
    pre({ children }) {
      // react-markdown wraps fenced code in <pre>. For mermaid blocks,
      // our code component returns a custom component (not a <code> element),
      // so pass through without code-block styling.
      if (isValidElement(children) && typeof children.type !== 'string') {
        return <>{children}</>
      }
      return <pre className="chat-code-block">{children}</pre>
    },
    a({ href, children }) {
      return (
        <a href={href} target="_blank" rel="noopener noreferrer" className="chat-link">
          {children}
        </a>
      )
    },
  }
}

interface MarkdownRendererProps {
  content: string
  isStreaming?: boolean
}

export default function MarkdownRenderer({ content, isStreaming = false }: MarkdownRendererProps) {
  const components = useMemo(() => buildComponents(isStreaming), [isStreaming])

  return (
    <div className="chat-markdown">
      <ReactMarkdown remarkPlugins={[remarkGfm]} components={components}>
        {content}
      </ReactMarkdown>
    </div>
  )
}
