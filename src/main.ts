import { NestFactory } from '@nestjs/core';
import { AppModule } from './core/app/app.module';
import { NestExpressApplication } from '@nestjs/platform-express';
import { join } from 'path';
import * as dotenv from 'dotenv';

dotenv.config(); // Đảm bảo gọi dotenv.config() trước khi truy cập process.env

const { DOMAIN } = process.env;

async function bootstrap() {
  const app = await NestFactory.create<NestExpressApplication>(AppModule);
  app.useStaticAssets(join(__dirname, '..', 'uploads'), { prefix: '/file' });
  app.enableCors();
  await app.listen(3001);
  console.log(`${DOMAIN.includes('localhost') ? 'http' : 'https'}://${DOMAIN}`);
}

bootstrap();
