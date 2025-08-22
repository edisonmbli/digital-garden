'use client'

import { useState } from 'react'
import { Highlight, themes } from 'prism-react-renderer'

const sampleCode = `function fibonacci(n: number): number {
  if (n <= 1) return n;
  return fibonacci(n - 1) + fibonacci(n - 2);
}

const result = fibonacci(10);
console.log('Fibonacci result:', result);

// This is a comment
const greeting = "Hello, World!";
const isActive = true;

interface User {
  id: number;
  name: string;
  email?: string;
}`

const allThemes = {
  dracula: themes.dracula,
  duotoneDark: themes.duotoneDark,
  duotoneLight: themes.duotoneLight,
  github: themes.github,
  gruvboxMaterialDark: themes.gruvboxMaterialDark,
  gruvboxMaterialLight: themes.gruvboxMaterialLight,
  jettwaveDark: themes.jettwaveDark,
  jettwaveLight: themes.jettwaveLight,
  nightOwl: themes.nightOwl,
  nightOwlLight: themes.nightOwlLight,
  oceanicNext: themes.oceanicNext,
  okaidia: themes.okaidia,
  oneDark: themes.oneDark,
  oneLight: themes.oneLight,
  palenight: themes.palenight,
  shadesOfPurple: themes.shadesOfPurple,
  synthwave84: themes.synthwave84,
  ultramin: themes.ultramin,
  vsDark: themes.vsDark,
  vsLight: themes.vsLight,
}

const lightThemes = [
  'duotoneLight',
  'github',
  'gruvboxMaterialLight',
  'jettwaveLight',
  'nightOwlLight',
  'oneLight',
  'ultramin',
  'vsLight',
]

const darkThemes = [
  'dracula',
  'duotoneDark',
  'gruvboxMaterialDark',
  'jettwaveDark',
  'nightOwl',
  'oceanicNext',
  'okaidia',
  'oneDark',
  'palenight',
  'shadesOfPurple',
  'synthwave84',
  'vsDark',
]

export default function ThemeDemo() {
  const [selectedTheme, setSelectedTheme] = useState<string>('vsDark')
  const [showMode, setShowMode] = useState<'all' | 'light' | 'dark'>('all')

  const getThemesToShow = () => {
    switch (showMode) {
      case 'light':
        return lightThemes
      case 'dark':
        return darkThemes
      default:
        return Object.keys(allThemes)
    }
  }

  const themesToShow = getThemesToShow()

  return (
    <div className="min-h-screen p-8 bg-background">
      <div className="max-w-6xl mx-auto">
        <h1 className="text-display-md mb-8">
          Prism React Renderer 主题演示
        </h1>

        <div className="mb-6 flex flex-wrap gap-4">
          <div className="flex gap-2">
            <button
              onClick={() => setShowMode('all')}
              className={`px-4 py-2 rounded ${showMode === 'all' ? 'bg-primary text-primary-foreground' : 'bg-secondary'}`}
            >
              所有主题 ({Object.keys(allThemes).length})
            </button>
            <button
              onClick={() => setShowMode('light')}
              className={`px-4 py-2 rounded ${showMode === 'light' ? 'bg-primary text-primary-foreground' : 'bg-secondary'}`}
            >
              浅色主题 ({lightThemes.length})
            </button>
            <button
              onClick={() => setShowMode('dark')}
              className={`px-4 py-2 rounded ${showMode === 'dark' ? 'bg-primary text-primary-foreground' : 'bg-secondary'}`}
            >
              深色主题 ({darkThemes.length})
            </button>
          </div>
        </div>

        <div className="mb-8">
          <h2 className="text-display-sm mb-4">
            当前选择: {selectedTheme}
          </h2>
          <div className="border rounded-lg overflow-hidden">
            <div className="bg-muted px-4 py-2 border-b">
              <span className="text-body-sm font-medium">{selectedTheme}.ts</span>
            </div>
            <Highlight
              theme={allThemes[selectedTheme as keyof typeof allThemes]}
              code={sampleCode}
              language="typescript"
            >
              {({ className, style, tokens, getLineProps, getTokenProps }) => (
                <pre
                  className={className}
                  style={{ ...style, margin: 0, padding: '1rem' }}
                >
                  {tokens.map((line, i) => (
                    <div
                      key={i}
                      {...getLineProps({ line })}
                      style={{ display: 'flex' }}
                    >
                      <span
                        style={{
                          display: 'inline-block',
                          width: '3em',
                          userSelect: 'none',
                          opacity: 0.5,
                          textAlign: 'right',
                          marginRight: '1em',
                        }}
                      >
                        {i + 1}
                      </span>
                      <span>
                        {line.map((token, key) => (
                          <span key={key} {...getTokenProps({ token })} />
                        ))}
                      </span>
                    </div>
                  ))}
                </pre>
              )}
            </Highlight>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {themesToShow.map((themeName) => (
            <div
              key={themeName}
              className={`border rounded-lg overflow-hidden cursor-pointer transition-all hover:shadow-lg ${
                selectedTheme === themeName ? 'ring-2 ring-primary' : ''
              }`}
              onClick={() => setSelectedTheme(themeName)}
            >
              <div className="bg-muted px-3 py-2 border-b">
                <div className="flex justify-between items-center">
                  <span className="text-body-sm font-medium">{themeName}</span>
                  <span className="text-body-xs text-muted-foreground">
                    {lightThemes.includes(themeName) ? '浅色' : '深色'}
                  </span>
                </div>
              </div>
              <div className="h-48 overflow-hidden">
                <Highlight
                  theme={allThemes[themeName as keyof typeof allThemes]}
                  code={sampleCode.split('\n').slice(0, 8).join('\n')}
                  language="typescript"
                >
                  {({
                    className,
                    style,
                    tokens,
                    getLineProps,
                    getTokenProps,
                  }) => (
                    <pre
                      className={className}
                      style={{
                        ...style,
                        margin: 0,
                        padding: '0.75rem',
                        fontSize: '0.75rem',
                      }}
                    >
                      {tokens.map((line, i) => (
                        <div key={i} {...getLineProps({ line })}>
                          {line.map((token, key) => (
                            <span key={key} {...getTokenProps({ token })} />
                          ))}
                        </div>
                      ))}
                    </pre>
                  )}
                </Highlight>
              </div>
            </div>
          ))}
        </div>

        <div className="mt-8 p-4 bg-muted rounded-lg">
          <h3 className="text-body-base font-semibold mb-2">使用方法:</h3>
          <code className="text-body-sm bg-background px-2 py-1 rounded">
            import &#123; themes &#125; from &apos;prism-react-renderer&apos;
            <br />
            theme=&#123;themes.{selectedTheme}&#125;
          </code>
        </div>
      </div>
    </div>
  )
}
