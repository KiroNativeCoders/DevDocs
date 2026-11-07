import LaunchPage from './LaunchPage'

type Props = {
  onStartWriting?: () => void
}

export default function LandingPage({ onStartWriting }: Props) {
  return <LaunchPage onStartWriting={onStartWriting} />
}
