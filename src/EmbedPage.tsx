import { EmbodiedAIPipelineDiagram } from './diagram/EmbodiedAIPipelineDiagram'
import { GeneralistMotionPolicyDiagram } from './diagram/GeneralistMotionPolicyDiagram'
import { SonicArchitectureDiagram } from './diagram/SonicArchitectureDiagram'
import { blueTheme, redTheme } from './diagram/diagramTokens'
import type { RobotMove } from './diagram/primitives/RobotDancer'

export type EmbedName = 'pipeline' | 'generalist' | 'sonic'

export function parseEmbedName(params: URLSearchParams): EmbedName | null {
  const name = params.get('embed')
  if (name === 'pipeline' || name === 'generalist' || name === 'sonic') {
    return name
  }
  return null
}

/**
 * Chrome-less single-diagram page for iframe embedding (Notion embed
 * blocks, Confluence iframe macros, plain <iframe> tags).
 *
 *   ?embed=pipeline            specialist RL pipeline (blue, disco)
 *   ?embed=pipeline&theme=red&move=kick
 *   ?embed=generalist          one policy, many motions
 *   ?embed=sonic               SONIC encoder–latent–decoder
 *   &caption=off               hide the narrating caption line
 */
export function EmbedPage({ name }: { name: EmbedName }) {
  const params = new URLSearchParams(window.location.search)
  const showCaption = params.get('caption') !== 'off'

  if (name === 'pipeline') {
    const theme = params.get('theme') === 'red' ? redTheme : blueTheme
    const move: RobotMove = params.get('move') === 'kick' ? 'kick' : 'disco'
    return (
      <div className="embed-page">
        <EmbodiedAIPipelineDiagram theme={theme} robotMove={move} showCaption={showCaption} />
      </div>
    )
  }
  if (name === 'generalist') {
    return (
      <div className="embed-page">
        <GeneralistMotionPolicyDiagram showCaption={showCaption} />
      </div>
    )
  }
  return (
    <div className="embed-page">
      <SonicArchitectureDiagram showCaption={showCaption} />
    </div>
  )
}
