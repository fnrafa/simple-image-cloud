import { NestFactory } from "@nestjs/core";
import { AppModule } from "./app.module";
import { LoggingInterceptor } from "./common/logging.interceptor";
import { FastifyAdapter, NestFastifyApplication } from "@nestjs/platform-fastify";
import multipart from "@fastify/multipart";
import fastifyStatic from "@fastify/static";
import { resolve } from "path";

async function bootstrap() {
  const app = await NestFactory.create<NestFastifyApplication>(
    AppModule,
    new FastifyAdapter()
  );

  app.useGlobalInterceptors(new LoggingInterceptor());

  await app.register(multipart, {
    limits: {
      fileSize: 10 * 1024 * 1024
    }
  });

  await app.register(fastifyStatic, {
    root: resolve("uploads"),
    prefix: "/uploads/"
  });

  await app.listen(3050);
}

bootstrap().then();
