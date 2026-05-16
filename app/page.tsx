import Nav from './components/Nav'
import ActorCard from './components/ActorCard'

export default function ActorPicker() {
  return (
    <>
      <Nav />
      <main className="container">
        <div className="picker-hero">
          <h1 className="page-title">Welcome to Cradle Portal</h1>
          <p className="page-subtitle">Who are you joining as today?</p>
        </div>
        <div className="actor-grid">
          <ActorCard
            icon="🚀"
            title="Startup"
            description="Get matched with mentors, programmes, investors, and corporate partners."
            ctaLabel="Get Started →"
            ctaVariant="primary"
            href="/startup"
          />
          <ActorCard
            icon="🤝"
            title="Partner"
            description="Corporate, investor, or service provider looking to engage with startups in the ecosystem."
            ctaLabel="Join as Partner →"
            ctaVariant="outline"
            href="/partner"
          />
          <ActorCard
            icon="🏛️"
            title="Cradle Staff"
            description="Programme administrators and ecosystem managers — access the full dashboard."
            ctaLabel="Staff Login →"
            ctaVariant="outline"
            href="/staff/login"
          />
        </div>
      </main>
    </>
  )
}
