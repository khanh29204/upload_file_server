import {
  Controller,
  Post,
  UploadedFiles,
  UseInterceptors,
} from '@nestjs/common';
import { AppService } from './app.service';
import { FilesInterceptor } from '@nestjs/platform-express';

@Controller()
export class AppController {
  constructor(private readonly appService: AppService) {}

  @Post('files')
  @UseInterceptors(FilesInterceptor('files')) // Thay đổi ở đây
  uploadFiles(@UploadedFiles() files: Array<Express.Multer.File>) {
    return this.appService.uploadFiles(files); // Thay đổi ở đây
  }
}
