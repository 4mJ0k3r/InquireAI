"use client";

import { useForm } from "react-hook-form";
import { useRouter } from "next/navigation";
import { useState } from "react";
import Link from "next/link";
import toast, { Toaster } from "react-hot-toast";
import { ArrowLeftIcon, EyeIcon, EyeSlashIcon } from "@heroicons/react/24/outline";
import { useAuth } from "@/store/useAuth";
import { login } from "@/services/api";
import AuthGuard from "@/components/AuthGuard";

interface LoginForm {
  email: string;
  password: string;
}

export default function LoginPage() {
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const { login: setToken } = useAuth();
  
  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<LoginForm>();

  const onSubmit = async ({ email, password }: LoginForm) => {
    setIsLoading(true);
    try {
      const response = await login(email, password);
      const { token, refreshToken, user } = response.data;
      
      // Store tokens
      setToken(token);
      if (refreshToken) {
        localStorage.setItem("refreshToken", refreshToken);
      }
      
      toast.success(`Welcome back, ${user.email}!`);
      
      // Redirect to dashboard
      router.push("/dashboard");
    } catch (error: any) {
      console.error("Login error:", error);
      const errorMessage = error.response?.data?.error?.message || "Login failed";
      toast.error(errorMessage);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <AuthGuard requireAuth={false}>
      <div className="min-h-screen flex">
        <Toaster position="top-right" />
        
        {/* Left Side - Gradient Section */}
        <div className="hidden lg:flex lg:w-1/2 relative overflow-hidden" style={{background: 'linear-gradient(to bottom right, #0f4c81, #ffb703, #0f4c81)'}}>
          {/* Background Pattern */}
          <div className="absolute inset-0" style={{background: 'linear-gradient(to bottom right, rgba(15, 76, 129, 0.2), transparent, rgba(15, 76, 129, 0.3))'}}></div>
          
          {/* Content */}
          <div className="relative z-10 flex flex-col justify-center px-12 xl:px-16 text-white">
            <div className="max-w-md">
              <h1 className="text-4xl xl:text-5xl font-bold mb-6">
                Welcome Back
              </h1>
              <p className="text-lg xl:text-xl text-white/90 mb-8">
                 Sign in to access your account and continue your intelligent AI conversations.
               </p>
               <blockquote className="text-white/80 italic">
                 "The best investment you can make is in yourself."
                 <footer className="mt-2 text-sm text-white/70">— Warren Buffett</footer>
              </blockquote>
            </div>
          </div>
          
          {/* Decorative Elements */}
           <div className="absolute top-20 right-20 w-32 h-32 rounded-full blur-xl" style={{backgroundColor: 'rgba(255, 183, 3, 0.1)'}}></div>
           <div className="absolute bottom-20 left-20 w-24 h-24 rounded-full blur-lg" style={{backgroundColor: 'rgba(15, 76, 129, 0.2)'}}></div>
        </div>

        {/* Right Side - Login Form */}
        <div className="w-full lg:w-1/2 flex items-center justify-center p-8 bg-white">
          <div className="max-w-md w-full space-y-8">
            {/* Header */}
            <div className="text-center lg:text-left">
              <Link
                href="/"
                className="inline-flex items-center text-sm text-gray-600 hover:text-gray-900 mb-8 lg:mb-6"
              >
                <ArrowLeftIcon className="h-4 w-4 mr-2" />
                Back to Home
              </Link>
              
              <h2 className="text-3xl font-bold text-gray-900 mb-2">Sign In</h2>
              <p className="text-gray-600">
                Sign in to access your account
              </p>
            </div>

            {/* Social Login Buttons */}
             <div className="space-y-3">
               <button className="w-full flex items-center justify-center px-4 py-3 border border-gray-300 rounded-lg text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2" style={{'--tw-ring-color': '#0f4c81'} as React.CSSProperties}>
                 <svg className="w-5 h-5 mr-3" viewBox="0 0 24 24">
                   <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
                   <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
                   <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
                   <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
                 </svg>
                 Google
               </button>
               
               <button className="w-full flex items-center justify-center px-4 py-3 border border-gray-300 rounded-lg text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2" style={{'--tw-ring-color': '#0f4c81'} as React.CSSProperties}>
                 <svg className="w-5 h-5 mr-3" fill="#1877F2" viewBox="0 0 24 24">
                   <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z"/>
                 </svg>
                 Facebook
               </button>
             </div>

            {/* Divider */}
            <div className="relative">
              <div className="absolute inset-0 flex items-center">
                <div className="w-full border-t border-gray-300" />
              </div>
              <div className="relative flex justify-center text-sm">
                <span className="px-2 bg-white text-gray-500">or continue with email</span>
              </div>
            </div>

            {/* Login Form */}
            <form className="space-y-6" onSubmit={handleSubmit(onSubmit)}>
              {/* Email Field */}
              <div>
                <label htmlFor="email" className="block text-sm font-medium text-gray-700 mb-2">
                  Email Address
                </label>
                <input
                   {...register("email", {
                     required: "Email is required",
                     pattern: {
                       value: /^\w+([.-]?\w+)*@\w+([.-]?\w+)*(\.\w{2,3})+$/,
                       message: "Please enter a valid email address"
                     }
                   })}
                   type="email"
                   autoComplete="email"
                   className="appearance-none block w-full px-4 py-3 border border-gray-300 rounded-lg placeholder-gray-400 focus:outline-none focus:ring-2 focus:border-transparent"
                   style={{'--tw-ring-color': '#0f4c81'} as React.CSSProperties}
                   placeholder="name@company.com"
                 />
                {errors.email && (
                  <p className="mt-1 text-sm text-red-600">{errors.email.message}</p>
                )}
              </div>

              {/* Password Field */}
              <div>
                <div className="flex items-center justify-between mb-2">
                   <label htmlFor="password" className="block text-sm font-medium text-gray-700">
                     Password
                   </label>
                   <Link href="/forgot-password" className="text-sm hover:text-opacity-80" style={{color: '#0f4c81'}}>
                     Forgot password?
                   </Link>
                 </div>
                 <div className="relative">
                   <input
                     {...register("password", {
                       required: "Password is required",
                       minLength: {
                         value: 6,
                         message: "Password must be at least 6 characters long"
                       }
                     })}
                     type={showPassword ? "text" : "password"}
                     autoComplete="current-password"
                     className="appearance-none block w-full px-4 py-3 pr-12 border border-gray-300 rounded-lg placeholder-gray-400 focus:outline-none focus:ring-2 focus:border-transparent"
                     style={{'--tw-ring-color': '#0f4c81'} as React.CSSProperties}
                     placeholder="••••••••"
                   />
                  <button
                    type="button"
                    className="absolute inset-y-0 right-0 pr-4 flex items-center"
                    onClick={() => setShowPassword(!showPassword)}
                  >
                    {showPassword ? (
                      <EyeSlashIcon className="h-5 w-5 text-gray-400" />
                    ) : (
                      <EyeIcon className="h-5 w-5 text-gray-400" />
                    )}
                  </button>
                </div>
                {errors.password && (
                  <p className="mt-1 text-sm text-red-600">{errors.password.message}</p>
                )}
              </div>

              {/* Remember Me */}
               <div className="flex items-center">
                 <input
                   id="remember-me"
                   name="remember-me"
                   type="checkbox"
                   className="h-4 w-4 border-gray-300 rounded focus:ring-2 focus:ring-offset-2"
                   style={{'--tw-ring-color': '#0f4c81', color: '#0f4c81'} as React.CSSProperties}
                 />
                 <label htmlFor="remember-me" className="ml-2 block text-sm text-gray-700">
                   Remember me
                 </label>
               </div>

               {/* Submit Button */}
               <button
                 type="submit"
                 disabled={isLoading}
                 className="w-full flex justify-center py-3 px-4 border border-transparent rounded-lg shadow-sm text-sm font-medium text-white hover:opacity-90 focus:outline-none focus:ring-2 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed"
                 style={{backgroundColor: '#0f4c81', '--tw-ring-color': '#0f4c81'} as React.CSSProperties}
               >
                 {isLoading ? "Signing in..." : "Sign in"}
               </button>

              {/* Register Link */}
               <div className="text-center">
                 <p className="text-sm text-gray-600">
                   Don't have an account?{" "}
                   <Link
                     href="/register"
                     className="font-medium hover:text-opacity-80"
                     style={{color: '#0f4c81'}}
                   >
                     Create account
                   </Link>
                 </p>
               </div>
            </form>
          </div>
        </div>
      </div>
    </AuthGuard>
  );
}
