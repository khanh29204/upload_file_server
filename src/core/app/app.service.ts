import { BadRequestException, Injectable, Logger } from '@nestjs/common';
import { extname, join } from 'path';
import {
  writeFileSync,
  existsSync,
  mkdirSync,
  symlinkSync,
  PathLike,
} from 'fs';
import { createHash } from 'crypto';
import * as dotenv from 'dotenv';
import * as Sharp from 'sharp';

dotenv.config();

const { DOMAIN, USE_SUB_DIR, CREATE_SYMLINK } = process.env;

const imageExtensions = ['.jpg', '.jpeg', '.png', '.gif'];
const videoExtensions = ['.mp4', '.mov', '.avi'];

@Injectable()
export class AppService {
  async uploadFiles(files: Array<Express.Multer.File>) {
    if (!files || files.length === 0) {
      throw new BadRequestException('No files provided');
    }

    const serverDir = join(process.env.serverDir);

    if (!existsSync(serverDir)) {
      mkdirSync(serverDir, { recursive: true });
    }

    let uploadDir: PathLike;
    Logger.log(CREATE_SYMLINK);
    if (Boolean(CREATE_SYMLINK ?? true)) {
      uploadDir = join(__dirname, '../uploads');
      if (!existsSync(uploadDir)) {
        try {
          symlinkSync(serverDir, uploadDir);
          console.log(`Symlink created from ${serverDir} to ${uploadDir}`);
        } catch (error) {
          console.error('Error creating symlink:', error);
        }
      }
    } else {
      uploadDir = join(serverDir, 'uploads');
    }

    const uploadedFiles = [];

    for (const file of files) {
      const fileExtension = extname(file.originalname).toLowerCase();
      const isImage = imageExtensions.includes(fileExtension);
      const isVideo = videoExtensions.includes(fileExtension);

      let fileName = file.originalname;
      let fileBuffer = file.buffer;

      if (isImage || isVideo) {
        const hash = createHash('sha256');
        hash.update(file.buffer);
        fileName = hash.digest('hex').substring(0, 60) + fileExtension;

        if (isImage) {
          fileBuffer = (
            await this.resizeImage({ buffer: file.buffer, size: file.size })
          ).buffer;
        }
      }

      let subDir = '';
      if (Boolean(USE_SUB_DIR ?? true)) {
        if (isImage) {
          subDir = 'images';
        } else if (isVideo) {
          subDir = 'videos';
        }
      }

      const uploadPath = join(uploadDir, subDir, fileName);

      // tạo thư mục nếu chưa tồn tại
      if (!existsSync(join(uploadDir, subDir))) {
        mkdirSync(join(uploadDir, subDir), { recursive: true });
      }

      writeFileSync(uploadPath, fileBuffer);

      let method;
      let fileUrl;
      if (DOMAIN.startsWith('http://') || DOMAIN.startsWith('https://')) {
        fileUrl = `${DOMAIN}/files/${subDir ? subDir + '/' : ''}${fileName}`;
      } else {
        method = DOMAIN.includes('localhost') ? 'http' : 'https';
        fileUrl = `${method}://${DOMAIN}/files/${
          subDir ? subDir + '/' : ''
        }${fileName}`;
      }

      uploadedFiles.push({ url: fileUrl });
    }

    return uploadedFiles;
  }

  async resizeImage(image: {
    buffer: Buffer;
    size: number;
  }): Promise<{ buffer: Buffer; size: number }> {
    if (image.size > 1.5 * 1024 * 1024) {
      const resizedBuffer = await Sharp(image.buffer)
        .jpeg({ quality: 95 })
        .toBuffer();

      const resizedImage = {
        buffer: resizedBuffer,
        size: resizedBuffer.length,
      };

      return this.resizeImage(resizedImage);
    } else {
      return image;
    }
  }
}
