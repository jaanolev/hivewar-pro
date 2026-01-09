import { useState, useEffect } from 'react';
import { getProStatus } from '../utils/pro';
import './AdminDashboard.css';

interface AnalyticsEvent {
  event: string;
  data?: Record<string, unknown>;
  timestamp: string;
}

interface ContactMessage {
  type: string;
  email: string;
  message: string;
  timestamp: string;
}

interface RestoreRequest {
  email: string;
  timestamp: string;
}

const ANALYTICS_KEY = 'hivewar_analytics';
const MESSAGES_KEY = 'hivewar_contact_messages';
const RESTORES_KEY = 'hivewar_restore_requests';
const ADMIN_PASSWORD = 'hivewar2026'; // Simple password protection

export default function AdminDashboard() {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [password, setPassword] = useState('');
  const [events, setEvents] = useState<AnalyticsEvent[]>([]);
  const [messages, setMessages] = useState<ContactMessage[]>([]);
  const [restores, setRestores] = useState<RestoreRequest[]>([]);
  const [activeTab, setActiveTab] = useState<'overview' | 'events' | 'messages' | 'links'>('overview');

  useEffect(() => {
    if (isAuthenticated) {
      loadData();
    }
  }, [isAuthenticated]);

  const loadData = () => {
    // Load events
    try {
      const storedEvents = localStorage.getItem(ANALYTICS_KEY);
      if (storedEvents) {
        setEvents(JSON.parse(storedEvents));
      }
    } catch (e) {
      console.error('Error loading events:', e);
    }

    // Load messages
    try {
      const storedMessages = localStorage.getItem(MESSAGES_KEY);
      if (storedMessages) {
        setMessages(JSON.parse(storedMessages));
      }
    } catch (e) {
      console.error('Error loading messages:', e);
    }

    // Load restore requests
    try {
      const storedRestores = localStorage.getItem(RESTORES_KEY);
      if (storedRestores) {
        setRestores(JSON.parse(storedRestores));
      }
    } catch (e) {
      console.error('Error loading restores:', e);
    }
  };

  const handleLogin = (e: React.FormEvent) => {
    e.preventDefault();
    if (password === ADMIN_PASSWORD) {
      setIsAuthenticated(true);
    } else {
      alert('Wrong password!');
    }
  };

  const getEventCounts = () => {
    const counts: Record<string, number> = {};
    events.forEach(event => {
      counts[event.event] = (counts[event.event] || 0) + 1;
    });
    return counts;
  };

  const getProInfo = () => {
    return getProStatus();
  };

  const formatDate = (timestamp: string) => {
    return new Date(timestamp).toLocaleString();
  };

  if (!isAuthenticated) {
    return (
      <div className="admin-login">
        <div className="login-card">
          <h1>🔐 Admin Dashboard</h1>
          <p>Enter admin password to continue</p>
          <form onSubmit={handleLogin}>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Password"
              autoFocus
            />
            <button type="submit">Login</button>
          </form>
          <a href="/" className="back-link">← Back to App</a>
        </div>
      </div>
    );
  }

  const eventCounts = getEventCounts();
  const proInfo = getProInfo();

  return (
    <div className="admin-dashboard">
      <header className="admin-header">
        <h1>🏰 HiveWar Pro Admin</h1>
        <a href="/" className="back-btn">← Back to App</a>
      </header>

      <nav className="admin-tabs">
        <button 
          className={activeTab === 'overview' ? 'active' : ''} 
          onClick={() => setActiveTab('overview')}
        >
          📊 Overview
        </button>
        <button 
          className={activeTab === 'events' ? 'active' : ''} 
          onClick={() => setActiveTab('events')}
        >
          📈 Events ({events.length})
        </button>
        <button 
          className={activeTab === 'messages' ? 'active' : ''} 
          onClick={() => setActiveTab('messages')}
        >
          💬 Messages ({messages.length})
        </button>
        <button 
          className={activeTab === 'links' ? 'active' : ''} 
          onClick={() => setActiveTab('links')}
        >
          🔗 External Links
        </button>
      </nav>

      <main className="admin-content">
        {activeTab === 'overview' && (
          <div className="overview-tab">
            <div className="stats-grid">
              <div className="stat-card">
                <div className="stat-icon">📊</div>
                <div className="stat-value">{events.length}</div>
                <div className="stat-label">Total Events</div>
              </div>
              <div className="stat-card">
                <div className="stat-icon">💬</div>
                <div className="stat-value">{messages.length}</div>
                <div className="stat-label">Messages</div>
              </div>
              <div className="stat-card">
                <div className="stat-icon">🔄</div>
                <div className="stat-value">{restores.length}</div>
                <div className="stat-label">Restore Requests</div>
              </div>
              <div className="stat-card">
                <div className="stat-icon">{proInfo.isPro ? '👑' : '⭐'}</div>
                <div className="stat-value">{proInfo.isPro ? 'PRO' : 'Free'}</div>
                <div className="stat-label">Your Status</div>
              </div>
            </div>

            <div className="event-summary">
              <h3>📈 Event Breakdown</h3>
              <div className="event-list">
                {Object.entries(eventCounts).map(([event, count]) => (
                  <div key={event} className="event-row">
                    <span className="event-name">{event}</span>
                    <span className="event-count">{count}</span>
                  </div>
                ))}
                {Object.keys(eventCounts).length === 0 && (
                  <p className="no-data">No events recorded yet</p>
                )}
              </div>
            </div>

            <div className="quick-actions">
              <h3>⚡ Quick Actions</h3>
              <button onClick={loadData}>🔄 Refresh Data</button>
              <button onClick={() => {
                localStorage.removeItem(ANALYTICS_KEY);
                setEvents([]);
              }}>🗑️ Clear Events</button>
            </div>
          </div>
        )}

        {activeTab === 'events' && (
          <div className="events-tab">
            <h3>📈 Recent Events</h3>
            <div className="events-table">
              {events.slice().reverse().slice(0, 100).map((event, i) => (
                <div key={i} className="event-item">
                  <div className="event-time">{formatDate(event.timestamp)}</div>
                  <div className="event-name">{event.event}</div>
                  {event.data && (
                    <div className="event-data">
                      {JSON.stringify(event.data)}
                    </div>
                  )}
                </div>
              ))}
              {events.length === 0 && (
                <p className="no-data">No events recorded yet. Use the app to generate events!</p>
              )}
            </div>
          </div>
        )}

        {activeTab === 'messages' && (
          <div className="messages-tab">
            <h3>💬 Contact Messages</h3>
            <div className="messages-list">
              {messages.slice().reverse().map((msg, i) => (
                <div key={i} className="message-card">
                  <div className="message-header">
                    <span className="message-type">{msg.type}</span>
                    <span className="message-time">{formatDate(msg.timestamp)}</span>
                  </div>
                  <div className="message-email">{msg.email || 'No email'}</div>
                  <div className="message-body">{msg.message}</div>
                </div>
              ))}
              {messages.length === 0 && (
                <p className="no-data">No messages yet. Users can send messages via the Help modal.</p>
              )}
            </div>

            <h3 style={{ marginTop: '30px' }}>🔄 Restore Requests</h3>
            <div className="restores-list">
              {restores.slice().reverse().map((req, i) => (
                <div key={i} className="restore-card">
                  <span className="restore-email">{req.email}</span>
                  <span className="restore-time">{formatDate(req.timestamp)}</span>
                </div>
              ))}
              {restores.length === 0 && (
                <p className="no-data">No restore requests yet.</p>
              )}
            </div>
          </div>
        )}

        {activeTab === 'links' && (
          <div className="links-tab">
            <h3>🔗 External Dashboards</h3>
            <div className="links-grid">
              <a href="https://analytics.google.com" target="_blank" rel="noopener noreferrer" className="link-card">
                <div className="link-icon">📊</div>
                <div className="link-name">Google Analytics</div>
                <div className="link-desc">View all user traffic and behavior</div>
              </a>
              <a href="https://www.facebook.com/adsmanager" target="_blank" rel="noopener noreferrer" className="link-card">
                <div className="link-icon">📘</div>
                <div className="link-name">Facebook Ads</div>
                <div className="link-desc">Manage Facebook/Instagram campaigns</div>
              </a>
              <a href="https://ads.reddit.com" target="_blank" rel="noopener noreferrer" className="link-card">
                <div className="link-icon">🔴</div>
                <div className="link-name">Reddit Ads</div>
                <div className="link-desc">Manage Reddit ad campaigns</div>
              </a>
              <a href="https://dashboard.stripe.com" target="_blank" rel="noopener noreferrer" className="link-card">
                <div className="link-icon">💳</div>
                <div className="link-name">Stripe Dashboard</div>
                <div className="link-desc">View payments and subscriptions</div>
              </a>
              <a href="https://vercel.com/dashboard" target="_blank" rel="noopener noreferrer" className="link-card">
                <div className="link-icon">▲</div>
                <div className="link-name">Vercel Dashboard</div>
                <div className="link-desc">Deployments and analytics</div>
              </a>
              <a href="https://github.com/jaanolev/hivewar-pro" target="_blank" rel="noopener noreferrer" className="link-card">
                <div className="link-icon">🐙</div>
                <div className="link-name">GitHub Repo</div>
                <div className="link-desc">Source code and issues</div>
              </a>
            </div>

            <div className="console-tips">
              <h3>🖥️ Console Commands</h3>
              <p>Open browser console (F12) and run:</p>
              <code>HiveWarAdmin.report()</code>
              <code>HiveWarAdmin.messages()</code>
              <code>HiveWarAdmin.restores()</code>
              <code>HiveWarAdmin.clearData()</code>
            </div>
          </div>
        )}
      </main>

      <footer className="admin-footer">
        <p>HiveWar Pro Admin Dashboard • Data is stored locally in your browser</p>
        <p>For cross-user analytics, check Google Analytics</p>
      </footer>
    </div>
  );
}

