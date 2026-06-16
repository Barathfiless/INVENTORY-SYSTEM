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
  const storeName = localStorage.getItem('stocksync_store_name') || 'Fulfillment Hub';
  const storeCity = localStorage.getItem('stocksync_store_city') || '';

  // State for simulated progress (0 to 100)
  const [progress, setProgress] = useState(0);
  const [isPlaying, setIsPlaying] = useState(false);
  const [simSpeed, setSimSpeed] = useState(1);
  const [liveLogs, setLiveLogs] = useState([]);
  
  // Track animation frame or timer
  const timerRef = useRef(null);

  // Leaflet references and states
  const mapContainerRef = useRef(null);
  const leafletMapRef = useRef(null);
  const routePolylineRef = useRef(null);
  const progressPolylineRef = useRef(null);
  const scooterMarkerRef = useRef(null);
  const startMarkerRef = useRef(null);
  const endMarkerRef = useRef(null);
  const [leafletLoaded, setLeafletLoaded] = useState(false);
  const [coords, setCoords] = useState(null); // { store: [lat, lng], customer: [lat, lng], route: [[lat, lng], ...] }

  // Load Leaflet dynamically from CDN
  useEffect(() => {
    if (window.L) {
      setLeafletLoaded(true);
      return;
    }

    let cssLoaded = false;
    let jsLoaded = false;

    const checkAllLoaded = () => {
      if (cssLoaded && jsLoaded) {
        setLeafletLoaded(true);
      }
    };

    const link = document.createElement('link');
    link.rel = 'stylesheet';
    link.href = 'https://unpkg.com/leaflet@1.9.4/dist/leaflet.css';
    link.onload = () => {
      cssLoaded = true;
      checkAllLoaded();
    };
    link.onerror = () => {
      cssLoaded = true;
      checkAllLoaded();
    };
    document.head.appendChild(link);

    const script = document.createElement('script');
    script.src = 'https://unpkg.com/leaflet@1.9.4/dist/leaflet.js';
    script.async = true;
    script.onload = () => {
      jsLoaded = true;
      checkAllLoaded();
    };
    document.body.appendChild(script);
  }, []);

  // Resolve coordinates and fetch the driving route using OSRM
  useEffect(() => {
    if (!leafletLoaded) return;

    const resolveCoordinates = async () => {
      const storePincode = localStorage.getItem('stocksync_store_pincode') || '';
      
      const getKnownCoords = (cityOrPin) => {
        const query = (cityOrPin || '').toLowerCase().trim();
        if (query.includes('sathy') || query.includes('sathyamangalam') || query.includes('638401') || query.includes('638402')) {
          return [11.5034, 77.2444];
        }
        if (query.includes('gobichettipalaiyam') || query.includes('gobichettipalayam') || query.includes('638452')) {
          return [11.4534, 77.4373];
        }
        if (query.includes('erode') || query.includes('638001')) {
          return [11.3410, 77.7172];
        }
        if (query.includes('coimbatore') || query.includes('641001')) {
          return [11.0168, 76.9558];
        }
        if (query.includes('bengaluru') || query.includes('bangalore') || query.includes('560038')) {
          return [12.9716, 77.5946];
        }
        if (query.includes('chennai') || query.includes('600001')) {
          return [13.0827, 80.2707];
        }
        return null;
      };

      let storeCoords = getKnownCoords(storeCity) || getKnownCoords(storePincode);
      let customerCoords = getKnownCoords(destinationCity) || getKnownCoords(shippingAddress.zip);

      const fetchCoords = async (queryStr) => {
        try {
          const res = await fetch(`https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(queryStr)}&format=json&limit=1`);
          const data = await res.json();
          if (data && data[0]) {
            return [parseFloat(data[0].lat), parseFloat(data[0].lon)];
          }
        } catch (err) {
          console.warn('Geocoding search failed:', err);
        }
        return null;
      };

      if (!storeCoords) {
        storeCoords = await fetchCoords(storePincode ? `${storePincode}, India` : `${storeCity || 'Coimbatore'}, Tamil Nadu, India`);
      }
      if (!customerCoords) {
        customerCoords = await fetchCoords(shippingAddress.zip ? `${shippingAddress.zip}, India` : `${destinationCity}, Tamil Nadu, India`);
      }

      // Default fallbacks
      if (!storeCoords) storeCoords = [11.5034, 77.2444]; // Sathy
      if (!customerCoords) customerCoords = [11.4534, 77.4373]; // Gobichettipalaiyam

      // Generate straight-line route
      const straightRoute = [];
      const numPoints = 100;
      for (let i = 0; i <= numPoints; i++) {
        const t = i / numPoints;
        const lat = storeCoords[0] + (customerCoords[0] - storeCoords[0]) * t;
        const lng = storeCoords[1] + (customerCoords[1] - storeCoords[1]) * t;
        straightRoute.push([lat, lng]);
      }

      // Fetch OSRM Road Route
      let roadRoute = [];
      try {
        const routeRes = await fetch(
          `https://router.project-osrm.org/route/v1/driving/${storeCoords[1]},${storeCoords[0]};${customerCoords[1]},${customerCoords[0]}?overview=full&geometries=geojson`
        );
        const routeData = await routeRes.json();
        if (routeData.routes && routeData.routes[0] && routeData.routes[0].geometry) {
          roadRoute = routeData.routes[0].geometry.coordinates.map((coord) => [coord[1], coord[0]]);
        }
      } catch (err) {
        console.warn('OSRM routing failed:', err);
      }

      if (roadRoute.length === 0) {
        roadRoute = straightRoute;
      }

      setCoords({
        store: storeCoords,
        customer: customerCoords,
        straightRoute,
        roadRoute,
        route: straightRoute,
      });
    };

    resolveCoordinates();
  }, [leafletLoaded, storeCity, destinationCity, shippingAddress.zip]);

  // Render Leaflet Map and Markers
  useEffect(() => {
    if (!leafletLoaded || !coords || !mapContainerRef.current) return;

    const L = window.L;

    if (!leafletMapRef.current) {
      const map = L.map(mapContainerRef.current, {
        zoomControl: false,
        attributionControl: false
      }).setView(coords.store, 11);

      L.tileLayer('https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png', {
        maxZoom: 19
      }).addTo(map);

      leafletMapRef.current = map;
    }

    const map = leafletMapRef.current;

    // Remove old polylines/markers
    if (routePolylineRef.current) map.removeLayer(routePolylineRef.current);
    if (progressPolylineRef.current) map.removeLayer(progressPolylineRef.current);
    if (scooterMarkerRef.current) map.removeLayer(scooterMarkerRef.current);
    if (startMarkerRef.current) map.removeLayer(startMarkerRef.current);
    if (endMarkerRef.current) map.removeLayer(endMarkerRef.current);

    const createCustomPinIcon = (type, label) => {
      const isHome = type === 'home';
      // SVGs
      const svgIcon = isHome
        ? `<svg viewBox="0 0 24 24" width="13" height="13" fill="none" stroke="#1f2937" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" style="display: block;">
            <path d="m3 9 9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/>
            <polyline points="9 22 9 12 15 12 15 22"/>
           </svg>`
        : `<svg viewBox="0 0 24 24" width="13" height="13" fill="none" stroke="#1f2937" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="display: block;">
            <circle cx="12" cy="12" r="10"/>
            <path d="M8 14s1.5 2 4 2 4-2 4-2"/>
            <circle cx="9" cy="9" r="1" fill="#1f2937"/>
            <circle cx="15" cy="9" r="1" fill="#1f2937"/>
           </svg>`;

      return L.divIcon({
        className: 'custom-leaflet-marker',
        html: `
          <div style="position: relative; width: 120px; height: 80px; display: flex; flex-direction: column; align-items: center; justify-content: flex-start;">
            <!-- Teardrop Pin wrapper (centered horizontally, tip at y = 45) -->
            <div style="position: relative; width: 45px; height: 45px; display: flex; align-items: center; justify-content: center;">
              <!-- Teardrop shape -->
              <div style="width: 32px; height: 32px; border-radius: 50% 50% 50% 0; background: #1f2937; transform: rotate(-45deg); display: flex; align-items: center; justify-content: center; box-shadow: 0 2px 6px rgba(0,0,0,0.25), 0 1px 2px rgba(0,0,0,0.1); border: 1.5px solid #fff;">
                <!-- Inner white circle (rotated back to make icon upright) -->
                <div style="width: 20px; height: 20px; background: #fff; border-radius: 50%; transform: rotate(45deg); display: flex; align-items: center; justify-content: center; box-shadow: inset 0 1px 2px rgba(0,0,0,0.1);">
                  ${svgIcon}
                </div>
              </div>
            </div>
            <!-- Label Tag below the pin tip (y > 45) -->
            <div style="margin-top: 4px; background: #ffffff; border: 1.5px solid #e2e8f0; color: #1f2937; font-size: 11px; font-weight: 700; padding: 4px 8px; border-radius: 6px; white-space: nowrap; box-shadow: 0 2px 8px rgba(0,0,0,0.08); text-align: center; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; max-width: 110px; overflow: hidden; text-overflow: ellipsis;">
              ${label}
            </div>
          </div>
        `,
        iconSize: [120, 80],
        iconAnchor: [60, 45]
      });
    };

    const storeLabel = storeName;
    const customerLabel = 'Home';

    const startMarker = L.marker(coords.store, {
      icon: createCustomPinIcon('store', storeLabel)
    }).addTo(map);
    startMarkerRef.current = startMarker;

    const endMarker = L.marker(coords.customer, {
      icon: createCustomPinIcon('home', customerLabel)
    }).addTo(map);
    endMarkerRef.current = endMarker;

    const initialStatus = order?.status || 'pending';
    const isOutForDelivery = (initialStatus === 'out_for_delivery' || initialStatus === 'shipped' || initialStatus === 'delivered');
    const activeRoutePoints = isOutForDelivery ? coords.roadRoute : coords.straightRoute;

    const routePolyline = L.polyline(activeRoutePoints, {
      color: isOutForDelivery ? '#f97316' : '#1e293b',
      weight: isOutForDelivery ? 4 : 2,
      dashArray: isOutForDelivery ? null : '6, 6'
    }).addTo(map);
    routePolylineRef.current = routePolyline;

    // Invalidate map size and fit bounds with larger padding to prevent marker overflow
    map.invalidateSize();
    const bounds = L.latLngBounds([coords.store, coords.customer]);
    map.fitBounds(bounds, { padding: [70, 70] });

    // Monitor container resizing dynamically to prevent layout shifts
    const resizeObserver = new ResizeObserver(() => {
      if (leafletMapRef.current) {
        leafletMapRef.current.invalidateSize();
        if (coords) {
          const b = L.latLngBounds([coords.store, coords.customer]);
          leafletMapRef.current.fitBounds(b, { padding: [70, 70] });
        }
      }
    });

    if (mapContainerRef.current) {
      resizeObserver.observe(mapContainerRef.current);
    }

    // Use a delayed execution as a backup for initial mounting transitions
    const timer = setTimeout(() => {
      map.invalidateSize();
      map.fitBounds(bounds, { padding: [70, 70] });
    }, 150);

    return () => {
      resizeObserver.disconnect();
      clearTimeout(timer);
    };
  }, [leafletLoaded, coords]);

  // Update animated progress polyline and scooter marker on Leaflet map
  useEffect(() => {
    if (!leafletMapRef.current || !coords) return;

    const L = window.L;
    const map = leafletMapRef.current;

    const isOutForDelivery = (progress >= 85 || status === 'out_for_delivery' || status === 'delivered') && status !== 'cancelled';
    const activeRoute = isOutForDelivery ? coords.roadRoute : coords.straightRoute;

    // 1. Update route polyline geometry and style dynamically
    if (routePolylineRef.current) {
      routePolylineRef.current.setLatLngs(activeRoute);
      routePolylineRef.current.setStyle({
        color: isOutForDelivery ? '#f97316' : '#1e293b',
        weight: isOutForDelivery ? 4 : 2,
        dashArray: isOutForDelivery ? null : '6, 6'
      });
    }

    if (!activeRoute || !activeRoute.length) return;

    const routeIndex = Math.min(
      activeRoute.length - 1,
      Math.floor((progress / 100) * activeRoute.length)
    );
    const progressRoute = activeRoute.slice(0, routeIndex + 1);

    if (progressPolylineRef.current) map.removeLayer(progressPolylineRef.current);
    if (!isOutForDelivery && status !== 'cancelled' && progressRoute.length > 1) {
      const progressPolyline = L.polyline(progressRoute, {
        color: '#10b981',
        weight: 5
      }).addTo(map);
      progressPolylineRef.current = progressPolyline;
    }

    const scooterCoord = activeRoute[routeIndex] || coords.store;

    if (scooterMarkerRef.current) map.removeLayer(scooterMarkerRef.current);

    if (status !== 'cancelled' && progress >= 85 && progress < 100) {
      const scooterIcon = L.divIcon({
        className: 'scooter-leaflet-marker',
        html: `
          <div style="width: 28px; height: 28px; background-color: #f97316; border-radius: 50%; display: flex; align-items: center; justify-content: center; box-shadow: 0 0 10px rgba(249, 115, 22, 0.5); border: 2px solid #fff; animation: pulse 1.5s infinite ease-in-out;">
            <svg viewBox="0 0 24 24" width="14" height="14" fill="#fff">
              <path d="M19 15c-1.1 0-2-.9-2-2V9h-3.2c-.4 0-.8.2-1 .5l-2.6 3.5H3v2h4.5c.3 0 .5-.2.6-.4l.8-1.1h3.7c.4 0 .8-.2 1-.5l2.4-3.2V13c0 1.1.9 2 2 2h3v-2h-3z" />
              <circle cx="5" cy="18" r="3" />
              <circle cx="19" cy="18" r="3" />
            </svg>
          </div>
        `,
        iconSize: [28, 28],
        iconAnchor: [14, 14]
      });

      const scooterMarker = L.marker(scooterCoord, { icon: scooterIcon }).addTo(map);
      scooterMarkerRef.current = scooterMarker;
    }
  }, [progress, status, coords]);

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
    } else if (status === 'out_for_delivery') {
      setProgress(85);
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
        title: 'Order Cancelled',
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

    if (progress >= 10 || status === 'processing' || status === 'shipped' || status === 'out_for_delivery' || status === 'delivered') {
      logs.push({
        title: 'Yet to Dispatch',
        desc: 'Inventory checks cleared. Awaiting packaging team dispatch.',
        time: formatLogTime(0.5),
        active: true,
      });
    }

    if (progress >= 25 || status === 'processing' || status === 'shipped' || status === 'out_for_delivery' || status === 'delivered') {
      logs.push({
        title: 'Dispatched from Hub',
        desc: 'Left fulfillment hub scan line. Assigned transit courier.',
        time: formatLogTime(1.2),
        active: progress >= 25 || status === 'shipped' || status === 'out_for_delivery' || status === 'delivered',
      });
    }

    if (progress >= 55 || status === 'shipped' || status === 'out_for_delivery' || status === 'delivered') {
      logs.push({
        title: 'Shipped & In Transit',
        desc: `Arrived at gateway facility in vicinity of ${destinationCity}.`,
        time: formatLogTime(4.5),
        active: progress >= 55 || status === 'out_for_delivery' || status === 'delivered',
      });
    }

    if (progress >= 85 || status === 'out_for_delivery' || status === 'delivered') {
      logs.push({
        title: 'Out for Delivery',
        desc: 'Delivery partner XXXXX has collected package for delivery.',
        time: formatLogTime(7.8),
        active: progress >= 85 || status === 'out_for_delivery' || status === 'delivered',
      });
    }

    if (progress === 100 || status === 'delivered') {
      logs.push({
        title: 'Delivered Successfully',
        desc: `Handed over securely to destination. Verification code matched.`,
        time: order?.deliveredAt ? new Date(order.deliveredAt).toLocaleString() : formatLogTime(8.2),
        active: true,
        isSuccess: true,
      });
    }

    setLiveLogs(logs.reverse());
  }, [progress, status, order]);


  // Milestone triggers
  const milestones = [
    { label: 'Yet to Dispatch', reached: progress >= 5 || ['processing', 'shipped', 'out_for_delivery', 'delivered'].includes(status), value: 5 },
    { label: 'Dispatched', reached: progress >= 25 || ['shipped', 'out_for_delivery', 'delivered'].includes(status), value: 25 },
    { label: 'Shipped', reached: progress >= 55 || ['out_for_delivery', 'delivered'].includes(status), value: 55 },
    { label: 'Out for Delivery', reached: progress >= 85 || ['out_for_delivery', 'delivered'].includes(status), value: 85 },
    { label: 'Delivered', reached: progress === 100 || status === 'delivered', value: 100 },
  ];

  // Delivery Executive Card messaging
  let executiveMessage = 'Assigning delivery partner...';
  let isRohanActive = false;

  if (status === 'cancelled') {
    executiveMessage = 'Delivery pipeline aborted.';
  } else if (progress === 100 || status === 'delivered') {
    executiveMessage = 'XXXXX wishes you a great day ahead!';
    isRohanActive = false;
  } else if (progress >= 85 || status === 'out_for_delivery') {
    executiveMessage = 'XXXXX has picked up your package and is approaching your address!';
    isRohanActive = true;
  } else if (progress >= 55 || status === 'shipped') {
    executiveMessage = 'XXXXX has verified details and will pick up shortly from local sorting hub.';
    isRohanActive = true;
  } else if (progress >= 25 || status === 'processing') {
    executiveMessage = 'Fulfillment scans complete. Delivery partner allocated.';
    isRohanActive = true;
  } else {
    executiveMessage = 'Preparing order items. XXXXX is waiting at the hub.';
    isRohanActive = true;
  }

  const triggerCall = () => {
    alert('Simulating call to partner XXXXX (9845X XXXXX). Call connected!');
  };

  const triggerChat = () => {
    alert('Simulating chat connection. XXXXX: "I am arriving at the warehouse gate now to pick up your order."');
  };

  return (
    <div style={styles.trackerCard}>
      <div style={styles.layoutGrid}>
        
        {/* Left Column: Title, Progress, Executive Card, Logs */}
        <div style={styles.leftCol}>
          {/* Header Info */}
          <div style={styles.header}>
            <div style={styles.titleArea}>
              <div style={styles.liveIndicator}>
                <span style={{ ...styles.liveDot, backgroundColor: status === 'cancelled' ? '#ef4444' : '#10b981' }} />
                <span style={{ ...styles.livePing, borderColor: status === 'cancelled' ? '#ef4444' : '#10b981' }} />
              </div>
              <div>
                <h3 style={styles.title}>Real-time Route & Delivery Tracker</h3>
                <p style={styles.subtitle}>
                  {storeCity ? `${storeName} (${storeCity})` : storeName} ➔ Home ({destinationCity})
                </p>
              </div>
            </div>
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

          {/* Swiggy Delivery Executive Card */}
          {progress >= 85 && progress < 100 && status !== 'cancelled' && (
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
                      <h4 style={styles.execName}>XXXXX</h4>
                      <div style={styles.execBadge}>
                        <span style={styles.badgeRating}>★ 4.9</span>
                        <span style={styles.badgeLabel}>Verified Stocksync Partner</span>
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
                        <Phone size={14} /> Call XXXXX
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
          )}

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

        {/* Right Column: Interactive Leaflet Map */}
        <div style={styles.mapContainer}>
          <div 
            ref={mapContainerRef} 
            style={{ 
              width: '100%', 
              height: '380px', 
              borderRadius: '14px', 
              boxShadow: '0 4px 12px rgba(0, 0, 0, 0.06)',
              backgroundColor: '#f8fafc',
              position: 'relative',
              overflow: 'hidden',
              border: '1.5px solid var(--border-light)',
              transform: 'translate3d(0, 0, 0)',
              isolation: 'isolate',
              zIndex: 1
            }}
          >
            {!leafletLoaded && (
              <div style={{ position: 'absolute', top: 0, left: 0, width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#94a3b8', fontSize: '13px', fontWeight: 600 }}>
                Loading map canvas...
              </div>
            )}
            {leafletLoaded && !coords && (
              <div style={{ position: 'absolute', top: 0, left: 0, width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#94a3b8', fontSize: '13px', fontWeight: 600 }}>
                Geocoding locations and plotting route...
              </div>
            )}
          </div>
          
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

      </div>
    </div>
  );
}

const styles = {
  trackerCard: {
    background: 'transparent',
    border: 'none',
    boxShadow: 'none',
    padding: 0,
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
    gridTemplateColumns: '1.2fr 0.8fr',
    gap: '1.5rem',
    alignItems: 'start',
  },
  leftCol: {
    display: 'flex',
    flexDirection: 'column',
    gap: '1rem',
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
    background: '#ffffff',
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
