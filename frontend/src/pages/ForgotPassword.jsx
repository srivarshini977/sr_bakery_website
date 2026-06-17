import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { KeyRound, Mail } from 'lucide-react';
import API from '../utils/api';

const ForgotPassword = () => {
  const [email, setEmail] = useState('');
  const [code, setCode] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');

  const requestCode = async () => {
    try {
      setError('');
      const response = await API.post('/auth/forgotPassword', { email });
      setCode(response.data.resetCode || '');
      setMessage(response.data.message || 'Reset code generated.');
    } catch (err) {
      setError(err.response?.data?.message || 'Could not generate reset code');
    }
  };

  const resetPassword = async (event) => {
    event.preventDefault();
    try {
      setError('');
      const response = await API.post('/auth/resetPassword', { email, code, newPassword });
      setMessage(response.data.message || 'Password updated.');
    } catch (err) {
      setError(err.response?.data?.message || 'Password reset failed');
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-black via-zinc-950 to-red-950 flex items-center justify-center p-4">
      <div className="glass-card p-8 rounded-lg border border-red-900 w-full max-w-md">
        <h1 className="text-3xl font-bold text-white">Reset Password</h1>
        <p className="text-gray-400 mt-2">Use your account email to generate a demo reset code.</p>
        {message && <p className="mt-4 p-3 rounded bg-green-950 border border-green-900 text-green-300 text-sm">{message}</p>}
        {error && <p className="mt-4 p-3 rounded bg-red-950 border border-red-900 text-red-300 text-sm">{error}</p>}
        <form onSubmit={resetPassword} className="space-y-4 mt-6">
          <div className="relative">
            <Mail className="absolute left-3 top-3 text-gray-500" size={18} />
            <input value={email} onChange={(event) => setEmail(event.target.value)} type="email" placeholder="Email address" className="w-full bg-zinc-900 border border-zinc-700 rounded-lg px-4 py-3 pl-10 text-white" />
          </div>
          <button type="button" onClick={requestCode} className="w-full bg-zinc-800 hover:bg-zinc-700 rounded-lg py-3 text-white font-bold">Generate Reset Code</button>
          <div className="relative">
            <KeyRound className="absolute left-3 top-3 text-gray-500" size={18} />
            <input value={code} onChange={(event) => setCode(event.target.value)} placeholder="Reset code" className="w-full bg-zinc-900 border border-zinc-700 rounded-lg px-4 py-3 pl-10 text-white" />
          </div>
          <input value={newPassword} onChange={(event) => setNewPassword(event.target.value)} type="password" placeholder="New password" className="w-full bg-zinc-900 border border-zinc-700 rounded-lg px-4 py-3 text-white" />
          <button className="w-full bg-red-700 hover:bg-red-800 rounded-lg py-3 text-white font-bold">Update Password</button>
        </form>
        <Link to="/login" className="block text-center mt-5 text-red-300 font-bold">Back to login</Link>
      </div>
    </div>
  );
};

export default ForgotPassword;
