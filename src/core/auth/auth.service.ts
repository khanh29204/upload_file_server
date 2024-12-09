import { LoginParams, RegisterParams } from './auth.model';
import { Injectable, UnauthorizedException } from '@nestjs/common';
import { UsersService } from '../users/users.service';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcrypt';

@Injectable()
export class AuthService {
  constructor(
    private jwtService: JwtService,
    private usersService: UsersService,
  ) {}

  public async login(loginParams: LoginParams) {
    const user = await this.usersService.findOne(loginParams.userName);
    console.log(`loginParams`, loginParams);

    if (!user) {
      throw new UnauthorizedException('Invalid credentials');
    }

    const isMatch = await bcrypt.compare(loginParams.password, user.password);

    if (!isMatch) {
      throw new UnauthorizedException('Invalid credentials');
    }

    const payload = { userName: user.userName, id: user.id };
    return {
      token: await this.jwtService.signAsync(payload),
    };
  }

  public async register(registerParams: RegisterParams) {
    if (registerParams.key !== process.env.KEY_RESIGTER) {
      throw new UnauthorizedException('Register failed');
    }

    const createUser = await this.usersService.createOne(
      registerParams.userName,
      registerParams.password,
    );

    return createUser.id;
  }
}
