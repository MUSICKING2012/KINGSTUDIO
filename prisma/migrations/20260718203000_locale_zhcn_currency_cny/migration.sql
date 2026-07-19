-- [L-2] Locale zh-TW→zh-HK 흡수 + zh-CN 신설 / DisplayCurrency TWD→CNY
-- PRD C14·C17 (2026-07-18 개정). 계수 raw 확인: 스칼라 전부 0행,
-- packages.languages_available 만 zh-TW 4행(전부 zh-HK 동시 보유).

-- ===== M1-A: DisplayCurrency 데이터 정리 (raw 0행, 무해) =====
DELETE FROM exchange_rates WHERE currency = 'TWD';
UPDATE payments SET display_currency = NULL WHERE display_currency = 'TWD';
UPDATE quotes   SET currency_display = NULL WHERE currency_display = 'TWD';

-- ===== M1-B: DisplayCurrency enum 교체 =====
CREATE TYPE "DisplayCurrency_new" AS ENUM ('KRW','USD','JPY','HKD','CNY');
ALTER TABLE exchange_rates ALTER COLUMN currency
  TYPE "DisplayCurrency_new" USING currency::text::"DisplayCurrency_new";
ALTER TABLE payments ALTER COLUMN display_currency
  TYPE "DisplayCurrency_new" USING display_currency::text::"DisplayCurrency_new";
ALTER TABLE quotes ALTER COLUMN currency_display
  TYPE "DisplayCurrency_new" USING currency_display::text::"DisplayCurrency_new";
DROP TYPE "DisplayCurrency";
ALTER TYPE "DisplayCurrency_new" RENAME TO "DisplayCurrency";

-- ===== M2-A: zh-TW 제거 (신 enum 확정 전이므로 zh-CN 사용 불가) =====
UPDATE users             SET preferred_language = NULL WHERE preferred_language = 'zh-TW';
DELETE FROM quotes            WHERE language = 'zh-TW';
DELETE FROM song_translations WHERE locale   = 'zh-TW';
DELETE FROM consents          WHERE language = 'zh-TW';
DELETE FROM consent_documents WHERE language = 'zh-TW';
DELETE FROM reviews           WHERE language = 'zh-TW';
DELETE FROM nps_responses     WHERE language = 'zh-TW';
DELETE FROM page_seo          WHERE language = 'zh-TW';
DELETE FROM keywords          WHERE language = 'zh-TW';

UPDATE packages SET languages_available = ARRAY(
  SELECT DISTINCT e FROM unnest(array_remove(languages_available, 'zh-TW'::"Locale")) e ORDER BY e
) WHERE 'zh-TW' = ANY(languages_available);

UPDATE promotion_codes SET applicable_locales = ARRAY(
  SELECT DISTINCT e FROM unnest(array_remove(applicable_locales, 'zh-TW'::"Locale")) e ORDER BY e
) WHERE 'zh-TW' = ANY(applicable_locales);

-- ===== M2-B: Locale enum 교체 (11 컬럼, raw 전수 확인) =====
CREATE TYPE "Locale_new" AS ENUM ('ko','en','ja','zh-HK','zh-CN');
ALTER TABLE users             ALTER COLUMN preferred_language  TYPE "Locale_new" USING preferred_language::text::"Locale_new";
ALTER TABLE quotes            ALTER COLUMN language            TYPE "Locale_new" USING language::text::"Locale_new";
ALTER TABLE song_translations ALTER COLUMN locale              TYPE "Locale_new" USING locale::text::"Locale_new";
ALTER TABLE consents          ALTER COLUMN language            TYPE "Locale_new" USING language::text::"Locale_new";
ALTER TABLE consent_documents ALTER COLUMN language            TYPE "Locale_new" USING language::text::"Locale_new";
ALTER TABLE reviews           ALTER COLUMN language            TYPE "Locale_new" USING language::text::"Locale_new";
ALTER TABLE nps_responses     ALTER COLUMN language            TYPE "Locale_new" USING language::text::"Locale_new";
ALTER TABLE page_seo          ALTER COLUMN language            TYPE "Locale_new" USING language::text::"Locale_new";
ALTER TABLE keywords          ALTER COLUMN language            TYPE "Locale_new" USING language::text::"Locale_new";
ALTER TABLE packages          ALTER COLUMN languages_available TYPE "Locale_new"[] USING languages_available::text[]::"Locale_new"[];
ALTER TABLE promotion_codes   ALTER COLUMN applicable_locales  TYPE "Locale_new"[] USING applicable_locales::text[]::"Locale_new"[];
DROP TYPE "Locale";
ALTER TYPE "Locale_new" RENAME TO "Locale";

-- ===== M2-C: (B) 결정 — zh-HK 보유 패키지에 zh-CN 부여. 멱등 =====
-- promotion_codes 는 (B) 미적용: 할인 적용범위 임의확대 방지
UPDATE packages SET languages_available = ARRAY(
  SELECT DISTINCT e FROM unnest(languages_available || ARRAY['zh-CN'::"Locale"]) e ORDER BY e
)
WHERE 'zh-HK' = ANY(languages_available)
  AND NOT ('zh-CN' = ANY(languages_available));
