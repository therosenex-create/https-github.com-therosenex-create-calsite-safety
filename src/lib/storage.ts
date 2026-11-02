import { AppError } from "./errors";

export const DATABASE_FILE_LIMIT = 8 * 1024 * 1024;
export const OBJECT_FILE_LIMIT = 25 * 1024 * 1024;

export type StorageKind = "database" | "object";

export type StoredBlob = {
  provider: "DATABASE" | "OBJECT";
  bytes: Buffer | null;
  objectKey: string | null;
};

export interface BlobStore {
  kind: StorageKind;
  limit: number;
  put(input: { organizationId: string; bytes: Buffer; fileName: string }): Promise<StoredBlob>;
  read(record: { storageProvider: string; contentBytes: Uint8Array | Buffer | null; objectKey: string | null }): Promise<Uint8Array | null>;
}

const requiredObjectEnv = ["OBJECT_STORAGE_ENDPOINT", "OBJECT_STORAGE_BUCKET", "OBJECT_STORAGE_ACCESS_KEY_ID", "OBJECT_STORAGE_SECRET_ACCESS_KEY"] as const;

export function missingObjectStorageEnv() {
  return requiredObjectEnv.filter((key) => !process.env[key]);
}

class DatabaseBlobStore implements BlobStore {
  kind = "database" as const;
  limit = DATABASE_FILE_LIMIT;

  async put(input: { organizationId: string; bytes: Buffer; fileName: string }): Promise<StoredBlob> {
    return { provider: "DATABASE", bytes: input.bytes, objectKey: null };
  }

  async read(record: { contentBytes: Uint8Array | Buffer | null }): Promise<Uint8Array | null> {
    if (!record.contentBytes) return null;
    return new Uint8Array(record.contentBytes);
  }
}

/** Fail closed. A live upload is not attempted until every required variable is present, and even then this build does not sign requests. */
class ObjectBlobStore implements BlobStore {
  kind = "object" as const;
  limit = OBJECT_FILE_LIMIT;

  async put(): Promise<StoredBlob> {
    const missing = missingObjectStorageEnv();
    if (missing.length) throw new AppError("storage_unconfigured");
    throw new AppError("storage_unconfigured");
  }

  async read(): Promise<Uint8Array | null> {
    throw new AppError("storage_unconfigured");
  }
}

export function getBlobStore(): BlobStore {
  if (process.env.DOCUMENT_STORAGE === "object") return new ObjectBlobStore();
  return new DatabaseBlobStore();
}

export async function readStoredBlob(record: {
  storageProvider: string;
  contentBytes: Uint8Array | Buffer | null;
  objectKey: string | null;
}) {
  const store = record.storageProvider === "OBJECT" ? new ObjectBlobStore() : new DatabaseBlobStore();
  return store.read(record);
}
