import { Injectable, NotFoundException, BadRequestException, InternalServerErrorException } from "@nestjs/common";
import { PrismaService } from "../common/prisma.service";
import { extname, resolve } from "path";
import * as sharp from "sharp";
import { ConfigService } from "@nestjs/config";
import * as fs from "fs";
import { promises as fsPromises } from "fs";
import { v4 as uuidv4 } from "uuid";
import { Prisma } from "@prisma/client";
import { MultipartFile } from "@fastify/multipart";

const allowedMimeTypes = [
  "image/jpeg", "image/png", "image/gif", "image/bmp", "image/webp",
  "image/tiff", "image/x-tiff", "image/vnd.microsoft.icon",
  "image/svg+xml", "image/heif", "image/heic", "image/avif"
];

@Injectable()
export class ImageService {
  constructor(
    private prisma: PrismaService,
    private configService: ConfigService
  ) {
  }

  async createImage(file: MultipartFile, body: any) {
    if (!file || !file.filename) {
      throw new BadRequestException("A valid image file is required");
    }

    const maxFileSize = 10 * 1024 * 1024;
    if (file.file.truncated || file.file.bytesRead > maxFileSize) {
      throw new BadRequestException("File terlalu besar. Maksimal 10MB");
    }
    if (!allowedMimeTypes.includes(file.mimetype)) {
      throw new BadRequestException(`Invalid image format: ${file.mimetype}`);
    }

    const uploadDir = resolve("uploads");
    await fsPromises.mkdir(uploadDir, { recursive: true });

    const extension = extname(file.filename);
    const serverFileName = `${uuidv4()}${extension}`;
    const uploadPath = resolve(uploadDir, serverFileName);

    await new Promise<void>((resolve, reject) => {
      const writeStream = fs.createWriteStream(uploadPath);
      file.file.pipe(writeStream);
      writeStream.on("finish", () => resolve());
      writeStream.on("error", reject);
    });

    let metadata;
    try {
      metadata = await sharp(uploadPath).metadata();
    } catch (error) {
      throw new InternalServerErrorException(`Failed to process image metadata: ${error.message}`);
    }
    const { width, height } = metadata;

    const fileStats = await fsPromises.stat(uploadPath);
    const fileSize = fileStats.size;

    const image = await this.prisma.image.create({
      data: {
        title: body.title || file.filename,
        description: body.description || null,
        clientFileName: file.filename,
        serverFileName,
        extension,
        size: fileSize,
        width,
        height
      }
    });

    return {
      status: "success",
      message: "Image uploaded successfully",
      data: {
        ...image,
        url: `${this.configService.get<string>("SERVER_URL")}/uploads/${serverFileName}`
      }
    };
  }

  async findById(id: string) {
    const image = await this.prisma.image.findUnique({ where: { id } });
    if (!image) throw new NotFoundException("Image not found");

    return {
      ...image,
      url: `${this.configService.get<string>("SERVER_URL")}/uploads/${image["serverFileName"]}`
    };
  }

  async deleteImage(id: string) {
    const image = await this.prisma.image.findUnique({ where: { id } });
    if (!image) throw new NotFoundException("Image not found");

    await this.prisma.image.delete({ where: { id } });

    const filePath = resolve("uploads", image["serverFileName"]);
    try {
      await fsPromises.unlink(filePath);
    } catch (error) {
      throw new InternalServerErrorException("Failed to delete image file");
    }

    return { deleted: true };
  }

  async getImages(page: number, limit: number) {
    limit = Math.min(limit, 100);
    const skip = (page - 1) * limit;

    const totalData = await this.prisma.image.count();

    const images = await this.prisma.image.findMany({
      skip,
      take: limit,
      orderBy: { createdAt: Prisma.SortOrder.desc }
    });

    return {
      totalData,
      totalPages: Math.ceil(totalData / limit),
      currentPage: page,
      limit,
      data: images.map((image) => ({
        ...image,
        url: `${this.configService.get<string>("SERVER_URL")}/uploads/${image.serverFileName}`
      }))
    };
  }
}
