import { InternalServerErrorException, Logger } from '@nestjs/common';
import { tryCatch } from 'bullmq';



const logger = new Logger('TryCatchDecorator');
export function WithErrorHandling(errorMessage: string) {
  
  return function (
    target: any,
    propertyKey: string,
    descripter: PropertyDescriptor,
  ) {
    const originalMethod = descripter.value;
    descripter.value = async function (...args: any[]) {
      const logger = this.logger ?? new Logger(target.constructor.name);
      const message = errorMessage ?? `Error in ${propertyKey}`;
      try {
        return await originalMethod.apply(this, args);
      } catch (error) {
        logger.error(
          message,
          error instanceof Error ? error.stack : String(error),
        );
        throw new InternalServerErrorException(message);
      }
    };
  };
}
