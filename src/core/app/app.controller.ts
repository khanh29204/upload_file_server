import {
  BadRequestException,
  Body,
  Controller,
  Delete,
  Get,
  NotFoundException,
  Param,
  Post,
  Query,
  Req,
  Res,
  UploadedFiles,
  UseInterceptors,
} from '@nestjs/common';
import { AppService } from './app.service';
import { FilesInterceptor } from '@nestjs/platform-express';
import { lookup as mimeLookup } from 'mime-types';
import { diskStorage } from 'multer';
import { isAbsolute, join, normalize, relative, resolve } from 'path';
import { tmpdir } from 'os';
import { createReadStream, existsSync, mkdirSync, statSync } from 'fs';
import { Response } from 'express';
import { environment } from '../config/environment';
import { Public } from '../auth/auth.decorator';

@Controller()
export class AppController {
  constructor(private readonly appService: AppService) {}

  @Post('files')
  @UseInterceptors(
    FilesInterceptor('files', 30, {
      storage: diskStorage({
        destination: (_req, _file, cb) => {
          const uploadDir = join(tmpdir(), 'uploads');
          if (!existsSync(uploadDir)) {
            mkdirSync(uploadDir, { recursive: true });
          }
          cb(null, uploadDir);
        },
        filename: (_req, file, cb) => {
          const safe = file.originalname.replace(/\s+/g, '_');
          cb(null, `${Date.now()}-${safe}`);
        },
      }),
    }),
  )
  uploadFiles(@UploadedFiles() files: Array<Express.Multer.File>) {
    return this.appService.uploadFiles(files); // Thay đổi ở đây
  }

  @Public()
  @Get('files/*')
  async seeUploadedFile(
    @Param('0') rawPath: string,
    @Req() req: Request,
    @Res() res: Response,
  ): Promise<void> {
    if (!rawPath) throw new BadRequestException('Missing path');

    const uploadsRoot = this.getUploadsRoot();
    const safeRel = normalize(decodeURIComponent(rawPath)).replace(
      /^(\.\.[/\\])+/,
      '',
    );
    const filePath = resolve(uploadsRoot, safeRel);

    const relCheck = relative(uploadsRoot, filePath);
    if (relCheck.startsWith('..') || isAbsolute(relCheck)) {
      throw new BadRequestException('Invalid path');
    }
    if (!existsSync(filePath)) throw new NotFoundException('File not found');

    const stat = statSync(filePath);
    const mime = (mimeLookup(filePath) as string) || 'application/octet-stream';

    res.setHeader('Cache-Control', 'public, max-age=31536000, immutable');
    res.setHeader('Accept-Ranges', 'bytes');

    const range = req.headers['range'];
    let start = 0;
    let end = stat.size - 1;

    if (range) {
      const m = /^bytes=(\d*)-(\d*)$/.exec(range);
      if (!m) {
        res.status(416).setHeader('Content-Range', `bytes */${stat.size}`);
        res.end();
      }
      if (m[1]) start = parseInt(m[1], 10);
      if (m[2]) end = parseInt(m[2], 10);
      if (
        Number.isNaN(start) ||
        Number.isNaN(end) ||
        start > end ||
        start >= stat.size
      ) {
        res.status(416).setHeader('Content-Range', `bytes */${stat.size}`);
        res.end();
      }
      if (end >= stat.size) end = stat.size - 1;

      res.status(206);
      res.setHeader('Content-Range', `bytes ${start}-${end}/${stat.size}`);
      res.setHeader('Content-Length', String(end - start + 1));
    } else {
      res.status(200);
      res.setHeader('Content-Length', String(stat.size));
    }

    res.setHeader('Content-Type', mime);

    // Tạo stream và quản lý đóng sớm/ lỗi
    const stream = createReadStream(filePath, { start, end });
    const onClose = () => stream.destroy(); // client đóng -> hủy stream
    const onError = () => {
      // đừng throw để tránh 500; chỉ kết thúc yên lặng
      try {
        res.end();
      } catch {}
    };

    res.on('close', onClose);
    stream.on('error', onError);

    stream.pipe(res);
  }

  // hiển thị danh sách file
  @Get('media')
  getAllFiles(
    @Query('page') page = 1,
    @Query('limit') limit = 20,
    @Query('q') q?: string,
  ) {
    return this.appService.getFiles({ page: +page, limit: +limit, q });
  }

  // xóa files
  @Delete('media')
  deleteFiles(@Body() files: string[]) {
    return this.appService.deleteFiles(files);
  }

  private getUploadsRoot() {
    const distUploads = resolve(process.cwd(), 'dist', 'uploads');
    if (existsSync(distUploads)) return distUploads;

    const serverUploads = resolve(environment.serverDir, 'uploads');
    return serverUploads; // fallback khi symlink fail
  }
}
