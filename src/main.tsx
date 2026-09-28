import { Component, StrictMode, Suspense, type ReactNode } from 'react'
import { createRoot } from 'react-dom/client'
import App from './App'
import './index.css'

class ErrorBoundary extends Component<{ children: ReactNode }, { error: Error | null }> {
  state = { error: null as Error | null }

  static getDerivedStateFromError(error: Error) {
    return { error }
  }

  render() {
    if (!this.state.error) return this.props.children
    return (
      <div role="alert" className="mx-auto max-w-xl p-8">
        <h1 className="text-std-24B-150 text-fg">番組データを読み込めませんでした</h1>
        <p className="mt-2 text-std-16N-170 text-muted">{this.state.error.message}</p>
        <button
          type="button"
          onClick={() => location.reload()}
          className="mt-6 min-h-11 rounded-8 bg-accent px-6 text-oln-16B-100 text-accent-fg focus-ring hover:bg-accent-hover hover:underline hover:underline-offset-4"
        >
          再読み込み
        </button>
      </div>
    )
  }
}

function Loading() {
  return (
    <div className="flex min-h-dvh items-center justify-center" role="status">
      <span className="text-std-16N-170 text-muted">番組表を読み込んでいます…</span>
    </div>
  )
}

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <ErrorBoundary>
      <Suspense fallback={<Loading />}>
        <App />
      </Suspense>
    </ErrorBoundary>
  </StrictMode>,
)
