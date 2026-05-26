import React, { useState, useEffect } from 'react';
import { 
  Building2, 
  Search, 
  SlidersHorizontal, 
  Sparkles, 
  CreditCard, 
  Wrench, 
  Calendar, 
  Clock, 
  FileCheck2, 
  Download, 
  Send,
  AlertTriangle,
  HelpCircle,
  QrCode,
  ShieldCheck,
  CheckCircle,
  Compass,
  ArrowRight,
  Info,
  Trash2,
  FileText,
  Image as ImageIcon,
  UploadCloud,
  Loader2,
  X
} from 'lucide-react';
import { User, Room, Booking, Payment, Complaint, LeaveRequest, Attendance, Notification } from '../types';
import PaymentModal from '../components/PaymentModal';
import GmailDashboard from '../components/GmailDashboard';

interface StudentDashboardProps {
  user: User;
  token: string;
  activeTab: string;
  setActiveTab: (tab: string) => void;
  showToast: (msg: string, type: 'success' | 'err' | 'info') => void;
  onRefreshGlobalNotifs: () => void;
}

export default function StudentDashboard({ user, token, activeTab, setActiveTab, showToast, onRefreshGlobalNotifs }: StudentDashboardProps) {
  // DB States
  const [rooms, setRooms] = useState<Room[]>([]);
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [payments, setPayments] = useState<Payment[]>([]);
  const [complaints, setComplaints] = useState<Complaint[]>([]);
  const [leaves, setLeaves] = useState<LeaveRequest[]>([]);
  const [attendance, setAttendance] = useState<Attendance[]>([]);

  // Filter States
  const [typeFilter, setTypeFilter] = useState<'all' | 'AC' | 'Non-AC' | 'Deluxe'>('all');
  const [floorFilter, setFloorFilter] = useState<number | 'all'>('all');
  const [maxBudget, setMaxBudget] = useState<number>(9000);

  // Smart recommendation criteria states
  const [recommendPrefs, setRecommendPrefs] = useState('AC deluxe room with balcony and private attached bathroom below budget ₹9000');
  const [aiRecommendResult, setAiRecommendResult] = useState<any>(null);
  const [recommendingLoading, setRecommendingLoading] = useState(false);

  // Booking states
  const [selectedRoomToBook, setSelectedRoomToBook] = useState<Room | null>(null);
  const [checkoutPayload, setCheckoutPayload] = useState<any>(null);
  const [submittingBooking, setSubmittingBooking] = useState(false);

  // Outstation leave states
  const [leaveReason, setLeaveReason] = useState('');
  const [leaveFrom, setLeaveFrom] = useState('');
  const [leaveTo, setLeaveTo] = useState('');

  // Complaint states
  const [complaintCategory, setComplaintCategory] = useState<'Electricity' | 'Water' | 'WiFi' | 'Cleaning' | 'Furniture'>('Electricity');
  const [complaintPriority, setComplaintPriority] = useState<'Low' | 'Medium' | 'High'>('Medium');
  const [complaintDesc, setComplaintDesc] = useState('');
  const [complaintImageUrl, setComplaintImageUrl] = useState('');
  const [uploadingImage, setUploadingImage] = useState(false);
  const [dragActive, setDragActive] = useState(false);

  // Attendance check-in states
  const [checkingAttendance, setCheckingAttendance] = useState(false);

  // Active Booking pointer
  const activeBooking = bookings.find(b => b.status === 'Approved');
  const allocatedRoom = rooms.find(r => r.id === activeBooking?.roomId);

  useEffect(() => {
    fetchUserData();
  }, [activeTab]);

  const fetchUserData = async () => {
    try {
      const headers = { Authorization: `Bearer ${token}` };
      
      const [roomsRes, bkgRes, payRes, compRes, leaveRes, attRes] = await Promise.all([
        fetch('/api/rooms'),
        fetch('/api/bookings', { headers }),
        fetch('/api/payments', { headers }),
        fetch('/api/complaints', { headers }),
        fetch('/api/leave', { headers }),
        fetch('/api/attendance', { headers })
      ]);

      if (roomsRes.ok) setRooms(await roomsRes.json());
      if (bkgRes.ok) setBookings(await bkgRes.json());
      if (payRes.ok) setPayments(await payRes.json());
      if (compRes.ok) setComplaints(await compRes.json());
      if (leaveRes.ok) setLeaves(await leaveRes.json());
      if (attRes.ok) setAttendance(await attRes.json());
    } catch (err) {
      console.error('Error fetching dashboard rosters', err);
    }
  };

  // Get AI smart recommendations based on user text preference
  const handleGetSmartAIRecommendation = async () => {
    if (!recommendPrefs.trim()) return;
    setRecommendingLoading(true);
    setAiRecommendResult(null);

    try {
      const res = await fetch('/api/assistant/recommend', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ preferences: recommendPrefs }),
      });
      const data = await res.json();
      setAiRecommendResult(data);
      showToast('AI Room recommendation completed successfully!', 'success');
    } catch (err) {
      showToast('Smart Recommendation error.', 'err');
    } finally {
      setRecommendingLoading(false);
    }
  };

  // Initiate simulated Razorpay SDK Order
  const handleInitiateBooking = async (room: Room) => {
    setSubmittingBooking(true);
    try {
      const res = await fetch('/api/payments/create-order', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ roomId: room.id, term: '6 Months' }),
      });
      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.message || 'Payment initiation failed');
      }

      setCheckoutPayload(data);
      setSelectedRoomToBook(room);
    } catch (err: any) {
      showToast(err.message, 'err');
    } finally {
      setSubmittingBooking(false);
    }
  };

  // Verifies payment on success state
  const handlePaymentSuccess = async (paymentId: string) => {
    try {
      const res = await fetch('/api/payments/verify-payment', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({
          orderId: checkoutPayload.orderId,
          paymentId,
          roomId: selectedRoomToBook!.id,
          term: '6 Months'
        }),
      });
      const data = await res.json();

      if (res.ok) {
        showToast(`Congratulations! Room ${selectedRoomToBook!.roomNumber} booked successfully!`, 'success');
        setSelectedRoomToBook(null);
        setCheckoutPayload(null);
        fetchUserData();
        onRefreshGlobalNotifs();

        // Print Receipt trigger
        window.open(`/api/receipts/${data.booking.id}`, '_blank');
      } else {
        showToast(data.message || 'Signature mismatch.', 'err');
      }
    } catch (err) {
      showToast('Verification endpoint error.', 'err');
    }
  };

  const handleImageUpload = async (file: File) => {
    if (!file) return;
    
    if (!file.type.startsWith('image/')) {
      showToast('Please select a valid image file (PNG/JPEG/GIF).', 'err');
      return;
    }
    
    if (file.size > 5 * 1024 * 1024) {
      showToast('Image file is too large. Max size allowed is 5MB.', 'err');
      return;
    }

    setUploadingImage(true);
    try {
      const reader = new FileReader();
      reader.readAsDataURL(file);
      reader.onloadend = async () => {
        const base64data = reader.result as string;
        try {
          const response = await fetch('/api/upload', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'Authorization': `Bearer ${token}`
            },
            body: JSON.stringify({ image: base64data })
          });
          
          if (response.ok) {
            const data = await response.json();
            setComplaintImageUrl(data.url);
            showToast('Maintenance image uploaded successfully!', 'success');
          } else {
            const errData = await response.json();
            showToast(errData.message || 'Image upload failed.', 'err');
          }
        } catch (postErr) {
          showToast('Network error during image upload.', 'err');
        } finally {
          setUploadingImage(false);
        }
      };
      reader.onerror = () => {
        showToast('Failed to read the image file.', 'err');
        setUploadingImage(false);
      };
    } catch (err) {
      console.error('File preparation error:', err);
      showToast('Error preparing the image file.', 'err');
      setUploadingImage(false);
    }
  };

  const handleDrag = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === "dragenter" || e.type === "dragover") {
      setDragActive(true);
    } else if (e.type === "dragleave") {
      setDragActive(false);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);
    
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      handleImageUpload(e.dataTransfer.files[0]);
    }
  };

  const handlePostComplaint = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!complaintDesc.trim()) return;

    try {
      const res = await fetch('/api/complaints', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({
          category: complaintCategory,
          description: complaintDesc,
          priority: complaintPriority,
          imageUrl: complaintImageUrl
        }),
      });
      if (res.ok) {
        showToast('Complaint registered successfully! Housekeeping alert raised.', 'success');
        setComplaintDesc('');
        setComplaintImageUrl('');
        fetchUserData();
      }
    } catch (err) {
      showToast('Error registering complaint.', 'err');
    }
  };

  const handlePostLeave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!leaveReason.trim() || !leaveFrom || !leaveTo) return;

    try {
      const res = await fetch('/api/leave', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({
          reason: leaveReason,
          fromDate: leaveFrom,
          toDate: leaveTo
        }),
      });
      if (res.ok) {
        showToast('Leave request filed successfully! Forwarded to warden dashboard.', 'success');
        setLeaveReason('');
        setLeaveFrom('');
        setLeaveTo('');
        fetchUserData();
      }
    } catch (err) {
      showToast('Error registering outstation leaves.', 'err');
    }
  };

  const handleAttendanceCheckIn = async () => {
    setCheckingAttendance(true);
    try {
      // Past 9 PM late curfew check warning
      const currentHour = new Date().getHours();
      let lateWarning = '';
      if (currentHour >= 21) {
        lateWarning = 'Late check-in past 9:00 PM curfew. Late entry reason logged.';
      }

      const res = await fetch('/api/attendance/check-in', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ reason: lateWarning }),
      });
      const data = await res.json();
      if (res.ok) {
        showToast(currentHour >= 21 ? 'Curfew Late check-in authorized.' : 'Daily Attendance check-in recorded.', 'success');
        fetchUserData();
      } else {
        showToast(data.message || 'Check-in error.', 'info');
      }
    } catch (err) {
      showToast('Node sync failure.', 'err');
    } finally {
      setCheckingAttendance(false);
    }
  };

  const handleAttendanceCheckOut = async () => {
    try {
      const res = await fetch('/api/attendance/check-out', {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.ok) {
        showToast('Checked out for academic hours.', 'success');
        fetchUserData();
      }
    } catch (err) {
      showToast('Check-out error.', 'err');
    }
  };

  const handleVacateRoom = async () => {
    if (!activeBooking || !allocatedRoom) return;
    if (!window.confirm('Are you absolutely certain you wish to vacate your allocated room quarters?')) return;

    try {
      const res = await fetch(`/api/rooms/vacate/${allocatedRoom.id}`, {
        method: 'PUT',
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.ok) {
        showToast(`Quarters vacated. Room ${allocatedRoom.roomNumber} vacated successfully.`, 'info');
        fetchUserData();
        onRefreshGlobalNotifs();
      }
    } catch (err) {
      showToast('Sync error vacating.', 'err');
    }
  };

  // Filter criteria logic
  const filteredRooms = rooms.filter(r => {
    const typeMatch = typeFilter === 'all' || r.type === typeFilter;
    const floorMatch = floorFilter === 'all' || r.floor === Number(floorFilter);
    const budgetMatch = r.price <= maxBudget;
    return typeMatch && floorMatch && budgetMatch;
  });

  return (
    <div className="flex-1 min-h-0 h-full bg-slate-50 p-6 lg:p-10 text-slate-800 flex flex-col justify-between overflow-y-auto w-full pb-16">
      <div>
        {/* Banner Section */}
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-8">
          <div>
            <span className="text-xs text-indigo-600 font-mono tracking-widest uppercase font-semibold">Student Control Panel</span>
            <h1 className="font-display text-2xl lg:text-3xl font-bold tracking-tight text-slate-900 mt-1">
              Welcome back, {user.name}
            </h1>
            <p className="text-sm text-slate-500 mt-1">Track room occupancy, clear payments, raise maintenance, and log outstation leave.</p>
          </div>
          
          {/* Dashboard Status Card */}
          <div className="flex items-center gap-3 p-4 bg-white border border-slate-200/50 rounded-2xl shadow-xs">
            <span className="p-2.5 bg-indigo-50 text-indigo-600 rounded-xl">
              <Building2 className="w-5 h-5" />
            </span>
            <div className="text-left">
              <span className="text-[10px] uppercase font-mono tracking-wider text-slate-400 font-semibold">Allocated Room Status</span>
              <p className="text-sm font-semibold text-slate-800">
                {activeBooking ? `Room ${allocatedRoom?.roomNumber || '...'}` : 'No Room Allocated'}
              </p>
            </div>
          </div>
        </div>

        {/* 1. ROOMS & BOOKING TAB */}
        {activeTab === 'rooms' && (
          <div className="space-y-6">
            
            {/* If booked - show room credentials banner */}
            {activeBooking && allocatedRoom ? (
              <div className="bg-white border border-slate-200 rounded-3xl p-6 shadow-sm flex flex-col md:flex-row justify-between items-start md:items-center gap-6 text-left">
                <div className="flex items-start gap-4">
                  <div className="w-24 h-24 rounded-2xl overflow-hidden bg-slate-100 shrink-0">
                    <img src={allocatedRoom.image} alt="Room" className="w-full h-full object-cover" />
                  </div>
                  <div>
                    <span className="px-2.5 py-0.5 bg-emerald-50 text-emerald-700 border border-emerald-150 text-[10px] font-mono rounded-full font-semibold">ALLOCATED QUARTERS APPROVED</span>
                    <h2 className="font-display font-bold text-lg text-slate-900 mt-1.5">Room Suite {allocatedRoom.roomNumber}</h2>
                    <p className="text-xs text-slate-500 mt-1">Facility: {allocatedRoom.type} AC • Floor: {allocatedRoom.floor}</p>
                    <div className="flex items-center gap-1.5 text-xs text-indigo-600/90 font-medium mt-2">
                       <span>Approved term rate: ₹{allocatedRoom.price}/Month</span>
                    </div>
                  </div>
                </div>
                
                <div className="flex flex-col justify-end text-left sm:text-right gap-2 shrink-0">
                  <button
                    onClick={() => window.open(activeBooking.receiptUrl, '_blank')}
                    id="btn-print-active-receipt"
                    className="flex items-center gap-1.5 px-4.5 py-2.5 bg-slate-900 text-white hover:bg-slate-800 rounded-xl text-xs font-semibold shadow-xs transition-all cursor-pointer"
                  >
                    <Download className="w-4 h-4" />
                    <span>Print Fee Invoice</span>
                  </button>
                  <button
                    onClick={handleVacateRoom}
                    id="btn-vacate-room-active"
                    className="flex items-center gap-1.5 px-4.5 py-2.5 bg-white text-rose-650 hover:bg-rose-50 border border-slate-200 rounded-xl text-xs font-semibold cursor-pointer"
                  >
                    <Trash2 className="w-4 h-4 text-rose-550" />
                    <span>Vacate Quarters Request</span>
                  </button>
                </div>
              </div>
            ) : (
              /* If no room allocated - list room selection and Smart AI widget */
              <div className="grid grid-cols-1 xl:grid-cols-12 gap-8 text-left">
                
                {/* AI recommendation column */}
                <div className="xl:col-span-4 space-y-4">
                  <div className="bg-slate-900 text-white rounded-3xl p-6 shadow-xl relative overflow-hidden flex flex-col justify-between min-h-[360px]">
                    <div className="absolute top-0 right-0 w-44 h-44 bg-indigo-500/10 rounded-full blur-2xl"></div>
                    <div>
                      <div className="flex items-center gap-2 mb-4">
                        <Sparkles className="w-5 h-5 text-indigo-400" />
                        <h3 className="font-display font-semibold text-sm">Gemini AI Support Advisor</h3>
                      </div>
                      <h4 className="font-display font-medium text-lg text-slate-100">Smart Room Recommendations</h4>
                      <p className="text-xs text-slate-400 mt-2 leading-relaxed">Let generative intelligence analyze your budget parameters and amenities, recommending optimal rooms instantly.</p>
                      
                      <div className="mt-5 space-y-3">
                        <textarea
                          rows={3}
                          value={recommendPrefs}
                          onChange={(e) => setRecommendPrefs(e.target.value)}
                          className="w-full bg-slate-800/80 border border-slate-700/60 rounded-xl p-3 text-xs text-slate-100 placeholder-slate-500 focus:border-indigo-500 font-medium"
                          placeholder="Specify custom needs: e.g. Floor 1, deluxe matching budget..."
                        />
                        <button
                          onClick={handleGetSmartAIRecommendation}
                          disabled={recommendingLoading || !recommendPrefs.trim()}
                          id="btn-ai-recommend"
                          className="w-full py-2.5 bg-indigo-600 hover:bg-indigo-700 disabled:opacity-40 text-white rounded-xl text-xs font-semibold shadow-md shadow-indigo-600/10 cursor-pointer"
                        >
                          {recommendingLoading ? 'Evaluating dynamic scoring...' : 'Analyze fit with Gemini'}
                        </button>
                      </div>
                    </div>

                    {/* AI Recommendation response box */}
                    {aiRecommendResult && (
                      <div className="mt-4 p-4 bg-slate-800 rounded-2xl border border-indigo-500/20 text-xs animate-fade-in text-left">
                        <h5 className="font-semibold text-indigo-300 font-display flex items-center gap-1.5 mb-1.5"><Sparkles className="w-3.5 h-3.5 text-indigo-400 animate-pulse" /> AI Selection</h5>
                        <p className="text-slate-350 leading-relaxed font-semibold">{aiRecommendResult.explanation}</p>
                        
                        {aiRecommendResult.rooms && aiRecommendResult.rooms.length > 0 && (
                          <div className="mt-3">
                            <button
                              onClick={() => {
                                const matched = rooms.find(r => r.roomNumber === aiRecommendResult.rooms[0].roomNumber);
                                if (matched) handleInitiateBooking(matched);
                              }}
                              className="px-3.5 py-1.5 bg-white text-slate-900 rounded-lg text-[10px] font-bold hover:bg-slate-100 inline-flex items-center gap-1 cursor-pointer"
                            >
                              <span>Apply allocation</span>
                              <ArrowRight className="w-3 h-3 text-slate-800" />
                            </button>
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                </div>

                {/* Filters and Rooms selection list columns */}
                <div className="xl:col-span-8 space-y-6">
                  
                  {/* Flawless Header Filter bars */}
                  <div className="bg-white border border-slate-200/80 p-5 rounded-3xl flex flex-wrap gap-4 items-center justify-between">
                    <div className="flex gap-2">
                      <SlidersHorizontal className="w-4.5 h-4.5 text-slate-400 mt-1" />
                      <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider font-mono">Filters:</span>
                    </div>

                    <div className="flex flex-wrap gap-3">
                      <div>
                        <select 
                          value={typeFilter}
                          onChange={(e: any) => setTypeFilter(e.target.value)}
                          className="bg-slate-50 border border-slate-200 px-3 py-1.5 rounded-xl text-xs font-medium text-slate-700"
                        >
                          <option value="all">All Room Types</option>
                          <option value="AC">AC Standard</option>
                          <option value="Non-AC">Non-AC Basic</option>
                          <option value="Deluxe">Premium Deluxe</option>
                        </select>
                      </div>

                      <div>
                        <select 
                          value={floorFilter}
                          onChange={(e: any) => setFloorFilter(e.target.value === 'all' ? 'all' : Number(e.target.value))}
                          className="bg-slate-50 border border-slate-200 px-3 py-1.5 rounded-xl text-xs font-medium text-slate-705"
                        >
                          <option value="all">All Floors</option>
                          <option value={1}>Floor 1</option>
                          <option value={2}>Floor 2</option>
                          <option value={3}>Floor 3</option>
                        </select>
                      </div>

                      <div className="flex items-center gap-2">
                        <span className="text-xs text-slate-400 font-medium">Max Limit:</span>
                        <input 
                          type="range" 
                          min={3000}
                          max={9000}
                          step={500}
                          value={maxBudget}
                          onChange={(e) => setMaxBudget(Number(e.target.value))}
                          className="w-24 accent-indigo-600 h-1"
                        />
                        <span className="text-xs font-semibold text-slate-700 font-mono">₹{maxBudget}</span>
                      </div>
                    </div>
                  </div>

                  {/* Rooms Cards distribution layout */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4.5">
                    {filteredRooms.map((room) => {
                      const isFull = room.occupied >= room.capacity;
                      return (
                        <div key={room.id} id={`room-card-${room.id}`} className="bg-white border border-slate-250/70 rounded-3xl overflow-hidden shadow-xs hover:border-indigo-600/30 transition-all duration-200 text-left flex flex-col justify-between">
                          <div>
                            <div className="h-44 bg-slate-100 relative">
                              <img src={room.image} alt="Room space" className="w-full h-full object-cover" />
                              <span className={`absolute top-3.5 right-3.5 px-2.5 py-0.5 rounded-full text-[10px] font-mono tracking-wider font-semibold uppercase ${
                                room.type === 'Deluxe' ? 'bg-indigo-600 text-white' :
                                room.type === 'AC' ? 'bg-cyan-500 text-slate-900 font-bold' :
                                'bg-slate-900 text-slate-100'
                              }`}>
                                {room.type} Suite
                              </span>
                            </div>

                            <div className="p-5.5 space-y-3">
                              <div className="flex items-center justify-between">
                                <h4 className="font-display font-bold text-lg text-slate-900">Room {room.roomNumber}</h4>
                                <span className={`px-2 py-0.5 rounded-full text-[10px] font-semibold tracking-wider font-mono uppercase ${
                                  isFull ? 'bg-rose-50 text-rose-700 border border-rose-100' : 'bg-emerald-50 text-emerald-700 border border-emerald-100'
                                }`}>
                                  {isFull ? `FULL (${room.occupied}/${room.capacity})` : `VACANT (${room.occupied}/${room.capacity} filled)`}
                                </span>
                              </div>

                              <p className="text-slate-400 text-xs font-medium">Floor Level {room.floor} • Accommodates up to {room.capacity} beds.</p>

                              <div className="flex flex-wrap gap-1.5 pt-1.5">
                                {room.amenities.map((a, idx) => (
                                  <span key={idx} className="px-2 py-0.5 bg-slate-100 text-slate-600 border border-slate-200 text-[10px] font-medium rounded-md">
                                    {a}
                                  </span>
                                ))}
                              </div>
                            </div>
                          </div>

                          <div className="p-5.5 pt-0 border-t border-slate-100 mt-2 flex items-center justify-between">
                            <div>
                              <span className="text-[10px] uppercase font-mono tracking-wider text-slate-400 font-semibold">Terms Rate</span>
                              <div className="text-lg font-bold font-display text-slate-950">₹{room.price.toLocaleString('en-IN')}<span className="text-xs font-medium text-slate-500">/mo</span></div>
                            </div>

                            <button
                              onClick={() => handleInitiateBooking(room)}
                              disabled={isFull || submittingBooking}
                              id={`btn-request-allocation-${room.id}`}
                              className="px-4.5 py-2.5 rounded-xl bg-indigo-600 text-white disabled:opacity-40 font-semibold hover:bg-indigo-700 hover:scale-[1.02] shadow-xs cursor-pointer text-xs transition-all"
                            >
                              Allocate Room
                            </button>
                          </div>
                        </div>
                      );
                    })}

                    {filteredRooms.length === 0 && (
                      <div className="col-span-2 py-10 text-center bg-white border border-slate-200/60 rounded-3xl text-sm text-slate-400">
                        No rooms matched your filter parameters. Relocate markers.
                      </div>
                    )}
                  </div>
                </div>

              </div>
            )}

          </div>
        )}

        {/* 2. TRANSACTIONS / PAYMENTS HISTORY TAB */}
        {activeTab === 'payments' && (
          <div className="bg-white border border-slate-200 rounded-3xl p-6 shadow-sm space-y-6 text-left">
            <div>
              <h2 className="font-display font-bold text-lg text-slate-900">Online Fees Ledgers</h2>
              <p className="text-xs text-slate-500 mt-1">Official invoice records handled automatically via Razorpay payment gateways.</p>
            </div>

            <div className="overflow-x-auto rounded-2xl border border-slate-100">
              <table className="w-full text-left text-xs border-collapse">
                <thead className="bg-slate-50 text-slate-500 border-b border-slate-150 uppercase font-mono tracking-wider">
                  <tr>
                    <th className="p-4">Transaction stamp</th>
                    <th className="p-4">Razorpay tracking reference</th>
                    <th className="p-4">Facility Type</th>
                    <th className="p-4 text-right">Amount Out</th>
                    <th className="p-4">Status Clearance</th>
                    <th className="p-4 text-center">Invoices copy</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {payments.map((p) => (
                    <tr key={p.id} className="hover:bg-slate-50/50">
                      <td className="p-4 font-medium text-slate-900">{new Date(p.date).toLocaleString()}</td>
                      <td className="p-4 font-mono font-semibold text-slate-500">{p.razorpayOrderId}</td>
                      <td className="p-4 font-medium"><span className="px-2 py-0.5 bg-indigo-50 border border-indigo-100 rounded text-indigo-700">{p.type}</span></td>
                      <td className="p-4 text-right font-bold text-slate-900">₹{p.amount.toLocaleString()}</td>
                      <td className="p-4">
                        <span className="px-2.5 py-0.5 rounded-full text-[10px] font-semibold bg-emerald-50 text-emerald-800 border border-emerald-150 uppercase font-mono">
                          {p.status}
                        </span>
                      </td>
                      <td className="p-4 text-center">
                        {p.bookingId ? (
                          <button
                            onClick={() => window.open(`/api/receipts/${p.bookingId}`, '_blank')}
                            className="p-1 px-3 text-[11px] font-bold text-indigo-650 hover:bg-slate-100 rounded-lg inline-flex items-center gap-1 cursor-pointer"
                          >
                            <FileText className="w-3.5 h-3.5" />
                            <span>PDF Receipt</span>
                          </button>
                        ) : (
                          <span className="text-slate-300">-</span>
                        )}
                      </td>
                    </tr>
                  ))}
                  
                  {payments.length === 0 && (
                    <tr>
                      <td colSpan={6} className="p-8 text-center text-slate-400">No transactions recorded inside account ledger.</td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* 3. MAINTENANCE/COMPLAINTS TAB */}
        {activeTab === 'complaints' && (
          <div className="grid grid-cols-1 xl:grid-cols-12 gap-8 text-left animate-fade-in">
            
            {/* Left side raised maintenance form */}
            <div className="xl:col-span-5 bg-white border border-slate-200 rounded-3xl p-6 shadow-sm h-fit">
              <div className="mb-5 flex items-center gap-2">
                <Wrench className="w-5 h-5 text-indigo-600" />
                <h3 className="font-display font-bold text-lg text-slate-900">Raise Maintenance Ticket</h3>
              </div>
              <p className="text-slate-500 text-xs leading-relaxed mb-6">Our wardens are assigned automatically upon submission. Expect response updates in-app within 12 Hrs.</p>

              <form onSubmit={handlePostComplaint} className="space-y-4">
                <div>
                  <label className="block text-xs font-semibold uppercase font-mono tracking-wider text-slate-500 mb-1.5">Category Selector</label>
                  <select
                    value={complaintCategory}
                    onChange={(e: any) => setComplaintCategory(e.target.value)}
                    className="w-full text-slate-900 border border-slate-200 rounded-xl px-3.5 py-2.5 text-xs bg-white font-medium h-10"
                  >
                    <option value="Electricity">Electricity & Main Power</option>
                    <option value="Water">Water Systems & Plumbing</option>
                    <option value="WiFi">WiFi Latency & Connectivity</option>
                    <option value="Cleaning">Deep Area Housekeeping</option>
                    <option value="Furniture">Furniture Study Table & Desks</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold uppercase font-mono tracking-wider text-slate-500 mb-1.5">Secretion Priority</label>
                  <select
                    value={complaintPriority}
                    onChange={(e: any) => setComplaintPriority(e.target.value)}
                    className="w-full text-slate-900 border border-slate-200 rounded-xl px-3.5 py-2.5 text-xs bg-white font-medium h-10"
                  >
                    <option value="Low">Low - Schedule Routine</option>
                    <option value="Medium">Medium - Standard Request</option>
                    <option value="High">High - Curfew Emergency</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold uppercase font-mono tracking-wider text-slate-500 mb-1.5">Detailed Complaint criteria</label>
                  <textarea
                    required
                    rows={4}
                    value={complaintDesc}
                    onChange={(e) => setComplaintDesc(e.target.value)}
                    className="w-full border border-slate-200 rounded-xl p-3 text-xs text-slate-900 placeholder-slate-400 font-medium"
                    placeholder="Specify the issue (e.g. Broken wall charger outlet next to study desk in Room 101)"
                  />
                </div>

                <div className="space-y-2">
                  <label className="block text-xs font-semibold uppercase font-mono tracking-wider text-slate-500">
                    Upload Issue Photo (Optional)
                  </label>
                  
                  {complaintImageUrl ? (
                    <div className="relative border border-slate-200 rounded-xl p-3 bg-slate-50 flex items-center gap-3 animate-fade-in">
                      <img 
                        src={complaintImageUrl} 
                        alt="Issue Preview" 
                        className="w-16 h-16 object-cover rounded-lg border border-slate-250 bg-white"
                        referrerPolicy="no-referrer"
                      />
                      <div className="flex-1 min-w-0">
                        <p className="text-[11px] font-bold text-slate-700 truncate">Uploaded Photo</p>
                        <p className="text-[9px] text-emerald-600 font-mono font-bold flex items-center gap-1">
                          <span className="w-1.5 h-1.5 bg-emerald-500 rounded-full animate-ping" />
                          Ready for submission
                        </p>
                      </div>
                      <button
                        type="button"
                        onClick={() => setComplaintImageUrl('')}
                        className="p-1.5 hover:bg-slate-200 rounded-full text-slate-500 hover:text-rose-600 transition-colors cursor-pointer"
                        title="Remove image"
                      >
                        <X className="w-4 h-4" />
                      </button>
                    </div>
                  ) : (
                    <div
                      onDragEnter={handleDrag}
                      onDragOver={handleDrag}
                      onDragLeave={handleDrag}
                      onDrop={handleDrop}
                      className={`relative border-2 border-dashed rounded-xl p-5 text-center transition-all ${
                        dragActive 
                          ? 'border-indigo-500 bg-indigo-50/50' 
                          : 'border-slate-200 hover:border-indigo-400 bg-slate-50/40 hover:bg-slate-50/80'
                      }`}
                    >
                      <input
                        type="file"
                        id="complaint-photo-upload"
                        accept="image/*"
                        onChange={(e) => {
                          if (e.target.files && e.target.files[0]) {
                            handleImageUpload(e.target.files[0]);
                          }
                        }}
                        className="hidden"
                      />
                      
                      <label 
                        htmlFor="complaint-photo-upload" 
                        className="cursor-pointer flex flex-col items-center justify-center gap-2"
                      >
                        {uploadingImage ? (
                          <>
                            <Loader2 className="w-6 h-6 text-indigo-600 animate-spin" />
                            <div className="text-[11px] font-medium text-slate-600">Uploading and processing photo...</div>
                          </>
                        ) : (
                          <>
                            <UploadCloud className={`w-7 h-7 transition-transform ${dragActive ? 'scale-110 text-indigo-500' : 'text-slate-400'}`} />
                            <div className="text-[11px] text-slate-600">
                              <span className="font-bold text-indigo-600 hover:underline">Click to upload</span> or drag & drop
                            </div>
                            <div className="text-[9px] text-slate-400 font-mono">PNG, JPG, GIF up to 5MB</div>
                          </>
                        )}
                      </label>
                    </div>
                  )}
                </div>

                <button
                  type="submit"
                  id="btn-register-complaint"
                  disabled={uploadingImage}
                  className={`w-full py-2.5 text-white rounded-xl text-xs font-semibold shadow-md cursor-pointer transition-all flex items-center justify-center gap-2 ${
                    uploadingImage 
                      ? 'bg-indigo-400 cursor-not-allowed shadow-none' 
                      : 'bg-indigo-600 hover:bg-indigo-700 shadow-indigo-600/10'
                  }`}
                >
                  {uploadingImage ? (
                    <>
                      <Loader2 className="w-3.5 h-3.5 animate-spin" />
                      <span>Uploading Image...</span>
                    </>
                  ) : (
                    <span>Create Maintenance Request</span>
                  )}
                </button>
              </form>
            </div>

            {/* Right side complaints registered log lists */}
            <div className="xl:col-span-7 bg-white border border-slate-200 rounded-3xl p-6 shadow-sm">
              <h3 className="font-display font-medium text-lg text-slate-900 mb-4.5">Account Resolution Timeline</h3>
              
              <div className="space-y-4">
                {complaints.map((c) => (
                  <div key={c.id} className="p-4 border border-slate-150 rounded-2xl bg-slate-50/50 flex flex-col justify-between gap-3 text-xs">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <span className="px-2.5 py-0.5 bg-indigo-50 border border-indigo-100 rounded text-[10px] text-indigo-700 font-mono font-bold uppercase">{c.category}</span>
                        <span className={`px-2 py-0.5 rounded text-[10px] font-mono tracking-wide font-semibold ${
                          c.priority === 'High' ? 'bg-rose-50 text-rose-700' :
                          c.priority === 'Medium' ? 'bg-amber-50 text-amber-700' : 'bg-slate-100 text-slate-505'
                        }`}>
                          {c.priority} Priority
                        </span>
                      </div>

                      <span className={`px-2 py-0.5 text-[10px] font-mono rounded-full font-bold uppercase ${
                        c.status === 'Resolved' ? 'bg-emerald-100 text-emerald-800' :
                        c.status === 'In Progress' ? 'bg-cyan-100 text-cyan-800' : 'bg-amber-100 text-amber-800 animate-pulse'
                      }`}>
                        {c.status}
                      </span>
                    </div>

                    <p className="text-slate-700 leading-relaxed font-semibold">{c.description}</p>
                    
                    {c.imageUrl && (
                      <div className="mt-2.5 rounded-xl overflow-hidden border border-slate-200 border-dashed max-w-sm bg-white p-1 shadow-sm flex items-center justify-start animate-fade-in">
                        <img 
                          src={c.imageUrl} 
                          alt="Maintenance issue attachment" 
                          className="max-h-56 w-full object-cover rounded-lg"
                          referrerPolicy="no-referrer"
                        />
                      </div>
                    )}
                    
                    {c.comments && c.comments.length > 0 && (
                      <div className="border-t border-slate-200/80 pt-3 mt-1 text-[11px] text-slate-600 space-y-1 bg-white p-2.5 rounded-xl border border-dashed">
                        <span className="font-display font-bold text-slate-800 uppercase text-[9px] tracking-wider">Staff resolution comments:</span>
                        {c.comments.map((comm, idx) => (
                          <p key={idx} className="leading-normal font-mono">• {comm}</p>
                        ))}
                      </div>
                    )}

                    <div className="text-[10px] text-slate-400 font-mono self-end">Filed stamp: {new Date(c.createdAt).toLocaleString()}</div>
                  </div>
                ))}

                {complaints.length === 0 && (
                  <div className="py-12 text-center text-slate-400 border border-dashed rounded-2xl">
                    No active maintenance tickets filed with our wardens. All clear!
                  </div>
                )}
              </div>
            </div>

          </div>
        )}

        {/* 4. LEAVE REQEUESTS TAB */}
        {activeTab === 'leaves' && (
          <div className="grid grid-cols-1 xl:grid-cols-12 gap-8 text-left animate-fade-in">
            
            {/* Applied leave parameters card */}
            <div className="xl:col-span-5 bg-white border border-slate-200 rounded-3xl p-6 shadow-sm h-fit">
              <div className="mb-5 flex items-center gap-2">
                <Calendar className="w-5 h-5 text-indigo-600" />
                <h3 className="font-display font-bold text-lg text-slate-900">Request Leave Clearance</h3>
              </div>
              <p className="text-slate-500 text-xs leading-relaxed mb-6">File leaves 48 Hours prior to academic departure. Ensure correct hometown travel specs are mentioned.</p>

              <form onSubmit={handlePostLeave} className="space-y-4">
                <div className="grid grid-cols-2 gap-3.5">
                  <div>
                    <label className="block text-xs font-semibold uppercase font-mono tracking-wider text-slate-500 mb-1.5">Departure stamp</label>
                    <input
                      type="date"
                      required
                      value={leaveFrom}
                      onChange={(e) => setLeaveFrom(e.target.value)}
                      className="w-full text-xs font-semibold uppercase border border-slate-200 rounded-xl px-3.5 py-2.5 bg-white text-slate-900"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold uppercase font-mono tracking-wider text-slate-500 mb-1.5">Return stamp</label>
                    <input
                      type="date"
                      required
                      value={leaveTo}
                      onChange={(e) => setLeaveTo(e.target.value)}
                      className="w-full text-xs font-semibold uppercase border border-slate-200 rounded-xl px-3.5 py-2.5 bg-white text-slate-900"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-semibold uppercase font-mono tracking-wider text-slate-500 mb-1.5">Detailed explanation</label>
                  <textarea
                    required
                    rows={4}
                    value={leaveReason}
                    onChange={(e) => setLeaveReason(e.target.value)}
                    className="w-full border border-slate-200 rounded-xl p-3 text-xs text-slate-900 placeholder-slate-400 font-medium"
                    placeholder="sister marriage Hometown check-in, medical prescription reference, etc."
                  />
                </div>

                <div className="p-3 bg-indigo-50 border border-indigo-100 rounded-xl text-[10px] text-indigo-900 flex items-start gap-1.5">
                  <span className="font-bold">CURFEW NOTE:</span> Outstation status leaves disable daily curfew check-in requirements during specified dates automatically.
                </div>

                <button
                  type="submit"
                  id="btn-apply-leave"
                  className="w-full py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-semibold shadow-md shadow-indigo-600/10 cursor-pointer"
                >
                  Apply Leave Authorization
                </button>
              </form>
            </div>

            {/* Leave registers table logs column */}
            <div className="xl:col-span-7 bg-white border border-slate-200 rounded-3xl p-6 shadow-sm">
              <h3 className="font-display font-medium text-lg text-slate-900 mb-4.5">Holiday Outstation Journals</h3>
              
              <div className="space-y-4">
                {leaves.map((l) => (
                  <div key={l.id} className="p-4 border border-slate-150 rounded-2xl bg-slate-50/50 flex items-center justify-between text-xs gap-4">
                    <div className="text-left space-y-1.5">
                      <div className="flex items-center gap-2">
                        <span className="font-display font-bold text-slate-800">Clearance frame: {l.fromDate} → {l.toDate}</span>
                      </div>
                      <p className="text-slate-500 leading-relaxed font-medium">{l.reason}</p>
                    </div>

                    <span className={`px-2.5 py-0.5 text-[10px] font-mono font-bold rounded-full uppercase shrink-0 ${
                      l.status === 'Approved' ? 'bg-emerald-50 text-emerald-800 border border-emerald-150' : 
                      l.status === 'Rejected' ? 'bg-rose-50 text-rose-800 border border-rose-150' :
                      'bg-amber-50 text-amber-800 border border-amber-150 animate-pulse'
                    }`}>
                      {l.status}
                    </span>
                  </div>
                ))}

                {leaves.length === 0 && (
                  <div className="py-12 text-center text-slate-400 border border-dashed rounded-2xl">
                    No registered leaves found. Outstation records are empty.
                  </div>
                )}
              </div>
            </div>

          </div>
        )}

        {/* 5. INDIVIDUAL ATTENDANCE & CURFEW CHECKS TAB */}
        {activeTab === 'attendance' && (
          <div className="grid grid-cols-1 xl:grid-cols-12 gap-8 text-left animate-fade-in text-xs">
            
            {/* Clock action curfew portal checkin cards */}
            <div className="xl:col-span-5 bg-white border border-slate-200 rounded-3xl p-6 shadow-sm space-y-5 h-fit text-left">
              <div className="flex items-center gap-2">
                <Clock className="w-5 h-5 text-indigo-600" />
                <h3 className="font-display font-bold text-lg text-slate-900">Curfew check-in Registry</h3>
              </div>

              {/* Live indicators mock */}
              <div className="p-4 bg-slate-900 text-slate-100 rounded-2xl border border-slate-800 flex justify-between items-center bg-radial">
                <div>
                  <span className="text-[10px] font-mono text-indigo-400 tracking-wider">HOSTEL TIMEZONE GMT+5.5</span>
                  <div className="text-2xl font-bold font-display mt-0.5">21:00 Curfew</div>
                </div>
                <div className="px-3.5 py-1.5 bg-emerald-500/10 border border-emerald-500/20 text-emerald-300 rounded-xl text-center">
                  <span className="text-[10px] uppercase font-mono tracking-widest font-semibold block">CURFEW STATUS</span>
                  <span className="text-xs font-bold uppercase animate-pulse">Online</span>
                </div>
              </div>

              <p className="text-slate-500 leading-relaxed font-semibold">Under university hostel codes, daily curfew check-ins must be marked before 9:00 PM. Check-ins past curfew will be logged as <b>LATE</b> with reasoning parameters.</p>

              <div className="grid grid-cols-2 gap-3 pb-2 pt-1.5">
                <button
                  type="button"
                  id="btn-attendance-checkin"
                  onClick={handleAttendanceCheckIn}
                  className="py-3 bg-indigo-600 text-white hover:bg-indigo-700 text-xs font-semibold rounded-xl flex items-center justify-center gap-1.5 cursor-pointer"
                >
                  <CheckCircle className="w-4.5 h-4.5" />
                  <span>Check In Daily</span>
                </button>

                <button
                  type="button"
                  id="btn-attendance-checkout"
                  onClick={handleAttendanceCheckOut}
                  className="py-3 bg-white text-slate-800 border border-slate-200 hover:bg-slate-100 text-xs font-semibold rounded-xl flex items-center justify-center gap-1.5 cursor-pointer"
                >
                  <QrCode className="w-4.5 h-4.5" />
                  <span>Academic Checkout</span>
                </button>
              </div>

              <div className="p-4 bg-amber-50 border border-amber-250 rounded-2xl text-amber-800 space-y-1.5">
                <h5 className="font-bold flex items-center gap-1.5 text-amber-900"><AlertTriangle className="w-4.5 h-4.5 text-amber-600" /> Attendance Audits</h5>
                <p className="leading-relaxed">Repeated late curfew entries will trigger automatic staff email updates to authorized warden lines immediately.</p>
              </div>
            </div>

            {/* Curfew history roster log tabular */}
            <div className="xl:col-span-7 bg-white border border-slate-200 rounded-3xl p-6 shadow-sm">
              <h3 className="font-display font-medium text-lg text-slate-900 mb-4">Historical Curfew Registers</h3>

              <div className="overflow-x-auto rounded-2xl border border-slate-100">
                <table className="w-full text-left font-medium border-collapse">
                  <thead className="bg-slate-50 text-slate-500 border-b border-slate-150 uppercase font-mono tracking-widest">
                    <tr>
                      <th className="p-3">Roster Date</th>
                      <th className="p-3">Check-In stamp</th>
                      <th className="p-3">Check-Out stamp</th>
                      <th className="p-3">Status</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 bg-white">
                    {attendance.map((a) => (
                      <tr key={a.id} className="hover:bg-slate-50/50">
                        <td className="p-3 font-semibold text-slate-900">{a.date}</td>
                        <td className="p-3 font-mono">{a.checkIn || '-'}</td>
                        <td className="p-3 font-mono">{a.checkOut || '-'}</td>
                        <td className="p-3">
                          <span className={`px-2 py-0.5 text-[10px] font-mono font-bold uppercase rounded-full ${
                            a.status === 'Present' ? 'bg-emerald-50 text-emerald-800 border border-emerald-150' :
                            a.status === 'Late' ? 'bg-amber-50 text-amber-800 border border-amber-150' : 'bg-rose-50 text-rose-800 border border-rose-150 shadow-xs'
                          }`}>
                            {a.status}
                          </span>
                        </td>
                      </tr>
                    ))}

                    {attendance.length === 0 && (
                      <tr>
                        <td colSpan={4} className="p-6 text-center text-slate-400">No attendance data matching your credentials. Check in above.</td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>

          </div>
        )}

        {/* 6. AI SUPPORT CHAT CONSOLE TAB */}
        {activeTab === 'ai-concierge' && (
          <div className="bg-white border border-slate-200 rounded-3xl p-6 shadow-sm text-left max-w-2xl mx-auto space-y-6">
            <div>
              <h2 className="font-display font-bold text-lg text-slate-900">Conversational AI support concierge</h2>
              <p className="text-slate-500 text-xs mt-1">Settle query, analyze curfew, check room rules dynamically with our natural-sounding model.</p>
            </div>
            <div className="p-4 bg-indigo-50 border border-indigo-100 rounded-2xl text-indigo-900 text-xs flex items-start gap-1.5 leading-relaxed font-semibold">
              <Sparkles className="w-5 h-5 text-indigo-600 shrink-0 mt-0.5 animate-pulse" />
              <span>Feel free to type any query directly. The chatbot will scan the available properties and policy details and answer with structured solutions!</span>
            </div>
          </div>
        )}

        {/* 7. GMAIL HUB CONSOLE TAB */}
        {activeTab === 'gmail' && (
          <GmailDashboard user={user} showToast={showToast} />
        )}

      </div>

      {/* Embedded checkout trigger */}
      {selectedRoomToBook && checkoutPayload && (
        <PaymentModal
          room={selectedRoomToBook}
          amount={checkoutPayload.amount}
          orderId={checkoutPayload.orderId}
          term={checkoutPayload.term}
          onSuccess={handlePaymentSuccess}
          onClose={() => { setSelectedRoomToBook(null); setCheckoutPayload(null); }}
        />
      )}
    </div>
  );
}
