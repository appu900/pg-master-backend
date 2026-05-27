-- CreateTable
CREATE TABLE "WebhookData" (
    "id" SERIAL NOT NULL,
    "data" JSONB NOT NULL,

    CONSTRAINT "WebhookData_pkey" PRIMARY KEY ("id")
);
