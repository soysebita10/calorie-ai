import Link from "next/link";
import { LogoMark, SiteFooter } from "@/components/SiteChrome";
import { FREE_AI_DAILY, PREMIUM_AI_DAILY, PREMIUM_PRICE_LABEL } from "@/lib/plans";

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
              <li><a href="#pricing">Pricing</a></li>
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
              <span className="eyebrow">AI-powered calorie tracking</span>
              <h1>Track Your Calories <span className="accent">Smarter</span></h1>
              <p className="lead">
                CalorieAI is a working calorie tracker powered by AI. Upload a food photo or describe
                your meal, and get an estimate of its calories, protein, carbohydrates, and fat in
                seconds. Then save it and watch your daily totals add up.
              </p>
              <div className="hero-actions">
                <Link href="/signup" className="btn">Get Started</Link>
                <a href="#how" className="btn btn-outline">See How It Works</a>
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
                    <div className="macro-row"><span>Fat</span><span>26g</span></div>
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
              <p>Log a meal in seconds, keep the numbers you trust, and see where your day stands.</p>
            </div>

            <div className="feature-grid">
              <article className="feature-card">
                <div className="feature-icon">
                  <svg viewBox="0 0 24 24" width="26" height="26" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M14.5 4h-5L7 7H4a2 2 0 0 0-2 2v9a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2V9a2 2 0 0 0-2-2h-3l-2.5-3z" /><circle cx="12" cy="13" r="3" /></svg>
                </div>
                <h3>AI Meal Analysis</h3>
                <p>
                  Upload a food photo or type a description like “two eggs and toast.” The AI identifies
                  each food and estimates its portion, calories, protein, carbohydrates, and fat.
                </p>
              </article>

              <article className="feature-card">
                <div className="feature-icon">
                  <svg viewBox="0 0 24 24" width="26" height="26" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M3 3v18h18" /><path d="m19 9-5 5-4-4-3 3" /></svg>
                </div>
                <h3>Daily Calorie Tracking</h3>
                <p>
                  Edit any estimate, then save the meal to your private account. Your daily calories
                  and macros update automatically, and your history is always there to review.
                </p>
              </article>

              <article className="feature-card">
                <div className="feature-icon">
                  <svg viewBox="0 0 24 24" width="26" height="26" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10" /><circle cx="12" cy="12" r="6" /><circle cx="12" cy="12" r="2" /></svg>
                </div>
                <h3>Nutrition Goals</h3>
                <p>
                  Set a daily calorie goal and see your progress toward it as you log meals, alongside
                  running totals for protein, carbohydrates, and fat.
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
                <p>Upload a meal photo, describe what you ate in plain language, or do both.</p>
              </li>
              <li className="step">
                <span className="step-num">2</span>
                <h3>Review</h3>
                <p>Check the AI&apos;s estimated portions and nutrition, and change anything that looks off.</p>
              </li>
              <li className="step">
                <span className="step-num">3</span>
                <h3>Track</h3>
                <p>Save the meal, and your daily totals and goal progress update right away.</p>
              </li>
            </ol>
          </div>
        </section>

        {/* Pricing */}
        <section id="pricing" className="section">
          <div className="container">
            <div className="section-head">
              <h2>Simple pricing</h2>
              <p>Start for free, and upgrade when you log more meals with AI.</p>
            </div>
            <div className="pricing-grid">
              <div className="feature-card price-card">
                <h3>Free</h3>
                <p className="price">$0</p>
                <ul>
                  <li>{FREE_AI_DAILY} AI meal analyses a day</li>
                  <li>Meal history and daily totals</li>
                  <li>Daily calorie goal</li>
                </ul>
                <Link href="/signup" className="btn btn-outline">Sign up free</Link>
              </div>
              <div className="feature-card price-card price-card-featured">
                <h3>Premium</h3>
                <p className="price">{PREMIUM_PRICE_LABEL}<span> / month</span></p>
                <ul>
                  <li>{PREMIUM_AI_DAILY} AI meal analyses a day</li>
                  <li>Everything in Free</li>
                  <li>Cancel anytime</li>
                </ul>
                <Link href="/signup" className="btn">Get Premium</Link>
              </div>
            </div>
          </div>
        </section>

        {/* Call to action */}
        <section id="get-started" className="section">
          <div className="container">
            <div className="cta-panel">
              <span className="badge">Available now</span>
              <h2>Start tracking your meals today</h2>
              <p>
                Create an account and log your first meal in under a minute, with nothing to install.
              </p>
              <ul className="roadmap">
                <li>📸 Estimate meals from food photos</li>
                <li>💬 Describe meals in your own words</li>
                <li>🍽️ Save meals and review your history</li>
                <li>🎯 Track daily calories against your goal</li>
              </ul>
              <Link href="/signup" className="btn btn-light">Create Your Account</Link>
              <p className="cta-note">
                Nutrition values are AI estimates and can vary, so review them before saving. CalorieAI
                is not medical advice.
              </p>
            </div>
          </div>
        </section>
      </main>

      <SiteFooter />
    </>
  );
}
