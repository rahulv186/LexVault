import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { PageContainer } from '../components/layout/PageContainer';
import apiClient from '../services/apiClient';
import { Lock, User, Mail, UserCircle, Loader2, Eye, EyeOff } from 'lucide-react';
import { cn } from '../utils/cn';

interface FormData {
  fullName: string;
  username: string;
  email: string;
  password: string;
  confirmPassword: string;
}

interface FormErrors {
  [key: string]: string;
}

export const RegisterPage: React.FC = () => {
  const [formData, setFormData] = useState<FormData>({
    fullName: '',
    username: '',
    email: '',
    password: '',
    confirmPassword: '',
  });
  const [errors, setErrors] = useState<FormErrors>({});
  const [loading, setLoading] = useState<boolean>(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [isSuccess, setIsSuccess] = useState<boolean>(false);
  const [showPassword, setShowPassword] = useState<boolean>(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState<boolean>(false);

  const navigate = useNavigate();

  const validate = (): FormErrors => {
    const newErrors: FormErrors = {};
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    const passwordRegex = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d).{8,}$/;

    if (!formData.fullName.trim()) newErrors.fullName = 'Full name is required';
    if (!formData.username.trim()) {
      newErrors.username = 'Username is required';
    } else if (formData.username.length < 3) {
      newErrors.username = 'Username must be at least 3 characters';
    }

    if (!formData.email.trim()) {
      newErrors.email = 'Email is required';
    } else if (!emailRegex.test(formData.email)) {
      newErrors.email = 'Invalid email format';
    }

    if (!formData.password) {
      newErrors.password = 'Password is required';
    } else if (!passwordRegex.test(formData.password)) {
      newErrors.password = 'Password must be 8+ chars with uppercase, lowercase, and a number';
    }

    if (!formData.confirmPassword) {
      newErrors.confirmPassword = 'Please confirm your password';
    } else if (formData.confirmPassword !== formData.password) {
      newErrors.confirmPassword = 'Passwords do not match';
    }

    return newErrors;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const validationErrors = validate();
    if (Object.keys(validationErrors).length > 0) {
      setErrors(validationErrors);
      return;
    }

    setLoading(true);
    setSubmitError(null);
    setErrors({});

    try {
      await apiClient.post('/api/auth/register', {
        username: formData.username,
        email: formData.email,
        password: formData.password,
        full_name: formData.fullName,
      });
      setIsSuccess(true);
    } catch (err: any) {
      const message = err.response?.data?.detail || 'An unexpected error occurred during registration';
      setSubmitError(message);
    } finally {
      setLoading(false);
    }
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
    if (errors[name]) {
      setErrors((prev) => {
        const newErrors = { ...prev };
        delete newErrors[name];
        return newErrors;
      });
    }
  };

  if (isSuccess) {
    return (
      <PageContainer title="LexVault Registration">
        <div className="max-w-md mx-auto mt-20">
          <div className="glass-card p-8 text-center">
            <div className="w-16 h-16 bg-security-accent/20 text-security-accent rounded-full flex items-center justify-center mx-auto mb-6">
              <UserCircle className="w-8 h-8" />
            </div>
            <h2 className="text-2xl font-bold text-white mb-2">Account Created</h2>
            <p className="text-gray-500 text-sm mb-8">
              Your identity has been successfully registered in the vault. You can now sign in to access your evidence.
            </p>
            <button
              onClick={() => navigate('/login')}
              className="w-full py-3 bg-security-accent text-security-black font-bold rounded-lg hover:bg-opacity-90 transition-colors"
            >
              Go to Login
            </button>
          </div>
        </div>
      </PageContainer>
    );
  }

  return (
    <PageContainer title="LexVault Registration">
      <div className="max-w-md mx-auto mt-10 mb-20">
        <div className="glass-card p-8">
          <div className="text-center mb-8">
            <h2 className="text-2xl font-bold text-white mb-2">Create Vault Identity</h2>
            <p className="text-gray-500 text-sm">Establish your professional forensic credentials</p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-5">
            <div className="space-y-1">
              <label className="text-xs font-bold text-gray-500 uppercase">Full Name</label>
              <div className="relative">
                <UserCircle className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-600" />
                <input
                  name="fullName"
                  type="text"
                  className={cn(
                    "w-full bg-security-black border rounded-lg pl-10 pr-4 py-2 text-sm text-white focus:outline-none transition-colors",
                    errors.fullName ? "border-red-500/50 focus:border-red-500" : "border-security-gray-700 focus:border-security-accent"
                  )}
                  value={formData.fullName}
                  onChange={handleInputChange}
                  placeholder="John Doe"
                />
              </div>
              {errors.fullName && <p className="text-red-400 text-[10px] ml-1">{errors.fullName}</p>}
            </div>

            <div className="space-y-1">
              <label className="text-xs font-bold text-gray-500 uppercase">Username</label>
              <div className="relative">
                <User className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-600" />
                <input
                  name="username"
                  type="text"
                  className={cn(
                    "w-full bg-security-black border rounded-lg pl-10 pr-4 py-2 text-sm text-white focus:outline-none transition-colors",
                    errors.username ? "border-red-500/50 focus:border-red-500" : "border-security-gray-700 focus:border-security-accent"
                  )}
                  value={formData.username}
                  onChange={handleInputChange}
                  placeholder="jdoe_forensics"
                />
              </div>
              {errors.username && <p className="text-red-400 text-[10px] ml-1">{errors.username}</p>}
            </div>

            <div className="space-y-1">
              <label className="text-xs font-bold text-gray-500 uppercase">Email Address</label>
              <div className="relative">
                <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-600" />
                <input
                  name="email"
                  type="email"
                  className={cn(
                    "w-full bg-security-black border rounded-lg pl-10 pr-4 py-2 text-sm text-white focus:outline-none transition-colors",
                    errors.email ? "border-red-500/50 focus:border-red-500" : "border-security-gray-700 focus:border-security-accent"
                  )}
                  value={formData.email}
                  onChange={handleInputChange}
                  placeholder="j.doe@agency.gov"
                />
              </div>
              {errors.email && <p className="text-red-400 text-[10px] ml-1">{errors.email}</p>}
            </div>

            <div className="space-y-1">
              <label className="text-xs font-bold text-gray-500 uppercase">Password</label>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-600" />
                <input
                  name="password"
                  type={showPassword ? "text" : "password"}
                  className={cn(
                    "w-full bg-security-black border rounded-lg pl-10 pr-10 py-2 text-sm text-white focus:outline-none transition-colors",
                    errors.password ? "border-red-500/50 focus:border-red-500" : "border-security-gray-700 focus:border-security-accent"
                  )}
                  value={formData.password}
                  onChange={handleInputChange}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-600 hover:text-gray-400 transition-colors"
                >
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
              <div className="flex flex-wrap gap-x-2 gap-y-1 mt-1">
                <span className={cn("text-[9px] px-1.5 py-0.5 rounded border", formData.password.length >= 8 ? "border-green-500/30 text-green-500" : "border-gray-700 text-gray-600")}>8+ Chars</span>
                <span className={cn("text-[9px] px-1.5 py-0.5 rounded border", /[A-Z]/.test(formData.password) ? "border-green-500/30 text-green-500" : "border-gray-700 text-gray-600")}>Uppercase</span>
                <span className={cn("text-[9px] px-1.5 py-0.5 rounded border", /[a-z]/.test(formData.password) ? "border-green-500/30 text-green-500" : "border-gray-700 text-gray-600")}>Lowercase</span>
                <span className={cn("text-[9px] px-1.5 py-0.5 rounded border", /\d/.test(formData.password) ? "border-green-500/30 text-green-500" : "border-gray-700 text-gray-600")}>Number</span>
              </div>
              {errors.password && <p className="text-red-400 text-[10px] ml-1">{errors.password}</p>}
            </div>

            <div className="space-y-1">
              <label className="text-xs font-bold text-gray-500 uppercase">Confirm Password</label>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-600" />
                <input
                  name="confirmPassword"
                  type={showConfirmPassword ? "text" : "password"}
                  className={cn(
                    "w-full bg-security-black border rounded-lg pl-10 pr-10 py-2 text-sm text-white focus:outline-none transition-colors",
                    errors.confirmPassword ? "border-red-500/50 focus:border-red-500" : "border-security-gray-700 focus:border-security-accent"
                  )}
                  value={formData.confirmPassword}
                  onChange={handleInputChange}
                />
                <button
                  type="button"
                  onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-600 hover:text-gray-400 transition-colors"
                >
                  {showConfirmPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
              {errors.confirmPassword && <p className="text-red-400 text-[10px] ml-1">{errors.confirmPassword}</p>}
            </div>

            {submitError && (
              <div className="p-3 rounded-lg bg-red-500/10 border border-red-500/50 text-red-400 text-xs text-center">
                {submitError}
              </div>
            )}

            <button
              type="submit"
              disabled={loading}
              className="w-full py-3 bg-security-accent text-security-black font-bold rounded-lg hover:bg-opacity-90 transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
            >
              {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Register Identity'}
            </button>
          </form>

          <div className="mt-8 text-center">
            <p className="text-gray-500 text-sm">
              Already have an account?{' '}
              <Link to="/login" className="text-security-accent hover:underline font-medium">
                Sign in
              </Link>
            </p>
          </div>
        </div>
      </div>
    </PageContainer>
  );
};

export default RegisterPage;
