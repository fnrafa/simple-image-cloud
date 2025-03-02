import { Injectable, NestInterceptor, ExecutionContext, CallHandler, HttpException } from "@nestjs/common";
import { Observable, throwError } from "rxjs";
import { catchError, finalize } from "rxjs/operators";
import { resolve } from "path";
import { promises as fs } from "fs";

@Injectable()
export class LoggingInterceptor implements NestInterceptor {
  async intercept(context: ExecutionContext, next: CallHandler): Promise<Observable<any>> {
    const request = context.switchToHttp().getRequest();
    const method = request.method;

    if (!["POST", "PUT", "DELETE"].includes(method)) {
      return next.handle();
    }

    const ip = request.headers["x-forwarded-for"] || request.socket.remoteAddress || request.ip;
    const url = request.url;
    const startTime = Date.now();

    let statusCode: number;
    let errorMessage: string | null = null;

    return next.handle().pipe(
      catchError((err) => {
        if (err instanceof HttpException) {
          statusCode = err.getStatus();
          errorMessage = err.message;
        } else {
          statusCode = 500;
          errorMessage = "Internal Server Error";
        }
        return throwError(() => err);
      }),
      finalize(async () => {
        const response = context.switchToHttp().getResponse();
        statusCode = statusCode || response.statusCode;

        const duration = Date.now() - startTime;
        const now = new Date();
        const year = now.getFullYear();
        const monthName = now.toLocaleString("default", { month: "long" });
        const month = (now.getMonth() + 1).toString().padStart(2, "0");
        const day = now.getDate().toString().padStart(2, "0");
        const timestamp = `${day}-${month}-${year} ${now.toLocaleTimeString("id-ID", { hour12: false })}`;

        const logDir = resolve("logs", `${monthName}-${year}`);
        const logFile = resolve(logDir, `${year}-${month}-${day}.log`);

        let logMessage = `[${timestamp}] IP: ${ip} METHOD: ${method} URL: ${url} STATUS: ${statusCode} DURATION: ${duration}ms`;
        if (errorMessage) {
          logMessage += ` ERROR: ${errorMessage}`;
        }
        logMessage += "\n";

        try {
          await fs.mkdir(logDir, { recursive: true });
          await fs.appendFile(logFile, logMessage);
        } catch (error) {
          console.error("Error writing log:", error);
        }
      })
    );
  }
}
