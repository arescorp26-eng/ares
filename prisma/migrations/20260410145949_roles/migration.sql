/*
  Warnings:

  - You are about to drop the column `userId` on the `StudySession` table. All the data in the column will be lost.
  - You are about to drop the column `userId` on the `Subject` table. All the data in the column will be lost.
  - Added the required column `studentId` to the `StudySession` table without a default value. This is not possible if the table is not empty.
  - Added the required column `professorId` to the `Subject` table without a default value. This is not possible if the table is not empty.
  - Added the required column `password` to the `User` table without a default value. This is not possible if the table is not empty.

*/
-- DropForeignKey
ALTER TABLE `StudySession` DROP FOREIGN KEY `StudySession_userId_fkey`;

-- DropForeignKey
ALTER TABLE `Subject` DROP FOREIGN KEY `Subject_userId_fkey`;

-- DropIndex
DROP INDEX `StudySession_userId_fkey` ON `StudySession`;

-- DropIndex
DROP INDEX `Subject_userId_fkey` ON `Subject`;

-- AlterTable
ALTER TABLE `StudySession` DROP COLUMN `userId`,
    ADD COLUMN `studentId` INTEGER NOT NULL;

-- AlterTable
ALTER TABLE `Subject` DROP COLUMN `userId`,
    ADD COLUMN `professorId` INTEGER NOT NULL;

-- AlterTable
ALTER TABLE `User` ADD COLUMN `password` VARCHAR(191) NOT NULL,
    ADD COLUMN `role` ENUM('ADMIN', 'PROFESSOR', 'STUDENT') NOT NULL DEFAULT 'STUDENT';

-- CreateTable
CREATE TABLE `Enrollment` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `studentId` INTEGER NOT NULL,
    `subjectId` INTEGER NOT NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    UNIQUE INDEX `Enrollment_studentId_subjectId_key`(`studentId`, `subjectId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- AddForeignKey
ALTER TABLE `Subject` ADD CONSTRAINT `Subject_professorId_fkey` FOREIGN KEY (`professorId`) REFERENCES `User`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `Enrollment` ADD CONSTRAINT `Enrollment_studentId_fkey` FOREIGN KEY (`studentId`) REFERENCES `User`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `Enrollment` ADD CONSTRAINT `Enrollment_subjectId_fkey` FOREIGN KEY (`subjectId`) REFERENCES `Subject`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `StudySession` ADD CONSTRAINT `StudySession_studentId_fkey` FOREIGN KEY (`studentId`) REFERENCES `User`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;
