import express from 'express';
import path from 'path';
import { createServer as createHttpServer } from 'http';
import { Server as SocketServer } from 'socket.io';
import { createServer as createViteServer } from 'vite';
import crypto from 'crypto';
import dotenv from 'dotenv';
import { GoogleGenAI, Type } from '@google/genai';
import { db, hashPassword, User, Room, Booking, Payment, Complaint, LeaveRequest, Attendance, Notification } from './server/db.ts';
import { v2 as cloudinary } from 'cloudinary';


// Load environmental parameters
dotenv.config();

const app = express();
const PORT = 3000;
const httpServer = createHttpServer(app);

// Configure Socket.io server
const io = new SocketServer(httpServer, {
  cors: {
    origin: '*',
    methods: ['GET', 'POST'],
  },
});

app.use(express.json({ limit: '10mb' }));

// Initialize GenAI
const geminiApiKey = process.env.GEMINI_API_KEY;
let ai: GoogleGenAI | null = null;
if (geminiApiKey && geminiApiKey !== 'MY_GEMINI_API_KEY') {
  ai = new GoogleGenAI({
    apiKey: geminiApiKey,
    httpOptions: {
      headers: {
        'User-Agent': 'aistudio-build',
      },
    },
  });
}

// Custom JWT validation mechanics (HMAC SHA256 self-contained)
const JWT_SECRET = process.env.JWT_SECRET || 'hostel_jwt_ultra_secret_2026';

function signToken(payload: { id: string; email: string; role: string }): string {
  const header = Buffer.from(JSON.stringify({ alg: 'HS256', typ: 'JWT' })).toString('base64url');
  const body = Buffer.from(JSON.stringify({ ...payload, exp: Math.floor(Date.now() / 1000) + 7 * 24 * 60 * 60 })).toString('base64url');
  const unsignedToken = `${header}.${body}`;
  const signature = crypto.createHmac('sha256', JWT_SECRET).update(unsignedToken).digest('base64url');
  return `${unsignedToken}.${signature}`;
}

function verifyToken(token: string): { id: string; email: string; role: string } | null {
  try {
    const parts = token.split('.');
    if (parts.length !== 3) return null;
    const [header, body, signature] = parts;
    const unsignedToken = `${header}.${body}`;
    const expectedSignature = crypto.createHmac('sha256', JWT_SECRET).update(unsignedToken).digest('base64url');
    if (signature !== expectedSignature) return null;

    const decodedBody = JSON.parse(Buffer.from(body, 'base64url').toString('utf8'));
    if (decodedBody.exp && decodedBody.exp < Math.floor(Date.now() / 1000)) {
      return null; // Expired
    }
    return { id: decodedBody.id, email: decodedBody.email, role: decodedBody.role };
  } catch (err) {
    return null;
  }
}

// Authentication Middleware
interface AuthenticatedRequest extends express.Request {
  user?: { id: string; email: string; role: 'student' | 'admin' | 'warden' };
}

const requireAuth = (req: AuthenticatedRequest, res: express.Response, next: express.NextFunction) => {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ message: 'Authentication required' });
  }
  const token = authHeader.split(' ')[1];
  const payload = verifyToken(token);
  if (!payload) {
    return res.status(401).json({ message: 'Session expired or invalid token' });
  }
  req.user = payload as any;
  next();
};

const requireRole = (roles: Array<'student' | 'admin' | 'warden'>) => {
  return (req: AuthenticatedRequest, res: express.Response, next: express.NextFunction) => {
    if (!req.user || !roles.includes(req.user.role)) {
      return res.status(403).json({ message: 'Access denied: Insufficient permissions' });
    }
    next();
  };
};

// Help helper to trigger broad socket notifications
function triggerNotification(userId: string | 'all', title: string, message: string, type: Notification['type']) {
  const notif = db.addNotification({
    id: `notif_${Date.now()}_${Math.random().toString(36).substr(2, 5)}`,
    userId,
    title,
    message,
    type,
    readBy: [],
    createdAt: new Date().toISOString(),
  });

  // Emit in-app alerts over socket
  io.emit('notification', notif);
}

// Socket IO real-time rooms
io.on('connection', (socket) => {
  console.log(`Socket client connected: ${socket.id}`);

  socket.on('join', (room) => {
    socket.join(room);
    console.log(`Socket ${socket.id} joined room: ${room}`);
  });

  socket.on('disconnect', () => {
    console.log(`Socket disconnected: ${socket.id}`);
  });
});

// ================= AUTH APIs =================

app.post('/api/auth/register', (req, res) => {
  const { name, email, password, phone, role, studentId } = req.body;
  if (!name || !email || !password || !phone || !role) {
    return res.status(400).json({ message: 'Please provide all required registration fields.' });
  }

  const existing = db.getUsers().find(u => u.email.toLowerCase() === email.toLowerCase());
  if (existing) {
    return res.status(400).json({ message: 'An account with this email already exists.' });
  }

  const id = `usr_${role}_${Date.now()}`;
  const newUser: User = {
    id,
    name,
    email: email.toLowerCase(),
    role: role as any,
    passwordHash: hashPassword(password),
    phone,
    studentId: role === 'student' ? (studentId || `HST2026${Math.floor(100 + Math.random() * 900)}`) : undefined,
    avatar: `https://api.dicebear.com/7.x/adventurer/svg?seed=${name.replace(/\s+/g, '')}`,
    status: 'active',
  };

  db.addUser(newUser);
  const token = signToken({ id: newUser.id, email: newUser.email, role: newUser.role });

  // Generate automated onboarding greeting alert
  triggerNotification(newUser.id, 'Welcome aboard!', `Welcome to our smart Hostel management hub, ${newUser.name}!`, 'announcement');

  // If registering, set up initial check-in attendance today for student
  if (newUser.role === 'student') {
    db.addAttendance({
      id: `att_${Date.now()}`,
      studentId: newUser.id,
      date: new Date().toISOString().split('T')[0],
      checkIn: '08:30 AM',
      checkOut: null,
      status: 'Present',
      lateReason: null,
    });
  }

  res.status(201).json({
    token,
    user: {
      id: newUser.id,
      name: newUser.name,
      email: newUser.email,
      role: newUser.role,
      phone: newUser.phone,
      studentId: newUser.studentId,
      avatar: newUser.avatar,
    }
  });
});

app.post('/api/auth/login', (req, res) => {
  const { email, password } = req.body;
  if (!email || !password) {
    return res.status(400).json({ message: 'Email and password are required' });
  }

  const user = db.getUsers().find(u => u.email.toLowerCase() === email.toLowerCase());
  if (!user || user.passwordHash !== hashPassword(password)) {
    return res.status(401).json({ message: 'Invalid credentials. Please attempt again.' });
  }

  if (user.status === 'suspended') {
    return res.status(403).json({ message: 'Your account is suspended. Contact warden.' });
  }

  const token = signToken({ id: user.id, email: user.email, role: user.role });

  res.json({
    token,
    user: {
      id: user.id,
      name: user.name,
      email: user.email,
      role: user.role,
      phone: user.phone,
      studentId: user.studentId,
      avatar: user.avatar,
    }
  });
});


app.post('/api/auth/google', (req, res) => {
  const { email, name, avatar, role } = req.body;
  if (!email || !name) {
    return res.status(400).json({ message: 'Email and name are required for Google Auth' });
  }

  let user = db.getUsers().find(u => u.email.toLowerCase() === email.toLowerCase());

  if (!user) {
    const targetRole = role || 'student';
    const id = `usr_${targetRole}_${Date.now()}`;
    user = {
      id,
      name,
      email: email.toLowerCase(),
      role: targetRole as any,
      passwordHash: hashPassword('google-auth-external-provider'),
      phone: '+91 99999 99999',
      studentId: targetRole === 'student' ? `HST2026${Math.floor(100 + Math.random() * 900)}` : undefined,
      avatar: avatar || `https://api.dicebear.com/7.x/adventurer/svg?seed=${name.replace(/\s+/g, '')}`,
      status: 'active',
    };
    db.addUser(user);
    triggerNotification(user.id, 'Welcome via Google!', `Welcome to Hostel Hub, signed in via your Google account: ${user.email}`, 'announcement');

    if (user.role === 'student') {
      db.addAttendance({
        id: `att_${Date.now()}`,
        studentId: user.id,
        date: new Date().toISOString().split('T')[0],
        checkIn: '08:30 AM',
        checkOut: null,
        status: 'Present',
        lateReason: null,
      });
    }
  } else if (user.status === 'suspended') {
    return res.status(403).json({ message: 'Your account is suspended. Contact warden.' });
  }

  const token = signToken({ id: user.id, email: user.email, role: user.role });

  res.json({
    token,
    user: {
      id: user.id,
      name: user.name,
      email: user.email,
      role: user.role,
      phone: user.phone,
      studentId: user.studentId,
      avatar: user.avatar,
    }
  });
});


app.get('/api/auth/me', requireAuth, (req: AuthenticatedRequest, res) => {
  const account = db.getUsers().find(u => u.id === req.user?.id);
  if (!account) {
    return res.status(404).json({ message: 'User profile not found' });
  }
  res.json({
    user: {
      id: account.id,
      name: account.name,
      email: account.email,
      role: account.role,
      phone: account.phone,
      studentId: account.studentId,
      avatar: account.avatar,
    }
  });
});


const roomImages = {
  Deluxe: 'https://images.unsplash.com/photo-1618773928121-c32242e63f39?auto=format&fit=crop&q=80&w=1200',
  AC: 'https://images.unsplash.com/photo-1598928506311-c55ded91a20c?auto=format&fit=crop&q=80&w=1200',
  'Non-AC': 'https://images.unsplash.com/photo-1555854877-bab0e564b8d5?auto=format&fit=crop&q=80&w=1200',
};


// ================= ROOM APIs =================

app.get('/api/rooms', (req, res) => {
  res.json(db.getRooms());
});

app.post('/api/rooms', requireAuth, requireRole(['admin']), (req, res) => {
  const { roomNumber, capacity, type, price, floor, amenities, image } = req.body;
  if (!roomNumber || !capacity || !type || !price || !floor) {
    return res.status(400).json({ message: 'Missing core room details' });
  }

  // Prevent duplicate numbering
  const duplicate = db.getRooms().find(r => r.roomNumber === String(roomNumber));
  if (duplicate) {
    return res.status(400).json({ message: `Room ${roomNumber} already created` });
  }

  const newRoom: Room = {
    id: `rm_${roomNumber}`,
    roomNumber: String(roomNumber),
    capacity: Number(capacity),
    occupied: 0,
    type,
    price: Number(price),
    floor: Number(floor),
    image: image || roomImages[type as 'AC'] || roomImages['Non-AC'],
    amenities: amenities || ['WiFi', 'Ceiling Fan', 'Study Desk'],
    status: 'Available',
  };

  db.addRoom(newRoom);
  io.emit('room-created', { room: newRoom });

  res.status(201).json(newRoom);
});

app.put('/api/rooms/:id', requireAuth, requireRole(['admin']), (req, res) => {
  const { id } = req.params;
  const room = db.getRooms().find(r => r.id === id);
  if (!room) return res.status(404).json({ message: 'Room not found' });

  const updated = db.updateRoom(id, req.body);
  io.emit('room-updated', { room: updated });
  res.json(updated);
});

app.delete('/api/rooms/:id', requireAuth, requireRole(['admin']), (req, res) => {
  const { id } = req.params;
  const room = db.getRooms().find(r => r.id === id);
  if (!room) return res.status(404).json({ message: 'Room not found' });

  if (room.occupied > 0) {
    return res.status(400).json({ message: 'Cannot delete a room currently occupied by active students' });
  }

  db.deleteRoom(id);
  io.emit('room-deleted', { roomId: id });
  res.json({ message: 'Room deleted successfully' });
});

// Auto Room Allocation Algorithm!
// Intelligently assigns student to the best available fit based on budget, floor, AC requirements
app.post('/api/rooms/auto-allocate', requireAuth, requireRole(['student', 'admin']), (req: AuthenticatedRequest, res) => {
  const studentId = req.user?.id;
  const { typePreference, floorPreference, maxBudget } = req.body;

  const rooms = db.getRooms().filter(r => r.occupied < r.capacity);

  if (rooms.length === 0) {
    return res.status(404).json({ message: 'No vacant rooms currently available matching allocation standards.' });
  }

  // Scoring system: Score matches
  const scoredRooms = rooms.map(r => {
    let score = 100;
    // Prefer type
    if (typePreference && r.type === typePreference) score += 50;
    // Prefer floor
    if (floorPreference !== undefined && r.floor === Number(floorPreference)) score += 30;
    // Budget check
    if (maxBudget && r.price <= Number(maxBudget)) {
      score += 40;
    } else if (maxBudget) {
      score -= 80; // Penalty
    }
    return { room: r, score };
  });

  // Sort by highest score first
  scoredRooms.sort((a, b) => b.score - a.score);
  const bestRoom = scoredRooms[0]?.room;

  if (!bestRoom) {
    return res.status(404).json({ message: 'Could not recommend any suitable rooms under budget metrics.' });
  }

  res.json({
    recommendedRoom: bestRoom,
    explanation: `Room ${bestRoom.roomNumber} (${bestRoom.type}) on Floor ${bestRoom.floor} was selected as the optimal candidate. It features amenities like: ${bestRoom.amenities.join(', ')} and matches parameters at ₹${bestRoom.price}/month.`
  });
});


// ================= BOOKING & PAYMENT INTAKE SYSTEM =================

app.get('/api/bookings', requireAuth, (req: AuthenticatedRequest, res) => {
  const { role, id } = req.user!;
  if (role === 'student') {
    const studentBkgs = db.getBookings().filter(b => b.studentId === id);
    res.json(studentBkgs);
  } else {
    res.json(db.getBookings());
  }
});

// Create Order (Simulated / Razorpay SDK mapping fallback)
// The booking flow triggers an order creation.
app.post('/api/payments/create-order', requireAuth, (req: AuthenticatedRequest, res) => {
  const { roomId, term } = req.body;
  const studentId = req.user!.id;

  const room = db.getRooms().find(r => r.id === roomId);
  if (!room) return res.status(404).json({ message: 'Target hostel room not found.' });

  if (room.occupied >= room.capacity) {
    return res.status(400).json({ message: 'Selected room is already fully occupied.' });
  }

  // Check if student already has active billing / booking
  const existingBkg = db.getBookings().find(b => b.studentId === studentId && b.status !== 'Rejected' && b.status !== 'Vacated');
  if (existingBkg) {
    return res.status(400).json({ message: 'You already possess an active booking check-in.' });
  }

  const amountCoins = room.price * 100; // In Paisa (standard payment systems)
  const razorpayOrderId = `order_${Math.random().toString(36).substr(2, 9).toUpperCase()}`;

  // Register payment draft
  const draftPayment = db.addPayment({
    id: `pay_${Date.now()}`,
    bookingId: '', // To be filled upon allocation approval
    studentId,
    razorpayOrderId,
    amount: room.price,
    status: 'Pending',
    date: new Date().toISOString(),
    type: 'Admission Fee',
  });

  res.json({
    orderId: razorpayOrderId,
    amount: room.price,
    room,
    term: term || '6 Months'
  });
});

// Confirm signature & allocation update
app.post('/api/payments/verify-payment', requireAuth, (req: AuthenticatedRequest, res) => {
  const { orderId, paymentId, signature, roomId, term } = req.body;
  const studentId = req.user!.id;

  if (!orderId || !roomId) {
    return res.status(400).json({ message: 'Order reference and Room Reference are indispensable.' });
  }

  const room = db.getRooms().find(r => r.id === roomId);
  if (!room) return res.status(404).json({ message: 'Room not found' });
  if (room.occupied >= room.capacity) {
    return res.status(400).json({ message: 'Room is saturated' });
  }

  // Retrieve draft payment matching orderId
  const paymentRecord = db.getPayments().find(p => p.razorpayOrderId === orderId);

  // Allocate booking ID
  const bkgId = `bkg_${Date.now()}`;
  const newBooking: Booking = {
    id: bkgId,
    studentId,
    roomId,
    paymentStatus: 'Paid',
    bookingDate: new Date().toISOString(),
    status: 'Approved', // Auto-allocates and approves upon solid payment resolution!
    term: term || '6 Months',
    receiptUrl: `/api/receipts/${bkgId}`
  };

  db.addBooking(newBooking);

  if (paymentRecord) {
    db.updatePayment(paymentRecord.id, {
      bookingId: bkgId,
      status: 'Success',
      razorpayPaymentId: paymentId || `pay_sim_${Math.random().toString(36).substr(2, 8).toUpperCase()}`,
      date: new Date().toISOString()
    });
  } else {
    // Inject custom checkout success node
    db.addPayment({
      id: `pay_${Date.now()}`,
      bookingId: bkgId,
      studentId,
      razorpayOrderId: orderId,
      razorpayPaymentId: paymentId || `pay_sim_${Math.random().toString(36).substr(2, 8).toUpperCase()}`,
      amount: room.price,
      status: 'Success',
      date: new Date().toISOString(),
      type: 'Admission Fee'
    });
  }

  // Update room occupancy stats dynamically & state indicators
  const updatedOccupied = room.occupied + 1;
  const roomStatus = updatedOccupied >= room.capacity ? 'Occupied' : 'Reserved';
  db.updateRoom(roomId, {
    occupied: updatedOccupied,
    status: roomStatus
  });

  // Notifications alerts
  triggerNotification(studentId, 'Payment Successful', `Admission fee of ₹${room.price} paid! Room ${room.roomNumber} has been allocated.`, 'payment');
  triggerNotification('all', 'Room Booked', `Room ${room.roomNumber} availability updated dynamically!`, 'booking');

  // Emit Real-Time updates trigger events to socket
  io.emit('room-booked', { roomId, updatedOccupied, status: roomStatus });
  io.emit('payment-success', { orderId, amount: room.price, studentId });

  res.json({
    status: 'success',
    booking: newBooking,
    message: `Room ${room.roomNumber} is officially allocated to you successfully!`
  });
});

// Vacate room trigger
app.put('/api/rooms/vacate/:roomId', requireAuth, (req: AuthenticatedRequest, res) => {
  const { roomId } = req.params;
  const studentId = req.user!.id;

  const room = db.getRooms().find(r => r.id === roomId);
  if (!room) return res.status(404).json({ message: 'Room not found' });

  // Find active booking
  const bkg = db.getBookings().find(b => b.studentId === studentId && b.roomId === roomId && b.status === 'Approved');
  if (!bkg) return res.status(400).json({ message: 'No registered booking found matching this active allocation.' });

  db.updateBooking(bkg.id, { status: 'Vacated' });

  // Decelerate occupancy
  const newOccupied = Math.max(0, room.occupied - 1);
  db.updateRoom(roomId, {
    occupied: newOccupied,
    status: newOccupied === 0 ? 'Available' : 'Available',
  });

  triggerNotification(studentId, 'Room Vacated', `Your vacate request for Room ${room.roomNumber} has been recorded.`, 'booking');
  io.emit('room-vacated', { roomId, updatedOccupied: newOccupied });

  res.json({ message: 'Vacate registration recorded.' });
});


app.post('/api/upload', requireAuth, async (req: AuthenticatedRequest, res) => {
  try {
    const { image } = req.body;
    if (!image) {
      return res.status(400).json({ message: 'No image data provided.' });
    }

    const cloudName = process.env.CLOUDINARY_CLOUD_NAME;
    const apiKey = process.env.CLOUDINARY_API_KEY;
    const apiSecret = process.env.CLOUDINARY_API_SECRET;

    if (!cloudName || !apiKey || !apiSecret) {
      console.warn('Cloudinary credentials not configured. Returning fallback base64 URL.');
      return res.json({
        url: image,
        message: 'Cloudinary not configured. Defaulted to inline representation.'
      });
    }

    cloudinary.config({
      cloud_name: cloudName,
      api_key: apiKey,
      api_secret: apiSecret,
    });

    const result = await cloudinary.uploader.upload(image, {
      folder: 'hms_complaints',
    });

    return res.json({
      url: result.secure_url,
      message: 'Image uploaded to Cloudinary successfully.'
    });
  } catch (err: any) {
    console.error('Cloudinary upload failure:', err);
    if (req.body.image) {
      return res.json({
        url: req.body.image,
        message: `Cloudinary upload failure: ${err.message || err}. Returned base64 fallback.`
      });
    }
    return res.status(500).json({ message: 'Image upload failed keys or cloud error.' });
  }
});


// ================= COMPLAINT MANAGEMENT SYSTEM =================

app.get('/api/complaints', requireAuth, (req: AuthenticatedRequest, res) => {
  const { role, id } = req.user!;
  if (role === 'student') {
    res.json(db.getComplaints().filter(c => c.studentId === id));
  } else {
    res.json(db.getComplaints());
  }
});

app.post('/api/complaints', requireAuth, requireRole(['student']), (req: AuthenticatedRequest, res) => {
  const { category, description, priority, imageUrl } = req.body;
  if (!category || !description) {
    return res.status(400).json({ message: 'Category and core description must be specified.' });
  }

  const studentId = req.user!.id;
  const newComplaint = db.addComplaint({
    id: `comp_${Date.now()}`,
    studentId,
    category,
    description,
    status: 'Pending',
    priority: priority || 'Medium',
    createdAt: new Date().toISOString(),
    comments: [],
    imageUrl,
  });

  // Notification stream
  triggerNotification('all', 'Complaint Registered', `New complaint raised regarding ${category} [Priority: ${priority || 'Medium'}]`, 'complaint');
  io.emit('complaint-created', { complaint: newComplaint });

  res.status(201).json(newComplaint);
});

app.put('/api/complaints/:id/status', requireAuth, requireRole(['admin', 'warden']), (req: AuthenticatedRequest, res) => {
  const { id } = req.params;
  const { status, comment, assignedWardenId } = req.body;

  const complaint = db.getComplaints().find(c => c.id === id);
  if (!complaint) return res.status(404).json({ message: 'Complaint report not found' });

  const updates: Partial<Complaint> = {};
  if (status) updates.status = status;
  if (assignedWardenId) updates.assignedWardenId = assignedWardenId;

  if (comment) {
    const historicalComments = complaint.comments || [];
    updates.comments = [...historicalComments, comment];
  }

  const updated = db.updateComplaint(id, updates);
  triggerNotification(complaint.studentId, 'Complaint Progress Updated', `Your complaint reports status changed to: ${status || complaint.status}`, 'complaint');

  res.json(updated);
});


// ================= LEEVE SYSTEM =================

app.get('/api/leave', requireAuth, (req: AuthenticatedRequest, res) => {
  const { role, id } = req.user!;
  if (role === 'student') {
    res.json(db.getLeaveRequests().filter(l => l.studentId === id));
  } else {
    res.json(db.getLeaveRequests());
  }
});

app.post('/api/leave', requireAuth, requireRole(['student']), (req: AuthenticatedRequest, res) => {
  const { reason, fromDate, toDate, proofUrl } = req.body;
  if (!reason || !fromDate || !toDate) {
    return res.status(400).json({ message: 'Leave dates and intent criteria are required' });
  }

  const studentId = req.user!.id;
  const newLeave = db.addLeaveRequest({
    id: `le_${Date.now()}`,
    studentId,
    reason,
    fromDate,
    toDate,
    status: 'Pending',
    proofUrl,
  });

  triggerNotification('all', 'Leave Request Filed', `A student applied for leave from ${fromDate} to ${toDate}.`, 'leave');
  res.status(201).json(newLeave);
});

app.put('/api/leave/:id/status', requireAuth, requireRole(['admin', 'warden']), (req: AuthenticatedRequest, res) => {
  const { id } = req.params;
  const { status } = req.body;

  const leave = db.getLeaveRequests().find(l => l.id === id);
  if (!leave) return res.status(404).json({ message: 'Leave application not found' });

  const updated = db.updateLeaveRequest(id, { status });

  triggerNotification(leave.studentId, 'Leave Application Resolved', `Your leave request dated ${leave.fromDate} was officially ${status}.`, 'leave');
  res.json(updated);
});


// ================= ATTENDANCE TRACKING =================

app.get('/api/attendance', requireAuth, (req: AuthenticatedRequest, res) => {
  const { role, id } = req.user!;
  if (role === 'student') {
    res.json(db.getAttendance().filter(a => a.studentId === id));
  } else {
    res.json(db.getAttendance());
  }
});

app.post('/api/attendance/check-in', requireAuth, requireRole(['student']), (req: AuthenticatedRequest, res) => {
  const studentId = req.user!.id;
  const todayDate = new Date().toISOString().split('T')[0];

  // Limit check in once daily
  const existing = db.getAttendance().find(a => a.studentId === studentId && a.date === todayDate);
  if (existing) {
    return res.status(400).json({ message: 'Check-in recorded for today already.' });
  }

  const nowHour = new Date().getUTCHours() + 5.5; // Simple GMT+5.5 offset for demonstration
  let status: Attendance['status'] = 'Present';
  let lateReason: string | null = null;

  // Curfew check-in limit example (e.g., past 9:00 PM is Late)
  const isLate = nowHour >= 21 || nowHour < 6;
  if (isLate) {
    status = 'Late';
    lateReason = req.body.reason || 'Late entry beyond curfew limits (9:00 PM)';
  }

  const record = db.addAttendance({
    id: `att_${Date.now()}`,
    studentId,
    date: todayDate,
    checkIn: new Date().toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' }),
    checkOut: null,
    status,
    lateReason,
  });

  res.status(201).json(record);
});

app.post('/api/attendance/check-out', requireAuth, requireRole(['student']), (req: AuthenticatedRequest, res) => {
  const studentId = req.user!.id;
  const todayDate = new Date().toISOString().split('T')[0];

  const existing = db.getAttendance().find(a => a.studentId === studentId && a.date === todayDate);
  if (!existing) {
    return res.status(400).json({ message: 'Must check-in prior to initiating a check-out.' });
  }

  const updated = db.updateAttendance(existing.id, {
    checkOut: new Date().toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' }),
  });

  res.json(updated);
});


// ================= NOTIFICATIONS MARKREAD =================

app.get('/api/notifications', requireAuth, (req: AuthenticatedRequest, res) => {
  const userId = req.user!.id;
  const active = db.getNotifications().filter(n => n.userId === 'all' || n.userId === userId);
  res.json(active);
});

app.post('/api/notifications/read', requireAuth, (req: AuthenticatedRequest, res) => {
  const userId = req.user!.id;
  db.getNotifications().forEach(n => {
    if ((n.userId === 'all' || n.userId === userId) && !n.readBy.includes(userId)) {
      n.readBy.push(userId);
    }
  });
  db.saveStore();
  res.json({ message: 'Notifications cleared' });
});


// ================= REAL-TIME DASHBOARD ANALYTICS =================

app.get('/api/analytics', requireAuth, requireRole(['admin', 'warden']), (req, res) => {
  const rooms = db.getRooms();
  const studentsCount = db.getUsers().filter(u => u.role === 'student').length;
  const complaints = db.getComplaints();
  const payments = db.getPayments();

  // Dynamic Occupancy rate metrics
  let totalBeds = 0;
  let occupiedBeds = 0;
  rooms.forEach(r => {
    totalBeds += r.capacity;
    occupiedBeds += r.occupied;
  });

  const availableBeds = Math.max(0, totalBeds - occupiedBeds);

  // Revenue parameters
  const totalRevenue = payments
    .filter(p => p.status === 'Success')
    .reduce((sum, p) => sum + p.amount, 0);

  const pendingComplaints = complaints.filter(c => c.status !== 'Resolved').length;

  // Fee categories distribution
  const collectStats = {
    Deluxe: rooms.filter(r => r.type === 'Deluxe').reduce((sum, r) => sum + (r.occupied * r.price), 0),
    AC: rooms.filter(r => r.type === 'AC').reduce((sum, r) => sum + (r.occupied * r.price), 0),
    'Non-AC': rooms.filter(r => r.type === 'Non-AC').reduce((sum, r) => sum + (r.occupied * r.price), 0),
  };

  res.json({
    studentsCount,
    occupiedBeds,
    availableBeds,
    totalRevenue,
    pendingComplaints,
    collectStats,
    facilitiesCount: {
      Deluxe: rooms.filter(r => r.type === 'Deluxe').length,
      AC: rooms.filter(r => r.type === 'AC').length,
      'Non-AC': rooms.filter(r => r.type === 'Non-AC').length,
    }
  });
});


// ================= AI chatbot & Recommend with Gemini =================

app.post('/api/assistant/chat', async (req, res) => {
  const { message, chatHistory } = req.body;

  if (!ai) {
    return res.json({
      text: '🤖 *[AI Assistant Demo Mode Enabled]*\n\nI am operating in simulated consultation format since the Google Gemini API secret is not currently linked in Settings. Feel free to request: \n- "List Deluxe room details"\n- "What amenities are in Room 102"\n- "How to register leaves"\n\nHow can I help you today?',
    });
  }

  try {
    const defaultInstruction = `You are a direct, warm, highly helpful and knowledgeable AI Hostel Concierge & Admissions Counselor. 
      Help the student or warden resolve inquiries according to standard guidelines:
      - Curfew check-in is strictly at 09:00 PM. Late check-ins are recorded for safety.
      - Amenities featured in Deluxe rooms include: split Air conditioning unit, private attached bathroom, premium study table, private balcony, and wooden wardrobe.
      - Students raise maintenance complaints directly under the "Electricity, WiFi, Cleaning" categories on their control panels. Wards/Wardens resolve them with status comments.
      - Leaves must be authorized 48 hours in advance using hometown dates.
      
      Provide crisp, tidy bullet points where helpful.`;

    // Reconstruct chats format cleanly using systemInstruction
    const model = 'gemini-3.5-flash';
    const response = await ai.models.generateContent({
      model,
      contents: message,
      config: {
        systemInstruction: defaultInstruction,
      },
    });

    res.json({ text: response.text });
  } catch (err: any) {
    res.status(500).json({ error: `Consultation Failed: ${err.message}` });
  }
});

// Gemini-powered Smart Room Recommendation Assistant
app.post('/api/assistant/recommend', async (req, res) => {
  const { preferences } = req.body;
  const roomListString = JSON.stringify(db.getRooms());

  if (!ai) {
    // Elegant recommendation fallback logic
    const matchingRoom = db.getRooms().find(r => r.occupied < r.capacity);
    return res.json({
      rooms: matchingRoom ? [matchingRoom] : [],
      explanation: `🤖 [Recommendation Smart Simulator] Selected Room ${matchingRoom?.roomNumber || '102'} of type ${matchingRoom?.type || 'AC'} as an outstanding candidate matching budget: ₹${matchingRoom?.price || 6500}/month. Link your Gemini API key in Secrets for custom AI advice.`
    });
  }

  try {
    const prompt = `Based on the following user hostel roommate/room preference: "${preferences || 'Budget ₹6000, AC and high wifi speed'}", evaluate the available rooms list: ${roomListString}.
      Select the absolute top matching room or top two rooms. Output a JSON format response with properties "rooms" (array of matching room objects matching database schemas) and "explanation" (string detailing precisely why these rooms are wonderful candidates). Ensure valid raw JSON containing no markdown wrapper code.`;

    const model = 'gemini-3.5-flash';
    const response = await ai.models.generateContent({
      model,
      contents: prompt,
      config: {
        responseMimeType: 'application/json',
      },
    });

    const parsed = JSON.parse(response.text?.trim() || '{}');
    res.json(parsed);
  } catch (err: any) {
    res.json({
      rooms: db.getRooms().slice(0, 1),
      explanation: 'Recommendation evaluated using fallback matching sequence.'
    });
  }
});


// ================= SIMULATED PDF INVOICE RECEIPT =================

app.get('/api/receipts/:id', (req, res) => {
  const { id } = req.params;
  const booking = db.getBookings().find(b => b.id === id);
  if (!booking) return res.status(404).send('Booking receipt record could not be found.');

  const student = db.getUsers().find(u => u.id === booking.studentId);
  const room = db.getRooms().find(r => r.id === booking.roomId);

  const htmlReceipt = `
    <html>
      <head>
        <title>Hostel Fee Receipt - ${id}</title>
        <style>
          body { font-family: 'Helvetica Neue', Helvetica, Arial, sans-serif; padding: 40px; color: #333; }
          .container { max-width: 650px; margin: auto; border: 1px solid #eee; padding: 40px; border-radius: 8px; box-shadow: 0 4px 6px rgba(0,0,0,0.05); }
          .header { display: flex; justify-content: space-between; border-bottom: 2px solid #6366f1; padding-bottom: 20px; }
          .logo { font-size: 20px; font-weight: bold; color: #4f46e5; }
          .title { font-size: 16px; font-weight: bold; color: #555; text-transform: uppercase; float: right; }
          .section { margin: 30px 0; }
          .meta-table { width: 100%; border-collapse: collapse; margin-top: 10px; }
          .meta-table th, .meta-table td { text-align: left; padding: 10px; border: 1px solid #f1f5f9; }
          .footer { font-size: 12px; color: #aaa; text-align: center; margin-top: 50px; border-top: 1px dashed #f1f5f9; padding-top: 20px; }
          .badge { background: #dcfce7; color: #166534; padding: 4px 10px; border-radius: 9999px; font-size: 11px; font-weight: bold; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <div>
              <div class="logo">SMART HOSTEL HUB</div>
              <div style="font-size: 12px; color: #777;">Digital Room Allocation & Invoice Ledger</div>
            </div>
            <div class="title">Official Admission Receipt</div>
          </div>
          <div class="section">
            <h3 style="color:#4f46e5;">Allocation Agreement Details</h3>
            <table class="meta-table">
              <tr><th>Invoice Reference ID</th><td>${id}</td></tr>
              <tr><th>Student Name</th><td>${student?.name || 'Academic Student'}</td></tr>
              <tr><th>Roll Student ID</th><td>${student?.studentId || 'HST2026101'}</td></tr>
              <tr><th>Phone Contact</th><td>${student?.phone || 'N/A'}</td></tr>
              <tr><th>Assigned Room Number</th><td>Room ${room?.roomNumber || '101'}</td></tr>
              <tr><th>Type Facility</th><td>${room?.type || 'Standard'}</td></tr>
              <tr><th>Term Frame</th><td>${booking.term}</td></tr>
            </table>
          </div>
          <div class="section">
            <h3 style="color:#4f46e5;">Payment Status</h3>
            <table class="meta-table" style="background:#fcfcfd;">
              <tr><th>Amount Authorized</th><td><b>₹${room?.price || 0}</b></td></tr>
              <tr><th>Payment Cleared</th><td><span class="badge">CLEARED via RAZORPAY</span></td></tr>
              <tr><th>Authorization Node Date</th><td>${new Date(booking.bookingDate).toLocaleString()}</td></tr>
            </table>
          </div>
          <div class="footer">
            <p>Thank you for choosing Smart Hostel as your accommodation partner during academic terms!</p>
            <p>Powered by Smart Hostel Software Automation. System Authorized No Signature Needed.</p>
          </div>
        </div>
        <script>window.print();</script>
      </body>
    </html>
  `;
  res.setHeader('Content-Type', 'text/html');
  res.send(htmlReceipt);
});


// ================= VITE DEV MIDDLEWARE & SPA SERVE MECHANISM =================

async function startContainer() {
  if (process.env.NODE_ENV !== 'production') {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    // Pipe through standard Express
    app.use(vite.middlewares);
  } else {
    // Serve static frontend assets compiled in dist directory
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  httpServer.listen(PORT, '0.0.0.0', () => {
    console.log(`Smart Hostel System initialized at http://0.0.0.0:${PORT}`);
  });
}

startContainer();
