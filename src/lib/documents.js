import { supabase } from './supabase.js';
import { DOCUMENT_TYPES, MAX_DOCUMENT_BYTES } from './constants.js';

export function validateDocument(file) {
  if (!file) return null;
  if (!DOCUMENT_TYPES.includes(file.type)) return 'Please upload a PDF, JPG or PNG file.';
  if (file.size > MAX_DOCUMENT_BYTES) return 'The file must be 5 MB or smaller.';
  return null;
}

// Uploads into the private documents bucket under the user's own folder,
// which is the only folder the storage policies allow them to write to.
export async function uploadDocument(userId, file, kind) {
  const ext = { 'application/pdf': 'pdf', 'image/jpeg': 'jpg', 'image/png': 'png' }[file.type];
  const path = `${userId}/${kind}-${Date.now()}.${ext}`;
  const { error } = await supabase.storage.from('documents').upload(path, file, { contentType: file.type, upsert: false });
  if (error) throw error;
  return path;
}

export async function documentUrl(path) {
  const { data, error } = await supabase.storage.from('documents').createSignedUrl(path, 60);
  if (error) throw error;
  return data.signedUrl;
}

// Best-effort cleanup when a registration fails after its upload succeeded.
export function removeDocument(path) {
  return supabase.storage.from('documents').remove([path]).catch(() => {});
}
