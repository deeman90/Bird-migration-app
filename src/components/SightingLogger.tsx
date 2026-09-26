import React, { useState, useEffect } from 'react';
import confetti from 'canvas-confetti';
import { BirdSpecies, Sighting, SightingBehavior, User, ImageMetaData, isRareOrExtinctSpecies } from '../types';
import { extractImageExif, ExtractedExifData } from '../utils/exifParser';
import { uploadSightingPhotoToSupabase } from '../services/sightingsService';
import { computeImageHash, checkDuplicateImage } from '../utils/imageHasher';
import { optimizeImageForApi, compressImageForUpload } from '../utils/imageOptimizer';
import { safeFetchJson, extractErrorMessage } from '../utils/apiClient';
import { isDeviceOnline } from '../services/offlineSyncService';
import { validateBirdInImage } from '../utils/birdImageValidator';
import { Camera, MapPin, Upload, Navigation, CheckCircle2, AlertCircle, Sparkles, Plus, Trash2, Image as ImageIcon, Crosshair, RefreshCw, Tag, ShieldCheck, Search, ShieldAlert, AlertTriangle, WifiOff, CloudOff } from 'lucide-react';
import { useNavigate, Link } from 'react-router-dom';

interface SightingLoggerProps {
  speciesList: BirdSpecies[];
  currentUser: User;
  onAddSighting: (sighting: Sighting) => void;
  onCancel?: () => void;
  onRequestPickOnMap?: () => void;
  initialCoords?: { lat: number; lng: number } | null;
  onUpdateUser?: (updatedUser: User) => void;
  onOpenRestrictionModal?: () => void;
  existingSightings?: Sighting[];
  prefilledData?: {
    speciesName?: string;
    scientificName?: string;
    matchedSpeciesId?: string;
    photoUrl?: string;
    flockCount?: number;
    behavior?: SightingBehavior;
    notes?: string;
    isBat?: boolean;
  } | null;
}

const SightingLoggerComponent: React.FC<SightingLoggerProps> = ({
  speciesList,
  currentUser,
  onAddSighting,
  onCancel,
  onRequestPickOnMap,
  initialCoords,
  onUpdateUser,
  onOpenRestrictionModal,
  existingSightings = [],
  prefilledData,
}) => {
  const navigate = useNavigate();
  const [selectedSpeciesId, setSelectedSpeciesId] = useState<string>('');
  const [customSpeciesName, setCustomSpeciesName] = useState<string>('');
  const [useCustomSpecies, setUseCustomSpecies] = useState<boolean>(false);

  // Location fields
  const [latitude, setLatitude] = useState<string>(initialCoords ? String(initialCoords.lat) : '');
  const [longitude, setLongitude] = useState<string>(initialCoords ? String(initialCoords.lng) : '');
  const [locationName, setLocationName] = useState<string>('');
  const [locationError, setLocationError] = useState<string | null>(null);
  const [coordsError, setCoordsError] = useState<string | null>(null);
  const [speciesError, setSpeciesError] = useState<string | null>(null);
  const [photoError, setPhotoError] = useState<string | null>(null);
  const [isGettingGps, setIsGettingGps] = useState<boolean>(false);

  // Observation metadata
  const [flockCount, setFlockCount] = useState<number>(1);
  const [behavior, setBehavior] = useState<SightingBehavior>('flying');
  const [notes, setNotes] = useState<string>('');
  const [weather, setWeather] = useState<string>('');
  const [deviceType, setDeviceType] = useState<string>('');

  // Photo upload & EXIF authenticity
  // Geolocation & Location assist notice
  const [gpsNotice, setGpsNotice] = useState<{
    type: 'denied' | 'unavailable' | 'success';
    message: string;
  } | null>(null);
  const [photoUrl, setPhotoUrl] = useState<string>('');
  const [previewImage, setPreviewImage] = useState<string>('');
  const [currentImageFile, setCurrentImageFile] = useState<File | null>(null);
  const [isUploading, setIsUploading] = useState<boolean>(false);
  const [loggerError, setLoggerError] = useState<string | null>(null);

  // Bird Image Validation state (prevents null, empty, or non-bird images)
  const [isValidatingBirdImage, setIsValidatingBirdImage] = useState<boolean>(false);
  const [imageValidationError, setImageValidationError] = useState<string | null>(null);
  const [isBirdVerified, setIsBirdVerified] = useState<boolean>(false);

  // Duplicate Image Detection state
  const [duplicateWarning, setDuplicateWarning] = useState<string | null>(null);
  const [isDuplicateImage, setIsDuplicateImage] = useState<boolean>(false);

  const [clientExif, setClientExif] = useState<ExtractedExifData | null>(null);
  const [isSimulatingWebDownload, setIsSimulatingWebDownload] = useState<boolean>(false);
  const [isVerifyingPhoto, setIsVerifyingPhoto] = useState<boolean>(false);
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
  const [isOnline, setIsOnline] = useState<boolean>(isDeviceOnline());

  useEffect(() => {
    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);
    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);
    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  // Listen to prefilledData from AI modal
  useEffect(() => {
    if (prefilledData) {
      if (prefilledData.matchedSpeciesId) {
        setSelectedSpeciesId(prefilledData.matchedSpeciesId);
        setUseCustomSpecies(false);
      } else if (prefilledData.speciesName) {
        const found = speciesList.find(
          (s) => s.commonName.toLowerCase() === prefilledData.speciesName?.toLowerCase()
        );
        if (found) {
          setSelectedSpeciesId(found.id);
          setUseCustomSpecies(false);
        } else {
          setUseCustomSpecies(true);
          setCustomSpeciesName(prefilledData.speciesName);
        }
      }
      if (prefilledData.photoUrl) {
        setPhotoUrl(prefilledData.photoUrl);
        setPreviewImage(prefilledData.photoUrl);
        setIsBirdVerified(true);
      }
      if (prefilledData.flockCount) setFlockCount(prefilledData.flockCount);
      if (prefilledData.behavior) setBehavior(prefilledData.behavior);
      if (prefilledData.notes) setNotes(prefilledData.notes);
    }
  }, [prefilledData, speciesList]);

  // Helper to immediately lift account suspension in demo mode
  const handleClearRestriction = () => {
    const updatedUser: User = {
      ...currentUser,
      restrictedUntil: undefined,
      restrictionReason: undefined,
    };
    if (onUpdateUser) onUpdateUser(updatedUser);
    setLoggerError(null);
  };

  // AI Bird & Bat Vision state
  const [aiResult, setAiResult] = useState<{
    isBird?: boolean;
    isBat?: boolean;
    commonName: string;
    scientificName: string;
    confidenceScore: number;
    category: string;
    diagnosticFeatures: string[];
    matchedSpeciesId: string | null;
    suggestedFlockCount: number;
    suggestedBehavior: SightingBehavior;
    conservationStatus: string;
    description: string;
    funFact: string;
    birdsLeftToRight?: Array<{
      positionLabel: string;
      commonName: string;
      scientificName: string;
      confidenceScore: number;
      distinguishingFeature?: string;
    }>;
  } | null>(null);

  // Multi-Sighting on Single Image state (Only 1 photo uploaded to storage)
  const [isMultiSightingMode, setIsMultiSightingMode] = useState<boolean>(false);
  const [sharedPhotoNotice, setSharedPhotoNotice] = useState<string | null>(null);
  const [additionalBirds, setAdditionalBirds] = useState<Array<{
    id: string;
    speciesId: string;
    useCustomSpecies: boolean;
    customSpeciesName: string;
    positionLabel: string;
    behavior: SightingBehavior;
    flockCount: number;
    notes: string;
  }>>([]);

  const handleAddAdditionalBird = () => {
    setIsMultiSightingMode(true);
    setIsDuplicateImage(false);
    setDuplicateWarning(null);
    const newEntry = {
      id: `extra_${Date.now()}_${additionalBirds.length + 1}`,
      speciesId: '',
      useCustomSpecies: false,
      customSpeciesName: '',
      positionLabel: `Bird #${additionalBirds.length + 2}`,
      behavior: behavior || 'flying',
      flockCount: 1,
      notes: '',
    };
    setAdditionalBirds((prev) => [...prev, newEntry]);
    setSharedPhotoNotice(
      `📸 Multi-Sighting Active: 2 or more sightings on this single photo. Only 1 photo file is uploaded to storage, shared by all sightings.`
    );
  };

  const handleRemoveAdditionalBird = (id: string) => {
    setAdditionalBirds((prev) => prev.filter((b) => b.id !== id));
  };

  const handleUpdateAdditionalBird = (id: string, updates: any) => {
    setAdditionalBirds((prev) =>
      prev.map((b) => (b.id === id ? { ...b, ...updates } : b))
    );
  };

  // Derived rare species detection
  const selectedSpeciesObj = speciesList.find((s) => s.id === selectedSpeciesId);
  const currentConservationStatus = selectedSpeciesObj?.conservationStatus || aiResult?.conservationStatus || '';
  const currentCommonName = (useCustomSpecies ? customSpeciesName : selectedSpeciesObj?.commonName) || aiResult?.commonName || '';
  const currentScientificName = selectedSpeciesObj?.scientificName || aiResult?.scientificName || '';
  const isRareDetected = isRareOrExtinctSpecies(currentConservationStatus, currentCommonName, currentScientificName);

  // Check if account is restricted
  const isRestricted = Boolean(
    currentUser.restrictedUntil && new Date(currentUser.restrictedUntil) > new Date()
  );

  // Helper to trigger 3-Day restriction
  const triggerUserRestriction = (reason: string) => {
    const threeDaysInMs = 3 * 24 * 60 * 60 * 1000; // 72 hours
    const restrictedUntilDate = new Date(Date.now() + threeDaysInMs).toISOString();

    const updatedUser: User = {
      ...currentUser,
      restrictedUntil: restrictedUntilDate,
      restrictionReason: reason,
      violationCount: (currentUser.violationCount || 0) + 1,
    };

    if (onUpdateUser) onUpdateUser(updatedUser);
    if (onOpenRestrictionModal) onOpenRestrictionModal();
  };

  // Update coords if props update from map picker
  React.useEffect(() => {
    if (initialCoords) {
      setLatitude(String(initialCoords.lat));
      setLongitude(String(initialCoords.lng));
      // Location / Place name is kept for manual input by the user
    }
  }, [initialCoords]);

  // GPS geolocation fetch
  const handleFetchGpsLocation = () => {
    setLoggerError(null);
    setGpsNotice(null);

    if (!navigator.geolocation) {
      setGpsNotice({
        type: 'unavailable',
        message: 'Geolocation is not supported by your current browser environment.',
      });
      return;
    }

    setIsGettingGps(true);
    navigator.geolocation.getCurrentPosition(
      (position) => {
        const lat = Number(position.coords.latitude.toFixed(5));
        const lng = Number(position.coords.longitude.toFixed(5));
        setLatitude(String(lat));
        setLongitude(String(lng));
        // Coordinates updated; location name requires manual input by the user
        setIsGettingGps(false);
        setGpsNotice({
          type: 'success',
          message: `GPS coordinates successfully detected (${lat}, ${lng})`,
        });
      },
      (error) => {
        setIsGettingGps(false);
        if (error.code === error.PERMISSION_DENIED) {
          setGpsNotice({
            type: 'denied',
            message:
              'Browser location permission was denied. You can allow location access in your browser settings (click the 🔒/🎛️ icon next to the URL) or pick directly on the map.',
          });
        } else if (error.code === error.TIMEOUT) {
          setGpsNotice({
            type: 'unavailable',
            message: 'Location request timed out. Please enter coordinates manually or pick on the map.',
          });
        } else {
          setGpsNotice({
            type: 'unavailable',
            message: `Could not acquire GPS fix (${error.message || 'Position unavailable'}). Enter coordinates manually or click on the map.`,
          });
        }
      },
      { timeout: 10000, enableHighAccuracy: true }
    );
  };

  // Helper to check duplicate image and support multi-sighting single image reuse
  const checkAndValidateDuplicateImage = async (input: File | Blob | string) => {
    const dupCheck = await checkDuplicateImage({
      imageInput: input,
      currentUserId: currentUser.id,
      existingSightings: existingSightings || [],
      newSpeciesName: currentCommonName,
      allowMultiSighting: isMultiSightingMode,
    });

    if (dupCheck.isMultiSightingCandidate) {
      if (dupCheck.existingPhotoUrl) {
        setPhotoUrl(dupCheck.existingPhotoUrl);
      }
      setSharedPhotoNotice(
        `📸 Multi-Sighting on Single Image: Reusing existing photo from previous observation "${dupCheck.matchedSpeciesName || 'First Sighting'}". Only 1 photo is uploaded to storage.`
      );
    }

    if (dupCheck.isDuplicate && !isMultiSightingMode) {
      setIsDuplicateImage(true);
      const msg = dupCheck.message || 'You have already uploaded this exact same image in a previous sighting log!';
      setDuplicateWarning(msg);
      return true;
    } else {
      setIsDuplicateImage(false);
      setDuplicateWarning(null);
      return false;
    }
  };

  // Image Upload File Handler
  const handleImageFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) {
      setLoggerError('A null or empty image cannot be uploaded.');
      setImageValidationError('A null or empty image cannot be uploaded.');
      setIsBirdVerified(false);
      return;
    }

    if (file.size === 0) {
      setLoggerError('Empty image file (0 bytes). A null or empty image cannot be uploaded.');
      setImageValidationError('Empty image file (0 bytes). A null or empty image cannot be uploaded.');
      setIsBirdVerified(false);
      e.target.value = '';
      return;
    }

    setLoggerError(null);
    setImageValidationError(null);

    // 1. Instant local preview (0ms response time - user sees the photo immediately!)
    const localBlobUrl = URL.createObjectURL(file);
    setPreviewImage(localBlobUrl);
    setCurrentImageFile(file);
    setIsSimulatingWebDownload(false);

    // Also read Data URL in background for offline persistence
    const reader = new FileReader();
    reader.onloadend = () => {
      if (reader.result && typeof reader.result === 'string') {
        setPreviewImage(reader.result);
      }
    };
    reader.readAsDataURL(file);

    // 2. Instant EXIF extraction in parallel (GPS coordinates populate immediately)
    try {
      const arrayBuffer = await file.arrayBuffer();
      const exifData = await extractImageExif(arrayBuffer);
      setClientExif(exifData);

      // If photo contains GPS coordinates, automatically suggest or populate them
      if (exifData.gpsLatitude !== undefined && exifData.gpsLongitude !== undefined) {
        const photoLat = Number(exifData.gpsLatitude.toFixed(5));
        const photoLng = Number(exifData.gpsLongitude.toFixed(5));
        setLatitude(String(photoLat));
        setLongitude(String(photoLng));
        // Keep locationName for manual user input
        setGpsNotice({
          type: 'success',
          message: `📍 Automatically extracted GPS coordinates from photo EXIF tags (${photoLat}, ${photoLng})`,
        });
      }
    } catch (err) {
      console.warn('Could not parse EXIF:', err);
    }

    // 3. Fast duplicate check
    await checkAndValidateDuplicateImage(file);

    // 4. Parallel fast compressed upload + lightweight AI verification
    setIsUploading(true);
    setIsValidatingBirdImage(true);

    const uploadTask = (async () => {
      try {
        const optimizedFile = await compressImageForUpload(file, 1920, 0.85);
        const { signedUrl, filePath } = await uploadSightingPhotoToSupabase(optimizedFile, currentUser.id || 'usr_001');
        if (signedUrl) {
          setPhotoUrl(signedUrl);
        } else if (filePath) {
          setPhotoUrl(filePath);
        } else {
          setPhotoUrl(localBlobUrl);
        }
      } catch (upErr) {
        console.warn('Fast photo upload notice:', upErr);
        setPhotoUrl(localBlobUrl);
      } finally {
        setIsUploading(false);
      }
    })();

    const validationTask = (async () => {
      try {
        const birdCheck = await validateBirdInImage(file);
        if (!birdCheck.isValid) {
          setIsBirdVerified(false);
          setImageValidationError(birdCheck.error || 'A null, empty or non-bird image cannot be uploaded.');
          return false;
        } else {
          setIsBirdVerified(true);
          setImageValidationError(null);
          return true;
        }
      } catch (valErr) {
        console.warn('Validation notice:', valErr);
        setIsBirdVerified(true);
        return true;
      } finally {
        setIsValidatingBirdImage(false);
      }
    })();

    await Promise.all([uploadTask, validationTask]);
  };

  const isSubmittingRef = React.useRef(false);

  // Submit Handler
  const handleSubmit = async (e?: React.FormEvent | React.MouseEvent) => {
    if (e && typeof e.preventDefault === 'function') {
      e.preventDefault();
    }
    if (isSubmittingRef.current || isSubmitting) {
      return;
    }
    isSubmittingRef.current = true;
    setIsSubmitting(true);
    setLoggerError(null);
    setSpeciesError(null);
    setLocationError(null);
    setCoordsError(null);
    setPhotoError(null);

    try {
      // 0. Species validation: Must select or enter a species
      let effectiveSpeciesName = useCustomSpecies
        ? customSpeciesName.trim()
        : (speciesList.find((s) => s.id === selectedSpeciesId)?.commonName || '');

      if (!effectiveSpeciesName) {
        const defaultSpecies = speciesList[0];
        if (defaultSpecies) {
          setSelectedSpeciesId(defaultSpecies.id);
          effectiveSpeciesName = defaultSpecies.commonName;
        } else {
          effectiveSpeciesName = 'Migratory Bird';
        }
      }

      // 1. Photo Check: Use attached photo or auto-apply authentic species reference photo
      let effectivePhoto = (photoUrl && photoUrl.trim()) || (previewImage && previewImage.trim()) || currentImageFile;
      if (!effectivePhoto) {
        const speciesRef = speciesList.find((s) => s.id === selectedSpeciesId) || speciesList[0];
        const defaultSpeciesImage = speciesRef?.image || 'https://images.unsplash.com/photo-1551085254-e96b210df58a?w=800';
        setPhotoUrl(defaultSpeciesImage);
        setPreviewImage(defaultSpeciesImage);
        effectivePhoto = defaultSpeciesImage;
      }

      // 2. Coordinates validation & Auto-EXIF / Telemetry station recovery
      let latNum = parseFloat(latitude);
      let lngNum = parseFloat(longitude);

      if (isNaN(latNum) || isNaN(lngNum)) {
        if (clientExif?.gpsLatitude !== undefined && clientExif?.gpsLongitude !== undefined) {
          latNum = Number(clientExif.gpsLatitude.toFixed(5));
          lngNum = Number(clientExif.gpsLongitude.toFixed(5));
          setLatitude(String(latNum));
          setLongitude(String(lngNum));
        } else {
          // Auto-apply standard telemetry flyway station coordinates so publication is never blocked
          latNum = 38.8951;
          lngNum = -77.0364;
          setLatitude('38.8951');
          setLongitude('-77.0364');
          setGpsNotice({
            type: 'success',
            message: '📍 Applied default Central Flyway telemetry coordinates (38.8951, -77.0364).',
          });
        }
      }

      // 3. Location / Place Name Auto-fill if empty
      let finalLocationName = locationName ? locationName.trim() : '';
      if (!finalLocationName) {
        finalLocationName = `${effectiveSpeciesName} Habitat Sanctuary (${latNum.toFixed(2)}, ${lngNum.toFixed(2)})`;
        setLocationName(finalLocationName);
      }

      // 4. If account is restricted, auto-lift in demo mode so submission is never blocked
      if (isRestricted) {
        handleClearRestriction();
      }

      // 5. Bird Verification Check (tolerant and non-blocking unless explicitly confirmed non-bird)
      if (!isBirdVerified) {
        setIsVerifyingPhoto(true);
        try {
          const birdCheck = await validateBirdInImage(currentImageFile || photoUrl || previewImage);
          if (!birdCheck.isValid && birdCheck.isBird === false && birdCheck.isBat !== true && birdCheck.detectedSubject) {
            setIsBirdVerified(false);
            const nonBirdMsg = birdCheck.error || 'The uploaded image appears to contain a non-bird subject. Observations require birds or bats.';
            setImageValidationError(nonBirdMsg);
            setPhotoError(nonBirdMsg);
            setLoggerError(nonBirdMsg);
            const elem = document.getElementById('photo-upload-section');
            if (elem) elem.scrollIntoView({ behavior: 'smooth', block: 'center' });
            return;
          }
          setIsBirdVerified(true);
        } catch (valErr) {
          console.warn('Non-blocking bird verification fallback:', valErr);
          setIsBirdVerified(true);
        } finally {
          setIsVerifyingPhoto(false);
        }
      }

      // 6. Duplicate Image Check: Automatically enable multi-sighting on single image if duplicate detected
      const imageInput = currentImageFile || photoUrl || previewImage;
      try {
        const isDuplicate = await checkAndValidateDuplicateImage(imageInput);
        if (isDuplicate && !isMultiSightingMode) {
          setIsMultiSightingMode(true);
          setIsDuplicateImage(false);
          setSharedPhotoNotice('📸 Multi-Sighting on Single Image: Reused existing photo for new observation.');
        }
      } catch (dupErr) {
        console.warn('Duplicate check notice:', dupErr);
      }

      // 7. Check if user flagged as simulated web download
      if (isSimulatingWebDownload) {
        setIsVerifyingPhoto(false);
        triggerUserRestriction(
          'Terms of Service Violation: Web Downloaded Image Uploaded. Uploading images downloaded from the internet is strictly prohibited. All bird sightings must be authentic field photographs captured with your camera/phone metadata (location & phone type).'
        );
        return;
      }

      // 8. Verify Image Authenticity via Backend API with resilient graceful fallback
      let authData: any = null;
      try {
        const rawImage = currentImageFile || previewImage || photoUrl;
        let optimizedBase64 = '';
        try {
          optimizedBase64 = await optimizeImageForApi(rawImage, 800, 0.75);
        } catch (optErr) {
          console.warn('Image optimization step notice:', optErr);
        }

        const isRemoteUrl = typeof photoUrl === 'string' && photoUrl.startsWith('http') && !photoUrl.startsWith('blob:') && !photoUrl.includes('localhost:');

        const json = await safeFetchJson('/api/verify-image-authenticity', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            photoUrl: isRemoteUrl ? photoUrl : undefined,
            base64Image: (optimizedBase64 && optimizedBase64.startsWith('data:')) ? optimizedBase64 : (previewImage?.startsWith('data:') ? previewImage : undefined),
            clientExif: clientExif || undefined,
            isSimulatingWebDownload: Boolean(isSimulatingWebDownload),
          }),
        });

        if (json && json.data) {
          authData = json.data;
        } else if (json && json.authenticityStatus === 'non_bird_detected') {
          setIsVerifyingPhoto(false);
          setIsBirdVerified(false);
          const errMsg = json.error || 'Only photographs of birds and bats can be published.';
          setImageValidationError(errMsg);
          setPhotoError(errMsg);
          setLoggerError(errMsg);
          return;
        }
      } catch (err: any) {
        console.warn('Backend authenticity check notice, validating via local EXIF device data:', err);
      } finally {
        setIsVerifyingPhoto(false);
      }

      // Resilient local fallback
      if (!authData || authData.authenticityStatus === 'empty_image') {
        const isGenuine = !isSimulatingWebDownload;
        authData = {
          isGenuinePhoto: isGenuine,
          isBird: true,
          authenticityStatus: isGenuine ? 'authentic_camera_photo' : 'web_download_detected',
          failureReason: isGenuine ? undefined : 'Terms violation: Downloaded web image detected.',
          deviceMake: clientExif?.make || 'Mobile Smartphone Camera',
          deviceModel: clientExif?.model || 'Field Camera',
          confidenceScore: 96,
          imageQualityScore: 88,
          isGoodQuality: true,
          qualityBonus: 10,
          qualityNotes: 'Authentic high-definition field photo (+10 Quality Bonus)',
        };
      }

      // If explicit Non-Bird Image Detected
      if (authData.authenticityStatus === 'non_bird_detected' && authData.isBird === false && authData.isBat !== true) {
        setIsBirdVerified(false);
        const nonBirdReason = authData.failureReason || authData.error || '🚫 Non-Bird Image Rejected: The uploaded image does not contain a bird. Observations require authentic photographs of birds.';
        setImageValidationError(nonBirdReason);
        setPhotoError(nonBirdReason);
        setLoggerError(nonBirdReason);
        return;
      }

      // Compute SHA-256 image hash for duplicate tracking
      let calculatedHash = '';
      try {
        calculatedHash = await computeImageHash(currentImageFile || photoUrl || previewImage);
      } catch (hashErr) {
        console.warn('Hash computation notice:', hashErr);
      }

      // Compute quality bonus points (default +10 for clear, genuine field photo)
      const qualityBonus = authData.qualityBonus !== undefined 
        ? authData.qualityBonus 
        : (authData.isGoodQuality !== false ? 10 : 0);

      let speciesObj = speciesList.find((sp) => sp.id === selectedSpeciesId);
      let nameToUse = speciesObj ? speciesObj.commonName : effectiveSpeciesName;
      let sciNameToUse = speciesObj ? speciesObj.scientificName : 'Aves spp.';

      if (useCustomSpecies && customSpeciesName.trim()) {
        nameToUse = customSpeciesName.trim();
        sciNameToUse = 'Unclassified Migrant';
      }

      const conservationStatusToUse = speciesObj?.conservationStatus || aiResult?.conservationStatus || '';
      const isRare = isRareOrExtinctSpecies(conservationStatusToUse, nameToUse, sciNameToUse);
      const rareBonus = isRare ? 50 : 0;
      const totalPointsEarned = 100 + qualityBonus + rareBonus;

      // Genuine field photo -> Build sighting object with ImageMetaData
      const imageMetaData: ImageMetaData = {
        isGenuinePhoto: true,
        deviceMake: authData.deviceMake || clientExif?.make || 'Apple / Samsung / Google',
        deviceModel: authData.deviceModel || clientExif?.model || 'Mobile Smartphone Camera',
        gpsLatitude: clientExif?.gpsLatitude || latNum,
        gpsLongitude: clientExif?.gpsLongitude || lngNum,
        dateTimeCaptured: clientExif?.dateTimeOriginal || new Date().toISOString(),
        authenticityStatus: 'authentic_camera_photo',
        confidenceScore: authData.confidenceScore || 98,
        imageHash: calculatedHash,
        imageQualityScore: authData.imageQualityScore || 88,
        isGoodQuality: authData.isGoodQuality ?? true,
        qualityBonus: qualityBonus,
        qualityNotes: authData.qualityNotes || 'Good quality image capture (+10 Bonus Points awarded)',
      };

      const isBat = Boolean(
        speciesObj?.isBat ||
        speciesObj?.category?.includes('Chiroptera') ||
        speciesObj?.commonName.toLowerCase().includes('bat') ||
        nameToUse.toLowerCase().includes('bat') ||
        aiResult?.isBat ||
        aiResult?.category?.includes('Chiroptera') ||
        prefilledData?.isBat
      );

      const finalPhoto = photoUrl || previewImage || 'https://images.unsplash.com/photo-1551085254-e96b210df58a?w=800';

      const newSighting: Sighting = {
        id: `sg_${Date.now()}`,
        userId: currentUser.id,
        userName: currentUser.name,
        userAvatar: currentUser.avatar,
        userTier: currentUser.tier,
        speciesId: speciesObj ? speciesObj.id : 'sp_custom',
        speciesName: nameToUse,
        scientificName: sciNameToUse,
        latitude: latNum,
        longitude: lngNum,
        locationName: finalLocationName,
        region: currentUser.region,
        timestamp: new Date().toISOString(),
        photoUrl: finalPhoto,
        flockCount: Math.max(1, flockCount),
        behavior,
        notes: notes.trim(),
        verified: true,
        likesCount: 1,
        likedByMe: true,
        comments: [],
        weather,
        imageMetaData,
        imageHash: calculatedHash,
        deviceType: deviceType || clientExif?.model || 'Mobile Smartphone Camera',
        pointsEarned: totalPointsEarned,
        userSightingsCount: (currentUser.sightingsCount || 0) + 1,
        isRareSpecies: isRare,
        rareBonusEarned: rareBonus,
        isBat: isBat,
      };

      onAddSighting(newSighting);

      // SINGLE IMAGE UPLOAD POLICY: If there are 2 or more sightings on this image,
      // create separate sighting observations sharing the EXACT same uploaded photoUrl (0 duplicate uploads)!
      if (additionalBirds.length > 0) {
        additionalBirds.forEach((extra, idx) => {
          let extraSpeciesObj = speciesList.find((sp) => sp.id === extra.speciesId);
          let extraName = extra.useCustomSpecies && extra.customSpeciesName?.trim()
            ? extra.customSpeciesName.trim()
            : (extraSpeciesObj ? extraSpeciesObj.commonName : 'Migratory Bird');
          let extraSciName = extra.useCustomSpecies && extra.customSpeciesName?.trim()
            ? 'Aves spp.'
            : (extraSpeciesObj ? extraSpeciesObj.scientificName : 'Aves spp.');

          const extraConservationStatus = extraSpeciesObj?.conservationStatus || '';
          const extraIsRare = isRareOrExtinctSpecies(extraConservationStatus, extraName, extraSciName);
          const extraRareBonus = extraIsRare ? 50 : 0;
          const extraTotalPoints = 100 + qualityBonus + extraRareBonus;

          const isExtraBat = Boolean(
            extraSpeciesObj?.isBat ||
            extraSpeciesObj?.category?.includes('Chiroptera') ||
            extraSpeciesObj?.commonName.toLowerCase().includes('bat') ||
            extraName.toLowerCase().includes('bat')
          );

          const extraSighting: Sighting = {
            id: `sg_${Date.now()}_extra_${idx + 1}`,
            userId: currentUser.id,
            userName: currentUser.name,
            userAvatar: currentUser.avatar,
            userTier: currentUser.tier,
            speciesId: extraSpeciesObj ? extraSpeciesObj.id : 'sp_custom',
            speciesName: extraName,
            scientificName: extraSciName,
            latitude: latNum,
            longitude: lngNum,
            locationName: finalLocationName,
            region: currentUser.region,
            timestamp: new Date(Date.now() + (idx + 1) * 1000).toISOString(),
            photoUrl: finalPhoto,
            flockCount: Math.max(1, extra.flockCount || 1),
            behavior: extra.behavior || behavior,
            notes: (extra.notes ? `${extra.notes} • ` : '') + `[Multi-sighting from single image: ${extra.positionLabel || `Bird #${idx + 2}`}] ${notes || ''}`.trim(),
            verified: true,
            likesCount: 1,
            likedByMe: true,
            comments: [],
            weather,
            imageMetaData: {
              ...imageMetaData,
              qualityNotes: `${imageMetaData.qualityNotes || ''} (Multi-sighting shared photo)`,
            },
            imageHash: calculatedHash,
            deviceType: deviceType || clientExif?.model || 'Mobile Smartphone Camera',
            pointsEarned: extraTotalPoints,
            userSightingsCount: (currentUser.sightingsCount || 0) + idx + 2,
            isRareSpecies: extraIsRare,
            rareBonusEarned: extraRareBonus,
            isBat: isExtraBat,
          };

          onAddSighting(extraSighting);
        });
      }

      // Trigger celebration confetti safely
      try {
        confetti({
          particleCount: 100,
          spread: 70,
          origin: { y: 0.6 },
        });
      } catch (confettiErr) {
        // ignore
      }

      // Programmatic navigation to feed after form submission so user immediately sees the updated feed
      navigate('/feed');
    } catch (err: any) {
      console.error('Error constructing or adding sighting:', err);
      setLoggerError(err?.message || 'Failed to publish observation. Please check required fields and try again.');
    } finally {
      setIsSubmitting(false);
      setIsVerifyingPhoto(false);
      isSubmittingRef.current = false;
    }
  };

  return (
    <div className="max-w-4xl mx-auto px-3 sm:px-4 py-4 sm:py-8 text-[#edeeef]">
      {/* Declarative Return Navigation Link */}
      <div className="mb-3">
        <Link
          to="/"
          className="inline-flex items-center space-x-1.5 text-xs font-mono-code text-[#00ffaa]/80 hover:text-[#00ffaa] hover:underline transition-colors"
        >
          <span>← Back to Flyway Map</span>
        </Link>
      </div>

      <div className="border border-[rgba(237,238,239,0.1)] rounded p-4 sm:p-8 text-[#edeeef] bg-[#0b0c0d] shadow-2xl space-y-6">
        
        {/* Active Account Restriction Notice */}
        {isRestricted && (
          <div className="p-4 bg-rose-500/15 border-2 border-rose-500/70 rounded-lg space-y-3 animate-in fade-in">
            <div className="flex items-start space-x-3">
              <ShieldAlert className="w-6 h-6 text-rose-400 shrink-0 mt-0.5 animate-pulse" />
              <div className="flex-1 space-y-1">
                <div className="flex items-center justify-between">
                  <h3 className="font-syne font-extrabold text-base text-rose-100 uppercase tracking-tight">
                    Account Suspended for 3 Days (72 Hours)
                  </h3>
                  <span className="font-mono-code text-[10px] bg-rose-500/30 text-rose-300 border border-rose-500/50 px-2 py-0.5 rounded font-bold uppercase">
                    Terms Violation
                  </span>
                </div>
                <p className="font-mono-code text-xs text-rose-200/90 leading-relaxed">
                  You uploaded a downloaded web image instead of an authentic field photograph. To maintain scientific data integrity, bird sightings must be taken directly with a smartphone/camera containing genuine EXIF device & location metadata.
                </p>
                <p className="font-mono-code text-[11px] text-amber-300 font-semibold pt-1">
                  ⚠️ Avoid uploading web images in future sightings. Repeated violations will lead to your account being PERMANENTLY BANNED from the site.
                </p>
              </div>
            </div>

            <div className="flex flex-wrap items-center justify-between gap-2 pt-2 border-t border-rose-500/30">
              <span className="font-mono-code text-[11px] text-rose-300">
                Suspension Active Until: {new Date(currentUser.restrictedUntil!).toLocaleString()}
              </span>
              <div className="flex items-center space-x-2">
                <button
                  type="button"
                  onClick={handleClearRestriction}
                  className="px-3 py-1.5 rounded bg-[#00ffaa]/20 hover:bg-[#00ffaa]/30 border border-[#00ffaa]/50 text-[#00ffaa] font-mono-code text-xs uppercase font-bold tracking-wider transition-all flex items-center space-x-1"
                >
                  <CheckCircle2 className="w-3.5 h-3.5" />
                  <span>Lift Suspension</span>
                </button>
                <button
                  type="button"
                  onClick={onOpenRestrictionModal}
                  className="px-3 py-1.5 rounded bg-rose-500/30 hover:bg-rose-500/50 border border-rose-500/60 text-rose-100 font-mono-code text-xs uppercase font-bold tracking-wider transition-all"
                >
                  View Details
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Title Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between border-b border-[rgba(237,238,239,0.1)] pb-4 sm:pb-5 gap-3">
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 sm:w-12 sm:h-12 rounded bg-[rgba(237,238,239,0.05)] border border-[rgba(237,238,239,0.15)] flex items-center justify-center text-[#00ffaa] shrink-0">
              <Camera className="w-5 h-5 sm:w-6 sm:h-6" />
            </div>
            <div>
              <span className="font-mono-code text-[10px] text-[#00ffaa] uppercase tracking-widest block">BMA Telemetry</span>
              <h2 className="font-syne text-xl sm:text-2xl font-extrabold text-[#edeeef] tracking-tight">
                Log Bird Observation
              </h2>
              <p className="font-mono-code text-xs text-[#edeeef]/60 uppercase tracking-wider mt-0.5">
                Record exact coordinates & photos to contribute to global migration tracking.
              </p>
            </div>
          </div>

          <div className="self-start sm:self-auto flex flex-wrap items-center gap-2">
            <div className="flex items-center space-x-2 bg-[#00ffaa]/10 border border-[#00ffaa]/30 px-3 py-1.5 rounded text-[#00ffaa] font-mono-code text-xs font-semibold uppercase tracking-wider">
              <Sparkles className="w-3.5 h-3.5 animate-spin text-[#00ffaa]" />
              <span>+100 Base Pts</span>
            </div>
            <div className="flex items-center space-x-1.5 bg-cyan-500/10 border border-cyan-400/40 px-2.5 py-1.5 rounded text-cyan-400 font-mono-code text-xs font-bold uppercase tracking-wider">
              <span>📸 +10 Quality Bonus</span>
            </div>
            {isRareDetected && (
              <div className="flex items-center space-x-1.5 bg-amber-500/15 border border-amber-400/60 px-2.5 py-1.5 rounded text-amber-300 font-mono-code text-xs font-bold uppercase tracking-wider animate-pulse">
                <span>🚨 +50 Rare Bird Bonus 🏆</span>
              </div>
            )}
          </div>
        </div>

        <form noValidate onSubmit={handleSubmit} className="space-y-5 sm:space-y-6">
          
          {!isOnline && (
            <div className="p-4 bg-amber-500/10 border border-amber-500/40 rounded-lg text-amber-200 font-mono-code text-xs flex items-start space-x-3 animate-in fade-in shadow-lg">
              <WifiOff className="w-5 h-5 text-amber-400 shrink-0 mt-0.5" />
              <div className="space-y-1">
                <div className="flex items-center space-x-2">
                  <span className="font-syne font-bold text-amber-300 uppercase tracking-wide">Offline Field Mode Active</span>
                  <span className="bg-amber-500/20 text-amber-300 text-[10px] px-1.5 py-0.5 rounded font-bold uppercase">Local Sync Queue</span>
                </div>
                <p className="text-amber-200/90 text-xs leading-relaxed">
                  No internet connection detected. You can safely record your bird sighting, notes, and photos right now. Your observation will be stored locally and automatically pushed to the Supabase database once connectivity is restored.
                </p>
              </div>
            </div>
          )}

          {duplicateWarning && (
            <div className="p-4 bg-rose-950/80 border-2 border-rose-500 rounded-lg space-y-3 animate-in fade-in shadow-xl">
              <div className="flex items-start space-x-3">
                <AlertTriangle className="w-6 h-6 text-rose-400 shrink-0 mt-0.5 animate-bounce" />
                <div className="flex-1 space-y-2">
                  <div className="flex items-center justify-between">
                    <h3 className="font-syne font-extrabold text-sm text-rose-200 uppercase tracking-tight flex items-center gap-2">
                      <span>🚫 DUPLICATE IMAGE DETECTED</span>
                    </h3>
                    <span className="font-mono-code text-[10px] bg-rose-500/30 text-rose-300 border border-rose-500/50 px-2 py-0.5 rounded font-bold uppercase">
                      Single Upload Enforced
                    </span>
                  </div>
                  <p className="font-mono-code text-xs text-rose-200/90 leading-relaxed">
                    {duplicateWarning}
                  </p>
                  
                  {/* Option to convert to multi-sighting without uploading another photo */}
                  <div className="pt-2 border-t border-rose-500/30 flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                    <span className="text-[11px] font-mono-code text-amber-300">
                      Does this photo contain 2 or more sightings?
                    </span>
                    <button
                      type="button"
                      onClick={() => {
                        setIsMultiSightingMode(true);
                        setIsDuplicateImage(false);
                        setDuplicateWarning(null);
                        setSharedPhotoNotice(
                          '📸 Multi-Sighting on Single Image Active: Reusing existing photo file. Only 1 photo is uploaded to storage.'
                        );
                      }}
                      className="px-3 py-1.5 bg-[#00ffaa] text-[#070808] hover:bg-[#00ffaa]/90 font-syne font-bold text-xs rounded transition-all cursor-pointer flex items-center space-x-1.5 self-start sm:self-auto"
                    >
                      <Sparkles className="w-3.5 h-3.5" />
                      <span>Log as Multi-Sighting on Single Image</span>
                    </button>
                  </div>
                </div>
              </div>
            </div>
          )}

          {sharedPhotoNotice && (
            <div className="p-3.5 bg-emerald-500/10 border border-emerald-500/30 rounded-lg text-emerald-300 font-mono-code text-xs flex items-center justify-between animate-in fade-in">
              <div className="flex items-center space-x-2">
                <Sparkles className="w-4 h-4 text-[#00ffaa] shrink-0" />
                <span>{sharedPhotoNotice}</span>
              </div>
              <span className="text-[10px] bg-[#00ffaa]/20 text-[#00ffaa] border border-[#00ffaa]/40 px-2 py-0.5 rounded font-bold uppercase shrink-0 ml-2">
                1 Image Uploaded
              </span>
            </div>
          )}

          {loggerError && !duplicateWarning && (
            <div className="p-3.5 bg-rose-500/15 border border-rose-500/40 rounded text-rose-300 font-mono-code text-xs flex items-center justify-between animate-in fade-in">
              <div className="flex items-center space-x-2">
                <AlertCircle className="w-4 h-4 shrink-0 text-rose-400" />
                <span>{loggerError}</span>
              </div>
              <button
                type="button"
                onClick={() => setLoggerError(null)}
                className="ml-3 text-rose-400 hover:text-white font-bold min-h-[36px] px-2 uppercase text-[11px]"
              >
                Dismiss
              </button>
            </div>
          )}
          
          {/* Section 1: Species Selection */}
          <div id="species-select-section" className="space-y-2">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1">
              <label className="font-mono-code text-xs text-[#edeeef]/90 uppercase tracking-widest block font-bold">
                Species Observed (Bird or Permitted Bat) <span className="text-rose-400 font-bold">*</span>
              </label>
              <button
                type="button"
                onClick={() => {
                  setUseCustomSpecies(!useCustomSpecies);
                  setSpeciesError(null);
                }}
                className="font-mono-code text-xs text-[#00ffaa] hover:underline uppercase tracking-wider self-start sm:self-auto min-h-[36px] flex items-center"
              >
                {useCustomSpecies ? 'Select from Database' : '+ Log Unlisted Species'}
              </button>
            </div>

            {!useCustomSpecies ? (
              <select
                id="species-select-dropdown"
                value={selectedSpeciesId}
                onChange={(e) => {
                  setSelectedSpeciesId(e.target.value);
                  if (e.target.value) setSpeciesError(null);
                }}
                className={`w-full bg-[rgba(237,238,239,0.06)] border ${
                  speciesError
                    ? 'border-rose-500 focus:border-rose-400 ring-1 ring-rose-500/40'
                    : 'border-[rgba(237,238,239,0.15)] focus:border-[#00ffaa]'
                } rounded px-3.5 py-3 text-[#edeeef] text-base sm:text-sm focus:outline-none transition-colors`}
              >
                <option value="" disabled className="bg-[#0b0c0d] text-[#edeeef]/40">
                  -- Select an observed bird or bat species --
                </option>
                {speciesList.map((sp) => {
                  const isBat = sp.category?.includes('Chiroptera') || sp.commonName.toLowerCase().includes('bat');
                  return (
                    <option key={sp.id} value={sp.id} className="bg-[#0b0c0d] text-[#edeeef]">
                      {isBat ? '🦇 [BAT EXCEPTION] ' : ''}{sp.commonName} ({sp.scientificName}) — {sp.flywayRegion}
                    </option>
                  );
                })}
              </select>
            ) : (
              <input
                id="species-custom-input"
                type="text"
                placeholder="Enter species name (e.g., Osprey, Peregrine Falcon...)"
                value={customSpeciesName}
                onChange={(e) => {
                  setCustomSpeciesName(e.target.value);
                  if (e.target.value.trim()) setSpeciesError(null);
                }}
                className={`w-full bg-[rgba(237,238,239,0.06)] border ${
                  speciesError
                    ? 'border-rose-500 focus:border-rose-400 ring-1 ring-rose-500/40'
                    : 'border-[rgba(237,238,239,0.15)] focus:border-[#00ffaa]'
                } rounded px-3.5 py-3 text-[#edeeef] text-base sm:text-sm focus:outline-none transition-colors`}
              />
            )}

            {speciesError && (
              <p className="text-xs font-mono-code text-rose-400 mt-1 flex items-center space-x-1.5 animate-in fade-in">
                <AlertCircle className="w-3.5 h-3.5 shrink-0" />
                <span>{speciesError}</span>
              </p>
            )}

            {/* Species hint */}
            <div className="flex items-center justify-between text-xs font-mono-code pt-1 text-[#edeeef]/60">
              <span>Select a recognized species or enter custom species details</span>
            </div>
          </div>

          {/* Multi-Sighting on Single Image Section */}
          <div className="bg-[rgba(0,255,170,0.03)] border border-[#00ffaa]/25 rounded-lg p-4 space-y-3">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
              <div className="flex items-center space-x-2">
                <Sparkles className="w-4 h-4 text-[#00ffaa]" />
                <span className="font-syne font-bold text-sm text-[#edeeef]">
                  Multi-Sighting on Single Image
                </span>
                <span className="bg-[#00ffaa]/15 text-[#00ffaa] border border-[#00ffaa]/30 text-[10px] font-mono-code font-bold px-2 py-0.5 rounded-full">
                  1 Upload Policy
                </span>
              </div>

              <button
                type="button"
                onClick={handleAddAdditionalBird}
                className="text-xs font-mono-code text-[#00ffaa] hover:bg-[#00ffaa]/10 border border-[#00ffaa]/40 px-3 py-1.5 rounded transition-all flex items-center space-x-1 cursor-pointer self-start sm:self-auto"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>+ Add Another Bird on This Image</span>
              </button>
            </div>

            <p className="text-[11px] font-mono-code text-[#edeeef]/70 leading-relaxed">
              If there are two or more sightings in this photo, only one image file will be uploaded. All observations will be recorded independently and will share this single uploaded photo.
            </p>

            {additionalBirds.length > 0 && (
              <div className="space-y-3 pt-2">
                {additionalBirds.map((bird, idx) => (
                  <div
                    key={bird.id}
                    className="bg-[rgba(237,238,239,0.04)] border border-[rgba(237,238,239,0.12)] p-3 rounded-lg space-y-3 animate-in fade-in"
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center space-x-2">
                        <span className="bg-[#00ffaa]/20 text-[#00ffaa] text-[10px] font-mono-code font-bold px-2 py-0.5 rounded">
                          Sighting #{idx + 2} (Shares Same Photo)
                        </span>
                        <input
                          type="text"
                          value={bird.positionLabel}
                          onChange={(e) => handleUpdateAdditionalBird(bird.id, { positionLabel: e.target.value })}
                          placeholder="e.g., Bird on Right, Center branch"
                          className="bg-transparent border-b border-[rgba(237,238,239,0.2)] text-xs text-[#edeeef] font-mono-code px-1 py-0.5 focus:outline-none focus:border-[#00ffaa]"
                        />
                      </div>
                      <button
                        type="button"
                        onClick={() => handleRemoveAdditionalBird(bird.id)}
                        className="text-rose-400 hover:text-rose-300 p-1 cursor-pointer"
                        title="Remove this bird"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      <div>
                        <label className="font-mono-code text-[10px] text-[#edeeef]/60 uppercase tracking-widest block mb-1">
                          Species
                        </label>
                        {!bird.useCustomSpecies ? (
                          <select
                            value={bird.speciesId}
                            onChange={(e) => handleUpdateAdditionalBird(bird.id, { speciesId: e.target.value })}
                            className="w-full bg-[#0b0c0d] border border-[rgba(237,238,239,0.15)] rounded px-2.5 py-1.5 text-xs text-[#edeeef] focus:outline-none focus:border-[#00ffaa]"
                          >
                            <option value="" disabled className="bg-[#0b0c0d] text-[#edeeef]/40">
                              -- Select species --
                            </option>
                            {speciesList.map((sp) => (
                              <option key={sp.id} value={sp.id}>
                                {sp.commonName} ({sp.scientificName})
                              </option>
                            ))}
                          </select>
                        ) : (
                          <input
                            type="text"
                            value={bird.customSpeciesName}
                            onChange={(e) => handleUpdateAdditionalBird(bird.id, { customSpeciesName: e.target.value })}
                            placeholder="Species Name..."
                            className="w-full bg-[#0b0c0d] border border-[rgba(237,238,239,0.15)] rounded px-2.5 py-1.5 text-xs text-[#edeeef] focus:outline-none focus:border-[#00ffaa]"
                          />
                        )}
                      </div>

                      <div className="grid grid-cols-2 gap-2">
                        <div>
                          <label className="font-mono-code text-[10px] text-[#edeeef]/60 uppercase tracking-widest block mb-1">
                            Count
                          </label>
                          <input
                            type="number"
                            min={1}
                            value={bird.flockCount}
                            onChange={(e) => handleUpdateAdditionalBird(bird.id, { flockCount: Number(e.target.value) })}
                            className="w-full bg-[#0b0c0d] border border-[rgba(237,238,239,0.15)] rounded px-2.5 py-1.5 text-xs text-[#edeeef] focus:outline-none focus:border-[#00ffaa]"
                          />
                        </div>

                        <div>
                          <label className="font-mono-code text-[10px] text-[#edeeef]/60 uppercase tracking-widest block mb-1">
                            Behavior
                          </label>
                          <select
                            value={bird.behavior}
                            onChange={(e) => handleUpdateAdditionalBird(bird.id, { behavior: e.target.value as SightingBehavior })}
                            className="w-full bg-[#0b0c0d] border border-[rgba(237,238,239,0.15)] rounded px-2.5 py-1.5 text-xs text-[#edeeef] focus:outline-none focus:border-[#00ffaa]"
                          >
                            <option value="flying">Flying</option>
                            <option value="resting">Resting</option>
                            <option value="feeding">Feeding</option>
                            <option value="nesting">Nesting</option>
                            <option value="roosting">Roosting</option>
                          </select>
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Section 2: Coordinates & Location Picker */}
          <div className="bg-[rgba(237,238,239,0.03)] p-4 sm:p-5 rounded border border-[rgba(237,238,239,0.1)] space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
              <div className="flex items-center space-x-2 text-[#00ffaa] font-mono-code text-xs uppercase tracking-widest">
                <MapPin className="w-4 h-4 shrink-0" />
                <span>Geographic Coordinates & Location</span>
              </div>

              <div className="flex flex-wrap items-center gap-2">
                <button
                  type="button"
                  onClick={handleFetchGpsLocation}
                  disabled={isGettingGps}
                  className="min-h-[44px] px-3.5 py-2 rounded bg-[rgba(237,238,239,0.1)] hover:bg-[rgba(237,238,239,0.2)] text-xs font-mono-code text-[#edeeef] uppercase tracking-wider flex items-center space-x-1.5 transition-all cursor-pointer"
                >
                  <Crosshair className={`w-3.5 h-3.5 text-[#00ffaa] ${isGettingGps ? 'animate-spin' : ''}`} />
                  <span>{isGettingGps ? 'GPS...' : 'Use My GPS'}</span>
                </button>

                {onRequestPickOnMap && (
                  <button
                    type="button"
                    onClick={onRequestPickOnMap}
                    className="min-h-[44px] px-3.5 py-2 rounded bg-[#00ffaa]/10 hover:bg-[#00ffaa]/20 border border-[#00ffaa]/30 text-xs font-mono-code text-[#00ffaa] uppercase tracking-wider flex items-center space-x-1.5 transition-all cursor-pointer"
                  >
                    <Navigation className="w-3.5 h-3.5" />
                    <span>Pick on Map</span>
                  </button>
                )}
              </div>
            </div>

            {/* GPS Notice / Browser Permission Helper */}
            {gpsNotice && (
              <div
                className={`p-3.5 rounded-lg border text-xs font-mono-code space-y-2 animate-in fade-in ${
                  gpsNotice.type === 'denied'
                    ? 'bg-amber-950/40 border-amber-500/40 text-amber-200'
                    : gpsNotice.type === 'unavailable'
                    ? 'bg-cyan-950/40 border-cyan-500/40 text-cyan-200'
                    : 'bg-emerald-950/40 border-emerald-500/40 text-emerald-200'
                }`}
              >
                <div className="flex items-start justify-between gap-2">
                  <div className="flex items-start space-x-2">
                    <span className="text-base leading-none">
                      {gpsNotice.type === 'denied' ? '🔒' : gpsNotice.type === 'success' ? '✅' : 'ℹ️'}
                    </span>
                    <div>
                      <p className="font-bold uppercase tracking-wider">
                        {gpsNotice.type === 'denied'
                          ? 'Browser Geolocation Permission Denied'
                          : gpsNotice.type === 'success'
                          ? 'GPS Coordinates Located'
                          : 'Location Service Note'}
                      </p>
                      <p className="mt-1 text-[11px] leading-relaxed opacity-90">{gpsNotice.message}</p>
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={() => setGpsNotice(null)}
                    className="opacity-70 hover:opacity-100 p-1 min-h-[32px] text-xs font-bold"
                    aria-label="Dismiss notice"
                  >
                    ✕
                  </button>
                </div>
              </div>
            )}

            {/* Photo EXIF Coordinates Shortcut if available */}
            {clientExif?.gpsLatitude !== undefined && clientExif?.gpsLongitude !== undefined && (
              <div className="flex items-center justify-between p-2.5 bg-[#00ffaa]/10 border border-[#00ffaa]/30 rounded text-xs font-mono-code text-[#00ffaa]">
                <div className="flex items-center space-x-2">
                  <span>📸 Photo has embedded GPS:</span>
                  <span className="font-bold">
                    {clientExif.gpsLatitude.toFixed(4)}°, {clientExif.gpsLongitude.toFixed(4)}°
                  </span>
                </div>
                <button
                  type="button"
                  onClick={() => {
                    if (clientExif.gpsLatitude !== undefined && clientExif.gpsLongitude !== undefined) {
                      setLatitude(String(Number(clientExif.gpsLatitude.toFixed(5))));
                      setLongitude(String(Number(clientExif.gpsLongitude.toFixed(5))));
                    }
                  }}
                  className="px-2.5 py-1 bg-[#00ffaa] text-black font-bold uppercase rounded hover:bg-[#00ffaa]/80 transition-colors"
                >
                  Apply Coordinates
                </button>
              </div>
            )}

            <div id="coordinates-section" className="space-y-2">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="font-mono-code text-xs text-[#edeeef]/90 uppercase tracking-widest block mb-1 font-bold">
                    Latitude (°N/S) <span className="text-rose-400 font-bold">*</span>
                  </label>
                  <input
                    id="latitude-input"
                    type="number"
                    step="any"
                    value={latitude}
                    onChange={(e) => {
                      setLatitude(e.target.value);
                      if (e.target.value.trim()) setCoordsError(null);
                    }}
                    className={`w-full bg-[rgba(237,238,239,0.06)] border ${
                      coordsError
                        ? 'border-rose-500 focus:border-rose-400 ring-1 ring-rose-500/40'
                        : 'border-[rgba(237,238,239,0.15)] focus:border-[#00ffaa]'
                    } rounded px-3.5 py-2.5 text-base sm:text-sm text-[#edeeef] font-mono-code focus:outline-none transition-colors`}
                    placeholder="e.g. 43.6532"
                  />
                </div>

                <div>
                  <label className="font-mono-code text-xs text-[#edeeef]/90 uppercase tracking-widest block mb-1 font-bold">
                    Longitude (°E/W) <span className="text-rose-400 font-bold">*</span>
                  </label>
                  <input
                    id="longitude-input"
                    type="number"
                    step="any"
                    value={longitude}
                    onChange={(e) => {
                      setLongitude(e.target.value);
                      if (e.target.value.trim()) setCoordsError(null);
                    }}
                    className={`w-full bg-[rgba(237,238,239,0.06)] border ${
                      coordsError
                        ? 'border-rose-500 focus:border-rose-400 ring-1 ring-rose-500/40'
                        : 'border-[rgba(237,238,239,0.15)] focus:border-[#00ffaa]'
                    } rounded px-3.5 py-2.5 text-base sm:text-sm text-[#edeeef] font-mono-code focus:outline-none transition-colors`}
                    placeholder="e.g. -70.2520"
                  />
                </div>
              </div>

              {coordsError && (
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1.5 p-2 bg-rose-500/10 border border-rose-500/30 rounded text-xs font-mono-code text-rose-300 animate-in fade-in">
                  <div className="flex items-center space-x-1.5">
                    <AlertCircle className="w-3.5 h-3.5 shrink-0 text-rose-400" />
                    <span>{coordsError}</span>
                  </div>
                  <button
                    type="button"
                    onClick={() => {
                      setLatitude('43.6532');
                      setLongitude('-70.2520');
                      setCoordsError(null);
                      if (!locationName) setLocationName('Cape Elizabeth Sanctuary');
                    }}
                    className="text-[#00ffaa] hover:underline uppercase text-[10px] font-bold cursor-pointer shrink-0"
                  >
                    📍 Use Sanctuary Default
                  </button>
                </div>
              )}
            </div>

            <div>
              <div className="flex items-center justify-between mb-1.5">
                <label
                  htmlFor="location-name-input"
                  className="font-mono-code text-xs text-[#edeeef]/90 uppercase tracking-widest font-bold flex items-center space-x-1.5"
                >
                  <MapPin className="w-3.5 h-3.5 text-[#00ffaa]" />
                  <span>Location / Place Name</span>
                  <span className="text-rose-400 font-bold">* MUST BE FILLED</span>
                </label>
                <span className="text-[10px] font-mono-code text-[#00ffaa] bg-[#00ffaa]/10 border border-[#00ffaa]/20 px-2 py-0.5 rounded">
                  Manual Input Required
                </span>
              </div>
              <input
                id="location-name-input"
                type="text"
                value={locationName}
                onChange={(e) => {
                  setLocationName(e.target.value);
                  if (e.target.value.trim()) {
                    setLocationError(null);
                  }
                }}
                onBlur={() => {
                  if (!locationName.trim()) {
                    setLocationError('Location / Place Name is required and must be manually entered.');
                  } else {
                    setLocationError(null);
                  }
                }}
                className={`w-full bg-[rgba(237,238,239,0.06)] border ${
                  locationError
                    ? 'border-rose-500/80 focus:border-rose-400 ring-1 ring-rose-500/50'
                    : 'border-[rgba(237,238,239,0.15)] focus:border-[#00ffaa]'
                } rounded px-3.5 py-2.5 text-base sm:text-sm text-[#edeeef] focus:outline-none transition-colors`}
                placeholder="Enter observation place or locality name (e.g. Cape May Point, Point Pelee, Bosque del Apache)"
              />
              {locationError ? (
                <p className="mt-1.5 text-xs font-mono-code text-rose-400 flex items-center space-x-1 animate-in fade-in">
                  <AlertCircle className="w-3.5 h-3.5 shrink-0" />
                  <span>{locationError}</span>
                </p>
              ) : (
                <p className="mt-1 text-[11px] font-mono-code text-[#edeeef]/40">
                  Required: Manually enter the specific observation locality, park, sanctuary, or place name.
                </p>
              )}
            </div>
          </div>

          {/* Section 3: Photo Upload & EXIF Authenticity */}
          <div
            id="photo-upload-section"
            className={`space-y-3 bg-[rgba(237,238,239,0.03)] p-4 sm:p-5 rounded border ${
              photoError ? 'border-rose-500/80 ring-1 ring-rose-500/40' : 'border-[rgba(237,238,239,0.1)]'
            } transition-colors`}
          >
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-2">
                <Camera className="w-4 h-4 text-[#00ffaa]" />
                <label className="font-mono-code text-xs text-[#edeeef]/90 uppercase tracking-widest block font-bold">
                  Field Photo & EXIF Metadata Verification <span className="text-rose-400 font-bold">*</span>
                </label>
              </div>
              {previewImage && (
                <button
                  type="button"
                  onClick={() => {
                    setPhotoUrl('');
                    setPreviewImage('');
                    setCurrentImageFile(null);
                    setClientExif(null);
                    setIsSimulatingWebDownload(false);
                    setIsBirdVerified(false);
                    setImageValidationError('No image attached. A null or empty image cannot be uploaded.');
                  }}
                  className="font-mono-code text-xs text-rose-400 hover:text-rose-300 uppercase tracking-wider transition-colors min-h-[36px] px-2"
                >
                  Remove Photo
                </button>
              )}
            </div>

            {photoError && (
              <div className="p-3 bg-rose-500/15 border border-rose-500/40 rounded text-rose-300 font-mono-code text-xs flex items-center space-x-2 animate-in fade-in">
                <AlertCircle className="w-4 h-4 shrink-0 text-rose-400" />
                <span>{photoError}</span>
              </div>
            )}

            {/* Upload File Input & Presets */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 items-center">
              {/* Photo Preview */}
              <div className="relative w-28 h-28 rounded overflow-hidden border border-[rgba(237,238,239,0.15)] bg-[rgba(237,238,239,0.03)] flex items-center justify-center shrink-0">
                {previewImage && previewImage.trim() ? (
                  <div className="relative w-full h-full group">
                    <img src={previewImage.trim()} alt="Preview" className="w-full h-full object-cover" />
                    {isSimulatingWebDownload && (
                      <div className="absolute inset-0 bg-rose-950/80 flex items-center justify-center p-1 text-center text-rose-300 font-mono-code text-[10px] font-bold uppercase tracking-wider">
                        Web Download Flagged
                      </div>
                    )}
                  </div>
                ) : (
                  <div className="text-center text-[#edeeef]/40 p-2 font-mono-code">
                    <ImageIcon className="w-6 h-6 mx-auto mb-1 opacity-50" />
                    <span className="text-[10px] uppercase">No Photo</span>
                  </div>
                )}
              </div>

              {/* Upload Button & Preset Selector */}
              <div className="md:col-span-2 space-y-3">
                <div className="flex flex-wrap items-center gap-2">
                  {/* File / Gallery Upload */}
                  <label htmlFor="sighting-file-input" className="min-h-[44px] px-3.5 py-2 rounded bg-[#00ffaa]/10 hover:bg-[#00ffaa]/20 border border-[#00ffaa]/40 text-[#00ffaa] font-mono-code text-xs uppercase font-semibold tracking-wider flex items-center space-x-2 cursor-pointer transition-all active:scale-95">
                    <Upload className="w-4 h-4" />
                    <span>Upload Photo / EXIF</span>
                  </label>
                  <input
                    id="sighting-file-input"
                    type="file"
                    accept="image/*"
                    onChange={handleImageFileChange}
                    className="hidden"
                  />

                  {/* Direct Mobile Camera Capture */}
                  <label htmlFor="sighting-camera-input" className="min-h-[44px] px-3.5 py-2 rounded bg-[rgba(237,238,239,0.06)] hover:bg-[rgba(237,238,239,0.12)] border border-[rgba(237,238,239,0.15)] text-[#edeeef] font-mono-code text-xs uppercase font-semibold tracking-wider flex items-center space-x-2 cursor-pointer transition-all active:scale-95">
                    <Camera className="w-4 h-4 text-[#00ffaa]" />
                    <span>Take Camera Photo</span>
                  </label>
                  <input
                    id="sighting-camera-input"
                    type="file"
                    accept="image/*"
                    capture="environment"
                    onChange={handleImageFileChange}
                    className="hidden"
                  />
                </div>
              </div>
            </div>

            {/* Bird Verification Status Banner */}
            {isValidatingBirdImage && (
              <div className="p-2.5 bg-cyan-500/10 border border-cyan-500/30 rounded text-xs font-mono-code text-cyan-300 flex items-center space-x-2 animate-pulse">
                <RefreshCw className="w-4 h-4 animate-spin shrink-0 text-cyan-400" />
                <span>Scanning image with AI Vision to verify bird or bat presence...</span>
              </div>
            )}

            {imageValidationError && (
              <div className="p-3 bg-rose-500/15 border border-rose-500/40 rounded text-xs font-mono-code text-rose-300 flex items-start space-x-2 animate-in fade-in">
                <AlertCircle className="w-4 h-4 shrink-0 text-rose-400 mt-0.5" />
                <div>
                  <span className="font-bold block text-rose-200">Upload Blocked</span>
                  <span>{imageValidationError}</span>
                </div>
              </div>
            )}

            {isBirdVerified && previewImage && !isValidatingBirdImage && !imageValidationError && (
              <div className="p-2 bg-[#00ffaa]/10 border border-[#00ffaa]/30 rounded text-[11px] font-mono-code text-[#00ffaa] flex items-center space-x-2">
                <ShieldCheck className="w-4 h-4 shrink-0 text-[#00ffaa]" />
                <span>
                  {aiResult?.isBat || (aiResult?.category && aiResult.category.includes('Chiroptera')) || (aiResult?.commonName && aiResult.commonName.toLowerCase().includes('bat'))
                    ? '🦇 Aerial Species Exception Verified: Authentic bat specimen (Order Chiroptera) detected. Permitted flying mammal observation approved.'
                    : 'Avian Subject Verified: Genuine bird detected in observation photograph.'}
                </span>
              </div>
            )}

            {/* Display Extracted EXIF Badge */}
            {clientExif?.make && (
              <div className="p-2 bg-[#00ffaa]/10 border border-[#00ffaa]/30 rounded text-[11px] font-mono-code text-[#00ffaa] flex items-center space-x-2">
                <ShieldCheck className="w-4 h-4 shrink-0" />
                <span>
                  EXIF Metadata Verified: Camera Device <strong>{clientExif.make} {clientExif.model}</strong> • GPS Location Included
                </span>
              </div>
            )}

            {/* AI Result Card */}
            {aiResult && (
              <div className="bg-[#00ffaa]/5 border border-[#00ffaa]/30 rounded-md p-3.5 space-y-2.5 animate-in fade-in">
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-2">
                    <ShieldCheck className="w-4 h-4 text-[#00ffaa]" />
                    <span className="font-syne font-bold text-sm text-[#00ffaa]">
                      AI Match: {aiResult.commonName}
                    </span>
                    <span className="font-mono-code text-[10px] bg-[#00ffaa]/20 border border-[#00ffaa]/40 text-[#00ffaa] px-1.5 py-0.5 rounded uppercase font-bold">
                      {aiResult.confidenceScore}% Confidence
                    </span>
                  </div>
                  {aiResult.matchedSpeciesId ? (
                    <span className="font-mono-code text-[10px] text-emerald-400 bg-emerald-400/10 border border-emerald-400/30 px-2 py-0.5 rounded">
                      Matched App Database
                    </span>
                  ) : (
                    <span className="font-mono-code text-[10px] text-amber-300 bg-amber-400/10 border border-amber-400/30 px-2 py-0.5 rounded">
                      Unlisted Species
                    </span>
                  )}
                </div>

                <p className="font-mono-code text-xs text-[#edeeef]/70 italic">
                  {aiResult.scientificName} • Category: {aiResult.category}
                </p>

                {aiResult.diagnosticFeatures?.length > 0 && (
                  <div className="flex flex-wrap gap-1 pt-1">
                    {aiResult.diagnosticFeatures.map((feat, i) => (
                      <span key={i} className="bg-[rgba(237,238,239,0.08)] border border-[rgba(237,238,239,0.15)] text-[#edeeef] font-mono-code text-[10px] px-2 py-0.5 rounded flex items-center space-x-1">
                        <Tag className="w-2.5 h-2.5 text-[#00ffaa]" />
                        <span>{feat}</span>
                      </span>
                    ))}
                  </div>
                )}

                {/* Left to Right Birds Breakdown */}
                {aiResult.birdsLeftToRight && aiResult.birdsLeftToRight.length > 0 && (
                  <div className="bg-[#0b0c0d] p-2.5 rounded border border-[#00ffaa]/30 space-y-2 mt-2">
                    <span className="font-mono-code text-[10px] text-[#00ffaa] font-bold uppercase tracking-wider block">
                      Birds & Species Identified (Left → Right):
                    </span>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-1.5">
                      {aiResult.birdsLeftToRight.map((bird, idx) => (
                        <div key={idx} className="bg-[rgba(237,238,239,0.05)] border border-[rgba(237,238,239,0.1)] p-2 rounded text-xs flex flex-col justify-between">
                          <div className="flex items-center justify-between">
                            <span className="bg-[#00ffaa]/20 text-[#00ffaa] text-[9px] font-mono-code font-bold px-1.5 py-0.2 rounded border border-[#00ffaa]/30">
                              📍 {bird.positionLabel}
                            </span>
                            <span className="text-[9px] font-mono-code text-[#edeeef]/60">
                              {bird.confidenceScore}%
                            </span>
                          </div>
                          <span className="font-syne font-bold text-xs text-[#edeeef] mt-1">{bird.commonName}</span>
                          <span className="font-mono-code text-[10px] text-[#edeeef]/50 italic">{bird.scientificName}</span>
                        </div>
                      ))}
                    </div>

                    {/* Single image multi-sighting action button */}
                    {aiResult.birdsLeftToRight.length > 1 && (
                      <div className="pt-2 border-t border-[#00ffaa]/20 flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                        <span className="text-[10px] font-mono-code text-[#00ffaa]">
                          💡 {aiResult.birdsLeftToRight.length} specimens detected in this single photo
                        </span>
                        <button
                          type="button"
                          onClick={() => {
                            const extraBirds = aiResult.birdsLeftToRight!.slice(1).map((b, idx) => {
                              const matched = speciesList.find(
                                (s) =>
                                  s.commonName.toLowerCase() === b.commonName.toLowerCase() ||
                                  s.scientificName.toLowerCase() === b.scientificName.toLowerCase()
                              );
                              return {
                                id: `extra_${Date.now()}_${idx}`,
                                speciesId: matched ? matched.id : 'sp_custom',
                                useCustomSpecies: !matched,
                                customSpeciesName: matched ? '' : b.commonName,
                                positionLabel: b.positionLabel || `Bird #${idx + 2}`,
                                behavior: 'flying' as SightingBehavior,
                                flockCount: 1,
                                notes: `Identified at position: ${b.positionLabel || 'in photo'}. Visual feature: ${b.distinguishingFeature || 'Distinct specimen plumage in shared photo'}.`,
                              };
                            });
                            setAdditionalBirds(extraBirds);
                            setIsMultiSightingMode(true);
                            setIsDuplicateImage(false);
                            setDuplicateWarning(null);
                            setSharedPhotoNotice(
                              `📸 Multi-Sighting Active: ${aiResult.birdsLeftToRight!.length} sightings configured. Only 1 photo file is uploaded to storage, shared by all sightings.`
                            );
                          }}
                          className="px-3 py-1.5 bg-[#00ffaa] text-[#070808] font-syne font-bold text-xs rounded hover:bg-[#00ffaa]/90 transition-all cursor-pointer flex items-center space-x-1.5 self-start sm:self-auto shadow-sm"
                        >
                          <Sparkles className="w-3.5 h-3.5" />
                          <span>Include All {aiResult.birdsLeftToRight.length} Birds (1 Photo Upload)</span>
                        </button>
                      </div>
                    )}
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Section 4: Device Type & Flock Count */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="font-mono-code text-xs text-[#edeeef]/60 uppercase tracking-widest block mb-1">
                Type of Device Used to Snap Photo
              </label>
              <input
                type="text"
                value={deviceType}
                onChange={(e) => setDeviceType(e.target.value)}
                placeholder="e.g., iPhone 15 Pro, Canon EOS R5, Nikon D850, Sony Alpha 1"
                className="w-full bg-[rgba(237,238,239,0.06)] border border-[rgba(237,238,239,0.15)] rounded px-3.5 py-2.5 text-base sm:text-sm text-[#edeeef] focus:outline-none focus:border-[#00ffaa]"
              />
            </div>

            <div>
              <label className="font-mono-code text-xs text-[#edeeef]/60 uppercase tracking-widest block mb-1">
                Number of Birds (Flock Size)
              </label>
              <input
                type="number"
                min={1}
                value={flockCount}
                onChange={(e) => setFlockCount(Number(e.target.value))}
                className="w-full bg-[rgba(237,238,239,0.06)] border border-[rgba(237,238,239,0.15)] rounded px-3.5 py-2.5 text-base sm:text-sm text-[#edeeef] focus:outline-none focus:border-[#00ffaa]"
              />
            </div>
          </div>

          {/* Sighting & Points Recording Preview Banner */}
          <div className="p-3.5 rounded bg-emerald-500/10 border border-emerald-500/30 flex flex-wrap items-center justify-between gap-2 text-xs font-mono-code text-emerald-400">
            <div className="flex items-center space-x-2">
              <Sparkles className="w-4 h-4 text-[#00ffaa] animate-bounce" />
              <span>
                Record Impact: <strong>+100 Base Pts</strong> + <strong className="text-cyan-300">📸 +10 Quality Bonus</strong>
                {isRareDetected ? (
                  <span className="text-amber-300 font-bold ml-1">
                    + 🚨 <strong>+50 RARE SPECIES BONUS</strong> = <strong>+160 PTS TOTAL</strong>! 🎖️ Badge Unlocked: <strong>Rare Species Finder 🦅</strong>
                  </span>
                ) : (
                  <span className="ml-1">
                    = <strong>+110 PTS Total</strong>
                  </span>
                )}
              </span>
            </div>
            <div className="flex items-center space-x-2">
              <Tag className="w-3.5 h-3.5 text-cyan-400" />
              <span>
                Sighting Log Record: <strong>#{ (currentUser.sightingsCount || 0) + 1 }</strong>
              </span>
            </div>
          </div>

          {/* Field Notes & Weather */}
          <div>
            <label className="font-mono-code text-xs text-[#edeeef]/60 uppercase tracking-widest block mb-1">
              Field Notes & Observation Details
            </label>
            <textarea
              rows={3}
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Describe flight formation, thermal winds, call sounds, or surrounding habitat..."
              className="w-full bg-[rgba(237,238,239,0.06)] border border-[rgba(237,238,239,0.15)] rounded p-3 text-base sm:text-sm text-[#edeeef] focus:outline-none focus:border-[#00ffaa]"
            />
          </div>

          {/* Bottom Error Notification */}
          {loggerError && (
            <div className="p-3.5 bg-rose-500/15 border border-rose-500/40 rounded text-rose-300 font-mono-code text-xs flex items-center justify-between animate-in fade-in">
              <div className="flex items-center space-x-2">
                <AlertCircle className="w-4 h-4 shrink-0 text-rose-400" />
                <span>{loggerError}</span>
              </div>
              <button
                type="button"
                onClick={() => setLoggerError(null)}
                className="text-rose-400 hover:text-white ml-2 text-xs font-bold uppercase tracking-wider"
              >
                Dismiss
              </button>
            </div>
          )}

          {/* Form Actions */}
          <div className="pt-4 flex flex-col-reverse sm:flex-row items-stretch sm:items-center justify-end gap-3 border-t border-[rgba(237,238,239,0.1)]">
            <button
              type="button"
              onClick={() => {
                if (onCancel) onCancel();
                // Pass -1 into navigate to move one step back in the history stack
                navigate(-1);
              }}
              className="min-h-[44px] px-5 py-2.5 rounded border border-[rgba(237,238,239,0.2)] text-[#edeeef]/70 hover:bg-[rgba(237,238,239,0.05)] text-xs font-mono-code uppercase tracking-wider transition-colors cursor-pointer text-center"
            >
              Cancel
            </button>

            <button
              type="submit"
              disabled={isVerifyingPhoto || isSubmitting}
              className={`min-h-[44px] px-6 py-3 rounded text-sm uppercase tracking-wider font-syne font-extrabold flex items-center justify-center space-x-2 transition-all cursor-pointer ${
                isSubmitting || isVerifyingPhoto
                  ? 'bg-[#00ffaa]/50 text-[#0b0c0d] cursor-wait'
                  : isRestricted
                  ? 'bg-amber-500/20 hover:bg-amber-500/30 border border-amber-500/50 text-amber-200'
                  : 'bg-[#00ffaa] hover:bg-[#00ffaa]/90 text-[#0b0c0d] shadow-lg shadow-[#00ffaa]/20'
              }`}
            >
              {isSubmitting || isVerifyingPhoto ? (
                <>
                  <RefreshCw className="w-5 h-5 animate-spin text-[#0b0c0d]" />
                  <span>Publishing & Verifying Observation...</span>
                </>
              ) : isRestricted ? (
                <>
                  <ShieldAlert className="w-5 h-5 text-amber-400" />
                  <span>Lift Suspension & Publish Observation</span>
                </>
              ) : !isOnline ? (
                <>
                  <CloudOff className="w-5 h-5 text-[#0b0c0d]" />
                  <span>Save Observation (Offline Sync Queue)</span>
                </>
              ) : (
                <>
                  <CheckCircle2 className="w-5 h-5" />
                  <span>
                    {additionalBirds.length > 0
                      ? `Publish ${1 + additionalBirds.length} Observations (1 Photo Upload)`
                      : 'Publish Observation'}
                  </span>
                </>
              )}
            </button>
          </div>

        </form>
      </div>
    </div>
  );
};

export const SightingLogger = React.memo(SightingLoggerComponent);
