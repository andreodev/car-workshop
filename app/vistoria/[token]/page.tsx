"use client";

import { use, useEffect, useMemo, useRef, useState } from "react";
import {
  Camera,
  CheckCircle2,
  ImageIcon,
  Loader2,
  Square,
  UploadCloud,
  X,
} from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";

type InspectionPhoto = {
  id: string;
  url: string;
  filename: string;
  contentType: string;
  size: number;
  caption: string | null;
  createdAt: string;
};

type VehicleInspection = {
  id: string;
  token: string;
  status: "PENDENTE" | "CONCLUIDA";
  notes: string | null;
  completedAt: string | null;
  createdAt: string;
  photos: InspectionPhoto[];
  serviceOrder: {
    id: string;
    code: number;
    entryAt: string;
    client: { name: string } | null;
    vehicle: {
      plate: string;
      brand: string | null;
      model: string | null;
      version: string | null;
      color: string | null;
    } | null;
  };
};

type PendingPhoto = {
  file: File;
  takenAt: Date;
};

type InspectionPageProps = {
  params: Promise<{
    token: string;
  }>;
};

function formatDateTime(value: string | null) {
  if (!value) {
    return "-";
  }

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return "-";
  }

  return `${date.toLocaleDateString("pt-BR")} ${date.toLocaleTimeString("pt-BR", {
    hour: "2-digit",
    minute: "2-digit",
  })}`;
}

function buildVehicleLabel(inspection: VehicleInspection) {
  const vehicle = inspection.serviceOrder.vehicle;
  if (!vehicle) {
    return "-";
  }

  return [vehicle.plate, vehicle.brand, vehicle.model, vehicle.version]
    .filter(Boolean)
    .join(" - ");
}

function formatPhotoTakenAt(value: Date | string) {
  const date = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(date.getTime())) {
    return "-";
  }

  return `Foto tirada em ${date.toLocaleString("pt-BR", {
    dateStyle: "short",
    timeStyle: "short",
  })}`;
}

async function parseResponse<T>(response: Response): Promise<T> {
  const text = await response.text();
  const json = text ? (JSON.parse(text) as T & { error?: string }) : null;

  if (!response.ok) {
    throw new Error(json?.error ?? "Não foi possível processar a vistoria.");
  }

  return json as T;
}

export default function VehicleInspectionPage({ params }: InspectionPageProps) {
  const { token } = use(params);
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const cameraStreamRef = useRef<MediaStream | null>(null);
  const [inspection, setInspection] = useState<VehicleInspection | null>(null);
  const [notes, setNotes] = useState("");
  const [photos, setPhotos] = useState<PendingPhoto[]>([]);
  const [cameraStream, setCameraStream] = useState<MediaStream | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isUploading, setIsUploading] = useState(false);
  const [isStartingCamera, setIsStartingCamera] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  useEffect(() => {
    let isMounted = true;

    async function loadInspection() {
      try {
        setIsLoading(true);
        const response = await fetch(`/api/vehicle-inspections/${token}`);
        const data = await parseResponse<VehicleInspection>(response);

        if (isMounted) {
          setInspection(data);
          setNotes(data.notes ?? "");
          setError(null);
        }
      } catch (loadError) {
        if (isMounted) {
          setError(
            loadError instanceof Error
              ? loadError.message
              : "Não foi possível carregar a vistoria."
          );
        }
      } finally {
        if (isMounted) {
          setIsLoading(false);
        }
      }
    }

    loadInspection();

    return () => {
      isMounted = false;
    };
  }, [token]);

  const previews = useMemo(
    () =>
      photos.map((photo) => ({
        name: photo.file.name,
        takenAt: photo.takenAt,
        url: URL.createObjectURL(photo.file),
      })),
    [photos]
  );

  useEffect(() => {
    return () => {
      previews.forEach((preview) => URL.revokeObjectURL(preview.url));
    };
  }, [previews]);

  useEffect(() => {
    if (!videoRef.current || !cameraStream) {
      return;
    }

    videoRef.current.srcObject = cameraStream;
    void videoRef.current.play().catch(() => undefined);
  }, [cameraStream]);

  useEffect(() => {
    return () => {
      cameraStreamRef.current?.getTracks().forEach((track) => track.stop());
    };
  }, []);

  async function startCamera() {
    if (!navigator.mediaDevices?.getUserMedia) {
      setError("Este navegador não permite usar a câmera nesta tela.");
      return;
    }

    try {
      setIsStartingCamera(true);
      setError(null);

      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: { ideal: "environment" } },
        audio: false,
      });

      cameraStreamRef.current = stream;
      setCameraStream(stream);
    } catch (cameraError) {
      setError(
        cameraError instanceof Error
          ? "Não foi possível acessar a câmera. Verifique a permissão do navegador."
          : "Não foi possível acessar a câmera."
      );
    } finally {
      setIsStartingCamera(false);
    }
  }

  function stopCamera() {
    cameraStreamRef.current?.getTracks().forEach((track) => track.stop());
    cameraStreamRef.current = null;
    setCameraStream(null);
  }

  async function capturePhoto() {
    const video = videoRef.current;

    if (!video || !video.videoWidth || !video.videoHeight) {
      setError("A câmera ainda não está pronta para capturar.");
      return;
    }

    const canvas = document.createElement("canvas");
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;

    const context = canvas.getContext("2d");
    if (!context) {
      setError("Não foi possível capturar a foto.");
      return;
    }

    context.drawImage(video, 0, 0, canvas.width, canvas.height);

    const blob = await new Promise<Blob | null>((resolve) => {
      canvas.toBlob(resolve, "image/jpeg", 0.92);
    });

    if (!blob) {
      setError("Não foi possível gerar a imagem da câmera.");
      return;
    }

    const filename = `vistoria-${new Date().toISOString().replace(/[:.]/g, "-")}.jpg`;
    const photo = new File([blob], filename, { type: "image/jpeg" });
    setPhotos((currentPhotos) => [
      ...currentPhotos,
      {
        file: photo,
        takenAt: new Date(),
      },
    ]);
    setSuccess("Foto capturada e pronta para salvar.");
  }

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (!photos.length) {
      setError("Selecione ao menos uma foto do veículo.");
      return;
    }

    const formData = new FormData();
    formData.set("notes", notes);
    photos.forEach((photo) => {
      formData.append("photos", photo.file);
      formData.append("photoTakenAt", photo.takenAt.toISOString());
    });

    try {
      setIsUploading(true);
      setError(null);
      setSuccess(null);

      const response = await fetch(`/api/vehicle-inspections/${token}`, {
        method: "POST",
        body: formData,
      });
      const data = await parseResponse<VehicleInspection>(response);

      setInspection(data);
      setNotes(data.notes ?? "");
      setPhotos([]);
      setSuccess("Fotos da vistoria salvas.");
    } catch (uploadError) {
      setError(
        uploadError instanceof Error
          ? uploadError.message
          : "Não foi possível enviar as fotos."
      );
    } finally {
      setIsUploading(false);
    }
  }

  if (isLoading) {
    return (
      <main className="flex min-h-screen items-center justify-center px-4">
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <Loader2 className="size-4 animate-spin" />
          Carregando vistoria...
        </div>
      </main>
    );
  }

  if (!inspection) {
    return (
      <main className="flex min-h-screen items-center justify-center px-4">
        <div className="w-full max-w-md rounded-lg border bg-card p-5 text-sm text-destructive">
          {error ?? "Vistoria não encontrada."}
        </div>
      </main>
    );
  }

  const hasPhotos = inspection.photos.length > 0;
  const statusLabel = inspection.status === "CONCLUIDA" ? "Concluída" : "Pendente";
  const vehicleColor = inspection.serviceOrder.vehicle?.color;

  return (
    <main className="min-h-screen bg-background">
      <section className="border-b border-border bg-secondary text-secondary-foreground">
        <div className="mx-auto flex w-full max-w-5xl flex-col gap-5 px-4 py-6 md:flex-row md:items-end md:justify-between">
          <div className="space-y-2">
            <p className="text-xs uppercase text-secondary-foreground/70">
              Vistoria de entrada
            </p>
            <h1 className="text-2xl font-semibold">OS #{inspection.serviceOrder.code}</h1>
            <p className="max-w-2xl text-sm text-secondary-foreground/80">
              {buildVehicleLabel(inspection)}
            </p>
          </div>
          <Badge
            variant={inspection.status === "CONCLUIDA" ? "default" : "secondary"}
            className="w-fit border border-secondary-foreground/20"
          >
            {statusLabel}
          </Badge>
        </div>
      </section>

      <section className="mx-auto grid w-full max-w-5xl gap-5 px-4 py-6 lg:grid-cols-[1fr_360px]">
        <div className="space-y-5">
          <section className="grid gap-3 rounded-lg border bg-card p-4 sm:grid-cols-2">
            <div>
              <p className="text-xs text-muted-foreground">Cliente</p>
              <p className="text-sm font-semibold">{inspection.serviceOrder.client?.name ?? "-"}</p>
            </div>
            <div>
              <p className="text-xs text-muted-foreground">Entrada</p>
              <p className="text-sm font-semibold">{formatDateTime(inspection.serviceOrder.entryAt)}</p>
            </div>
            <div>
              <p className="text-xs text-muted-foreground">Veículo</p>
              <p className="text-sm font-semibold">{buildVehicleLabel(inspection)}</p>
            </div>
            <div>
              <p className="text-xs text-muted-foreground">Cor</p>
              <p className="text-sm font-semibold">{vehicleColor ?? "-"}</p>
            </div>
          </section>

          <form className="space-y-4 rounded-lg border bg-card p-4" onSubmit={handleSubmit}>
            <div className="flex items-start justify-between gap-3">
              <div>
                <h2 className="text-base font-semibold">Fotos do veículo</h2>
                <p className="text-xs text-muted-foreground">
                  Registre lataria, rodas, interior, painel e avarias visíveis.
                </p>
              </div>
              <Camera className="size-5 text-muted-foreground" />
            </div>

            <div className="grid gap-2">
              <Label htmlFor="photos">Selecionar fotos</Label>
              <Input
                id="photos"
                type="file"
                accept="image/*"
                capture="environment"
                multiple
                className="h-11 cursor-pointer"
                onChange={(event) =>
                  setPhotos(
                    Array.from(event.target.files ?? []).map((file) => ({
                      file,
                      takenAt: new Date(file.lastModified || Date.now()),
                    }))
                  )
                }
              />
            </div>

            <div className="space-y-3 rounded-lg border bg-muted/30 p-3">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div>
                  <p className="text-sm font-semibold">Câmera</p>
                  <p className="text-xs text-muted-foreground">
                    Use a webcam no desktop ou a câmera do aparelho.
                  </p>
                </div>
                {cameraStream ? (
                  <Button type="button" variant="outline" size="sm" className="gap-2" onClick={stopCamera}>
                    <X className="size-3.5" />
                    Fechar
                  </Button>
                ) : (
                  <Button
                    type="button"
                    variant="secondary"
                    size="sm"
                    className="gap-2"
                    disabled={isStartingCamera}
                    onClick={startCamera}
                  >
                    {isStartingCamera ? (
                      <Loader2 className="size-3.5 animate-spin" />
                    ) : (
                      <Camera className="size-3.5" />
                    )}
                    Abrir câmera
                  </Button>
                )}
              </div>

              {cameraStream ? (
                <div className="space-y-3">
                  <video
                    ref={videoRef}
                    muted
                    playsInline
                    className="aspect-video w-full rounded-lg bg-black object-cover"
                  />
                  <Button type="button" variant="default" className="w-full gap-2" onClick={capturePhoto}>
                    <Square className="size-3.5" />
                    Capturar foto
                  </Button>
                </div>
              ) : null}
            </div>

            {previews.length ? (
              <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
                {previews.map((preview) => (
                  <div key={preview.url} className="overflow-hidden rounded-lg border bg-muted">
                    <div
                      role="img"
                      aria-label={preview.name}
                      className="aspect-square w-full bg-cover bg-center"
                      style={{ backgroundImage: `url(${preview.url})` }}
                    />
                    <p className="px-2 py-1 text-[11px] font-medium text-muted-foreground">
                      {formatPhotoTakenAt(preview.takenAt)}
                    </p>
                  </div>
                ))}
              </div>
            ) : (
              <div className="flex min-h-28 items-center justify-center rounded-lg border border-dashed bg-muted/40 text-sm text-muted-foreground">
                <ImageIcon className="mr-2 size-4" />
                Nenhuma foto selecionada
              </div>
            )}

            <div className="grid gap-2">
              <Label htmlFor="notes">Observações</Label>
              <Textarea
                id="notes"
                value={notes}
                placeholder="Ex.: risco no para-choque dianteiro, interior com objetos pessoais..."
                onChange={(event) => setNotes(event.target.value)}
              />
            </div>

            {error ? (
              <div className="rounded-lg border border-destructive/40 bg-destructive/10 px-3 py-2 text-sm text-destructive">
                {error}
              </div>
            ) : null}

            {success ? (
              <div className="flex items-center gap-2 rounded-lg border border-primary/30 bg-primary/10 px-3 py-2 text-sm text-primary">
                <CheckCircle2 className="size-4" />
                {success}
              </div>
            ) : null}

            <Button type="submit" className="w-full gap-2" disabled={isUploading}>
              {isUploading ? (
                <Loader2 className="size-4 animate-spin" />
              ) : (
                <UploadCloud className="size-4" />
              )}
              {isUploading ? "Enviando..." : "Salvar fotos"}
            </Button>
          </form>
        </div>

        <aside className="space-y-4">
          <section className="rounded-lg border bg-card p-4">
            <h2 className="text-sm font-semibold">Registro atual</h2>
            <div className="mt-3 grid gap-2 text-sm">
              <div className="flex items-center justify-between gap-3">
                <span className="text-muted-foreground">Fotos</span>
                <span className="font-semibold">{inspection.photos.length}</span>
              </div>
              <div className="flex items-center justify-between gap-3">
                <span className="text-muted-foreground">Conclusão</span>
                <span className="font-semibold">{formatDateTime(inspection.completedAt)}</span>
              </div>
            </div>
            {inspection.notes ? (
              <p className="mt-3 border-t pt-3 text-sm text-muted-foreground">
                {inspection.notes}
              </p>
            ) : null}
          </section>

          <section className="rounded-lg border bg-card p-4">
            <h2 className="text-sm font-semibold">Fotos enviadas</h2>
            {hasPhotos ? (
              <div className="mt-3 grid grid-cols-2 gap-3">
                {inspection.photos.map((photo) => (
                  <a
                    key={photo.id}
                    href={photo.url}
                    target="_blank"
                    rel="noreferrer"
                    className="block overflow-hidden rounded-lg border bg-muted"
                  >
                    <div
                      role="img"
                      aria-label={photo.filename}
                      className="aspect-square w-full bg-cover bg-center"
                      style={{ backgroundImage: `url(${photo.url})` }}
                    />
                    <p className="px-2 py-1 text-[11px] font-medium text-muted-foreground">
                      {photo.caption ?? formatPhotoTakenAt(photo.createdAt)}
                    </p>
                  </a>
                ))}
              </div>
            ) : (
              <p className="mt-3 text-sm text-muted-foreground">Ainda sem fotos.</p>
            )}
          </section>
        </aside>
      </section>
    </main>
  );
}
