import { EmbodiedAIPipelineDiagram } from './diagram/EmbodiedAIPipelineDiagram'
import { GeneralistMotionPolicyDiagram } from './diagram/GeneralistMotionPolicyDiagram'
import { SonicArchitectureDiagram } from './diagram/SonicArchitectureDiagram'
import { redTheme } from './diagram/diagramTokens'

export default function App() {
  return (
    <main className="essay">
      <p className="essay-kicker">Embodied AI · Part I</p>
      <h1>Learning to Act</h1>
      <p className="essay-lede">
        Robots don&rsquo;t learn to move by reading about movement. They learn
        the way everything embodied learns&thinsp;&mdash;&thinsp;by watching,
        compressing what they see, and practicing until the world rewards them.
      </p>
      <p>
        The pipeline below is the whole story in miniature. Video streams in
        and is squeezed through an encoder into a compact latent
        representation. From those latents a policy network takes shape, and
        reinforcement learning spins it through millions of trials. What comes
        out the other side is the same network, now
        trained&thinsp;&mdash;&thinsp;small enough to run on a robot, good
        enough to make it move.
      </p>

      <EmbodiedAIPipelineDiagram className="essay-figure" />

      <p>
        Every stage of this loop is an act of compression: pixels into tokens,
        tokens into weights, weights into behavior. The dance at the end is
        not decoration&thinsp;&mdash;&thinsp;it is the entire point. A model
        that cannot act is just a very confident spectator.
      </p>

      <p>
        And the pipeline doesn&rsquo;t care what it learns. Feed it different
        footage and the same machinery produces a different
        skill&thinsp;&mdash;&thinsp;here, retrained on a new objective, the
        robot comes out kicking.
      </p>

      <EmbodiedAIPipelineDiagram
        className="essay-figure"
        theme={redTheme}
        robotMove="kick"
        title="The same training pipeline retrained on a different objective: the deployed robot kicks left and right."
      />

      <p>
        Each of those policies is a one-trick pony: a specialist that knows
        its motion and nothing else. Generalist motion policies&thinsp;&mdash;
        &thinsp;introduced with GMT in late 2025 and made openly deployable by
        NVIDIA&rsquo;s SONIC&thinsp;&mdash;&thinsp;flip the recipe. Instead of
        one clip and one network per skill, you collect a large dataset of
        many motions and train them all, step by step, into the{' '}
        <em>same</em> network. And the payoff is emergent: the policy handles
        motions it never saw in training, and keeps its balance while doing
        them.
      </p>

      <GeneralistMotionPolicyDiagram className="essay-figure" />

      <p>
        NVIDIA&rsquo;s SONIC takes the generalist idea one step further with
        an openly expandable architecture. Everything meets in a learned
        latent space: a G1 encoder turns retargeted robot motion files into
        latents, an SMPL encoder does the same for human motion
        capture&thinsp;&mdash;&thinsp;no retargeting, no information
        lost&thinsp;&mdash;&thinsp;and a robot-specific decoder turns latents
        back into live joint commands. New encoders plug in; new decoders
        bring new robots. Mix and match.
      </p>

      <SonicArchitectureDiagram className="essay-figure" />
    </main>
  )
}
