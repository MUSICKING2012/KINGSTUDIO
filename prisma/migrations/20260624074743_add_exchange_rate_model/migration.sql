-- CreateTable
CREATE TABLE "exchange_rates" (
    "id" TEXT NOT NULL,
    "currency" "DisplayCurrency" NOT NULL,
    "rate_to_krw" DECIMAL(18,8) NOT NULL,
    "fetched_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "source" TEXT NOT NULL DEFAULT 'openexchangerates',

    CONSTRAINT "exchange_rates_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "exchange_rates_currency_fetched_at_idx" ON "exchange_rates"("currency", "fetched_at" DESC);

-- CreateIndex
CREATE UNIQUE INDEX "exchange_rates_currency_fetched_at_key" ON "exchange_rates"("currency", "fetched_at");
