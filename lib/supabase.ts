import { createClient } from "@supabase/supabase-js";

const DEFAULT_BUCKET = process.env.SUPABASE_BUCKET ?? "documents";

export function getSupabaseServiceClient() {
  const url = process.env.SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!url || !key) {
    throw new Error("Supabase credentials are not configured");
  }

  return createClient(url, key, {
    auth: {
      persistSession: false,
    },
  });
}

export async function uploadDocumentFile(file: File, folder: string) {
  const client = getSupabaseServiceClient();
  const bucket = DEFAULT_BUCKET;
  const sanitizedName = file.name.replace(/[^a-zA-Z0-9.\-_]/g, "_");
  const path = `${folder}/${Date.now()}-${sanitizedName}`;

  const arrayBuffer = await file.arrayBuffer();
  const buffer = Buffer.from(arrayBuffer);

  const { error } = await client.storage
    .from(bucket)
    .upload(path, buffer, {
      contentType: file.type || "application/octet-stream",
      upsert: false,
    });

  if (error) {
    throw new Error(`Ошибка загрузки файла: ${error.message}`);
  }

  const { data } = client.storage.from(bucket).getPublicUrl(path);

  return {
    name: file.name,
    url: data.publicUrl,
    path,
    size: file.size,
    type: file.type,
  };
}
