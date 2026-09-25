"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabaseClient";
import { Mail, ArrowLeft, CheckCircle } from "lucide-react";
import Footer from "@/components/layout/Footer";

export default function ForgotPasswordPage() {
  const router = useRouter();

  const [email, setEmail] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");

    if (!email) {
      setError("Email address is required");
      return;
    }

    // Basic email validation
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      setError("Please enter a valid email address");
      return;
    }

    setLoading(true);

    const origin = window.location.origin;

    const { error: resetError } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${origin}/auth/callback?next=/reset-password`,
    });

    setLoading(false);

    if (resetError) {
      console.error(resetError);
      // We don't show the specific error to prevent email enumeration.
    }
    
    // Always show success to prevent email enumeration
    setSuccess(true);
  };

  return (
    <div className="min-h-dvh flex flex-col font-sans pb-safe relative overflow-hidden lg:overflow-visible">
      {/* Mobile Back to Home Link */}
      <button
        type="button"
        onClick={() => router.push("/login")}
        title="Back to Login"
        aria-label="Back to Login"
        className="lg:hidden absolute top-5 left-5 z-30 p-3 rounded-full bg-white/15 hover:bg-white/25 border border-white/30 hover:border-white/50 text-white transition-all duration-300 backdrop-blur-md shadow-sm hover:shadow group flex items-center justify-center"
      >
        <ArrowLeft
          size={20}
          className="transition-transform duration-300 group-hover:-translate-x-0.5"
        />
      </button>

      {/* Mobile-only background gradient wrapper */}
      <div className="absolute inset-0 bg-gradient-to-br from-emerald-500 to-teal-700 lg:hidden -z-20 overflow-hidden">
        <div className="absolute top-0 right-0 w-64 md:w-96 h-full bg-white/10 skew-x-12 translate-x-32 rounded-l-3xl backdrop-blur-sm pointer-events-none" />
        <div className="absolute bottom-0 left-0 w-96 h-96 bg-teal-400/30 rounded-full blur-3xl pointer-events-none" />
      </div>

      {/* Desktop-only background color wrapper */}
      <div className="absolute inset-0 bg-gray-50/50 hidden lg:block -z-20"></div>

      <div className="flex-1 flex flex-col lg:flex-row w-full z-10">
        {/* LEFT SIDE (40%) - Branding (Desktop Only) */}
        <div className="hidden lg:flex w-full lg:w-[40%] bg-gradient-to-br from-emerald-500 to-teal-700 relative overflow-hidden flex-col justify-center px-12 lg:px-16 text-white shrink-0 shadow-lg lg:shadow-2xl z-10">
          <button
            type="button"
            onClick={() => router.push("/login")}
            className="absolute top-8 left-12 z-30 flex items-center gap-2 px-4 py-2 rounded-full bg-white/15 hover:bg-white/25 border border-white/30 hover:border-white/50 text-white text-sm font-medium transition-all duration-300 backdrop-blur-md shadow-sm hover:shadow group"
          >
            <span className="transition-transform duration-300 group-hover:-translate-x-1">
              ←
            </span>
            <span>Back to Login</span>
          </button>
          
          <div className="absolute top-0 right-0 w-48 h-full bg-white/10 skew-x-12 translate-x-24 rounded-l-3xl backdrop-blur-sm"></div>
          <div className="absolute -bottom-10 -left-10 w-72 h-72 bg-teal-400/30 rounded-full blur-3xl"></div>

          <div className="relative z-20 max-w-xl mx-auto lg:mx-0 w-full text-left">
            <img
              src="/innovative_logo_-removebg-preview.png"
              alt="Innovative Insurance Logo"
              className="h-16 lg:h-20 w-auto object-contain mb-4 drop-shadow-sm"
            />
            <h1 className="text-5xl lg:text-6xl font-extrabold tracking-tight mb-2 drop-shadow-sm">
              INNOVATIVE
            </h1>
            <h2 className="text-2xl font-medium text-emerald-50 mb-6">
              Insurance
            </h2>
            <div className="w-16 h-1 bg-emerald-300 rounded-full mb-8"></div>
            <p className="text-lg text-emerald-100 max-w-md leading-relaxed drop-shadow-sm">
              Recover your access to the integrated dashboard solution.
            </p>
          </div>
        </div>

        {/* RIGHT SIDE (60%) - Form */}
        <div className="w-full lg:w-[60%] flex flex-col items-center justify-center p-4 sm:p-6 lg:p-12 relative flex-1">
          <div className="lg:hidden flex flex-col items-center justify-center text-white mb-6 sm:mb-8 text-center drop-shadow-md z-10 w-full mt-2 sm:mt-6">
            <img
              src="/innovative_logo_-removebg-preview.png"
              alt="Innovative Insurance Logo"
              className="h-12 sm:h-14 w-auto object-contain mb-2 drop-shadow-sm"
            />
            <h1 className="text-4xl sm:text-5xl font-extrabold tracking-tight mb-1">
              INNOVATIVE
            </h1>
            <h2 className="text-lg sm:text-xl font-medium text-emerald-100">
              Insurance
            </h2>
          </div>

          <div className="w-full max-w-md bg-white/95 lg:bg-white/70 backdrop-blur-2xl lg:backdrop-blur-xl rounded-[2rem] sm:rounded-[2.5rem] lg:rounded-3xl shadow-[0_20px_40px_-10px_rgba(0,0,0,0.2)] lg:shadow-[0_8px_30px_rgb(0,0,0,0.06)] border border-white/40 lg:border-white/60 p-6 sm:p-8 lg:p-10 relative z-10 transition-all duration-300 lg:hover:shadow-[0_8px_40px_rgb(0,0,0,0.08)]">
            <div className="text-center mb-6 lg:mb-8">
              <h2 className="text-2xl sm:text-3xl font-bold text-gray-900 lg:text-gray-800 tracking-tight">
                Reset Password
              </h2>
              <p className="text-sm sm:text-base text-gray-600 lg:text-gray-500 mt-1.5 font-medium">
                Enter your email to receive a recovery link
              </p>
            </div>

            {success ? (
              <div className="flex flex-col items-center text-center space-y-4">
                <div className="w-16 h-16 bg-teal-100 text-teal-600 rounded-full flex items-center justify-center mb-2">
                  <CheckCircle size={32} />
                </div>
                <h3 className="text-lg font-bold text-gray-900">Check Your Email</h3>
                <p className="text-gray-600">
                  If an account exists for this email, a password reset link has been sent. Please check your inbox.
                </p>
                <button
                  type="button"
                  onClick={() => router.push("/login")}
                  className="w-full bg-gradient-to-r from-emerald-500 to-teal-600 hover:from-emerald-600 hover:to-teal-700 text-white font-semibold py-3.5 rounded-xl transition-all duration-300 mt-4"
                >
                  Return to Login
                </button>
              </div>
            ) : (
              <form onSubmit={handleSubmit} className="space-y-4 sm:space-y-5">
                <div className="space-y-1.5">
                  <label className="text-xs sm:text-sm font-semibold text-gray-700 block ml-1">
                    Email Address
                  </label>
                  <div className="relative group">
                    <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-gray-400 group-focus-within:text-teal-500 transition-colors">
                      <Mail size={18} />
                    </div>
                    <input
                      type="email"
                      placeholder="name@company.com"
                      className="w-full pl-10 pr-4 py-3 bg-gray-50/50 hover:bg-white border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-teal-500/50 focus:border-teal-500 transition-all duration-300 text-sm shadow-sm"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                    />
                  </div>
                </div>

                {error && (
                  <div className="p-3 bg-red-50/80 backdrop-blur-sm border border-red-200 text-red-600 text-sm font-medium rounded-xl text-center shadow-sm">
                    {error}
                  </div>
                )}

                <button
                  type="submit"
                  disabled={loading}
                  className="w-full bg-gradient-to-r from-emerald-500 to-teal-600 hover:from-emerald-600 hover:to-teal-700 text-white font-semibold py-3.5 rounded-xl transition-all duration-300 shadow-[0_4px_14px_0_rgba(13,148,136,0.39)] hover:shadow-[0_6px_20px_rgba(13,148,136,0.23)] hover:-translate-y-[1px] disabled:opacity-70 disabled:cursor-not-allowed mt-2"
                >
                  {loading ? "Sending..." : "Send Reset Link"}
                </button>
              </form>
            )}
          </div>
        </div>
      </div>
      <div className="w-full shrink-0 z-10 relative">
        <Footer />
      </div>
    </div>
  );
}
