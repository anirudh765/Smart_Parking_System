import React, { useState, useEffect, useCallback } from 'react';
import { Link } from 'react-router-dom';
import {
  ParkingCircle, Car, Bike, Truck, Zap, Search, LogOut,
  Wallet, Sparkles, ArrowRight, CheckCircle2, MapPin, Clock,
  User, Phone, CreditCard, DollarSign, Receipt, AlertCircle,
  LayoutDashboard, RefreshCw, Plus, Mail, Lock, UserPlus, ShieldCheck
} from 'lucide-react';
import toast from 'react-hot-toast';
import { vehicleService, pricingService, slotService, authService, paymentService } from '../services/api';
import './UserPortal.css';

/* ── helpers ─────────────────────────────────────────────────────── */
const getWalletBalance = (phone) => {
  const d = JSON.parse(localStorage.getItem('parkease_wallets') || '{}');
  return d[phone] ?? 0;
};
const setWalletBalance = (phone, amt) => {
  const d = JSON.parse(localStorage.getItem('parkease_wallets') || '{}');
  d[phone] = amt;
  localStorage.setItem('parkease_wallets', JSON.stringify(d));
};

const vehicleTypes = [
  { id: 'car',        label: 'Car',        Icon: Car,   color: 'blue',   backendType: 'car'      },
  { id: 'motorcycle', label: 'Motorcycle', Icon: Bike,  color: 'green',  backendType: 'bike'     },
  { id: 'truck',      label: 'Truck',      Icon: Truck, color: 'orange', backendType: 'truck'    },
  { id: 'ev',         label: 'EV',         Icon: Zap,   color: 'purple', backendType: 'electric' },
];

const paymentMethods = [
  { id: 'cash',    label: 'Cash',            Icon: DollarSign },
  { id: 'wallet',  label: 'Wallet',          Icon: Wallet     },
  { id: 'online',  label: 'Online Payment',  Icon: Receipt    },
];

/* ── SlotStatus ──────────────────────────────────────────────────── */
const SlotStatus = () => {
  const [summary, setSummary] = useState(null);
  const [refreshing, setRefreshing] = useState(false);

  const load = useCallback(async () => {
    setRefreshing(true);
    try {
      const r = await slotService.getSummary();
      setSummary(r.data.data || r.data);
    } catch { /* silent */ }
    finally { setRefreshing(false); }
  }, []);

  useEffect(() => { load(); }, [load]);

  if (!summary) return null;
  const s        = summary.overall || summary;
  const total     = s.total     ?? 0;
  const available = s.available ?? 0;
  const occupied  = s.occupied  ?? 0;

  return (
    <div className="up-slot-status">
      <span className="up-slot-stat total"><MapPin size={13} />{total} total</span>
      <span>·</span>
      <span className="up-slot-stat available"><span className="dot green" />{available} free</span>
      <span>·</span>
      <span className="up-slot-stat occupied"><span className="dot red" />{occupied} occupied</span>
      <button className="up-refresh-btn" onClick={load} title="Refresh">
        <RefreshCw size={14} className={refreshing ? 'spinning' : ''} />
      </button>
    </div>
  );
};

/* ── BookTab ─────────────────────────────────────────────────────── */
const BookTab = ({ onVerified }) => {
  // step: 0=phone-verify | 'register'=registration | 1=vehicle+details | 2=pricing | 3=done
  const [step, setStep]           = useState(0);

  // phone verify
  const [phone, setPhone]         = useState('');
  const [verifiedUser, setVerified] = useState(null);
  const [verifying, setVerifying] = useState(false);

  // registration
  const [regName, setRegName]     = useState('');
  const [regEmail, setRegEmail]   = useState('');
  const [regPass, setRegPass]     = useState('');
  const [regConfirm, setRegConfirm] = useState('');
  const [registering, setRegistering] = useState(false);

  // booking
  const [vtype, setVtype]         = useState('car');
  const [vid, setVid]             = useState('');
  const [ownerName, setOwner]     = useState('');
  const [hours, setHours]         = useState(1);
  const [payMethod, setPay]       = useState('cash');
  const [estimate, setEstimate]   = useState(null);
  const [loading, setLoading]     = useState(false);
  const [result, setResult]       = useState(null);
  const [slotCounts, setSlots]    = useState({});
  const [lastVehicle, setLastV]   = useState(() => {
    try { return JSON.parse(localStorage.getItem('parkease_last_vehicle') || 'null'); } catch { return null; }
  });

  useEffect(() => {
    slotService.getSummary().then(r => {
      const d = r.data.data || r.data;
      const byType = d.byType || {};
      setSlots({
        car:      byType.car?.available      ?? null,
        bike:     byType.bike?.available     ?? null,
        truck:    byType.truck?.available    ?? null,
        electric: byType.electric?.available ?? null,
      });
    }).catch(() => {});
  }, []);

  /* ── Phone verify ── */
  const verifyPhone = async (e) => {
    e.preventDefault();
    if (!phone || phone.length < 10) { toast.error('Enter a 10-digit phone number'); return; }
    setVerifying(true);
    try {
      const r = await authService.checkPhone(phone);
      const d = r.data;
      if (d.registered) {
        setVerified({ name: d.name, membershipType: d.membershipType });
        setOwner(d.name);
        toast.success(`Welcome back, ${d.name}!`);
        setStep(1);
        onVerified?.();
      } else {
        setStep('register');
      }
    } catch {
      toast.error('Verification failed. Please try again.');
    } finally { setVerifying(false); }
  };

  /* ── Registration ── */
  const handleRegister = async (e) => {
    e.preventDefault();
    if (!regName.trim())           { toast.error('Name is required'); return; }
    if (!regEmail.trim())          { toast.error('Email is required'); return; }
    if (regPass.length < 6)        { toast.error('Password must be at least 6 characters'); return; }
    if (regPass !== regConfirm)    { toast.error('Passwords do not match'); return; }
    setRegistering(true);
    try {
      await authService.register({ name: regName.trim(), email: regEmail.trim(), password: regPass, phone });
      setVerified({ name: regName.trim(), membershipType: 'regular' });
      setOwner(regName.trim());
      toast.success('Account created! You can now park.');
      setStep(1);
      onVerified?.();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Registration failed');
    } finally { setRegistering(false); }
  };

  /* ── Quick park — pre-fill + immediately fetch pricing and jump to step 2 ── */
  const applyAndBook = async () => {
    if (!lastVehicle) return;
    const newVid = lastVehicle.vehicleId;
    const newVtype = lastVehicle.vehicleType || 'car';
    const newOwner = lastVehicle.ownerName || '';
    setVid(newVid);
    setOwner(newOwner);
    setVtype(newVtype);
    setLoading(true);
    try {
      const backendType = vehicleTypes.find(v => v.id === newVtype)?.backendType || newVtype;
      const r = await pricingService.getEstimate(backendType, hours);
      setEstimate(r.data.data || r.data);
      setStep(2);
      toast.success(`Quick park ready — ${newVid}`);
    } catch {
      toast.error('Could not fetch pricing estimate');
    } finally { setLoading(false); }
  };

  /* ── Pricing step ── */
  const goStep2 = async () => {
    if (!vid.trim() || vid.trim().length < 3) { toast.error('Enter a valid vehicle number'); return; }
    setLoading(true);
    try {
      const r = await pricingService.getEstimate(vtype, hours);
      setEstimate(r.data.data || r.data);
      setStep(2);
    } catch { toast.error('Could not fetch pricing estimate'); }
    finally { setLoading(false); }
  };

  /* ── Confirm park ── */
  const confirmPark = async () => {
    setLoading(true);
    try {
      const payload = {
        vehicleId:   vid.toUpperCase().trim(),
        vehicleType: vehicleTypes.find(v => v.id === vtype)?.backendType || vtype,
        ownerName:   ownerName.trim() || 'Guest',
        ownerPhone:  phone.trim() || '',
      };
      const r = await vehicleService.park(payload);
      const data = r.data.data || r.data;
      setResult(data);
      const lv = { vehicleId: payload.vehicleId, vehicleType: vtype, ownerName: payload.ownerName, phone: payload.phone };
      localStorage.setItem('parkease_last_vehicle', JSON.stringify(lv));
      setLastV(lv);
      setStep(3);
      toast.success('Vehicle parked!');
    } catch (err) {
      toast.error(err.response?.data?.message || err.response?.data?.error || 'Parking failed');
    } finally { setLoading(false); }
  };

  const reset = () => {
    setStep(0); setPhone(''); setVerified(null); setRegName(''); setRegEmail(''); setRegPass(''); setRegConfirm('');
    setVid(''); setOwner(''); setHours(1); setEstimate(null); setResult(null);
  };

  // Numeric booking step (1/2/3) for the step indicator
  const numStep = typeof step === 'number' && step >= 1 ? step : null;

  return (
    <div className="up-panel">
      <Sparkles size={36} className="up-tab-icon" />
      <h3>Park Your Vehicle</h3>
      <p>Verify your phone, then book a slot instantly</p>

      {/* Step indicator — only shown during booking steps 1/2/3 */}
      {numStep !== null && (
        <div className="up-steps">
          <div className={`up-step ${numStep > 1 ? 'done' : numStep === 1 ? 'active' : ''}`}>{numStep > 1 ? <CheckCircle2 size={14} /> : '1'}</div>
          <div className={`up-step-line ${numStep > 1 ? 'done' : ''}`} />
          <div className={`up-step ${numStep > 2 ? 'done' : numStep === 2 ? 'active' : ''}`}>{numStep > 2 ? <CheckCircle2 size={14} /> : '2'}</div>
          <div className={`up-step-line ${numStep > 2 ? 'done' : ''}`} />
          <div className={`up-step ${numStep === 3 ? 'done' : ''}`}>{numStep === 3 ? <CheckCircle2 size={14} /> : '3'}</div>
        </div>
      )}

      {/* ── Step 0: Phone Verification ── */}
      {step === 0 && (
        <form className="up-search-form" onSubmit={verifyPhone}>
          <div className="up-field">
            <label><Phone size={13} /> Registered Phone Number</label>
            <input className="up-input big" value={phone}
              onChange={e => setPhone(e.target.value.replace(/\D/g,'').slice(0,10))}
              placeholder="Enter 10-digit phone number" maxLength={10} />
          </div>
          <button className="up-btn up-btn-primary full-width" type="submit" disabled={verifying}>
            {verifying ? <span className="up-spin" /> : <><ShieldCheck size={16} /> Verify &amp; Continue</>}
          </button>
          <p className="up-note" style={{textAlign:'center',marginTop:8}}>You must be registered to book parking. Don't have an account? Enter your phone and we'll guide you.</p>
        </form>
      )}

      {/* ── Step 'register': Inline Registration ── */}
      {step === 'register' && (
        <>
          <div className="up-not-found" style={{marginBottom:16}}>
            <AlertCircle size={16} />
            <span>Phone <strong>{phone}</strong> is not registered. Create an account below.</span>
          </div>
          <form className="up-form" onSubmit={handleRegister}>
            <div className="up-field">
              <label><User size={13} /> Full Name</label>
              <input className="up-input" value={regName} onChange={e => setRegName(e.target.value)} placeholder="Your name" />
            </div>
            <div className="up-field">
              <label><Mail size={13} /> Email Address</label>
              <input className="up-input" type="email" value={regEmail} onChange={e => setRegEmail(e.target.value)} placeholder="you@email.com" />
            </div>
            <div className="up-field">
              <label><Phone size={13} /> Phone</label>
              <input className="up-input" value={phone} readOnly style={{opacity:0.6}} />
            </div>
            <div className="up-row">
              <div className="up-field">
                <label><Lock size={13} /> Password</label>
                <input className="up-input" type="password" value={regPass} onChange={e => setRegPass(e.target.value)} placeholder="Min 6 characters" />
              </div>
              <div className="up-field">
                <label><Lock size={13} /> Confirm</label>
                <input className="up-input" type="password" value={regConfirm} onChange={e => setRegConfirm(e.target.value)} placeholder="Repeat password" />
              </div>
            </div>
            <div className="up-actions">
              <button type="button" className="up-btn up-btn-ghost" onClick={() => setStep(0)}>Back</button>
              <button type="submit" className="up-btn up-btn-primary" disabled={registering}>
                {registering ? <span className="up-spin" /> : <><UserPlus size={15} /> Create Account</>}
              </button>
            </div>
          </form>
        </>
      )}

      {/* ── Step 1: Vehicle type + details ── */}
      {step === 1 && (
        <>
          {/* verified user badge */}
          {verifiedUser && (
            <div className="up-quick-banner" style={{marginBottom:16}}>
              <div className="up-quick-info">
                <ShieldCheck size={16} />
                <div>
                  <span className="up-quick-label">Verified</span>
                  <span className="up-quick-sub">{verifiedUser.name} · {phone} · {verifiedUser.membershipType}</span>
                </div>
              </div>
            </div>
          )}

          {lastVehicle && (
            <div className="up-quick-banner">
              <div className="up-quick-info">
                <Sparkles size={16} />
                <div>
                  <span className="up-quick-label">Quick Park</span>
                  <span className="up-quick-sub">{lastVehicle.vehicleId} · {lastVehicle.vehicleType}</span>
                </div>
              </div>
              <button className="up-btn up-btn-primary up-quick-book-btn" onClick={applyAndBook} disabled={loading}>
                {loading ? <span className="up-spin" /> : <><Sparkles size={14} /> One-Tap Book</>}
              </button>
            </div>
          )}

          <div className="up-type-grid">
            {vehicleTypes.map(v => {
              const count = slotCounts[v.backendType] ?? null;
              const avail = count === null || count > 0;
              return (
                <div key={v.id} className={`up-type-card ${v.color} ${vtype === v.id ? 'selected' : ''} ${!avail ? 'dim' : ''}`}
                     onClick={() => avail && setVtype(v.id)}>
                  {vtype === v.id && <CheckCircle2 size={16} className="selected-check" />}
                  <v.Icon size={28} />
                  <span>{v.label}</span>
                  {count !== null && <small className={avail ? '' : 'empty'}>{avail ? `${count} slots` : 'Full'}</small>}
                </div>
              );
            })}
          </div>

          <div className="up-form">
            <div className="up-field">
              <label><Car size={13} /> Vehicle Number</label>
              <input className="up-input upper big" value={vid} onChange={e => setVid(e.target.value.toUpperCase())} placeholder="e.g. MH12AB1234" maxLength={12} />
            </div>
            <div className="up-row">
              <div className="up-field">
                <label><User size={13} /> Owner Name</label>
                <input className="up-input" value={ownerName} onChange={e => setOwner(e.target.value)} placeholder="Auto-filled" />
              </div>
              <div className="up-field">
                <label><Clock size={13} /> Expected Hours</label>
                <input className="up-input" type="number" min="1" max="24" value={hours}
                  onChange={e => setHours(Math.max(1, Math.min(24, Number(e.target.value))))} />
              </div>
            </div>
          </div>

          <div className="up-actions">
            <button className="up-btn up-btn-ghost" onClick={() => setStep(0)}>Back</button>
            <button className="up-btn up-btn-primary" onClick={goStep2} disabled={loading}>
              {loading ? <span className="up-spin" /> : <><ArrowRight size={16} /> See Pricing</>}
            </button>
          </div>
        </>
      )}

      {/* ── Step 2: Pricing + confirm ── */}
      {step === 2 && estimate && (
        <>
          <div className="up-confirm-card">
            <div className="up-confirm-section">
              <h4>Vehicle Details</h4>
              <div className="up-confirm-grid">
                <span className="lbl">Number</span> <span className="val">{vid.toUpperCase()}</span>
                <span className="lbl">Type</span>    <span className="val capitalize">{vehicleTypes.find(v => v.id === vtype)?.label || vtype}</span>
                <span className="lbl">Owner</span>   <span className="val">{ownerName || 'Guest'}</span>
                <span className="lbl">Hours</span>   <span className="val">{hours}h</span>
              </div>
            </div>
            <div className="up-confirm-section">
              <h4>Pricing Estimate</h4>
              {(() => {
                const bRate = estimate.baseRate ?? 0;
                const aRate = estimate.appliedRate ?? bRate;
                const h     = estimate.hours ?? hours;
                const baseAmt = Math.ceil(bRate * h);
                const peakAdd = estimate.isPeakHour ? Math.ceil((aRate - bRate) * h) : 0;
                const subtotal = Math.ceil(aRate * h);
                const taxAmt  = Math.ceil(estimate.estimatedCost ?? subtotal * 1.18) - subtotal;
                return (
                  <div className="up-price-rows">
                    <div className="up-price-row"><span>Base ({h}h × ₹{bRate}/h)</span><span>₹{baseAmt}</span></div>
                    {estimate.isPeakHour && <div className="up-price-row peak"><span>Peak surcharge</span><span>+₹{peakAdd}</span></div>}
                    <div className="up-price-row"><span>GST (18%)</span><span>₹{taxAmt}</span></div>
                    <div className="up-price-row total"><span>Estimated Total</span><span>₹{estimate.estimatedCost ?? '—'}</span></div>
                  </div>
                );
              })()}
              <p className="up-note">* Final amount calculated at exit based on actual duration</p>
            </div>
            <div className="up-pay-methods">
              <h4>Payment Method</h4>
              <div className="up-pay-grid">
                {paymentMethods.map(m => (
                  <div key={m.id} className={`up-pay-card ${payMethod === m.id ? 'selected' : ''}`} onClick={() => setPay(m.id)}>
                    <m.Icon size={15} />{m.label}
                  </div>
                ))}
              </div>
            </div>
          </div>
          <div className="up-actions">
            <button className="up-btn up-btn-ghost" onClick={() => setStep(1)}>Back</button>
            <button className="up-btn up-btn-primary" onClick={confirmPark} disabled={loading}>
              {loading ? <span className="up-spin" /> : <><CheckCircle2 size={16} /> Confirm &amp; Park</>}
            </button>
          </div>
        </>
      )}

      {/* ── Step 3: Success ── */}
      {step === 3 && result && (
        <div className="up-success">
          <CheckCircle2 size={56} className="up-success-icon" />
          <h3>Vehicle Parked!</h3>
          <p style={{color:'#94a3b8',marginBottom:4}}>Your slot has been assigned</p>
          <div className="up-token">
            <div className="up-token-row"><span>Vehicle</span><strong>{result.session?.vehicleId || result.vehicleId}</strong></div>
            <div className="up-token-row"><span>Slot</span><strong>{result.session?.slotCode || result.slot?.slotCode || '—'}</strong></div>
            <div className="up-token-row"><span>Type</span><strong style={{textTransform:'capitalize'}}>{result.session?.vehicleType || result.vehicleType}</strong></div>
            <div className="up-token-row"><span>Entry Time</span><strong>{(result.session?.entryTime || result.entryTime) ? new Date(result.session?.entryTime || result.entryTime).toLocaleTimeString() : '—'}</strong></div>
          </div>
          <button className="up-btn up-btn-ghost full-width" onClick={reset}><Plus size={15} /> Park Another</button>
        </div>
      )}
    </div>
  );
};

/* ── ExitTab ─────────────────────────────────────────────────────── */
const ExitTab = () => {
  const [phase, setPhase]         = useState('search');   // search | preview | done
  const [vehicleId, setVehicleId] = useState('');
  const [vehicleData, setVehicleData] = useState(null);
  const [billData, setBillData]   = useState(null);
  const [payMethod, setPayMethod] = useState('cash');
  const [walletPhone, setWalletPhone] = useState('');
  const [walletBalance, setWalletBalState] = useState(null);
  const [searching, setSearching] = useState(false);
  const [loading, setLoading]     = useState(false);
  const [receipt, setReceipt]     = useState(null);
  const [paying, setPaying]       = useState(false);

  const search = async (e) => {
    e.preventDefault();
    if (!vehicleId || vehicleId.length < 3) { toast.error('Enter a valid vehicle number'); return; }
    setSearching(true);
    setVehicleData(null);
    setBillData(null);
    try {
      const [lk, bl] = await Promise.all([
        vehicleService.lookup(vehicleId.toUpperCase()),
        vehicleService.getBill(vehicleId.toUpperCase()),
      ]);
      setVehicleData(lk.data.data || lk.data);
      setBillData(bl.data.data || bl.data);
      setPhase('preview');
    } catch (err) {
      if (err.response?.status === 404) toast.error('Vehicle not found in parking lot');
      else toast.error(err.response?.data?.message || 'Lookup failed');
    } finally { setSearching(false); }
  };

  const loadWalletBalance = (ph) => {
    const bal = getWalletBalance(ph);
    setWalletBalState(bal);
  };

  const confirmExit = async () => {
    // Wallet-specific validation
    if (payMethod === 'wallet') {
      if (!walletPhone || walletPhone.length < 10) { toast.error('Enter your wallet phone number'); return; }
      const bal = getWalletBalance(walletPhone);
      const due = billData?.estimatedTotal ?? 0;
      if (bal < due) { toast.error(`Insufficient wallet balance (₹${bal.toFixed(2)}). Please choose another payment method.`); return; }
    }
    // Non-online methods: keep existing direct exit flow
    if (payMethod !== 'online') {
      setLoading(true);
      try {
        const res = await vehicleService.exit({ vehicleId: vehicleId.toUpperCase(), paymentMethod: payMethod });
        const rec = res.data.data?.receipt || res.data.data || res.data;
        setReceipt(rec);
        if (payMethod === 'wallet' && walletPhone) {
          const paid = rec.totalAmount ?? billData?.estimatedTotal ?? 0;
          const newBal = Math.max(0, getWalletBalance(walletPhone) - paid);
          setWalletBalance(walletPhone, newBal);
          toast.success(`₹${paid} deducted from wallet. Remaining: ₹${newBal.toFixed(2)}`);
        }
        setPhase('done');
        toast.success('Exit completed!');
      } catch (err) {
        toast.error(err.response?.data?.message || err.response?.data?.error || 'Exit failed');
      } finally { setLoading(false); }
      return;
    }

    // Online payment via Razorpay
    if (!billData || !billData.estimatedTotal) {
      toast.error('Bill amount not available');
      return;
    }

    if (!window.Razorpay) {
      toast.error('Payment gateway not loaded. Please refresh the page.');
      return;
    }

    const amount = Number(billData.estimatedTotal) || 0;
    if (!amount || Number.isNaN(amount) || amount <= 0) {
      toast.error('Invalid bill amount for payment');
      return;
    }

    setPaying(true);
    try {
      const orderRes = await paymentService.createOrder({
        amount,
        meta: {
          purpose: 'parking_exit',
          vehicleId: vehicleId.toUpperCase(),
        },
      });

      const orderData = orderRes.data.data || orderRes.data;

      const options = {
        key: orderData.key,
        amount: orderData.amount,
        currency: orderData.currency || 'INR',
        name: 'Smart Parking',
        description: 'Parking Exit Payment',
        order_id: orderData.orderId,
        method: {
          upi: '1',
          card: '1',
          netbanking: '1',
          wallet: '1',
          emi: '0',
        },
        handler: async function (response) {
          try {
            await paymentService.verifyPayment({
              razorpay_order_id: response.razorpay_order_id,
              razorpay_payment_id: response.razorpay_payment_id,
              razorpay_signature: response.razorpay_signature,
            });

            const res = await vehicleService.exit({
              vehicleId: vehicleId.toUpperCase(),
              paymentMethod: 'online',
            });

            const rec = res.data.data?.receipt || res.data.data || res.data;
            setReceipt(rec);
            setPhase('done');
            toast.success('Payment successful and exit completed!');
          } catch (err) {
            toast.error(err.response?.data?.message || 'Payment verification or exit failed');
          } finally {
            setPaying(false);
          }
        },
        modal: {
          ondismiss: function () {
            setPaying(false);
          },
        },
        theme: {
          color: '#2563eb',
        },
      };

      const rzp = new window.Razorpay(options);
      rzp.open();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to initiate UPI payment');
      setPaying(false);
    }
  };

  const reset = () => { setPhase('search'); setVehicleId(''); setVehicleData(null); setBillData(null); setReceipt(null); setPayMethod('cash'); setWalletPhone(''); setWalletBalState(null); };

  const duration = vehicleData?.entryTime
    ? (() => { const m = Math.round((Date.now() - new Date(vehicleData.entryTime)) / 60000); return m >= 60 ? `${Math.floor(m/60)}h ${m%60}m` : `${m}m`; })()
    : '—';

  return (
    <div className="up-panel">
      <LogOut size={36} className="up-tab-icon exit" />
      <h3>Exit Parking</h3>
      <p>Look up your vehicle and pay to exit</p>

      {phase === 'search' && (
        <form className="up-search-form" onSubmit={search}>
          <div className="up-field">
            <label><Car size={13} /> Vehicle Number</label>
            <input className="up-input upper big" value={vehicleId}
              onChange={e => setVehicleId(e.target.value.toUpperCase())}
              placeholder="e.g. MH12AB1234" maxLength={12} />
          </div>
          <button className="up-btn up-btn-primary full-width" type="submit" disabled={searching}>
            {searching ? <span className="up-spin" /> : <><Search size={16} /> Find &amp; Get Bill</>}
          </button>
        </form>
      )}

      {phase === 'preview' && billData && (
        <>
          <div className="up-bill-header">
            <span className="up-vid">{vehicleData?.vehicleId || vehicleId.toUpperCase()}</span>
            <span className="up-vtype">{vehicleData?.vehicleType || '—'}</span>
          </div>
          <div className="up-bill-meta">
            <div><Clock size={13} /> {vehicleData?.entryTime ? new Date(vehicleData.entryTime).toLocaleTimeString() : '—'} → Now</div>
            <div><MapPin size={13} /> {vehicleData?.slotCode || vehicleData?.slot?.slotCode || '—'}</div>
            <div><Clock size={13} /> {duration}</div>
          </div>
          <div className="up-bill-breakdown">
            <div className="up-bill-row"><span>Base Rate</span><span>₹{billData.baseRate ?? '—'}/hr</span></div>
            {billData.isPeakHour && <div className="up-bill-row"><span>Applied Rate (peak)</span><span>₹{billData.appliedRate ?? '—'}/hr</span></div>}
            <div className="up-bill-row"><span>Duration</span><span>{billData.duration ?? duration}</span></div>
            <div className="up-bill-row"><span>Subtotal</span><span>₹{billData.subtotal ?? '—'}</span></div>
            {(billData.discount > 0) && <div className="up-bill-row disc"><span>Discount ({billData.discount}%)</span><span>-₹{billData.discountAmount ?? Math.ceil((billData.subtotal ?? 0) * billData.discount / 100)}</span></div>}
            <div className="up-bill-row"><span>GST (18%)</span><span>₹{billData.tax ?? '—'}</span></div>
            <div className="up-bill-row total"><span>Total Due</span><span>₹{billData.estimatedTotal ?? '—'}</span></div>
          </div>

          {/* Preview notice — no exit has happened yet */}
          <div className="up-preview-notice">
            <AlertCircle size={15} />
            <span>Review your bill. Your vehicle is still parked. Click <strong>Confirm &amp; Exit</strong> below to complete checkout.</span>
          </div>

          <div className="up-pay-methods">
            <h4>Payment Method</h4>
            <div className="up-pay-grid">
              {paymentMethods.map(m => (
                <div key={m.id} className={`up-pay-card ${payMethod === m.id ? 'selected' : ''}`} onClick={() => setPayMethod(m.id)}>
                  <m.Icon size={15} />{m.label}
                </div>
              ))}
            </div>
            {payMethod === 'wallet' && (
              <div style={{marginTop:12}}>
                <div className="up-field">
                  <label><Phone size={13} /> Wallet Phone Number</label>
                  <input className="up-input" value={walletPhone}
                    onChange={e => { const p = e.target.value.replace(/\D/g,'').slice(0,10); setWalletPhone(p); if (p.length === 10) loadWalletBalance(p); }}
                    placeholder="10-digit mobile number" maxLength={10} />
                </div>
                {walletPhone.length === 10 && (
                  <div className="up-wallet-balance" style={{padding:'10px 14px'}}>
                    <Wallet size={18} />
                    <div>
                      <span>Wallet Balance</span>
                      <strong>₹{(walletBalance ?? getWalletBalance(walletPhone)).toFixed(2)}</strong>
                    </div>
                    {(walletBalance ?? getWalletBalance(walletPhone)) < (billData?.estimatedTotal ?? 0) && (
                      <span style={{color:'#f87171',fontSize:'0.75rem',marginLeft:'auto'}}>Insufficient</span>
                    )}
                  </div>
                )}
              </div>
            )}
          </div>

          <div className="up-actions">
            <button className="up-btn up-btn-ghost" onClick={() => setPhase('search')}>Back</button>
            <button className="up-btn up-btn-primary" onClick={confirmExit} disabled={loading || paying}>
              {loading || paying ? <span className="up-spin" /> : <><LogOut size={16} /> Confirm &amp; Exit</>}
            </button>
          </div>
        </>
      )}

      {phase === 'done' && receipt && (
        <div className="up-success">
          <CheckCircle2 size={56} className="up-success-icon" />
          <h3>Exit Complete</h3>
          <p style={{color:'#94a3b8',marginBottom:4}}>Thank you for using ParkEase</p>
          <div className="up-token">
            <div className="up-token-row"><span>Vehicle</span><strong>{receipt.vehicleId || vehicleId.toUpperCase()}</strong></div>
            <div className="up-token-row"><span>Duration</span><strong>{receipt.duration || duration}</strong></div>
            <div className="up-token-row"><span>Payment</span><strong style={{textTransform:'capitalize'}}>{receipt.paymentMethod || payMethod}</strong></div>
            <div className="up-token-row total"><span>Amount Paid</span><strong>₹{receipt.totalAmount ?? receipt.amount ?? '—'}</strong></div>
          </div>
          <button className="up-btn up-btn-ghost full-width" onClick={reset}>Exit Another Vehicle</button>
        </div>
      )}
    </div>
  );
};

/* ── LookupTab ───────────────────────────────────────────────────── */
const LookupTab = () => {
  const [vid, setVid]       = useState('');
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState(null);
  const [bill, setBill]     = useState(null);
  const [notFound, setNF]   = useState(false);

  const lookup = async (e) => {
    e.preventDefault();
    if (!vid || vid.length < 3) { toast.error('Enter a valid vehicle number'); return; }
    setLoading(true); setResult(null); setBill(null); setNF(false);
    try {
      const [lk, bl] = await Promise.all([
        vehicleService.lookup(vid.toUpperCase()),
        vehicleService.getBill(vid.toUpperCase()),
      ]);
      setResult(lk.data.data || lk.data);
      setBill(bl.data.data || bl.data);
    } catch (err) {
      if (err.response?.status === 404) setNF(true);
      else toast.error(err.response?.data?.message || 'Lookup failed');
    } finally { setLoading(false); }
  };

  const duration = result
    ? (result.duration || (result.durationMinutes >= 60
        ? `${Math.floor(result.durationMinutes / 60)}h ${result.durationMinutes % 60}m`
        : `${result.durationMinutes ?? 0}m`))
    : '—';

  return (
    <div className="up-panel">
      <Search size={36} className="up-tab-icon" />
      <h3>Vehicle Lookup</h3>
      <p>Check if your vehicle is parked and current charges</p>

      <form className="up-search-form" onSubmit={lookup}>
        <div className="up-field">
          <label><Car size={13} /> Vehicle Number</label>
          <input className="up-input upper big" value={vid}
            onChange={e => setVid(e.target.value.toUpperCase())}
            placeholder="e.g. MH12AB1234" maxLength={12} />
        </div>
        <button className="up-btn up-btn-primary full-width" type="submit" disabled={loading}>
          {loading ? <span className="up-spin" /> : <><Search size={16} /> Lookup Vehicle</>}
        </button>
      </form>

      {notFound && (
        <div className="up-not-found"><AlertCircle size={18} /> Vehicle not found in parking lot</div>
      )}

      {result && (
        <div className="up-lookup-result">
          <div className="up-result-header">
            <span className="up-vid-badge">{result.vehicleId}</span>
            <span className="up-vtype" style={{textTransform:'capitalize'}}>{result.vehicleType}</span>
          </div>
          <div className="up-result-grid">
            <div className="up-result-item">
              <MapPin size={14} />
              {result.slot?.code
                ? `Slot ${result.slot.code} · Floor ${result.slot.floor} · Zone ${result.slot.zone}`
                : '—'}
            </div>
            <div className="up-result-item">
              <Clock size={14} /> In: {result.entryTime ? new Date(result.entryTime).toLocaleTimeString() : '—'}
            </div>
            <div className="up-result-item" style={{gridColumn:'1/-1'}}>
              <Clock size={14} /> Parked for: <strong style={{marginLeft:4}}>{duration}</strong>
            </div>
          </div>
          <div className="up-current-charges">
            <span>Current charges</span>
            <span>
              <strong>₹{result.currentCharges ?? bill?.estimatedTotal ?? bill?.totalAmount ?? '—'}</strong>
              <small>(estimated)</small>
            </span>
          </div>
        </div>
      )}
    </div>
  );
};

/* ── WalletTab ───────────────────────────────────────────────────── */
const WalletTab = () => {
  const [step, setStep]     = useState(1);
  const [phone, setPhone]   = useState('');
  const [balance, setBalance] = useState(0);
  const [amount, setAmount] = useState('');
  const [loading, setLoading] = useState(false);
  const quickAmts = [50, 100, 200, 500];

  const loadWallet = (e) => {
    e.preventDefault();
    if (!phone || phone.length < 10) { toast.error('Enter a valid 10-digit phone number'); return; }
    setBalance(getWalletBalance(phone));
    setStep(2);
  };

  const addMoney = async (e) => {
    e.preventDefault();
    const amt = Number(amount);
    if (!amt || amt < 10) { toast.error('Enter at least ₹10'); return; }
    setLoading(true);
    await new Promise(r => setTimeout(r, 700));
    const newBal = balance + amt;
    setWalletBalance(phone, newBal);
    setBalance(newBal);
    setAmount('');
    setLoading(false);
    toast.success(`₹${amt} added to wallet!`);
  };

  return (
    <div className="up-panel">
      <Wallet size={36} className="up-tab-icon wallet" />
      <h3>Your Wallet</h3>
      <p>Add money and pay for parking seamlessly</p>

      {step === 1 && (
        <form className="up-wallet-form" onSubmit={loadWallet}>
          <div className="up-field">
            <label><Phone size={13} /> Phone Number</label>
            <input className="up-input big" value={phone}
              onChange={e => setPhone(e.target.value.replace(/\D/g,'').slice(0,10))}
              placeholder="10-digit mobile number" maxLength={10} />
          </div>
          <button className="up-btn up-btn-primary full-width" type="submit">
            <ArrowRight size={16} /> Access Wallet
          </button>
        </form>
      )}

      {step === 2 && (
        <div className="up-wallet-form">
          <div className="up-wallet-balance">
            <Wallet size={28} />
            <div>
              <span>Available Balance</span>
              <strong>₹{balance.toFixed(2)}</strong>
            </div>
          </div>
          <form onSubmit={addMoney}>
            <div className="up-field">
              <label><Plus size={13} /> Add Money (₹)</label>
              <div className="up-quick-amounts">
                {quickAmts.map(a => (
                  <button key={a} type="button"
                    className={`up-quick-amt ${Number(amount) === a ? 'selected' : ''}`}
                    onClick={() => setAmount(String(a))}>
                    ₹{a}
                  </button>
                ))}
              </div>
              <input className="up-input big" type="number" min="10" value={amount}
                onChange={e => setAmount(e.target.value)} placeholder="Or enter custom amount" />
            </div>
            <button className="up-btn up-btn-primary full-width" type="submit" disabled={loading}>
              {loading ? <span className="up-spin" /> : <><Plus size={15} /> Add Money</>}
            </button>
          </form>
          <div className="up-wallet-note"><AlertCircle size={12} /> Wallet balance is stored locally for demo purposes</div>
          <button className="up-btn up-btn-ghost full-width" style={{marginTop:10}} onClick={() => setStep(1)}>
            Switch Account
          </button>
        </div>
      )}
    </div>
  );
};

/* ── Tabs config ─────────────────────────────────────────────────── */
const tabs = [
  { id: 'book',   label: 'Park',   Icon: ParkingCircle, component: BookTab   },
  { id: 'exit',   label: 'Exit',   Icon: LogOut,        component: ExitTab   },
  { id: 'lookup', label: 'Lookup', Icon: Search,        component: LookupTab },
  { id: 'wallet', label: 'Wallet', Icon: Wallet,        component: WalletTab },
];

/* ── UserPortal ──────────────────────────────────────────────────── */
const UserPortal = () => {
  const [activeTab, setActiveTab] = useState('book');
  const [isVerified, setIsVerified] = useState(false);
  const ActiveComp = tabs.find(t => t.id === activeTab)?.component || BookTab;

  return (
    <div className="user-portal">
      {/* Header */}
      <header className="up-header">
        <div className="up-brand">
          <div className="up-logo"><ParkingCircle size={20} color="#fff" /></div>
          <span>ParkEase</span>
        </div>
        <div className="up-header-right">
          <SlotStatus />
          <Link to="/login" className="up-admin-link">
            <LayoutDashboard size={14} /> Admin
          </Link>
        </div>
      </header>

      {/* Hero */}
      <section className="up-hero">
        <h1>Smart Parking, <br />Zero Hassle</h1>
        <p>Park, pay & manage your vehicle in seconds</p>
      </section>

      {/* Tabs */}
      <nav className="up-tab-bar">
        {tabs.map(t => {
          const locked = !isVerified && t.id !== 'book';
          return (
            <button
              key={t.id}
              className={`up-tab ${activeTab === t.id ? 'active' : ''} ${locked ? 'locked' : ''}`}
              onClick={() => {
                if (locked) { toast('Verify your phone in the Park tab to unlock this feature'); return; }
                setActiveTab(t.id);
              }}
              title={locked ? 'Verify or register to unlock' : t.label}
            >
              <t.Icon size={16} />
              <span>{t.label}</span>
              {locked && <Lock size={10} style={{ marginLeft: 3, opacity: 0.6 }} />}
            </button>
          );
        })}
      </nav>

      {/* Content */}
      <main className="up-body">
        <div className="tab-content">
          <ActiveComp onVerified={() => setIsVerified(true)} />
        </div>
      </main>

      {/* Footer */}
      <footer className="up-footer">ParkEase © {new Date().getFullYear()} · Smart Parking System</footer>
    </div>
  );
};

export default UserPortal;
