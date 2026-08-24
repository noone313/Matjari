-- Add password reset columns to merchants table
ALTER TABLE "merchants" ADD COLUMN "password_reset_token" text;
ALTER TABLE "merchants" ADD COLUMN "password_reset_expires" timestamp;
