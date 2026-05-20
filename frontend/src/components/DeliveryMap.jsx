import React, { useState, useEffect, useRef } from 'react';
import { Truck, MapPin, Package, ClipboardCheck, Compass, Play, RotateCcw } from 'lucide-react';

export default function DeliveryMap({ order }) {
  const status = order?.status || 'pending';
  const shippingAddress = order?.shippingAddress || {};
  const destinationCity = shippingAddress.city || 'Your Location';

  // State for simulated progress (0 to 100)
  const [progress, setProgress] = useState(0);
  const [simSpeed, setSimSpeed] = useState(1); // 1 = real-time, 10 = fast-forward
  const [isPlaying, setIsPlaying] = useState(true);
  
  // Track animation frame or timer
  const timerRef = useRef(null);

  // Bezier curve points
  const startPoint = { x: 80, y: 220 };     // StockSync Fulfillment Center
  const controlPoint = { x: 250, y: 60 };   // Mid Transit Gateway
  const endPoint = { x: 420, y: 180 };      // Customer Destination

  // Compute position & rotation on Quadratic Bezier Curve
  const getBezierPointAndAngle = (t) => {
    // Clamp t
    const tVal = Math.max(0, Math.min(1, t));
    
    // Position: B(t) = (1-t)^2 * P0 + 2(1-t)*t * P1 + t^2 * P2
    const mt = 1 - tVal;
    const x = mt * mt * startPoint.x + 2 * mt * tVal * controlPoint.x + tVal * tVal * endPoint.x;
    const y = mt * mt * startPoint.y + 2 * mt * tVal * controlPoint.y + tVal * tVal * endPoint.y;
    
    // Tangent vector: B'(t) = 2*(1-t)*(P1 - P0) + 2*t*(P2 - P1)
    const dx = 2 * mt * (controlPoint.x - startPoint.x) + 2 * tVal * (endPoint.x - controlPoint.x);
    const dy = 2 * mt * (controlPoint.y - startPoint.y) + 2 * tVal * (endPoint.y - controlPoint.y);
    const angle = Math.atan2(dy, dx) * (180 / Math.PI);
    
    return { x, y, angle };
  };

  // Initialize progress based on Order status
  useEffect(() => {
    if (status === 'delivered') {
      setProgress(100);
      setIsPlaying(false);
    } else if (status === 'pending' || status === 'processing') {
      setProgress(5);
      setIsPlaying(false);
    } else if (status === 'shipped') {
      setProgress(15);
      setIsPlaying(true);
    } else if (status === 'cancelled') {
      setProgress(0);
      setIsPlaying(false);
    }
  }, [status]);

  // Simulation timer logic
  useEffect(() => {
    if (isPlaying && status === 'shipped') {
      timerRef.current = setInterval(() => {
        setProgress((prev) => {
          if (prev >= 100) {
            setIsPlaying(false);
            return 100;
          }
          return prev + 0.5 * simSpeed;
        });
      }, 100);
    } else {
      clearInterval(timerRef.current);
    }

    return () => clearInterval(timerRef.current);
  }, [isPlaying, simSpeed, status]);

  const { x, y, angle } = getBezierPointAndAngle(progress / 100);

  // Generate logistics logs based on creation dates and current progress
  const getLogisticsLogs = () => {
    const baseDate = new Date(order.createdAt || Date.now());
    const formatLogTime = (offsetHours) => {
      const d = new Date(baseDate.getTime() + offsetHours * 60 * 60 * 1000);
      return d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) + ' | ' + d.toLocaleDateString([], { month: 'short', day: 'numeric' });
    };

    const logs = [
      {
        title: 'Order Registered',
        desc: 'StockSync systems initialized package mapping.',
        time: formatLogTime(0),
        active: true,
      }
    ];

    if (status !== 'cancelled') {
      if (progress >= 10 || status === 'processing' || status === 'shipped' || status === 'delivered') {
        logs.push({
          title: 'Package Packaged & Verified',
          desc: 'StockSync warehouse allocated units from inventory.',
          time: formatLogTime(1.5),
          active: progress >= 15 || status === 'shipped' || status === 'delivered',
        });
      }
      if (progress >= 30 || status === 'shipped' || status === 'delivered') {
        logs.push({
          title: 'Dispatched from Hub',
          desc: 'In transit to sorting gateway.',
          time: formatLogTime(4.2),
          active: progress >= 30,
        });
      }
      if (progress >= 60 || status === 'shipped' || status === 'delivered') {
        logs.push({
          title: 'Arrived at Local Gateway',
          desc: `Sorting facility at ${destinationCity} gateway completed scan.`,
          time: formatLogTime(18.5),
          active: progress >= 60,
        });
      }
      if (progress >= 85 || status === 'shipped' || status === 'delivered') {
        logs.push({
          title: 'Out for Delivery',
          desc: 'Courier agent has picked up the container for final mile transit.',
          time: formatLogTime(22.1),
          active: progress >= 85,
        });
      }
      if (progress === 100 || status === 'delivered') {
        logs.push({
          title: 'Delivered',
          desc: `Successfully delivered to destination address in ${destinationCity}.`,
          time: order.deliveredAt ? new Date(order.deliveredAt).toLocaleString() : formatLogTime(24.5),
          active: true,
        });
      }
    } else {
      logs.push({
        title: 'Order Cancelled',
        desc: 'Transit pipeline aborted.',
        time: new Date(order.updatedAt).toLocaleString(),
        active: true,
        isDanger: true,
      });
    }

    return logs.reverse();
  };

  const currentLogs = getLogisticsLogs();

  return (
    <div className="delivery-tracker-card" style={styles.trackerCard}>
      <div style={styles.header}>
        <div style={styles.titleArea}>
          <Compass size={22} style={styles.headerIcon} />
          <div>
            <h3 style={styles.title}>Real-time Route & Delivery Tracker</h3>
            <p style={styles.subtitle}>Fulfillment Center ➔ {destinationCity}</p>
          </div>
        </div>
        
        {status === 'shipped' && (
          <div style={styles.simControls}>
            <button 
              onClick={() => setIsPlaying(!isPlaying)} 
              style={{...styles.simButton, backgroundColor: isPlaying ? '#ef4444' : '#10b981'}}
            >
              <Play size={14} style={{ marginRight: 4 }} />
              {isPlaying ? 'Pause' : 'Resume'}
            </button>
            <button 
              onClick={() => setSimSpeed(prev => prev === 1 ? 8 : 1)} 
              style={styles.speedButton}
            >
              {simSpeed > 1 ? '1x Real Speed' : '8x Simulation'}
            </button>
            <button 
              onClick={() => { setProgress(15); setIsPlaying(true); }}
              style={styles.resetButton}
              aria-label="Restart simulation"
            >
              <RotateCcw size={14} />
            </button>
          </div>
        )}
      </div>

      <div style={styles.layoutGrid}>
        {/* Animated Vector Map */}
        <div style={styles.mapContainer}>
          <svg viewBox="0 0 500 300" style={styles.svgMap}>
            {/* Map Grid / Grid Lines */}
            <defs>
              <pattern id="grid" width="25" height="25" patternUnits="userSpaceOnUse">
                <path d="M 25 0 L 0 0 0 25" fill="none" stroke="rgba(255, 255, 255, 0.05)" strokeWidth="1" />
              </pattern>
            </defs>
            <rect width="100%" height="100%" fill="#0f172a" rx="12" />
            <rect width="100%" height="100%" fill="url(#grid)" rx="12" />

            {/* Simulated Road network in background */}
            <path d="M 50 100 L 200 50 L 300 250 L 450 100" fill="none" stroke="rgba(255, 255, 255, 0.03)" strokeWidth="4" />
            <path d="M 100 250 L 250 150 L 400 200" fill="none" stroke="rgba(255, 255, 255, 0.03)" strokeWidth="3" />

            {/* Bezier Delivery Path */}
            <path 
              d={`M ${startPoint.x} ${startPoint.y} Q ${controlPoint.x} ${controlPoint.y} ${endPoint.x} ${endPoint.y}`} 
              fill="none" 
              stroke="rgba(99, 102, 241, 0.15)" 
              strokeWidth="5" 
              strokeLinecap="round"
            />

            {/* Animated pulsing path representing progress */}
            <path 
              d={`M ${startPoint.x} ${startPoint.y} Q ${controlPoint.x} ${controlPoint.y} ${endPoint.x} ${endPoint.y}`} 
              fill="none" 
              stroke="#6366f1" 
              strokeWidth="4" 
              strokeLinecap="round"
              strokeDasharray="500"
              strokeDashoffset={500 - (500 * (progress / 100))}
              style={{ transition: 'stroke-dashoffset 0.1s linear' }}
            />

            {/* Start Node: Warehouse */}
            <circle cx={startPoint.x} cy={startPoint.y} r="8" fill="#4f46e5" />
            <circle cx={startPoint.x} cy={startPoint.y} r="16" fill="none" stroke="#4f46e5" strokeWidth="2" opacity="0.3" />
            <foreignObject x={startPoint.x - 50} y={startPoint.y + 12} width="100" height="40">
              <div style={styles.mapLabel}>Fulfillment Center</div>
            </foreignObject>

            {/* Mid Node: Sorting Gateway */}
            <circle cx={controlPoint.x} cy={controlPoint.y} r="6" fill="#f59e0b" />
            <circle cx={controlPoint.x} cy={controlPoint.y} r="12" fill="none" stroke="#f59e0b" strokeWidth="2" opacity="0.2" />
            <foreignObject x={controlPoint.x - 50} y={controlPoint.y - 30} width="100" height="30">
              <div style={styles.mapLabel}>Transit Gateway</div>
            </foreignObject>

            {/* End Node: Customer Destination */}
            <circle cx={endPoint.x} cy={endPoint.y} r="8" fill={status === 'delivered' ? '#10b981' : '#64748b'} />
            <circle 
              cx={endPoint.x} 
              cy={endPoint.y} 
              r="16" 
              fill="none" 
              stroke={status === 'delivered' ? '#10b981' : '#64748b'} 
              strokeWidth="2" 
              className="pulse-glow" 
              style={{
                animation: 'pulse 1.8s infinite ease-in-out',
                opacity: 0.4
              }} 
            />
            <foreignObject x={endPoint.x - 50} y={endPoint.y + 12} width="100" height="40">
              <div style={{...styles.mapLabel, fontWeight: '700'}}>{destinationCity}</div>
            </foreignObject>

            {/* Moving Delivery Truck */}
            {status !== 'cancelled' && (
              <g 
                transform={`translate(${x}, ${y}) rotate(${angle})`}
                style={{ transition: 'transform 0.1s linear' }}
              >
                {/* Truck Marker Background */}
                <circle cx="0" cy="0" r="16" fill="#6366f1" style={styles.truckShadow} />
                <foreignObject x="-9" y="-9" width="18" height="18">
                  <div style={{ color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    <Truck size={14} style={{ transform: 'rotate(-45deg)' }} />
                  </div>
                </foreignObject>
              </g>
            )}
          </svg>

          {/* Progress bar info */}
          <div style={styles.progressBarWrapper}>
            <div style={styles.progressHeader}>
              <span style={styles.progressPercent}>{Math.round(progress)}% Completed</span>
              <span style={styles.etaText}>
                {status === 'delivered' 
                  ? 'Package Delivered' 
                  : status === 'cancelled' 
                  ? 'Delivery Cancelled' 
                  : `Estimated arrival: ~${Math.max(1, Math.round((100 - progress) * 0.2))} hours`}
              </span>
            </div>
            <div style={styles.progressRail}>
              <div style={{...styles.progressFill, width: `${progress}%`}} />
            </div>
          </div>
        </div>

        {/* Chronological Event Log */}
        <div style={styles.logsContainer}>
          <h4 style={styles.logsTitle}>Tracking History</h4>
          <div style={styles.logsList}>
            {currentLogs.map((log, index) => (
              <div key={index} style={{...styles.logItem, opacity: log.active ? 1 : 0.45}}>
                <div style={styles.logIndicatorArea}>
                  <div style={{
                    ...styles.logDot, 
                    backgroundColor: log.isDanger ? '#ef4444' : log.active ? '#6366f1' : '#94a3b8',
                    boxShadow: log.active ? '0 0 8px rgba(99, 102, 241, 0.5)' : 'none'
                  }} />
                  {index < currentLogs.length - 1 && <div style={styles.logLine} />}
                </div>
                <div style={styles.logContent}>
                  <div style={styles.logHeader}>
                    <span style={{...styles.logTitleText, color: log.isDanger ? '#ef4444' : '#0f172a'}}>{log.title}</span>
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
  );
}

// Inline responsive styling configuration
const styles = {
  trackerCard: {
    background: '#ffffff',
    border: '1px solid #e2e8f0',
    borderRadius: '16px',
    padding: '1.5rem',
    boxShadow: '0 4px 20px rgba(15, 23, 42, 0.04)',
    marginTop: '2rem',
    marginBottom: '2rem',
  },
  header: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderBottom: '1px solid #f1f5f9',
    paddingBottom: '1rem',
    marginBottom: '1.5rem',
    flexWrap: 'wrap',
    gap: '1rem',
  },
  titleArea: {
    display: 'flex',
    alignItems: 'center',
    gap: '0.75rem',
  },
  headerIcon: {
    color: '#6366f1',
    animation: 'spin 8s infinite linear',
  },
  title: {
    fontSize: '1.15rem',
    fontWeight: '800',
    color: '#0f172a',
    margin: 0,
  },
  subtitle: {
    fontSize: '0.85rem',
    color: '#64748b',
    fontWeight: '500',
    margin: 0,
  },
  simControls: {
    display: 'flex',
    gap: '0.5rem',
    alignItems: 'center',
  },
  simButton: {
    color: '#ffffff',
    border: 'none',
    borderRadius: '8px',
    padding: '0.4rem 0.85rem',
    fontSize: '0.82rem',
    fontWeight: '600',
    display: 'flex',
    alignItems: 'center',
  },
  speedButton: {
    backgroundColor: '#f1f5f9',
    color: '#475569',
    border: '1px solid #e2e8f0',
    borderRadius: '8px',
    padding: '0.4rem 0.85rem',
    fontSize: '0.82rem',
    fontWeight: '600',
  },
  resetButton: {
    backgroundColor: '#f1f5f9',
    color: '#475569',
    border: '1px solid #e2e8f0',
    borderRadius: '8px',
    padding: '0.4rem',
    display: 'flex',
    alignItems: 'center',
    justifycontent: 'center',
  },
  layoutGrid: {
    display: 'grid',
    gridTemplateColumns: '1.2fr 0.8fr',
    gap: '1.5rem',
  },
  mapContainer: {
    display: 'flex',
    flexDirection: 'column',
    gap: '1rem',
  },
  svgMap: {
    width: '100%',
    height: 'auto',
    borderRadius: '12px',
    boxShadow: '0 4px 12px rgba(0, 0, 0, 0.08)',
  },
  mapLabel: {
    color: '#94a3b8',
    fontSize: '10px',
    textAlign: 'center',
    fontWeight: '500',
    whiteSpace: 'nowrap',
    overflow: 'hidden',
    textOverflow: 'ellipsis',
  },
  progressBarWrapper: {
    padding: '0.5rem',
  },
  progressHeader: {
    display: 'flex',
    justifyContent: 'space-between',
    fontSize: '0.85rem',
    fontWeight: '650',
    marginBottom: '0.4rem',
  },
  progressPercent: {
    color: '#6366f1',
  },
  etaText: {
    color: '#64748b',
  },
  progressRail: {
    height: '6px',
    backgroundColor: '#e2e8f0',
    borderRadius: '99px',
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    backgroundColor: '#6366f1',
    borderRadius: '99px',
    transition: 'width 0.1s linear',
  },
  logsContainer: {
    background: '#f8fafc',
    borderRadius: '12px',
    padding: '1.25rem',
    border: '1px solid #e2e8f0',
    maxHeight: '380px',
    overflowY: 'auto',
  },
  logsTitle: {
    fontSize: '0.95rem',
    fontWeight: '800',
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
    gap: '0.75rem',
    minHeight: '60px',
    transition: 'opacity 0.25s ease',
  },
  logIndicatorArea: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
  },
  logDot: {
    width: '10px',
    height: '10px',
    borderRadius: '50%',
    flexShrink: 0,
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
    paddingBottom: '0.75rem',
  },
  logHeader: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    gap: '0.5rem',
  },
  logTitleText: {
    fontSize: '0.88rem',
    fontWeight: '700',
  },
  logTime: {
    fontSize: '0.75rem',
    color: '#94a3b8',
    fontWeight: '600',
    whiteSpace: 'nowrap',
  },
  logDesc: {
    fontSize: '0.8rem',
    color: '#64748b',
    marginTop: '0.15rem',
    lineHeight: '1.4',
  },
  truckShadow: {
    filter: 'drop-shadow(0 4px 8px rgba(99, 102, 241, 0.4))',
  }
};
