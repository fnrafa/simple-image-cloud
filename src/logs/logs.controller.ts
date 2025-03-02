import {
  BadRequestException,
  Controller,
  Get,
  NotFoundException,
  Query
} from "@nestjs/common";
import { promises as fs } from "fs";
import { resolve } from "path";

@Controller("logs")
export class LogsController {
  @Get()
  async getLog(@Query("date") date?: string) {
    const now = new Date();
    const year = now.getFullYear();
    const monthName = now.toLocaleString("default", { month: "long" });
    const month = (now.getMonth() + 1).toString().padStart(2, "0");
    const day = now.getDate().toString().padStart(2, "0");
    const targetDate = date || `${year}-${month}-${day}`;
    if (!/^\d{4}-\d{2}-\d{2}$/.test(targetDate)) {
      throw new BadRequestException("Invalid date format. Use YYYY-MM-DD");
    }

    const [logYear, logMonth, logDay] = targetDate.split("-");
    const logDir = resolve("logs", `${monthName}-${logYear}`);
    const logFile = resolve(logDir, `${logYear}-${logMonth}-${logDay}.log`);
    try {
      await fs.access(logFile);
    } catch {
      throw new NotFoundException("Log file not found");
    }

    return await fs.readFile(logFile, "utf-8");
  }
}
