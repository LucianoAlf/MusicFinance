import React, { useState, useRef, useCallback } from "react";
import Cropper, { Area } from "react-easy-crop";
import { Modal } from "./Modal";
import { Camera, Trash2 } from "lucide-react";
import { cn } from "../../lib/utils";

interface AvatarUploaderProps {
  currentUrl?: string;
  fallbackUrl: string;
  onCropped: (blob: Blob) => void;
  onRemove?: () => void;
  size?: number;
}

async function getCroppedImg(imageSrc: string, pixelCrop: Area): Promise<Blob> {
  const image = new Image();
  image.crossOrigin = "anonymous";
  await new Promise<void>((resolve, reject) => {
    image.onload = () => resolve();
    image.onerror = reject;
    image.src = imageSrc;
  });

  const canvas = document.createElement("canvas");
  const outputSize = 256;
  canvas.width = outputSize;
  canvas.height = outputSize;
  const ctx = canvas.getContext("2d")!;

  ctx.drawImage(
    image,
    pixelCrop.x,
    pixelCrop.y,
    pixelCrop.width,
    pixelCrop.height,
    0,
    0,
    outputSize,
    outputSize
  );

  return new Promise((resolve, reject) => {
    canvas.toBlob(
      (blob) => (blob ? resolve(blob) : reject(new Error("Canvas toBlob failed"))),
      "image/jpeg",
      0.9
    );
  });
}

export const AvatarUploader: React.FC<AvatarUploaderProps> = ({
  currentUrl,
  fallbackUrl,
  onCropped,
  onRemove,
  size = 80,
}) => {
  const [imageSrc, setImageSrc] = useState<string | null>(null);
  const [crop, setCrop] = useState({ x: 0, y: 0 });
  const [zoom, setZoom] = useState(1);
  const [croppedAreaPixels, setCroppedAreaPixels] = useState<Area | null>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  const displayUrl = preview || currentUrl || fallbackUrl;
  const hasPhoto = !!(preview || currentUrl);

  const onCropComplete = useCallback((_: Area, croppedPixels: Area) => {
    setCroppedAreaPixels(croppedPixels);
  }, []);

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      setImageSrc(reader.result as string);
      setCrop({ x: 0, y: 0 });
      setZoom(1);
    };
    reader.readAsDataURL(file);
    e.target.value = "";
  };

  const handleConfirmCrop = async () => {
    if (!imageSrc || !croppedAreaPixels) return;
    const blob = await getCroppedImg(imageSrc, croppedAreaPixels);
    const url = URL.createObjectURL(blob);
    setPreview(url);
    onCropped(blob);
    setImageSrc(null);
  };

  const handleRemove = () => {
    setPreview(null);
    onRemove?.();
  };

  return (
    <>
      <div className="flex flex-col items-center gap-2">
        <div
          className="relative group cursor-pointer"
          style={{ width: size, height: size }}
          onClick={() => fileRef.current?.click()}
        >
          <img
            src={displayUrl}
            alt="Avatar"
            className="w-full h-full rounded-full object-cover border-2 border-border-secondary"
          />
          <div className={cn(
            "absolute inset-0 rounded-full flex items-center justify-center transition-opacity",
            "bg-black/50 opacity-0 group-hover:opacity-100"
          )}>
            <Camera size={20} className="text-white" />
          </div>
          <input
            ref={fileRef}
            type="file"
            accept="image/*"
            className="hidden"
            onChange={handleFileSelect}
          />
        </div>
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => fileRef.current?.click()}
            className="text-[10px] text-text-secondary hover:text-text-primary transition-colors bg-transparent border-none cursor-pointer p-0"
          >
            {hasPhoto ? "Trocar foto" : "Adicionar foto"}
          </button>
          {hasPhoto && onRemove && (
            <button
              type="button"
              onClick={handleRemove}
              className="text-[10px] text-text-tertiary hover:text-accent-red transition-colors bg-transparent border-none cursor-pointer p-0 flex items-center gap-0.5"
            >
              <Trash2 size={10} /> Remover
            </button>
          )}
        </div>
      </div>

      <Modal
        open={!!imageSrc}
        onOpenChange={(v) => { if (!v) setImageSrc(null); }}
        title="Ajustar Foto"
        size="md"
      >
        {imageSrc && (
          <div className="space-y-4">
            <div className="relative w-full" style={{ height: 320 }}>
              <Cropper
                image={imageSrc}
                crop={crop}
                zoom={zoom}
                aspect={1}
                cropShape="round"
                showGrid={false}
                onCropChange={setCrop}
                onZoomChange={setZoom}
                onCropComplete={onCropComplete}
              />
            </div>
            <div className="flex items-center gap-3 px-2">
              <span className="text-[10px] text-text-tertiary uppercase tracking-wider font-semibold whitespace-nowrap">Zoom</span>
              <input
                type="range"
                min={1}
                max={3}
                step={0.05}
                value={zoom}
                onChange={(e) => setZoom(Number(e.target.value))}
                className="flex-1 h-1.5 rounded-full appearance-none cursor-pointer bg-border-secondary accent-accent-blue"
              />
            </div>
            <div className="flex gap-2">
              <button
                onClick={() => setImageSrc(null)}
                className="flex-1 py-2.5 rounded-lg text-xs font-medium border-none cursor-pointer bg-surface-tertiary text-text-secondary hover:text-text-primary"
              >
                Cancelar
              </button>
              <button
                onClick={handleConfirmCrop}
                className="flex-1 py-2.5 rounded-lg bg-primary-btn-bg text-primary-btn-text text-xs font-semibold hover:opacity-90 transition-opacity border-none cursor-pointer"
              >
                Confirmar
              </button>
            </div>
          </div>
        )}
      </Modal>
    </>
  );
};
