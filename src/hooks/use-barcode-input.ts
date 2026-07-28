"use client";

import { useEffect, useRef, useCallback } from "react";

type BarcodeCallback = (code: string) => void;

interface UseBarcodeInputOptions {
  onScan: BarcodeCallback;
  minLength?: number;
  timeThreshold?: number;
  enabled?: boolean;
}

export function useBarcodeInput({
  onScan,
  minLength = 3,
  timeThreshold = 50,
  enabled = true,
}: UseBarcodeInputOptions) {
  const bufferRef = useRef<string>("");
  const lastKeyTimeRef = useRef<number>(0);

  const handleKeyDown = useCallback(
    (e: KeyboardEvent) => {
      // Ignore if user is typing in an input field (the barcode scanner acts as keyboard too)
      const target = e.target as HTMLElement;
      if (target.tagName === "INPUT" || target.tagName === "TEXTAREA" || target.isContentEditable) {
        return;
      }

      const now = Date.now();
      const timeSinceLast = now - lastKeyTimeRef.current;

      if (e.key === "Enter") {
        const code = bufferRef.current.trim();
        if (code.length >= minLength) {
          onScan(code);
        }
        bufferRef.current = "";
        lastKeyTimeRef.current = now;
        e.preventDefault();
        return;
      }

      // If characters arrive faster than threshold, it's likely a scanner
      if (timeSinceLast < timeThreshold || bufferRef.current.length === 0) {
        if (e.key.length === 1) {
          bufferRef.current += e.key;
          lastKeyTimeRef.current = now;
          e.preventDefault();
        }
      } else {
        // Slow typing — reset buffer
        bufferRef.current = "";
      }
    },
    [onScan, minLength, timeThreshold]
  );

  useEffect(() => {
    if (!enabled) return;
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [handleKeyDown, enabled]);
}
