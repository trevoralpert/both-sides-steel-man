import { Injectable, UnauthorizedException } from '@nestjs/common'
import { PassportStrategy } from '@nestjs/passport'
import { ExtractJwt, Strategy } from 'passport-jwt'
import { verifyToken } from '@clerk/backend'

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
  constructor() {
    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      ignoreExpiration: false,
      // Use a simple secret for now, we'll do custom validation in validate()
      secretOrKey: process.env.CLERK_SECRET_KEY || 'fallback-secret',
    })
  }

  async validate(payload: any, done: any) {
    try {
      // For now, just return the payload - we can add Clerk verification later
      return { userId: payload.sub, email: payload.email }
    } catch (error) {
      throw new UnauthorizedException('Invalid token')
    }
  }
}