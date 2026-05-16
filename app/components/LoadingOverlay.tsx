export interface LoadingOverlayStep {
  tool: string
  detail: string
  status: 'queued' | 'active' | 'done'
}

interface Props {
  visible: boolean
  message: string
  sub?: string
  steps?: LoadingOverlayStep[]
}

export default function LoadingOverlay({ visible, message, sub, steps = [] }: Props) {
  return (
    <div className={`overlay${visible ? '' : ' hidden'}`}>
      <div className="overlay-box">
        <div className="spinner" />
        <p className="overlay-text">{message}</p>
        {sub && <p className="overlay-sub">{sub}</p>}
        {steps.length > 0 && (
          <ol className="overlay-steps" aria-label="Matching engine progress">
            {steps.map(step => (
              <li key={step.tool} className={`overlay-step overlay-step-${step.status}`}>
                <span className="overlay-step-status" aria-hidden="true" />
                <span className="overlay-step-body">
                  <span className="overlay-step-tool">{step.tool}</span>
                  <span className="overlay-step-detail">{step.detail}</span>
                </span>
              </li>
            ))}
          </ol>
        )}
      </div>
    </div>
  )
}
