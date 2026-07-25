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

/* The box's position updates every frame; only its size is re-measured on this
   interval, in ms. SHAPE_MIX is how much of the shark's true rotated bounds the
   box takes on — a few percent, so the size ticks by a pixel or two and never
   balloons. */
const RESHAPE_MS = 500
const SHAPE_MIX = 0.1

/* The label's class name waffles between a partial read and a confident one.
   Both strings are 5 glyphs in a monospace face, so the label never reflows.
   Ranges in ms — how long "shark" holds, then how long "shar?" holds. */
const LABEL_SURE: [number, number] = [8000, 10000]
const LABEL_UNSURE: [number, number] = [340, 800]

/* Confidence shown while the class name reads "shar?" — re-rolled in this
   inclusive range every time the label goes unsure. */
const LABEL_DROP: [number, number] = [70, 80]

const rand = ([min, max]: [number, number]) => min + Math.random() * (max - min)

/* Glide-home tuning: ms per pixel of drag distance, clamped to this range. */
const GLIDE_PER_PX = 5
const GLIDE_MS: [number, number] = [900, 2600]

type Box = { x: number; y: number; w: number; h: number }

/* Lets the shark be picked up and thrown around, then eased back onto its
   orbit. The drag offset is applied to a carrier element wrapping the shark
   rather than to the shark itself: the orbit lives in a CSS animation, and an
   animated transform always beats an inline one, so the two would fight. As a
   carrier translation the offset simply composes on top, which also means the
   stop-motion swim and the orbit keyframes are left completely untouched. */
function useSharkDrag(
  sharkRef: React.RefObject<HTMLDivElement | null>,
  carrierRef: React.RefObject<HTMLDivElement | null>,
  // The shark unmounts on the about page, so the listeners have to be rebound
  // against the new element on the way back to home.
  enabled: boolean,
) {
  useEffect(() => {
    const shark = sharkRef.current
    const carrier = carrierRef.current
    if (!enabled || !shark || !carrier) return

    let dragging = false
    let pointerId = -1
    let originX = 0
    let originY = 0
    let dx = 0
    let dy = 0
    let glide = 0

    // Only the orbit pauses while held — the swim keeps flapping, so the shark
    // stays alive in your hand.
    const orbit = () =>
      shark.getAnimations().find((a) => (a as CSSAnimation).animationName === 'shark-orbit')

    const offset = (x: number, y: number) => {
      carrier.style.transform = x || y ? `translate3d(${x}px, ${y}px, 0)` : ''
    }

    const onDown = (e: PointerEvent) => {
      if (dragging) return
      dragging = true
      pointerId = e.pointerId
      // Measured against the current offset, so grabbing mid-glide picks up
      // from where it is instead of snapping.
      originX = e.clientX - dx
      originY = e.clientY - dy
      cancelAnimationFrame(glide)
      shark.setPointerCapture(e.pointerId)
      shark.classList.add('is-held')
      orbit()?.pause()
      e.preventDefault()
    }

    const onMove = (e: PointerEvent) => {
      if (!dragging || e.pointerId !== pointerId) return
      dx = e.clientX - originX
      dy = e.clientY - originY
      offset(dx, dy)
    }

    const onUp = (e: PointerEvent) => {
      if (!dragging || e.pointerId !== pointerId) return
      dragging = false
      pointerId = -1
      shark.classList.remove('is-held')
      // Resumed now, not after the glide: the shark swims on along the ellipse
      // while the offset decays, so it slides back into its lane rather than
      // waiting to be put down.
      orbit()?.play()

      const fromX = dx
      const fromY = dy
      const dist = Math.hypot(fromX, fromY)
      if (dist < 1 || window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
        dx = 0
        dy = 0
        offset(0, 0)
        return
      }

      const dur = Math.min(GLIDE_MS[1], Math.max(GLIDE_MS[0], dist * GLIDE_PER_PX))
      const start = performance.now()
      const step = (now: number) => {
        const p = Math.min(1, (now - start) / dur)
        const ease = 1 - Math.pow(1 - p, 3)
        dx = fromX * (1 - ease)
        dy = fromY * (1 - ease)
        offset(dx, dy)
        if (p < 1) glide = requestAnimationFrame(step)
      }
      glide = requestAnimationFrame(step)
    }

    shark.addEventListener('pointerdown', onDown)
    window.addEventListener('pointermove', onMove)
    window.addEventListener('pointerup', onUp)
    window.addEventListener('pointercancel', onUp)
    return () => {
      cancelAnimationFrame(glide)
      shark.removeEventListener('pointerdown', onDown)
      window.removeEventListener('pointermove', onMove)
      window.removeEventListener('pointerup', onUp)
      window.removeEventListener('pointercancel', onUp)
    }
  }, [sharkRef, carrierRef, enabled])
}

/* Mobile only: the orbit is dropped and the shark just parks. Kept in sync with
   the .shark media query in App.css. */
const MOBILE_QUERY = '(max-width: 640px)'

/* Parks the shark halfway between the bottom of the tagline and the top of the
   social row. Neither edge is reachable in CSS from inside the shark's
   absolutely positioned field, so the midpoint is measured and handed back as a
   custom property the media query reads for `top`.

   Everything is read from offsetTop/offsetHeight rather than client rects: the
   tagline and the rail both fade in under a translate, and offsets ignore
   transforms, so the measurement is the settled layout even mid-animation. */
function useParkedShark(
  sharkRef: React.RefObject<HTMLDivElement | null>,
  taglineRef: React.RefObject<HTMLParagraphElement | null>,
  railRef: React.RefObject<HTMLElement | null>,
  enabled: boolean,
) {
  useEffect(() => {
    const shark = sharkRef.current
    const tagline = taglineRef.current
    const rail = railRef.current
    if (!enabled || !shark || !tagline || !rail) return

    // #hero, which is both the tagline's offset parent and the box the shark's
    // field spans.
    const hero = tagline.offsetParent as HTMLElement | null
    if (!hero) return

    const mq = window.matchMedia(MOBILE_QUERY)

    const measure = () => {
      // On desktop the shark orbits and `top` comes from the stylesheet.
      if (!mq.matches) {
        shark.style.removeProperty('--shark-parked-y')
        return
      }
      const taglineBottom = tagline.offsetTop + tagline.offsetHeight
      // The rail is static at this width, so it shares #page as its offset
      // parent with the hero.
      const railTop = rail.offsetTop - hero.offsetTop
      shark.style.setProperty('--shark-parked-y', `${(taglineBottom + railTop) / 2}px`)
    }

    measure()

    // Covers viewport resizes and rotation (the hero owns the leftover height),
    // plus late reflows such as a font swap changing the tagline's height.
    const ro = new ResizeObserver(measure)
    ro.observe(hero)
    ro.observe(tagline)
    ro.observe(rail)
    mq.addEventListener('change', measure)
    return () => {
      ro.disconnect()
      mq.removeEventListener('change', measure)
    }
  }, [sharkRef, taglineRef, railRef, enabled])
}

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
  const classRef = useRef<HTMLSpanElement>(null)

  useEffect(() => {
    const mq = window.matchMedia(CV_QUERY)
    let frame = 0

    const place = (el: HTMLDivElement | null, b: Box) => {
      if (!el) return
      el.style.transform = `translate3d(${b.x}px, ${b.y}px, 0)`
      el.style.width = `${b.w}px`
      el.style.height = `${b.h}px`
    }

    // Held between reshape ticks so the box keeps one size while it glides.
    let boxW = 0
    let boxH = 0
    let shapedAt = 0

    const tick = (now: number) => {
      frame = requestAnimationFrame(tick)

      const root = rootRef.current
      const shark = sharkRef.current
      const target = targetRef.current
      if (!root || !shark || !target) return

      const o = root.getBoundingClientRect()
      const s = shark.getBoundingClientRect()
      const t = target.getBoundingClientRect()

      // The sprite art has transparent margins, so inset a little to hug the
      // shark instead of its bitmap.
      const pad = 0.08

      // Position follows every frame, so the box glides. Size is resampled only
      // on the reshape tick, and even then it barely moves: the floor is the
      // shark's untransformed layout box (exactly what its client rect measures
      // at rotate(0), the smallest it ever gets), and SHAPE_MIX admits only a
      // sliver of the swell the rect picks up as the sprite turns. Rounding to
      // whole pixels keeps each change a crisp step rather than a slow creep.
      if (now - shapedAt >= RESHAPE_MS || !boxW) {
        shapedAt = now
        const minW = shark.offsetWidth * (1 - pad * 2)
        const minH = shark.offsetHeight * (1 - pad * 2)
        boxW = Math.round(minW + (s.width * (1 - pad * 2) - minW) * SHAPE_MIX)
        boxH = Math.round(minH + (s.height * (1 - pad * 2) - minH) * SHAPE_MIX)
      }

      const sharkBox: Box = {
        x: s.left - o.left + s.width / 2 - boxW / 2,
        y: s.top - o.top + s.height / 2 - boxH / 2,
        w: boxW,
        h: boxH,
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
    // so it reads as a detector settling instead of noise. While the class name
    // is unsure the drift keeps running underneath but LABEL_DROP is shown, so
    // the number the detector recovers to isn't the one it left on.
    let conf = 96
    let unsure = false
    let drop = rand(LABEL_DROP)
    const paintConf = () => {
      if (confRef.current) confRef.current.textContent = `${(unsure ? drop : conf).toFixed(1)}%`
    }
    const sample = window.setInterval(() => {
      conf = Math.min(98, Math.max(92, conf + (Math.random() - 0.5) * 3))
      paintConf()
    }, 3600)

    // Self-rescheduling rather than a fixed interval: the unsure state is a
    // short blip and the sure state a long hold, and both are jittered so the
    // flicker never lands on a beat.
    let flick = 0
    const waffle = () => {
      const el = classRef.current
      if (!el) return
      unsure = !unsure
      // Fresh number on each dip, so repeated flickers don't all read alike.
      if (unsure) drop = rand(LABEL_DROP)
      el.textContent = unsure ? 'shar?' : 'shark'
      paintConf()
      flick = window.setTimeout(waffle, rand(unsure ? LABEL_UNSURE : LABEL_SURE))
    }
    flick = window.setTimeout(waffle, rand(LABEL_SURE))

    const sync = () => {
      cancelAnimationFrame(frame)
      if (mq.matches) frame = requestAnimationFrame(tick)
    }

    sync()
    mq.addEventListener('change', sync)
    return () => {
      cancelAnimationFrame(frame)
      window.clearInterval(sample)
      window.clearTimeout(flick)
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
            <span ref={classRef}>shark</span>: <span ref={confRef}>96%</span>
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
  const carrierRef = useRef<HTMLDivElement>(null)
  const taglineRef = useRef<HTMLParagraphElement>(null)
  const railRef = useRef<HTMLElement>(null)

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

  useSharkDrag(sharkRef, carrierRef, shown === 'home')
  useParkedShark(sharkRef, taglineRef, railRef, shown === 'home')

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
            <div className="shark-carrier" ref={carrierRef}>
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
          </div>
          <p className="greeting">hi, i&rsquo;m</p>
          <CvTracker sharkRef={sharkRef} />
          <p className="tagline" ref={taglineRef}>
            cs @ uf, backend software engineer
          </p>
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

      <aside id="social-rail" ref={railRef}>
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
