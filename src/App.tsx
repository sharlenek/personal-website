import { useEffect, useRef, useState } from 'react'
import sharkUp from './assets/sharkup.webp'
import sharkDown from './assets/sharkdown.webp'
import headshot from './assets/sharlene_headshot_compressed.jpg'
import './App.css'

type Page = 'home' | 'about'

/* Kept in sync with the .leaving animation duration in App.css. */
const EXIT_MS = 450

const socials = [
  {
    name: 'LinkedIn',
    href: 'https://linkedin.com/in/sharlenekho',
    bg: '#0a66c2',
    icon: (
      <svg viewBox="0 0 24 24" width="1.3em" height="1.3em" fill="#fff">
        <path d="M20.45 20.45h-3.55v-5.57c0-1.33-.02-3.03-1.85-3.03-1.86 0-2.15 1.45-2.15 2.94v5.66H9.35V9h3.41v1.56h.05c.47-.9 1.63-1.85 3.36-1.85 3.6 0 4.27 2.37 4.27 5.45zM5.34 7.43a2.06 2.06 0 1 1 0-4.12 2.06 2.06 0 0 1 0 4.12M7.12 20.45H3.56V9h3.56z" />
      </svg>
    ),
  },
  {
    name: 'GitHub',
    href: 'https://github.com/sharlenek',
    bg: '#171515',
    icon: (
      <svg viewBox="0 0 19 19" width="1.4em" height="1.4em" fill="#fff">
        <path
          fillRule="evenodd"
          d="M9.356 1.85C5.05 1.85 1.57 5.356 1.57 9.694a7.84 7.84 0 0 0 5.324 7.44c.387.079.528-.168.528-.376 0-.182-.013-.805-.013-1.454-2.165.467-2.616-.935-2.616-.935-.349-.91-.864-1.143-.864-1.143-.71-.48.051-.48.051-.48.787.051 1.2.805 1.2.805.695 1.194 1.817.857 2.268.649.064-.507.27-.857.49-1.052-1.728-.182-3.545-.857-3.545-3.87 0-.857.31-1.558.8-2.104-.078-.195-.349-1 .077-2.078 0 0 .657-.208 2.14.805a7.5 7.5 0 0 1 1.946-.26c.657 0 1.328.092 1.946.26 1.483-1.013 2.14-.805 2.14-.805.426 1.078.155 1.883.078 2.078.502.546.799 1.247.799 2.104 0 3.013-1.818 3.675-3.558 3.87.284.247.528.714.528 1.454 0 1.052-.012 1.896-.012 2.156 0 .208.142.455.528.377a7.84 7.84 0 0 0 5.324-7.441c.013-4.338-3.48-7.844-7.773-7.844"
          clipRule="evenodd"
        />
      </svg>
    ),
  },
  {
    name: 'Email',
    href: 'mailto:sharlenekho@gmail.com',
    bg: '#fff',
    icon: (
      <svg viewBox="0 0 48 36" width="1.4em" height="1em">
        <path fill="#4285f4" d="M3 36h8V17L0 10v22c0 2.2 1.8 4 3 4z" />
        <path fill="#34a853" d="M37 36h8c1.2 0 3-1.8 3-4V10l-11 7z" />
        <path fill="#fbbc04" d="M37 3v14l11-7v-4c0-4.5-5.1-7-8.6-4.5z" />
        <path fill="#ea4335" d="M11 17V3l13 10 13-10v14L24 27z" />
        <path fill="#c5221f" d="M0 6v4l11 7V3L8.6 0.5C5.1-2 0 0.5 0 6z" />
      </svg>
    ),
  },
]

/* Desktop only: the tracking overlay is dropped entirely on tablet/mobile. Kept
   in sync with the .cv-overlay media query in App.css. */
const CV_QUERY = '(min-width: 901px) and (hover: hover)'

/* How often the boxes resample the layout, in ms — roughly 8 detections/sec.
   Low enough that each update is a visible jump, not a smooth follow. */
const DETECT_MS = 60

type Box = { x: number; y: number; w: number; h: number }

/* Where the segment from the box's center toward (tx, ty) crosses its edge. */
function edgePoint(b: Box, tx: number, ty: number): [number, number] {
  const cx = b.x + b.w / 2
  const cy = b.y + b.h / 2
  const dx = tx - cx
  const dy = ty - cy
  if (!dx && !dy) return [cx, cy]
  const s = Math.min(
    dx ? b.w / 2 / Math.abs(dx) : Infinity,
    dy ? b.h / 2 / Math.abs(dy) : Infinity,
  )
  return [cx + dx * s, cy + dy * s]
}

/* Draws the bounding boxes over the shark and the "shar" of the title, plus the
   link between them. Positions are read from the live layout every frame rather
   than recomputed from the orbit keyframes, so the CSS animation stays the one
   source of truth for where the shark is. Writes straight to the DOM — a React
   render per frame would be far more work for the same pixels. */
function CvTracker({ sharkRef }: { sharkRef: React.RefObject<HTMLDivElement | null> }) {
  const rootRef = useRef<HTMLDivElement>(null)
  const targetRef = useRef<HTMLSpanElement>(null)
  const sharkBoxRef = useRef<HTMLDivElement>(null)
  const titleBoxRef = useRef<HTMLDivElement>(null)
  const lineRef = useRef<SVGLineElement>(null)
  const dotRef = useRef<SVGCircleElement>(null)
  const confRef = useRef<HTMLSpanElement>(null)

  useEffect(() => {
    const mq = window.matchMedia(CV_QUERY)
    let frame = 0

    const place = (el: HTMLDivElement | null, b: Box) => {
      if (!el) return
      el.style.transform = `translate3d(${b.x}px, ${b.y}px, 0)`
      el.style.width = `${b.w}px`
      el.style.height = `${b.h}px`
    }

    let last = 0
    const tick = (now: number) => {
      frame = requestAnimationFrame(tick)
      // Resample on a fixed detection tick rather than every frame, so the box
      // snaps between sizes like a detector re-running instead of easing.
      if (now - last < DETECT_MS) return
      last = now

      const root = rootRef.current
      const shark = sharkRef.current
      const target = targetRef.current
      if (!root || !shark || !target) return

      const o = root.getBoundingClientRect()
      const s = shark.getBoundingClientRect()
      const t = target.getBoundingClientRect()

      // Size comes from the shark's untransformed layout box, not its rotated
      // client rect: the rect swells as the sprite turns (widest near 45deg),
      // and the layout box is exactly the smallest size that rect ever reaches
      // — at rotate(0). So the box holds one size and only ever moves. The
      // sprite art has transparent margins, so inset a little to hug the shark
      // instead of its bitmap.
      const pad = 0.08
      const w = shark.offsetWidth * (1 - pad * 2)
      const h = shark.offsetHeight * (1 - pad * 2)
      const sharkBox: Box = {
        x: s.left - o.left + s.width / 2 - w / 2,
        y: s.top - o.top + s.height / 2 - h / 2,
        w,
        h,
      }
      const titleBox: Box = {
        x: t.left - o.left - 6,
        y: t.top - o.top - 2,
        w: t.width + 12,
        h: t.height + 4,
      }

      place(sharkBoxRef.current, sharkBox)
      place(titleBoxRef.current, titleBox)

      const [x1, y1] = edgePoint(sharkBox, titleBox.x + titleBox.w / 2, titleBox.y + titleBox.h / 2)
      const [x2, y2] = edgePoint(titleBox, sharkBox.x + sharkBox.w / 2, sharkBox.y + sharkBox.h / 2)
      const line = lineRef.current
      const dot = dotRef.current
      if (line) {
        line.setAttribute('x1', `${x1}`)
        line.setAttribute('y1', `${y1}`)
        line.setAttribute('x2', `${x2}`)
        line.setAttribute('y2', `${y2}`)
      }
      if (dot) {
        dot.setAttribute('cx', `${x2}`)
        dot.setAttribute('cy', `${y2}`)
      }
    }

    // Confidence drifts around 96 in small steps rather than jumping at random,
    // so it reads as a detector settling instead of noise.
    let conf = 96
    const sample = window.setInterval(() => {
      conf = Math.min(98, Math.max(92, conf + Math.round((Math.random() - 0.5) * 5)))
      if (confRef.current) confRef.current.textContent = `${conf}%`
    }, 1200)

    const sync = () => {
      cancelAnimationFrame(frame)
      if (mq.matches) frame = requestAnimationFrame(tick)
    }

    sync()
    mq.addEventListener('change', sync)
    return () => {
      cancelAnimationFrame(frame)
      window.clearInterval(sample)
      mq.removeEventListener('change', sync)
    }
  }, [sharkRef])

  return (
    <>
      <h1 className="name">
        [<span className="cv-target" ref={targetRef}>shar</span>lene kho]
      </h1>

      <div className="cv-overlay" ref={rootRef} aria-hidden="true">
        <svg className="cv-link">
          <line ref={lineRef} className="cv-line" />
          <circle ref={dotRef} className="cv-dot" r="2.5" />
        </svg>

        <div className="cv-box cv-box--shark" ref={sharkBoxRef}>
          <i className="cv-corner tl" />
          <i className="cv-corner tr" />
          <i className="cv-corner bl" />
          <i className="cv-corner br" />
          <div className="cv-label">
            shark?: <span ref={confRef}>96%</span>
          </div>
        </div>

        <div className="cv-box cv-box--title" ref={titleBoxRef}>
          <i className="cv-corner tl" />
          <i className="cv-corner tr" />
          <i className="cv-corner bl" />
          <i className="cv-corner br" />
        </div>
      </div>
    </>
  )
}

function App() {
  const [page, setPage] = useState<Page>('home')
  // The page currently animating out, if any. Null while a page is at rest.
  const [leaving, setLeaving] = useState<Page | null>(null)
  const sharkRef = useRef<HTMLDivElement>(null)

  const go = (to: Page) => {
    if (to === page || leaving) return
    const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches
    if (reduced) {
      setPage(to)
      return
    }
    setLeaving(page)
    window.setTimeout(() => {
      setPage(to)
      setLeaving(null)
    }, EXIT_MS)
  }

  const shown = leaving ?? page

  return (
    <div id="page">
      <div id="top-border" />

      <nav id="nav">
        <span
          className={`nav-link ${page === 'home' ? ' is-active' : ''}`}
          onClick={() => go('home')}
        >
          sharlene kho
        </span>
        <span className="sep">|</span>
        <span
          className={`nav-link${page === 'about' ? ' is-active' : ''}`}
          onClick={() => go('about')}
        >
          about me
        </span>
        <span className="sep">|</span>
        <a
          className="nav-link resume-link"
          href="/Sharlene_Kho_Resume.pdf"
          download="sharlene-kho-resume.pdf"
        >
          resume
          <svg
            className="download-icon"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2.5"
            strokeLinecap="round"
            strokeLinejoin="round"
            aria-hidden="true"
          >
            <path d="M12 3v12" />
            <path d="M7 11l5 5 5-5" />
            <path d="M4 20h16" />
          </svg>
        </a>
      </nav>

      {shown === 'home' ? (
        <main id="hero" className={leaving ? 'leaving' : undefined}>
          <div className="shark-field">
            <div
              className="shark"
              ref={sharkRef}
              style={
                {
                  '--frame-a': `url(${sharkUp})`,
                  '--frame-b': `url(${sharkDown})`,
                } as React.CSSProperties
              }
            />
          </div>
          <p className="greeting">hi, i&rsquo;m</p>
          <CvTracker sharkRef={sharkRef} />
          <p className="tagline">cs @ uf, backend software engineer</p>
        </main>
      ) : (
        <main id="about" className={leaving ? 'leaving' : undefined}>
          <img className="about-photo" src={headshot} alt="Sharlene Kho" />
          <div className="about-copy">
            <h1 className="about-title">[about me]</h1>
            <div className="about-body">
              <p>
                I&rsquo;m Sharlene, a 3rd year Computer Science student at the University of Florida. 
                I enjoy building backend systems, and learning how infrastructure and 
                distributed systems keep applications reliable and scalable.
              </p>
              <p>
                Outside of code, I stay involved on campus through leadership roles 
                in student organizations, and enjoy lion dancing, rock climbing, and 
                learning new songs on the piano.
              </p>
            </div>
          </div>
        </main>
      )}

      <aside id="social-rail">
        {socials.map((s) => (
          <a
            key={s.name}
            href={s.href}
            target="_blank"
            rel="noreferrer"
            aria-label={s.name}
            className="social-badge"
            style={{ background: s.bg }}
          >
            {s.icon}
          </a>
        ))}
      </aside>
    </div>
  )
}

export default App
