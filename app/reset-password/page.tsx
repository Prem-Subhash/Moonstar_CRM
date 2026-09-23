"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabaseClient";
import { Lock, Eye, EyeOff, CheckCircle, ArrowLeft } from "lucide-react";
import Footer from "@/components/layout/Footer";

export default function ResetPasswordPage() {
  const router = useRouter();

  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [verifyingSession, setVerifyingSession] = useState(true);

  useEffect(() => {
    const checkSession = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        setError("Invalid or expired password reset link. Please try again.");
      }
      setVerifyingSession(false);
    };
    checkSession();
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");

    if (!password || !confirmPassword) {
      setError("Both fields are required");
      return;
    }

    if (password.length < 6) {
      setError("Password must be at least 6 characters long");
      return;
    }

    if (password !== confirmPassword) {
      setError("Passwords do not match");
      return;
    }

    setLoading(true);

    const { error: updateError } = await supabase.auth.updateUser({
      password: password
    });

    setLoading(false);

    if (updateError) {
      setError(updateError.message || "Failed to update password. Please try again.");
      return;
    }

    setSuccess(true);
    
    // Log out so they can log in cleanly with the new password
    await supabase.auth.signOut();
  };

  if (verifyingSession) {
    return (
      <div className="min-h-dvh flex items-center justify-center bg-gray-50/50">
        <div className="animate-spin h-8 w-8 border-4 border-teal-500 border-t-transparent rounded-full"></div>
      </div>
    );
  }

  const isInvalidSession = error && error.includes("Invalid or expired");

  return (
    <div className="min-h-dvh flex flex-col font-sans pb-safe relative overflow-hidden lg:overflow-visible">
      {/* Mobile Back Link */}
      <button
        type="button"
        onClick={() => router.push("/login")}
        title="Back to Login"
        className="lg:hidden absolute top-5 left-5 z-30 p-3 rounded-full bg-white/15 hover:bg-white/25 border border-white/30 text-white backdrop-blur-md shadow-sm group flex items-center justify-center"
      >
        <ArrowLeft size={20} className="transition-transform group-hover:-translate-x-0.5" />
      </button>

      {/* Mobile-only background */}
      <div className="absolute inset-0 bg-gradient-to-br from-emerald-500 to-teal-700 lg:hidden -z-20 overflow-hidden">
        <div className="absolute top-0 right-0 w-64 md:w-96 h-full bg-white/10 skew-x-12 translate-x-32 rounded-l-3xl backdrop-blur-sm pointer-events-none" />
        <div className="absolute bottom-0 left-0 w-96 h-96 bg-teal-400/30 rounded-full blur-3xl pointer-events-none" />
      </div>

      <div className="absolute inset-0 bg-gray-50/50 hidden lg:block -z-20"></div>

      <div className="flex-1 flex flex-col lg:flex-row w-full z-10">
        {/* LEFT SIDE Branding (Desktop Only) */}
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
              Create a new password to secure your account.
            </p>
          </div>
        </div>

        {/* RIGHT SIDE Form */}
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

          <div className="w-full max-w-md bg-white/95 lg:bg-white/70 backdrop-blur-2xl lg:backdrop-blur-xl rounded-[2rem] sm:rounded-[2.5rem] lg:rounded-3xl shadow-[0_20px_40px_-10px_rgba(0,0,0,0.2)] lg:shadow-[0_8px_30px_rgb(0,0,0,0.06)] border border-white/40 lg:border-white/60 p-6 sm:p-8 lg:p-10 relative z-10 transition-all duration-300">
            <div className="text-center mb-6 lg:mb-8">
              <h2 className="text-2xl sm:text-3xl font-bold text-gray-900 tracking-tight">
                Update Password
              </h2>
              <p className="text-sm sm:text-base text-gray-600 mt-1.5 font-medium">
                Please enter your new password
              </p>
            </div>

            {success ? (
              <div className="flex flex-col items-center text-center space-y-4">
                <div className="w-16 h-16 bg-teal-100 text-teal-600 rounded-full flex items-center justify-center mb-2">
                  <CheckCircle size={32} />
                </div>
                <h3 className="text-lg font-bold text-gray-900">Password Updated</h3>
                <p className="text-gray-600">
                  Your password has been successfully updated.
                </p>
                <button
                  type="button"
                  onClick={() => router.push("/login")}
                  className="w-full bg-gradient-to-r from-emerald-500 to-teal-600 hover:from-emerald-600 hover:to-teal-700 text-white font-semibold py-3.5 rounded-xl mt-4 transition-all"
                >
                  Return to Login
                </button>
              </div>
            ) : isInvalidSession ? (
              <div className="flex flex-col items-center text-center space-y-4">
                <div className="p-3 bg-red-50/80 border border-red-200 text-red-600 text-sm font-medium rounded-xl text-center shadow-sm w-full">
                  {error}
                </div>
                <button
                  type="button"
                  onClick={() => router.push("/forgot-password")}
                  className="w-full bg-gradient-to-r from-emerald-500 to-teal-600 hover:from-emerald-600 hover:to-teal-700 text-white font-semibold py-3.5 rounded-xl mt-4 transition-all"
                >
                  Request New Link
                </button>
              </div>
            ) : (
              <form onSubmit={handleSubmit} className="space-y-4 sm:space-y-5">
                {/* New Password Input */}
                <div className="space-y-1.5">
                  <label className="text-xs sm:text-sm font-semibold text-gray-700 block ml-1">
                    New Password
                  </label>
                  <div className="relative group">
                    <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-gray-400 group-focus-within:text-teal-500 transition-colors">
                      <Lock size={18} />
                    </div>
                    <input
                      type={showPassword ? "text" : "password"}
                      placeholder="......"
                      className="w-full pl-10 pr-12 py-3 bg-gray-50/50 hover:bg-white border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-teal-500/50 focus:border-teal-500 transition-all duration-300 text-sm shadow-sm"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute inset-y-0 right-0 pr-3.5 flex items-center text-gray-400 hover:text-teal-600 transition-colors"
                    >
                      {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                    </button>
                  </div>
                </div>

                {/* Confirm Password Input */}
                <div className="space-y-1.5">
                  <label className="text-xs sm:text-sm font-semibold text-gray-700 block ml-1">
                    Confirm Password
                  </label>
                  <div className="relative group">
                    <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-gray-400 group-focus-within:text-teal-500 transition-colors">
                      <Lock size={18} />
                    </div>
                    <input
                      type={showConfirmPassword ? "text" : "password"}
                      placeholder="......"
                      className="w-full pl-10 pr-12 py-3 bg-gray-50/50 hover:bg-white border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-teal-500/50 focus:border-teal-500 transition-all duration-300 text-sm shadow-sm"
                      value={confirmPassword}
                      onChange={(e) => setConfirmPassword(e.target.value)}
                    />
                    <button
                      type="button"
                      onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                      className="absolute inset-y-0 right-0 pr-3.5 flex items-center text-gray-400 hover:text-teal-600 transition-colors"
                    >
                      {showConfirmPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                    </button>
                  </div>
                </div>

                {error && (
                  <div className="p-3 bg-red-50/80 border border-red-200 text-red-600 text-sm font-medium rounded-xl text-center shadow-sm">
                    {error}
                  </div>
                )}

                <button
                  type="submit"
                  disabled={loading || !password || !confirmPassword || (password !== confirmPassword)}
                  className="w-full bg-gradient-to-r from-emerald-500 to-teal-600 hover:from-emerald-600 hover:to-teal-700 text-white font-semibold py-3.5 rounded-xl transition-all duration-300 disabled:opacity-70 disabled:cursor-not-allowed mt-2 shadow-sm hover:shadow-md"
                >
                  {loading ? "Updating..." : "Update Password"}
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
