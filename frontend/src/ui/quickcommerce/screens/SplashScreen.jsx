import React, { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { ApprovedImage } from '../../../assets/ApprovedImage.jsx';
import { ArrowRight } from 'lucide-react';

export function SplashScreen({ onComplete }) {
  const navigate = useNavigate();

  useEffect(() => {
    const timer = setTimeout(() => {
      if (onComplete) {
        onComplete();
      } else {
        const hasOnboarded = localStorage.getItem('sevo_onboarded_v2') === 'true';
        if (hasOnboarded) {
          navigate('/home');
        } else {
          navigate('/qc/onboarding');
        }
      }
    }, 2400);

    return () => clearTimeout(timer);
  }, [navigate, onComplete]);

  const handleTap = () => {
    if (onComplete) {
      onComplete();
    } else {
      navigate('/qc/onboarding');
    }
  };

  return (
    <div
      onClick={handleTap}
      className="min-h-screen w-full flex flex-col justify-between items-center px-6 py-12 select-none cursor-pointer relative overflow-hidden text-white"
      style={{
        background: 'linear-gradient(180deg, #05261D 0%, #008F6B 55%, #022B1E 100%)',
      }}
    >
      {/* Background glow circle */}
      <div className="absolute -top-24 -left-24 w-80 h-80 bg-[#16A34A]/20 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute -bottom-24 -right-24 w-80 h-80 bg-[#008F6B]/30 rounded-full blur-3xl pointer-events-none" />

      {/* Top Brand Identity (Screen 1 in reference image) */}
      <div className="w-full flex flex-col items-center pt-8 text-center z-10 animate-fade-in">
        <div className="w-16 h-16 rounded-2xl bg-white/10 backdrop-blur-md p-3 mb-3 shadow-xl border border-white/20 flex items-center justify-center">
          <ApprovedImage assetId="brand-emblem" alt="SEVO" className="w-full h-full object-contain" />
        </div>
        <h1 className="text-3xl font-extrabold tracking-tight text-white flex items-center gap-1.5">
          SEVO
        </h1>
        <p className="text-xs text-[#E8F5EF] font-medium tracking-wide mt-1 uppercase">
          Industrial Essentials • Delivered Fast
        </p>
      </div>

      {/* Center Hero Spotlight Showcase */}
      <div className="relative w-64 h-64 my-auto flex items-center justify-center z-10">
        <div className="absolute inset-0 bg-[#E8F5EF]/10 rounded-full blur-2xl animate-pulse" />
        <div className="relative w-56 h-56 rounded-3xl bg-white/5 border border-white/15 backdrop-blur-sm p-4 shadow-2xl flex items-center justify-center">
          <ApprovedImage
            assetId="prod-screw-compressor"
            alt="SEVO Equipment"
            className="w-full h-full object-contain filter drop-shadow-2xl"
          />
        </div>
        {/* Subtle pedestal shadow */}
        <div className="absolute -bottom-4 w-44 h-6 bg-black/40 rounded-[100%] blur-md" />
      </div>

      {/* Bottom Tagline & Loading Indicator */}
      <div className="w-full text-center z-10 pb-4 animate-fade-in">
        <p className="text-sm font-semibold text-[#E8F5EF] leading-relaxed max-w-[280px] mx-auto mb-6">
          Powering Your Operations With The Right Parts Right on Time
        </p>

        {/* Progress loader */}
        <div className="w-36 h-1.5 bg-white/20 rounded-full mx-auto overflow-hidden">
          <div className="h-full bg-[#FFFFFF] rounded-full animate-[pulse_1.5s_ease-in-out_infinite]" style={{ width: '65%' }} />
        </div>

        <button
          onClick={(e) => {
            e.stopPropagation();
            navigate('/qc/onboarding');
          }}
          className="mt-6 inline-flex items-center gap-2 text-xs font-semibold text-[#E8F5EF] hover:text-white transition-colors"
        >
          <span>Tap anywhere to continue</span>
          <ArrowRight className="w-3.5 h-3.5" />
        </button>
      </div>
    </div>
  );
}
