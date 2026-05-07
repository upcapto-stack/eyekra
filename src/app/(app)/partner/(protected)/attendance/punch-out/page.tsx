'use client';

import Image from 'next/image';
import { useRouter } from 'next/navigation';
import { useCallback, useEffect, useRef, useState } from 'react';
import { PartnerShell } from '@/modules/hrms/components/PartnerShell';

type Coords = {
  lat: number;
  lng: number;
  accuracy?: number;
};

export default function PartnerPunchOutPage() {
  const router = useRouter();
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const [selfieDataUrl, setSelfieDataUrl] = useState('');
  const [cameraOpen, setCameraOpen] = useState(false);
  const [cameraReady, setCameraReady] = useState(false);
  const [autoSubmitAfterCapture, setAutoSubmitAfterCapture] = useState(false);
  const [cameraError, setCameraError] = useState('');
  const [location, setLocation] = useState<Coords | null>(null);
  const [locationState, setLocationState] = useState<'idle' | 'fetching' | 'ready' | 'error'>('idle');
  const [geofenceState, setGeofenceState] = useState<'idle' | 'verifying' | 'ready' | 'error'>('idle');
  const [locationError, setLocationError] = useState('');
  const [geofenceMessage, setGeofenceMessage] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [showSuccess, setShowSuccess] = useState(false);
  const [status, setStatus] = useState('');

  const fetchLocation = useCallback(() => {
    if (!navigator.geolocation) {
      setLocationState('error');
      setLocationError('Geolocation is not supported on this device.');
      return Promise.resolve<Coords | null>(null);
    }
    setLocationState('fetching');
    setLocationError('');
    return new Promise<Coords | null>((resolve) => {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          const nextLocation = {
            lat: position.coords.latitude,
            lng: position.coords.longitude,
            accuracy: position.coords.accuracy,
          };
          setLocation(nextLocation);
          setLocationState('ready');
          resolve(nextLocation);
        },
        (error) => {
          setLocationState('error');
          setLocationError(error.message || 'Unable to fetch location.');
          resolve(null);
        },
        { enableHighAccuracy: true, timeout: 15000, maximumAge: 0 },
      );
    });
  }, []);

  const verifyGeofence = useCallback(async (lat: number, lng: number) => {
    setGeofenceState('verifying');
    setGeofenceMessage('Verifying geofence...');
    try {
      const res = await fetch('/api/partner/attendance/punch-out', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({
          selfieUrl: '__preview__',
          liveness: true,
          previewOnly: true,
          geo: { lat, lng },
        }),
      });
      const data = (await res.json().catch(() => ({}))) as { error?: string };
      if (!res.ok) {
        setGeofenceState('error');
        setGeofenceMessage(data.error || 'Geofence check failed');
        return false;
      }
      setGeofenceState('ready');
      setGeofenceMessage('Geofence verified');
      return true;
    } catch {
      setGeofenceState('error');
      setGeofenceMessage('Unable to verify geofence');
      return false;
    }
  }, []);

  useEffect(() => {
    void fetchLocation();
  }, [fetchLocation]);

  useEffect(() => {
    return () => {
      if (streamRef.current) {
        streamRef.current.getTracks().forEach((t) => t.stop());
        streamRef.current = null;
      }
    };
  }, []);

  const closeCamera = () => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((t) => t.stop());
      streamRef.current = null;
    }
    if (videoRef.current) {
      videoRef.current.srcObject = null;
    }
    setCameraOpen(false);
    setCameraReady(false);
    setAutoSubmitAfterCapture(false);
  };

  const waitForVideoElement = async () => {
    for (let i = 0; i < 40; i += 1) {
      if (videoRef.current) return videoRef.current;
      await new Promise((r) => setTimeout(r, 50));
    }
    return null;
  };

  const waitForVideoReady = async (video: HTMLVideoElement) => {
    const startedAt = Date.now();
    while (Date.now() - startedAt < 5000) {
      if (video.readyState >= 2 && video.videoWidth > 0 && video.videoHeight > 0) {
        return true;
      }
      await new Promise((r) => setTimeout(r, 100));
    }
    return false;
  };

  const openCamera = async () => {
    if (!navigator.mediaDevices?.getUserMedia) {
      setCameraError('Camera is not supported on this device/browser.');
      return false;
    }
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((t) => t.stop());
      streamRef.current = null;
    }
    try {
      setCameraError('');
      const cameraProfiles: MediaStreamConstraints[] = [
        { video: { facingMode: { ideal: 'user' }, width: { ideal: 720 }, height: { ideal: 1280 } }, audio: false },
        { video: { facingMode: 'user' }, audio: false },
        { video: true, audio: false },
      ];

      for (const profile of cameraProfiles) {
        try {
          const stream = await navigator.mediaDevices.getUserMedia(profile);
          streamRef.current = stream;
          setCameraOpen(true);
          setCameraReady(false);

          const video = await waitForVideoElement();
          if (!video) {
            stream.getTracks().forEach((t) => t.stop());
            streamRef.current = null;
            continue;
          }

          video.srcObject = stream;
          video.muted = true;
          video.playsInline = true;
          try {
            await video.play();
          } catch {
            // continue to readiness wait; some devices still start playback slightly later
          }

          const ready = await waitForVideoReady(video);
          if (ready) {
            setCameraReady(true);
            return true;
          }

          stream.getTracks().forEach((t) => t.stop());
          streamRef.current = null;
          if (videoRef.current) {
            videoRef.current.srcObject = null;
          }
        } catch {
          // try next profile
        }
      }
      setCameraError('Camera failed to initialize. Please check camera permission and try again.');
      return false;
    } catch {
      setCameraError('Camera permission denied. Please allow camera access.');
      return false;
    }
  };

  const captureSelfie = () => {
    const video = videoRef.current;
    if (!video || video.videoWidth === 0 || video.videoHeight === 0) {
      setCameraError('Camera is not ready yet. Try again.');
      return;
    }
    const canvas = document.createElement('canvas');
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    const ctx = canvas.getContext('2d');
    if (!ctx) {
      setCameraError('Unable to capture image.');
      return;
    }
    ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
    const captured = canvas.toDataURL('image/jpeg', 0.92);
    setSelfieDataUrl(captured);
    closeCamera();
    setStatus('Selfie captured.');
    if (autoSubmitAfterCapture && location) {
      void submitFinalPunchOut(captured, location);
    }
  };

  const submitFinalPunchOut = async (capturedSelfie: string, currentLocation: Coords) => {
    setSubmitting(true);
    setStatus('Submitting...');
    try {
      const res = await fetch('/api/partner/attendance/punch-out', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({
          selfieUrl: capturedSelfie,
          liveness: true,
          geo: { lat: currentLocation.lat, lng: currentLocation.lng },
        }),
      });
      const data = (await res.json().catch(() => ({}))) as { error?: string };
      if (res.ok) {
        setShowSuccess(true);
        setStatus('Punch-out successful');
        setTimeout(() => {
          router.push('/partner');
        }, 1200);
      } else {
        setStatus(data.error || 'Punch-out failed');
      }
    } catch {
      setStatus('Network error while punching out.');
    } finally {
      setSubmitting(false);
      setAutoSubmitAfterCapture(false);
    }
  };

  const submit = async () => {
    if (submitting) return;

    let currentLocation = location;
    if (!currentLocation) {
      currentLocation = await fetchLocation();
      if (!currentLocation) {
        setStatus('Location permission is required for punch-out.');
      }
    }

    if (!currentLocation) return;

    if (geofenceState !== 'ready') {
      const ok = await verifyGeofence(currentLocation.lat, currentLocation.lng);
      if (!ok) {
        setStatus('You are outside the allowed location boundary.');
        return;
      }
    }

    if (!selfieDataUrl) {
      setAutoSubmitAfterCapture(true);
      const opened = await openCamera();
      setStatus(opened ? 'Camera opened. Capture your selfie.' : 'Unable to open camera.');
      return;
    }
    await submitFinalPunchOut(selfieDataUrl, currentLocation);
  };

  const ctaLabel =
    submitting
      ? 'Punching Out...'
      : locationState === 'fetching'
        ? 'Detecting Location...'
        : geofenceState === 'verifying'
          ? 'Verifying Geofence...'
          : !selfieDataUrl
            ? 'Start Punch Out'
            : 'Punch Out';

  return (
    <PartnerShell title="Punch Out" description="One-tap shift closure with auto geo and selfie verification.">
      <div className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-slate-900 via-slate-800 to-slate-700 p-[1px] shadow-[0_28px_65px_rgba(15,23,42,0.35)]">
        <div className="rounded-3xl bg-white/95 dark:bg-slate-900/95 backdrop-blur-md p-5 space-y-4">
          <div className="rounded-2xl border border-white/40 bg-white/70 dark:bg-slate-800/70 p-4 shadow-[0_12px_35px_rgba(15,23,42,0.15)]">
            <p className="text-sm font-semibold text-slate-900 dark:text-slate-100">End shift smoothly</p>
            <p className="text-xs text-slate-600 dark:text-slate-300 mt-1">
              We verify your live location and selfie before marking you offline.
            </p>
          </div>

          <div className="rounded-2xl border border-slate-200 dark:border-slate-700 bg-white/80 dark:bg-slate-800/80 p-3 text-xs text-slate-700 dark:text-slate-200 space-y-1">
            <p>{location?.accuracy ? `GPS accuracy: +/-${Math.round(location.accuracy)}m` : 'GPS accuracy: pending'}</p>
            <p>Geofence: {geofenceState === 'ready' ? 'Verified' : geofenceState === 'error' ? 'Not verified' : 'Pending'}</p>
          </div>

          {geofenceMessage ? <p className="text-xs text-slate-600 dark:text-slate-300">{geofenceMessage}</p> : null}
          {locationError ? <p className="text-xs text-rose-600 dark:text-rose-300">{locationError}</p> : null}

          {selfieDataUrl ? (
            <div className="rounded-2xl border border-slate-200 dark:border-slate-700 p-2 w-fit bg-white dark:bg-slate-800">
              <Image src={selfieDataUrl} alt="Selfie preview" width={128} height={128} unoptimized className="h-32 w-32 object-cover rounded-xl" />
            </div>
          ) : null}

          <button
            type="button"
            className={`common-btn common-btn--primary w-full min-h-12 text-base ${
              geofenceState === 'ready' && selfieDataUrl && !submitting ? 'animate-pulse' : ''
            }`}
            onClick={submit}
            disabled={submitting}
          >
            {ctaLabel}
          </button>
          {status ? <p className="text-sm text-slate-700 dark:text-slate-200">{status}</p> : null}
          {cameraError ? <p className="text-xs text-rose-600 dark:text-rose-300">{cameraError}</p> : null}
        </div>
      </div>

      {cameraOpen ? (
        <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="w-full max-w-sm rounded-3xl bg-white dark:bg-slate-900 p-4 border border-slate-200 dark:border-slate-700 space-y-3">
            <p className="text-sm font-semibold text-slate-900 dark:text-slate-100">Capture Selfie</p>
            <video ref={videoRef} autoPlay playsInline muted className="w-full rounded-2xl bg-black aspect-[3/4] object-cover" />
            <div className="grid grid-cols-2 gap-2">
              <button type="button" className="common-btn common-btn--secondary w-full" onClick={closeCamera}>
                Cancel
              </button>
              <button type="button" className="common-btn common-btn--primary w-full" onClick={captureSelfie} disabled={!cameraReady}>
                {cameraReady ? 'Capture' : 'Camera warming...'}
              </button>
            </div>
          </div>
        </div>
      ) : null}

      {showSuccess ? (
        <div className="fixed inset-0 z-40 bg-black/45 backdrop-blur-sm flex items-center justify-center px-6">
          <div className="w-full max-w-xs rounded-3xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 p-5 text-center shadow-2xl">
            <p className="text-lg font-bold text-slate-900 dark:text-slate-100">You are Offline</p>
            <p className="text-sm text-slate-600 dark:text-slate-300 mt-1">Punch-out successful. Redirecting to dashboard...</p>
          </div>
        </div>
      ) : null}
    </PartnerShell>
  );
}
