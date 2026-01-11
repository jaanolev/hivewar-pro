import { useState } from 'react';
import './LandingPage.css';

export default function LandingPage() {
  const [openFaq, setOpenFaq] = useState<number | null>(null);

  const features = [
    {
      icon: '🗺️',
      title: 'Visual Hive Planning',
      description: 'Drag and drop buildings on a 50×50 grid. See your entire hive layout at a glance.'
    },
    {
      icon: '👥',
      title: 'Player Assignment',
      description: 'Assign alliance members to specific positions. Add notes for tactical coordination.'
    },
    {
      icon: '📋',
      title: 'Ready Templates',
      description: 'Start with proven formations: Diamond Defense, Turtle Shell, Capitol Assault, and more.'
    },
    {
      icon: '📤',
      title: 'Export & Share',
      description: 'Export as PNG images, CSV coordinates, or shareable links. Perfect for Discord.'
    },
    {
      icon: '💾',
      title: 'Auto-Save',
      description: 'Your plans save automatically. Never lose your work. Access from any device.'
    },
    {
      icon: '📱',
      title: 'Mobile Friendly',
      description: 'Plan on desktop or mobile. Touch-optimized for tablets and phones.'
    }
  ];

  const howItWorks = [
    {
      step: 1,
      title: 'Choose a Template or Start Fresh',
      description: 'Pick from 6 proven formations or create your own layout from scratch.',
      tip: 'Pro tip: Diamond Defense is great for beginners!'
    },
    {
      step: 2,
      title: 'Place Buildings on the Grid',
      description: 'Select a building type from the palette, then tap anywhere on the grid to place it.',
      tip: 'Buildings snap to grid for perfect alignment.'
    },
    {
      step: 3,
      title: 'Assign Players to Positions',
      description: 'Click any building to assign an alliance member and add tactical notes.',
      tip: 'Use notes for rally points, defense zones, etc.'
    },
    {
      step: 4,
      title: 'Export and Share',
      description: 'Export as PNG image for Discord, CSV for spreadsheets, or generate a shareable link.',
      tip: 'Share with your R4/R5 for approval!'
    }
  ];

  const faqs = [
    {
      q: 'What is HiveWar Pro?',
      a: 'HiveWar Pro is a visual hive planning tool for Last War: Survival mobile game. It helps alliance leaders plan and coordinate hive layouts with their members.'
    },
    {
      q: 'Is HiveWar Pro free to use?',
      a: 'Yes! The basic features are free with 3 exports per month. Pro subscribers get unlimited exports, all templates, CSV import, and priority support for €4.99/month.'
    },
    {
      q: 'How do I share my hive plan with my alliance?',
      a: 'You can export your plan as a PNG image (perfect for Discord), generate a shareable link, or export as CSV with coordinates for spreadsheets.'
    },
    {
      q: 'Does it work on mobile?',
      a: 'Absolutely! HiveWar Pro is fully responsive and works great on phones and tablets. Touch gestures are supported for panning and zooming.'
    },
    {
      q: 'Can I save multiple hive plans?',
      a: 'Yes! You can create and save multiple plans. Great for different scenarios like defense formations, rally setups, or seasonal events.'
    },
    {
      q: 'What are coordinates in the export?',
      a: 'The CSV export includes X,Y grid coordinates for each building. This matches the in-game coordinate system for precise placement instructions.'
    },
    {
      q: 'How do templates work?',
      a: 'Templates are pre-made formations created by experienced players. Click a template to instantly load a complete hive layout, then customize it for your alliance.'
    },
    {
      q: 'Is my data saved?',
      a: 'Your plans are saved locally in your browser and persist between sessions. We recommend exporting important plans as backup.'
    }
  ];

  return (
    <div className="landing-page">
      {/* Navigation */}
      <nav className="landing-nav">
        <div className="nav-logo">
          <span className="logo-icon">🏰</span>
          <span className="logo-text">HiveWar Pro</span>
        </div>
        <div className="nav-links">
          <a href="#features">Features</a>
          <a href="#how-it-works">How It Works</a>
          <a href="#pricing">Pricing</a>
          <a href="#faq">FAQ</a>
          <a href="#/" className="nav-cta">Launch App →</a>
        </div>
        <button className="mobile-menu-btn" onClick={() => {
          document.querySelector('.nav-links')?.classList.toggle('open');
        }}>☰</button>
      </nav>

      {/* Hero Section */}
      <section className="hero-section">
        <div className="hero-content">
          <div className="hero-badge">🎮 For Last War: Survival Players</div>
          <h1>Plan Your Perfect Hive.<br/>Dominate the Battlefield.</h1>
          <p className="hero-subtitle">
            The ultimate visual hive planner for alliance leaders. 
            Coordinate your team, plan formations, and crush your enemies.
          </p>
          <div className="hero-buttons">
            <a href="#/" className="btn-primary">
              <span>Start Planning Free</span>
              <span className="btn-arrow">→</span>
            </a>
            <a href="#how-it-works" className="btn-secondary">
              See How It Works
            </a>
          </div>
          <div className="hero-stats">
            <div className="stat">
              <span className="stat-number">50×50</span>
              <span className="stat-label">Grid Size</span>
            </div>
            <div className="stat">
              <span className="stat-number">6+</span>
              <span className="stat-label">Templates</span>
            </div>
            <div className="stat">
              <span className="stat-number">100%</span>
              <span className="stat-label">Free to Start</span>
            </div>
          </div>
        </div>
        <div className="hero-visual">
          <div className="hero-mockup">
            <div className="mockup-grid">
              {/* Animated grid visualization */}
              <div className="grid-demo">
                <div className="demo-building hq" style={{ left: '45%', top: '45%' }}>👑</div>
                <div className="demo-building r4" style={{ left: '30%', top: '30%' }}>⭐</div>
                <div className="demo-building r4" style={{ left: '60%', top: '30%' }}>⭐</div>
                <div className="demo-building r4" style={{ left: '30%', top: '60%' }}>⭐</div>
                <div className="demo-building r4" style={{ left: '60%', top: '60%' }}>⭐</div>
                <div className="demo-building member" style={{ left: '20%', top: '45%' }}>🏰</div>
                <div className="demo-building member" style={{ left: '70%', top: '45%' }}>🏰</div>
                <div className="demo-building member" style={{ left: '45%', top: '20%' }}>🏰</div>
                <div className="demo-building member" style={{ left: '45%', top: '70%' }}>🏰</div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section id="features" className="features-section">
        <div className="section-header">
          <h2>Everything You Need to Plan the Perfect Hive</h2>
          <p>Powerful tools designed specifically for Last War alliance coordination</p>
        </div>
        <div className="features-grid">
          {features.map((feature, i) => (
            <div key={i} className="feature-card">
              <div className="feature-icon">{feature.icon}</div>
              <h3>{feature.title}</h3>
              <p>{feature.description}</p>
            </div>
          ))}
        </div>
      </section>

      {/* How It Works Section */}
      <section id="how-it-works" className="how-section">
        <div className="section-header">
          <h2>How to Plan Your Hive in 4 Easy Steps</h2>
          <p>From blank canvas to battle-ready formation in minutes</p>
        </div>
        <div className="steps-container">
          {howItWorks.map((step, i) => (
            <div key={i} className="step-card">
              <div className="step-number">{step.step}</div>
              <div className="step-content">
                <h3>{step.title}</h3>
                <p>{step.description}</p>
                <div className="step-tip">💡 {step.tip}</div>
              </div>
            </div>
          ))}
        </div>
        <div className="how-cta">
          <a href="#/" className="btn-primary">
            Try It Now - It's Free!
          </a>
        </div>
      </section>

      {/* Use Cases Section */}
      <section className="use-cases-section">
        <div className="section-header">
          <h2>Perfect For Every Alliance Scenario</h2>
        </div>
        <div className="use-cases-grid">
          <div className="use-case">
            <div className="use-case-icon">🛡️</div>
            <h3>Defense Planning</h3>
            <p>Create compact defensive formations to protect your Marshal during enemy rallies.</p>
          </div>
          <div className="use-case">
            <div className="use-case-icon">⚔️</div>
            <h3>Rally Coordination</h3>
            <p>Plan attack formations and assign rally leaders to specific positions.</p>
          </div>
          <div className="use-case">
            <div className="use-case-icon">🏆</div>
            <h3>Capitol Warfare</h3>
            <p>Coordinate large-scale capitol attacks with precise positioning.</p>
          </div>
          <div className="use-case">
            <div className="use-case-icon">📅</div>
            <h3>Event Preparation</h3>
            <p>Pre-plan formations for Kill Events, Treasure Wars, and seasonal content.</p>
          </div>
        </div>
      </section>

      {/* Pricing Section */}
      <section id="pricing" className="pricing-section">
        <div className="section-header">
          <h2>Simple, Transparent Pricing</h2>
          <p>Start free, upgrade when you need more</p>
        </div>
        <div className="pricing-cards">
          <div className="pricing-card free">
            <div className="pricing-header">
              <h3>Free</h3>
              <div className="price">€0</div>
              <div className="price-period">forever</div>
            </div>
            <ul className="pricing-features">
              <li>✓ Full grid editor</li>
              <li>✓ 3 basic templates</li>
              <li>✓ 3 exports per month</li>
              <li>✓ Save plans locally</li>
              <li>✓ Shareable links</li>
            </ul>
            <a href="#/" className="btn-secondary">Get Started</a>
          </div>
          <div className="pricing-card pro">
            <div className="popular-badge">Most Popular</div>
            <div className="pricing-header">
              <h3>Pro</h3>
              <div className="price">€4.99</div>
              <div className="price-period">/month</div>
            </div>
            <ul className="pricing-features">
              <li>✓ <strong>Unlimited</strong> exports</li>
              <li>✓ <strong>All</strong> templates unlocked</li>
              <li>✓ CSV import for player lists</li>
              <li>✓ Priority email support</li>
              <li>✓ Early access to new features</li>
              <li className="coming">🔜 Real-time collaboration</li>
              <li className="coming">🔜 AI hive optimizer</li>
            </ul>
            <a href="#/" className="btn-primary">Start Free Trial</a>
          </div>
        </div>
      </section>

      {/* FAQ Section */}
      <section id="faq" className="faq-section">
        <div className="section-header">
          <h2>Frequently Asked Questions</h2>
          <p>Everything you need to know about HiveWar Pro</p>
        </div>
        <div className="faq-list">
          {faqs.map((faq, i) => (
            <div 
              key={i} 
              className={`faq-item ${openFaq === i ? 'open' : ''}`}
              onClick={() => setOpenFaq(openFaq === i ? null : i)}
            >
              <div className="faq-question">
                <span>{faq.q}</span>
                <span className="faq-toggle">{openFaq === i ? '−' : '+'}</span>
              </div>
              {openFaq === i && (
                <div className="faq-answer">{faq.a}</div>
              )}
            </div>
          ))}
        </div>
      </section>

      {/* Final CTA */}
      <section className="final-cta">
        <h2>Ready to Dominate?</h2>
        <p>Join thousands of alliance leaders using HiveWar Pro to plan victory.</p>
        <a href="#/" className="btn-primary btn-large">
          Launch HiveWar Pro →
        </a>
      </section>

      {/* Footer */}
      <footer className="landing-footer">
        <div className="footer-content">
          <div className="footer-brand">
            <span className="logo-icon">🏰</span>
            <span className="logo-text">HiveWar Pro</span>
            <p>The ultimate hive planning tool for Last War: Survival</p>
          </div>
          <div className="footer-links">
            <div className="footer-column">
              <h4>Product</h4>
              <a href="#/">Launch App</a>
              <a href="#features">Features</a>
              <a href="#pricing">Pricing</a>
            </div>
            <div className="footer-column">
              <h4>Resources</h4>
              <a href="#how-it-works">How It Works</a>
              <a href="#faq">FAQ</a>
              <a href="#/">Help Center</a>
            </div>
            <div className="footer-column">
              <h4>Connect</h4>
              <a href="https://discord.gg/lastwar" target="_blank" rel="noopener noreferrer">Discord</a>
              <a href="https://reddit.com/r/lastwar" target="_blank" rel="noopener noreferrer">Reddit</a>
              <a href="mailto:support@hivewar.pro">Contact</a>
            </div>
          </div>
        </div>
        <div className="footer-bottom">
          <p>© 2026 HiveWar Pro. Not affiliated with Last War: Survival.</p>
        </div>
      </footer>
    </div>
  );
}
