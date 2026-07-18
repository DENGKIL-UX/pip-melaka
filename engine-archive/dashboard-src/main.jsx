import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import {
  PIP_RUNTIME_STARTUP_FAILURE_CODES,
  classifyPipRuntimeStartupFailure,
  sanitizePipRuntimeStartupFailure,
  validatePipRuntimeStartupFailure,
} from './pip-runtime-startup-contract.js'

function PipStartupBlockedScreen({ failure }) {
  return (
    <main
      style={{
        minHeight: '100vh',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        background: '#020617',
        color: '#f8fafc',
        padding: '24px',
        fontFamily: 'system-ui, sans-serif',
      }}
    >
      <section
        style={{
          width: '100%',
          maxWidth: '680px',
          border: '1px solid #334155',
          borderRadius: '12px',
          background: '#0f172a',
          padding: '18px',
        }}
      >
        <h1 style={{ margin: 0, fontSize: '18px' }}>PIP STARTUP SAFETY GATE</h1>
        <p style={{ margin: '10px 0 0', color: '#cbd5e1', fontSize: '13px', lineHeight: 1.5 }}>
          The application was blocked because a required startup contract did not pass.
          No protected operation was started.
        </p>
        <div
          style={{
            marginTop: '14px',
            display: 'grid',
            gap: '8px',
            gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))',
          }}
        >
          <div style={{ border: '1px solid #334155', borderRadius: '8px', padding: '10px' }}>
            <div style={{ color: '#94a3b8', fontSize: '11px', fontWeight: 700 }}>FAILURE CODE</div>
            <div style={{ marginTop: '4px', fontSize: '12px', fontWeight: 700 }}>{failure.code}</div>
          </div>
          <div style={{ border: '1px solid #334155', borderRadius: '8px', padding: '10px' }}>
            <div style={{ color: '#94a3b8', fontSize: '11px', fontWeight: 700 }}>BLOCKED</div>
            <div style={{ marginTop: '4px', fontSize: '12px', fontWeight: 700 }}>{String(failure.blocked).toUpperCase()}</div>
          </div>
        </div>
        <p style={{ margin: '12px 0 0', color: '#cbd5e1', fontSize: '12px', lineHeight: 1.5 }}>
          {failure.safe_message}
        </p>
        <button
          type="button"
          onClick={() => window.location.reload()}
          style={{
            marginTop: '14px',
            borderRadius: '999px',
            border: '1px solid #2563eb',
            background: '#1e3a8a',
            color: '#f8fafc',
            fontSize: '11px',
            fontWeight: 800,
            letterSpacing: '0.05em',
            padding: '8px 12px',
            cursor: 'pointer',
          }}
        >
          RELOAD APPLICATION
        </button>
      </section>
    </main>
  )
}

const rootElement = document.getElementById('root')

if (!rootElement) {
  throw new Error('Root element #root is required for startup bootstrap.')
}

const root = createRoot(rootElement)

async function bootstrapApp() {
  try {
    const module = await import('./App.jsx')
    const App = module?.default

    if (!App) {
      throw new Error('App module default export is missing.')
    }

    root.render(
      <StrictMode>
        <App />
      </StrictMode>,
    )
  } catch (error) {
    if (import.meta.env?.DEV) {
      console.error('[PIP_STARTUP_IMPORT_REJECTION]', error)
    }

    const classifiedCode = classifyPipRuntimeStartupFailure(error)
    const sanitizedFailure = sanitizePipRuntimeStartupFailure({
      code: classifiedCode,
    })
    const validation = validatePipRuntimeStartupFailure(sanitizedFailure)

    const fallbackFailure =
      validation.valid === true
        ? validation.normalized
        : sanitizePipRuntimeStartupFailure({
            code: PIP_RUNTIME_STARTUP_FAILURE_CODES.STARTUP_UNKNOWN_BLOCKED,
          })

    root.render(
      <StrictMode>
        <PipStartupBlockedScreen failure={fallbackFailure} />
      </StrictMode>,
    )
  }
}

void bootstrapApp()
