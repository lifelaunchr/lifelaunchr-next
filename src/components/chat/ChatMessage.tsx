'use client'

import ReactMarkdown from 'react-markdown'
import remarkGfm from 'remark-gfm'
import type { Message } from './ChatInterface'

interface ChatMessageProps {
  message: Message
  isStreaming?: boolean
}

export function ChatMessage({ message, isStreaming }: ChatMessageProps) {
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
              remarkPlugins={[remarkGfm]}
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
      </div>
    </div>
  )
}
