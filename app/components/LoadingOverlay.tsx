interface Props {
  visible: boolean
  message: string
  sub?: string
}

export default function LoadingOverlay({ visible, message, sub }: Props) {
  return (
    <div className={`overlay${visible ? '' : ' hidden'}`}>
      <div className="overlay-box">
        <div className="spinner" />
        <p className="overlay-text">{message}</p>
        {sub && <p className="overlay-sub">{sub}</p>}
      </div>
    </div>
  )
}
