import type { ReactNode } from 'react'
import {
  diagramCssVars,
  type CSSVarStyle,
  type DiagramTheme,
} from './diagramTokens'
import './diagram.css'

interface DiagramFrameProps {
  /** Accessible description of the whole figure. */
  title: string
  /** SVG coordinate system, e.g. "0 0 960 360". */
  viewBox: string
  /** Live caption below the drawing; keyed so it crossfades on change. */
  caption?: string
  captionKey?: string | number
  /** Accent palette; defaults to the blue theme. */
  theme?: DiagramTheme
  className?: string
  children: ReactNode
}

/**
 * Shared editorial frame for all diagrams: warm card, responsive SVG,
 * a serif caption line, and the design-token CSS variables at the root.
 */
export function DiagramFrame({
  title,
  viewBox,
  caption,
  captionKey,
  theme,
  className,
  children,
}: DiagramFrameProps) {
  return (
    <figure
      className={`diagram-frame${className ? ` ${className}` : ''}`}
      style={diagramCssVars(theme) as CSSVarStyle}
    >
      <svg viewBox={viewBox} role="img" aria-label={title}>
        {children}
      </svg>
      {caption !== undefined && (
        <figcaption aria-live="polite">
          <span className="diagram-caption-line" key={captionKey ?? caption}>
            {caption}
          </span>
        </figcaption>
      )}
    </figure>
  )
}
