import { Body, Controller, Post } from '@nestjs/common';
import { AuthService } from './auth.service';
import { RegisterParams, LoginParams } from './auth.model';
import { Public } from './auth.decorator';

@Controller('auth')
export class AuthController {
  constructor(private authService: AuthService) {}

  @Public()
  @Post('/register')
  async register(@Body() registerParams: RegisterParams) {
    return this.authService.register(registerParams);
  }

  @Public()
  @Post('/login')
  async login(@Body() loginParams: LoginParams) {
    return this.authService.login(loginParams);
  }

  @Public()
  @Post('/checkToken')
  async checkToken(@Body() body: { token: string }) {
    return this.authService.checkToken(body.token);
  }
}
