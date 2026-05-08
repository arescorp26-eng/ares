-- AlterTable: Add missing createdAt to Subject
ALTER TABLE `Subject` ADD COLUMN `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3);
