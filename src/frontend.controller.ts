import { Controller, Get, Res } from '@nestjs/common';
import { join } from 'path';
import { Response } from 'express';

const WEB_ROOT = join(process.cwd(), 'web');

@Controller()
export class FrontendController {
  @Get()
  landing(@Res() res: Response) {
    return res.sendFile(join(WEB_ROOT, 'index.html'));
  }

  @Get(['customer', 'customer/'])
  customer(@Res() res: Response) {
    return res.sendFile(join(WEB_ROOT, 'customer', 'index.html'));
  }

  @Get(['admin', 'admin/'])
  admin(@Res() res: Response) {
    return res.sendFile(join(WEB_ROOT, 'admin', 'index.html'));
  }
}
