import { Module } from '@nestjs/common'
import { PassportModule } from '@nestjs/passport'
import { JwtStrategy } from './strategies/jwt.strategy'
import { RbacModule } from './rbac/rbac.module'

@Module({
  imports: [
    PassportModule,
    RbacModule,
  ],
  providers: [JwtStrategy],
  exports: [
    JwtStrategy,
    RbacModule,
  ],
})
export class AuthModule {}
