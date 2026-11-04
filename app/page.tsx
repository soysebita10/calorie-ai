import Link from "next/link";
import { LogoMark, SiteFooter } from "@/components/SiteChrome";

export default function HomePage() {
  return (
    <>
      {/* Header */}
      <header className="site-header">
        <div className="container nav">
          <a href="#top" className="logo" aria-label="CalorieAI home">
            <LogoMark />
            CalorieAI
          </a>
          <nav aria-label="Primary">
            <ul className="nav-links">
              <li><a href="#features">Features</a></li>
              <li><a href="#how">How it works</a></li>
              <li className="nav-login"><Link href="/login">Log in</Link></li>
              <li><Link href="/signup" className="btn btn-small">Sign up</Link></li>
            </ul>
          </nav>
        </div>
      </header>

      <main id="top">
        {/* Hero */}
        <section className="hero">
          <div className="container hero-grid">
            <div className="hero-copy">
              <span className="eyebrow">AI-powered nutrition tracking</span>
              <h1>Track Your Calories <span className="accent">Smarter</span></h1>
              <p className="lead">
                CalorieAI turns your meals into nutrition data in seconds. Upload a photo of your plate
                or simply describe what you ate, and our AI estimates the calories, protein,
                carbohydrates, and fats — no barcode scanning or endless food searches required.
              </p>
              <div className="hero-actions">
                <Link href="/signup" className="btn">Get Started</Link>
                <a href="#features" className="btn btn-outline">See Features</a>
              </div>
              <p className="founder-line">Created by <strong>Sebastian Nieves</strong></p>
            </div>

            {/* Product mockup */}
            <div className="hero-visual" aria-hidden="true">
              <div className="mock-card">
                <div className="mock-photo">
                  <span className="mock-emoji">🥗</span>
                  <span className="mock-tag">AI detected: Grilled chicken salad</span>
                </div>
                <div className="mock-body">
                  <div className="mock-total">
                    <span className="mock-label">Estimated calories</span>
                    <span className="mock-kcal">485 <small>kcal</small></span>
                  </div>
                  <div className="macro">
                    <div className="macro-row"><span>Protein</span><span>38g</span></div>
                    <div className="bar"><span style={{ width: "76%" }} className="fill protein"></span></div>
                  </div>
                  <div className="macro">
                    <div className="macro-row"><span>Carbohydrates</span><span>22g</span></div>
                    <div className="bar"><span style={{ width: "44%" }} className="fill carbs"></span></div>
                  </div>
                  <div className="macro">
                    <div className="macro-row"><span>Fats</span><span>26g</span></div>
                    <div className="bar"><span style={{ width: "58%" }} className="fill fats"></span></div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* Features */}
        <section id="features" className="section">
          <div className="container">
            <div className="section-head">
              <span className="eyebrow">Features</span>
              <h2>Everything you need to eat with intention</h2>
              <p>CalorieAI removes the friction from food logging so you can focus on your goals.</p>
            </div>

            <div className="feature-grid">
              <article className="feature-card">
                <div className="feature-icon">
                  <svg viewBox="0 0 24 24" width="26" height="26" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M14.5 4h-5L7 7H4a2 2 0 0 0-2 2v9a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2V9a2 2 0 0 0-2-2h-3l-2.5-3z" /><circle cx="12" cy="13" r="3" /></svg>
                </div>
                <h3>AI Food Recognition</h3>
                <p>
                  Snap a photo of your meal or type a quick description like “two eggs and toast.”
                  Our AI identifies the foods and estimates portion sizes automatically.
                </p>
              </article>

              <article className="feature-card">
                <div className="feature-icon">
                  <svg viewBox="0 0 24 24" width="26" height="26" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M3 3v18h18" /><path d="m19 9-5 5-4-4-3 3" /></svg>
                </div>
                <h3>Calorie Tracking</h3>
                <p>
                  See calories, protein, carbohydrates, and fats for every meal, with daily and weekly
                  totals that make your eating patterns easy to understand.
                </p>
              </article>

              <article className="feature-card">
                <div className="feature-icon">
                  <svg viewBox="0 0 24 24" width="26" height="26" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10" /><circle cx="12" cy="12" r="6" /><circle cx="12" cy="12" r="2" /></svg>
                </div>
                <h3>Nutrition Goals</h3>
                <p>
                  Set personalized targets for weight loss, maintenance, or muscle gain, and track
                  your progress toward your daily calorie and macro goals.
                </p>
              </article>
            </div>
          </div>
        </section>

        {/* How it works */}
        <section id="how" className="section section-tint">
          <div className="container">
            <div className="section-head">
              <span className="eyebrow">How it works</span>
              <h2>From plate to nutrition facts in three steps</h2>
            </div>
            <ol className="steps">
              <li className="step">
                <span className="step-num">1</span>
                <h3>Capture</h3>
                <p>Upload a meal photo or describe what you ate in plain language.</p>
              </li>
              <li className="step">
                <span className="step-num">2</span>
                <h3>Analyze</h3>
                <p>CalorieAI recognizes the food and estimates calories and macros.</p>
              </li>
              <li className="step">
                <span className="step-num">3</span>
                <h3>Progress</h3>
                <p>Your log updates instantly so you can stay on track with your goals.</p>
              </li>
            </ol>
          </div>
        </section>

        {/* Coming Soon */}
        <section id="coming-soon" className="section">
          <div className="container">
            <div className="coming-soon">
              <span className="badge">Coming Soon</span>
              <h2>CalorieAI is launching soon</h2>
              <p>
                We&apos;re putting the finishing touches on the CalorieAI app. Soon you&apos;ll be able to log meals
                with a single photo, set nutrition goals, and watch your progress — all powered by AI.
              </p>
              <ul className="roadmap">
                <li>📸 Photo-based meal logging</li>
                <li>💬 Natural-language food descriptions</li>
                <li>🎯 Personalized calorie &amp; macro goals</li>
                <li>📊 Daily and weekly nutrition insights</li>
              </ul>
              <p className="stay-tuned">Stay tuned — launch details are on the way.</p>
            </div>
          </div>
        </section>
      </main>

      <SiteFooter />
    </>
  );
}
