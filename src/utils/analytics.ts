// Lightweight Analytics for MVP
// Tracks events locally and can export for analysis

const ANALYTICS_KEY = 'hivewar_analytics';
const SESSION_KEY = 'hivewar_session';

export interface AnalyticsEvent {
  event: string;
  timestamp: string;
  sessionId: string;
  data?: Record<string, any>;
}

export interface AnalyticsData {
  events: AnalyticsEvent[];
  firstVisit: string;
  totalSessions: number;
}

// Generate unique session ID
function getSessionId(): string {
  let sessionId = sessionStorage.getItem(SESSION_KEY);
  if (!sessionId) {
    sessionId = `s_${Date.now()}_${Math.random().toString(36).substring(2, 8)}`;
    sessionStorage.setItem(SESSION_KEY, sessionId);
  }
  return sessionId;
}

// Get or initialize analytics data
function getAnalyticsData(): AnalyticsData {
  try {
    const data = localStorage.getItem(ANALYTICS_KEY);
    if (data) {
      return JSON.parse(data);
    }
  } catch (e) {
    console.error('Error reading analytics:', e);
  }
  return {
    events: [],
    firstVisit: new Date().toISOString(),
    totalSessions: 0
  };
}

// Save analytics data
function saveAnalyticsData(data: AnalyticsData): void {
  try {
    // Keep only last 500 events to avoid localStorage bloat
    if (data.events.length > 500) {
      data.events = data.events.slice(-500);
    }
    localStorage.setItem(ANALYTICS_KEY, JSON.stringify(data));
  } catch (e) {
    console.error('Error saving analytics:', e);
  }
}

// Track an event
export function trackEvent(event: string, data?: Record<string, any>): void {
  const analyticsData = getAnalyticsData();
  
  analyticsData.events.push({
    event,
    timestamp: new Date().toISOString(),
    sessionId: getSessionId(),
    data
  });
  
  // Also send to Google Analytics 4 if available
  if (typeof window !== 'undefined' && (window as any).gtag) {
    (window as any).gtag('event', event, {
      ...data,
      session_id: getSessionId()
    });
  }
  
  saveAnalyticsData(analyticsData);
  
  // Also log to console in dev
  if (import.meta.env.DEV) {
    console.log('📊 Event:', event, data);
  }
}

// Track session start
export function trackSessionStart(): void {
  const data = getAnalyticsData();
  const sessionId = getSessionId();
  
  // Check if this is a new session
  const lastEvent = data.events[data.events.length - 1];
  if (!lastEvent || lastEvent.sessionId !== sessionId) {
    data.totalSessions += 1;
    saveAnalyticsData(data);
    trackEvent('session_start', { sessionNumber: data.totalSessions });
  }
}

// Common events
export const Events = {
  // Session
  SESSION_START: 'session_start',
  
  // Building actions
  BUILDING_PLACED: 'building_placed',
  BUILDING_MOVED: 'building_moved',
  BUILDING_DELETED: 'building_deleted',
  BUILDING_ROTATED: 'building_rotated',
  
  // Template actions
  TEMPLATE_VIEWED: 'template_viewed',
  TEMPLATE_APPLIED: 'template_applied',
  
  // Export actions
  EXPORT_PNG: 'export_png',
  EXPORT_JSON: 'export_json',
  EXPORT_CSV: 'export_csv',
  SHARE_LINK_COPIED: 'share_link_copied',
  
  // Plan actions
  PLAN_CREATED: 'plan_created',
  PLAN_SWITCHED: 'plan_switched',
  PLAN_DELETED: 'plan_deleted',
  
  // Monetization
  UPGRADE_MODAL_OPENED: 'upgrade_modal_opened',
  UPGRADE_CLICKED: 'upgrade_clicked',
  PRO_CODE_ENTERED: 'pro_code_entered',
  PRO_ACTIVATED: 'pro_activated',
  
  // Engagement
  HELP_OPENED: 'help_opened',
  EXPORT_LIMIT_HIT: 'export_limit_hit',
};

// Generate daily report
export function generateDailyReport(): string {
  const data = getAnalyticsData();
  const today = new Date().toISOString().split('T')[0];
  
  // Filter today's events
  const todayEvents = data.events.filter(e => e.timestamp.startsWith(today));
  
  // Count events by type
  const eventCounts: Record<string, number> = {};
  todayEvents.forEach(e => {
    eventCounts[e.event] = (eventCounts[e.event] || 0) + 1;
  });
  
  // Unique sessions today
  const uniqueSessions = new Set(todayEvents.map(e => e.sessionId)).size;
  
  // Build report
  const report = `
📊 HiveWar Pro Daily Report - ${today}
========================================

📈 OVERVIEW
-----------
Total Sessions (all time): ${data.totalSessions}
First Visit: ${data.firstVisit.split('T')[0]}
Sessions Today: ${uniqueSessions}
Events Today: ${todayEvents.length}

📋 EVENT BREAKDOWN
------------------
${Object.entries(eventCounts)
  .sort((a, b) => b[1] - a[1])
  .map(([event, count]) => `${event}: ${count}`)
  .join('\n') || 'No events today'}

💰 MONETIZATION
---------------
Upgrade Modal Opens: ${eventCounts[Events.UPGRADE_MODAL_OPENED] || 0}
Upgrade Clicks: ${eventCounts[Events.UPGRADE_CLICKED] || 0}
Pro Codes Entered: ${eventCounts[Events.PRO_CODE_ENTERED] || 0}
Pro Activations: ${eventCounts[Events.PRO_ACTIVATED] || 0}
Export Limit Hits: ${eventCounts[Events.EXPORT_LIMIT_HIT] || 0}

🏗️ USAGE
---------
Buildings Placed: ${eventCounts[Events.BUILDING_PLACED] || 0}
Templates Applied: ${eventCounts[Events.TEMPLATE_APPLIED] || 0}
PNG Exports: ${eventCounts[Events.EXPORT_PNG] || 0}
CSV Exports: ${eventCounts[Events.EXPORT_CSV] || 0}
Share Links Copied: ${eventCounts[Events.SHARE_LINK_COPIED] || 0}

========================================
Generated: ${new Date().toISOString()}
`;
  
  return report;
}

// Export all analytics as JSON (for external analysis)
export function exportAnalyticsJSON(): string {
  const data = getAnalyticsData();
  return JSON.stringify(data, null, 2);
}

// Get summary stats
export function getAnalyticsSummary(): {
  totalSessions: number;
  totalEvents: number;
  todayEvents: number;
  todaySessions: number;
  conversionRate: number;
} {
  const data = getAnalyticsData();
  const today = new Date().toISOString().split('T')[0];
  const todayEvents = data.events.filter(e => e.timestamp.startsWith(today));
  
  const upgradeOpens = data.events.filter(e => e.event === Events.UPGRADE_MODAL_OPENED).length;
  const upgrades = data.events.filter(e => e.event === Events.PRO_ACTIVATED).length;
  
  return {
    totalSessions: data.totalSessions,
    totalEvents: data.events.length,
    todayEvents: todayEvents.length,
    todaySessions: new Set(todayEvents.map(e => e.sessionId)).size,
    conversionRate: upgradeOpens > 0 ? (upgrades / upgradeOpens) * 100 : 0
  };
}

// Expose analytics to window for admin access via console
if (typeof window !== 'undefined') {
  (window as any).HiveWarAdmin = {
    report: () => console.log(generateDailyReport()),
    summary: () => console.table(getAnalyticsSummary()),
    exportJSON: () => {
      const json = exportAnalyticsJSON();
      console.log(json);
      return json;
    },
    download: () => {
      const json = exportAnalyticsJSON();
      const blob = new Blob([json], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `hivewar_analytics_${new Date().toISOString().split('T')[0]}.json`;
      a.click();
      URL.revokeObjectURL(url);
      console.log('📊 Analytics downloaded!');
    },
    clear: () => {
      if (confirm('Clear all analytics data?')) {
        localStorage.removeItem(ANALYTICS_KEY);
        console.log('🗑️ Analytics cleared');
      }
    },
    help: () => {
      console.log(`
📊 HiveWar Admin Console
========================

Commands:
  HiveWarAdmin.report()    - Show daily report
  HiveWarAdmin.summary()   - Show summary stats
  HiveWarAdmin.exportJSON() - Export all data as JSON
  HiveWarAdmin.download()  - Download analytics file
  HiveWarAdmin.clear()     - Clear all analytics data
  HiveWarAdmin.help()      - Show this help

Example:
  HiveWarAdmin.report()
      `);
    }
  };
}

