'use client'

import ReactMarkdown from 'react-markdown'
import remarkGfm from 'remark-gfm'
import type { Message, MessageDownload } from './ChatInterface'

interface ChatMessageProps {
  message: Message
  isStreaming?: boolean
  onAddToList?: (collegeName: string) => void
  addingToList?: string | null  // college name currently being added (shows spinner)
  onAddToScholarshipList?: (scholarshipName: string) => void
  addingToScholarshipList?: string | null
  onAddToEnrichmentList?: (programName: string) => void
  addingToEnrichmentList?: string | null
}

// Strip markdown bold markers before matching so "**University of X**" is treated
// the same as "University of X". Name must still start with a capital letter to
// reject generic phrases like "any of these". Returns all matches so multiple
// colleges in one response each get their own button.
function extractResearchListOffers(content: string): string[] {
  const stripped = content.replace(/\*\*/g, '')
  return [...stripped.matchAll(/Want to add ([A-Z][^?]+?) to (?:your|her|his|their|.+?'s) research list\?/g)]
    .map(m => m[1].trim())
}

function extractScholarshipListOffers(content: string): string[] {
  const stripped = content.replace(/\*\*/g, '')
  return [...stripped.matchAll(/Want to add ([A-Z][^?]+?) to (?:your|her|his|their|.+?'s) scholarship list\?/g)]
    .map(m => m[1].trim())
}

function extractEnrichmentListOffers(content: string): string[] {
  const stripped = content.replace(/\*\*/g, '')
  return [...stripped.matchAll(/Want to add ([A-Z][^?]+?) to (?:your|her|his|their|.+?'s) enrichment list\?/g)]
    .map(m => m[1].trim())
}

export function ChatMessage({ message, isStreaming, onAddToList, addingToList, onAddToScholarshipList, addingToScholarshipList, onAddToEnrichmentList, addingToEnrichmentList }: ChatMessageProps) {
  const isUser = message.role === 'user'

  if (isUser) {
    return (
      <div className="flex justify-end gap-3 max-w-3xl w-full self-end">
        <div className="bg-indigo-600 text-white px-4 py-3 rounded-2xl rounded-br-sm text-sm leading-relaxed max-w-[calc(100%-44px)]">
          {message.content}
        </div>
        <div className="w-8 h-8 rounded-full bg-indigo-600 flex items-center justify-center text-white text-xs font-bold flex-shrink-0 mt-0.5">
          U
        </div>
      </div>
    )
  }

  // Assistant message
  return (
    <div className="flex gap-3 max-w-3xl w-full self-start">
      {/* Avatar */}
      <div className="w-8 h-8 rounded-full bg-indigo-100 flex items-center justify-center flex-shrink-0 mt-0.5">
        <svg
          xmlns="http://www.w3.org/2000/svg"
          viewBox="0 0 24 24"
          fill="currentColor"
          className="w-4 h-4 text-indigo-600"
        >
          <path d="M11.7 2.805a.75.75 0 01.6 0A60.65 60.65 0 0122.83 8.72a.75.75 0 01-.231 1.337 49.949 49.949 0 00-9.902 3.912l-.003.002-.34.18a.75.75 0 01-.707 0A50.009 50.009 0 007.5 12.174v-.224c0-.131.067-.248.172-.311a54.614 54.614 0 014.653-2.52.75.75 0 00-.65-1.352 56.129 56.129 0 00-4.78 2.589 1.858 1.858 0 00-.859 1.228 49.803 49.803 0 00-4.634-1.527.75.75 0 01-.231-1.337A60.653 60.653 0 0111.7 2.805z" />
          <path d="M13.06 15.473a48.45 48.45 0 017.666-3.282c.134 1.414.22 2.843.255 4.285a.75.75 0 01-.46.71 47.878 47.878 0 00-8.105 4.342.75.75 0 01-.832 0 47.877 47.877 0 00-8.104-4.342.75.75 0 01-.461-.71c.035-1.442.121-2.87.255-4.286A48.4 48.4 0 016 13.18v1.27a1.5 1.5 0 00-.14 2.508c-.09.38-.222.753-.397 1.11.452.213.901.434 1.346.661a6.729 6.729 0 00.551-1.608 1.5 1.5 0 00.14-2.67v-.645a48.549 48.549 0 013.44 1.668 2.25 2.25 0 002.12 0z" />
        </svg>
      </div>

      {/* Bubble */}
      <div className="bg-white shadow-sm border border-gray-100 rounded-2xl rounded-bl-sm px-4 py-3 text-sm leading-relaxed text-gray-800 max-w-[calc(100%-44px)]">
        {message.content === '' && isStreaming ? (
          /* Typing dots */
          <div className="flex items-center gap-1 py-1">
            <span
              className="w-2 h-2 bg-indigo-300 rounded-full animate-bounce"
              style={{ animationDelay: '0ms' }}
            />
            <span
              className="w-2 h-2 bg-indigo-300 rounded-full animate-bounce"
              style={{ animationDelay: '150ms' }}
            />
            <span
              className="w-2 h-2 bg-indigo-300 rounded-full animate-bounce"
              style={{ animationDelay: '300ms' }}
            />
          </div>
        ) : (
          <>
            <ReactMarkdown
              remarkPlugins={[[remarkGfm, { singleTilde: false, strikethrough: false }]]}
              components={{
                h2: ({ children }) => (
                  <h2 className="text-base font-bold mt-3 mb-1.5 first:mt-0">{children}</h2>
                ),
                h3: ({ children }) => (
                  <h3 className="text-sm font-bold mt-2.5 mb-1 text-indigo-700 first:mt-0">
                    {children}
                  </h3>
                ),
                p: ({ children }) => <p className="my-1.5 first:mt-0 last:mb-0">{children}</p>,
                ul: ({ children }) => (
                  <ul className="my-1.5 ml-5 list-disc space-y-0.5">{children}</ul>
                ),
                ol: ({ children }) => (
                  <ol className="my-1.5 ml-5 list-decimal space-y-0.5">{children}</ol>
                ),
                li: ({ children }) => <li className="text-sm">{children}</li>,
                strong: ({ children }) => (
                  <strong className="font-semibold">{children}</strong>
                ),
                em: ({ children }) => <em className="italic">{children}</em>,
                code: ({ children, className }) => {
                  const isBlock = className?.includes('language-')
                  if (isBlock) {
                    return (
                      <pre className="bg-slate-50 rounded-lg p-3 my-2 overflow-x-auto text-xs font-mono">
                        <code>{children}</code>
                      </pre>
                    )
                  }
                  return (
                    <code className="bg-slate-100 px-1.5 py-0.5 rounded text-xs font-mono">
                      {children}
                    </code>
                  )
                },
                table: ({ children }) => (
                  <div className="overflow-x-auto my-2">
                    <table className="border-collapse w-full text-xs">{children}</table>
                  </div>
                ),
                th: ({ children }) => (
                  <th className="border border-slate-200 bg-slate-50 px-3 py-1.5 text-left font-semibold">
                    {children}
                  </th>
                ),
                td: ({ children }) => (
                  <td className="border border-slate-200 px-3 py-1.5">{children}</td>
                ),
                blockquote: ({ children }) => (
                  <blockquote className="border-l-4 border-indigo-200 pl-3 my-2 italic text-gray-500">
                    {children}
                  </blockquote>
                ),
                hr: () => <hr className="border-gray-100 my-3" />,
                a: ({ href, children }) => (
                  <a
                    href={href}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-indigo-600 underline hover:text-indigo-800"
                  >
                    {children}
                  </a>
                ),
              }}
            >
              {message.content}
            </ReactMarkdown>
            {/* Blinking cursor while streaming */}
            {isStreaming && (
              <span className="inline-block w-0.5 h-4 bg-indigo-500 ml-0.5 animate-pulse align-middle" />
            )}
          </>
        )}

        {/* Add to Research List buttons — one per college offer, shown when streaming is done */}
        {!isStreaming && onAddToList && (() => {
          const colleges = extractResearchListOffers(message.content)
          if (colleges.length === 0) return null
          return (
            <div className="mt-3 flex flex-col gap-2">
              {colleges.map((collegeName) => {
                const isAdding = addingToList === collegeName
                return (
                  <button
                    key={collegeName}
                    onClick={() => onAddToList(collegeName)}
                    disabled={isAdding}
                    className="inline-flex items-center gap-1.5 bg-emerald-50 hover:bg-emerald-100 border border-emerald-200 text-emerald-700 text-xs font-medium px-3 py-1.5 rounded-lg transition-colors disabled:opacity-60 disabled:cursor-not-allowed self-start"
                  >
                    {isAdding ? (
                      <>
                        <svg className="w-3.5 h-3.5 animate-spin flex-shrink-0" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z" />
                        </svg>
                        Adding…
                      </>
                    ) : (
                      <>
                        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="w-3.5 h-3.5 flex-shrink-0">
                          <path d="M10.75 4.75a.75.75 0 00-1.5 0v4.5h-4.5a.75.75 0 000 1.5h4.5v4.5a.75.75 0 001.5 0v-4.5h4.5a.75.75 0 000-1.5h-4.5v-4.5z" />
                        </svg>
                        Add {collegeName} to Research List
                      </>
                    )}
                  </button>
                )
              })}
            </div>
          )
        })()}

        {/* Add to Scholarship List buttons — one per scholarship offer */}
        {!isStreaming && onAddToScholarshipList && (() => {
          const scholarships = extractScholarshipListOffers(message.content)
          if (scholarships.length === 0) return null
          return (
            <div className="mt-3 flex flex-col gap-2">
              {scholarships.map((scholarshipName) => {
                const isAdding = addingToScholarshipList === scholarshipName
                return (
                  <button
                    key={scholarshipName}
                    onClick={() => onAddToScholarshipList(scholarshipName)}
                    disabled={isAdding}
                    className="inline-flex items-center gap-1.5 bg-amber-50 hover:bg-amber-100 border border-amber-200 text-amber-700 text-xs font-medium px-3 py-1.5 rounded-lg transition-colors disabled:opacity-60 disabled:cursor-not-allowed self-start"
                  >
                    {isAdding ? (
                      <>
                        <svg className="w-3.5 h-3.5 animate-spin flex-shrink-0" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z" />
                        </svg>
                        Adding…
                      </>
                    ) : (
                      <>
                        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="w-3.5 h-3.5 flex-shrink-0">
                          <path d="M10.75 4.75a.75.75 0 00-1.5 0v4.5h-4.5a.75.75 0 000 1.5h4.5v4.5a.75.75 0 001.5 0v-4.5h4.5a.75.75 0 000-1.5h-4.5v-4.5z" />
                        </svg>
                        Add {scholarshipName} to Scholarship List
                      </>
                    )}
                  </button>
                )
              })}
            </div>
          )
        })()}

        {/* Add to Enrichment List buttons — one per program offer */}
        {!isStreaming && onAddToEnrichmentList && (() => {
          const programs = extractEnrichmentListOffers(message.content)
          if (programs.length === 0) return null
          return (
            <div className="mt-3 flex flex-col gap-2">
              {programs.map((programName) => {
                const isAdding = addingToEnrichmentList === programName
                return (
                  <button
                    key={programName}
                    onClick={() => onAddToEnrichmentList(programName)}
                    disabled={isAdding}
                    className="inline-flex items-center gap-1.5 bg-amber-50 hover:bg-amber-100 border border-amber-200 text-amber-700 text-xs font-medium px-3 py-1.5 rounded-lg transition-colors disabled:opacity-60 disabled:cursor-not-allowed self-start"
                  >
                    {isAdding ? (
                      <>
                        <svg className="w-3.5 h-3.5 animate-spin flex-shrink-0" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z" />
                        </svg>
                        Adding…
                      </>
                    ) : (
                      <>
                        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="w-3.5 h-3.5 flex-shrink-0">
                          <path d="M10.75 4.75a.75.75 0 00-1.5 0v4.5h-4.5a.75.75 0 000 1.5h4.5v4.5a.75.75 0 001.5 0v-4.5h4.5a.75.75 0 000-1.5h-4.5v-4.5z" />
                        </svg>
                        Add {programName} to Enrichment List
                      </>
                    )}
                  </button>
                )
              })}
            </div>
          )
        })()}

        {/* Download buttons — shown when Claude prepared files */}
        {message.downloads && message.downloads.length > 0 && (
          <div className="mt-3 flex flex-wrap gap-2">
            {message.downloads.map((dl: MessageDownload, i: number) => (
              <a
                key={i}
                href={`data:text/html;charset=utf-8,${encodeURIComponent(dl.content)}`}
                download={dl.filename}
                className="inline-flex items-center gap-1.5 bg-indigo-50 hover:bg-indigo-100 border border-indigo-200 text-indigo-700 text-xs font-medium px-3 py-1.5 rounded-lg transition-colors"
              >
                <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="w-3.5 h-3.5 flex-shrink-0">
                  <path d="M10.75 2.75a.75.75 0 00-1.5 0v8.614L6.295 8.235a.75.75 0 10-1.09 1.03l4.25 4.5a.75.75 0 001.09 0l4.25-4.5a.75.75 0 00-1.09-1.03l-2.955 3.129V2.75z" />
                  <path d="M3.5 12.75a.75.75 0 00-1.5 0v2.5A2.75 2.75 0 004.75 18h10.5A2.75 2.75 0 0018 15.25v-2.5a.75.75 0 00-1.5 0v2.5c0 .69-.56 1.25-1.25 1.25H4.75c-.69 0-1.25-.56-1.25-1.25v-2.5z" />
                </svg>
                {dl.label}
              </a>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
