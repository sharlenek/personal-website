import './App.css'

const socials = [
  {
    name: 'LinkedIn',
    href: 'https://linkedin.com/in/sharlenekho',
    bg: '#0a66c2',
    icon: (
      <svg viewBox="0 0 24 24" width="26" height="26" fill="#fff">
        <path d="M20.45 20.45h-3.55v-5.57c0-1.33-.02-3.03-1.85-3.03-1.86 0-2.15 1.45-2.15 2.94v5.66H9.35V9h3.41v1.56h.05c.47-.9 1.63-1.85 3.36-1.85 3.6 0 4.27 2.37 4.27 5.45zM5.34 7.43a2.06 2.06 0 1 1 0-4.12 2.06 2.06 0 0 1 0 4.12M7.12 20.45H3.56V9h3.56z" />
      </svg>
    ),
  },
  {
    name: 'GitHub',
    href: 'https://github.com/sharlenekho',
    bg: '#171515',
    icon: (
      <svg viewBox="0 0 19 19" width="26" height="26" fill="#fff">
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
      <svg viewBox="0 0 48 36" width="26" height="20">
        <path fill="#4285f4" d="M3 36h8V17L0 10v22c0 2.2 1.8 4 3 4z" />
        <path fill="#34a853" d="M37 36h8c1.2 0 3-1.8 3-4V10l-11 7z" />
        <path fill="#fbbc04" d="M37 3v14l11-7v-4c0-4.5-5.1-7-8.6-4.5z" />
        <path fill="#ea4335" d="M11 17V3l13 10 13-10v14L24 27z" />
        <path fill="#c5221f" d="M0 6v4l11 7V3L8.6 0.5C5.1-2 0 0.5 0 6z" />
      </svg>
    ),
  },
]

function App() {
  return (
    <div id="page">
      <div id="top-border" />

      <nav id="nav">
        <span>about me</span>
        <span className="sep">|</span>
        <span>projects</span>
        <span className="sep">|</span>
        <span>resume</span>
      </nav>

      <main id="hero">
        <p className="greeting">hi, i&rsquo;m</p>
        <h1 className="name">[sharlene kho]</h1>
        <p className="tagline">cs @ uf, backend software engineer</p>
      </main>

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
