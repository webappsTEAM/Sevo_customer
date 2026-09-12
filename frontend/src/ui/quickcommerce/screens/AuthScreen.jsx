import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ApprovedImage } from '../../../assets/ApprovedImage.jsx';
import { Mail, Lock, Phone, ArrowRight, CheckCircle2, ShieldCheck, KeyRound } from 'lucide-react';
import { useAuth } from '../../../state/auth/useAuth.js';

export function AuthScreen() {
  const navigate = useNavigate();
  const { login } = useAuth();

  const [mode, setMode] = useState('otp'); // 'otp' | 'password'
  const [identifier, setIdentifier] = useState('9876543210');
  const [password, setPassword] = useState('welcome123');
  const [otpSent, setOtpSent] = useState(false);
  const [otpValue, setOtpValue] = useState(['1', '2', '3', '4']);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [timer, setTimer] = useState(30);

  const handleSendOtp = (e) => {
    e.preventDefault();
    if (!identifier.trim()) {
      setError('Please enter a valid phone or email');
      return;
    }
    setError('');
    setLoading(true);
    setTimeout(() => {
      setLoading(false);
      setOtpSent(true);
      setTimer(30);
    }, 600);
  };

  const handleVerifyOrLogin = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      // Store session state
      localStorage.setItem('sevo_customer_token', 'token_demo_' + Date.now());
      localStorage.setItem(
        'sevo_customer_profile',
        JSON.stringify({
          name: 'Vignesh G',
          phone: '+91 98765 43210',
          email: 'vignesh.g@company.com',
          role: 'customer',
        })
      );
      setTimeout(() => {
        setLoading(false);
        navigate('/qc');
      }, 500);
    } catch (err) {
      setLoading(false);
      setError('Authentication failed. Please try again.');
    }
  };

  return (
    <div className="min-h-screen w-full flex flex-col justify-between p-6 bg-[#FFFFFF] text-[#17212B]">
      {/* Top Brand Logo */}
      <div className="flex flex-col items-center pt-6 text-center">
        <div className="w-14 h-14 rounded-2xl bg-[#E8F5EF] p-2.5 mb-3 flex items-center justify-center shadow-sm">
          <ApprovedImage assetId="brand-emblem" alt="SEVO" className="w-full h-full object-contain" />
        </div>
        <h1 className="text-2xl font-extrabold tracking-tight text-[#17212B]">
          Welcome Back
        </h1>
        <p className="text-xs text-[#667280] mt-1">
          Sign in to continue to <span className="font-bold text-[#17212B]">SEVO</span>
        </p>
      </div>

      {/* Form Container */}
      <div className="my-auto w-full max-w-sm mx-auto py-4">
        {error && (
          <div className="mb-4 p-3 bg-red-50 border border-red-200 text-red-700 text-xs rounded-xl flex items-center gap-2">
            <span>{error}</span>
          </div>
        )}

        <form onSubmit={otpSent || mode === 'password' ? handleVerifyOrLogin : handleSendOtp} className="space-y-4">
          <div>
            <label className="block text-xs font-semibold text-[#17212B] mb-1.5">
              Email or Mobile Number
            </label>
            <div className="relative flex items-center">
              <span className="absolute left-3.5 text-[#667280]">
                {identifier.includes('@') ? <Mail className="w-4 h-4" /> : <Phone className="w-4 h-4" />}
              </span>
              <input
                type="text"
                value={identifier}
                onChange={(e) => setIdentifier(e.target.value)}
                placeholder="Enter 10-digit mobile or email"
                className="w-full pl-10 pr-4 py-3 bg-[#F8F7F1] border border-[#DDE4E0] rounded-xl text-sm font-medium focus:outline-none focus:border-[#008F6B] focus:ring-2 focus:ring-[#008F6B]/15 transition-all"
                disabled={otpSent}
              />
            </div>
          </div>

          {mode === 'password' && !otpSent && (
            <div>
              <div className="flex items-center justify-between mb-1.5">
                <label className="text-xs font-semibold text-[#17212B]">Password</label>
                <button
                  type="button"
                  onClick={() => setMode('otp')}
                  className="text-[11px] font-semibold text-[#008F6B] hover:underline"
                >
                  Use OTP Instead
                </button>
              </div>
              <div className="relative flex items-center">
                <span className="absolute left-3.5 text-[#667280]">
                  <Lock className="w-4 h-4" />
                </span>
                <input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Enter your password"
                  className="w-full pl-10 pr-4 py-3 bg-[#F8F7F1] border border-[#DDE4E0] rounded-xl text-sm font-medium focus:outline-none focus:border-[#008F6B] focus:ring-2 focus:ring-[#008F6B]/15 transition-all"
                />
              </div>
            </div>
          )}

          {otpSent && (
            <div>
              <div className="flex items-center justify-between mb-1.5">
                <label className="text-xs font-semibold text-[#17212B]">Enter 4-Digit OTP</label>
                <span className="text-[11px] text-[#667280]">Sent to {identifier}</span>
              </div>
              <div className="flex items-center justify-between gap-3">
                {otpValue.map((digit, i) => (
                  <input
                    key={i}
                    id={`otp-input-${i}`}
                    type="text"
                    maxLength={1}
                    value={digit}
                    onChange={(e) => {
                      const val = e.target.value;
                      const next = [...otpValue];
                      next[i] = val;
                      setOtpValue(next);
                      if (val && i < 3) {
                        document.getElementById(`otp-input-${i + 1}`)?.focus();
                      }
                    }}
                    className="w-14 h-14 text-center text-lg font-extrabold bg-[#F8F7F1] border border-[#DDE4E0] rounded-xl focus:border-[#008F6B] focus:ring-2 focus:ring-[#008F6B]/20 outline-none"
                  />
                ))}
              </div>
              <div className="flex items-center justify-between mt-2 text-xs">
                <button
                  type="button"
                  onClick={() => setOtpSent(false)}
                  className="text-slate-500 hover:text-slate-800 underline"
                >
                  Change Number
                </button>
                <span className="text-slate-400">Resend in 00:{timer < 10 ? `0${timer}` : timer}</span>
              </div>
            </div>
          )}

          <button
            type="submit"
            disabled={loading}
            className="w-full mt-2 bg-[#008F6B] hover:bg-[#0F6B3A] text-white font-bold py-3.5 px-6 rounded-2xl shadow-md hover:shadow-lg transition-all duration-150 flex items-center justify-center gap-2 active:scale-[0.98] disabled:opacity-60"
          >
            {loading ? (
              <span className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
            ) : (
              <>
                <span>{otpSent || mode === 'password' ? 'Login' : 'Send OTP'}</span>
                <ArrowRight className="w-4 h-4" />
              </>
            )}
          </button>
        </form>

        {/* OR Divider */}
        <div className="flex items-center my-6">
          <div className="flex-1 border-t border-[#DDE4E0]" />
          <span className="px-3 text-[11px] font-semibold text-[#667280] uppercase">OR</span>
          <div className="flex-1 border-t border-[#DDE4E0]" />
        </div>

        {/* Social Buttons */}
        <div className="space-y-2.5">
          <button
            type="button"
            onClick={handleVerifyOrLogin}
            className="w-full flex items-center justify-center gap-3 py-3 px-4 border border-[#DDE4E0] hover:bg-slate-50 rounded-xl text-xs font-semibold text-[#17212B] transition-colors shadow-sm"
          >
            <svg className="w-4 h-4" viewBox="0 0 24 24">
              <path
                fill="#4285F4"
                d="M23.745 12.27c0-.7-.06-1.4-.19-2.07H12v4.51h6.6c-.29 1.52-1.14 2.82-2.4 3.68v3.05h3.88c2.27-2.09 3.665-5.17 3.665-9.17z"
              />
              <path
                fill="#34A853"
                d="M12 24c3.24 0 5.95-1.08 7.93-2.91l-3.88-3.05c-1.08.72-2.45 1.16-4.05 1.16-3.12 0-5.77-2.1-6.72-4.93H1.25v3.15C3.26 21.36 7.33 24 12 24z"
              />
              <path
                fill="#FBBC05"
                d="M5.28 14.27c-.25-.72-.38-1.49-.38-2.27s.13-1.55.38-2.27V6.58H1.25C.45 8.18 0 9.99 0 12s.45 3.82 1.25 5.42l4.03-3.15z"
              />
              <path
                fill="#EA4335"
                d="M12 4.75c1.77 0 3.35.61 4.6 1.8l3.42-3.42C17.95 1.19 15.24 0 12 0 7.33 0 3.26 2.64 1.25 6.58l4.03 3.15c.95-2.83 3.6-4.98 6.72-4.98z"
              />
            </svg>
            <span>Continue with Google</span>
          </button>
        </div>
      </div>

      {/* Bottom Switch */}
      <div className="text-center pb-4 text-xs text-[#667280]">
        New to SEVO?{' '}
        <button
          onClick={() => {
            setMode('otp');
            setOtpSent(false);
          }}
          className="font-bold text-[#008F6B] hover:underline"
        >
          Create an account
        </button>
      </div>
    </div>
  );
}
