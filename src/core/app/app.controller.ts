import {
  BadRequestException,
  Controller,
  Post,
  UploadedFiles,
  UseInterceptors,
} from '@nestjs/common';
import { AppService } from './app.service';
import { FilesInterceptor } from '@nestjs/platform-express';
import { Public } from '../auth/auth.decorator';

@Controller()
export class AppController {
  constructor(private readonly appService: AppService) {}

  @Post('files')
  @UseInterceptors(FilesInterceptor('files')) // Thay đổi ở đây
  uploadFiles(@UploadedFiles() files: Array<Express.Multer.File>) {
    return this.appService.uploadFiles(files); // Thay đổi ở đây
  }

  @Post('logs')
  @Public()
  @UseInterceptors(FilesInterceptor('files')) // Thay đổi ở đây
  uploadLogs(@UploadedFiles() files: Array<Express.Multer.File>) {
    //kiểm tra có phải file .txt không
    const isTextFile = files.every((file) => file.mimetype === 'text/plain');
    if (!isTextFile) {
      throw new BadRequestException('Only .txt files are allowed');
    }
    return this.appService.uploadFiles(files); // Thay đổi ở đây
  }
}
