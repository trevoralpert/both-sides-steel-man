import { Module } from '@nestjs/common';
import { PrismaModule } from '../prisma/prisma.module';
import { SurveysService } from './surveys.service';

@Module({
  imports: [PrismaModule],
  providers: [SurveysService],
  exports: [SurveysService],
})
export class SurveysModule {}


