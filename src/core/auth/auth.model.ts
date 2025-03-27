import { IsNotEmpty } from 'class-validator';

export class LoginParams {
  @IsNotEmpty()
  userName: string;

  @IsNotEmpty()
  password: string;
}

export class RegisterParams {
  @IsNotEmpty()
  userName: string;

  @IsNotEmpty()
  password: string;

  @IsNotEmpty()
  key: string;
}

export class TokenPayload {
  id: string;
  userName: string;
}
