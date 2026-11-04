"use client";
import { useEffect, useState } from "react";
import { useMutation } from "convex/react";
import { api } from "@/convex/_generated/api";
import type { Id } from "@/convex/_generated/dataModel";
export function PhotoEditor({
  tool,
  version,
  hasPhoto,
  onBusy,
}: {
  tool: Id<"tools">;
  version?: number;
  hasPhoto: boolean;
  onBusy: (busy: boolean) => void;
}) {
  const remove = useMutation(api.photos.remove);
  const [preview, setPreview] = useState<string | null>(null);
  const [file, setFile] = useState<File | null>(null);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");
  useEffect(
    () => () => {
      if (preview) URL.revokeObjectURL(preview);
    },
    [preview],
  );
  async function choose(selected?: File) {
    setFile(null);
    setPreview(null);
    setMessage("");
    if (!selected) return;
    if (
      selected.size > 5 * 1024 * 1024 ||
      !["image/jpeg", "image/png", "image/webp"].includes(selected.type)
    ) {
      setMessage("Choose a JPEG, PNG or WebP image up to 5 MB.");
      return;
    }
    try {
      // Browser preview is only convenience; the server independently validates the bytes.
      const bitmap = await createImageBitmap(selected);
      const valid = bitmap.width * bitmap.height <= 20_000_000;
      bitmap.close();
      if (!valid) throw new Error();
      setFile(selected);
      setPreview(URL.createObjectURL(selected));
    } catch {
      setMessage("Choose a readable still image of at most 20 megapixels.");
    }
  }
  async function work(action: () => Promise<void>) {
    if (busy) return;
    setBusy(true);
    onBusy(true);
    setMessage("");
    try {
      await action();
    } catch (e) {
      setMessage(e instanceof Error ? e.message : "Photo could not be updated.");
    } finally {
      setBusy(false);
      onBusy(false);
    }
  }
  return (
    <section className="photo-editor" aria-label="Listing photo">
      <h3>Tool photo</h3>
      <p className="form-hint">
        Optional · JPEG, PNG or WebP · 5 MB max. Photos save separately from the listing details.
      </p>
      {(preview || hasPhoto) && (
        <img
          className="photo-preview"
          src={preview ?? "/api/tools/" + tool + "/photo?v=" + (version ?? 0)}
          alt={preview ? "Selected photo preview" : "Current tool photo"}
        />
      )}
      <label>
        Choose a photo
        <input
          type="file"
          accept="image/jpeg,image/png,image/webp"
          disabled={busy}
          onChange={(e) => void choose(e.target.files?.[0])}
        />
      </label>
      <div className="photo-actions">
        <button
          type="button"
          className="button secondary small"
          disabled={!file || busy}
          onClick={() =>
            void work(async () => {
              const response = await fetch("/api/tools/" + tool + "/photo", {
                method: "POST",
                headers: { "Content-Type": file!.type },
                body: file,
              });
              const result = await response.json();
              if (!response.ok) throw new Error(result.error ?? "Upload failed.");
              setFile(null);
              setPreview(null);
              setMessage("Photo saved as optimized WebP.");
            })
          }
        >
          {busy ? "Processing…" : "Upload photo"}
        </button>
        {hasPhoto && (
          <button
            type="button"
            className="button secondary small"
            disabled={busy}
            onClick={() =>
              void work(async () => {
                await remove({ tool });
                setMessage("Photo removed.");
              })
            }
          >
            Remove photo
          </button>
        )}
      </div>
      <p className="form-hint">
        The server verifies the image, converts it to WebP and removes embedded metadata. Avoid
        including addresses or other personal information in the picture.
      </p>
      {message && (
        <p role="status" className="photo-message">
          {message}
        </p>
      )}
    </section>
  );
}
