import {
  Injectable,
  NestInterceptor,
  ExecutionContext,
  CallHandler,
  HttpException,
  HttpStatus,
  Logger,
} from '@nestjs/common';
import { Observable, throwError } from 'rxjs';
import { catchError } from 'rxjs/operators';
import { Prisma } from '@prisma/client';

@Injectable()
export class ProfileErrorInterceptor implements NestInterceptor {
  private readonly logger = new Logger(ProfileErrorInterceptor.name);

  intercept(context: ExecutionContext, next: CallHandler): Observable<any> {
    return next.handle().pipe(
      catchError((error) => {
        const request = context.switchToHttp().getRequest();
        const user = request.user;
        
        // Log the error with context
        this.logger.error(
          `Profile operation failed for user ${user?.sub || 'unknown'}: ${error.message}`,
          error.stack
        );

        // Handle specific error types
        if (error instanceof HttpException) {
          return throwError(() => error);
        }

        // Handle Prisma errors
        if (error instanceof Prisma.PrismaClientKnownRequestError) {
          return throwError(() => this.handlePrismaError(error));
        }

        if (error instanceof Prisma.PrismaClientValidationError) {
          return throwError(() => new HttpException(
            'Invalid data provided',
            HttpStatus.BAD_REQUEST
          ));
        }

        // Handle validation errors
        if (error.name === 'ValidationError') {
          return throwError(() => new HttpException(
            {
              message: 'Validation failed',
              errors: error.details || error.message,
            },
            HttpStatus.BAD_REQUEST
          ));
        }

        // Generic server error
        return throwError(() => new HttpException(
          'Internal server error occurred',
          HttpStatus.INTERNAL_SERVER_ERROR
        ));
      })
    );
  }

  private handlePrismaError(error: Prisma.PrismaClientKnownRequestError): HttpException {
    switch (error.code) {
      case 'P2002':
        return new HttpException(
          'A profile already exists for this user',
          HttpStatus.CONFLICT
        );
      
      case 'P2025':
        return new HttpException(
          'Profile not found',
          HttpStatus.NOT_FOUND
        );
      
      case 'P2003':
        return new HttpException(
          'Invalid user reference',
          HttpStatus.BAD_REQUEST
        );
      
      case 'P2021':
        return new HttpException(
          'Database table does not exist',
          HttpStatus.INTERNAL_SERVER_ERROR
        );
      
      default:
        return new HttpException(
          'Database operation failed',
          HttpStatus.INTERNAL_SERVER_ERROR
        );
    }
  }
}
