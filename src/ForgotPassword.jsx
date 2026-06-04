import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import axios from 'axios';

const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL || 'http://localhost:5000',
});

export default function ForgotPassword() {
  const [step, setStep] = useState(1); // 1 = Request OTP, 2 = Verify OTP & Reset, 3 = Success
  const [usernameOrEmail, setUsernameOrEmail] = useState('');
  const [otp, setOtp] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  useEffect(() => {
    document.title = 'Forgot Password — Villax';
  }, []);

  async function handleSendOtp(e) {
    e.preventDefault();
    setError(null);
    setLoading(true);

    try {
      // 1. Ask backend to generate OTP
      const res = await api.post('/auth/forgot-password', { usernameOrEmail });
      const { email, name, otp: generatedOtp } = res.data;

      if (!email) {
        throw new Error('No email address returned from backend for this account.');
      }
      if (!generatedOtp) {
        throw new Error('No OTP code returned from backend for this account.');
      }

      // Calculate expiration time (15 minutes from now)
      const expiryDate = new Date(Date.now() + 15 * 60 * 1000);
      const expiryTime = expiryDate.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

      // 2. Retrieve EmailJS configurations
      const serviceId = import.meta.env.VITE_EMAILJS_SERVICE_ID;
      const templateId = import.meta.env.VITE_EMAILJS_TEMPLATE_ID;
      const publicKey = import.meta.env.VITE_EMAILJS_PUBLIC_KEY;

      if (!serviceId || !templateId || !publicKey) {
        throw new Error('EmailJS is not fully configured in the environment. Please notify the administrator.');
      }

      // 3. Send OTP email using EmailJS REST API
      const emailParams = {
        to_name: name,
        to_email: email,
        email: email, // Fallback key if template expects {{email}}
        otp: generatedOtp, // Pass OTP to template variable {{otp}}
        OTP: generatedOtp, // Uppercase variation {{OTP}}
        otp_code: generatedOtp, // Snake-case variation {{otp_code}}
        otpCode: generatedOtp, // Camel-case variation {{otpCode}}
        code: generatedOtp, // Simple code variation {{code}}
        passcode: generatedOtp, // Map to {{passcode}} as seen in user's EmailJS template
        reset_code: generatedOtp, // Reset code variation {{reset_code}}
        verification_code: generatedOtp, // Verification code variation {{verification_code}}
        otp_value: generatedOtp, // Value variation {{otp_value}}
        valid_till: expiryTime, // Pass expiry times to match various possible template vars
        valid_until: expiryTime,
        expiry_time: expiryTime,
        expiry: expiryTime,
        time: expiryTime,
      };

      await axios.post('https://api.emailjs.com/api/v1.0/email/send', {
        service_id: serviceId,
        template_id: templateId,
        user_id: publicKey,
        template_params: emailParams,
      });

      setStep(2);
    } catch (err) {
      console.error('Password Reset Request Failure:', err.message);
      
      let errorMsg = 'Failed to request password reset. Please try again later.';
      if (err.response?.data) {
        if (typeof err.response.data === 'string') {
          errorMsg = `Email/Server Error: ${err.response.data}`;
        } else if (err.response.data.message) {
          errorMsg = err.response.data.message;
        } else {
          errorMsg = `Email/Server Error: ${JSON.stringify(err.response.data)}`;
        }
      } else if (err.message) {
        errorMsg = err.message;
      }
      setError(errorMsg);
    } finally {
      setLoading(false);
    }
  }

  async function handleResetPassword(e) {
    e.preventDefault();
    setError(null);

    if (!otp.trim()) {
      setError('Please enter the OTP code sent to your email.');
      return;
    }

    if (password.length < 6) {
      setError('Password must be at least 6 characters long.');
      return;
    }

    if (password !== confirmPassword) {
      setError('Passwords do not match.');
      return;
    }

    setLoading(true);
    try {
      await api.post('/auth/reset-password', {
        usernameOrEmail,
        otp: otp.trim(),
        newPassword: password,
      });

      setStep(3);
    } catch (err) {
      console.error('Password Reset Verification Failure:', err);
      setError(err.response?.data?.message || 'Failed to verify OTP. Please ensure the code is correct and not expired.');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-50 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-md w-full space-y-8 animate-in fade-in zoom-in duration-300">
        <div className="text-center">
          <div className="flex justify-center">
            <Link to="/login" className="h-12 w-12 bg-blue-600 rounded-xl flex items-center justify-center shadow-lg shadow-blue-200">
              <span className="text-white font-bold text-2xl">V</span>
            </Link>
          </div>
          <h2 className="mt-6 text-3xl font-extrabold text-slate-900 tracking-tight">
            {step === 1 && 'Forgot Password'}
            {step === 2 && 'Verify OTP'}
            {step === 3 && 'Success!'}
          </h2>
          <p className="mt-2 text-sm text-slate-600 font-medium">
            {step === 1 && "Enter your username or email address and we'll send you a One-Time Password (OTP) to reset your password."}
            {step === 2 && `An OTP code has been sent to your email. Enter it below along with your new password.`}
            {step === 3 && "Your password has been successfully reset! You can now return to the login page."}
          </p>
        </div>

        <div className="mt-8 bg-white py-8 px-4 shadow-xl shadow-slate-200/50 sm:rounded-2xl sm:px-10 border border-slate-100">
          {step === 3 ? (
            <div className="space-y-6 text-center">
              <div className="flex items-center justify-center mx-auto h-12 w-12 rounded-full bg-emerald-100 animate-bounce">
                <svg className="h-6 w-6 text-emerald-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M5 13l4 4L19 7" />
                </svg>
              </div>
              <div className="space-y-2">
                <p className="text-sm font-semibold text-slate-800">Password Reset Complete!</p>
                <p className="text-xs text-slate-550">
                  Your new password is now active.
                </p>
              </div>
              <div className="pt-4">
                <Link
                  to="/login"
                  className="w-full flex justify-center py-2.5 px-4 border border-blue-600 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-xs font-black transition-all uppercase tracking-wider"
                >
                  Back to Login
                </Link>
              </div>
            </div>
          ) : step === 2 ? (
            <form className="space-y-6" onSubmit={handleResetPassword}>
              <div>
                <label htmlFor="otp" className="block text-[10px] font-black uppercase text-slate-400 tracking-widest ml-1 mb-2">
                  Enter One-Time Password (OTP)
                </label>
                <div className="relative rounded-md shadow-sm">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                    <svg className="h-5 w-5 text-slate-400" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor">
                      <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
                    </svg>
                  </div>
                  <input
                    id="otp"
                    name="otp"
                    type="text"
                    required
                    value={otp}
                    onChange={(e) => setOtp(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl pl-10 pr-4 py-3 text-xs font-black focus:ring-2 focus:ring-blue-500 outline-none text-center tracking-widest text-lg"
                    placeholder="Enter 6-digit OTP"
                    maxLength={6}
                  />
                </div>
              </div>

              <div>
                <label htmlFor="password" className="block text-[10px] font-black uppercase text-slate-400 tracking-widest ml-1 mb-2">
                  New Password
                </label>
                <div className="relative rounded-md shadow-sm">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                    <svg className="h-5 w-5 text-slate-400" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor">
                      <path fillRule="evenodd" d="M5 9V7a5 5 0 0110 0v2a2 2 0 012 2v5a2 2 0 01-2 2H5a2 2 0 01-2-2v-5a2 2 0 012-2zm8-2v2H7V7a3 3 0 016 0z" clipRule="evenodd" />
                    </svg>
                  </div>
                  <input
                    id="password"
                    name="password"
                    type="password"
                    required
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl pl-10 pr-4 py-3 text-xs font-bold focus:ring-2 focus:ring-blue-500 outline-none"
                    placeholder="At least 6 characters"
                  />
                </div>
              </div>

              <div>
                <label htmlFor="confirmPassword" className="block text-[10px] font-black uppercase text-slate-400 tracking-widest ml-1 mb-2">
                  Confirm New Password
                </label>
                <div className="relative rounded-md shadow-sm">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                    <svg className="h-5 w-5 text-slate-400" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor">
                      <path fillRule="evenodd" d="M5 9V7a5 5 0 0110 0v2a2 2 0 012 2v5a2 2 0 01-2 2H5a2 2 0 01-2-2v-5a2 2 0 012-2zm8-2v2H7V7a3 3 0 016 0z" clipRule="evenodd" />
                    </svg>
                  </div>
                  <input
                    id="confirmPassword"
                    name="confirmPassword"
                    type="password"
                    required
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl pl-10 pr-4 py-3 text-xs font-bold focus:ring-2 focus:ring-blue-500 outline-none"
                    placeholder="Repeat new password"
                  />
                </div>
              </div>

              <div>
                <button
                  type="submit"
                  disabled={loading}
                  className="w-full bg-slate-900 hover:bg-blue-600 text-white py-3.5 rounded-xl font-bold text-xs uppercase tracking-widest transition-all disabled:opacity-50 flex items-center justify-center"
                >
                  {loading ? (
                    <svg className="animate-spin -ml-1 mr-3 h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                    </svg>
                  ) : null}
                  {loading ? 'Resetting Password...' : 'Reset Password'}
                </button>
              </div>

              {error && (
                <div className="rounded-lg bg-rose-50 p-4 border border-rose-100">
                  <div className="flex">
                    <div className="flex-shrink-0">
                      <svg className="h-5 w-5 text-rose-500" viewBox="0 0 20 20" fill="currentColor">
                        <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
                      </svg>
                    </div>
                    <div className="ml-3">
                      <p className="text-xs font-semibold text-rose-800 leading-tight">{error}</p>
                    </div>
                  </div>
                </div>
              )}

              <div className="text-center pt-2 flex justify-between items-center">
                <button
                  type="button"
                  onClick={() => setStep(1)}
                  className="text-xs font-black uppercase text-slate-400 hover:text-slate-600 tracking-wider transition-colors"
                >
                  ← Resend OTP
                </button>
                <Link to="/login" className="text-xs font-black uppercase text-blue-600 hover:text-blue-700 tracking-wider transition-colors">
                  Return to Login
                </Link>
              </div>
            </form>
          ) : (
            <form className="space-y-6" onSubmit={handleSendOtp}>
              <div>
                <label htmlFor="usernameOrEmail" className="block text-[10px] font-black uppercase text-slate-400 tracking-widest ml-1 mb-2">
                  Username or Email Address
                </label>
                <div className="relative rounded-md shadow-sm">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                    <svg className="h-5 w-5 text-slate-400" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor">
                      <path fillRule="evenodd" d="M14.243 5.757a6 6 0 10-.986 9.284 1 1 0 111.087 1.678A8 8 0 1118 10a3 3 0 01-4.8 2.401 9.049 9.049 0 01-1.353.486 4 4 0 11-4.225-4.226 9 9 0 011.037-1.122 1.3 1.3 0 001.353-.195 1 1 0 011.414 1.414 6 6 0 00-1.414-1.414z" clipRule="evenodd" />
                    </svg>
                  </div>
                  <input
                    id="usernameOrEmail"
                    name="usernameOrEmail"
                    type="text"
                    required
                    value={usernameOrEmail}
                    onChange={(e) => setUsernameOrEmail(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl pl-10 pr-4 py-3 text-xs font-bold focus:ring-2 focus:ring-blue-500 outline-none"
                    placeholder="e.g. johndoe or john@example.com"
                  />
                </div>
              </div>

              <div>
                <button
                  type="submit"
                  disabled={loading}
                  className="w-full bg-slate-900 hover:bg-blue-600 text-white py-3.5 rounded-xl font-bold text-xs uppercase tracking-widest transition-all disabled:opacity-50 flex items-center justify-center"
                >
                  {loading ? (
                    <svg className="animate-spin -ml-1 mr-3 h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                    </svg>
                  ) : null}
                  {loading ? 'Sending OTP...' : 'Send OTP'}
                </button>
              </div>

              {error && (
                <div className="rounded-lg bg-rose-50 p-4 border border-rose-100">
                  <div className="flex">
                    <div className="flex-shrink-0">
                      <svg className="h-5 w-5 text-rose-500" viewBox="0 0 20 20" fill="currentColor">
                        <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
                      </svg>
                    </div>
                    <div className="ml-3">
                      <p className="text-xs font-semibold text-rose-850 leading-tight">{error}</p>
                    </div>
                  </div>
                </div>
              )}

              <div className="text-center pt-2">
                <Link to="/login" className="text-xs font-black uppercase text-blue-600 hover:text-blue-700 tracking-wider transition-colors">
                  ← Return to Login
                </Link>
              </div>
            </form>
          )}
        </div>
      </div>
    </div>
  );
}
