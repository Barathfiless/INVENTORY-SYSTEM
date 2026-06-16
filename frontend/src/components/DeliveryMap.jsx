import React, { useState, useEffect, useRef } from 'react';
import { 
  Truck, 
  MapPin, 
  Package, 
  Compass, 
  Play, 
  RotateCcw, 
  Phone, 
  MessageSquare, 
  UserCheck, 
  Award,
  CheckCircle2,
  AlertTriangle
} from 'lucide-react';

export default function DeliveryMap({ order }) {
  const status = order?.status || 'pending';
  const shippingAddress = order?.shippingAddress || {};
  const destinationCity = shippingAddress.city || 'Your Location';

  // State for simulated progress (0 to 100)
  const [progress, setProgress] = useState(0);
  const [isPlaying, setIsPlaying] = useState(false);
  const [simSpeed, setSimSpeed] = useState(1);
  const [liveLogs, setLiveLogs] = useState([]);
  
  // Track animation frame or timer
  const timerRef = useRef(null);

  // Bezier curve points representing route from Fulfillmen Center to Client
  const startPoint = { x: 70, y: 220 };     // StockSync Fulfillment Center
  const controlPoint = { x: 250, y: 60 };   // Mid Transit Gateway
  const endPoint = { x: 430, y: 180 };      // Customer Destination

  // Compute position & rotation on Quadratic Bezier Curve
  const getBezierPointAndAngle = (t) => {
    const tVal = Math.max(0, Math.min(1, t));
    const mt = 1 - tVal;
    const x = mt * mt * startPoint.x + 2 * mt * tVal * controlPoint.x + tVal * tVal * endPoint.x;
    const y = mt * mt * startPoint.y + 2 * mt * tVal * controlPoint.y + tVal * tVal * endPoint.y;
    
    // Tangent vector for rotation
    const dx = 2 * mt * (controlPoint.x - startPoint.x) + 2 * tVal * (endPoint.x - controlPoint.x);
    const dy = 2 * mt * (controlPoint.y - startPoint.y) + 2 * tVal * (endPoint.y - controlPoint.y);
    const angle = Math.atan2(dy, dx) * (180 / Math.PI);
    
    return { x, y, angle };
  };

  // Initialize progress based on backend Order status
  useEffect(() => {
    if (status === 'delivered') {
      setProgress(100);
      setIsPlaying(false);
    } else if (status === 'pending') {
      setProgress(5);
      setIsPlaying(false);
    } else if (status === 'processing') {
      setProgress(25);
      setIsPlaying(false);
    } else if (status === 'shipped') {
      setProgress(55);
      setIsPlaying(false);
    } else if (status === 'cancelled') {
      setProgress(0);
      setIsPlaying(false);
    }
  }, [status]);

  // Simulation timer logic
  useEffect(() => {
    if (isPlaying && status !== 'cancelled') {
      timerRef.current = setInterval(() => {
        setProgress((prev) => {
          if (prev >= 100) {
            setIsPlaying(false);
            return 100;
          }
          return prev + 1.2 * simSpeed;
        });
      }, 150);
    } else {
      clearInterval(timerRef.current);
    }

    return () => clearInterval(timerRef.current);
  }, [isPlaying, simSpeed, status]);

  // Generate logs based on progress and timestamps
  useEffect(() => {
    const baseDate = new Date(order?.createdAt || Date.now());
    const formatLogTime = (offsetHours) => {
      const d = new Date(baseDate.getTime() + offsetHours * 60 * 60 * 1000);
      return d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) + ' | ' + d.toLocaleDateString([], { month: 'short', day: 'numeric' });
    };

    const logs = [];

    if (status === 'cancelled') {
      logs.push({
        title: 'Order Cancelled 🚫',
        desc: 'Transit pipeline aborted. Stock units replenished to catalog.',
        time: new Date(order.updatedAt || Date.now()).toLocaleTimeString(),
        active: true,
        isDanger: true,
      });
      setLiveLogs(logs);
      return;
    }

    // Baseline log
    logs.push({
      title: 'Order Registered',
      desc: 'StockSync systems received catalog mappings.',
      time: formatLogTime(0),
      active: true,
    });

    if (progress >= 10 || status === 'processing' || status === 'shipped' || status === 'delivered') {
      logs.push({
        title: 'Yet to Dispatch ✅',
        desc: 'Inventory checks cleared. Awaiting packaging team dispatch.',
        time: formatLogTime(0.5),
        active: true,
      });
    }

    if (progress >= 25 || status === 'processing' || status === 'shipped' || status === 'delivered') {
      logs.push({
        title: 'Dispatched from Hub 📦',
        desc: 'Left fulfillment hub scan line. Assigned transit courier.',
        time: formatLogTime(1.2),
        active: progress >= 25 || status === 'shipped' || status === 'delivered',
      });
    }

    if (progress >= 55 || status === 'shipped' || status === 'delivered') {
      logs.push({
        title: 'Shipped & In Transit 🚚',
        desc: `Arrived at gateway facility in vicinity of ${destinationCity}.`,
        time: formatLogTime(4.5),
        active: progress >= 55 || status === 'delivered',
      });
    }

    if (progress >= 85 || status === 'delivered') {
      logs.push({
        title: 'Out for Delivery 🛵',
        desc: 'Delivery partner Rohan Kumar has collected package for delivery.',
        time: formatLogTime(7.8),
        active: progress >= 85 || status === 'delivered',
      });
    }

    if (progress === 100 || status === 'delivered') {
      logs.push({
        title: 'Delivered Successfully 🎉',
        desc: `Handed over securely to destination. Verification code matched.`,
        time: order?.deliveredAt ? new Date(order.deliveredAt).toLocaleString() : formatLogTime(8.2),
        active: true,
        isSuccess: true,
      });
    }

    setLiveLogs(logs.reverse());
  }, [progress, status, order]);

  const { x, y, angle } = getBezierPointAndAngle(progress / 100);

  // Milestone triggers
  const milestones = [
    { label: 'Yet to Dispatch', reached: progress >= 5, value: 5 },
    { label: 'Dispatched', reached: progress >= 25, value: 25 },
    { label: 'Shipped', reached: progress >= 55, value: 55 },
    { label: 'Out for Delivery', reached: progress >= 85, value: 85 },
    { label: 'Delivered', reached: progress === 100, value: 100 },
  ];

  // Delivery Executive Card messaging
  let executiveMessage = 'Assigning delivery partner...';
  let isRohanActive = false;

  if (status === 'cancelled') {
    executiveMessage = 'Delivery pipeline aborted.';
  } else if (progress === 100) {
    executiveMessage = 'Rohan wishes you a great day ahead! ⭐';
    isRohanActive = false;
  } else if (progress >= 85) {
    executiveMessage = 'Rohan has picked up your package and is approaching your address! 🛵';
    isRohanActive = true;
  } else if (progress >= 55) {
    executiveMessage = 'Rohan has verified details and will pick up shortly from local sorting hub.';
    isRohanActive = true;
  } else if (progress >= 25) {
    executiveMessage = 'Fulfillment scans complete. Delivery partner allocated.';
    isRohanActive = true;
  } else {
    executiveMessage = 'Preparing order items. Rohan Kumar is waiting at the hub.';
    isRohanActive = true;
  }

  const triggerCall = () => {
    alert('Simulating call to partner Rohan Kumar (9845X XXXXX). Call connected! 📞');
  };

  const triggerChat = () => {
    alert('Simulating chat connection. Rohan: "I am arriving at the warehouse gate now to pick up your order." 💬');
  };

  return (
    <div style={styles.trackerCard}>
      
      {/* Header Info */}
      <div style={styles.header}>
        <div style={styles.titleArea}>
          <div style={styles.liveIndicator}>
            <span style={{ ...styles.liveDot, backgroundColor: status === 'cancelled' ? '#ef4444' : '#10b981' }} />
            <span style={{ ...styles.livePing, borderColor: status === 'cancelled' ? '#ef4444' : '#10b981' }} />
          </div>
          <div>
            <h3 style={styles.title}>Real-time Route & Delivery Tracker</h3>
            <p style={styles.subtitle}>Fulfillment Center ➔ {destinationCity}</p>
          </div>
        </div>

        {status !== 'cancelled' && status !== 'delivered' && (
          <div style={styles.simControls}>
            <button 
              type="button"
              onClick={() => setIsPlaying(!isPlaying)} 
              style={{ ...styles.simButton, backgroundColor: isPlaying ? '#ef4444' : 'var(--brand-primary)' }}
            >
              <Play size={14} style={{ marginRight: 4 }} />
              {isPlaying ? 'Pause Tracker' : 'Start Swiggy Live Demo'}
            </button>
            {isPlaying && (
              <button 
                type="button"
                onClick={() => setSimSpeed(prev => prev === 1 ? 5 : 1)} 
                style={styles.speedButton}
              >
                {simSpeed > 1 ? '1x Real' : '5x Warp'}
              </button>
            )}
            <button 
              type="button"
              onClick={() => { setProgress(5); setIsPlaying(false); }}
              style={styles.resetButton}
              aria-label="Restart tracking map simulation"
            >
              <RotateCcw size={14} />
            </button>
          </div>
        )}
      </div>

      {/* Swiggy linear progress bar */}
      <div style={styles.milestoneContainer}>
        <div style={styles.milestoneProgressLine}>
          <div 
            style={{ 
              ...styles.milestoneProgressFill, 
              width: status === 'cancelled' ? '0%' : `${progress}%`,
              backgroundColor: status === 'cancelled' ? '#94a3b8' : 'var(--success)'
            }} 
          />
        </div>
        
        <div style={styles.milestoneNodeRow}>
          {milestones.map((m, idx) => (
            <div key={idx} style={styles.milestoneNodeCol}>
              <div 
                style={{
                  ...styles.milestoneDot,
                  backgroundColor: status === 'cancelled' ? '#cbd5e1' : m.reached ? 'var(--success)' : '#fff',
                  borderColor: status === 'cancelled' ? '#94a3b8' : m.reached ? 'var(--success)' : '#cbd5e1',
                  boxShadow: m.reached && status !== 'cancelled' ? '0 0 10px rgba(16, 185, 129, 0.4)' : 'none'
                }}
              >
                {m.reached && status !== 'cancelled' && <CheckCircle2 size={12} style={{ color: '#fff' }} />}
              </div>
              <span 
                style={{ 
                  ...styles.milestoneLabel, 
                  fontWeight: m.reached ? 700 : 500,
                  color: m.reached && status !== 'cancelled' ? 'var(--text-main)' : 'var(--text-muted)' 
                }}
              >
                {m.label}
              </span>
            </div>
          ))}
        </div>
      </div>

      {/* Grid Layout: Left Map, Right Delivery Executive & Logs */}
      <div style={styles.layoutGrid}>
        
        {/* Animated Map */}
        <div style={styles.mapContainer}>
          <svg viewBox="0 0 500 300" style={styles.svgMap}>
            <defs>
              <pattern id="gridPattern" width="25" height="25" patternUnits="userSpaceOnUse">
                <path d="M 25 0 L 0 0 0 25" fill="none" stroke="rgba(255, 255, 255, 0.04)" strokeWidth="1" />
              </pattern>
            </defs>
            <rect width="100%" height="100%" fill="#0b1329" rx="16" />
            <rect width="100%" height="100%" fill="url(#gridPattern)" rx="16" />

            {/* Background simulated Swiggy road routes */}
            <path d="M 40 80 Q 200 40 320 280" fill="none" stroke="rgba(255, 255, 255, 0.02)" strokeWidth="6" />
            <path d="M 120 260 L 260 140 L 440 220" fill="none" stroke="rgba(255, 255, 255, 0.02)" strokeWidth="4" />

            {/* Bezier Route Path */}
            <path 
              d={`M ${startPoint.x} ${startPoint.y} Q ${controlPoint.x} ${controlPoint.y} ${endPoint.x} ${endPoint.y}`} 
              fill="none" 
              stroke={status === 'cancelled' ? '#334155' : 'rgba(16, 185, 129, 0.12)'} 
              strokeWidth="6" 
              strokeLinecap="round"
            />

            {/* Animated tracking progress path */}
            {status !== 'cancelled' && (
              <path 
                d={`M ${startPoint.x} ${startPoint.y} Q ${controlPoint.x} ${controlPoint.y} ${endPoint.x} ${endPoint.y}`} 
                fill="none" 
                stroke="#10b981" 
                strokeWidth="5" 
                strokeLinecap="round"
                strokeDasharray="500"
                strokeDashoffset={500 - (500 * (progress / 100))}
                style={{ transition: 'stroke-dashoffset 0.15s linear' }}
              />
            )}

            {/* Warehouse hub node */}
            <circle cx={startPoint.x} cy={startPoint.y} r="8" fill="var(--brand-primary)" />
            <circle cx={startPoint.x} cy={startPoint.y} r="16" fill="none" stroke="var(--brand-primary)" strokeWidth="2" opacity="0.35" />
            <foreignObject x={startPoint.x - 50} y={startPoint.y + 12} width="100" height="40">
              <div style={styles.mapLabel}>Fulfillment Hub</div>
            </foreignObject>

            {/* Client destination node */}
            <circle cx={endPoint.x} cy={endPoint.y} r="8" fill={status === 'cancelled' ? '#ef4444' : progress === 100 ? '#10b981' : '#64748b'} />
            <circle 
              cx={endPoint.x} 
              cy={endPoint.y} 
              r="16" 
              fill="none" 
              stroke={status === 'cancelled' ? '#ef4444' : progress === 100 ? '#10b981' : '#64748b'} 
              strokeWidth="2" 
              style={{
                animation: status !== 'cancelled' && progress < 100 ? 'pulse 1.8s infinite ease-in-out' : 'none',
                opacity: 0.35
              }} 
            />
            <foreignObject x={endPoint.x - 50} y={endPoint.y + 12} width="100" height="40">
              <div style={{ ...styles.mapLabel, fontWeight: '750', color: '#fff' }}>{destinationCity}</div>
            </foreignObject>

            {/* Moving delivery scooter marker */}
            {status !== 'cancelled' && (
              <g 
                transform={`translate(${x}, ${y}) rotate(${angle})`}
                style={{ transition: 'transform 0.15s linear' }}
              >
                {/* pulsing backdrop */}
                <circle cx="0" cy="0" r="18" fill="rgba(16, 185, 129, 0.25)" style={{ animation: 'pulse 1.5s infinite ease-in-out' }} />
                <circle cx="0" cy="0" r="14" fill="#10b981" />
                <foreignObject x="-9" y="-9" width="18" height="18">
                  <div style={{ color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    {/* Tiny custom scooter bike inline SVG */}
                    <svg viewBox="0 0 24 24" width="12" height="12" fill="currentColor">
                      <path d="M19 15c-1.1 0-2-.9-2-2V9h-3.2c-.4 0-.8.2-1 .5l-2.6 3.5H3v2h4.5c.3 0 .5-.2.6-.4l.8-1.1h3.7c.4 0 .8-.2 1-.5l2.4-3.2V13c0 1.1.9 2 2 2h3v-2h-3z" />
                      <circle cx="5" cy="18" r="3" />
                      <circle cx="19" cy="18" r="3" />
                    </svg>
                  </div>
                </foreignObject>
              </g>
            )}
          </svg>
          
          <div style={styles.etaBox}>
            <span style={{ fontWeight: 800, color: 'var(--brand-primary)' }}>{Math.round(progress)}% Transit Done</span>
            <span style={{ color: 'var(--text-muted)', fontWeight: 600 }}>
              {status === 'cancelled' 
                ? 'Delivery cancelled' 
                : progress === 100 
                ? 'Arrived!' 
                : `ETA: ~${Math.max(1, Math.round((100 - progress) * 0.15))} mins`}
            </span>
          </div>
        </div>

        {/* Right Info & Swiggy Executive Panel */}
        <div style={styles.infoCol}>
          
          {/* Swiggy Delivery Executive Card */}
          <div style={styles.executiveCard}>
            {status === 'cancelled' ? (
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.65rem', color: 'var(--danger)' }}>
                <AlertTriangle size={20} />
                <div>
                  <h4 style={{ margin: 0, fontWeight: 800 }}>Delivery Pipeline Halted</h4>
                  <p style={{ margin: 0, fontSize: '0.8rem', color: 'var(--text-muted)' }}>Order has been cancelled.</p>
                </div>
              </div>
            ) : (
              <>
                <div style={styles.executiveHeader}>
                  <div style={styles.avatarBox}>
                    {/* Delivery Partner Avatar SVG */}
                    <svg viewBox="0 0 24 24" width="28" height="28" fill="var(--brand-primary)">
                      <circle cx="12" cy="8" r="4" />
                      <path d="M12 14c-4.4 0-8 2-8 5v1h16v-1c0-3-3.6-5-8-5z" />
                    </svg>
                    {isRohanActive && <span style={styles.activeDot} />}
                  </div>
                  <div>
                    <h4 style={styles.execName}>Rohan Kumar</h4>
                    <div style={styles.execBadge}>
                      <span style={styles.badgeRating}>★ 4.9</span>
                      <span style={styles.badgeLabel}>Verified Swiggy Partner</span>
                    </div>
                  </div>
                </div>

                <div style={styles.execMessage}>
                  {executiveMessage}
                </div>

                {isRohanActive && (
                  <div style={styles.execActions}>
                    <button 
                      type="button" 
                      onClick={triggerCall} 
                      style={styles.execBtn}
                    >
                      <Phone size={14} /> Call Rohan
                    </button>
                    <button 
                      type="button" 
                      onClick={triggerChat} 
                      style={{ ...styles.execBtn, backgroundColor: '#f1f5f9', color: 'var(--text-main)' }}
                    >
                      <MessageSquare size={14} /> Chat
                    </button>
                  </div>
                )}
              </>
            )}
          </div>

          {/* Logistics Tracking History */}
          <div style={styles.logsBox}>
            <h4 style={styles.logsTitle}>Tracking History</h4>
            <div style={styles.logsList}>
              {liveLogs.map((log, index) => (
                <div key={index} style={{ ...styles.logItem, opacity: log.active ? 1 : 0.4 }}>
                  <div style={styles.indicatorArea}>
                    <div 
                      style={{ 
                        ...styles.logDot, 
                        backgroundColor: log.isDanger ? '#ef4444' : log.isSuccess ? '#10b981' : 'var(--brand-primary)',
                        boxShadow: log.active ? '0 0 8px var(--brand-primary)' : 'none'
                      }} 
                    />
                    {index < liveLogs.length - 1 && <div style={styles.logLine} />}
                  </div>
                  <div style={styles.logContent}>
                    <div style={styles.logHeader}>
                      <span style={{ ...styles.logTitleText, color: log.isDanger ? '#ef4444' : 'var(--text-main)' }}>{log.title}</span>
                      <span style={styles.logTime}>{log.time}</span>
                    </div>
                    <p style={styles.logDesc}>{log.desc}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>

        </div>

      </div>
    </div>
  );
}

const styles = {
  trackerCard: {
    background: '#ffffff',
    border: '1px solid var(--border-light)',
    borderRadius: '16px',
    padding: '1.5rem',
    boxShadow: 'var(--shadow-sm)',
    marginTop: '1.5rem',
    marginBottom: '1.5rem',
  },
  header: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderBottom: '1px solid #f1f5f9',
    paddingBottom: '1rem',
    marginBottom: '1.25rem',
    flexWrap: 'wrap',
    gap: '1rem',
  },
  titleArea: {
    display: 'flex',
    alignItems: 'center',
    gap: '0.65rem',
  },
  liveIndicator: {
    position: 'relative',
    width: '12px',
    height: '12px',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
  },
  liveDot: {
    width: '8px',
    height: '8px',
    borderRadius: '50%',
    zIndex: 2,
  },
  livePing: {
    position: 'absolute',
    width: '100%',
    height: '100%',
    borderRadius: '50%',
    border: '2px solid',
    animation: 'ping 1.5s cubic-bezier(0, 0, 0.2, 1) infinite',
  },
  title: {
    fontSize: '1.1rem',
    fontWeight: '800',
    color: '#0f172a',
    margin: 0,
  },
  subtitle: {
    fontSize: '0.82rem',
    color: 'var(--text-muted)',
    fontWeight: '500',
    margin: 0,
  },
  simControls: {
    display: 'flex',
    gap: '0.4rem',
    alignItems: 'center',
  },
  simButton: {
    color: '#ffffff',
    border: 'none',
    borderRadius: '8px',
    padding: '0.45rem 0.85rem',
    fontSize: '0.8rem',
    fontWeight: '700',
    display: 'flex',
    alignItems: 'center',
    cursor: 'pointer',
  },
  speedButton: {
    backgroundColor: '#f1f5f9',
    color: 'var(--text-main)',
    border: '1px solid var(--border-light)',
    borderRadius: '8px',
    padding: '0.45rem 0.85rem',
    fontSize: '0.8rem',
    fontWeight: '700',
    cursor: 'pointer',
  },
  resetButton: {
    backgroundColor: '#f1f5f9',
    color: 'var(--text-main)',
    border: '1px solid var(--border-light)',
    borderRadius: '8px',
    padding: '0.45rem',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    cursor: 'pointer',
  },
  milestoneContainer: {
    background: '#f8fafc',
    border: '1px solid var(--border-light)',
    borderRadius: '12px',
    padding: '1.25rem 1.5rem',
    marginBottom: '1.5rem',
    position: 'relative',
  },
  milestoneProgressLine: {
    position: 'absolute',
    top: '32px',
    left: '8%',
    right: '8%',
    height: '4px',
    backgroundColor: '#e2e8f0',
    borderRadius: '2px',
    zIndex: 1,
  },
  milestoneProgressFill: {
    height: '100%',
    borderRadius: '2px',
    transition: 'width 0.15s linear',
  },
  milestoneNodeRow: {
    display: 'flex',
    justifyContent: 'space-between',
    position: 'relative',
    zIndex: 2,
  },
  milestoneNodeCol: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    width: '18%',
    textAlign: 'center',
  },
  milestoneDot: {
    width: '20px',
    height: '20px',
    borderRadius: '50%',
    border: '2px solid',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: '0.5rem',
    transition: 'all 0.25s ease',
  },
  milestoneLabel: {
    fontSize: '0.75rem',
    lineHeight: '1.35',
  },
  layoutGrid: {
    display: 'grid',
    gridTemplateColumns: '1.1fr 0.9fr',
    gap: '1.5rem',
  },
  mapContainer: {
    display: 'flex',
    flexDirection: 'column',
    gap: '0.75rem',
  },
  svgMap: {
    width: '100%',
    height: 'auto',
    borderRadius: '14px',
    boxShadow: '0 4px 12px rgba(0, 0, 0, 0.06)',
  },
  mapLabel: {
    color: '#94a3b8',
    fontSize: '10px',
    textAlign: 'center',
    fontWeight: '600',
    whiteSpace: 'nowrap',
    overflow: 'hidden',
    textOverflow: 'ellipsis',
  },
  etaBox: {
    display: 'flex',
    justifyContent: 'space-between',
    background: '#f8fafc',
    border: '1px solid var(--border-light)',
    borderRadius: '8px',
    padding: '0.5rem 0.85rem',
    fontSize: '0.85rem',
  },
  infoCol: {
    display: 'flex',
    flexDirection: 'column',
    gap: '1rem',
  },
  executiveCard: {
    background: 'radial-gradient(circle at 100% 0%, rgba(99, 102, 241, 0.03) 0%, #fff 100%)',
    border: '1.5px solid var(--border-light)',
    borderRadius: '14px',
    padding: '1.25rem',
    boxShadow: 'var(--shadow-sm)',
  },
  executiveHeader: {
    display: 'flex',
    alignItems: 'center',
    gap: '0.75rem',
  },
  avatarBox: {
    width: '44px',
    height: '44px',
    borderRadius: '50%',
    background: '#f1f5f9',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    position: 'relative',
  },
  activeDot: {
    position: 'absolute',
    bottom: '2px',
    right: '2px',
    width: '10px',
    height: '10px',
    background: '#10b981',
    border: '2px solid #fff',
    borderRadius: '50%',
  },
  execName: {
    fontSize: '0.98rem',
    fontWeight: 800,
    color: '#0f172a',
    margin: 0,
  },
  execBadge: {
    display: 'flex',
    alignItems: 'center',
    gap: '0.4rem',
    marginTop: '0.15rem',
  },
  badgeRating: {
    background: 'rgba(16, 185, 129, 0.1)',
    color: '#047857',
    fontSize: '0.72rem',
    fontWeight: 700,
    padding: '0.05rem 0.35rem',
    borderRadius: '4px',
  },
  badgeLabel: {
    fontSize: '0.72rem',
    color: 'var(--text-muted)',
    fontWeight: 600,
  },
  execMessage: {
    background: '#f8fafc',
    borderLeft: '3px solid var(--brand-primary)',
    padding: '0.65rem 0.85rem',
    fontSize: '0.82rem',
    color: '#475569',
    borderRadius: '0 8px 8px 0',
    marginTop: '0.85rem',
    lineHeight: '1.45',
  },
  execActions: {
    display: 'grid',
    gridTemplateColumns: '1fr 1fr',
    gap: '0.5rem',
    marginTop: '0.85rem',
  },
  execBtn: {
    background: 'var(--brand-primary)',
    color: '#fff',
    border: 'none',
    borderRadius: '8px',
    padding: '0.45rem',
    fontSize: '0.82rem',
    fontWeight: 700,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    gap: '0.35rem',
    cursor: 'pointer',
  },
  logsBox: {
    background: '#f8fafc',
    border: '1px solid var(--border-light)',
    borderRadius: '14px',
    padding: '1.25rem',
    maxHeight: '260px',
    overflowY: 'auto',
  },
  logsTitle: {
    fontSize: '0.85rem',
    fontWeight: 800,
    color: '#0f172a',
    marginBottom: '1rem',
    textTransform: 'uppercase',
    letterSpacing: '0.05em',
  },
  logsList: {
    display: 'flex',
    flexDirection: 'column',
  },
  logItem: {
    display: 'flex',
    gap: '0.65rem',
    minHeight: '52px',
  },
  indicatorArea: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
  },
  logDot: {
    width: '8px',
    height: '8px',
    borderRadius: '50%',
    flexShrink: 0,
    marginTop: '4px',
  },
  logLine: {
    width: '2px',
    flexGrow: 1,
    backgroundColor: '#cbd5e1',
    marginTop: '4px',
    marginBottom: '4px',
  },
  logContent: {
    flexGrow: 1,
    paddingBottom: '0.65rem',
  },
  logHeader: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    gap: '0.5rem',
  },
  logTitleText: {
    fontSize: '0.85rem',
    fontWeight: 750,
  },
  logTime: {
    fontSize: '0.72rem',
    color: 'var(--text-muted)',
    fontWeight: 600,
  },
  logDesc: {
    fontSize: '0.78rem',
    color: '#64748b',
    marginTop: '0.1rem',
    lineHeight: '1.4',
  }
};
