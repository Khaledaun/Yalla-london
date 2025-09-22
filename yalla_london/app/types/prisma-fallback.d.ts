
// Fallback Prisma types for build compatibility
declare module '@prisma/client' {
  export interface PrismaClient {
    $connect(): Promise<void>;
    $disconnect(): Promise<void>;
    $executeRaw(...args: any[]): Promise<any>;
    $queryRaw(...args: any[]): Promise<any>;
    [key: string]: any;
  }
  
  export class PrismaClient {
    constructor(options?: any);
  }
  
  export * from './types/global';
}
