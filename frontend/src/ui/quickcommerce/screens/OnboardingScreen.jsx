import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ApprovedImage } from '../../../assets/ApprovedImage.jsx';
import { ArrowRight, CheckCircle2, ShieldCheck, Zap } from 'lucide-react';

const SLIDES = [
  {
    id: 1,
    title: 'Everything for Compressed Air & Operations',
    subtitle: 'Parts • Accessories • Services Delivered Fast',
    assetId: 'prod-screw-compressor',
    highlight: '10–15 Min Delivery',
    icon: Zap,
  },
  {
    id: 2,
    title: 'Genuine Industrial Grade & Tested Quality',
    subtitle: '100% Verified OEM Spares & Guaranteed Direct Fit',
    assetId: 'prod-air-filter-element',
    highlight: '1 Year Warranty Included',
    icon: ShieldCheck,
  },
  {
    id: 3,
    title: 'Live Realtime Rider Tracking to Your Facility',
    subtitle: 'GPS Dispatch with Instant Partner Support on Demand',
    assetId: 'hero-banner-main',
    highlight: 'Direct to Your Location',
    icon: CheckCircle2,
  },
];

export function OnboardingScreen() {
  const navigate = useNavigate();
  const [currentSlide, setCurrentSlide] = useState(0);

  const handleComplete = () => {
    localStorage.setItem('antigravity_onboarded_v2', 'true');
    navigate('/qc/auth');
  };

  const handleNext = () => {
    if (currentSlide < SLIDES.length - 1) {
      setCurrentSlide((prev) => prev + 1);
    } else {
      handleComplete();
    }
  };

  const slide = SLIDES[currentSlide];
  const Icon = slide.icon;

  return (
    <div className="min-h-screen w-full flex flex-col justify-between p-6 bg-[#FFFFFF] text-[#17212B]">
      {/* Top Bar: Brand + Skip */}
      <div className="flex items-center justify-between pt-2">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-lg bg-[#E8F5EF] p-1.5 flex items-center justify-center">
            <ApprovedImage assetId="brand-emblem" alt="antigravity" className="w-full h-full object-contain" />
          </div>
          <span className="font-extrabold text-lg tracking-tight text-[#008F6B]">
            antigravity
          </span>
        </div>
        <button
          onClick={handleComplete}
          className="text-xs font-semibold text-[#667280] hover:text-[#17212B] px-3 py-1.5 rounded-full hover:bg-slate-100 transition-colors"
        >
          Skip
        </button>
      </div>

      {/* Slide Illustration Showcase */}
      <div className="my-auto flex flex-col items-center text-center py-4">
        <div className="relative w-64 h-64 mb-8 flex items-center justify-center">
          <div className="absolute inset-0 bg-[#E8F5EF] rounded-full filter blur-xl opacity-60" />
          <div className="relative w-56 h-56 rounded-3xl bg-[#F8F7F1] border border-[#DDE4E0] p-6 shadow-md flex items-center justify-center">
            <ApprovedImage
              assetId={slide.assetId}
              alt={slide.title}
              className="w-full h-full object-contain filter drop-shadow-md transition-all duration-300 transform scale-105"
            />
          </div>
          {/* Highlight pill */}
          <div className="absolute -bottom-3 bg-[#17212B] text-white text-[11px] font-bold px-3 py-1 rounded-full shadow-lg flex items-center gap-1.5">
            <Icon className="w-3.5 h-3.5 text-[#008F6B]" />
            <span>{slide.highlight}</span>
          </div>
        </div>

        {/* Text Details */}
        <h2 className="text-2xl font-extrabold tracking-tight text-[#17212B] px-4 leading-tight mb-2">
          {slide.title}
        </h2>
        <p className="text-sm text-[#667280] font-normal max-w-xs px-2 leading-relaxed">
          {slide.subtitle}
        </p>

        {/* Pagination Dots */}
        <div className="flex items-center justify-center gap-2 mt-8">
          {SLIDES.map((s, idx) => (
            <button
              key={s.id}
              onClick={() => setCurrentSlide(idx)}
              className={`h-2 rounded-full transition-all duration-300 ${
                idx === currentSlide ? 'w-6 bg-[#008F6B]' : 'w-2 bg-[#DDE4E0]'
              }`}
              aria-label={`Slide ${idx + 1}`}
            />
          ))}
        </div>
      </div>

      {/* Bottom CTA Button */}
      <div className="w-full pb-4">
        <button
          onClick={handleNext}
          className="w-full bg-[#008F6B] hover:bg-[#0F6B3A] text-white font-bold py-3.5 px-6 rounded-2xl shadow-md hover:shadow-lg transition-all duration-150 flex items-center justify-center gap-2 active:scale-[0.98]"
        >
          <span>{currentSlide === SLIDES.length - 1 ? 'Get Started' : 'Continue'}</span>
          <ArrowRight className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
}
