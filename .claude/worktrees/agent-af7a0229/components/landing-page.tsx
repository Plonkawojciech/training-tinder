'use client';

import { useEffect, useRef, useState } from 'react';
import Link from 'next/link';

const SPORTS = ['Cycling', 'Running', 'Triathlon', 'Swimming', 'Trail Running', 'Gravel', 'Duathlon', 'MTB'];

const ATHLETES = [
  { sport: 'Cycling', name: 'Marcin K.', detail: 'Warsaw · 3.2 km away', pace: '28.4 km/h avg' },
  { sport: 'Running', name: 'Anna S.', detail: 'Warsaw · 1.8 km away', pace: '4:42 /km' },
  { sport: 'Triathlon', name: 'Tomek W.', detail: 'Warsaw · 4.1 km away', pace: 'Ironman 70.3' },
];

const FEATURES = [
  { icon: '⚡', title: "Today's Session Matching", desc: "See who's training in your area right now, filtered by sport, pace, and distance. No planning — just show up." },
  { icon: '🔗', title: 'Strava Connect', desc: 'Sync your Strava data to automatically verify your fitness level and match you with compatible athletes.' },
  { icon: '📍', title: 'Real-time Proximity', desc: 'Find athletes within 5 km of your starting point. No commute, no wasted time — local packs only.' },
  { icon: '🏆', title: 'Pace Verification', desc: 'We verify actual training pace from activity history. No more showing up to a "moderate" ride that\'s actually a race.' },
  { icon: '📆', title: 'Weekly Training Calendar', desc: 'Plan your week, set available slots, and let the algorithm find your pack for each session automatically.' },
  { icon: '💬', title: 'In-app Chat', desc: 'Coordinate meetup points, share Komoot/Garmin routes, and stay in touch with your training group.' },
];

const STATS = [
  { target: 4200, label: 'Athletes' },
  { target: 89, label: 'Cities' },
  { target: 14, label: 'K Sessions' },
  { target: 98, label: '% Show Rate' },
];

function useCounter(target: number, shouldStart: boolean) {
  const [value, setValue] = useState(0);
  useEffect(() => {
    if (!shouldStart) return;
    let current = 0;
    const step = target / (1600 / 16);
    const timer = setInterval(() => {
      current = Math.min(current + step, target);
      setValue(Math.floor(current));
      if (current >= target) clearInterval(timer);
    }, 16);
    return () => clearInterval(timer);
  }, [shouldStart, target]);
  return value;
}

function StatItem({ target, label }: { target: number; label: string }) {
  const ref = useRef<HTMLDivElement>(null);
  const [started, setStarted] = useState(false);
  const value = useCounter(target, started);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const obs = new IntersectionObserver(([e]) => { if (e.isIntersecting) { setStarted(true); obs.disconnect(); } }, { threshold: 0.5 });
    obs.observe(el);
    return () => obs.disconnect();
  }, []);
  return (
    <div ref={ref} className="stat-item">
      <span className="stat-number">{value.toLocaleString()}</span>
      <span className="stat-label">{label}</span>
    </div>
  );
}

export default function LandingPage({ userId }: { userId: string | null }) {
  const [activeSport, setActiveSport] = useState('Cycling');

  return (
    <>
      <style>{`
        *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }
        html { scroll-behavior: smooth; }
        body { font-family: 'Inter', sans-serif; background: #0A0A0A; color: #FFFFFF; overflow-x: hidden; }

        .tt-nav {
          position: fixed; top: 0; left: 0; right: 0; z-index: 100;
          display: flex; align-items: center; justify-content: space-between;
          padding: 20px 48px;
          background: rgba(10,10,10,0.9);
          backdrop-filter: blur(8px);
          border-bottom: 1px solid rgba(124,58,237,0.2);
        }
        .tt-nav-logo { font-family: 'Bebas Neue', sans-serif; font-size: 28px; letter-spacing: 0.06em; color: white; text-decoration: none; }
        .tt-nav-logo span { color: #7C3AED; }
        .tt-nav-links { display: flex; gap: 32px; list-style: none; }
        .tt-nav-links a { font-size: 13px; font-weight: 600; color: rgba(255,255,255,0.6); text-decoration: none; letter-spacing: 0.08em; text-transform: uppercase; transition: color 0.2s; cursor: pointer; }
        .tt-nav-links a:hover { color: #7C3AED; }
        .tt-btn-join {
          font-family: 'Inter', sans-serif; font-size: 13px; font-weight: 900;
          background: #7C3AED; color: white; border: none;
          padding: 12px 28px; cursor: pointer;
          letter-spacing: 0.1em; text-transform: uppercase;
          transition: background 0.2s; text-decoration: none; display: inline-block;
        }
        .tt-btn-join:hover { background: #E03E00; }

        .tt-hero {
          min-height: 100vh;
          display: flex; flex-direction: column; justify-content: flex-end;
          padding: 120px 48px 80px;
          position: relative; overflow: hidden;
          background: #0A0A0A;
        }
        .tt-hero-gradient {
          position: absolute; top: 0; left: 0; right: 0; bottom: 0;
          background: radial-gradient(ellipse 60% 70% at 70% 30%, rgba(124,58,237,0.18) 0%, transparent 70%);
          animation: ttGradientPulse 6s ease-in-out infinite;
          pointer-events: none;
        }
        @keyframes ttGradientPulse {
          0%, 100% { opacity: 1; transform: scale(1); }
          50% { opacity: 0.7; transform: scale(1.05); }
        }
        .tt-hero-tag {
          display: inline-flex; align-items: center; gap: 8px;
          font-size: 12px; font-weight: 700; letter-spacing: 0.12em; text-transform: uppercase;
          color: #7C3AED; margin-bottom: 24px;
          animation: ttStaggerIn 0.6s 0.2s ease both;
          position: relative; z-index: 1;
        }
        .tt-live-dot {
          width: 8px; height: 8px; border-radius: 50%; background: #7C3AED;
          animation: ttLivePulse 1.5s ease-in-out infinite;
          flex-shrink: 0;
        }
        @keyframes ttLivePulse {
          0%, 100% { opacity: 1; transform: scale(1); box-shadow: 0 0 0 0 rgba(124,58,237,0.6); }
          50% { opacity: 0.8; transform: scale(1.1); box-shadow: 0 0 0 6px rgba(124,58,237,0); }
        }
        .tt-hero-title {
          font-family: 'Bebas Neue', sans-serif;
          font-size: clamp(80px, 14vw, 180px);
          line-height: 0.9;
          letter-spacing: 0.02em;
          margin-bottom: 32px;
          animation: ttStaggerIn 0.7s 0.4s ease both;
          position: relative; z-index: 1;
        }
        .tt-hero-title .tt-orange { color: #7C3AED; }
        .tt-hero-sub {
          font-size: 18px; font-weight: 300; color: rgba(255,255,255,0.65);
          max-width: 480px; line-height: 1.6; margin-bottom: 48px;
          animation: ttStaggerIn 0.7s 0.6s ease both;
          position: relative; z-index: 1;
        }
        .tt-hero-ctas {
          display: flex; gap: 16px; flex-wrap: wrap;
          animation: ttStaggerIn 0.7s 0.8s ease both;
          position: relative; z-index: 1;
        }
        @keyframes ttStaggerIn {
          from { opacity: 0; transform: translateY(30px); }
          to { opacity: 1; transform: translateY(0); }
        }
        .tt-btn-primary {
          font-size: 14px; font-weight: 900; text-transform: uppercase; letter-spacing: 0.1em;
          background: #7C3AED; color: white; border: none;
          padding: 18px 40px; cursor: pointer; font-family: 'Inter', sans-serif;
          transition: background 0.2s, transform 0.1s; text-decoration: none; display: inline-block;
        }
        .tt-btn-primary:hover { background: #E03E00; transform: translateY(-2px); }
        .tt-btn-ghost {
          font-size: 14px; font-weight: 700; text-transform: uppercase; letter-spacing: 0.1em;
          background: transparent; color: white;
          border: 2px solid rgba(255,255,255,0.3);
          padding: 18px 40px; cursor: pointer; font-family: 'Inter', sans-serif;
          transition: border-color 0.2s, color 0.2s; text-decoration: none; display: inline-block;
        }
        .tt-btn-ghost:hover { border-color: #7C3AED; color: #7C3AED; }

        .tt-tags-section {
          background: #111111;
          padding: 80px 48px;
          clip-path: polygon(0 0, 100% 40px, 100% 100%, 0 calc(100% - 40px));
        }
        .tt-tags-label { font-size: 12px; font-weight: 700; letter-spacing: 0.12em; text-transform: uppercase; color: #7C3AED; margin-bottom: 24px; }
        .tt-tags-row { display: flex; gap: 12px; flex-wrap: wrap; }
        .tt-sport-tag {
          font-size: 13px; font-weight: 700; letter-spacing: 0.06em; text-transform: uppercase;
          padding: 10px 24px; border: 2px solid rgba(255,255,255,0.15);
          background: transparent; color: rgba(255,255,255,0.7);
          cursor: pointer; transition: all 0.2s; font-family: 'Inter', sans-serif;
        }
        .tt-sport-tag:hover, .tt-sport-tag.active { border-color: #7C3AED; color: #7C3AED; background: rgba(124,58,237,0.08); }

        .tt-swipe-section {
          padding: 100px 48px;
          background: #0A0A0A;
          display: flex; gap: 60px; align-items: center;
          flex-wrap: wrap;
        }
        .tt-swipe-left { flex: 1; min-width: 280px; }
        .tt-swipe-right { flex: 1; min-width: 320px; position: relative; height: 420px; }
        .tt-swipe-label { font-size: 12px; font-weight: 700; letter-spacing: 0.12em; text-transform: uppercase; color: #7C3AED; margin-bottom: 20px; }
        .tt-swipe-title { font-family: 'Bebas Neue', sans-serif; font-size: clamp(48px, 6vw, 80px); line-height: 0.9; letter-spacing: 0.02em; margin-bottom: 28px; }
        .tt-swipe-desc { font-size: 16px; font-weight: 300; color: rgba(255,255,255,0.6); line-height: 1.7; max-width: 400px; }
        .tt-athlete-card {
          position: absolute;
          width: 280px; height: 380px;
          background: #1A1A1A;
          border: 1px solid rgba(255,255,255,0.08);
          padding: 28px 24px;
          display: flex; flex-direction: column; justify-content: flex-end;
        }
        .tt-athlete-card:nth-child(1) { top: 0; left: 60px; transform: rotate(-3deg); animation: ttCardFloat1 4s ease-in-out infinite; z-index: 3; }
        .tt-athlete-card:nth-child(2) { top: 20px; left: 20px; transform: rotate(1deg); animation: ttCardFloat2 5s ease-in-out infinite; z-index: 2; }
        .tt-athlete-card:nth-child(3) { top: 40px; left: 0; transform: rotate(-1deg); animation: ttCardFloat3 6s ease-in-out infinite; z-index: 1; }
        @keyframes ttCardFloat1 { 0%,100% { transform: rotate(-3deg) translateY(0); } 50% { transform: rotate(-3deg) translateY(-8px); } }
        @keyframes ttCardFloat2 { 0%,100% { transform: rotate(1deg) translateY(0); } 50% { transform: rotate(1deg) translateY(-5px); } }
        @keyframes ttCardFloat3 { 0%,100% { transform: rotate(-1deg) translateY(0); } 50% { transform: rotate(-1deg) translateY(-3px); } }
        .tt-card-bg {
          position: absolute; top: 0; left: 0; right: 0; height: 60%;
          background: linear-gradient(135deg, #1A1A1A 0%, #2A1A10 100%);
        }
        .tt-card-sport-badge {
          display: inline-block; font-size: 11px; font-weight: 700; letter-spacing: 0.1em;
          text-transform: uppercase; color: #7C3AED; border: 1px solid #7C3AED;
          padding: 4px 10px; margin-bottom: 12px; position: relative; z-index: 2;
        }
        .tt-card-name { font-size: 22px; font-weight: 700; margin-bottom: 4px; position: relative; z-index: 2; }
        .tt-card-detail { font-size: 13px; color: rgba(255,255,255,0.5); position: relative; z-index: 2; }
        .tt-card-pace { font-size: 24px; font-weight: 900; color: #7C3AED; margin-top: 8px; position: relative; z-index: 2; }

        .tt-stats-section {
          background: #7C3AED;
          padding: 80px 48px;
          clip-path: polygon(0 40px, 100% 0, 100% calc(100% - 40px), 0 100%);
        }
        .tt-stats-row { display: flex; justify-content: center; gap: 80px; flex-wrap: wrap; max-width: 900px; margin: 0 auto; }
        .stat-item { text-align: center; }
        .stat-number { font-family: 'Bebas Neue', sans-serif; font-size: 72px; letter-spacing: 0.02em; display: block; color: white; }
        .stat-label { font-size: 13px; font-weight: 700; letter-spacing: 0.1em; text-transform: uppercase; color: rgba(255,255,255,0.8); margin-top: 4px; display: block; }

        .tt-features-section { padding: 100px 48px; background: #0A0A0A; }
        .tt-section-title { font-family: 'Bebas Neue', sans-serif; font-size: clamp(48px, 7vw, 96px); letter-spacing: 0.02em; margin-bottom: 60px; line-height: 1; }
        .tt-features-grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(300px, 1fr)); gap: 2px; }
        .tt-feat-card {
          background: #111111; padding: 40px 32px;
          border-left: 3px solid #7C3AED;
          transition: background 0.2s, transform 0.2s;
          opacity: 0; transform: translateY(20px);
        }
        .tt-feat-card.visible { opacity: 1; transform: translateY(0); }
        .tt-feat-card:hover { background: rgba(124,58,237,0.12); transform: translateX(4px); }
        .tt-feat-icon { font-size: 32px; margin-bottom: 20px; }
        .tt-feat-title { font-size: 18px; font-weight: 700; margin-bottom: 12px; color: white; }
        .tt-feat-desc { font-size: 14px; color: rgba(255,255,255,0.55); line-height: 1.6; }

        .tt-how-section {
          padding: 100px 48px;
          background: #111111;
          clip-path: polygon(0 0, 100% 60px, 100% 100%, 0 calc(100% - 60px));
        }
        .tt-how-label { font-size: 12px; font-weight: 700; letter-spacing: 0.12em; text-transform: uppercase; color: #7C3AED; margin-bottom: 20px; }
        .tt-how-title { font-family: 'Bebas Neue', sans-serif; font-size: clamp(48px, 6vw, 80px); line-height: 1; margin-bottom: 60px; }
        .tt-steps { display: grid; grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); gap: 40px; }
        .tt-step-num { font-family: 'Bebas Neue', sans-serif; font-size: 80px; color: rgba(124,58,237,0.2); line-height: 1; }
        .tt-step-title { font-size: 18px; font-weight: 700; margin-bottom: 12px; color: white; }
        .tt-step-desc { font-size: 14px; color: rgba(255,255,255,0.55); line-height: 1.6; }

        .tt-cta-section { padding: 120px 48px; text-align: center; background: #0A0A0A; }
        .tt-cta-title { font-family: 'Bebas Neue', sans-serif; font-size: clamp(60px, 10vw, 120px); line-height: 0.9; margin-bottom: 32px; letter-spacing: 0.02em; }
        .tt-cta-title span { color: #7C3AED; }
        .tt-cta-sub { font-size: 18px; color: rgba(255,255,255,0.55); margin-bottom: 48px; font-weight: 300; }

        footer.tt-footer { padding: 40px 48px; background: #050505; border-top: 1px solid rgba(255,255,255,0.06); }
        .tt-footer-inner { display: flex; justify-content: space-between; align-items: center; flex-wrap: wrap; gap: 24px; }
        .tt-footer-logo { font-family: 'Bebas Neue', sans-serif; font-size: 24px; letter-spacing: 0.06em; }
        .tt-footer-logo span { color: #7C3AED; }
        .tt-footer-links { display: flex; gap: 28px; list-style: none; }
        .tt-footer-links a { font-size: 12px; font-weight: 600; color: rgba(255,255,255,0.4); text-decoration: none; letter-spacing: 0.06em; text-transform: uppercase; }
        .tt-footer-links a:hover { color: #7C3AED; }
        .tt-footer-copy { font-size: 12px; color: rgba(255,255,255,0.3); }

        @media (max-width: 768px) {
          .tt-nav { padding: 16px 20px; }
          .tt-nav-links { display: none; }
          .tt-hero { padding: 100px 20px 60px; }
          .tt-hero-title { font-size: clamp(60px, 18vw, 80px); }
          .tt-tags-section { padding: 80px 20px; clip-path: none; }
          .tt-swipe-section { padding: 60px 20px; }
          .tt-stats-section { padding: 80px 20px; clip-path: none; }
          .tt-features-section { padding: 60px 20px; }
          .tt-how-section { padding: 80px 20px; clip-path: none; }
          .tt-cta-section { padding: 80px 20px; }
          footer.tt-footer { padding: 32px 20px; }
          .tt-footer-inner { flex-direction: column; text-align: center; }
          .tt-swipe-right { display: none; }
        }
      `}</style>

      {/* NAV */}
      <nav className="tt-nav">
        <a href="/" className="tt-nav-logo">Training<span>Tinder</span></a>
        <ul className="tt-nav-links">
          <li><a href="#how">How It Works</a></li>
          <li><a href="#features">Features</a></li>
          <li><a href="#join">Join</a></li>
        </ul>
        {userId ? (
          <Link href="/dashboard" className="tt-btn-join">Dashboard</Link>
        ) : (
          <Link href="/login" className="tt-btn-join">Join Free</Link>
        )}
      </nav>

      {/* HERO */}
      <section className="tt-hero">
        <div className="tt-hero-gradient" />
        <div className="tt-hero-tag">
          <span className="tt-live-dot" />
          Live sessions happening now
        </div>
        <h1 className="tt-hero-title">
          FIND<br />YOUR<br /><span className="tt-orange">PACK.</span>
        </h1>
        <p className="tt-hero-sub">
          The training partner app built for cyclists, runners, and triathletes who are serious about performance. Match by pace. Match by schedule. Match by drive.
        </p>
        <div className="tt-hero-ctas">
          <Link href="/login" className="tt-btn-primary">
            {userId ? 'Go to Dashboard →' : 'Find my pack →'}
          </Link>
          <Link href="/login" className="tt-btn-ghost">
            {userId ? 'Dashboard' : 'Sign In'}
          </Link>
        </div>
      </section>

      {/* SPORT TAGS */}
      <section className="tt-tags-section">
        <p className="tt-tags-label">Your sport</p>
        <div className="tt-tags-row">
          {SPORTS.map((sport) => (
            <button
              key={sport}
              className={`tt-sport-tag${activeSport === sport ? ' active' : ''}`}
              onClick={() => setActiveSport(sport)}
            >
              {sport}
            </button>
          ))}
        </div>
      </section>

      {/* SWIPE CARDS */}
      <section className="tt-swipe-section">
        <div className="tt-swipe-left">
          <p className="tt-swipe-label">Athlete Matching</p>
          <h2 className="tt-swipe-title">
            RIGHT ATHLETE.<br />RIGHT<br /><span style={{ color: '#7C3AED' }}>MOMENT.</span>
          </h2>
          <p className="tt-swipe-desc">
            We match you with athletes at your level in your city, for today&apos;s session — not hypothetically. Real people, real rides, real accountability.
          </p>
        </div>
        <div className="tt-swipe-right">
          {ATHLETES.map((a) => (
            <div key={a.name} className="tt-athlete-card">
              <div className="tt-card-bg" />
              <span className="tt-card-sport-badge">{a.sport}</span>
              <div className="tt-card-name">{a.name}</div>
              <div className="tt-card-detail">{a.detail}</div>
              <div className="tt-card-pace">{a.pace}</div>
            </div>
          ))}
        </div>
      </section>

      {/* STATS */}
      <section className="tt-stats-section">
        <div className="tt-stats-row">
          {STATS.map((s) => <StatItem key={s.label} target={s.target} label={s.label} />)}
        </div>
      </section>

      {/* FEATURES */}
      <section className="tt-features-section" id="features">
        <h2 className="tt-section-title">
          BUILT FOR<br /><span style={{ color: '#7C3AED' }}>ATHLETES.</span>
        </h2>
        <div className="tt-features-grid">
          {FEATURES.map((f) => (
            <FeatCard key={f.title} icon={f.icon} title={f.title} desc={f.desc} />
          ))}
        </div>
      </section>

      {/* HOW IT WORKS */}
      <section className="tt-how-section" id="how">
        <p className="tt-how-label">Get started</p>
        <h2 className="tt-how-title">
          THREE STEPS<br />TO YOUR <span style={{ color: '#7C3AED' }}>PACK.</span>
        </h2>
        <div className="tt-steps">
          {[
            { n: '01', title: 'Connect Strava', desc: "Link your Strava account. We pull your real activity data to build an accurate athletic profile — no self-reporting." },
            { n: '02', title: "Set today's window", desc: "Tell us when you can train today, where you'll start, and how far. Takes 30 seconds." },
            { n: '03', title: 'Meet your pack', desc: 'We match you with nearby athletes at your pace, right now. Confirm, coordinate, and go.' },
          ].map((step) => (
            <div key={step.n}>
              <div className="tt-step-num">{step.n}</div>
              <h3 className="tt-step-title">{step.title}</h3>
              <p className="tt-step-desc">{step.desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* CTA */}
      <section className="tt-cta-section" id="join">
        <h2 className="tt-cta-title">
          STOP<br />TRAINING<br /><span>ALONE.</span>
        </h2>
        <p className="tt-cta-sub">Join 4,200 athletes already finding their pack every day.</p>
        <Link
          href="/login"
          className="tt-btn-primary"
          style={{ fontSize: '16px', padding: '20px 56px' }}
        >
          {userId ? 'Go to Dashboard →' : 'Join free — find your pack →'}
        </Link>
      </section>

      {/* FOOTER */}
      <footer className="tt-footer">
        <div className="tt-footer-inner">
          <span className="tt-footer-logo">Training<span>Tinder</span></span>
          <ul className="tt-footer-links">
            <li><a href="#">Privacy</a></li>
            <li><a href="#">Terms</a></li>
            <li><a href="#">Press</a></li>
            <li><a href="#">Contact</a></li>
          </ul>
          <span className="tt-footer-copy">© 2026 TrainingTinder</span>
        </div>
      </footer>
    </>
  );
}

function FeatCard({ icon, title, desc }: { icon: string; title: string; desc: string }) {
  const ref = useRef<HTMLDivElement>(null);
  const [visible, setVisible] = useState(false);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const obs = new IntersectionObserver(([e]) => { if (e.isIntersecting) { setVisible(true); obs.disconnect(); } }, { threshold: 0.15 });
    obs.observe(el);
    return () => obs.disconnect();
  }, []);
  return (
    <div ref={ref} className={`tt-feat-card${visible ? ' visible' : ''}`} style={{ transition: 'opacity 0.5s ease, transform 0.5s ease, background 0.2s' }}>
      <div className="tt-feat-icon">{icon}</div>
      <h3 className="tt-feat-title">{title}</h3>
      <p className="tt-feat-desc">{desc}</p>
    </div>
  );
}
