import React, { useState } from 'react';
import { 
  CreditCard, 
  Smartphone, 
  Building, 
  ShieldCheck, 
  Lock, 
  Wallet,
  AlertCircle,
  X,
  Sparkles,
  Loader2
} from 'lucide-react';
import { Room } from '../types';

interface PaymentModalProps {
  room: Room;
  amount: number;
  orderId: string;
  term: string;
  onSuccess: (paymentId: string) => void;
  onClose: () => void;
}

export default function PaymentModal({ room, amount, orderId, term, onSuccess, onClose }: PaymentModalProps) {
  const [method, setMethod] = useState<'card' | 'upi' | 'netbanking'>('card');
  const [step, setStep] = useState<'details' | 'otp' | 'success'>('details');
  const [loading, setLoading] = useState(false);
  const [otp, setOtp] = useState('');
  
  // Form fields
  const [cardNumber, setCardNumber] = useState('4111 2222 3333 4444');
  const [cardExpiry, setCardExpiry] = useState('12/28');
  const [cardCvv, setCardCvv] = useState('123');
  const [cardName, setCardName] = useState('Pavan Bukka');
  const [upiId, setUpiId] = useState('pavan@okaxis');

  const handleCardFormat = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value.replace(/\s?/g, '').replace(/(\d{4})/g, '$1 ').trim();
    setCardNumber(val.slice(0, 19));
  };

  const handleStartAuthorize = (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setTimeout(() => {
      setLoading(false);
      setStep('otp');
    }, 1500);
  };

  const handleVerifyOtp = (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    // Call success signature flow
    setTimeout(() => {
      setLoading(false);
      setStep('success');
      setTimeout(() => {
        onSuccess(`pay_${Math.random().toString(36).substr(2, 9).toUpperCase()}`);
      }, 2000);
    }, 2000);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/75 backdrop-blur-sm p-4 animate-fade-in">
      <div className="bg-white rounded-3xl w-full max-w-md shadow-2xl overflow-hidden border border-slate-100 flex flex-col relative">
        
        {/* Gateway branding header */}
        <div className="bg-slate-900 p-6 text-white flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="p-1.5 bg-indigo-600 rounded-lg">
              <Sparkles className="w-4 h-4 text-white" />
            </div>
            <div>
              <h2 className="font-display text-sm font-semibold tracking-wide uppercase">Razorpay Secure</h2>
              <p className="text-[10px] text-slate-400 font-mono">ORDER ID: {orderId}</p>
            </div>
          </div>
          {step !== 'success' && (
            <button 
              onClick={onClose}
              id="payment-modal-close" 
              className="text-slate-400 hover:text-white p-1 rounded-full transition-colors hover:bg-slate-800"
            >
              <X className="w-5 h-5" />
            </button>
          )}
        </div>

        {/* Hostel brief banner */}
        <div className="bg-indigo-50/50 px-6 py-4.5 border-b border-indigo-100/50 flex align-center justify-between">
          <div>
            <p className="text-xs text-slate-500">Hostel Allocation Fee</p>
            <h4 className="text-sm font-semibold text-slate-800">Room {room.roomNumber} ({room.type}) • {term}</h4>
          </div>
          <div className="text-right">
            <span className="text-xs font-mono text-indigo-600 font-medium">INR</span>
            <div className="text-xl font-bold font-display text-slate-950">₹{amount.toLocaleString('en-IN')}</div>
          </div>
        </div>

        {/* Core Wizard steps */}
        <div className="p-6 flex-1 min-h-[300px] flex flex-col">
          {step === 'details' && (
            <>
              {/* Payment Methods tabs selector */}
              <div className="grid grid-cols-3 gap-2 mb-6 bg-slate-50 p-1 rounded-2xl border border-slate-200/50">
                <button
                  type="button"
                  onClick={() => setMethod('card')}
                  className={`flex flex-col items-center gap-1.5 py-2.5 rounded-xl text-xs font-medium transition-all ${
                    method === 'card' 
                      ? 'bg-white text-indigo-600 shadow-sm border border-slate-200/10' 
                      : 'text-slate-500 hover:text-slate-800'
                  }`}
                >
                  <CreditCard className="w-4 h-4" />
                  <span>Card</span>
                </button>
                <button
                  type="button"
                  onClick={() => setMethod('upi')}
                  className={`flex flex-col items-center gap-1.5 py-2.5 rounded-xl text-xs font-medium transition-all ${
                    method === 'upi' 
                      ? 'bg-white text-indigo-600 shadow-sm border border-slate-200/10' 
                      : 'text-slate-500 hover:text-slate-800'
                  }`}
                >
                  <Smartphone className="w-4 h-4" />
                  <span>UPI ID</span>
                </button>
                <button
                  type="button"
                  onClick={() => setMethod('netbanking')}
                  className={`flex flex-col items-center gap-1.5 py-2.5 rounded-xl text-xs font-medium transition-all ${
                    method === 'netbanking' 
                      ? 'bg-white text-indigo-600 shadow-sm border border-slate-200/10' 
                      : 'text-slate-500 hover:text-slate-800'
                  }`}
                >
                  <Building className="w-4 h-4" />
                  <span>Net Banking</span>
                </button>
              </div>

              {/* Dynamic form */}
              <form onSubmit={handleStartAuthorize} className="flex-1 flex flex-col justify-between">
                <div>
                  {method === 'card' && (
                    <div className="space-y-4 animate-fade-in text-left">
                      <div>
                        <label className="block text-xs font-medium text-slate-500 mb-1.5 uppercase font-mono">Credit/Debit Card Number</label>
                        <div className="relative">
                          <input 
                            type="text" 
                            required
                            value={cardNumber}
                            onChange={handleCardFormat}
                            className="w-full text-slate-900 border border-slate-200 rounded-xl px-3.5 py-2.5 text-sm font-semibold bg-white"
                            placeholder="4111 2222 3333 4444"
                          />
                          <div className="absolute right-3.5 top-3 text-slate-400">
                            <CreditCard className="w-4.5 h-4.5" />
                          </div>
                        </div>
                      </div>

                      <div className="grid grid-cols-2 gap-3.5">
                        <div>
                          <label className="block text-xs font-medium text-slate-500 mb-1.5 uppercase font-mono">Expiry Stamp</label>
                          <input 
                            type="text" 
                            required
                            value={cardExpiry}
                            onChange={(e) => setCardExpiry(e.target.value)}
                            maxLength={5}
                            className="w-full font-semibold border border-slate-200 rounded-xl px-3.5 py-2.5 text-sm uppercase bg-white text-center"
                            placeholder="MM/YY"
                          />
                        </div>
                        <div>
                          <label className="block text-xs font-medium text-slate-500 mb-1.5 uppercase font-mono">Security CVV</label>
                          <input 
                            type="password" 
                            required
                            value={cardCvv}
                            onChange={(e) => setCardCvv(e.target.value.slice(0, 3))}
                            className="w-full font-semibold border border-slate-200 rounded-xl px-3.5 py-2.5 text-sm bg-white text-center text-slate-950"
                            placeholder="•••"
                          />
                        </div>
                      </div>

                      <div>
                        <label className="block text-xs font-medium text-slate-500 mb-1.5 uppercase font-mono">Name on Card</label>
                        <input 
                          type="text" 
                          required
                          value={cardName}
                          onChange={(e) => setCardName(e.target.value)}
                          className="w-full border border-slate-200 rounded-xl px-3.5 py-2.5 text-sm font-medium bg-white"
                          placeholder="Pavan Bukka"
                        />
                      </div>
                    </div>
                  )}

                  {method === 'upi' && (
                    <div className="space-y-4 animate-fade-in text-left">
                      <div>
                        <label className="block text-xs font-medium text-slate-500 mb-1.5 uppercase font-mono">Virtual Payment Address (VPA)</label>
                        <div className="relative">
                          <input 
                            type="text" 
                            required
                            value={upiId}
                            onChange={(e) => setUpiId(e.target.value)}
                            className="w-full text-slate-900 border border-slate-200 rounded-xl px-3.5 py-2.5 text-sm font-semibold bg-white"
                            placeholder="username@okaxis"
                          />
                          <div className="absolute right-3.5 top-3 text-slate-400">
                            <Wallet className="w-4.5 h-4.5" />
                          </div>
                        </div>
                        <p className="text-[10px] text-slate-400 mt-2 flex items-start gap-1"><AlertCircle className="w-3.5 h-3.5 text-slate-400 shrink-0 mt-0.5" /> A payment push request will be broadcast to your smartphone provider.</p>
                      </div>
                    </div>
                  )}

                  {method === 'netbanking' && (
                    <div className="space-y-4 animate-fade-in text-left">
                      <div>
                        <label className="block text-xs font-medium text-slate-500 mb-1.5 uppercase font-mono">Select Core Banking Institution</label>
                        <select className="w-full text-slate-900 border border-slate-200 rounded-xl px-3.5 py-2.5 text-sm font-semibold bg-white">
                          <option>State Bank of India (SBI)</option>
                          <option>HDFC Bank</option>
                          <option>ICICI Bank</option>
                          <option>Axis Bank</option>
                          <option>Kotak Mahindra Bank</option>
                        </select>
                      </div>
                    </div>
                  )}
                </div>

                <div className="mt-8 space-y-4">
                  <button
                    type="submit"
                    disabled={loading}
                    id="payment-modal-pay-now"
                    className="w-full flex items-center justify-center gap-2 py-3 bg-slate-900 hover:bg-slate-800 disabled:opacity-50 text-white rounded-xl text-sm font-medium shadow-md shadow-slate-900/10 cursor-pointer"
                  >
                    {loading ? (
                      <>
                        <Loader2 className="w-4 h-4 animate-spin" />
                        <span>Initializing SSL Tunnel...</span>
                      </>
                    ) : (
                      <>
                        <Lock className="w-4 h-4" />
                        <span>Pay ₹{amount.toLocaleString('en-IN')} Now</span>
                      </>
                    )}
                  </button>

                  <div className="flex items-center justify-center gap-2 text-[10px] text-slate-400">
                    <ShieldCheck className="w-4 h-4 text-emerald-500" />
                    <span>256-Bit SSL Encrypted Endpoint • PCI-DSS Certified</span>
                  </div>
                </div>
              </form>
            </>
          )}

          {step === 'otp' && (
            <form onSubmit={handleVerifyOtp} className="flex-1 flex flex-col justify-between text-left">
              <div className="space-y-5 animate-fade-in">
                <div className="p-4 bg-amber-50 border border-amber-200 text-amber-800 rounded-2xl flex items-start gap-2.5">
                  <ShieldCheck className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
                  <div>
                    <h5 className="text-xs font-semibold uppercase font-mono tracking-wider">3D Secure Auth</h5>
                    <p className="text-[11px] mt-0.5">We sent a secure validation token to your registered contact number. Enter <b>112233</b> to complete signature verification.</p>
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-medium text-slate-500 mb-1.5 uppercase font-mono text-center">Verify OTP Number</label>
                  <input
                    type="text"
                    required
                    maxLength={6}
                    value={otp}
                    onChange={(e) => setOtp(e.target.value)}
                    placeholder="••••••"
                    className="w-full text-center tracking-[12px] font-bold text-xl border border-slate-200 rounded-xl px-4 py-3 bg-white text-slate-950"
                  />
                </div>
              </div>

              <div className="mt-8 space-y-4">
                <button
                  type="submit"
                  disabled={loading || otp.length < 4}
                  id="payment-modal-auth"
                  className="w-full flex items-center justify-center gap-2 py-3 bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 text-white rounded-xl text-sm font-medium shadow-md shadow-indigo-600/10 cursor-pointer"
                >
                  {loading ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      <span>Validating Security Signature...</span>
                    </>
                  ) : (
                    <span>Confirm & Authorize Allocation</span>
                  )}
                </button>
                <button
                  type="button"
                  onClick={() => setStep('details')}
                  className="w-full text-center text-xs text-slate-400 hover:text-slate-600 py-1"
                >
                  Change Payment Method
                </button>
              </div>
            </form>
          )}

          {step === 'success' && (
            <div className="flex-1 flex flex-col items-center justify-center text-center p-4 animate-fade-in">
              <div className="w-16 h-16 bg-emerald-50 text-emerald-500 border border-emerald-200 rounded-full flex items-center justify-center shadow-lg shadow-emerald-500/10 mb-5 relative">
                <Loader2 className="w-10 h-10 animate-spin absolute text-slate-100" />
                <ShieldCheck className="w-8 h-8" />
              </div>
              <h3 className="font-display font-bold text-lg text-slate-800">Payment Verified!</h3>
              <p className="text-xs text-slate-400 mt-2 max-w-[280px]">Your hosteling occupancy booking signature has been verified and real-time room rosters synchronized.</p>
              
              <p className="text-[10px] text-indigo-600 font-mono mt-6 uppercase tracking-wider font-semibold animate-pulse">Auto-downloading receipt receipt...</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
