import React, { useState, useContext } from 'react';
import { AuthContext } from '../context/AuthContext';
import { useNavigate, Link } from 'react-router-dom';
import { Mail, Lock, AlertCircle, CheckCircle } from 'lucide-react';

const Login = () => {
  const { login } = useContext(AuthContext);
  const navigate = useNavigate();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setSuccess('');

    // Validation
    if (!email || !password) {
      setError('Please fill in all fields');
      return;
    }

    try {
      setLoading(true);
      const loggedInUser = await login(email, password);
      setSuccess('Login successful! Redirecting...');
      const destination =
        loggedInUser.role === 'admin'
          ? '/admin'
          : loggedInUser.role === 'staff'
            ? '/staff'
            : '/dashboard';
      setTimeout(() => navigate(destination), 1500);
    } catch (err) {
      setError(err.response?.data?.message || 'Login failed. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-black via-zinc-950 to-red-950 flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        {/* Card */}
        <div className="glass-card p-8 rounded-lg border border-red-900 space-y-6">
          {/* Header */}
          <div className="text-center">
            <h1 className="text-3xl font-bold text-white">SR Bakery</h1>
            <p className="text-red-400 text-sm mt-2">Login to Your Account</p>
          </div>

          {/* Error Message */}
          {error && (
            <div className="flex gap-3 p-4 bg-red-950 border border-red-900 rounded-lg">
              <AlertCircle className="text-red-400 flex-shrink-0" />
              <p className="text-red-400 text-sm">{error}</p>
            </div>
          )}

          {/* Success Message */}
          {success && (
            <div className="flex gap-3 p-4 bg-green-950 border border-green-900 rounded-lg">
              <CheckCircle className="text-green-400 flex-shrink-0" />
              <p className="text-green-400 text-sm">{success}</p>
            </div>
          )}

          {/* Form */}
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-sm text-gray-400 mb-2">Email Address</label>
              <div className="relative">
                <Mail className="absolute left-3 top-3 text-gray-500" size={18} />
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="your@email.com"
                  className="w-full bg-zinc-800 text-white px-4 py-2 pl-10 rounded-lg border border-zinc-700 focus:border-red-600 focus:outline-none transition"
                  disabled={loading}
                />
              </div>
            </div>

            <div>
              <label className="block text-sm text-gray-400 mb-2">Password</label>
              <div className="relative">
                <Lock className="absolute left-3 top-3 text-gray-500" size={18} />
                <input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Password"
                  className="w-full bg-zinc-800 text-white px-4 py-2 pl-10 rounded-lg border border-zinc-700 focus:border-red-600 focus:outline-none transition"
                  disabled={loading}
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full bg-red-700 hover:bg-red-800 disabled:bg-red-900 text-white py-3 rounded-lg font-bold transition"
            >
              {loading ? 'Logging in...' : 'Login'}
            </button>
          </form>

          <div className="text-center">
            <Link to="/forgot-password" className="text-sm text-red-300 hover:text-red-200 font-bold">
              Forgot password?
            </Link>
          </div>

          {/* Divider */}
          <div className="border-t border-zinc-700"></div>

          {/* Footer */}
          <div className="text-center">
            <p className="text-gray-400 text-sm">
              Don't have an account?{' '}
              <Link to="/signup" className="text-red-400 hover:text-red-300 font-bold">
                Sign Up
              </Link>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Login;
