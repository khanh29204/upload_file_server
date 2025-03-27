import { NestFactory } from '@nestjs/core';
import { AppModule } from './core/app/app.module';
import { NestExpressApplication } from '@nestjs/platform-express';
import { join } from 'path';
import * as dotenv from 'dotenv';
import {
  Logger,
  UnprocessableEntityException,
  ValidationPipe,
} from '@nestjs/common';

dotenv.config(); // Đảm bảo gọi dotenv.config() trước khi truy cập process.env

const { DOMAIN, PORT } = process.env;

async function bootstrap() {
  const app = await NestFactory.create<NestExpressApplication>(AppModule);
  app.useStaticAssets(join(__dirname, '..', 'uploads'), { prefix: '/file' });
  app.enableCors();

  app.useGlobalPipes(
    new ValidationPipe({
      transform: true,
      whitelist: true,
      exceptionFactory: (errors) => {
        return new UnprocessableEntityException(
          errors.map((error) => Object.values(error.constraints)).flat(),
        );
      },
    }),
  );

  await app.listen(PORT || 3001);

  let method: string;
  let serverUrl: string;
  if (DOMAIN.startsWith('http://') || DOMAIN.startsWith('https://')) {
    serverUrl = `${DOMAIN}/`;
  } else {
    method = DOMAIN.includes('localhost') ? 'http' : 'https';
    serverUrl = `${method}://${DOMAIN}:${PORT || 3001}/`;
  }

  Logger.log(serverUrl);
}

bootstrap();
