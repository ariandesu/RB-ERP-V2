"use client";

import { useEffect, useRef, useState } from "react";
import { Html5Qrcode } from "html5-qrcode";
import { Button } from "@/components/ui/button";
import { Camera, CameraOff } from "lucide-react";

interface BarcodeScannerProps {
  onScan: (code: string) => void;
}

export default function BarcodeScanner({ onScan }: BarcodeScannerProps) {
  const [scanning, setScanning] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const scannerRef = useRef<Html5Qrcode | null>(null);
  const containerId = "barcode-scanner-region";

  useEffect(() => {
    return () => {
      // Cleanup on unmount
      if (scannerRef.current) {
        scannerRef.current.stop().catch(() => {});
        scannerRef.current = null;
      }
    };
  }, []);

  const startScanning = async () => {
    setError(null);
    setScanning(true);

    try {
      const scanner = new Html5Qrcode(containerId, { verbose: false });
      scannerRef.current = scanner;

      await scanner.start(
        { facingMode: "environment" },
        {
          fps: 10,
          qrbox: { width: 400, height: 150 },
          aspectRatio: 2.5,
        },
        (decodedText) => {
          // Successful scan
          onScan(decodedText);
          scanner
            .stop()
            .then(() => {
              setScanning(false);
              scannerRef.current = null;
            })
            .catch(() => {});
        },
        () => {
          // QR code not found (keep scanning)
        }
      );
    } catch (err: any) {
      console.error("Barcode scanner error:", err);
      setError(err.message || "Failed to start camera. Check permissions.");
      setScanning(false);
    }
  };

  const stopScanning = async () => {
    if (scannerRef.current) {
      try {
        await scannerRef.current.stop();
      } catch {}
      scannerRef.current = null;
    }
    setScanning(false);
    setError(null);
  };

  return (
    <div className="space-y-3">
      <div id={containerId} className={scanning ? "block" : "hidden"} />

      {error && (
        <div className="text-xs text-red-600 bg-red-50 border border-red-200 rounded-lg p-3">
          {error}
        </div>
      )}

      <div className="flex gap-2">
        {!scanning ? (
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={startScanning}
            className="cursor-pointer"
          >
            <Camera className="w-4 h-4 mr-1.5" />
            Scan Barcode
          </Button>
        ) : (
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={stopScanning}
            className="cursor-pointer"
          >
            <CameraOff className="w-4 h-4 mr-1.5" />
            Stop Scanner
          </Button>
        )}
      </div>
    </div>
  );
}
