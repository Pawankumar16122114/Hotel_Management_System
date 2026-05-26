import React, { useState, useEffect } from 'react';
import { 
  googleSignIn, 
  getAccessToken, 
  logoutGoogle 
} from '../firebase';
import { 
  sendGmailEmail, 
  listGmailMessages, 
  GmailMessage 
} from '../lib/gmail';
import { 
  Mail, 
  Send, 
  RefreshCw, 
  Sparkles, 
  Lock, 
  CheckCircle, 
  AlertCircle, 
  User as UserIcon, 
  LogOut, 
  Loader2, 
  Search, 
  Inbox, 
  ChevronRight, 
  FileText,
  Clock
} from 'lucide-react';
import { User } from '../types';

interface GmailDashboardProps {
  user: User;
  showToast: (msg: string, type: 'success' | 'err' | 'info') => void;
}

export default function GmailDashboard({ user, showToast }: GmailDashboardProps) {
  const [token, setToken] = useState<string | null>(null);
  const [googleUser, setGoogleUser] = useState<any>(null);
  const [checkingAuth, setCheckingAuth] = useState(true);
  const [signingIn, setSigningIn] = useState(false);

  // Email listing states
  const [emails, setEmails] = useState<GmailMessage[]>([]);
  const [loadingEmails, setLoadingEmails] = useState(false);
  const [searchQuery, setSearchQuery] = useState('Hostel');
  const [activeMessage, setActiveMessage] = useState<GmailMessage | null>(null);

  // Compose email states
  const [recipient, setRecipient] = useState(user.role === 'student' ? 'warden@hostel.com' : 'student@hostel.com');
  const [subject, setSubject] = useState('');
  const [messageBody, setMessageBody] = useState('');
  const [sendingEmail, setSendingEmail] = useState(false);
  
  // Selection of templates
  const [selectedTemplate, setSelectedTemplate] = useState('');

  // Confirmation modal states
  const [showConfirmModal, setShowConfirmModal] = useState(false);

  // Check existing token on mount
  useEffect(() => {
    checkToken();
  }, []);

  const checkToken = async () => {
    setCheckingAuth(true);
    try {
      const activeToken = await getAccessToken();
      if (activeToken) {
        setToken(activeToken);
        // Load details
        await loadGmailData(activeToken);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setCheckingAuth(false);
    }
  };

  const handleConnect = async () => {
    setSigningIn(true);
    try {
      const result = await googleSignIn();
      if (result) {
        setToken(result.accessToken);
        setGoogleUser(result.user);
        showToast('Successfully linked Google Account / Gmail Console.', 'success');
        await loadGmailData(result.accessToken);
      }
    } catch (err: any) {
      showToast(err.message || 'Google Auth flow rejected.', 'err');
    } finally {
      setSigningIn(false);
    }
  };

  const handleDisconnect = async () => {
    try {
      await logoutGoogle();
      setToken(null);
      setGoogleUser(null);
      setEmails([]);
      setActiveMessage(null);
      showToast('Gmail interface signed out successfully.', 'info');
    } catch (e: any) {
      showToast(e.message, 'err');
    }
  };

  const loadGmailData = async (accessToken: string) => {
    setLoadingEmails(true);
    try {
      const messages = await listGmailMessages(accessToken, searchQuery);
      setEmails(messages);
    } catch (error) {
      console.error('Error fetching Gmail alerts:', error);
    } finally {
      setLoadingEmails(false);
    }
  };

  const handleRefresh = () => {
    if (token) {
      loadGmailData(token);
    }
  };

  // Pre-load templates
  const applyTemplate = (templateId: string) => {
    setSelectedTemplate(templateId);
    if (user.role === 'student') {
      if (templateId === 'complaint') {
        setSubject('[Hostel Hub Priority Complaint] Urgent Repairs Needed');
        setMessageBody(
          `Dear Warden / Hostel Staff,<br/><br/>` +
          `This is an official complaint registered via the Hostel Hub console regarding active maintenance issues in my room.<br/><br/>` +
          `<b>Category:</b> Electricity / WiFi / Plumbing<br/>` +
          `<b>Description of damage:</b> The appliance/fixture is currently non-functional, causing hindrance to academic study.<br/><br/>` +
          `Please direct the maintenance technician/warden to resolve this ticket at the earliest.<br/><br/>` +
          `Sincerely,<br/>` +
          `<b>${user.name}</b><br/>` +
          `Student ID: ${user.studentId || 'N/A'}<br/>` +
          `Contact: ${user.phone}`
        );
      } else if (templateId === 'leave') {
        setSubject('[Leave of Absence Request] Permission to Travel Outside Curfew Hours');
        setMessageBody(
          `Dear Warden,<br/><br/>` +
          `I am writing to formally request leave permissions from the hostel premises for academic/personal reasons.<br/><br/>` +
          `<b>Leave Tenure:</b> From Oct 12, 2026 to Oct 15, 2026<br/>` +
          `<b>Reason:</b> Family emergency / College festival / Internship interview<br/><br/>` +
          `I guarantee that I will strictly abide by all warden regulations and hostel guidelines during my absence duration.<br/><br/>` +
          `Best regards,<br/>` +
          `<b>${user.name}</b><br/>` +
          `Roll Number: ${user.studentId || 'N/A'}`
        );
      } else {
        setSubject('');
        setMessageBody('');
      }
    } else {
      // Staff templates
      if (templateId === 'remedy') {
        setSubject('[Hostel Hub Notice] Maintenance Resolved Confirmation');
        setMessageBody(
          `Dear Student,<br/><br/>` +
          `This email confirms that the maintenance complaint ticket you filed has been officially resolved by our staff technicians.<br/><br/>` +
          `<b>Status update:</b> Action completed & verified.<br/><br/>` +
          `Should you run into any fresh setbacks or unfinished repairs, feel free to raise a follow-up ticket in the application control room.<br/><br/>` +
          `Best regards,<br/>` +
          `<b>Hostel Administration</b><br/>` +
          `Hostel Hub Precision Services`
        );
      } else if (templateId === 'curfew') {
        setSubject('[Urgent Alert] Curfew Violation & Late Check-in Notification');
        setMessageBody(
          `Dear Student,<br/><br/>` +
          `This is an official alert indicating that your curfew timestamp for today marks a Curfew Violation / Late Check-in threshold breach.<br/><br/>` +
          `Hostel gates lock at 10:00 PM. Please produce an official explanation directly to the warden desk by tomorrow morning.<br/><br/>` +
          `<b>Warden Action Level:</b> Warned / Logged.<br/><br/>` +
          `Regards,<br/>` +
          `<b>Office of the Head Warden</b><br/>` +
          `Hostel Hub Security Node`
        );
      } else if (templateId === 'bill') {
        setSubject('[Hostel Hub Receipt] Hostel Dues & Room Allocation Paid Settle');
        setMessageBody(
          `Dear Student,<br/><br/>` +
          `Thank you for settling your hostel room allocation billing dues.<br/><br/>` +
          `We have received your payment via the Razorpay payment gateway, and your room allocation ledger status has been marked as <b>Paid & Approved</b>.<br/><br/>` +
          `Please download your PDF receipt from your student dashboard.<br/><br/>` +
          `Hostel Billing Coordinator`
        );
      } else {
        setSubject('');
        setMessageBody('');
      }
    }
  };

  const handleSendDraftClick = (e: React.FormEvent) => {
    e.preventDefault();
    if (!recipient || !subject || !messageBody) {
      showToast('Recipient, subject and message body must be present.', 'err');
      return;
    }
    // Launch confirmation overlay
    setShowConfirmModal(true);
  };

  const executeSend = async () => {
    setShowConfirmModal(false);
    setSendingEmail(true);
    try {
      if (!token) throw new Error('Unlinked access session.');
      const success = await sendGmailEmail(token, recipient, subject, messageBody);
      if (success) {
        showToast(`Email dispatched to ${recipient} successfully!`, 'success');
        setSubject('');
        setMessageBody('');
        setSelectedTemplate('');
      } else {
        showToast('Gmail API rejected the transmission.', 'err');
      }
    } catch (err: any) {
      showToast(err.message, 'err');
    } finally {
      setSendingEmail(false);
    }
  };

  if (checkingAuth) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center py-24 gap-4 animate-fade-in">
        <Loader2 className="w-8 h-8 text-indigo-600 animate-spin" />
        <span className="font-mono text-[10px] text-slate-450 uppercase tracking-widest font-bold">Scanning Secure Google Credentials...</span>
      </div>
    );
  }

  return (
    <div className="h-full flex flex-col p-6 lg:p-10 overflow-y-auto space-y-8 animate-fade-in relative select-text">
      
      {/* Upper connected info bar */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 p-6 bg-white border border-slate-200/60 rounded-3xl shadow-sm">
        <div className="flex items-center gap-4 text-left">
          <div className="p-3 bg-indigo-50 text-indigo-600 rounded-2xl">
            <Mail className="w-6 h-6" />
          </div>
          <div>
            <h1 className="font-display font-bold text-slate-900 text-lg leading-tight">Google Gmail Workspace</h1>
            <p className="text-xs text-slate-500 mt-1">Read & send live notifications securely using your linked Google account.</p>
          </div>
        </div>
        
        <div className="flex items-center gap-3">
          {token ? (
            <div className="flex items-center gap-3 bg-slate-50 p-2.5 rounded-2xl border border-slate-100">
              <div className="w-8 h-8 rounded-full bg-indigo-600 text-white flex items-center justify-center font-bold text-xs uppercase font-mono">
                {googleUser?.displayName ? googleUser.displayName[0] : user.name[0]}
              </div>
              <div className="text-left hidden sm:block">
                <span className="text-xs font-bold text-slate-800">{googleUser?.displayName || 'Google Account'}</span>
                <p className="text-[10px] text-emerald-600 font-semibold font-mono tracking-wide">● CONNECTED</p>
              </div>
              <button 
                onClick={handleDisconnect}
                className="ml-2 p-2 rounded-xl text-slate-450 hover:text-rose-600 hover:bg-rose-50 cursor-pointer"
                title="Disconnect Google"
              >
                <LogOut className="w-4 h-4" />
              </button>
            </div>
          ) : (
            <button
              onClick={handleConnect}
              disabled={signingIn}
              className="px-5 py-2.5 bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 text-white rounded-2xl text-xs font-semibold tracking-wide flex items-center gap-2 shadow-md shadow-indigo-600/15 cursor-pointer animate-pulse"
            >
              {signingIn ? (
                <>
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  <span>Connecting...</span>
                </>
              ) : (
                <>
                  <Sparkles className="w-4 h-4 shrink-0" />
                  <span>Connect Google Account</span>
                </>
              )}
            </button>
          )}
        </div>
      </div>

      {!token ? (
        <div className="flex-1 flex flex-col items-center justify-center p-12 bg-white rounded-3xl border border-dashed border-slate-200">
          <div className="p-5 bg-indigo-50/75 rounded-3xl text-indigo-500 mb-4 animate-bounce-subtle">
            <Lock className="w-8 h-8" />
          </div>
          <h2 className="font-display font-bold text-slate-900 text-sm uppercase tracking-wider">Unverified Mail Workspace</h2>
          <p className="text-slate-500 text-xs mt-2 max-w-sm text-center leading-relaxed font-semibold">
            To view received Hostel alerts directly from your Google inbox & email priority requests to wardens, please authorize Google Mail access.
          </p>
          <button
            onClick={handleConnect}
            disabled={signingIn}
            className="mt-6 px-6 py-3 border border-slate-200 hover:bg-slate-50 shadow-sm rounded-2xl text-xs font-bold text-slate-700 bg-white flex items-center gap-2.5 cursor-pointer"
          >
            <svg version="1.1" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 48 48" className="w-[16px] h-[16px]">
              <path fill="#EA4335" d="M24 9.5c3.54 0 6.71 1.22 9.21 3.6l6.85-6.85C35.9 2.38 30.47 0 24 0 14.62 0 6.51 5.38 2.56 13.22l7.98 6.19C12.43 13.72 17.74 9.5 24 9.5z"></path>
              <path fill="#4285F4" d="M46.98 24.55c0-1.57-.15-3.09-.38-4.55H24v9.02h12.94c-.58 2.96-2.26 5.48-4.78 7.18l7.73 6c4.51-4.18 7.09-10.36 7.09-17.65z"></path>
              <path fill="#FBBC05" d="M10.53 28.59c-.48-1.45-.76-2.99-.76-4.59s.27-3.14.76-4.59l-7.98-6.19C.92 16.46 0 20.12 0 24c0 3.88.92 7.54 2.56 10.78l7.97-6.19z"></path>
              <path fill="#34A853" d="M24 48c6.48 0 11.93-2.13 15.89-5.81l-7.73-6c-2.15 1.45-4.92 2.3-8.16 2.3-6.26 0-11.57-4.22-13.47-9.91l-7.98 6.19C6.51 42.62 14.62 48 24 48z"></path>
              <path fill="none" d="M0 0h48v48H0z"></path>
            </svg>
            <span>Authorise Gmail permissions</span>
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
          
          {/* List panel - Left */}
          <div className="lg:col-span-5 bg-white border border-slate-200/70 rounded-3xl p-5 shadow-sm space-y-4">
            <div className="flex justify-between items-center pb-2 border-b">
              <div className="flex items-center gap-1.5">
                <Inbox className="w-4 h-4 text-indigo-500" />
                <h3 className="font-display font-bold text-slate-900 uppercase text-[10px] tracking-wider">Hostel Mailbox Alerts</h3>
              </div>
              <button 
                onClick={handleRefresh}
                disabled={loadingEmails}
                className="p-1.5 hover:bg-slate-50 rounded-xl text-slate-400 hover:text-slate-700 cursor-pointer"
                title="Refresh mailbox"
              >
                <RefreshCw className={`w-3.5 h-3.5 ${loadingEmails ? 'animate-spin text-indigo-500' : ''}`} />
              </button>
            </div>

            {/* Keyword query filter */}
            <div className="relative">
              <input 
                type="text" 
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Filter keyword (e.g. Hostel)"
                className="w-full text-slate-800 text-xs border rounded-xl pl-8 pr-3 py-2 bg-slate-50 font-semibold"
              />
              <div className="absolute left-2.5 top-2.5 text-slate-400">
                <Search className="w-3.5 h-3.5" />
              </div>
              <button 
                onClick={handleRefresh}
                className="absolute right-2 top-1.5 px-2 py-1 bg-indigo-600 text-white rounded-lg text-[9px] hover:bg-indigo-700 font-mono tracking-widest font-bold uppercase cursor-pointer"
              >
                Scan
              </button>
            </div>

            {/* List items */}
            <div className="space-y-2 max-h-[350px] overflow-y-auto pr-1">
              {loadingEmails ? (
                <div className="text-center py-12 flex flex-col items-center justify-center gap-2">
                  <Loader2 className="w-5 h-5 text-indigo-500 animate-spin" />
                  <span className="text-[10px] text-slate-400 font-mono">Querying live messages...</span>
                </div>
              ) : emails.length === 0 ? (
                <div className="text-center py-12 text-slate-400">
                  <p className="text-xs">No matching emails of "{searchQuery}" keyword found.</p>
                  <p className="text-[10px] mt-1 font-normal text-slate-350">Try sending an email below!</p>
                </div>
              ) : (
                emails.map((email) => {
                  const isActive = activeMessage?.id === email.id;
                  return (
                    <div 
                      key={email.id}
                      onClick={() => setActiveMessage(email)}
                      className={`p-3 rounded-2xl text-left transition-all duration-150 cursor-pointer border ${
                        isActive 
                          ? 'bg-indigo-50/80 border-indigo-200' 
                          : 'bg-slate-50 hover:bg-slate-100 border-slate-100'
                      }`}
                    >
                      <div className="flex justify-between items-start gap-1">
                        <span className="text-[10px] font-bold text-slate-800 line-clamp-1">{email.subject || '(No Subject)'}</span>
                        <ChevronRight className="w-3 h-3 text-slate-400 shrink-0 mt-0.5" />
                      </div>
                      <p className="text-[10px] text-indigo-600 font-mono font-bold mt-1 line-clamp-1">{email.from}</p>
                      <p className="text-[10px] text-slate-500 font-normal mt-1.5 line-clamp-2 leading-relaxed">{email.snippet}</p>
                    </div>
                  );
                })
              )}
            </div>

            {/* Active message modal/card detail */}
            {activeMessage && (
              <div className="p-3 bg-indigo-50/30 rounded-2xl border text-left mt-2 animate-fade-in text-xs font-semibold">
                <div className="flex justify-between items-center pb-2 border-b">
                  <h4 className="text-[10px] font-bold text-indigo-900 uppercase tracking-wide">Reading Message</h4>
                  <button 
                    onClick={() => setActiveMessage(null)}
                    className="text-[9px] font-bold uppercase tracking-wider text-slate-400 hover:text-slate-600"
                  >
                    Close
                  </button>
                </div>
                <div className="space-y-1.5 pt-2 select-text">
                  <p><b className="text-slate-400 text-[10px] uppercase">Subject:</b> {activeMessage.subject}</p>
                  <p><b className="text-slate-400 text-[10px] uppercase">From:</b> {activeMessage.from}</p>
                  <p><b className="text-slate-400 text-[10px] uppercase">Date:</b> {activeMessage.date}</p>
                  <div className="mt-2.5 p-2 bg-white rounded-xl border max-h-36 overflow-y-auto font-normal text-slate-700 leading-relaxed text-[11px] select-text">
                    {activeMessage.snippet}
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Compose panel - Right */}
          <div className="lg:col-span-7 bg-white border border-slate-200/70 rounded-3xl p-5 shadow-sm space-y-4">
            <h3 className="font-display font-medium text-slate-900 font-bold uppercase text-[10px] tracking-wider pb-2 border-b flex items-center gap-1.5 text-left">
              <Send className="w-4 h-4 text-emerald-500" />
              <span>Gmail Quick Dispatch Console</span>
            </h3>

            {/* Template loaders */}
            <div className="text-left space-y-1.5">
              <span className="text-[10px] font-bold uppercase font-mono tracking-wider text-slate-400">Apply Preset Template</span>
              <div className="flex flex-wrap gap-2">
                {user.role === 'student' ? (
                  <>
                    <button 
                      onClick={() => applyTemplate('complaint')} 
                      className={`px-3 py-1.5 rounded-xl border text-[11px] font-semibold transition-all cursor-pointer ${
                        selectedTemplate === 'complaint' 
                          ? 'bg-indigo-600 text-white border-indigo-600' 
                          : 'bg-slate-50 text-slate-600 hover:bg-slate-100'
                      }`}
                    >
                      Priority Maintenance
                    </button>
                    <button 
                      onClick={() => applyTemplate('leave')} 
                      className={`px-3 py-1.5 rounded-xl border text-[11px] font-semibold transition-all cursor-pointer ${
                        selectedTemplate === 'leave' 
                          ? 'bg-indigo-600 text-white border-indigo-600' 
                          : 'bg-slate-50 text-slate-600 hover:bg-slate-100'
                      }`}
                    >
                      Leave permission / Outpass
                    </button>
                  </>
                ) : (
                  <>
                    <button 
                      onClick={() => applyTemplate('remedy')} 
                      className={`px-3 py-1.5 rounded-xl border text-[11px] font-semibold transition-all cursor-pointer ${
                        selectedTemplate === 'remedy' 
                          ? 'bg-indigo-600 text-white border-indigo-600' 
                          : 'bg-slate-50 text-slate-600 hover:bg-slate-100'
                      }`}
                    >
                      Maintenance Resolved Notice
                    </button>
                    <button 
                      onClick={() => applyTemplate('curfew')} 
                      className={`px-3 py-1.5 rounded-xl border text-[11px] font-semibold transition-all cursor-pointer ${
                        selectedTemplate === 'curfew' 
                          ? 'bg-indigo-600 text-white border-indigo-600' 
                          : 'bg-slate-50 text-slate-600 hover:bg-slate-100'
                      }`}
                    >
                      Late Attendance Violation
                    </button>
                    <button 
                      onClick={() => applyTemplate('bill')} 
                      className={`px-3 py-1.5 rounded-xl border text-[11px] font-semibold transition-all cursor-pointer ${
                        selectedTemplate === 'bill' 
                          ? 'bg-indigo-600 text-white border-indigo-600' 
                          : 'bg-slate-50 text-slate-600 hover:bg-slate-100'
                      }`}
                    >
                      Room bill receipt validation
                    </button>
                  </>
                )}
                <button 
                  onClick={() => applyTemplate('')} 
                  className="px-3 py-1.5 rounded-xl bg-rose-50 text-rose-600 border border-thin border-rose-100 text-[11px] hover:bg-rose-100 font-semibold cursor-pointer"
                >
                  Reset Form
                </button>
              </div>
            </div>

            {/* Sender form */}
            <form onSubmit={handleSendDraftClick} className="space-y-3.5 text-left pt-2">
              <div>
                <label className="block text-[10px] font-bold uppercase font-mono tracking-wider text-slate-400 mb-1">To (Recipient Email Address)</label>
                <input 
                  type="email" 
                  required
                  value={recipient}
                  onChange={(e) => setRecipient(e.target.value)}
                  placeholder="receiver@hostel.com"
                  className="w-full text-slate-800 border rounded-xl px-3 py-2 text-xs bg-slate-50 font-semibold"
                />
              </div>

              <div>
                <label className="block text-[10px] font-bold uppercase font-mono tracking-wider text-slate-400 mb-1">Subject</label>
                <input 
                  type="text" 
                  required
                  value={subject}
                  onChange={(e) => setSubject(e.target.value)}
                  placeholder="Priority Complaint regarding..."
                  className="w-full text-slate-800 border rounded-xl px-3 py-2 text-xs bg-slate-50 font-semibold"
                />
              </div>

              <div>
                <label className="block text-[10px] font-bold uppercase font-mono tracking-wider text-slate-400 mb-1">Message Body (HTML enabled)</label>
                <textarea 
                  required
                  rows={6}
                  value={messageBody}
                  onChange={(e) => setMessageBody(e.target.value)}
                  placeholder="Dear Warden, ..."
                  className="w-full text-slate-800 border rounded-xl px-3.5 py-2.5 text-xs bg-slate-50 font-normal leading-relaxed"
                />
              </div>

              <div className="pt-2 text-right">
                <button
                  type="submit"
                  disabled={sendingEmail}
                  className="px-6 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-semibold tracking-wide shadow-md shadow-indigo-600/10 flex items-center inline-flex gap-2 cursor-pointer"
                >
                  {sendingEmail ? (
                    <>
                      <Loader2 className="w-3.5 h-3.5 animate-spin" />
                      <span>Transmitting via Gmail API...</span>
                    </>
                  ) : (
                    <>
                      <Send className="w-3.5 h-3.5" />
                      <span>Dispatch secure Gmail</span>
                    </>
                  )}
                </button>
              </div>
            </form>
          </div>

        </div>
      )}

      {/* Mandatory User Confirmation Modal / Gate */}
      {showConfirmModal && (
        <div className="fixed inset-0 z-55 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-xs animate-fade-in">
          <div className="bg-white rounded-3xl p-6 max-w-sm w-full border shadow-2xl text-left space-y-4">
            <h4 className="font-display font-bold text-slate-900 text-sm flex items-center gap-1.5 uppercase font-mono tracking-wider">
              <span className="p-1 rounded bg-indigo-50 text-indigo-500">
                <FileText className="w-4 h-4" />
              </span>
              <span>Confirm Gmail Send</span>
            </h4>
            <p className="text-xs text-slate-600 leading-relaxed font-semibold">
              Are you sure you want to send this email to <b className="text-slate-800">{recipient}</b>?
            </p>
            <p className="text-[11px] text-slate-450 leading-normal font-normal">
              This will execute a live transaction on the verified Gmail API on your behalf. This message will be saved in your Google Sent messages list.
            </p>
            <div className="flex gap-3 pt-2 text-xs">
              <button
                onClick={() => setShowConfirmModal(false)}
                className="flex-1 py-2 rounded-xl border border-slate-200 hover:bg-slate-50 text-slate-650 font-bold transition cursor-pointer"
              >
                Cancel
              </button>
              <button
                onClick={executeSend}
                className="flex-1 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl font-bold tracking-wide shadow transition cursor-pointer"
              >
                Confirm & Send
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}
