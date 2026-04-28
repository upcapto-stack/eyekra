'use client';

import { useEffect, useRef, useState } from 'react';
import { loadGooglePlacesScript, initAddressAutocomplete } from '@/lib/google-places';

interface AddressAutocompleteInputProps {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  className?: string;
  id?: string;
  disabled?: boolean;
}

/**
 * Address input with Google Places Autocomplete (Google wala address).
 * Falls back to plain text input if API key is not set.
 */
export function AddressAutocompleteInput({
  value,
  onChange,
  placeholder = 'Search address or enter manually',
  className,
  id,
  disabled,
}: AddressAutocompleteInputProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [scriptLoaded, setScriptLoaded] = useState(false);
  const onChangeRef = useRef(onChange);
  onChangeRef.current = onChange;

  useEffect(() => {
    loadGooglePlacesScript().then(setScriptLoaded);
  }, []);

  useEffect(() => {
    if (!scriptLoaded || !inputRef.current) return;
    const cleanup = initAddressAutocomplete(inputRef.current, (formattedAddress) => {
      onChangeRef.current(formattedAddress);
    });
    return () => {
      if (typeof cleanup === 'function') cleanup();
    };
  }, [scriptLoaded]);

  return (
    <input
      ref={inputRef}
      type="text"
      id={id}
      value={value}
      onChange={(e) => onChange(e.target.value)}
      placeholder={placeholder}
      className={className}
      disabled={disabled}
      autoComplete="off"
      aria-autocomplete="list"
      aria-label="Address"
    />
  );
}
