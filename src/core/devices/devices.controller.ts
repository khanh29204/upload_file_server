import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
  Put,
  Req,
} from '@nestjs/common';
import { DevicesService } from './devices.service';
import {
  AddDeviceParam,
  ReturnClientParam,
  SendCommandParam,
  UpdateDeviceParam,
} from './device.dto';
import { TokenPayload } from '../auth/auth.model';
import { Public } from '../auth/auth.decorator';

@Controller('devices')
export class DevicesController {
  constructor(private readonly deviceService: DevicesService) {}

  @Post('/add-device')
  async addDevice(@Body() addDeviceParam: AddDeviceParam, @Req() req: Request) {
    const user: TokenPayload = req['user'];
    return await this.deviceService.addDevice(addDeviceParam, user.id);
  }

  @Put('/update-device/:deviceId')
  async updateDevice(
    @Body() updateDeviceParam: UpdateDeviceParam,
    @Req() req: Request,
    @Param('deviceId') deviceId: string,
  ) {
    const user: TokenPayload = req['user'];
    return await this.deviceService.updateDevice(
      deviceId,
      updateDeviceParam,
      user.id,
    );
  }

  @Delete('/delete-device/:deviceId')
  async deleteDevice(@Param('deviceId') deviceId: string, @Req() req: Request) {
    const user: TokenPayload = req['user'];
    return await this.deviceService.deleteDevice(deviceId, user.id);
  }

  @Post('/send-command-to-device')
  async sendCommandToDevice(@Body() sendCommandParam: SendCommandParam) {
    return await this.deviceService.sendCommandToDevice(sendCommandParam);
  }

  @Get('/get-devices')
  async getDevicesByUserId(@Req() req: Request) {
    const user: TokenPayload = req['user'];
    return await this.deviceService.getDevicesByUserId(user.id);
  }

  @Patch('/add-my-token')
  async addMyToken(@Req() req: Request, @Body() body: { token: string }) {
    const user: TokenPayload = req['user'];
    return await this.deviceService.addMyToken(body.token, user.id);
  }

  @Public()
  @Post('/return-client')
  async returnClient(@Body() body: ReturnClientParam) {
    return await this.deviceService.returnClient(body);
  }
}
