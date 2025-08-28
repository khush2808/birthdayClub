'use client';

import { useState } from 'react';
import { Calendar, Mail, User, Gift } from 'lucide-react';

export default function Home() {
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    dateOfBirth: ''
  });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [message, setMessage] = useState('');
  
  const [currentTheme, setCurrentTheme] = useState(0);
  
  const themes = [
    {
      name: 'Subtle Blue',
      bg: 'from-blue-100 via-blue-50 to-indigo-100',
      accent: 'blue',
      elements: ['bg-blue-200', 'bg-indigo-200', 'bg-blue-100'],
      preview: 'from-blue-400 to-indigo-500'
    },
    {
      name: 'Purple Dreams',
      bg: 'from-purple-100 via-pink-50 to-indigo-100',
      accent: 'purple',
      elements: ['bg-purple-200', 'bg-pink-200', 'bg-indigo-200'],
      preview: 'from-purple-400 to-pink-500'
    },
    {
      name: 'Ocean Breeze',
      bg: 'from-blue-100 via-cyan-50 to-teal-100',
      accent: 'cyan',
      elements: ['bg-blue-200', 'bg-cyan-200', 'bg-teal-200'],
      preview: 'from-blue-400 to-teal-500'
    },
    {
      name: 'Sunset Glow',
      bg: 'from-orange-100 via-rose-50 to-pink-100',
      accent: 'rose',
      elements: ['bg-orange-200', 'bg-rose-200', 'bg-pink-200'],
      preview: 'from-orange-400 to-pink-500'
    }
  ];
  
  const currentThemeData = themes[currentTheme];

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    setMessage('');

    try {
      const response = await fetch('/api/register', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(formData),
      });

      const result = await response.json();

      if (response.ok) {
        setMessage('Registration successful! You will receive birthday wishes from all friends.');
        setFormData({ name: '', email: '', dateOfBirth: '' });
      } else {
        setMessage(result.error || 'Registration failed. Please try again.');
      }
    } catch (error) {
      setMessage('An error occurred. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value
    });
  };

  return (
    <div className={`min-h-screen bg-gradient-to-br ${currentThemeData.bg} flex flex-col items-center justify-center p-4 relative overflow-hidden transition-all duration-700`}>
      {/* Background decorative elements */}
      <div className="absolute inset-0 overflow-hidden">
        <div className={`absolute -top-40 -right-40 w-80 h-80 ${currentThemeData.elements[0]} rounded-full mix-blend-multiply filter blur-xl opacity-30 animate-pulse transition-all duration-700`}></div>
        <div className={`absolute -bottom-40 -left-40 w-80 h-80 ${currentThemeData.elements[1]} rounded-full mix-blend-multiply filter blur-xl opacity-30 animate-pulse delay-1000 transition-all duration-700`}></div>
        <div className={`absolute top-40 left-1/2 w-60 h-60 ${currentThemeData.elements[2]} rounded-full mix-blend-multiply filter blur-xl opacity-40 animate-pulse delay-500 transition-all duration-700`}></div>
      </div>

      {/* Glassmorphism form container */}
      <div className="relative backdrop-blur-xl bg-white/25 border border-white/40 rounded-2xl shadow-2xl p-8 w-full max-w-md z-10">
        <div className="text-center mb-8">
          <Gift className="mx-auto h-12 w-12 text-gray-800 mb-4 drop-shadow-sm transition-all duration-500" />
          <h1 className="text-3xl font-bold text-gray-800 mb-2 drop-shadow-sm">Birthday Club</h1>
          <p className="text-gray-700">Join our birthday reminder community!</p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-6">
          <div>
            <label htmlFor="name" className="block text-sm font-medium text-gray-800 mb-2">
              <User className="inline h-4 w-4 mr-1" />
              Full Name
            </label>
            <input
              type="text"
              id="name"
              name="name"
              required
              value={formData.name}
              onChange={handleChange}
              className="w-full px-4 py-3 bg-white/60 backdrop-blur-sm border border-white/60 rounded-xl shadow-sm focus:outline-none focus:ring-2 focus:ring-${currentThemeData.accent}-500 focus:border-transparent placeholder-gray-500 text-gray-900 font-medium"
              placeholder="Enter your full name"
            />
          </div>

          <div>
            <label htmlFor="email" className="block text-sm font-medium text-gray-800 mb-2">
              <Mail className="inline h-4 w-4 mr-1" />
              Email Address
            </label>
            <input
              type="email"
              id="email"
              name="email"
              required
              value={formData.email}
              onChange={handleChange}
              className="w-full px-4 py-3 bg-white/60 backdrop-blur-sm border border-white/60 rounded-xl shadow-sm focus:outline-none focus:ring-2 focus:ring-${currentThemeData.accent}-500 focus:border-transparent placeholder-gray-500 text-gray-900 font-medium"
              placeholder="Enter your email address"
            />
          </div>

          <div>
            <label htmlFor="dateOfBirth" className="block text-sm font-medium text-gray-800 mb-2">
              <Calendar className="inline h-4 w-4 mr-1" />
              Date of Birth
            </label>
            <input
              type="date"
              id="dateOfBirth"
              name="dateOfBirth"
              required
              value={formData.dateOfBirth}
              onChange={handleChange}
              className="w-full px-4 py-3 bg-white/60 backdrop-blur-sm border border-white/60 rounded-xl shadow-sm focus:outline-none focus:ring-2 focus:ring-${currentThemeData.accent}-500 focus:border-transparent text-gray-900 font-medium [&::-webkit-calendar-picker-indicator]:opacity-80 [&::-webkit-calendar-picker-indicator]:cursor-pointer"
            />
          </div>

          <button
            type="submit"
            disabled={isSubmitting}
            className={`w-full bg-${currentThemeData.accent}-500 text-black py-3 px-6 rounded-xl hover:bg-${currentThemeData.accent}-600 focus:outline-none focus:ring-2 focus:ring-${currentThemeData.accent}-400 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200 shadow-lg hover:shadow-xl font-bold cursor-pointer backdrop-blur-sm`}
          >
            {isSubmitting ? 'Registering...' : 'Join Birthday Club'}
          </button>
        </form>

        {message && (
          <div className={`mt-6 p-4 rounded-xl text-sm backdrop-blur-sm border ${
            message.includes('successful') 
              ? 'bg-green-100/50 text-green-800 border-green-300/50' 
              : 'bg-red-100/50 text-red-800 border-red-300/50'
          }`}>
            {message}
          </div>
        )}
      </div>

      {/* Footer */}
      <div className="mt-8 text-center z-10">
        <div className="backdrop-blur-sm bg-white/20 border border-white/30 rounded-xl px-4 py-2 shadow-lg">
          <p className="text-gray-800 text-sm font-medium drop-shadow-sm">
            Created with 💙 by khush2808
          </p>
        </div>
      </div>

      {/* Color Theme Picker */}
      <div className="fixed bottom-6 right-6 z-20 flex flex-col gap-3 p-3 backdrop-blur-sm bg-white/20 rounded-full border border-white/30 shadow-lg">
        {themes.map((theme, index) => (
          <button
            key={index}
            onClick={() => setCurrentTheme(index)}
            title={`Change design color - ${theme.name}`}
            className={`w-8 h-8 rounded-full bg-gradient-to-r ${theme.preview} cursor-pointer transition-all duration-300 hover:scale-110 hover:shadow-lg ${
              currentTheme === index ? 'ring-2 ring-white shadow-lg scale-110' : 'hover:ring-1 hover:ring-white/50'
            }`}
          />
        ))}
      </div>
    </div>
  );
}
