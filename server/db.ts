import fs from 'fs';
import path from 'path';
import crypto from 'crypto';

// Types representing our collections
export interface User {
  id: string;
  name: string;
  email: string;
  role: 'student' | 'admin' | 'warden';
  passwordHash: string;
  phone: string;
  studentId?: string;
  avatar?: string;
  status: 'active' | 'suspended';
}

export interface Room {
  id: string;
  roomNumber: string;
  capacity: number;
  occupied: number;
  type: 'AC' | 'Non-AC' | 'Deluxe';
  price: number;
  floor: number;
  image: string;
  amenities: string[];
  status: 'Available' | 'Reserved' | 'Occupied';
}

export interface Booking {
  id: string;
  studentId: string;
  roomId: string;
  paymentStatus: 'Pending' | 'Paid' | 'Failed';
  bookingDate: string;
  status: 'Pending' | 'Approved' | 'Rejected' | 'Vacated';
  term: string;
  receiptUrl?: string;
}

export interface Payment {
  id: string;
  bookingId: string;
  studentId: string;
  razorpayOrderId: string;
  razorpayPaymentId?: string;
  amount: number;
  status: 'Success' | 'Failed' | 'Pending';
  date: string;
  type: 'Admission Fee' | 'Monthly Fee' | 'Caution Deposit';
}

export interface Complaint {
  id: string;
  studentId: string;
  category: 'Electricity' | 'Water' | 'WiFi' | 'Cleaning' | 'Furniture';
  description: string;
  status: 'Pending' | 'In Progress' | 'Resolved';
  priority: 'Low' | 'Medium' | 'High';
  createdAt: string;
  assignedWardenId?: string;
  comments?: string[];
  imageUrl?: string;
}

export interface LeaveRequest {
  id: string;
  studentId: string;
  reason: string;
  fromDate: string;
  toDate: string;
  status: 'Pending' | 'Approved' | 'Rejected';
  proofUrl?: string;
}

export interface Attendance {
  id: string;
  studentId: string;
  date: string;
  checkIn: string | null;
  checkOut: string | null;
  status: 'Present' | 'Late' | 'Absent';
  lateReason: string | null;
}

export interface Notification {
  id: string;
  userId: string | 'all';
  title: string;
  message: string;
  type: 'payment' | 'booking' | 'complaint' | 'leave' | 'announcement';
  readBy: string[]; // List of user IDs who have read this
  createdAt: string;
}

const DATA_DIR = path.join(process.cwd(), 'data');
const DB_FILE = path.join(DATA_DIR, 'hostel_db.json');

// Interface for the central store
interface DbStore {
  users: User[];
  rooms: Room[];
  bookings: Booking[];
  payments: Payment[];
  complaints: Complaint[];
  leaveRequests: LeaveRequest[];
  attendance: Attendance[];
  notifications: Notification[];
}

// Global in-memory representation of store
let store: DbStore = {
  users: [],
  rooms: [],
  bookings: [],
  payments: [],
  complaints: [],
  leaveRequests: [],
  attendance: [],
  notifications: [],
};

// Helper to hash passwords using standard Node.js crypto (no external compiler requirements)
export function hashPassword(password: string): string {
  return crypto.createHash('sha256').update(password + '_hostel_salt').digest('hex');
}

// Generate premium mock images that resemble high-quality hotel or hostel rooms
const roomImages = {
  Deluxe: 'https://images.unsplash.com/photo-1590490360182-c33d57733427?auto=format&fit=crop&w=800&q=80',
  AC: 'https://images.unsplash.com/photo-1566665797739-1674de7a421a?auto=format&fit=crop&w=800&q=80',
  'Non-AC': 'https://images.unsplash.com/photo-1555854877-bab0e564b8d5?auto=format&fit=crop&w=800&q=80',
};

// Seed default data
function seedData() {
  // 1. Core accounts
  const adminPasswordHash = hashPassword('password');
  const wardenPasswordHash = hashPassword('password');
  const studentPasswordHash = hashPassword('password');

  const defaultUsers: User[] = [
    {
      id: 'usr_admin1',
      name: 'Aditya Vardhan',
      email: 'admin@hostel.com',
      role: 'admin',
      passwordHash: adminPasswordHash,
      phone: '+91 98765 43210',
      avatar: 'https://api.dicebear.com/7.x/adventurer/svg?seed=aditya',
      status: 'active',
    },
    {
      id: 'usr_warden1',
      name: 'Rajesh Sharma',
      email: 'warden@hostel.com',
      role: 'warden',
      passwordHash: wardenPasswordHash,
      phone: '+91 98765 43211',
      avatar: 'https://api.dicebear.com/7.x/adventurer/svg?seed=rajesh',
      status: 'active',
    },
    {
      id: 'usr_student1',
      name: 'Pavan Bukka',
      email: 'student@hostel.com',
      role: 'student',
      passwordHash: studentPasswordHash,
      phone: '+91 98765 43212',
      studentId: 'HST2026101',
      avatar: 'https://api.dicebear.com/7.x/adventurer/svg?seed=pavan',
      status: 'active',
    },
    {
      id: 'usr_student2',
      name: 'Nikhil Kumar',
      email: 'nikhil@hostel.com',
      role: 'student',
      passwordHash: studentPasswordHash,
      phone: '+91 98765 43213',
      studentId: 'HST2026102',
      avatar: 'https://api.dicebear.com/7.x/adventurer/svg?seed=nikhil',
      status: 'active',
    },
  ];

  // 2. High-fidelity Hostels Rooms
  const defaultRooms: Room[] = [
    {
      id: 'rm_101',
      roomNumber: '101',
      capacity: 2,
      occupied: 1, // 'usr_student2' is in 101
      type: 'Deluxe',
      price: 8500,
      floor: 1,
      image: roomImages.Deluxe,
      amenities: ['AC', 'High-Speed WiFi', 'Attached Bathroom', 'Study Table', 'Balcony', 'Personal Wardrobe'],
      status: 'Available',
    },
    {
      id: 'rm_102',
      roomNumber: '102',
      capacity: 2,
      occupied: 0,
      type: 'AC',
      price: 6500,
      floor: 1,
      image: roomImages.AC,
      amenities: ['AC', 'High-Speed WiFi', 'Shared Bathroom', 'Study Table', 'Personal Wardrobe'],
      status: 'Available',
    },
    {
      id: 'rm_201',
      roomNumber: '201',
      capacity: 3,
      occupied: 3,
      type: 'Non-AC',
      price: 4500,
      floor: 2,
      image: roomImages['Non-AC'],
      amenities: ['Ceiling Fan', 'WiFi', 'Shared Bathroom', 'Study Table', 'Personal Wardrobe'],
      status: 'Occupied',
    },
    {
      id: 'rm_202',
      roomNumber: '202',
      capacity: 2,
      occupied: 0,
      type: 'Deluxe',
      price: 8500,
      floor: 2,
      image: roomImages.Deluxe,
      amenities: ['AC', 'High-Speed WiFi', 'Attached Bathroom', 'Study Table', 'Balcony', 'Personal Wardrobe'],
      status: 'Available',
    },
    {
      id: 'rm_301',
      roomNumber: '301',
      capacity: 2,
      occupied: 1,
      type: 'AC',
      price: 6500,
      floor: 3,
      image: roomImages.AC,
      amenities: ['AC', 'High-Speed WiFi', 'Attached Bathroom', 'Study Table', 'Personal Wardrobe'],
      status: 'Available',
    },
    {
      id: 'rm_302',
      roomNumber: '302',
      capacity: 4,
      occupied: 2,
      type: 'Non-AC',
      price: 3500,
      floor: 3,
      image: roomImages['Non-AC'],
      amenities: ['Ceiling Fan', 'WiFi', 'Shared Bathroom', 'Study Table'],
      status: 'Available',
    },
  ];

  // 3. Outstanding Bookings
  const defaultBookings: Booking[] = [
    {
      id: 'bkg_1',
      studentId: 'usr_student2',
      roomId: 'rm_101',
      paymentStatus: 'Paid',
      bookingDate: '2026-05-15T09:00:00Z',
      status: 'Approved',
      term: '6 Months',
      receiptUrl: '/api/receipts/bkg_1',
    },
  ];

  // 4. Default Payments
  const defaultPayments: Payment[] = [
    {
      id: 'pay_1',
      bookingId: 'bkg_1',
      studentId: 'usr_student2',
      razorpayOrderId: 'order_Ol638Nsdja',
      razorpayPaymentId: 'pay_Ol639Jkasnd',
      amount: 8500,
      status: 'Success',
      date: '2026-05-15T09:12:00Z',
      type: 'Admission Fee',
    },
  ];

  // 5. Active Complaints
  const defaultComplaints: Complaint[] = [
    {
      id: 'comp_1',
      studentId: 'usr_student2',
      category: 'WiFi',
      description: 'The WiFi router on Fifth wing / Floor 1 is disconnective and has latency spikes.',
      status: 'In Progress',
      priority: 'High',
      createdAt: '2026-05-24T10:00:00Z',
      assignedWardenId: 'usr_warden1',
      comments: ['Replaced router firmware. Investigating ISP lines.'],
    },
    {
      id: 'comp_2',
      studentId: 'usr_student2',
      category: 'Cleaning',
      description: 'Request for room deep cleaning as per schedule.',
      status: 'Pending',
      priority: 'Low',
      createdAt: '2026-05-25T14:30:00Z',
    },
  ];

  // 6. Active Leaves
  const defaultLeaves: LeaveRequest[] = [
    {
      id: 'le_1',
      studentId: 'usr_student2',
      reason: 'Visiting hometown for sister marriage ceremony.',
      fromDate: '2026-06-01',
      toDate: '2026-06-05',
      status: 'Approved',
    },
  ];

  // 7. Attendance Records for May 25 and 26, 2026
  const defaultAttendance: Attendance[] = [
    {
      id: 'att_1',
      studentId: 'usr_student2',
      date: '2026-05-25',
      checkIn: '08:15 AM',
      checkOut: '09:30 PM',
      status: 'Present',
      lateReason: null,
    },
    {
      id: 'att_2',
      studentId: 'usr_student2',
      date: '2026-05-26',
      checkIn: '08:05 AM',
      checkOut: null,
      status: 'Present',
      lateReason: null,
    },
  ];

  // 8. Notifications
  const defaultNotifications: Notification[] = [
    {
      id: 'notif_1',
      userId: 'all',
      title: 'Hostel Outage Scheduled',
      message: 'Internet WiFi services will be offline for maintenance on 28th May from 2 AM to 4 AM.',
      type: 'announcement',
      readBy: [],
      createdAt: '2026-05-26T12:00:00Z',
    },
    {
      id: 'notif_2',
      userId: 'usr_student2',
      title: 'Room Booking Confirmed',
      message: 'Congratulations! Your booking for Room 101 has been approved.',
      type: 'booking',
      readBy: [],
      createdAt: '2026-05-15T09:30:00Z',
    },
  ];

  store = {
    users: defaultUsers,
    rooms: defaultRooms,
    bookings: defaultBookings,
    payments: defaultPayments,
    complaints: defaultComplaints,
    leaveRequests: defaultLeaves,
    attendance: defaultAttendance,
    notifications: defaultNotifications,
  };

  saveStore();
}

// Read database from FS
export function loadStore(): DbStore {
  try {
    if (!fs.existsSync(DATA_DIR)) {
      fs.mkdirSync(DATA_DIR, { recursive: true });
    }

    if (fs.existsSync(DB_FILE)) {
      const content = fs.readFileSync(DB_FILE, 'utf-8');
      store = JSON.parse(content);
      return store;
    } else {
      seedData();
      return store;
    }
  } catch (err) {
    console.error('Error loading file-based store, using active memory', err);
    return store;
  }
}

// Write database to FS
export function saveStore() {
  try {
    if (!fs.existsSync(DATA_DIR)) {
      fs.mkdirSync(DATA_DIR, { recursive: true });
    }
    fs.writeFileSync(DB_FILE, JSON.stringify(store, null, 2), 'utf-8');
  } catch (err) {
    console.error('Error saving file-based store', err);
  }
}

// Initialize on require
loadStore();

export const db = {
  getUsers: () => store.users,
  addUser: (user: User) => { store.users.push(user); saveStore(); return user; },
  updateUser: (id: string, updates: Partial<User>) => {
    store.users = store.users.map(u => u.id === id ? { ...u, ...updates } : u);
    saveStore();
    return store.users.find(u => u.id === id);
  },

  getRooms: () => store.rooms,
  addRoom: (room: Room) => { store.rooms.push(room); saveStore(); return room; },
  updateRoom: (id: string, updates: Partial<Room>) => {
    store.rooms = store.rooms.map(r => r.id === id ? { ...r, ...updates } : r);
    saveStore();
    return store.rooms.find(r => r.id === id);
  },
  deleteRoom: (id: string) => {
    store.rooms = store.rooms.filter(r => r.id !== id);
    saveStore();
  },

  getBookings: () => store.bookings,
  addBooking: (booking: Booking) => { store.bookings.push(booking); saveStore(); return booking; },
  updateBooking: (id: string, updates: Partial<Booking>) => {
    store.bookings = store.bookings.map(b => b.id === id ? { ...b, ...updates } : b);
    saveStore();
    return store.bookings.find(b => b.id === id);
  },

  getPayments: () => store.payments,
  addPayment: (payment: Payment) => { store.payments.push(payment); saveStore(); return payment; },
  updatePayment: (id: string, updates: Partial<Payment>) => {
    store.payments = store.payments.map(p => p.id === id ? { ...p, ...updates } : p);
    saveStore();
    return store.payments.find(p => p.id === id);
  },

  getComplaints: () => store.complaints,
  addComplaint: (complaint: Complaint) => { store.complaints.push(complaint); saveStore(); return complaint; },
  updateComplaint: (id: string, updates: Partial<Complaint>) => {
    store.complaints = store.complaints.map(c => c.id === id ? { ...c, ...updates } : c);
    saveStore();
    return store.complaints.find(c => c.id === id);
  },

  getLeaveRequests: () => store.leaveRequests,
  addLeaveRequest: (req: LeaveRequest) => { store.leaveRequests.push(req); saveStore(); return req; },
  updateLeaveRequest: (id: string, updates: Partial<LeaveRequest>) => {
    store.leaveRequests = store.leaveRequests.map(r => r.id === id ? { ...r, ...updates } : r);
    saveStore();
    return store.leaveRequests.find(r => r.id === id);
  },

  getAttendance: () => store.attendance,
  addAttendance: (att: Attendance) => { store.attendance.push(att); saveStore(); return att; },
  updateAttendance: (id: string, updates: Partial<Attendance>) => {
    store.attendance = store.attendance.map(a => a.id === id ? { ...a, ...updates } : a);
    saveStore();
    return store.attendance.find(a => a.id === id);
  },

  getNotifications: () => store.notifications,
  addNotification: (notif: Notification) => { store.notifications.push(notif); saveStore(); return notif; },
  updateNotification: (id: string, updates: Partial<Notification>) => {
    store.notifications = store.notifications.map(n => n.id === id ? { ...n, ...updates } : n);
    saveStore();
    return store.notifications.find(n => n.id === id);
  },
  saveStore: () => { saveStore(); },
};
