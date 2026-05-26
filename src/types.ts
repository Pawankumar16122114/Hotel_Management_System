export interface User {
  id: string;
  name: string;
  email: string;
  role: 'student' | 'admin' | 'warden';
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
  readBy: string[];
  createdAt: string;
}
