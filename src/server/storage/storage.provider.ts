import { promises as fs } from "fs";
import path from "path";
import { env } from "@/lib/env";

export interface StorageProvider {
  upload(key: string, data: Buffer, mimeType: string): Promise<string>;
  download(key: string): Promise<Buffer>;
  delete(key: string): Promise<void>;
}

class LocalStorageProvider implements StorageProvider {
  private basePath: string;

  constructor() {
    this.basePath =
      process.env.STORAGE_LOCAL_PATH ?? path.join(process.cwd(), "uploads");
  }

  private resolve(key: string) {
    return path.join(this.basePath, key);
  }

  async upload(key: string, data: Buffer, _mimeType: string): Promise<string> {
    const filePath = this.resolve(key);
    await fs.mkdir(path.dirname(filePath), { recursive: true });
    await fs.writeFile(filePath, data);
    return key;
  }

  async download(key: string): Promise<Buffer> {
    return fs.readFile(this.resolve(key));
  }

  async delete(key: string): Promise<void> {
    await fs.unlink(this.resolve(key)).catch(() => undefined);
  }
}

export const storageProvider: StorageProvider = new LocalStorageProvider();
