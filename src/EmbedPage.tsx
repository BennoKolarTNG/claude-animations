import { EmbodiedAIPipelineDiagram } from './diagram/EmbodiedAIPipelineDiagram'
import { GeneralistMotionPolicyDiagram } from './diagram/GeneralistMotionPolicyDiagram'
import { SonicArchitectureDiagram } from './diagram/SonicArchitectureDiagram'
import { VlaSplitDiagram } from './diagram/VlaSplitDiagram'
import { DeploymentLoopDiagram } from './diagram/DeploymentLoopDiagram'
import { MotionExtractionDiagram } from './diagram/MotionExtractionDiagram'
import { FullPipelineDiagram } from './diagram/FullPipelineDiagram'
import { blueTheme, redTheme } from './diagram/diagramTokens'
import type { RobotMove } from './diagram/primitives/RobotDancer'

const EMBED_NAMES = ['pipeline', 'generalist', 'sonic', 'vla', 'deployment', 'extraction', 'e2e'] as const
export type EmbedName = (typeof EMBED_NAMES)[number]

export function parseEmbedName(params: URLSearchParams): EmbedName | null {
  const name = params.get('embed')
  return EMBED_NAMES.includes(name as EmbedName) ? (name as EmbedName) : null
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
  if (name === 'vla') {
    return (
      <div className="embed-page">
        <VlaSplitDiagram showCaption={showCaption} />
      </div>
    )
  }
  if (name === 'deployment') {
    return (
      <div className="embed-page">
        <DeploymentLoopDiagram showCaption={showCaption} />
      </div>
    )
  }
  if (name === 'e2e') {
    return (
      <div className="embed-page">
        <FullPipelineDiagram showCaption={showCaption} />
      </div>
    )
  }
  if (name === 'extraction') {
    return (
      <div className="embed-page">
        <MotionExtractionDiagram showCaption={showCaption} />
      </div>
    )
  }
  return (
    <div className="embed-page">
      <SonicArchitectureDiagram showCaption={showCaption} />
    </div>
  )
}
