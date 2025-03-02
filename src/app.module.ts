import { Module } from "@nestjs/common";
import { ConfigModule } from "@nestjs/config";
import { ImageModule } from "./image/image.module";
import { PrismaService } from "./common/prisma.service";
import { LogsModule } from "./logs/logs.module";

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true
    }),
    ImageModule,
    LogsModule
  ],
  providers: [PrismaService]
})
export class AppModule {
}
