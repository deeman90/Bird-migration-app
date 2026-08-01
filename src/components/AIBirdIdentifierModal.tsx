import React, { useState } from 'react';
import { BirdSpecies } from '../types';
import { uploadFileToSupabaseStorage } from '../services/storageService.js';
import { Camera, Sparkles, CheckCircle2, AlertCircle, RefreshCw, ArrowRight, ShieldCheck, Tag, Info, Search } from 'lucide-react';

interface AIBirdIdentifierModalProps {
  isOpen: boolean;
  onClose: () => void;
  speciesList: BirdSpecies[];
  onSelectForSighting: (identifiedData: {
    speciesName: string;
    scientificName: string;
    matchedSpeciesId?: string;
    photoUrl: string;
    flockCount?: number;
    behavior?: 'resting' | 'feeding' | 'flying' | 'nesting';
    notes?: string;
  }) => void;
}

const SAMPLE_SCAN_PHOTOS = [
  { name: 'Sandhill Crane', url: 'https://images.unsplash.com/photo-1518709268805-4e9042af9f23?auto=format&fit=crop&q=80&w=800' },
  { name: 'Osprey (Raptor)', url: 'https://images.unsplash.com/photo-1606567595334-d39972c85dbe?auto=format&fit=crop&q=80&w=800' },
  { name: 'White Stork', url: 'https://images.unsplash.com/photo-1596704017254-9b121068fb31?auto=format&fit=crop&q=80&w=800' },
  { name: 'Ruby-throated Hummingbird', url: 'https://images.unsplash.com/photo-1520808663317-647b476a81b9?auto=format&fit=crop&q=80&w=800' },
  { name: 'Arctic Tern', url: 'https://images.unsplash.com/photo-1551085254-e96b210df58a?auto=format&fit=crop&q=80&w=800' },
];

export const AIBirdIdentifierModal: React.FC<AIBirdIdentifierModalProps> = ({
  isOpen,
  onClose,
  speciesList,
  onSelectForSighting,
}) => {
  const [photoUrl, setPhotoUrl] = useState<string>(SAMPLE_SCAN_PHOTOS[0].url);
  const [customPhotoInput, setCustomPhotoInput] = useState<string>('');
  const [isScanning, setIsScanning] = useState<boolean>(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const [aiResult, setAiResult] = useState<{
    commonName: string;
    scientificName: string;
    confidenceScore: number;
    category: string;
    diagnosticFeatures: string[];
    matchedSpeciesId: string | null;
    suggestedFlockCount: number;
    suggestedBehavior: 'resting' | 'feeding' | 'flying' | 'nesting';
    conservationStatus: string;
    description: string;
    funFact: string;
  } | null>(null);

  if (!isOpen) return null;

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setAiResult(null);
      const result = await uploadFileToSupabaseStorage({
        file,
        featureName: 'ai-scans',
        itemId: 'scan',
      });

      if (result.signedUrl) {
        setPhotoUrl(result.signedUrl);
      } else {
        const reader = new FileReader();
        reader.onloadend = () => {
          const res = reader.result as string;
          setPhotoUrl(res);
        };
        reader.readAsDataURL(file);
      }
    }
  };

  const handleRunAiIdentification = async () => {
    setIsScanning(true);
    setErrorMsg(null);
    setAiResult(null);

    const imageToAnalyze = customPhotoInput.trim() || photoUrl;

    try {
      const appSpeciesList = speciesList.map((s) => ({
        id: s.id,
        commonName: s.commonName,
        scientificName: s.scientificName,
      }));

      const response = await fetch('/api/identify-bird', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          photoUrl: imageToAnalyze.startsWith('http') ? imageToAnalyze : undefined,
          base64Image: imageToAnalyze.startsWith('data:') ? imageToAnalyze : undefined,
          appSpeciesList,
        }),
      });

      const json = await response.json();

      if (!json.success) {
        throw new Error(json.error || 'Bird identification failed.');
      }

      setAiResult(json.data);
    } catch (err: any) {
      console.error('AI Identification error:', err);
      setErrorMsg(err.message || 'Failed to scan bird image. Please ensure photo is clear or try again.');
    } finally {
      setIsScanning(false);
    }
  };

  const handleApplyToSighting = () => {
    if (!aiResult) return;
    onSelectForSighting({
      speciesName: aiResult.commonName,
      scientificName: aiResult.scientificName,
      matchedSpeciesId: aiResult.matchedSpeciesId || undefined,
      photoUrl: customPhotoInput.trim() || photoUrl,
      flockCount: aiResult.suggestedFlockCount || 1,
      behavior: aiResult.suggestedBehavior || 'flying',
      notes: `AI Identification (${aiResult.confidenceScore}% confidence): ${aiResult.description}. Key markings: ${aiResult.diagnosticFeatures.join(', ')}. Fun Fact: ${aiResult.funFact}`,
    });
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-[#0b0c0d]/80 backdrop-blur-md animate-in fade-in">
      <div className="relative w-full max-w-2xl bg-[#0b0c0d] border border-[rgba(237,238,239,0.15)] rounded-lg shadow-2xl p-5 sm:p-6 max-h-[90vh] overflow-y-auto no-scrollbar">
        
        {/* Header */}
        <div className="flex items-center justify-between pb-4 border-b border-[rgba(237,238,239,0.1)]">
          <div className="flex items-center space-x-2.5">
            <div className="w-9 h-9 rounded bg-[#00ffaa]/10 border border-[#00ffaa]/30 flex items-center justify-center text-[#00ffaa]">
              <Sparkles className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center space-x-2">
                <span className="font-mono-code text-[10px] text-[#00ffaa] uppercase tracking-widest block">AI Vision API</span>
                <span className="bg-[#00ffaa]/10 text-[#00ffaa] text-[9px] font-mono-code px-1.5 py-0.5 rounded uppercase font-bold">Multimodal Gemini</span>
              </div>
              <h2 className="font-syne font-bold text-lg text-[#edeeef] tracking-tight">
                AI Avian Species Identifier & API Matcher
              </h2>
            </div>
          </div>

          <button
            onClick={onClose}
            className="text-[#edeeef]/50 hover:text-[#edeeef] min-h-[36px] px-2 font-mono-code text-sm"
          >
            ✕
          </button>
        </div>

        {/* Content Body */}
        <div className="mt-5 space-y-5">
          
          {/* Photo Source Selector */}
          <div>
            <label className="font-mono-code text-xs text-[#edeeef]/60 uppercase tracking-widest block mb-2">
              1. Choose or Upload Bird Photo to Identify
            </label>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              {/* Preview Box */}
              <div className="relative h-44 sm:h-auto rounded border border-[rgba(237,238,239,0.15)] bg-black/40 overflow-hidden flex items-center justify-center group">
                <img
                  src={customPhotoInput.trim() || photoUrl}
                  alt="Bird Sighting"
                  className="w-full h-full object-cover"
                />
                
                {isScanning && (
                  <div className="absolute inset-0 bg-black/75 flex flex-col items-center justify-center text-[#00ffaa] space-y-2 p-3 text-center">
                    <RefreshCw className="w-8 h-8 animate-spin" />
                    <span className="font-mono-code text-xs uppercase font-bold tracking-wider animate-pulse">
                      Analyzing Avian Markings...
                    </span>
                    <span className="font-mono-code text-[10px] text-[#edeeef]/70">
                      Querying Gemini Multimodal Vision & Matching API database...
                    </span>
                  </div>
                )}
              </div>

              {/* Sample Presets & Upload */}
              <div className="sm:col-span-2 space-y-3 flex flex-col justify-between">
                <div>
                  <span className="font-mono-code text-[10px] text-[#edeeef]/50 uppercase tracking-widest block mb-1.5">
                    Field Photo Presets:
                  </span>
                  <div className="grid grid-cols-5 gap-1.5">
                    {SAMPLE_SCAN_PHOTOS.map((sample, idx) => (
                      <button
                        key={idx}
                        type="button"
                        onClick={() => {
                          setCustomPhotoInput('');
                          setPhotoUrl(sample.url);
                          setAiResult(null);
                        }}
                        className={`relative aspect-square rounded overflow-hidden border transition-all ${
                          photoUrl === sample.url && !customPhotoInput
                            ? 'border-[#00ffaa] ring-2 ring-[#00ffaa]/50'
                            : 'border-[rgba(237,238,239,0.1)] opacity-70 hover:opacity-100'
                        }`}
                      >
                        <img src={sample.url} alt={sample.name} className="w-full h-full object-cover" />
                      </button>
                    ))}
                  </div>
                </div>

                {/* Upload or URL */}
                <div className="space-y-2">
                  <div className="flex items-center space-x-2">
                    <label className="flex-1 cursor-pointer bg-[rgba(237,238,239,0.06)] hover:bg-[rgba(237,238,239,0.1)] border border-[rgba(237,238,239,0.15)] rounded px-3 py-2 text-xs font-mono-code text-[#edeeef] flex items-center justify-center space-x-2 transition-all">
                      <Camera className="w-4 h-4 text-[#00ffaa]" />
                      <span>Upload Photo File</span>
                      <input type="file" accept="image/*" onChange={handleFileUpload} className="hidden" />
                    </label>
                  </div>

                  <input
                    type="url"
                    placeholder="Or paste image URL (https://...)"
                    value={customPhotoInput}
                    onChange={(e) => {
                      setCustomPhotoInput(e.target.value);
                      setAiResult(null);
                    }}
                    className="w-full bg-[#0b0c0d] border border-[rgba(237,238,239,0.15)] rounded px-3 py-2 text-xs font-mono-code text-[#edeeef] placeholder-[#edeeef]/40 focus:outline-none focus:border-[#00ffaa]"
                  />
                </div>
              </div>
            </div>
          </div>

          {/* Scan Action Button */}
          <button
            type="button"
            onClick={handleRunAiIdentification}
            disabled={isScanning}
            className="w-full min-h-[48px] px-4 py-3 rounded bg-[#00ffaa] hover:bg-[#00cc88] text-[#0b0c0d] font-syne font-extrabold text-sm uppercase tracking-wider shadow-lg shadow-[#00ffaa]/20 transition-all flex items-center justify-center space-x-2 cursor-pointer disabled:opacity-50"
          >
            {isScanning ? (
              <>
                <RefreshCw className="w-5 h-5 animate-spin" />
                <span>Scanning Bird Image with AI Vision...</span>
              </>
            ) : (
              <>
                <Sparkles className="w-5 h-5" />
                <span>Analyze Image & Match Bird API Database</span>
              </>
            )}
          </button>

          {/* Error Alert */}
          {errorMsg && (
            <div className="p-3 bg-rose-500/10 border border-rose-500/30 rounded text-rose-300 font-mono-code text-xs uppercase tracking-wider flex items-center space-x-2">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{errorMsg}</span>
            </div>
          )}

          {/* AI Result Card */}
          {aiResult && (
            <div className="bg-[rgba(237,238,239,0.03)] border border-[#00ffaa]/30 rounded-lg p-4 sm:p-5 space-y-4 animate-in fade-in">
              
              {/* Top Result Banner */}
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-3 border-b border-[rgba(237,238,239,0.1)]">
                <div>
                  <div className="flex items-center space-x-2">
                    <span className="font-syne font-extrabold text-xl text-[#00ffaa]">
                      {aiResult.commonName}
                    </span>
                    <span className="bg-[#00ffaa]/20 text-[#00ffaa] border border-[#00ffaa]/40 text-[10px] font-mono-code px-2 py-0.5 rounded uppercase font-bold flex items-center space-x-1">
                      <ShieldCheck className="w-3 h-3" />
                      <span>{aiResult.confidenceScore}% Confidence</span>
                    </span>
                  </div>
                  <p className="font-mono-code text-xs text-[#edeeef]/60 italic mt-0.5">
                    {aiResult.scientificName} • {aiResult.category}
                  </p>
                </div>

                {/* Species Match Status */}
                {aiResult.matchedSpeciesId ? (
                  <div className="bg-emerald-400/10 border border-emerald-400/30 px-3 py-1 rounded text-emerald-300 font-mono-code text-xs flex items-center space-x-1.5 shrink-0 self-start sm:self-auto">
                    <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                    <span>Matched with Database</span>
                  </div>
                ) : (
                  <div className="bg-amber-400/10 border border-amber-400/30 px-3 py-1 rounded text-amber-300 font-mono-code text-xs flex items-center space-x-1.5 shrink-0 self-start sm:self-auto">
                    <Info className="w-4 h-4 text-amber-400" />
                    <span>Unlisted Avian Species</span>
                  </div>
                )}
              </div>

              {/* Diagnostic Markings */}
              <div>
                <span className="font-mono-code text-[10px] text-[#edeeef]/50 uppercase tracking-widest block mb-1.5">
                  AI Diagnostic Visual Markings Detected:
                </span>
                <div className="flex flex-wrap gap-1.5">
                  {aiResult.diagnosticFeatures.map((feat, idx) => (
                    <span key={idx} className="bg-[rgba(237,238,239,0.06)] border border-[rgba(237,238,239,0.15)] text-[#edeeef] font-mono-code text-xs px-2.5 py-1 rounded flex items-center space-x-1">
                      <Tag className="w-3 h-3 text-[#00ffaa]" />
                      <span>{feat}</span>
                    </span>
                  ))}
                </div>
              </div>

              {/* Behavior & Conservation Info */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 bg-[#0b0c0d] p-3 rounded border border-[rgba(237,238,239,0.1)] font-mono-code text-xs">
                <div>
                  <span className="text-[#edeeef]/40 block text-[10px] uppercase">Conservation:</span>
                  <span className="text-amber-300 font-bold">{aiResult.conservationStatus || 'Least Concern'}</span>
                </div>
                <div>
                  <span className="text-[#edeeef]/40 block text-[10px] uppercase">Suggested Behavior:</span>
                  <span className="text-[#00ffaa] font-bold capitalize">{aiResult.suggestedBehavior}</span>
                </div>
                <div>
                  <span className="text-[#edeeef]/40 block text-[10px] uppercase">Estimated Flock:</span>
                  <span className="text-[#edeeef] font-bold">{aiResult.suggestedFlockCount} birds</span>
                </div>
              </div>

              {/* Fun Fact */}
              {aiResult.funFact && (
                <div className="bg-[#00ffaa]/5 border border-[#00ffaa]/20 p-3 rounded text-xs text-[#edeeef]/90 space-y-1">
                  <span className="font-mono-code text-[10px] text-[#00ffaa] uppercase tracking-wider font-bold block">
                    💡 Avian Field Fact
                  </span>
                  <p className="italic">{aiResult.funFact}</p>
                </div>
              )}

              {/* Log Sighting CTA */}
              <button
                type="button"
                onClick={handleApplyToSighting}
                className="w-full min-h-[44px] px-4 py-2.5 rounded bg-[#00ffaa] hover:bg-[#00cc88] text-[#0b0c0d] font-syne font-extrabold text-xs uppercase tracking-wider shadow-md transition-all flex items-center justify-center space-x-2 cursor-pointer"
              >
                <span>Log Sighting with {aiResult.commonName}</span>
                <ArrowRight className="w-4 h-4" />
              </button>
            </div>
          )}

        </div>

      </div>
    </div>
  );
};
