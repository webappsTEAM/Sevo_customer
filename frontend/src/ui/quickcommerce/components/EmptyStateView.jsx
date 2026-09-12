import React from 'react';
import { useNavigate } from 'react-router-dom';
import { ApprovedImage } from '../../../assets/ApprovedImage.jsx';
import { ArrowRight, RotateCcw, Search } from 'lucide-react';

export function EmptyStateView({
  title = 'No products found',
  subtitle = 'Try adjusting your search or filters to find what you need.',
  actionText = 'Clear Filters',
  onAction,
  assetId = 'empty-state-box',
}) {
  const navigate = useNavigate();

  const handleAction = () => {
    if (onAction) {
      onAction();
    } else {
      navigate('/qc');
    }
  };

  return (
    <div className="w-full flex flex-col items-center justify-center p-8 text-center my-auto">
      <div className="w-44 h-36 mb-6 rounded-2xl bg-[#F8F7F1] border border-[#DDE4E0] p-4 flex items-center justify-center shadow-sm">
        <ApprovedImage
          assetId={assetId}
          alt={title}
          className="w-full h-full object-contain filter drop-shadow-sm opacity-85"
        />
      </div>

      <h3 className="text-lg font-bold text-[#17212B] mb-2">{title}</h3>
      <p className="text-xs text-[#667280] max-w-xs leading-relaxed mb-6">{subtitle}</p>

      {actionText && (
        <button
          onClick={handleAction}
          className="py-2.5 px-6 border-2 border-[#008F6B] text-[#008F6B] hover:bg-[#E8F5EF] font-bold rounded-xl text-xs flex items-center gap-2 transition-all active:scale-95 shadow-sm"
        >
          <RotateCcw className="w-3.5 h-3.5" />
          <span>{actionText}</span>
        </button>
      )}
    </div>
  );
}
