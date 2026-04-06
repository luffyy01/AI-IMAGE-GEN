import { useState, useEffect, useRef } from "react"
import "./App.css"

const QUICK_PROMPTS = [
  { emoji: "🌆", text: "Cyberpunk city at dusk" },
  { emoji: "🌌", text: "Nebula space portrait" },
  { emoji: "🐉", text: "Ancient dragon in mist" },
  { emoji: "🏯", text: "Fantasy castle on cliff" },
  { emoji: "🤖", text: "Futuristic robot samurai" },
  { emoji: "🌊", text: "Surreal ocean dreamscape" },
]

function App() {
  const [imgSrc, setImage] = useState("")
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState("")
  const [input, setInput] = useState("")
  const [history, setHistory] = useState(() => {
    try { return JSON.parse(localStorage.getItem("promptHistory") || "[]") } catch { return [] }
  })
  const [totalGenerated, setTotalGenerated] = useState(() => {
    return parseInt(localStorage.getItem("totalGenerated") || "0", 10)
  })
  const [lightboxOpen, setLightboxOpen] = useState(false)
  const [currentPrompt, setCurrentPrompt] = useState("")
  const [generatedAt, setGeneratedAt] = useState(null)
  const inputRef = useRef(null)

  const MAX_CHARS = 300

  useEffect(() => {
    localStorage.setItem("promptHistory", JSON.stringify(history))
  }, [history])

  useEffect(() => {
    const handler = (e) => {
      if (e.key === "Escape" && lightboxOpen) setLightboxOpen(false)
    }
    window.addEventListener("keydown", handler)
    return () => window.removeEventListener("keydown", handler)
  }, [lightboxOpen])

  const handleGenerate = async () => {
    if (!input.trim()) {
      setError("Please enter a prompt to conjure your image ✨")
      inputRef.current?.focus()
      return
    }
    if (input.length > MAX_CHARS) {
      setError(`Prompt too long — keep it under ${MAX_CHARS} characters.`)
      return
    }

    setLoading(true)
    setError("")
    setImage("")
    const prompt = input.trim()

    try {
      const response = await fetch(
        "https://router.huggingface.co/hf-inference/models/stabilityai/stable-diffusion-xl-base-1.0",
        {
          headers: {
            Authorization: `Bearer ${import.meta.env.VITE_HF_TOKEN}`,
            "Content-Type": "application/json",
          },
          method: "POST",
          body: JSON.stringify({ inputs: prompt }),
        }
      )

      if (!response.ok) {
        const errText = await response.text()
        throw new Error(`API error ${response.status}: ${errText}`)
      }

      const result = await response.blob()
      const url = URL.createObjectURL(result)
      setImage(url)
      setCurrentPrompt(prompt)
      setGeneratedAt(new Date())

      // Update history (dedupe, max 20)
      setHistory((prev) => {
        const deduped = prev.filter((p) => p !== prompt)
        return [prompt, ...deduped].slice(0, 20)
      })

      // Update stats
      const next = totalGenerated + 1
      setTotalGenerated(next)
      localStorage.setItem("totalGenerated", String(next))
    } catch (err) {
      console.error("Error:", err)
      setError(err.message)
    } finally {
      setLoading(false)
      setInput("")
    }
  }

  const handleDownload = () => {
    if (!imgSrc) return
    const a = document.createElement("a")
    a.href = imgSrc
    a.download = `ai-art-${Date.now()}.png`
    a.click()
  }

  const handleCopyPrompt = () => {
    if (!currentPrompt) return
    navigator.clipboard.writeText(currentPrompt).catch(() => {})
  }

  const clearHistory = () => {
    setHistory([])
    localStorage.removeItem("promptHistory")
  }

  const formatTime = (date) => {
    if (!date) return ""
    return date.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })
  }

  return (
    <div className="app-wrapper">
      {/* Ambient Orbs */}
      <div className="ambient-orb orb-1" />
      <div className="ambient-orb orb-2" />
      <div className="ambient-orb orb-3" />

      {/* Lightbox */}
      {lightboxOpen && imgSrc && (
        <div className="lightbox-overlay" onClick={() => setLightboxOpen(false)}>
          <div className="lightbox-content" onClick={(e) => e.stopPropagation()}>
            <button className="lightbox-close" onClick={() => setLightboxOpen(false)}>✕</button>
            <img src={imgSrc} alt="AI Generated — fullscreen" />
          </div>
        </div>
      )}

      <div className="app-container">
        {/* Header */}
        <div className="header-text">
          <div className="header-badge">
            <span className="dot" />
            Powered by SDXL 1.0
          </div>
          <h1>AI Image Studio</h1>
          <p>Turn any idea into stunning AI-generated art in seconds. Type a prompt and watch imagination become reality.</p>
        </div>

        {/* Stats Bar */}
        <div className="stats-bar">
          <div className="stat-item">
            <div className="stat-value">{totalGenerated}</div>
            <div className="stat-label">Generated</div>
          </div>
          <div className="stat-divider" />
          <div className="stat-item">
            <div className="stat-value">{history.length}</div>
            <div className="stat-label">Prompts saved</div>
          </div>
          <div className="stat-divider" />
          <div className="stat-item">
            <div className="stat-value">SDXL</div>
            <div className="stat-label">Model</div>
          </div>
        </div>

        {/* Main Panel */}
        <div className="glass-panel">
          <div className="input-group">
            <div className="label-row">
              <label htmlFor="prompt-input">
                <span className="label-icon">✦</span>
                Describe your vision
              </label>
              <span className={`char-count${input.length > MAX_CHARS * 0.85 ? " near-limit" : ""}`}>
                {input.length}/{MAX_CHARS}
              </span>
            </div>

            <div className="input-wrapper">
              <input
                ref={inputRef}
                id="prompt-input"
                className="styled-input"
                type="text"
                placeholder="e.g. A bioluminescent forest at midnight, ultra detail..."
                onChange={(e) => setInput(e.target.value)}
                value={input}
                onKeyDown={(e) => e.key === "Enter" && handleGenerate()}
                maxLength={MAX_CHARS}
                autoComplete="off"
              />
              <button
                className="styled-button"
                onClick={handleGenerate}
                disabled={loading}
              >
                {loading && <span className="loader" />}
                {loading ? "Generating…" : "Generate ✦"}
              </button>
            </div>

            {/* Quick Prompts */}
            <div className="quick-prompts">
              <div className="quick-prompts-label">Quick Ideas</div>
              {QUICK_PROMPTS.map((qp) => (
                <button
                  key={qp.text}
                  className="quick-chip"
                  onClick={() => setInput(qp.text)}
                  tabIndex={-1}
                >
                  {qp.emoji} {qp.text}
                </button>
              ))}
            </div>

            {error && (
              <div className="error-message" role="alert">
                <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                  <circle cx="12" cy="12" r="10" /><line x1="12" y1="8" x2="12" y2="12" /><line x1="12" y1="16" x2="12.01" y2="16" />
                </svg>
                {error}
              </div>
            )}
          </div>

          {/* Result / Skeleton */}
          {loading ? (
            <div className="image-preview-container">
              <div className="section-divider">Output</div>
              <div className="image-skeleton">
                <div className="skeleton-icon">🎨</div>
                <div className="skeleton-label">Generating</div>
                <div className="skeleton-dots">
                  <span /><span /><span />
                </div>
              </div>
            </div>
          ) : imgSrc ? (
            <div className="image-preview-container">
              <div className="section-divider">Output</div>

              <div className="image-actions">
                <div className="image-meta">
                  <strong>{currentPrompt.length > 50 ? currentPrompt.slice(0, 50) + "…" : currentPrompt}</strong>
                  {generatedAt && <> · {formatTime(generatedAt)}</>}
                </div>
                <div className="action-buttons">
                  <button className="action-btn" onClick={handleCopyPrompt} title="Copy prompt">
                    📋 Copy Prompt
                  </button>
                  <button className="action-btn download" onClick={handleDownload} title="Download image">
                    ⬇ Download
                  </button>
                </div>
              </div>

              <div className="image-wrapper" onClick={() => setLightboxOpen(true)}>
                <img src={imgSrc} alt={`AI Generated: ${currentPrompt}`} />
              </div>
            </div>
          ) : null}
        </div>

        {/* Prompt History */}
        {history.length > 0 && (
          <div className="glass-panel history-panel" style={{ padding: "1.5rem 2rem" }}>
            <div className="history-header">
              <div className="history-title">
                🕘 History
                <span className="history-count">{history.length}</span>
              </div>
              <button className="history-clear" onClick={clearHistory}>Clear all</button>
            </div>
            <div className="history-list">
              {history.map((item, i) => (
                <div
                  key={i}
                  className="history-item"
                  onClick={() => setInput(item)}
                  role="button"
                  tabIndex={0}
                  onKeyDown={(e) => e.key === "Enter" && setInput(item)}
                >
                  <span className="history-item-icon">✦</span>
                  <span className="history-item-text">{item}</span>
                  <span className="history-item-use">Use →</span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Footer */}
        <footer className="app-footer">
          Built with ♥ using{" "}
          <a href="https://huggingface.co/stabilityai/stable-diffusion-xl-base-1.0" target="_blank" rel="noreferrer">
            Stable Diffusion XL
          </a>{" "}
          · Images generated by AI may not reflect reality
        </footer>
      </div>
    </div>
  )
}

export default App