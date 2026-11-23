// Photo quests: the camera input, downscaling, and thumbnails of photos saved on the device.
// Used by the place screen through a callback, so the two modules do not import each other.
import { photos } from "../core/storage.mjs";
import { $ } from "../core/ui.mjs";

let pendingPhoto = null; // { placeId, questId, onTaken }

// Opens the camera for a photo quest; onTaken runs once the photo is saved on the device.
export function takePhoto(placeId, questId, onTaken) {
  pendingPhoto = { placeId, questId, onTaken };
  $("#photo-input").click();
}

// The hidden file input is shared by every photo quest.
export function bindPhotoInput() {
  $("#photo-input").addEventListener("change", (e) => { handlePhoto(e.target.files[0]); e.target.value = ""; });
}

export async function loadQuestPhotos(place) {
  const shots = await photos.all();
  for (const shot of shots) {
    const img = document.querySelector(`[data-thumb="${shot.questId}"]`);
    if (img && place.quests.some((q) => q.id === shot.questId)) { img.src = shot.dataUrl; img.hidden = false; }
  }
}

async function handlePhoto(file) {
  const pending = pendingPhoto;
  pendingPhoto = null;
  if (!file || !pending) return;
  const dataUrl = await downscale(file, 900);
  await photos.put({ questId: pending.questId, placeId: pending.placeId, dataUrl, at: Date.now() });
  pending.onTaken();
}

async function downscale(file, maxSide) {
  const bitmap = await createImageBitmap(file).catch(() => null);
  if (!bitmap) return new Promise((resolve) => { const reader = new FileReader(); reader.onload = () => resolve(reader.result); reader.readAsDataURL(file); });
  const scale = Math.min(1, maxSide / Math.max(bitmap.width, bitmap.height));
  const canvas = document.createElement("canvas");
  canvas.width = Math.round(bitmap.width * scale);
  canvas.height = Math.round(bitmap.height * scale);
  canvas.getContext("2d").drawImage(bitmap, 0, 0, canvas.width, canvas.height);
  return canvas.toDataURL("image/jpeg", 0.74);
}
