import {
  IsString,
  IsNotEmpty,
  IsEnum,
  IsOptional,
  IsObject,
  IsNumber,
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

  // Accept both 'message' (standard) and 'msg' (orchestrator convention)
  @IsString()
  @IsOptional()
  message?: string;

  @IsString()
  @IsOptional()
  msg?: string;

  @IsString()
  @IsNotEmpty()
  service: string;

  @IsString()
  @IsOptional()
  timestamp?: string;

  @IsString()
  @IsOptional()
  task_id?: string;

  @IsString()
  @IsOptional()
  project_id?: string;

  @IsString()
  @IsOptional()
  business_id?: string;

  @IsString()
  @IsOptional()
  agent_id?: string;

  @IsString()
  @IsOptional()
  correlation_id?: string;

  @IsNumber()
  @IsOptional()
  duration_ms?: number;

  @IsObject()
  @IsOptional()
  metadata?: Record<string, any>;
}
