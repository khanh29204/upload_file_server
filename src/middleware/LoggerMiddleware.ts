import { Injectable, NestMiddleware } from '@nestjs/common';
import { Request, Response, NextFunction } from 'express';

@Injectable()
export class LoggerMiddleware implements NestMiddleware {
  use(req: Request, res: Response, next: NextFunction) {
    const startTime = Date.now();
    let ip = req.headers['x-real-ip'] as string;
    if (!ip) {
      const xForwardedFor = req.headers['x-forwarded-for'] as string;
      if (xForwardedFor) {
        ip = xForwardedFor.split(',')[0].trim(); // Lấy địa chỉ IP đầu tiên
      }
    }

    if (!ip) {
      ip = req.ip; // Sử dụng req.ip nếu các header proxy không có
    }
    const method = req.method;
    const endpoint = req.originalUrl;

    res.on('finish', () => {
      const endTime = Date.now();
      const responseTime = endTime - startTime;
      const logMessage = `${ip} \n[${new Date().toLocaleString('vi')}] ${method} ${endpoint} ${res.statusCode} ${responseTime}ms`;

      console.log(logMessage); // Ghi log ra console
      // Hoặc bạn có thể ghi log vào file hoặc database
    });

    next();
  }
}
