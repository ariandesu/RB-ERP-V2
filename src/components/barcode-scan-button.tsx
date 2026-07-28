"use client";

import { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import BarcodeScanner from "@/components/barcode-scanner";
import { useBarcodeInput } from "@/hooks/use-barcode-input";
import { QrCode, Scan } from "lucide-react";

interface BarcodeScanButtonProps {
  onScan: (code: string) => void;
  label?: string;
}

export default function BarcodeScanButton({
  onScan,
  label = "Scan",
}: BarcodeScanButtonProps) {
  const [open, setOpen] = useState(false);

  const handleScan = (code: string) => {
    onScan(code);
    setOpen(false);
  };

  // Listen for hardware scanner input when dialog is open
  useBarcodeInput({
    onScan: handleScan,
    enabled: open,
  });

  return (
    <>
      <Button
        type="button"
        variant="outline"
        size="sm"
        onClick={() => setOpen(true)}
        className="cursor-pointer shrink-0"
        title="Scan barcode with camera"
      >
        <QrCode className="w-4 h-4 mr-1" />
        {label}
      </Button>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Scan className="w-5 h-5" />
              Scan Barcode
            </DialogTitle>
          </DialogHeader>
          <div className="flex flex-col items-center gap-4 py-4">
            <BarcodeScanner onScan={handleScan} />
            <p className="text-xs text-slate-500 text-center">
              Point your camera at a barcode or QR code.
              <br />
              USB/Bluetooth scanners also work automatically.
            </p>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
