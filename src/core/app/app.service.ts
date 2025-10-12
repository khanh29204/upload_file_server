import { BadRequestException, Injectable, Logger } from '@nestjs/common';
import {
  extname,
  join,
  normalize,
  basename,
  dirname,
  resolve,
  relative,
  isAbsolute,
} from 'path';
import {
  existsSync,
  mkdirSync,
  symlinkSync,
  PathLike,
  readdirSync,
  unlinkSync,
  createReadStream,
  createWriteStream,
  readFileSync,
  writeFileSync,
  statSync,
} from 'fs';
import { createHash } from 'crypto';
import { pipeline } from 'stream/promises';
import { environment } from '../config/environment';

const {
  domain: DOMAIN,
  serverDir: SERVER_DIR,
  createSymlink: CREATE_SYMLINK,
  useSubDir: USE_SUB_DIR,
} = environment;
const imageExtensions = ['.jpg', '.jpeg', '.png', '.gif', '.webp', '.bmp'];
const videoExtensions = ['.mp4', '.mov', '.avi', '.mkv', '.webm'];

@Injectable()
export class AppService {
  // ---- helpers -------------------------------------------------------------

  private async sha256File(path: string) {
    const hash = createHash('sha256');
    await pipeline(createReadStream(path), hash);
    return hash.digest('hex');
  }

  private ensureDir(dir: string) {
    if (!existsSync(dir)) mkdirSync(dir, { recursive: true });
  }

  private metaPathOf(finalPath: string) {
    // /a/b/xxxx.ext -> /a/b/xxxx.meta.json
    const file = basename(finalPath);
    const base = file.replace(/\.[^.]+$/, '');
    return join(dirname(finalPath), `${base}.meta.json`);
  }

  private readMetaSafe(p: string): any | null {
    try {
      return JSON.parse(readFileSync(p, 'utf8'));
    } catch {
      return null;
    }
  }

  private async safeMove(src: string, dest: string) {
    // copy stream + unlink (an toàn trên mọi filesystem)
    await pipeline(createReadStream(src), createWriteStream(dest));
    try {
      unlinkSync(src);
    } catch {}
  }

  private buildPublicUrl(relativePath: string) {
    // Đảm bảo rằng relativePath được mã hóa trước khi ghép vào URL
    const encodedRelativePath = encodeURIComponent(relativePath);

    if (DOMAIN!.startsWith('http://') || DOMAIN!.startsWith('https://')) {
      return `${DOMAIN}/files/${encodedRelativePath}`; // Dùng biến đã mã hóa
    }
    const method = DOMAIN!.includes('localhost') ? 'http' : 'https';
    return `${method}://${DOMAIN}/files/${encodedRelativePath}`; // Dùng biến đã mã hóa
  }

  // ---- API methods ---------------------------------------------------------

  async uploadFiles(files: Array<Express.Multer.File>) {
    if (!files || files.length === 0)
      throw new BadRequestException('No files provided');

    // 1) Chuẩn bị thư mục đích theo logic cũ
    const serverDir = join(SERVER_DIR as string);
    this.ensureDir(serverDir);

    let uploadDir: PathLike;
    if (CREATE_SYMLINK) {
      // dist/uploads -> symlink tới SERVER_DIR
      uploadDir = normalize(join(process.cwd(), 'dist', 'uploads'));
      if (!existsSync(uploadDir)) {
        try {
          symlinkSync(serverDir, uploadDir);
          Logger.log(`Symlink created from ${serverDir} to ${uploadDir}`);
        } catch (error) {
          Logger.error('Error creating symlink:', error);
          // fallback nếu symlink fail
          uploadDir = join(serverDir, 'uploads');
          this.ensureDir(uploadDir.toString());
        }
      }
    } else {
      uploadDir = join(serverDir, 'uploads');
      this.ensureDir(uploadDir.toString());
    }

    const uploadedFiles: Array<{
      url: string;
      dedup: boolean;
      originalName?: string;
    }> = [];

    for (const file of files) {
      if (!file?.path)
        throw new BadRequestException(
          'File path is missing (use diskStorage).',
        );

      const ext = extname(file.originalname).toLowerCase();
      const isImage = imageExtensions.includes(ext);
      const isVideo = videoExtensions.includes(ext);

      // 2) Hash nội dung -> đặt tên file vật lý = <hash>.ext
      const fullHash = await this.sha256File(file.path);
      const hashName = `${fullHash}${ext}`;

      // 3) Subdir nếu bật
      let subDir = '';
      if (USE_SUB_DIR) {
        if (isImage) subDir = 'images';
        else if (isVideo) subDir = 'videos';
      }

      const subDirPath = subDir
        ? join(uploadDir.toString(), subDir)
        : uploadDir.toString();
      this.ensureDir(subDirPath);

      const finalPath = join(subDirPath, hashName);
      const relPath = subDir ? `${subDir}/${hashName}` : hashName;

      const metaPath = this.metaPathOf(finalPath);
      const nowIso = new Date().toISOString();

      // 4) Dedup: nếu file vật lý đã tồn tại -> bỏ qua copy, vẫn đảm bảo có/merge metadata
      let dedup = false;
      if (existsSync(finalPath)) {
        dedup = true;
        try {
          unlinkSync(file.path);
        } catch {} // xoá temp ngay vì không cần nữa
      } else {
        // move (copy stream + unlink temp)
        await this.safeMove(file.path, finalPath);
      }

      // 5) Ghi/ghép metadata sidecar
      //   - Lưu tên gốc, size, mimetype, uploadedAt (lần gần nhất)
      //   - Nếu muốn lưu nhiều tên gốc khác nhau, có thể giữ array (ở đây giữ tên gần nhất)
      const merged = {
        originalName: file.originalname,
        size: statSync(finalPath).size,
        mimetype: file.mimetype,
        uploadedAt: nowIso,
        hash: fullHash,
      };
      try {
        writeFileSync(metaPath, JSON.stringify(merged));
      } catch (e) {
        Logger.warn(`Cannot write meta ${metaPath}: ${e}`);
      }

      // 6) Build URL trả về
      const fileUrl = this.buildPublicUrl(relPath);
      uploadedFiles.push({
        url: fileUrl,
        dedup,
        originalName: merged.originalName,
      });
    }

    return uploadedFiles;
  }

  async getFiles({
    page = 1,
    limit = 20,
    q,
  }: {
    page?: number;
    limit?: number;
    q?: string;
  }) {
    const uploadsRoot = join(process.cwd(), 'dist', 'uploads');
    const results: Array<{
      url: string;
      path: string;
      originalName?: string;
      size?: number;
      mimetype?: string;
      uploadedAt?: string;
    }> = [];

    const scan = (dir: string, prefix = '') => {
      if (!existsSync(dir)) return;
      const items = readdirSync(dir, { withFileTypes: true });
      for (const it of items) {
        const p = join(dir, it.name);
        const rel = prefix ? join(prefix, it.name) : it.name;
        if (it.isDirectory()) {
          scan(p, rel);
        } else if (!/\.meta\.json$/i.test(it.name)) {
          const url = this.buildPublicUrl(rel.replace(/\\/g, '/'));
          const meta = this.readMetaSafe(this.metaPathOf(p));
          results.push({
            url,
            path: rel.replace(/\\/g, '/'),
            originalName: meta?.originalName,
            size: meta?.size,
            mimetype: meta?.mimetype,
            uploadedAt: meta?.uploadedAt,
          });
        }
      }
    };

    scan(uploadsRoot);

    // nếu có q thì filter theo tên file hoặc originalName
    let filtered = results;
    if (q) {
      const keyword = q.toLowerCase();
      filtered = results.filter(
        (f) =>
          f.path.toLowerCase().includes(keyword) ||
          (f.originalName && f.originalName.toLowerCase().includes(keyword)),
      );
    }

    // sort theo tên
    filtered.sort((a, b) => a.path.localeCompare(b.path));

    const total = filtered.length;
    const start = (page - 1) * limit;
    const data = filtered.slice(start, start + limit);

    return { data, total, page, limit, q };
  }

  async deleteFiles(files: string[]) {
    const out: Array<{ input: string; status: string; message?: string }> = [];

    for (const input of files || []) {
      try {
        const { filePath } = this.resolveInputToPath(input);
        const metaPath = this.metaPathOf(filePath);

        if (existsSync(filePath)) {
          try {
            unlinkSync(filePath);
          } catch (e: any) {
            throw e;
          }
          // xoá meta kèm nếu có
          try {
            if (existsSync(metaPath)) unlinkSync(metaPath);
          } catch {}
          out.push({ input, status: 'deleted' });
        } else {
          out.push({ input, status: 'not found' });
        }
      } catch (e: any) {
        Logger.error(`Error deleting ${input}: ${e.message}`);
        out.push({ input, status: 'error', message: e.message });
      }
    }
    return out;
  }

  private getUploadsRoot() {
    const distUploads = resolve(process.cwd(), 'dist', 'uploads');
    if (existsSync(distUploads)) return distUploads;
    // fallback khi symlink không tồn tại
    return resolve(process.env.SERVER_DIR as string, 'uploads');
  }
  // Helper: chuẩn hoá input (url hoặc path) -> absolute file path an toàn
  private resolveInputToPath(input: string) {
    const uploadsRoot = this.getUploadsRoot();

    let rel = input.trim();

    // Nếu là URL tuyệt đối hoặc bắt đầu bằng /files/ -> rút relative path
    try {
      const u = new URL(rel, 'http://dummy'); // base để parse được cả path bắt đầu bằng "/"
      if (
        u.pathname &&
        (rel.startsWith('http://') ||
          rel.startsWith('https://') ||
          rel.startsWith('/'))
      ) {
        rel = decodeURIComponent(u.pathname.replace(/^\/files\//, ''));
      }
    } catch {
      // không phải URL -> giữ nguyên
      if (rel.startsWith('/files/')) rel = rel.slice('/files/'.length);
      // nếu lỡ dán absolute fs path, giữ nguyên để check phía dưới
    }

    // Chuẩn hoá path, đổi "\" -> "/", bỏ "../" đầu
    rel = normalize(rel)
      .replace(/^(\.\.[/\\])+/, '')
      .replace(/^[\\/]+/, '');

    // Nếu người ta đưa absolute fs path thì giữ lại để kiểm tra containment
    const candidate =
      rel.startsWith('/') || /^[a-zA-Z]:[\\/]/.test(rel)
        ? normalize(rel)
        : resolve(uploadsRoot, rel);

    // Chống path traversal: candidate phải nằm trong uploadsRoot
    const r = relative(uploadsRoot, candidate);
    if (r.startsWith('..') || isAbsolute(r)) {
      throw new Error('Invalid path');
    }

    return { uploadsRoot, filePath: candidate, relPath: r.replace(/\\/g, '/') };
  }
}
