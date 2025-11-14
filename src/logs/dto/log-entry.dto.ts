/**
 * Log Entry DTO
 */

import {
  IsString,
  IsNotEmpty,
  IsEnum,
  IsOptional,
  IsObject,
} from 'class-validator';

export enum LogLevel {
  ERROR = 'error',
  WARN = 'warn',
  INFO = 'info',
  DEBUG = 'debug',
}

export class LogEntryDto {
  @IsEnum(LogLevel)
  level: LogLevel;

  @IsString()
  @IsNotEmpty()
  message: string;

  @IsString()
  @IsNotEmpty()
  service: string;

  @IsString()
  @IsOptional()
  timestamp?: string;

  @IsObject()
  @IsOptional()
  metadata?: Record<string, any>;
}

