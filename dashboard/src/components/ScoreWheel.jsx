import React from 'react';
import { motion } from 'framer-motion';

export default function ScoreWheel({ score }) {
  // 0-100 mapped to circumference
  const radius = 60;
  const circumference = 2 * Math.PI * radius;
  const strokeDashoffset = circumference - (score / 100) * circumference;

  let color = '#22c55e'; // green-500
  if (score < 50) color = '#ef4444'; // red-500
  else if (score < 80) color = '#eab308'; // yellow-500

  return (
    <div className="relative flex items-center justify-center w-48 h-48 mx-auto">
      {/* Background track */}
      <svg className="absolute w-full h-full transform -rotate-90" viewBox="0 0 160 160">
        <circle
          cx="80"
          cy="80"
          r={radius}
          stroke="currentColor"
          strokeWidth="12"
          fill="none"
          className="text-slate-800"
        />
        
        {/* Animated Progress Circle */}
        <motion.circle
          cx="80"
          cy="80"
          r={radius}
          stroke={color}
          strokeWidth="12"
          fill="none"
          strokeLinecap="round"
          initial={{ strokeDashoffset: circumference }}
          animate={{ strokeDashoffset }}
          transition={{ duration: 1.5, ease: "easeOut" }}
          style={{ strokeDasharray: circumference }}
        />
      </svg>
      
      {/* Inner Score Text */}
      <div className="absolute flex flex-col items-center justify-center">
        <motion.span 
          className="text-5xl font-bold tracking-tighter"
          style={{ color }}
          initial={{ opacity: 0, scale: 0.5 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ delay: 0.5, duration: 0.5 }}
        >
          {score}
        </motion.span>
        <span className="text-xs uppercase tracking-widest text-slate-500 mt-1 font-semibold">
          Readiness
        </span>
      </div>
    </div>
  );
}
