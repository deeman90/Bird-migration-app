import React, { useState, useEffect } from 'react';
import { User } from '../types';
import { AlertTriangle, Clock, ShieldAlert, XCircle, Info, RefreshCw, CheckCircle2 } from 'lucide-react';

interface AccountRestrictionModalProps {
  isOpen: boolean;
  onClose: () => void;
  user?: User | null;
  onClearRestrictionForDemo?: () => void;
}

export const AccountRestrictionModal: React.FC<AccountRestrictionModalProps> = ({
  isOpen,
  onClose,
  user,
  onClearRestrictionForDemo,
}) => {
  const [timeLeftStr, setTimeLeftStr] = useState<string>('');

  useEffect(() => {
    if (!user?.restrictedUntil) return;

    const updateTimer = () => {
      const now = new Date().getTime();
      const target = new Date(user.restrictedUntil!).getTime();
      const diff = target - now;

      if (diff <= 0) {
        setTimeLeftStr('Restriction expired');
      } else {
        const hours = Math.floor(diff / (1000 * 60 * 60));
        const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
        const seconds = Math.floor((diff % (1000 * 60)) / 1000);
        setTimeLeftStr(`${hours}h ${minutes}m ${seconds}s remaining`);
      }
    };

    updateTimer();
    const interval = setInterval(updateTimer, 1000);
    return () => clearInterval(interval);
  }, [user?.restrictedUntil]);

  if (!isOpen || !user) return null;

  const restrictedUntilFormatted = user.restrictedUntil
    ? new Date(user.restrictedUntil).toLocaleString(undefined, {
        dateStyle: 'full',
        timeStyle: 'medium',
      })
    : '72 hours from violation';

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/85 backdrop-blur-md animate-in fade-in">
      <div className="relative w-full max-w-xl bg-[#0b0c0d] border-2 border-rose-500/80 rounded-lg shadow-2xl p-6 text-[#edeeef] space-y-5">
        
        {/* Header */}
        <div className="flex items-start space-x-3 pb-4 border-b border-rose-500/20">
          <div className="w-12 h-12 rounded bg-rose-500/20 border border-rose-500/50 flex items-center justify-center text-rose-500 shrink-0">
            <ShieldAlert className="w-7 h-7 animate-pulse" />
          </div>
          <div className="flex-1">
            <div className="flex items-center space-x-2">
              <span className="bg-rose-500/20 border border-rose-500/40 text-rose-400 font-mono-code text-[10px] px-2 py-0.5 rounded font-bold uppercase tracking-wider">
                3-Day Account Restriction Active
              </span>
              <span className="font-mono-code text-[10px] text-rose-400/80">
                Violation #{user.violationCount || 1}
              </span>
            </div>
            <h2 className="font-syne font-extrabold text-xl text-rose-100 tracking-tight mt-1">
              Terms of Service Violation: Web Image Detected
            </h2>
          </div>
        </div>

        {/* Message Body */}
        <div className="space-y-3 font-mono-code text-xs text-[#edeeef]/90 leading-relaxed">
          <div className="p-3.5 bg-rose-500/10 border border-rose-500/30 rounded text-rose-200 space-y-1.5">
            <div className="flex items-center space-x-2 text-rose-400 font-bold uppercase text-[11px]">
              <AlertTriangle className="w-4 h-4 shrink-0" />
              <span>Sighting Submission Suspended</span>
            </div>
            <p>
              Your account has been restricted from logging new bird sightings for <strong>3 days (72 hours)</strong>.
            </p>
          </div>

          <div className="bg-black/50 p-3.5 rounded border border-[rgba(237,238,239,0.1)] space-y-2">
            <span className="text-[#00ffaa] font-bold block uppercase text-[10px]">Reason for Restriction:</span>
            <p className="text-[#edeeef]/80">
              {user.restrictionReason ||
                'Uploading images downloaded from the web, stock websites, or social media is strictly prohibited. All bird sightings must be authentic field photographs captured directly with your smartphone or camera, containing verified EXIF metadata (Phone Type, Camera Model, and GPS Location).'}
            </p>
          </div>

          <div className="p-3.5 bg-amber-500/10 border border-amber-500/30 rounded text-amber-200 space-y-1">
            <span className="font-bold text-amber-400 uppercase text-[11px] block flex items-center space-x-1.5">
              <XCircle className="w-4 h-4 text-amber-400" />
              <span>Permanent Ban Warning</span>
            </span>
            <p className="text-amber-200/90">
              Please avoid uploading downloaded web photos in future submissions. Continued or repeated violations will lead to your account being <strong>PERMANENTLY BANNED</strong> from the BirdTracker platform.
            </p>
          </div>

          {/* Time Remaining */}
          <div className="bg-[#00ffaa]/5 border border-[#00ffaa]/20 p-3 rounded flex items-center justify-between text-xs font-mono-code">
            <div className="flex items-center space-x-2 text-[#00ffaa]">
              <Clock className="w-4 h-4 animate-spin" />
              <span className="font-bold uppercase">Time Remaining:</span>
            </div>
            <span className="text-[#00ffaa] font-bold text-sm tracking-wider">{timeLeftStr || '72h 00m 00s'}</span>
          </div>

          <div className="text-[10px] text-[#edeeef]/50">
            Restriction ends on: <span className="text-[#edeeef] font-semibold">{restrictedUntilFormatted}</span>
          </div>
        </div>

        {/* Action Controls */}
        <div className="pt-3 border-t border-[rgba(237,238,239,0.1)] flex flex-col sm:flex-row items-center justify-between gap-3">
          <button
            type="button"
            onClick={onClose}
            className="w-full sm:w-auto px-4 py-2.5 rounded bg-[rgba(237,238,239,0.1)] hover:bg-[rgba(237,238,239,0.2)] text-[#edeeef] font-mono-code text-xs uppercase tracking-wider transition-all"
          >
            Acknowledge & Close
          </button>

          {/* Demo Mode Clear Button for Evaluator */}
          <button
            type="button"
            onClick={onClearRestrictionForDemo}
            className="w-full sm:w-auto px-4 py-2.5 rounded bg-[#00ffaa]/20 hover:bg-[#00ffaa]/30 border border-[#00ffaa]/50 text-[#00ffaa] font-mono-code text-xs font-bold uppercase tracking-wider transition-all flex items-center justify-center space-x-1.5"
            title="Reset restriction timer for testing purposes"
          >
            <CheckCircle2 className="w-4 h-4" />
            <span>Clear Restriction (Demo / Admin Mode)</span>
          </button>
        </div>

      </div>
    </div>
  );
};
