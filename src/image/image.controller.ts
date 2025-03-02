import {
  Controller,
  Post,
  Get,
  Delete,
  Param,
  Query,
  UseGuards,
  UsePipes,
  ValidationPipe,
  BadRequestException,
  Req
} from "@nestjs/common";
import { FastifyRequest } from "fastify";
import { ApiKeyGuard } from "../common/api-key.guard";
import { ImageDto } from "./dto/image.dto";
import { ImageService } from "./image.service";
import { MultipartFile } from "@fastify/multipart";

@Controller("images")
export class ImageController {
  constructor(private readonly imageService: ImageService) {
  }

  @Get(":id")
  async getImage(@Param("id") id: string) {
    return this.imageService.findById(id);
  }

  @Get()
  async getImages(@Query("page") page = "1", @Query("limit") limit = "10") {
    return this.imageService.getImages(parseInt(page, 10), parseInt(limit, 10));
  }

  @UseGuards(ApiKeyGuard)
  @Post()
  @UsePipes(new ValidationPipe({ transform: true }))
  async uploadImage(@Req() req: FastifyRequest) {
    const parts = req.parts();
    let file: MultipartFile | null = null;
    const body: Partial<ImageDto> = {};

    for await (const part of parts) {
      if (part.type === "file") {
        file = part;
      } else {
        body[part.fieldname] = part.value;
      }
    }

    if (!file) {
      throw new BadRequestException("Image file is required!");
    }

    return this.imageService.createImage(file, body);
  }

  @UseGuards(ApiKeyGuard)
  @Delete(":id")
  async deleteImage(@Param("id") id: string) {
    return this.imageService.deleteImage(id);
  }
}
