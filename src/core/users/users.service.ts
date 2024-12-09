import {
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from 'src/prisma/prisma.service';
import * as bcrypt from 'bcrypt';
import { PrismaErrorCode } from 'src/prisma/prisma.util';

@Injectable()
export class UsersService {
  constructor(private prismaService: PrismaService) {}
  public async createOne(userName: string, password: string) {
    const passwordHash = await bcrypt.hash(password, 10);
    return await this.prismaService.user
      .create({
        data: {
          userName,
          password: passwordHash,
        },
      })
      .catch((err) => {
        if (err.code === PrismaErrorCode.UniqueConstraintFailed) {
          throw new ConflictException('User name already exists');
        }
        throw err;
      });
  }

  public async findOne(userName: string) {
    return await this.prismaService.user
      .findUnique({
        where: { userName },
      })
      .catch((err) => {
        if (err.code === PrismaErrorCode.RecordDoesNotExist) {
          throw new NotFoundException('User not found');
        }
        throw err;
      });
  }
}
