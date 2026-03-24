'use client';

import { useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { useLang } from '@/lib/lang';

function useInView(threshold = 0.15) {
  const ref = useRef<HTMLDivElement>(null);
  const [visible, setVisible] = useState(false);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const obs = new IntersectionObserver(
      ([e]) => { if (e.isIntersecting) { setVisible(true); obs.disconnect(); } },
      { threshold }
    );
    obs.observe(el);
    return () => obs.disconnect();
  }, [threshold]);
  return { ref, visible };
}

export default function LandingPage({ userId }: { userId: string | null }) {
  const [menuOpen, setMenuOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);
  const { t } = useLang();

  useEffect(() => {
    const handler = () => setScrolled(window.scrollY > 40);
    window.addEventListener('scroll', handler, { passive: true });
    return () => window.removeEventListener('scroll', handler);
  }, []);

  const MARQUEE_ITEMS = [
    t('landing_marquee_cycling'), t('landing_marquee_running'), t('landing_marquee_triathlon'),
    t('landing_marquee_swimming'), t('landing_marquee_trail'), t('landing_marquee_gravel'),
    t('landing_marquee_gym'), t('landing_marquee_mtb'), t('landing_marquee_duathlon'),
    t('landing_marquee_crossfit'), t('landing_marquee_rowing'),
    t('landing_marquee_cycling'), t('landing_marquee_running'), t('landing_marquee_triathlon'),
    t('landing_marquee_swimming'), t('landing_marquee_trail'), t('landing_marquee_gravel'),
    t('landing_marquee_gym'), t('landing_marquee_mtb'), t('landing_marquee_duathlon'),
    t('landing_marquee_crossfit'), t('landing_marquee_rowing'),
  ];

  const PILLARS = [
    {
      num: '01',
      title: t('landing_pillar1_title'),
      subtitle: t('landing_pillar1_subtitle'),
      desc: t('landing_pillar1_desc'),
      tags: [t('landing_pillar1_tag1'), t('landing_pillar1_tag2'), t('landing_pillar1_tag3')],
    },
    {
      num: '02',
      title: t('landing_pillar2_title'),
      subtitle: t('landing_pillar2_subtitle'),
      desc: t('landing_pillar2_desc'),
      tags: [t('landing_pillar2_tag1'), t('landing_pillar2_tag2'), t('landing_pillar2_tag3')],
    },
    {
      num: '03',
      title: t('landing_pillar3_title'),
      subtitle: t('landing_pillar3_subtitle'),
      desc: t('landing_pillar3_desc'),
      tags: [t('landing_pillar3_tag1'), t('landing_pillar3_tag2'), t('landing_pillar3_tag3')],
    },
  ];

  const FEATURES = [
    { num: '01', title: t('landing_feat1_title'), desc: t('landing_feat1_desc') },
    { num: '02', title: t('landing_feat2_title'), desc: t('landing_feat2_desc') },
    { num: '03', title: t('landing_feat3_title'), desc: t('landing_feat3_desc') },
    { num: '04', title: t('landing_feat4_title'), desc: t('landing_feat4_desc') },
    { num: '05', title: t('landing_feat5_title'), desc: t('landing_feat5_desc') },
    { num: '06', title: t('landing_feat6_title'), desc: t('landing_feat6_desc') },
  ];

  const STATS = [
    { value: '4 200+', label: t('landing_stat_athletes') },
    { value: '89', label: t('landing_stat_cities') },
    { value: '14 000+', label: t('landing_stat_sessions') },
    { value: '98%', label: t('landing_stat_show_rate') },
  ];

  const STEPS = [
    { n: '01', title: t('landing_step1_title'), desc: t('landing_step1_desc') },
    { n: '02', title: t('landing_step2_title'), desc: t('landing_step2_desc') },
    { n: '03', title: t('landing_step3_title'), desc: t('landing_step3_desc') },
  ];

  return (
    <>
      <style>{`
        *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }
        html { scroll-behavior: smooth; }
        body {
          font-family: 'Inter', 'SF Pro Display', system-ui, sans-serif;
          background: #080808;
          color: #FFFFFF;
          overflow-x: hidden;
          -webkit-font-smoothing: antialiased;
        }

        /* ─── NAV ─── */
        .lp-nav {
          position: fixed; top: 0; left: 0; right: 0; z-index: 200;
          display: flex; align-items: center; justify-content: space-between;
          padding: 0 48px;
          height: 68px;
          background: ${scrolled ? 'rgba(8,8,8,0.96)' : 'transparent'};
          backdrop-filter: ${scrolled ? 'blur(20px)' : 'none'};
          border-bottom: 1px solid ${scrolled ? 'rgba(255,255,255,0.06)' : 'transparent'};
          transition: all 0.3s ease;
        }
        .lp-logo {
          font-family: 'Syne', 'Inter', sans-serif;
          font-weight: 800;
          font-size: 18px;
          letter-spacing: -0.03em;
          color: white;
          text-decoration: none;
        }
        .lp-logo span { color: #F97316; }
        .lp-nav-links {
          display: flex; align-items: center; gap: 40px; list-style: none;
        }
        .lp-nav-links a {
          font-size: 13px; font-weight: 500;
          color: rgba(255,255,255,0.55);
          text-decoration: none;
          letter-spacing: 0.01em;
          transition: color 0.2s;
        }
        .lp-nav-links a:hover { color: white; }
        .lp-nav-cta {
          font-size: 13px; font-weight: 700;
          background: #F97316; color: white;
          border: none; padding: 10px 24px;
          cursor: pointer; text-decoration: none;
          display: inline-block;
          border-radius: 8px;
          transition: background 0.2s, transform 0.1s;
          letter-spacing: 0.01em;
        }
        .lp-nav-cta:hover { background: #EA580C; transform: translateY(-1px); }
        .lp-hamburger {
          display: none;
          flex-direction: column; gap: 5px;
          background: none; border: none; cursor: pointer; padding: 4px;
        }
        .lp-hamburger span {
          display: block; width: 22px; height: 2px;
          background: white; border-radius: 2px;
          transition: all 0.3s;
        }

        /* ─── HERO ─── */
        .lp-hero {
          min-height: 100vh;
          display: flex; flex-direction: column; justify-content: center;
          padding: 120px 48px 80px;
          position: relative; overflow: hidden;
          background: #080808;
        }
        .lp-hero-grid {
          position: absolute; inset: 0;
          background-image:
            linear-gradient(rgba(249,115,22,0.04) 1px, transparent 1px),
            linear-gradient(90deg, rgba(249,115,22,0.04) 1px, transparent 1px);
          background-size: 80px 80px;
          mask-image: radial-gradient(ellipse 70% 80% at 60% 40%, black 0%, transparent 70%);
        }
        .lp-hero-glow {
          position: absolute;
          top: 10%; right: -10%;
          width: 700px; height: 700px;
          border-radius: 50%;
          background: radial-gradient(circle, rgba(249,115,22,0.15) 0%, transparent 70%);
          pointer-events: none;
          animation: lpGlowPulse 8s ease-in-out infinite;
        }
        @keyframes lpGlowPulse {
          0%, 100% { transform: scale(1) translate(0, 0); opacity: 1; }
          50% { transform: scale(1.1) translate(-20px, 20px); opacity: 0.7; }
        }
        .lp-hero-eyebrow {
          display: flex; align-items: center; gap: 10px;
          font-size: 12px; font-weight: 600; letter-spacing: 0.1em;
          text-transform: uppercase; color: #F97316;
          margin-bottom: 28px;
          position: relative; z-index: 1;
          animation: lpFadeUp 0.8s 0.1s ease both;
        }
        .lp-live-dot {
          width: 7px; height: 7px; border-radius: 50%; background: #F97316;
          animation: lpLivePulse 2s ease-in-out infinite;
        }
        @keyframes lpLivePulse {
          0%, 100% { box-shadow: 0 0 0 0 rgba(249,115,22,0.6); }
          50% { box-shadow: 0 0 0 8px rgba(249,115,22,0); }
        }
        .lp-hero-title {
          font-family: 'Syne', 'Inter', sans-serif;
          font-weight: 800;
          font-size: clamp(72px, 11vw, 160px);
          line-height: 0.92;
          letter-spacing: -0.04em;
          margin-bottom: 36px;
          position: relative; z-index: 1;
          animation: lpFadeUp 0.8s 0.2s ease both;
        }
        .lp-hero-title .lp-accent { color: #F97316; }
        .lp-hero-title .lp-stroke {
          -webkit-text-stroke: 2px rgba(255,255,255,0.25);
          color: transparent;
        }
        .lp-hero-sub {
          font-size: 18px; font-weight: 400;
          color: rgba(255,255,255,0.5);
          max-width: 500px; line-height: 1.7;
          margin-bottom: 52px;
          position: relative; z-index: 1;
          animation: lpFadeUp 0.8s 0.35s ease both;
        }
        .lp-hero-ctas {
          display: flex; align-items: center; gap: 16px; flex-wrap: wrap;
          position: relative; z-index: 1;
          animation: lpFadeUp 0.8s 0.5s ease both;
        }
        .lp-btn-primary {
          font-size: 14px; font-weight: 700;
          background: #F97316; color: white;
          border: none; padding: 16px 40px;
          border-radius: 10px; cursor: pointer;
          text-decoration: none; display: inline-block;
          transition: background 0.2s, transform 0.15s, box-shadow 0.2s;
          letter-spacing: 0.01em;
        }
        .lp-btn-primary:hover {
          background: #EA580C;
          transform: translateY(-2px);
          box-shadow: 0 12px 40px rgba(249,115,22,0.4);
        }
        .lp-btn-outline {
          font-size: 14px; font-weight: 600;
          background: transparent; color: rgba(255,255,255,0.7);
          border: 1.5px solid rgba(255,255,255,0.15);
          padding: 16px 36px; border-radius: 10px;
          cursor: pointer; text-decoration: none; display: inline-block;
          transition: all 0.2s; letter-spacing: 0.01em;
        }
        .lp-btn-outline:hover { border-color: rgba(255,255,255,0.4); color: white; }
        .lp-hero-scroll {
          position: absolute; bottom: 40px; left: 48px; z-index: 1;
          display: flex; align-items: center; gap: 12px;
          font-size: 11px; font-weight: 600; letter-spacing: 0.1em;
          text-transform: uppercase; color: rgba(255,255,255,0.3);
          animation: lpFadeUp 1s 0.8s ease both;
        }
        .lp-scroll-line {
          width: 40px; height: 1px; background: rgba(255,255,255,0.15);
        }
        @keyframes lpFadeUp {
          from { opacity: 0; transform: translateY(24px); }
          to { opacity: 1; transform: translateY(0); }
        }

        /* ─── MARQUEE ─── */
        .lp-marquee-wrap {
          overflow: hidden;
          background: #F97316;
          padding: 16px 0;
          border-top: 1px solid rgba(255,255,255,0.1);
          border-bottom: 1px solid rgba(255,255,255,0.1);
        }
        .lp-marquee-track {
          display: flex; gap: 0;
          animation: lpMarquee 28s linear infinite;
          width: max-content;
        }
        .lp-marquee-track:hover { animation-play-state: paused; }
        @keyframes lpMarquee {
          from { transform: translateX(0); }
          to { transform: translateX(-50%); }
        }
        .lp-marquee-item {
          font-family: 'Syne', 'Inter', sans-serif;
          font-weight: 700; font-size: 12px;
          letter-spacing: 0.12em; text-transform: uppercase;
          color: rgba(255,255,255,0.9);
          padding: 0 32px;
          display: flex; align-items: center; gap: 32px;
          white-space: nowrap;
        }
        .lp-marquee-dot {
          width: 4px; height: 4px; border-radius: 50%;
          background: rgba(255,255,255,0.4); flex-shrink: 0;
        }

        /* ─── PILLARS ─── */
        .lp-pillars {
          padding: 120px 48px;
          background: #080808;
        }
        .lp-section-eyebrow {
          font-size: 11px; font-weight: 700; letter-spacing: 0.14em;
          text-transform: uppercase; color: #F97316;
          margin-bottom: 20px;
          display: flex; align-items: center; gap: 12px;
        }
        .lp-section-eyebrow::before {
          content: ''; display: block; width: 32px; height: 1px; background: #F97316;
        }
        .lp-pillars-header {
          display: flex; align-items: flex-end; justify-content: space-between;
          margin-bottom: 80px; gap: 40px; flex-wrap: wrap;
        }
        .lp-pillars-title {
          font-family: 'Syne', 'Inter', sans-serif;
          font-weight: 800; font-size: clamp(40px, 5vw, 72px);
          line-height: 1; letter-spacing: -0.03em;
        }
        .lp-pillars-sub {
          font-size: 15px; color: rgba(255,255,255,0.45);
          max-width: 300px; line-height: 1.6; text-align: right;
        }
        .lp-pillars-grid {
          display: grid; grid-template-columns: repeat(3, 1fr); gap: 2px;
        }
        .lp-pillar-card {
          background: #0f0f0f;
          padding: 48px 40px;
          border-top: 1px solid rgba(255,255,255,0.06);
          position: relative; overflow: hidden;
          transition: background 0.3s;
        }
        .lp-pillar-card::before {
          content: '';
          position: absolute; top: 0; left: 0; right: 0; height: 2px;
          background: #F97316;
          transform: scaleX(0); transform-origin: left;
          transition: transform 0.4s ease;
        }
        .lp-pillar-card:hover { background: #121212; }
        .lp-pillar-card:hover::before { transform: scaleX(1); }
        .lp-pillar-num {
          font-family: 'Syne', 'Inter', sans-serif;
          font-size: 11px; font-weight: 700; letter-spacing: 0.1em;
          color: rgba(249,115,22,0.6);
          margin-bottom: 40px;
          display: block;
        }
        .lp-pillar-title {
          font-family: 'Syne', 'Inter', sans-serif;
          font-size: 36px; font-weight: 800;
          letter-spacing: -0.02em; margin-bottom: 4px;
        }
        .lp-pillar-subtitle {
          font-size: 12px; font-weight: 500; letter-spacing: 0.06em;
          text-transform: uppercase; color: rgba(255,255,255,0.3);
          margin-bottom: 24px;
        }
        .lp-pillar-desc {
          font-size: 14px; color: rgba(255,255,255,0.5);
          line-height: 1.75; margin-bottom: 32px;
        }
        .lp-pillar-tags {
          display: flex; flex-wrap: wrap; gap: 8px;
        }
        .lp-pillar-tag {
          font-size: 11px; font-weight: 600; letter-spacing: 0.05em;
          color: rgba(249,115,22,0.8);
          border: 1px solid rgba(249,115,22,0.2);
          padding: 4px 12px; border-radius: 4px;
          background: rgba(249,115,22,0.05);
        }

        /* ─── STATS ─── */
        .lp-stats {
          padding: 100px 48px;
          background: #0b0b0b;
          border-top: 1px solid rgba(255,255,255,0.05);
          border-bottom: 1px solid rgba(255,255,255,0.05);
        }
        .lp-stats-grid {
          display: grid; grid-template-columns: repeat(4, 1fr);
          gap: 0; max-width: 1000px; margin: 0 auto;
        }
        .lp-stat-item {
          text-align: center; padding: 0 40px;
          border-right: 1px solid rgba(255,255,255,0.06);
        }
        .lp-stat-item:last-child { border-right: none; }
        .lp-stat-value {
          font-family: 'Syne', 'Inter', sans-serif;
          font-size: clamp(48px, 5vw, 72px);
          font-weight: 800; letter-spacing: -0.04em;
          display: block; color: white; margin-bottom: 8px;
        }
        .lp-stat-label {
          font-size: 12px; font-weight: 600; letter-spacing: 0.08em;
          text-transform: uppercase; color: rgba(255,255,255,0.35);
        }

        /* ─── FEATURES ─── */
        .lp-features { padding: 120px 48px; background: #080808; }
        .lp-features-header { margin-bottom: 80px; }
        .lp-features-title {
          font-family: 'Syne', 'Inter', sans-serif;
          font-weight: 800; font-size: clamp(40px, 5vw, 72px);
          line-height: 1; letter-spacing: -0.03em; margin-bottom: 20px;
        }
        .lp-features-desc {
          font-size: 16px; color: rgba(255,255,255,0.4);
          max-width: 520px; line-height: 1.7;
        }
        .lp-features-grid {
          display: grid; grid-template-columns: repeat(3, 1fr);
          gap: 1px; background: rgba(255,255,255,0.04);
        }
        .lp-feat-card {
          background: #080808; padding: 48px 40px;
          border-left: 2px solid transparent;
          transition: all 0.3s ease;
          opacity: 0; transform: translateY(16px);
        }
        .lp-feat-card.lp-visible {
          opacity: 1; transform: translateY(0);
        }
        .lp-feat-card:hover {
          background: #0e0e0e;
          border-left-color: #F97316;
        }
        .lp-feat-num {
          font-family: 'Syne', 'Inter', sans-serif;
          font-size: 11px; font-weight: 700; letter-spacing: 0.1em;
          color: rgba(249,115,22,0.5); margin-bottom: 28px; display: block;
        }
        .lp-feat-title {
          font-size: 20px; font-weight: 700;
          letter-spacing: -0.01em; margin-bottom: 14px;
        }
        .lp-feat-desc {
          font-size: 14px; color: rgba(255,255,255,0.45);
          line-height: 1.75;
        }

        /* ─── HOW IT WORKS ─── */
        .lp-how {
          padding: 120px 48px;
          background: #0b0b0b;
          border-top: 1px solid rgba(255,255,255,0.05);
        }
        .lp-how-grid {
          display: grid; grid-template-columns: repeat(3, 1fr); gap: 60px;
          margin-top: 80px;
        }
        .lp-how-step { position: relative; }
        .lp-how-step-line {
          position: absolute; top: 22px; left: calc(100% + 0px); right: -60px;
          height: 1px; background: rgba(255,255,255,0.06);
        }
        .lp-how-step:last-child .lp-how-step-line { display: none; }
        .lp-step-num {
          font-family: 'Syne', 'Inter', sans-serif;
          font-size: 11px; font-weight: 700; letter-spacing: 0.1em;
          color: rgba(249,115,22,0.6); display: block; margin-bottom: 32px;
        }
        .lp-step-title {
          font-family: 'Syne', 'Inter', sans-serif;
          font-size: 26px; font-weight: 800;
          letter-spacing: -0.02em; margin-bottom: 16px;
        }
        .lp-step-desc {
          font-size: 14px; color: rgba(255,255,255,0.45); line-height: 1.75;
        }

        /* ─── ECOSYSTEM ─── */
        .lp-ecosystem {
          padding: 120px 48px;
          background: #080808;
        }
        .lp-ecosystem-grid {
          display: grid; grid-template-columns: repeat(3, 1fr); gap: 2px;
          margin-top: 80px;
        }
        .lp-eco-card {
          padding: 60px 56px;
          position: relative; overflow: hidden;
        }
        .lp-eco-card-trainmate {
          background: linear-gradient(135deg, rgba(249,115,22,0.1) 0%, rgba(249,115,22,0.04) 100%);
          border: 1px solid rgba(249,115,22,0.2);
          border-radius: 2px 0 0 2px;
        }
        .lp-eco-card-trainpilot {
          background: #0f0f0f;
          border: 1px solid rgba(255,255,255,0.06);
          border-left: none;
          border-radius: 0;
        }
        .lp-eco-card-trainhealth {
          background: #0f0f0f;
          border: 1px solid rgba(255,255,255,0.06);
          border-left: none;
          border-radius: 0 2px 2px 0;
        }
        .lp-eco-badge {
          display: inline-flex; align-items: center; gap: 8px;
          font-size: 11px; font-weight: 700; letter-spacing: 0.1em;
          text-transform: uppercase; padding: 6px 14px; border-radius: 4px;
          margin-bottom: 32px;
        }
        .lp-eco-badge-primary {
          background: rgba(249,115,22,0.15); color: #F97316;
          border: 1px solid rgba(249,115,22,0.25);
        }
        .lp-eco-badge-secondary {
          background: rgba(255,255,255,0.05); color: rgba(255,255,255,0.4);
          border: 1px solid rgba(255,255,255,0.08);
        }
        .lp-eco-title {
          font-family: 'Syne', 'Inter', sans-serif;
          font-size: 36px; font-weight: 800;
          letter-spacing: -0.03em; margin-bottom: 16px;
        }
        .lp-eco-desc {
          font-size: 15px; color: rgba(255,255,255,0.45);
          line-height: 1.75; margin-bottom: 36px;
        }
        .lp-eco-features {
          list-style: none; display: flex; flex-direction: column; gap: 10px;
          margin-bottom: 40px;
        }
        .lp-eco-features li {
          font-size: 13px; color: rgba(255,255,255,0.55);
          display: flex; align-items: center; gap: 10px;
        }
        .lp-eco-features li::before {
          content: ''; display: block;
          width: 16px; height: 1px; background: #F97316; flex-shrink: 0;
        }
        .lp-eco-link {
          font-size: 13px; font-weight: 700;
          color: #F97316; text-decoration: none;
          display: inline-flex; align-items: center; gap: 8px;
          letter-spacing: 0.02em;
          transition: gap 0.2s;
        }
        .lp-eco-link:hover { gap: 14px; }
        .lp-eco-link-muted {
          font-size: 13px; font-weight: 700;
          color: rgba(255,255,255,0.3); text-decoration: none;
          display: inline-flex; align-items: center; gap: 8px;
          letter-spacing: 0.02em;
          transition: color 0.2s, gap 0.2s;
        }
        .lp-eco-link-muted:hover { color: white; gap: 14px; }

        /* ─── CTA ─── */
        .lp-cta {
          padding: 160px 48px;
          text-align: center;
          background: #080808;
          position: relative; overflow: hidden;
        }
        .lp-cta-glow {
          position: absolute; top: 50%; left: 50%; transform: translate(-50%, -50%);
          width: 600px; height: 600px; border-radius: 50%;
          background: radial-gradient(circle, rgba(249,115,22,0.12) 0%, transparent 70%);
          pointer-events: none;
        }
        .lp-cta-label {
          font-size: 11px; font-weight: 700; letter-spacing: 0.14em;
          text-transform: uppercase; color: rgba(249,115,22,0.7);
          margin-bottom: 28px;
          position: relative; z-index: 1;
        }
        .lp-cta-title {
          font-family: 'Syne', 'Inter', sans-serif;
          font-weight: 800; font-size: clamp(56px, 9vw, 130px);
          line-height: 0.92; letter-spacing: -0.04em;
          margin-bottom: 40px;
          position: relative; z-index: 1;
        }
        .lp-cta-title span { color: #F97316; }
        .lp-cta-sub {
          font-size: 17px; color: rgba(255,255,255,0.4);
          margin-bottom: 52px; max-width: 440px;
          margin-left: auto; margin-right: auto;
          line-height: 1.65;
          position: relative; z-index: 1;
        }
        .lp-cta-actions {
          display: flex; align-items: center; justify-content: center;
          gap: 16px; flex-wrap: wrap;
          position: relative; z-index: 1;
        }

        /* ─── FOOTER ─── */
        .lp-footer {
          padding: 60px 48px;
          background: #050505;
          border-top: 1px solid rgba(255,255,255,0.05);
        }
        .lp-footer-inner {
          display: flex; align-items: center; justify-content: space-between;
          flex-wrap: wrap; gap: 28px;
          margin-bottom: 40px;
        }
        .lp-footer-logo {
          font-family: 'Syne', 'Inter', sans-serif;
          font-weight: 800; font-size: 18px;
          letter-spacing: -0.02em; color: white; text-decoration: none;
        }
        .lp-footer-logo span { color: #F97316; }
        .lp-footer-links {
          display: flex; gap: 32px; list-style: none; flex-wrap: wrap;
        }
        .lp-footer-links a {
          font-size: 12px; font-weight: 500;
          color: rgba(255,255,255,0.3); text-decoration: none;
          letter-spacing: 0.02em;
          transition: color 0.2s;
        }
        .lp-footer-links a:hover { color: rgba(255,255,255,0.7); }
        .lp-footer-bottom {
          display: flex; align-items: center; justify-content: space-between;
          flex-wrap: wrap; gap: 16px;
          padding-top: 28px;
          border-top: 1px solid rgba(255,255,255,0.04);
        }
        .lp-footer-copy {
          font-size: 12px; color: rgba(255,255,255,0.2);
        }
        .lp-footer-copy a {
          color: rgba(249,115,22,0.5); text-decoration: none;
        }
        .lp-footer-tagline {
          font-size: 12px; color: rgba(255,255,255,0.15); letter-spacing: 0.06em;
          text-transform: uppercase;
        }

        /* ─── MOBILE MENU ─── */
        .lp-mobile-menu {
          position: fixed; inset: 0; z-index: 150;
          background: rgba(8,8,8,0.98);
          backdrop-filter: blur(20px);
          display: flex; flex-direction: column;
          align-items: center; justify-content: center;
          gap: 8px;
          transform: translateX(100%);
          transition: transform 0.35s cubic-bezier(0.4,0,0.2,1);
        }
        .lp-mobile-menu.open { transform: translateX(0); }
        .lp-mobile-menu a {
          font-family: 'Syne', 'Inter', sans-serif;
          font-size: 40px; font-weight: 800; letter-spacing: -0.03em;
          color: rgba(255,255,255,0.7); text-decoration: none;
          transition: color 0.2s;
          line-height: 1.1;
        }
        .lp-mobile-menu a:hover { color: white; }

        /* ─── RESPONSIVE ─── */
        @media (max-width: 900px) {
          .lp-nav { padding: 0 20px; }
          .lp-nav-links { display: none; }
          .lp-hamburger { display: flex; }
          .lp-hero { padding: 100px 20px 64px; }
          .lp-pillars { padding: 80px 20px; }
          .lp-pillars-grid { grid-template-columns: 1fr; }
          .lp-pillars-sub { text-align: left; }
          .lp-stats { padding: 72px 20px; }
          .lp-stats-grid { grid-template-columns: repeat(2, 1fr); gap: 40px; }
          .lp-stat-item { border-right: none; padding: 0; }
          .lp-features { padding: 80px 20px; }
          .lp-features-grid { grid-template-columns: 1fr; }
          .lp-how { padding: 80px 20px; }
          .lp-how-grid { grid-template-columns: 1fr; gap: 48px; }
          .lp-how-step-line { display: none; }
          .lp-ecosystem { padding: 80px 20px; }
          .lp-ecosystem-grid { grid-template-columns: 1fr; }
          .lp-eco-card-trainmate { border-radius: 2px 2px 0 0; }
          .lp-eco-card-trainpilot { border-left: 1px solid rgba(255,255,255,0.06); border-top: none; border-radius: 0; }
          .lp-eco-card-trainhealth { border-left: 1px solid rgba(255,255,255,0.06); border-top: none; border-radius: 0 0 2px 2px; }
          .lp-eco-card { padding: 48px 32px; }
          .lp-cta { padding: 100px 20px; }
          .lp-footer { padding: 48px 20px; }
          .lp-hero-scroll { display: none; }
          .lp-pillar-card { padding: 36px 28px; }
          .lp-feat-card { padding: 36px 28px; }
        }
      `}</style>

      {/* ─── MOBILE MENU ─── */}
      <div className={`lp-mobile-menu${menuOpen ? ' open' : ''}`}>
        <button
          onClick={() => setMenuOpen(false)}
          style={{ position: 'absolute', top: 24, right: 20, background: 'none', border: 'none', color: 'white', fontSize: 14, cursor: 'pointer', letterSpacing: '0.06em' }}
        >
          {t('landing_close')} ✕
        </button>
        <a href="#how" onClick={() => setMenuOpen(false)}>{t('landing_how_it_works')}</a>
        <a href="#features" onClick={() => setMenuOpen(false)}>{t('landing_features')}</a>
        <a href="#ecosystem" onClick={() => setMenuOpen(false)}>{t('landing_ecosystem')}</a>
        <Link href="/login" onClick={() => setMenuOpen(false)} style={{ marginTop: 32, fontSize: 14, fontWeight: 700, background: '#F97316', color: 'white', padding: '16px 40px', borderRadius: 10, textDecoration: 'none' }}>
          {t('landing_join')}
        </Link>
      </div>

      {/* ─── NAV ─── */}
      <nav className="lp-nav">
        <Link href="/" className="lp-logo">Athlix <span>TrainMate</span></Link>
        <ul className="lp-nav-links">
          <li><a href="#how">{t('landing_how_it_works')}</a></li>
          <li><a href="#features">{t('landing_features')}</a></li>
          <li><a href="#ecosystem">{t('landing_ecosystem')}</a></li>
        </ul>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          {!userId && (
            <Link href="/login" className="lp-btn-outline" style={{ padding: '9px 20px', borderRadius: 8, fontSize: 13 }}>
              {t('landing_login')}
            </Link>
          )}
          <Link href={userId ? '/dashboard' : '/login'} className="lp-nav-cta">
            {userId ? 'Dashboard' : t('landing_join')}
          </Link>
        </div>
        <button className="lp-hamburger" onClick={() => setMenuOpen(true)}>
          <span /><span /><span />
        </button>
      </nav>

      {/* ─── HERO ─── */}
      <section className="lp-hero">
        <div className="lp-hero-grid" />
        <div className="lp-hero-glow" />
        <div className="lp-hero-eyebrow">
          <span className="lp-live-dot" />
          {t('landing_hero_eyebrow')}
        </div>
        <h1 className="lp-hero-title">
          {t('landing_hero_line1')}<br />
          <span className="lp-accent">{t('landing_hero_line2')}</span><br />
          <span className="lp-stroke">{t('landing_hero_line3')}</span>
        </h1>
        <p className="lp-hero-sub">
          {t('landing_hero_sub')}
        </p>
        <div className="lp-hero-ctas">
          <Link href={userId ? '/dashboard' : '/login'} className="lp-btn-primary">
            {userId ? t('landing_hero_cta_dashboard') : t('landing_hero_cta_join')}
          </Link>
          <Link href={userId ? '/discover' : '/login'} className="lp-btn-outline">
            {userId ? t('landing_hero_cta_discover') : t('landing_login')}
          </Link>
        </div>
        <div className="lp-hero-scroll">
          <span className="lp-scroll-line" />
          {t('landing_hero_scroll')}
        </div>
      </section>

      {/* ─── MARQUEE ─── */}
      <div className="lp-marquee-wrap">
        <div className="lp-marquee-track">
          {MARQUEE_ITEMS.map((item, i) => (
            <span key={i} className="lp-marquee-item">
              {item}
              <span className="lp-marquee-dot" />
            </span>
          ))}
        </div>
      </div>

      {/* ─── PILLARS ─── */}
      <section className="lp-pillars" id="features">
        <div className="lp-section-eyebrow">{t('landing_pillars_eyebrow')}</div>
        <div className="lp-pillars-header">
          <h2 className="lp-pillars-title">
            {t('landing_pillars_title_line1')}<br />
            {t('landing_pillars_title_line2')}
          </h2>
          <p className="lp-pillars-sub">
            {t('landing_pillars_sub')}
          </p>
        </div>
        <div className="lp-pillars-grid">
          {PILLARS.map((p) => (
            <PillarCard key={p.num} {...p} />
          ))}
        </div>
      </section>

      {/* ─── STATS ─── */}
      <section className="lp-stats">
        <div className="lp-stats-grid">
          {STATS.map((s) => (
            <div key={s.label} className="lp-stat-item">
              <span className="lp-stat-value">{s.value}</span>
              <span className="lp-stat-label">{s.label}</span>
            </div>
          ))}
        </div>
      </section>

      {/* ─── FEATURES ─── */}
      <section className="lp-features">
        <div className="lp-features-header">
          <div className="lp-section-eyebrow">{t('landing_features_eyebrow')}</div>
          <h2 className="lp-features-title">
            {t('landing_features_title_line1')}<br />
            <span style={{ color: '#F97316' }}>{t('landing_features_title_line2')}</span>
          </h2>
          <p className="lp-features-desc">
            {t('landing_features_desc')}
          </p>
        </div>
        <div className="lp-features-grid">
          {FEATURES.map((f, i) => (
            <FeatCard key={f.num} num={f.num} title={f.title} desc={f.desc} delay={i * 80} />
          ))}
        </div>
      </section>

      {/* ─── HOW IT WORKS ─── */}
      <section className="lp-how" id="how">
        <div className="lp-section-eyebrow">{t('landing_how_eyebrow')}</div>
        <h2 className="lp-features-title" style={{ marginBottom: 0 }}>
          {t('landing_how_title_line1')}<br />
          {t('landing_how_title_line2')} <span style={{ color: '#F97316' }}>{t('landing_how_title_line3')}</span>
        </h2>
        <div className="lp-how-grid">
          {STEPS.map((step) => (
            <div key={step.n} className="lp-how-step">
              <div className="lp-how-step-line" />
              <span className="lp-step-num">{step.n}</span>
              <h3 className="lp-step-title">{step.title}</h3>
              <p className="lp-step-desc">{step.desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* ─── ECOSYSTEM ─── */}
      <section className="lp-ecosystem" id="ecosystem">
        <div className="lp-section-eyebrow">{t('landing_eco_eyebrow')}</div>
        <h2 className="lp-features-title" style={{ marginBottom: 20 }}>
          {t('landing_eco_title_line1')}<br />
          {t('landing_eco_title_line2')} <span style={{ color: '#F97316' }}>{t('landing_eco_title_line3')}</span>
        </h2>
        <p style={{ fontSize: 16, color: 'rgba(255,255,255,0.4)', maxWidth: 560, lineHeight: 1.7 }}>
          {t('landing_eco_desc')}
        </p>
        <div className="lp-ecosystem-grid">
          <div className="lp-eco-card lp-eco-card-trainmate">
            <div className="lp-eco-badge lp-eco-badge-primary">{t('landing_eco_tm_badge')}</div>
            <h3 className="lp-eco-title">{t('landing_eco_tm_title')}</h3>
            <p className="lp-eco-desc">
              {t('landing_eco_tm_desc')}
            </p>
            <ul className="lp-eco-features">
              <li>{t('landing_eco_tm_feat1')}</li>
              <li>{t('landing_eco_tm_feat2')}</li>
              <li>{t('landing_eco_tm_feat3')}</li>
              <li>{t('landing_eco_tm_feat4')}</li>
              <li>{t('landing_eco_tm_feat5')}</li>
            </ul>
            <Link href={userId ? '/dashboard' : '/login'} className="lp-eco-link">
              {userId ? t('landing_eco_tm_cta_dashboard') : t('landing_eco_tm_cta_join')} →
            </Link>
          </div>
          <div className="lp-eco-card lp-eco-card-trainpilot">
            <div className="lp-eco-badge lp-eco-badge-secondary">{t('landing_eco_tp_badge')}</div>
            <h3 className="lp-eco-title" style={{ color: 'rgba(255,255,255,0.7)' }}>{t('landing_eco_tp_title')}</h3>
            <p className="lp-eco-desc">
              {t('landing_eco_tp_desc')}
            </p>
            <ul className="lp-eco-features" style={{ '--eco-line': 'rgba(255,255,255,0.2)' } as React.CSSProperties}>
              <li style={{ '--before-bg': 'rgba(255,255,255,0.2)' } as React.CSSProperties}>{t('landing_eco_tp_feat1')}</li>
              <li>{t('landing_eco_tp_feat2')}</li>
              <li>{t('landing_eco_tp_feat3')}</li>
              <li>{t('landing_eco_tp_feat4')}</li>
              <li>{t('landing_eco_tp_feat5')}</li>
            </ul>
            <a href="https://athlix-trainpilot.vercel.app" target="_blank" rel="noopener noreferrer" className="lp-eco-link-muted">
              athlix-trainpilot.vercel.app →
            </a>
          </div>
          <div className="lp-eco-card lp-eco-card-trainhealth">
            <div className="lp-eco-badge lp-eco-badge-secondary">Health & Recovery</div>
            <h3 className="lp-eco-title" style={{ color: 'rgba(255,255,255,0.7)', whiteSpace: 'pre-line' }}>{'Health &\nRecovery Analytics'}</h3>
            <p className="lp-eco-desc">
              Athlix Health to bezpłatna analityka zdrowia. Monitoruj tętno przez Bluetooth, śledź recovery score, strain, sen i otrzymuj AI coaching — bez subskrypcji.
            </p>
            <ul className="lp-eco-features" style={{ '--eco-line': 'rgba(255,255,255,0.2)' } as React.CSSProperties}>
              <li>BLE HR — Polar, Garmin, Wahoo, Coospo</li>
              <li>Recovery score (0-100) z predykcją</li>
              <li>Strain & HR zones (TRIMP)</li>
              <li>Sleep tracking & hypnogram</li>
              <li>AI Health Coach</li>
            </ul>
            <a href="https://athlix-health.vercel.app" target="_blank" rel="noopener noreferrer" className="lp-eco-link-muted">
              athlix-health.vercel.app →
            </a>
          </div>
        </div>
      </section>

      {/* ─── CTA ─── */}
      <section className="lp-cta">
        <div className="lp-cta-glow" />
        <p className="lp-cta-label">{t('landing_cta_label')}</p>
        <h2 className="lp-cta-title">
          {t('landing_cta_line1')}<br />
          {t('landing_cta_line2')}<br />
          <span>{t('landing_cta_line3')}</span>
        </h2>
        <p className="lp-cta-sub">
          {t('landing_cta_sub')}
        </p>
        <div className="lp-cta-actions">
          <Link
            href={userId ? '/dashboard' : '/login'}
            className="lp-btn-primary"
            style={{ fontSize: 15, padding: '18px 52px' }}
          >
            {userId ? t('landing_hero_cta_dashboard') : t('landing_hero_cta_join')}
          </Link>
          {!userId && (
            <Link href="/login" className="lp-btn-outline" style={{ fontSize: 15, padding: '18px 36px' }}>
              {t('landing_login')}
            </Link>
          )}
        </div>
      </section>

      {/* ─── FOOTER ─── */}
      <footer className="lp-footer">
        <div className="lp-footer-inner">
          <Link href="/" className="lp-footer-logo">Athlix <span>TrainMate</span></Link>
          <ul className="lp-footer-links">
            <li><a href="#features">{t('landing_footer_features')}</a></li>
            <li><a href="#how">{t('landing_footer_how')}</a></li>
            <li><a href="https://athlix-trainpilot.vercel.app" target="_blank" rel="noopener noreferrer">TrainPilot</a></li>
            <li><a href="https://athlix-health.vercel.app" target="_blank" rel="noopener noreferrer">Athlix Health</a></li>
            <li><a href="/login">{t('landing_footer_registration')}</a></li>
          </ul>
        </div>
        <div className="lp-footer-bottom">
          <span className="lp-footer-copy">
            © 2026 Athlix TrainMate by <a href="https://programo.pl" target="_blank" rel="noopener noreferrer">Programo</a>
          </span>
          <span className="lp-footer-tagline">Athlete Social Platform</span>
        </div>
      </footer>
    </>
  );
}

function PillarCard({ num, title, subtitle, desc, tags }: {
  num: string; title: string; subtitle: string; desc: string; tags: string[];
}) {
  const { ref, visible } = useInView(0.1);
  return (
    <div
      ref={ref}
      className="lp-pillar-card"
      style={{ transition: `opacity 0.6s ${num === '01' ? '0' : num === '02' ? '120ms' : '240ms'} ease, transform 0.6s ease, background 0.3s`, opacity: visible ? 1 : 0, transform: visible ? 'none' : 'translateY(20px)' }}
    >
      <span className="lp-pillar-num">{num}</span>
      <h3 className="lp-pillar-title">{title}</h3>
      <p className="lp-pillar-subtitle">{subtitle}</p>
      <p className="lp-pillar-desc">{desc}</p>
      <div className="lp-pillar-tags">
        {tags.map((tag) => (
          <span key={tag} className="lp-pillar-tag">{tag}</span>
        ))}
      </div>
    </div>
  );
}

function FeatCard({ num, title, desc, delay }: { num: string; title: string; desc: string; delay: number }) {
  const { ref, visible } = useInView(0.1);
  return (
    <div
      ref={ref}
      className={`lp-feat-card${visible ? ' lp-visible' : ''}`}
      style={{ transition: `opacity 0.5s ${delay}ms ease, transform 0.5s ${delay}ms ease, background 0.3s, border-color 0.3s` }}
    >
      <span className="lp-feat-num">{num}</span>
      <h3 className="lp-feat-title">{title}</h3>
      <p className="lp-feat-desc">{desc}</p>
    </div>
  );
}
