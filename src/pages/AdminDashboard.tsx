import React, { useState, useEffect } from 'react';
import { 
  Building2, 
  Users, 
  Wrench, 
  Calendar, 
  Clock, 
  TrendingUp, 
  DollarSign, 
  Plus, 
  Trash2, 
  Edit, 
  CheckCircle, 
  XCircle, 
  AlertTriangle, 
  Download, 
  ChevronRight,
  Filter,
  Eye,
  Settings,
  ShieldCheck,
  UserPlus
} from 'lucide-react';
import { User, Room, Booking, Payment, Complaint, LeaveRequest, Attendance } from '../types';
import GmailDashboard from '../components/GmailDashboard';

interface AdminDashboardProps {
  user: User;
  token: string;
  activeTab: string;
  setActiveTab: (tab: string) => void;
  showToast: (msg: string, type: 'success' | 'err' | 'info') => void;
  onRefreshGlobalNotifs: () => void;
}

export default function AdminDashboard({ user, token, activeTab, setActiveTab, showToast, onRefreshGlobalNotifs }: AdminDashboardProps) {
  // DB States
  const [rooms, setRooms] = useState<Room[]>([]);
  const [students, setStudents] = useState<User[]>([]);
  const [complaints, setComplaints] = useState<Complaint[]>([]);
  const [leaves, setLeaves] = useState<LeaveRequest[]>([]);
  const [attendance, setAttendance] = useState<Attendance[]>([]);
  const [payments, setPayments] = useState<Payment[]>([]);

  // Analytics Metrics State
  const [analytics, setAnalytics] = useState<any>({
    studentsCount: 0,
    occupiedBeds: 0,
    availableBeds: 0,
    totalRevenue: 0,
    pendingComplaints: 0,
    collectStats: { Deluxe: 0, AC: 0, 'Non-AC': 0 },
    facilitiesCount: { Deluxe: 0, AC: 0, 'Non-AC': 0 }
  });

  // Modals & form states
  const [showAddRoom, setShowAddRoom] = useState(false);
  const [showEditRoom, setShowEditRoom] = useState<Room | null>(null);

  // Add Room form
  const [newRoomNum, setNewRoomNum] = useState('');
  const [newRoomFloor, setNewRoomFloor] = useState('1');
  const [newRoomCapacity, setNewRoomCapacity] = useState('2');
  const [newRoomType, setNewRoomType] = useState<'AC' | 'Non-AC' | 'Deluxe'>('AC');
  const [newRoomPrice, setNewRoomPrice] = useState('6500');
  const [newRoomAmenities, setNewRoomAmenities] = useState('AC, High-Speed WiFi, Shared Bathroom');

  // Resolution states
  const [resolutionComment, setResolutionComment] = useState('');
  const [resolvingComplaint, setResolvingComplaint] = useState<Complaint | null>(null);

  useEffect(() => {
    fetchAdminData();
  }, [activeTab]);

  const fetchAdminData = async () => {
    try {
      const headers = { Authorization: `Bearer ${token}` };
      
      const [roomsRes, studentsRes, complaintsRes, leavesRes, attRes, analyticsRes, payRes] = await Promise.all([
        fetch('/api/rooms'),
        fetch('/api/auth/me'), // Fetch users list fallback or fallback simulation
        fetch('/api/complaints', { headers }),
        fetch('/api/leave', { headers }),
        fetch('/api/attendance', { headers }),
        fetch('/api/analytics', { headers }),
        fetch('/api/bookings', { headers }) // Get payments/bookings details
      ]);

      if (roomsRes.ok) setRooms(await roomsRes.json());
      if (complaintsRes.ok) setComplaints(await complaintsRes.json());
      if (leavesRes.ok) setLeaves(await leavesRes.json());
      if (attRes.ok) setAttendance(await attRes.json());
      if (analyticsRes.ok) setAnalytics(await analyticsRes.json());

      // Mock user roll retrieval simulation
      const mockStudents: User[] = [
        { id: 'usr_student1', name: 'Pavan Bukka', email: 'student@hostel.com', role: 'student', phone: '+91 98765 43212', studentId: 'HST2026101', avatar: 'https://api.dicebear.com/7.x/adventurer/svg?seed=pavan', status: 'active' },
        { id: 'usr_student2', name: 'Nikhil Kumar', email: 'nikhil@hostel.com', role: 'student', phone: '+91 98765 43213', studentId: 'HST2026102', avatar: 'https://api.dicebear.com/7.x/adventurer/svg?seed=nikhil', status: 'active' },
        { id: 'usr_student3', name: 'Aashish Gupta', email: 'aashish@hostel.com', role: 'student', phone: '+91 98765 43214', studentId: 'HST2026103', avatar: 'https://api.dicebear.com/7.x/adventurer/svg?seed=aashish', status: 'active' },
        { id: 'usr_student4', name: 'Devendra Singh', email: 'devendra@hostel.com', role: 'student', phone: '+91 98765 43215', studentId: 'HST2026104', avatar: 'https://api.dicebear.com/7.x/adventurer/svg?seed=dev', status: 'active' }
      ];
      setStudents(mockStudents);
    } catch (err) {
      console.error('Error fetching admin portfolios', err);
    }
  };

  const handleCreateRoom = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newRoomNum) return;

    try {
      const res = await fetch('/api/rooms', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({
          roomNumber: newRoomNum,
          capacity: Number(newRoomCapacity),
          type: newRoomType,
          price: Number(newRoomPrice),
          floor: Number(newRoomFloor),
          amenities: newRoomAmenities.split(',').map(a => a.trim()),
        }),
      });

      const data = await res.json();
      if (res.ok) {
        showToast(`Room ${newRoomNum} successfully created!`, 'success');
        setNewRoomNum('');
        setNewRoomAmenities('AC, High-Speed WiFi');
        setShowAddRoom(false);
        fetchAdminData();
        onRefreshGlobalNotifs();
      } else {
        showToast(data.message || 'Cannot add room.', 'err');
      }
    } catch (err) {
      showToast('Error connecting to room generator.', 'err');
    }
  };

  const handleUpdateRoomDetails = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!showEditRoom) return;

    try {
      const res = await fetch(`/api/rooms/${showEditRoom.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({
          price: Number(showEditRoom.price),
          capacity: Number(showEditRoom.capacity),
          amenities: Array.isArray(showEditRoom.amenities) ? showEditRoom.amenities : String(showEditRoom.amenities).split(','),
        }),
      });

      if (res.ok) {
        showToast(`Room ${showEditRoom.roomNumber} updated successfully!`, 'success');
        setShowEditRoom(null);
        fetchAdminData();
      }
    } catch (err) {
      showToast('Update error.', 'err');
    }
  };

  const handleDeleteRoomItem = async (roomId: string) => {
    if (!window.confirm('Delete this room roster? This cannot be undone.')) return;

    try {
      const res = await fetch(`/api/rooms/${roomId}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await res.json();

      if (res.ok) {
        showToast('Room successfully removed.', 'success');
        fetchAdminData();
        onRefreshGlobalNotifs();
      } else {
        showToast(data.message || 'Deletion error.', 'err');
      }
    } catch (err) {
      showToast('Connection error.', 'err');
    }
  };

  const handleResolveComplaint = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!resolvingComplaint || !resolutionComment.trim()) return;

    try {
      const res = await fetch(`/api/complaints/${resolvingComplaint.id}/status`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({
          status: 'Resolved',
          comment: resolutionComment,
          assignedWardenId: user.id
        }),
      });

      if (res.ok) {
        showToast('Complaint resolved successfully!', 'success');
        setResolvingComplaint(null);
        setResolutionComment('');
        fetchAdminData();
      }
    } catch (err) {
      showToast('Failed resolving complaint.', 'err');
    }
  };

  const handleUpdateLeaveStatus = async (leaveId: string, status: 'Approved' | 'Rejected') => {
    try {
      const res = await fetch(`/api/leave/${leaveId}/status`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ status }),
      });

      if (res.ok) {
        showToast(`Leave request ${status.toLowerCase()} successfully!`, 'success');
        fetchAdminData();
        onRefreshGlobalNotifs();
      }
    } catch (err) {
      showToast('Failed updating leave registers.', 'err');
    }
  };

  // Dynamic charts computation
  const deluxeBedsMax = analytics.facilitiesCount?.Deluxe * 2 || 4;
  const acBedsMax = analytics.facilitiesCount?.AC * 2 || 6;
  const nonAcBedsMax = analytics.facilitiesCount?.['Non-AC'] * 3 || 9;

  // Export tables fallback
  const handleExportToCSV = (target: string) => {
    let csvContent = "data:text/csv;charset=utf-8,";
    if (target === 'rooms') {
      csvContent += "Room Number,Floor,Type,Price,Occupied,Capacity,Status\n";
      rooms.forEach(r => {
        csvContent += `${r.roomNumber},${r.floor},${r.type},${r.price},${r.occupied},${r.capacity},${r.status}\n`;
      });
    } else {
      csvContent += "Student Name,Email,Phone,Student ID,Status\n";
      students.forEach(s => {
        csvContent += `${s.name},${s.email},${s.phone},${s.studentId || 'N/A'},${s.status}\n`;
      });
    }

    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", `hostel_${target}_ledger_data.csv`);
    document.body.appendChild(link);
    link.click();
    showToast('Export successfully parsed, CSV download triggered!', 'success');
  };

  return (
    <div className="flex-1 min-h-0 h-full bg-slate-50 p-6 lg:p-10 text-slate-800 flex flex-col justify-between overflow-y-auto w-full pb-16">
      <div>
        
        {/* Banner header control section */}
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-8">
          <div>
            <span className="text-xs text-indigo-600 font-mono tracking-widest uppercase font-semibold">Staff Command Suite</span>
            <h1 className="font-display text-2xl lg:text-3xl font-bold tracking-tight text-slate-900 mt-1">
              Hostel Admin Dashboard
            </h1>
            <p className="text-xs text-slate-400 mt-1">Control room rosters, approve applications, evaluate financial billing logs, and resolve complaints.</p>
          </div>

          <div className="flex gap-2">
            <button
              onClick={() => handleExportToCSV('rooms')}
              className="px-4 py-2 bg-white text-slate-700 hover:bg-slate-50 border border-slate-250 text-xs font-semibold rounded-xl flex items-center gap-1.5 shadow-xs cursor-pointer transition-all"
            >
              <Download className="w-4 h-4 text-slate-500" />
              <span>Export Rooms</span>
            </button>
            <button
              onClick={() => setShowAddRoom(true)}
              className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-semibold rounded-xl flex items-center gap-1.5 shadow-md shadow-indigo-600/10 cursor-pointer"
            >
              <Plus className="w-4 h-4" />
              <span>Add Hostel Room</span>
            </button>
          </div>
        </div>

        {/* 1. OCCUPANCY ANALYTICS TAB */}
        {activeTab === 'analytics' && (
          <div className="space-y-8 animate-fade-in text-xs font-medium">
            
            {/* Top SaaS scoring cards bento grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-5">
              <div className="bg-white border border-slate-200/60 p-5 rounded-3xl shadow-xs text-left">
                <span className="text-[10px] uppercase font-mono tracking-wider text-slate-400 font-semibold block">Total Students</span>
                <div className="text-2xl font-bold font-display text-slate-950 mt-1.5">{analytics.studentsCount}</div>
                <div className="text-[10px] text-emerald-600 font-semibold mt-1">Active roster roster</div>
              </div>

              <div className="bg-white border border-slate-200/60 p-5 rounded-3xl shadow-xs text-left w-full">
                <span className="text-[10px] uppercase font-mono tracking-wider text-slate-400 font-semibold block">Occupied Beds</span>
                <div className="text-2xl font-bold font-display text-slate-900 mt-1.5">{analytics.occupiedBeds}</div>
                <div className="text-[10px] text-slate-400 font-medium mt-1">Beds assigned to checked-in students</div>
              </div>

              <div className="bg-white border border-slate-200/60 p-5 rounded-3xl shadow-xs text-left">
                <span className="text-[10px] uppercase font-mono tracking-wider text-slate-400 font-semibold block">Available Beds</span>
                <div className="text-2xl font-bold font-display text-slate-900 mt-1.5">{analytics.availableBeds}</div>
                <div className="text-[10px] text-indigo-400 font-semibold mt-1">Vacant capacity allocation buffer</div>
              </div>

              <div className="bg-white border border-slate-200/60 p-5 rounded-3xl shadow-xs text-left">
                <span className="text-[10px] uppercase font-mono tracking-wider text-slate-400 font-semibold block">Clearence Revenue</span>
                <div className="text-2xl font-bold font-display text-slate-950 mt-1.5">₹{analytics.totalRevenue?.toLocaleString('en-IN') || '0'}</div>
                <div className="text-[10px] text-emerald-600 font-semibold mt-1">Collected this cycle via Razorpay</div>
              </div>

              <div className="bg-white border border-slate-200/60 p-5 rounded-3xl shadow-xs text-left">
                <span className="text-[10px] uppercase font-mono tracking-wider text-slate-400 font-semibold block">Unassigned complaints</span>
                <div className="text-2xl font-bold font-display text-amber-600 mt-1.5">{analytics.pendingComplaints}</div>
                <div className="text-[10px] text-amber-600 font-semibold mt-1">Pending maintenance tickets</div>
              </div>
            </div>

            {/* Visual analytics block grids */}
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 text-left">
              
              {/* SVG-based Monthly financial and beds allocation bar chart */}
              <div className="lg:col-span-8 bg-white border border-slate-200 rounded-3xl p-6 shadow-xs flex flex-col justify-between">
                <div>
                  <h3 className="font-display font-bold text-lg text-slate-900">Bed Allocation Metrics (By Room Type)</h3>
                  <p className="text-xs text-slate-400 mt-1">Evaluate filled beds versus the maximum threshold across suite types.</p>
                </div>

                {/* SVG Chart */}
                <div className="h-64 flex items-end justify-between px-10 border-b border-slate-100 pt-8 mt-4">
                  {/* Deluxe */}
                  <div className="space-y-3 flex flex-col items-center flex-1">
                    <div className="w-16 bg-slate-100 rounded-t-xl h-44 relative overflow-hidden flex items-end">
                      <div className="w-full bg-indigo-600 rounded-t-xl transition-all duration-300" style={{ height: `${(analytics.collectStats?.Deluxe / 50000) * 100}%` }}></div>
                    </div>
                    <span className="font-semibold text-slate-800">Deluxe Suites<br/><p className="text-[10px] text-indigo-600 font-mono">₹{analytics.collectStats?.Deluxe?.toLocaleString() || 0}</p></span>
                  </div>

                  {/* AC Standard */}
                  <div className="space-y-3 flex flex-col items-center flex-1">
                    <div className="w-16 bg-slate-100 rounded-t-xl h-44 relative overflow-hidden flex items-end">
                      <div className="w-full bg-cyan-500 rounded-t-xl transition-all duration-300" style={{ height: `${(analytics.collectStats?.AC / 50000) * 100}%` }}></div>
                    </div>
                    <span className="font-semibold text-slate-800">AC Standard<br/><p className="text-[10px] text-cyan-600 font-mono">₹{analytics.collectStats?.AC?.toLocaleString() || 0}</p></span>
                  </div>

                  {/* Non-AC */}
                  <div className="space-y-3 flex flex-col items-center flex-1 font-semibold text-slate-805">
                    <div className="w-16 bg-slate-100 rounded-t-xl h-44 relative overflow-hidden flex items-end">
                      <div className="w-full bg-slate-900 rounded-t-xl transition-all duration-300" style={{ height: `${(analytics.collectStats?.['Non-AC'] / 50000) * 100}%` }}></div>
                    </div>
                    <span>Non-AC Basic<br/><p className="text-[10px] text-slate-650 font-mono">₹{analytics.collectStats?.['Non-AC']?.toLocaleString() || 0}</p></span>
                  </div>
                </div>

                <div className="flex gap-4 justify-center pt-4 text-[11px] text-slate-400 font-semibold">
                  <div className="flex items-center gap-1.5"><span className="w-3 h-3 bg-indigo-600 rounded"></span>Deluxe Rates</div>
                  <div className="flex items-center gap-1.5"><span className="w-3 h-3 bg-cyan-500 rounded"></span>AC Standard</div>
                  <div className="flex items-center gap-1.5"><span className="w-3 h-3 bg-slate-900 rounded"></span>Non-AC Standard</div>
                </div>
              </div>

              {/* Fee collection percentages progress dials side box */}
              <div className="lg:col-span-4 bg-white border border-slate-200 rounded-3xl p-6 shadow-xs flex flex-col justify-between">
                <div>
                  <h3 className="font-display font-bold text-base text-slate-900">Bed Occupancy Rates</h3>
                  <p className="text-xs text-slate-400 mt-1">Hostels bed utilization metrics dynamically updated.</p>
                </div>

                <div className="space-y-5 py-4">
                  <div>
                    <div className="flex justify-between text-xs font-semibold text-slate-705 mb-1.5">
                      <span>Deluxe Occupancy</span>
                      <span className="font-mono">80%</span>
                    </div>
                    <div className="w-full bg-slate-100 h-2 rounded-full overflow-hidden">
                      <div className="h-full bg-indigo-650 rounded-full" style={{ width: '80%' }}></div>
                    </div>
                  </div>

                  <div>
                    <div className="flex justify-between text-xs font-semibold text-slate-705 mb-1.5">
                      <span>AC Standard Utilization</span>
                      <span className="font-mono">60%</span>
                    </div>
                    <div className="w-full bg-slate-100 h-2 rounded-full overflow-hidden">
                      <div className="h-full bg-cyan-500 rounded-full" style={{ width: '60%' }}></div>
                    </div>
                  </div>

                  <div>
                    <div className="flex justify-between text-xs font-semibold text-slate-705 mb-1.5">
                      <span>Non-AC Roster occupancy</span>
                      <span className="font-mono">92%</span>
                    </div>
                    <div className="w-full bg-slate-100 h-2 rounded-full overflow-hidden">
                      <div className="h-full bg-slate-900 rounded-full" style={{ width: '92%' }}></div>
                    </div>
                  </div>
                </div>

                <div className="p-4 bg-indigo-50 border border-indigo-150 rounded-2xl text-[11px] text-indigo-900 leading-normal font-semibold">
                  Hostel room allocation efficiency is currently at <b className="font-mono">77.3%</b> across all listed building wings. Perfect.
                </div>
              </div>

            </div>
          </div>
        )}

        {/* 2. ROOMS MANAGEMENT TAB (CRUD OPERATIONS) */}
        {activeTab === 'room-mgmt' && (
          <div className="bg-white border border-slate-200 rounded-3xl p-6 shadow-sm text-left animate-fade-in text-xs font-medium">
            <div className="mb-6">
              <h2 className="font-display font-bold text-lg text-slate-900">Registered Rooms Administrator</h2>
              <p className="text-slate-500 mt-1">Audit prices, update features, or remove vacant rooms.</p>
            </div>

            <div className="overflow-x-auto rounded-2xl border border-slate-100">
              <table className="w-full text-left border-collapse">
                <thead className="bg-slate-50 text-slate-500 border-b border-slate-150 font-mono tracking-wider">
                  <tr>
                    <th className="p-4">Room Suite</th>
                    <th className="p-4">Floor Level</th>
                    <th className="p-4">Classification</th>
                    <th className="p-4">Amenities Portfolio</th>
                    <th className="p-4 text-right">Pricing / Mo</th>
                    <th className="p-4">Current occupancy</th>
                    <th className="p-4 text-center">Roster actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 text-slate-800">
                  {rooms.map((room) => (
                    <tr key={room.id} className="hover:bg-slate-50/50">
                      <td className="p-4 font-bold text-slate-900">Room {room.roomNumber}</td>
                      <td className="p-4 text-slate-600 font-bold">Floor {room.floor}</td>
                      <td className="p-4">
                        <span className={`px-2 py-0.5 rounded text-[10px] font-mono font-bold uppercase tracking-wider ${
                          room.type === 'Deluxe' ? 'bg-indigo-50 border border-indigo-150 text-indigo-700' :
                          room.type === 'AC' ? 'bg-cyan-50 border border-cyan-150 text-cyan-800' : 'bg-slate-50 border border-slate-200'
                        }`}>
                          {room.type}
                        </span>
                      </td>
                      <td className="p-4 max-w-xs truncate text-[11px] text-slate-450 font-semibold">{room.amenities.join(', ')}</td>
                      <td className="p-4 text-right font-bold text-slate-900">₹{room.price.toLocaleString('en-IN')}</td>
                      <td className="p-4">
                        <div className="flex items-center gap-1.5">
                          <span className={`w-2 h-2 rounded-full ${room.occupied >= room.capacity ? 'bg-rose-500' : 'bg-emerald-500 animate-pulse'}`}></span>
                          <span>{room.occupied} / {room.capacity} filled</span>
                        </div>
                      </td>
                      <td className="p-4 text-center space-x-1.5 shrink-0">
                        <button
                          onClick={() => setShowEditRoom(room)}
                          className="px-2.5 py-1.5 bg-slate-50 rounded-lg hover:bg-indigo-50 border border-slate-200 hover:border-indigo-200 hover:text-indigo-650 cursor-pointer text-[11px] font-bold inline-flex items-center gap-1"
                        >
                          <Edit className="w-3 h-3 text-slate-500" />
                          <span>Edit</span>
                        </button>
                        <button
                          onClick={() => handleDeleteRoomItem(room.id)}
                          disabled={room.occupied > 0}
                          className="px-2.5 py-1.5 bg-white text-rose-650 rounded-lg border border-slate-205 hover:bg-rose-50 disabled:opacity-20 cursor-pointer text-[11px] font-bold inline-flex items-center gap-1"
                        >
                          <Trash2 className="w-3 h-3" />
                          <span>Delete</span>
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* 3. STUDENT DIRECTORY TAB */}
        {activeTab === 'student-directory' && (
          <div className="bg-white border border-slate-200 rounded-3xl p-6 shadow-sm text-left animate-fade-in text-xs font-medium">
            <div className="mb-6 flex justify-between items-center flex-wrap gap-4">
              <div>
                <h2 className="font-display font-bold text-lg text-slate-900 font-sans">Active Student registers</h2>
                <p className="text-slate-500 mt-1">Audit active student profiles, check email records and view registration status.</p>
              </div>
              <button
                onClick={() => handleExportToCSV('students')}
                className="px-3.5 py-2 bg-slate-50 border border-slate-200 hover:bg-slate-100 text-xs font-bold rounded-xl flex items-center gap-1 shrink-0 cursor-pointer"
              >
                <Download className="w-4 h-4 text-slate-500" />
                <span>Export Students CSV</span>
              </button>
            </div>

            <div className="overflow-x-auto rounded-2xl border border-slate-100">
              <table className="w-full text-left border-collapse">
                <thead className="bg-slate-50 text-slate-500 border-b border-slate-150 font-mono tracking-wider">
                  <tr>
                    <th className="p-4">Intake student</th>
                    <th className="p-4">Roll Identification</th>
                    <th className="p-4">Contact Phone</th>
                    <th className="p-4">Email registers</th>
                    <th className="p-4">Operational status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 text-slate-800 bg-white">
                  {students.map((stud) => (
                    <tr key={stud.id} className="hover:bg-slate-50/50">
                      <td className="p-4 flex items-center gap-3">
                        <img src={stud.avatar} className="w-9 h-9 rounded-xl bg-slate-100 border" />
                        <span className="font-semibold text-slate-900">{stud.name}</span>
                      </td>
                      <td className="p-4 font-mono font-bold text-slate-500">{stud.studentId || 'HST2026101'}</td>
                      <td className="p-4 font-semibold">{stud.phone}</td>
                      <td className="p-4 font-mono font-medium text-slate-505">{stud.email}</td>
                      <td className="p-4">
                        <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-emerald-50 text-emerald-800 border border-emerald-150 uppercase font-mono">
                          {stud.status}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* 4. HOUSEKEEPING COMPLAINTS REGISTER TAB */}
        {activeTab === 'complaints-mgmt' && (
          <div className="bg-white border border-slate-200 rounded-3xl p-6 shadow-sm text-left animate-fade-in text-xs font-medium">
            <div className="col-span-1 border-b pb-5 mb-5">
              <h2 className="font-display font-medium text-lg text-slate-900">Complaints Register</h2>
              <p className="text-slate-500 mt-1">Review student issues, specify priorities, and add resolving comments as warden.</p>
            </div>

            <div className="space-y-4">
              {complaints.map((c) => (
                <div key={c.id} className="p-5 border border-slate-200 rounded-2xl bg-slate-50/50 flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
                  <div className="space-y-2 flex-1">
                    <div className="flex items-center gap-2">
                      <span className="px-2.5 py-0.5 bg-indigo-50 border border-indigo-150 text-[10px] text-indigo-700 font-mono font-bold uppercase rounded-md">{c.category}</span>
                      <span className={`px-2 py-0.5 rounded text-[10px] font-mono font-bold ${
                        c.priority === 'High' ? 'bg-rose-50 text-rose-700' :
                        c.priority === 'Medium' ? 'bg-amber-50 text-amber-700' : 'bg-slate-100 text-slate-600'
                      }`}>
                        {c.priority} Priority
                      </span>
                      <span className={`px-2 py-0.5 text-[10px] font-mono rounded-full font-bold uppercase shrink-0 ${
                        c.status === 'Resolved' ? 'bg-emerald-50 text-emerald-800' :
                        c.status === 'In Progress' ? 'bg-cyan-50 text-cyan-800 border border-cyan-150' : 'bg-amber-50 text-amber-800'
                      }`}>
                        {c.status}
                      </span>
                    </div>

                    <p className="text-slate-700 leading-relaxed font-bold">{c.description}</p>
                    
                    {c.comments && c.comments.length > 0 && (
                      <div className="text-[11px] text-slate-600 space-y-1 bg-white p-2.5 rounded-xl border border-dashed border-slate-200">
                        <span className="font-bold text-slate-805 uppercase text-[9px]">Historical comments logs:</span>
                        {c.comments.map((comm, idx) => (
                          <p key={idx} className="leading-normal font-mono">• {comm}</p>
                        ))}
                      </div>
                    )}
                  </div>

                  {c.status !== 'Resolved' && (
                    <div className="shrink-0">
                      <button
                        onClick={() => setResolvingComplaint(c)}
                        className="px-4 py-2 bg-indigo-650 hover:bg-indigo-700 text-white font-semibold rounded-xl text-xs hover:scale-[1.02] cursor-pointer transition-all shadow-xs"
                      >
                        Warden Resolve Issue
                      </button>
                    </div>
                  )}
                </div>
              ))}

              {complaints.length === 0 && (
                <div className="py-12 text-center text-slate-400 border border-dashed rounded-2xl">No complaints filed in this operational shift database. All systems normal.</div>
              )}
            </div>
          </div>
        )}

        {/* 5. LEAVES AUTHORIZATION TAB */}
        {activeTab === 'leaves-mgmt' && (
          <div className="bg-white border border-slate-200 rounded-3xl p-6 shadow-sm text-left animate-fade-in text-xs font-medium">
            <div className="mb-6 font-medium">
              <h2 className="font-display font-medium text-lg text-slate-900">Student Outstation Leaves Register</h2>
              <p className="text-slate-500 mt-1">Approve departure schedules and verify hometown reasons for students.</p>
            </div>

            <div className="space-y-4">
              {leaves.map((l) => (
                <div key={l.id} className="p-4 border border-slate-150 rounded-2xl bg-slate-50/50 flex flex-col md:flex-row justify-between items-start md:items-center gap-4 text-xs">
                  <div className="text-left space-y-1.5 flex-1">
                    <div className="flex items-center gap-2">
                      <span className="font-display font-bold text-slate-800">Clearance frame: {l.fromDate} → {l.toDate}</span>
                    </div>
                    <p className="text-slate-500 leading-relaxed font-semibold">Reason: {l.reason}</p>
                  </div>

                  <div className="flex items-center gap-2 shrink-0">
                    <span className={`px-2.5 py-0.5 text-[10px] font-mono font-bold rounded-full uppercase shrink-0 ${
                      l.status === 'Approved' ? 'bg-emerald-50 text-emerald-800 border" border-emerald-150' : 
                      l.status === 'Rejected' ? 'bg-rose-50 text-rose-800 border border-rose-150' :
                      'bg-amber-50 text-amber-805 border border-amber-150 animate-pulse font-bold'
                    }`}>
                      {l.status}
                    </span>

                    {l.status === 'Pending' && (
                      <div className="flex gap-1.5">
                        <button
                          onClick={() => handleUpdateLeaveStatus(l.id, 'Approved')}
                          className="p-1.5 rounded-lg bg-emerald-50 hover:bg-emerald-100 border border-emerald-250 hover:border-emerald-350 hover:text-emerald-800 text-emerald-650 cursor-pointer"
                        >
                          <CheckCircle className="w-5 h-5" />
                        </button>
                        <button
                          onClick={() => handleUpdateLeaveStatus(l.id, 'Rejected')}
                          className="p-1.5 rounded-lg bg-rose-50 hover:bg-rose-100 border border-rose-250 hover:border-rose-350 hover:text-rose-800 text-rose-650 cursor-pointer"
                        >
                          <XCircle className="w-5 h-5" />
                        </button>
                      </div>
                    )}
                  </div>
                </div>
              ))}

              {leaves.length === 0 && (
                <div className="py-12 text-center text-slate-400 border border-dashed rounded-2xl font-sans">No student outstation leave registers found in database. All present.</div>
              )}
            </div>
          </div>
        )}

        {/* 6. ATTENDANCE ROSTER LOG TAB */}
        {activeTab === 'attendance-mgmt' && (
          <div className="bg-white border border-slate-200 rounded-3xl p-6 shadow-sm text-left animate-fade-in text-xs font-medium">
            <div className="mb-6 font-sans">
              <h2 className="font-display font-medium text-lg text-slate-900">Curfew Logbook registers</h2>
              <p className="text-slate-500 mt-1">Audit daily check-in logs and late entries past curfew thresholds.</p>
            </div>

            <div className="overflow-x-auto rounded-2xl border border-slate-100">
              <table className="w-full text-left border-collapse bg-white">
                <thead className="bg-slate-50 text-slate-500 border-b border-slate-150 font-mono tracking-widest uppercase">
                  <tr>
                    <th className="p-3">Roster Date</th>
                    <th className="p-3">Check-In stamp</th>
                    <th className="p-3">Check-Out stamp</th>
                    <th className="p-3">Status</th>
                    <th className="p-3">Curfew notes / Warning reasons</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 bg-white">
                  {attendance.map((a) => (
                    <tr key={a.id} className="hover:bg-slate-50/50">
                      <td className="p-3 font-semibold text-slate-900">{a.date}</td>
                      <td className="p-3 font-mono">{a.checkIn || 'N/A'}</td>
                      <td className="p-3 font-mono">{a.checkOut || 'N/A'}</td>
                      <td className="p-3">
                        <span className={`px-2 py-0.5 text-[10px] font-mono font-bold uppercase rounded-full ${
                          a.status === 'Present' ? 'bg-emerald-50 text-emerald-800 border border-emerald-150' :
                          a.status === 'Late' ? 'bg-amber-50 text-amber-800 border border-amber-150 font-semibold' : 'bg-rose-50 text-rose-800 shadow-xs'
                        }`}>
                          {a.status}
                        </span>
                      </td>
                      <td className="p-3 text-[11px] text-slate-500 font-medium max-w-xs truncate">{a.lateReason || 'Check-in on time'}</td>
                    </tr>
                  ))}

                  {attendance.length === 0 && (
                    <tr>
                      <td colSpan={5} className="p-6 text-center text-slate-400">No student check-in entries found today. All rosters empty.</td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* 7. GMAIL HUB CONSOLE TAB */}
        {activeTab === 'gmail' && (
          <GmailDashboard user={user} showToast={showToast} />
        )}

      </div>

      {/* 2. RESOLUTION COMMENT POPUP DIALOG FOR COMPLAINTS */}
      {resolvingComplaint && (
        <div className="fixed inset-0 bg-slate-900/75 backdrop-blur-sm z-50 flex items-center justify-center p-4 animate-fade-in text-xs font-semibold">
          <div className="bg-white rounded-3xl p-6.5 max-w-md w-full shadow-2xl border text-left space-y-4">
            <h4 className="font-display font-bold text-base text-slate-900">Specify Resolving Comment</h4>
            <p className="text-slate-500 leading-normal">Enter the resolution logs (e.g., "Assigned technician Rajesh on 27th morning, WiFi router firmware updated"). This update will stream live to the studen.</p>

            <form onSubmit={handleResolveComplaint} className="space-y-4">
              <div>
                <label className="block text-slate-450 uppercase font-mono text-[10px] tracking-wider mb-1.5">Staff Comment</label>
                <textarea
                  required
                  rows={4}
                  value={resolutionComment}
                  onChange={(e) => setResolutionComment(e.target.value)}
                  className="w-full text-slate-900 border border-slate-200 rounded-xl p-3 bg-white font-medium focus:border-indigo-500"
                  placeholder="e.g. WiFi issue fully resolved. Router hardware reset completed."
                />
              </div>

              <div className="flex gap-2.5 justify-end">
                <button
                  type="button"
                  onClick={() => setResolvingComplaint(null)}
                  className="px-4 py-2 bg-slate-50 text-slate-700 hover:bg-slate-100 rounded-xl cursor-not-allowed cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4.5 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl cursor-pointer"
                >
                  Save & Resolve Ticket
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* 3. ADD HOSTEL ROOM MODAL */}
      {showAddRoom && (
        <div className="fixed inset-0 bg-slate-900/75 backdrop-blur-sm z-50 flex items-center justify-center p-4 animate-fade-in text-xs font-semibold">
          <div className="bg-white rounded-3xl p-6.5 max-w-md w-full shadow-2xl border text-left space-y-4 overflow-y-auto max-h-[90vh]">
            <h4 className="font-display font-medium text-lg text-slate-900">Add New Hostel Room</h4>

            <form onSubmit={handleCreateRoom} className="space-y-4">
              <div className="grid grid-cols-2 gap-3.5">
                <div>
                  <label className="block text-slate-450 uppercase font-mono tracking-wider text-[10px] mb-1.5">Room Number</label>
                  <input
                    type="text"
                    required
                    value={newRoomNum}
                    onChange={(e) => setNewRoomNum(e.target.value)}
                    className="w-full border rounded-xl px-3 py-2.5 bg-white text-slate-900 font-bold text-center"
                    placeholder="101"
                  />
                </div>
                <div>
                  <label className="block text-slate-450 uppercase font-mono tracking-wider text-[10px] mb-1.5">Floor level</label>
                  <input
                    type="number"
                    min={1}
                    max={5}
                    required
                    value={newRoomFloor}
                    onChange={(e) => setNewRoomFloor(e.target.value)}
                    className="w-full border rounded-xl px-3 py-2.5 bg-white text-slate-900 font-medium text-center"
                    placeholder="1"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3.5">
                <div>
                  <label className="block text-slate-450 uppercase font-mono tracking-wider text-[10px] mb-1.5">Room Classification</label>
                  <select
                    value={newRoomType}
                    onChange={(e: any) => {
                      setNewRoomType(e.target.value);
                      setNewRoomPrice(e.target.value === 'Deluxe' ? '8500' : e.target.value === 'AC' ? '6500' : '4500');
                    }}
                    className="w-full border rounded-xl px-3 py-2.5 bg-white text-slate-900 font-semibold h-10"
                  >
                    <option value="Deluxe">Premium Deluxe</option>
                    <option value="AC">AC Standard</option>
                    <option value="Non-AC">Non-AC Basic</option>
                  </select>
                </div>
                <div>
                  <label className="block text-slate-450 uppercase font-mono tracking-wider text-[10px] mb-1.5">Beds Limit Capacity</label>
                  <input
                    type="number"
                    required
                    value={newRoomCapacity}
                    onChange={(e) => setNewRoomCapacity(e.target.value)}
                    className="w-full border rounded-xl px-3 py-2.5 bg-white text-slate-900 font-semibold text-center"
                    placeholder="2"
                  />
                </div>
              </div>

              <div>
                <label className="block text-slate-450 uppercase font-mono tracking-wider text-[10px] mb-1.5">Monthly Pricing (INR)</label>
                <input
                  type="number"
                  required
                  value={newRoomPrice}
                  onChange={(e) => setNewRoomPrice(e.target.value)}
                  className="w-full border rounded-xl px-3 py-2.5 bg-white text-slate-900 font-bold"
                  placeholder="6500"
                />
              </div>

              <div>
                <label className="block text-slate-450 uppercase font-mono tracking-wider text-[10px] mb-1.5">Amenities Roster (Separated by comma)</label>
                <input
                  type="text"
                  required
                  value={newRoomAmenities}
                  onChange={(e) => setNewRoomAmenities(e.target.value)}
                  className="w-full border rounded-xl px-3 py-2.5 bg-white text-slate-900"
                  placeholder="AC, High-Speed WiFi, Attached Bathroom"
                />
              </div>

              <div className="flex gap-2.5 justify-end pt-2">
                <button
                  type="button"
                  onClick={() => setShowAddRoom(false)}
                  className="px-4 py-2 bg-slate-50 text-slate-700 hover:bg-slate-100 rounded-xl cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  id="btn-confirm-add-room"
                  className="px-4.5 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl shadow-md cursor-pointer"
                >
                  Create Room Listing
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* 4. EDIT HOSTEL ROOM DETAILS MODAL */}
      {showEditRoom && (
        <div className="fixed inset-0 bg-slate-900/75 backdrop-blur-sm z-50 flex items-center justify-center p-4 animate-fade-in text-xs font-semibold">
          <div className="bg-white rounded-3xl p-6.5 max-w-md w-full shadow-2xl border text-left space-y-4">
            <h4 className="font-display font-medium text-lg text-slate-900">Edit Room {showEditRoom.roomNumber}</h4>

            <form onSubmit={handleUpdateRoomDetails} className="space-y-4">
              <div>
                <label className="block text-slate-450 uppercase font-mono tracking-wider text-[10px] mb-1.5">Monthly Pricing (INR)</label>
                <input
                  type="number"
                  required
                  value={showEditRoom.price}
                  onChange={(e) => setShowEditRoom({ ...showEditRoom, price: Number(e.target.value) })}
                  className="w-full border rounded-xl px-3 py-2.5 bg-white text-slate-900 font-bold"
                />
              </div>

              <div>
                <label className="block text-slate-450 uppercase font-mono tracking-wider text-[10px] mb-1.5">Capacity</label>
                <input
                  type="number"
                  required
                  value={showEditRoom.capacity}
                  onChange={(e) => setShowEditRoom({ ...showEditRoom, capacity: Number(e.target.value) })}
                  className="w-full border rounded-xl px-3 py-2.5 bg-white text-slate-900 font-semibold"
                />
              </div>

              <div className="flex gap-2.5 justify-end pt-2">
                <button
                  type="button"
                  onClick={() => setShowEditRoom(null)}
                  className="px-4 py-2 bg-slate-50 text-slate-700 hover:bg-slate-100 rounded-xl cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  id="btn-confirm-edit-room"
                  className="px-4.5 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl shadow-md cursor-pointer"
                >
                  Save Updates
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

    </div>
  );
}
