import React, { useState } from 'react';
import { 
  Building2, 
  Mail, 
  Lock, 
  UserPlus, 
  ArrowRight, 
  Phone, 
  User as UserIcon, 
  HelpCircle,
  CheckCircle,
  AlertCircle,
  Loader2,
  LockKeyhole
} from 'lucide-react';
import { User } from '../types';
import { googleSignIn } from '../firebase';

interface AuthPageProps {
  onAuthSuccess: (user: User, token: string) => void;
}

export default function AuthPage({ onAuthSuccess }: AuthPageProps) {
  const [view, setView] = useState<'login' | 'register' | 'forgot'>('login');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  // Form states
  const [name, setName] = useState('');
  const [email, setEmail] = useState('student@hostel.com');
  const [password, setPassword] = useState('password');
  const [phone, setPhone] = useState('+91 98765 43212');
  const [role, setRole] = useState<'student' | 'admin' | 'warden'>('student');
  const [studentId, setStudentId] = useState('');

  // Forgot password flow
  const [forgotEmail, setForgotEmail] = useState('');

  const handleGoogleSignIn = async () => {
    setLoading(true);
    setError(null);
    try {
      const result = await googleSignIn();
      if (result) {
        // Sync or register Google-authenticated account info with our backend 
        const resp = await fetch('/api/auth/google', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            email: result.user.email,
            name: result.user.displayName || 'Google User',
            avatar: result.user.photoURL,
            role: role // Link as chosen role in dropdown
          })
        });
        const data = await resp.json();
        if (!resp.ok) {
          throw new Error(data.message || 'Google user registry failed.');
        }

        onAuthSuccess(data.user, data.token);
      }
    } catch (err: any) {
      setError(err.message || 'Google authorization session interrupted.');
    } finally {
      setLoading(false);
    }
  };

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      const response = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password }),
      });
      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.message || 'Login failed. Please verify credentials.');
      }
      onAuthSuccess(data.user, data.token);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      const response = await fetch('/api/auth/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name, email, password, phone, role, studentId }),
      });
      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.message || 'Registration failed.');
      }
      onAuthSuccess(data.user, data.token);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleForgot = (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setTimeout(() => {
      setLoading(false);
      setSuccess(`A password reset authorization link has been forwarded to ${forgotEmail}. Please review your inbox.`);
      setTimeout(() => {
        setSuccess(null);
        setView('login');
      }, 4000);
    }, 1500);
  };

  return (
    <div className="min-h-screen grid grid-cols-1 lg:grid-cols-12 bg-slate-50">
      
      {/* Left visual panel */}
      <div className="hidden lg:flex lg:col-span-5 bg-slate-900 flex-col justify-between p-12 text-white relative overflow-hidden">
        
        {/* Abstract background blobs */}
        <div className="absolute top-0 right-0 w-96 h-96 bg-indigo-600/15 rounded-full blur-3xl -mr-20 -mt-20"></div>
        <div className="absolute bottom-0 left-0 w-80 h-80 bg-teal-500/10 rounded-full blur-3xl -ml-20 -mb-20"></div>

        {/* Brand */}
        <div className="flex items-center gap-3">
          <div className="p-2 bg-indigo-600 rounded-xl text-white">
            <Building2 className="w-5 h-5" />
          </div>
          <div>
            <h1 className="font-display font-medium text-lg leading-none tracking-tight">Hostel Hub</h1>
            <span className="text-[10px] text-slate-400 font-mono tracking-widest uppercase">Precision Operations</span>
          </div>
        </div>

        {/* Center quote */}
        <div className="max-w-md my-auto space-y-4">
          <span className="text-xs text-indigo-400 font-mono uppercase tracking-wider font-semibold">Smart Room Rosters & Bills</span>
          <h2 className="font-display text-4xl font-bold tracking-tight leading-tight">Reduce manual hostel work by 70%.</h2>
          <p className="text-sm text-slate-400 leading-relaxed">
            Verify real-time bed layouts, process instant Razorpay fee receipts, clear complaints, track leaves, and get Gemini-powered room support advisor on a single unified platform.
          </p>
        </div>

        {/* Footer info */}
        <div className="flex items-center gap-2 text-xs text-slate-500">
          <span>Smart System Version 2.0 • Operational Node</span>
        </div>
      </div>

      {/* Right form panel */}
      <div className="lg:col-span-7 flex flex-col justify-center px-6 py-12 sm:px-12 xl:px-24">
        <div className="mx-auto w-full max-w-md space-y-8 animate-fade-in">
          
          {/* Header */}
          <div className="text-left">
            <h2 className="font-display text-3xl font-bold text-slate-900 tracking-tight">
              {view === 'login' && 'Sign in to Hostel Hub'}
              {view === 'register' && 'Register your accounts'}
              {view === 'forgot' && 'Reset secure passkeys'}
            </h2>
            <p className="text-sm text-slate-500 mt-2">
              {view === 'login' && 'Ready credentials config? Log in to your role control panel.'}
              {view === 'register' && 'Create your profile to allocate rooms and settle dues.'}
              {view === 'forgot' && 'Enter your email credentials to retrieve passthrough token.'}
            </p>
          </div>

          {/* Feedback banners */}
          {error && (
            <div className="p-4 bg-rose-50 border border-rose-150 text-rose-800 rounded-2xl flex items-start gap-2.5 text-xs animate-fade-in">
              <AlertCircle className="w-4 h-4 text-rose-650 mt-0.5 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          {success && (
            <div className="p-4 bg-emerald-50 border border-emerald-150 text-emerald-800 rounded-2xl flex items-start gap-2.5 text-xs animate-fade-in">
              <CheckCircle className="w-4 h-4 text-emerald-650 mt-0.5 shrink-0" />
              <span>{success}</span>
            </div>
          )}

          {/* Login view */}
          {view === 'login' && (
            <form onSubmit={handleLogin} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold uppercase font-mono tracking-wider text-slate-500 mb-1.5">Email address</label>
                <div className="relative">
                  <input
                    type="email"
                    required
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="w-full text-slate-900 border border-slate-200 rounded-xl px-3.5 py-2.5 text-sm bg-white font-medium"
                    placeholder="student@hostel.com or admin@hostel.com"
                  />
                  <div className="absolute right-3.5 top-3 text-slate-400">
                    <Mail className="w-4.5 h-4.5" />
                  </div>
                </div>
              </div>

              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <label className="block text-xs font-semibold uppercase font-mono tracking-wider text-slate-500">Security Password</label>
                  <button 
                    type="button" 
                    onClick={() => setView('forgot')}
                    className="text-xs text-indigo-600 hover:text-indigo-800 font-medium"
                  >
                    Forgot Password?
                  </button>
                </div>
                <div className="relative">
                  <input
                    type="password"
                    required
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="w-full text-slate-900 border border-slate-200 rounded-xl px-3.5 py-2.5 text-sm bg-white font-mono"
                    placeholder="••••••••"
                  />
                  <div className="absolute right-3.5 top-3 text-slate-400">
                    <Lock className="w-4.5 h-4.5" />
                  </div>
                </div>
              </div>

              <div className="pt-4">
                <button
                  type="submit"
                  disabled={loading}
                  id="btn-auth-login"
                  className="w-full flex items-center justify-center gap-2 py-3 bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 text-white rounded-xl text-sm font-medium shadow-md shadow-indigo-600/10 cursor-pointer"
                >
                  {loading ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      <span>Verifying Session credentials...</span>
                    </>
                  ) : (
                    <>
                      <span>Sign In Control Panel</span>
                      <ArrowRight className="w-4 h-4" />
                    </>
                  )}
                </button>
              </div>

              {/* Google OAuth action */}
              <div className="relative flex py-2 items-center">
                <div className="flex-grow border-t border-slate-200"></div>
                <span className="flex-shrink mx-4 text-[10px] text-slate-400 font-mono tracking-wider font-bold">OR PROVIDER ACCESS</span>
                <div className="flex-grow border-t border-slate-200"></div>
              </div>

              <div>
                <button
                  type="button"
                  onClick={handleGoogleSignIn}
                  disabled={loading}
                  className="w-full flex items-center justify-center gap-3 py-3 border border-slate-200 hover:bg-slate-50 disabled:opacity-50 text-slate-700 bg-white rounded-xl text-sm font-semibold tracking-wide shadow-sm hover:shadow transition-all duration-200 cursor-pointer"
                >
                  <svg version="1.1" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 48 48" className="w-[18px] h-[18px] shrink-0">
                    <path fill="#EA4335" d="M24 9.5c3.54 0 6.71 1.22 9.21 3.6l6.85-6.85C35.9 2.38 30.47 0 24 0 14.62 0 6.51 5.38 2.56 13.22l7.98 6.19C12.43 13.72 17.74 9.5 24 9.5z"></path>
                    <path fill="#4285F4" d="M46.98 24.55c0-1.57-.15-3.09-.38-4.55H24v9.02h12.94c-.58 2.96-2.26 5.48-4.78 7.18l7.73 6c4.51-4.18 7.09-10.36 7.09-17.65z"></path>
                    <path fill="#FBBC05" d="M10.53 28.59c-.48-1.45-.76-2.99-.76-4.59s.27-3.14.76-4.59l-7.98-6.19C.92 16.46 0 20.12 0 24c0 3.88.92 7.54 2.56 10.78l7.97-6.19z"></path>
                    <path fill="#34A853" d="M24 48c6.48 0 11.93-2.13 15.89-5.81l-7.73-6c-2.15 1.45-4.92 2.3-8.16 2.3-6.26 0-11.57-4.22-13.47-9.91l-7.98 6.19C6.51 42.62 14.62 48 24 48z"></path>
                    <path fill="none" d="M0 0h48v48H0z"></path>
                  </svg>
                  <span>Link & Sign In with Google</span>
                </button>
              </div>

              {/* Demo users login hints */}
              <div className="p-4 bg-indigo-50/50 border border-indigo-100 rounded-2xl text-[11px] text-indigo-900 space-y-1.5 text-left">
                <h5 className="font-semibold uppercase tracking-wider font-mono">Demo Credentials Console</h5>
                <div className="grid grid-cols-2 gap-2 text-[10px] pt-1">
                  <div>
                    <span className="font-semibold">Student Account:</span>
                    <p className="font-mono text-slate-650 bg-white/70 px-1 py-0.5 rounded border border-indigo-100 mt-0.5">student@hostel.com</p>
                  </div>
                  <div>
                    <span className="font-semibold">Admin Account:</span>
                    <p className="font-mono text-slate-650 bg-white/70 px-1 py-0.5 rounded border border-indigo-100 mt-0.5">admin@hostel.com</p>
                  </div>
                </div>
                <p className="text-[10px] text-slate-400 pt-1">Password is simply <b className="font-mono text-slate-650">password</b>. Register to create empty rosters.</p>
              </div>

              <div className="text-center pt-2">
                <button
                  type="button"
                  onClick={() => { setView('register'); setError(null); }}
                  className="text-xs text-slate-500 hover:text-slate-800"
                >
                  Don't possess credential profiles? <span className="text-indigo-600 font-semibold">Join Portal</span>
                </button>
              </div>
            </form>
          )}

          {/* Register view */}
          {view === 'register' && (
            <form onSubmit={handleRegister} className="space-y-4">
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block text-xs font-semibold uppercase font-mono tracking-wider text-slate-500 mb-1">Your Full Name</label>
                  <input
                    type="text"
                    required
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    className="w-full text-slate-900 border border-slate-200 rounded-xl px-3 py-2 text-xs bg-white font-medium"
                    placeholder="Pavan Bukka"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold uppercase font-mono tracking-wider text-slate-500 mb-1">Email ID</label>
                  <input
                    type="email"
                    required
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="w-full text-slate-900 border border-slate-200 rounded-xl px-3 py-2 text-xs bg-white font-medium"
                    placeholder="pavan@gmail.com"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block text-xs font-semibold uppercase font-mono tracking-wider text-slate-500 mb-1">Contact Number</label>
                  <input
                    type="text"
                    required
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    className="w-full text-slate-900 border border-slate-200 rounded-xl px-3 py-2 text-xs bg-white font-medium"
                    placeholder="+91 98765 43212"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold uppercase font-mono tracking-wider text-slate-500 mb-1">Security Passkey</label>
                  <input
                    type="password"
                    required
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="w-full text-slate-900 border border-slate-200 rounded-xl px-3 py-2 text-xs bg-white font-mono"
                    placeholder="••••••••"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block text-xs font-semibold uppercase font-mono tracking-wider text-slate-500 mb-1">Define Access Role</label>
                  <select
                    value={role}
                    onChange={(e: any) => setRole(e.target.value)}
                    className="w-full text-slate-900 border border-slate-200 rounded-xl px-3 py-2 text-xs bg-white font-medium h-9"
                  >
                    <option value="student">Student Intake</option>
                    <option value="admin">Hostel Admin Staff</option>
                    <option value="warden">Hostel Warden Staff</option>
                  </select>
                </div>
                {role === 'student' && (
                  <div>
                    <label className="block text-xs font-semibold uppercase font-mono tracking-wider text-slate-500 mb-1">Roll ID (Optional)</label>
                    <input
                      type="text"
                      value={studentId}
                      onChange={(e) => setStudentId(e.target.value)}
                      className="w-full text-slate-900 border border-slate-200 rounded-xl px-3 py-2 text-xs bg-white font-mono uppercase"
                      placeholder="HST2026101"
                    />
                  </div>
                )}
              </div>

              <div className="pt-2">
                <button
                  type="submit"
                  disabled={loading}
                  id="btn-auth-register"
                  className="w-full flex items-center justify-center gap-2 py-3 bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 text-white rounded-xl text-sm font-medium shadow-md shadow-indigo-600/10 cursor-pointer"
                >
                  {loading ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      <span>Compiling identity specs...</span>
                    </>
                  ) : (
                    <span>Register New Profile</span>
                  )}
                </button>
              </div>

              <div className="text-center">
                <button
                  type="button"
                  onClick={() => setView('login')}
                  className="text-xs text-slate-500 hover:text-slate-800"
                >
                  Possess core passwords? <span className="text-indigo-600 font-semibold">Sign in here</span>
                </button>
              </div>
            </form>
          )}

          {/* Forgot view */}
          {view === 'forgot' && (
            <form onSubmit={handleForgot} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold uppercase font-mono tracking-wider text-slate-500 mb-1.5">Registered Email address</label>
                <div className="relative">
                  <input
                    type="email"
                    required
                    value={forgotEmail}
                    onChange={(e) => setForgotEmail(e.target.value)}
                    className="w-full text-slate-900 border border-slate-200 rounded-xl px-3.5 py-2.5 text-sm bg-white font-medium"
                    placeholder="student@hostel.com"
                  />
                  <div className="absolute right-3.5 top-3 text-slate-400">
                    <Mail className="w-4.5 h-4.5" />
                  </div>
                </div>
              </div>

              <div>
                <button
                  type="submit"
                  disabled={loading}
                  id="btn-auth-forgot"
                  className="w-full flex items-center justify-center gap-2 py-3 bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 text-white rounded-xl text-sm font-medium shadow-md shadow-indigo-600/10 cursor-pointer"
                >
                  {loading ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      <span>Sending reset node...</span>
                    </>
                  ) : (
                    <span>Dispatch Authorization Link</span>
                  )}
                </button>
              </div>

              <div className="text-center">
                <button
                  type="button"
                  onClick={() => setView('login')}
                  className="text-xs text-slate-500 hover:text-slate-800"
                >
                  Return to <span className="text-indigo-600 font-semibold">Sign In Window</span>
                </button>
              </div>
            </form>
          )}

        </div>
      </div>
    </div>
  );
}
