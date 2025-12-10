import { IsNotEmpty, IsOptional } from 'class-validator';

export class AddDeviceParam {
  @IsNotEmpty()
  deviceName: string;

  @IsNotEmpty()
  fcmTokenDevice: string;
}

export class UpdateDeviceParam {
  @IsOptional()
  deviceName?: string;

  @IsOptional()
  fcmTokenDevice?: string;
}

export class SendCommandParam {
  @IsNotEmpty()
  deviceId: string;

  @IsNotEmpty()
  command: string;
}

export class ReturnClientParam {
  @IsNotEmpty()
  fcmTokenDevice: string;

  @IsNotEmpty()
  message: string;

  @IsOptional()
  isSendNotification: boolean = false;
}
