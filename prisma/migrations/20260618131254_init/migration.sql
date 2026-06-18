-- CreateEnum
CREATE TYPE "Locale" AS ENUM ('ko', 'en', 'ja', 'zh-TW', 'zh-HK');

-- CreateEnum
CREATE TYPE "UserStatus" AS ENUM ('active', 'inactive');

-- CreateEnum
CREATE TYPE "AdminStatus" AS ENUM ('active', 'inactive', 'locked');

-- CreateEnum
CREATE TYPE "ReauthActionType" AS ENUM ('refund', 'role_change', 'account_delete', 'bulk_export', 'terms_publish', 'retention_change', 'custom_script');

-- CreateEnum
CREATE TYPE "BookingSource" AS ENUM ('website', 'klook', 'kkday', 'airbnb', 'manual', 'phone');

-- CreateEnum
CREATE TYPE "BookingStatus" AS ENUM ('pending', 'paid', 'confirmed', 'cancelled', 'completed');

-- CreateEnum
CREATE TYPE "BlackoutScope" AS ENUM ('slot', 'full_day', 'recurring');

-- CreateEnum
CREATE TYPE "BlackoutReason" AS ENUM ('internal_use', 'maintenance', 'holiday', 'external_channel', 'other');

-- CreateEnum
CREATE TYPE "PackageCategory" AS ENUM ('experience', 'rental', 'group');

-- CreateEnum
CREATE TYPE "PricingMode" AS ENUM ('per_person_x1_5', 'flat', 'per_head');

-- CreateEnum
CREATE TYPE "BookingFlow" AS ENUM ('instant_payment', 'b2b_quote');

-- CreateEnum
CREATE TYPE "Pg" AS ENUM ('inicis', 'paypal');

-- CreateEnum
CREATE TYPE "PaymentStatus" AS ENUM ('pending', 'paid', 'refunded', 'partial_refunded', 'failed');

-- CreateEnum
CREATE TYPE "RefundReasonCategory" AS ENUM ('customer_change_of_mind', 'business_fault', 'force_majeure', 'post_download');

-- CreateEnum
CREATE TYPE "QuoteStatus" AS ENUM ('draft', 'sent', 'accepted', 'invoiced', 'paid', 'expired');

-- CreateEnum
CREATE TYPE "DisplayCurrency" AS ENUM ('KRW', 'USD', 'JPY', 'TWD', 'HKD');

-- CreateEnum
CREATE TYPE "GroupType" AS ENUM ('making_class', 'kkumgil', 'workshop');

-- CreateEnum
CREATE TYPE "DeliverableType" AS ENUM ('raw_wav', 'raw_mp3', 'master_wav', 'master_mp3', 'photos', 'mv_horizontal', 'highlight_vertical');

-- CreateEnum
CREATE TYPE "DeliverableStatus" AS ENUM ('pending', 'uploading', 'transcoding', 'ready', 'delivered', 'superseded', 'archived');

-- CreateEnum
CREATE TYPE "MagicLinkStatus" AS ENUM ('active', 'expired', 'revoked');

-- CreateEnum
CREATE TYPE "MvDeliveryStatus" AS ENUM ('pending', 'in_production', 'submitted', 'spec_failed', 'spec_passed', 'sent_to_customer');

-- CreateEnum
CREATE TYPE "LicenseType" AS ENUM ('recording', 'mr_distribution', 'lyrics');

-- CreateEnum
CREATE TYPE "ConsentType" AS ENUM ('tos', 'privacy', 'payment', 'usage_scope', 'korean_only', 'guardian', 'marketing_basic', 'marketing_ads', 'marketing_outdoor', 'marketing_broadcast', 'marketing_email', 'marketing_sms', 'license_self_brought');

-- CreateEnum
CREATE TYPE "LegalDocType" AS ENUM ('tos', 'privacy', 'payment', 'refund', 'usage_scope');

-- CreateEnum
CREATE TYPE "ReviewTag" AS ENUM ('vocal_directing', 'audio_quality', 'photo_video', 'facility', 'staff_friendliness', 'value_for_money', 'song_variety');

-- CreateEnum
CREATE TYPE "ReviewStatus" AS ENUM ('published', 'removed');

-- CreateEnum
CREATE TYPE "NpsCategory" AS ENUM ('detractor', 'passive', 'promoter');

-- CreateEnum
CREATE TYPE "ReferralCodeStatus" AS ENUM ('active', 'expired', 'disabled');

-- CreateEnum
CREATE TYPE "ReferralStatus" AS ENUM ('pending', 'qualified', 'rewarded', 'rejected');

-- CreateEnum
CREATE TYPE "DiscountType" AS ENUM ('percentage', 'fixed');

-- CreateEnum
CREATE TYPE "PromotionUsageMode" AS ENUM ('single_use', 'multi_use', 'once_per_user');

-- CreateEnum
CREATE TYPE "PromotionCodeStatus" AS ENUM ('active', 'paused', 'expired', 'exhausted');

-- CreateEnum
CREATE TYPE "CouponSource" AS ENUM ('referral_reward', 'anniversary', 'compensation', 'manual');

-- CreateEnum
CREATE TYPE "CouponStatus" AS ENUM ('active', 'used', 'expired', 'revoked');

-- CreateEnum
CREATE TYPE "NotificationChannel" AS ENUM ('slack', 'kakao', 'email', 'sms');

-- CreateEnum
CREATE TYPE "AdminNotificationType" AS ENUM ('new_booking', 'payment_failed', 'cs_inquiry', 'magic_link_sla_imminent', 'magic_link_sla_exceeded', 'refund_overdue', 'paypal_dispute', 'dsr_request', 'system_down', 'security_alert', 'unfamiliar_login', 'gold_kpi_gate');

-- CreateEnum
CREATE TYPE "AuditAction" AS ENUM ('login', 'logout', 'login_failed', 'refund', 'role_change', 'consent_view', 'consent_export', 'pii_view', 'booking_modify', 'booking_delete', 'content_upload', 'content_download', 'data_export', 'magic_link_reissue', 'blackout_create', 'price_change', 'terms_publish', 'reauth');

-- CreateEnum
CREATE TYPE "KeywordType" AS ENUM ('seo', 'aeo', 'geo');

-- CreateEnum
CREATE TYPE "SchemaType" AS ENUM ('Organization', 'LocalBusiness', 'Product', 'AggregateRating', 'Review', 'FAQPage', 'BreadcrumbList');

-- CreateEnum
CREATE TYPE "SeoCodeSlotType" AS ENUM ('ga4', 'gtm', 'verify_google', 'verify_naver', 'verify_bing', 'custom_script');

-- CreateTable
CREATE TABLE "users" (
    "id" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "name" TEXT,
    "image" TEXT,
    "emailVerified" TIMESTAMP(3),
    "password_hash" TEXT,
    "phone" TEXT,
    "nationality" TEXT,
    "passport_name" TEXT,
    "preferred_language" "Locale",
    "status" "UserStatus" NOT NULL DEFAULT 'active',
    "deleted_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "users_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Account" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "provider" TEXT NOT NULL,
    "providerAccountId" TEXT NOT NULL,
    "refresh_token" TEXT,
    "access_token" TEXT,
    "expires_at" INTEGER,
    "token_type" TEXT,
    "scope" TEXT,
    "id_token" TEXT,
    "session_state" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Account_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "VerificationToken" (
    "identifier" TEXT NOT NULL,
    "token" TEXT NOT NULL,
    "expires" TIMESTAMP(3) NOT NULL
);

-- CreateTable
CREATE TABLE "user_sessions" (
    "id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "token_hash" TEXT NOT NULL,
    "device_fingerprint" TEXT,
    "ip" TEXT,
    "country" TEXT,
    "user_agent" TEXT,
    "expires_at" TIMESTAMP(3),
    "last_active_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "user_sessions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "deleted_users_blacklist" (
    "id" TEXT NOT NULL,
    "email_hash" TEXT NOT NULL,
    "phone_hash" TEXT,
    "deleted_at" TIMESTAMP(3) NOT NULL,
    "cooldown_until" TIMESTAMP(3) NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "deleted_users_blacklist_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "password_resets" (
    "id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "token_hash" TEXT NOT NULL,
    "expires_at" TIMESTAMP(3) NOT NULL,
    "used_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "password_resets_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "email_verifications" (
    "id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "token_hash" TEXT NOT NULL,
    "expires_at" TIMESTAMP(3) NOT NULL,
    "verified_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "email_verifications_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "admin_users" (
    "id" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "password_hash" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "phone" TEXT,
    "slack_user_id" TEXT,
    "totp_secret" TEXT,
    "totp_enabled" BOOLEAN NOT NULL DEFAULT false,
    "status" "AdminStatus" NOT NULL DEFAULT 'active',
    "last_login_at" TIMESTAMP(3),
    "last_login_ip" TEXT,
    "last_login_country" TEXT,
    "failed_login_count" INTEGER NOT NULL DEFAULT 0,
    "locked_until" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "admin_users_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "admin_roles" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "permissions" JSONB NOT NULL,
    "description" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "admin_roles_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "admin_user_roles" (
    "admin_user_id" TEXT NOT NULL,
    "admin_role_id" TEXT NOT NULL,
    "assigned_by" TEXT,
    "assigned_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "admin_user_roles_pkey" PRIMARY KEY ("admin_user_id","admin_role_id")
);

-- CreateTable
CREATE TABLE "admin_sessions" (
    "id" TEXT NOT NULL,
    "admin_user_id" TEXT NOT NULL,
    "token_hash" TEXT NOT NULL,
    "ip" TEXT,
    "user_agent" TEXT,
    "device_fingerprint" TEXT,
    "country" TEXT,
    "expires_at" TIMESTAMP(3),
    "last_active_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "admin_sessions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "reauth_challenges" (
    "id" TEXT NOT NULL,
    "admin_user_id" TEXT NOT NULL,
    "action_type" "ReauthActionType" NOT NULL,
    "target_id" TEXT,
    "challenge_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "verified_at" TIMESTAMP(3),
    "verification_method" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "reauth_challenges_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "rooms" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "display_order" INTEGER NOT NULL DEFAULT 0,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "rooms_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "packages" (
    "id" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "category" "PackageCategory" NOT NULL,
    "name" TEXT NOT NULL,
    "base_price_krw" INTEGER NOT NULL,
    "pricing_mode" "PricingMode" NOT NULL,
    "slot_minutes" INTEGER NOT NULL,
    "headcount_min" INTEGER NOT NULL DEFAULT 1,
    "headcount_max" INTEGER NOT NULL,
    "languages_available" "Locale"[],
    "booking_flow" "BookingFlow" NOT NULL DEFAULT 'instant_payment',
    "friend_referral_eligible" BOOLEAN NOT NULL DEFAULT false,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "display_order" INTEGER NOT NULL DEFAULT 0,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "packages_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "bookings" (
    "id" TEXT NOT NULL,
    "source" "BookingSource" NOT NULL DEFAULT 'website',
    "status" "BookingStatus" NOT NULL DEFAULT 'pending',
    "package_id" TEXT NOT NULL,
    "room_id" TEXT NOT NULL,
    "engineer_id" TEXT,
    "user_id" TEXT,
    "date" DATE NOT NULL,
    "start_time" TIME(0) NOT NULL,
    "end_time" TIME(0) NOT NULL,
    "headcount" INTEGER NOT NULL DEFAULT 1,
    "song_id" TEXT,
    "customer_name" TEXT,
    "customer_email" TEXT NOT NULL,
    "customer_phone" TEXT,
    "customer_nationality" TEXT,
    "customer_passport_name" TEXT,
    "price_total_krw" INTEGER NOT NULL,
    "unit_price_krw" INTEGER NOT NULL,
    "pricing_snapshot" JSONB NOT NULL,
    "refund_policy_snapshot" JSONB NOT NULL,
    "package_snapshot" JSONB NOT NULL,
    "external_ref" TEXT,
    "created_by" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "bookings_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "blackouts" (
    "id" TEXT NOT NULL,
    "scope" "BlackoutScope" NOT NULL,
    "date_start" DATE NOT NULL,
    "date_end" DATE NOT NULL,
    "time_start" TIME(0),
    "time_end" TIME(0),
    "recurring_rule" TEXT,
    "reason" "BlackoutReason" NOT NULL,
    "reason_note" TEXT,
    "room_id" TEXT,
    "created_by" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "blackouts_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "booking_user_links" (
    "id" TEXT NOT NULL,
    "booking_id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "guest_email" TEXT NOT NULL,
    "linked_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "booking_user_links_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "booking_automations" (
    "id" TEXT NOT NULL,
    "booking_id" TEXT NOT NULL,
    "gcal_admin_event_id" TEXT,
    "gcal_admin_synced_at" TIMESTAMP(3),
    "ics_generated_at" TIMESTAMP(3),
    "mail_d7_sent_at" TIMESTAMP(3),
    "mail_d1_sent_at" TIMESTAMP(3),
    "review_request_sent_at" TIMESTAMP(3),
    "mr_access_enabled" BOOLEAN NOT NULL DEFAULT false,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "booking_automations_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "gcal_pulled_blocks" (
    "id" TEXT NOT NULL,
    "gcal_event_id" TEXT NOT NULL,
    "date" DATE NOT NULL,
    "time_start" TIME(0),
    "time_end" TIME(0),
    "room_id" TEXT,
    "blackout_id" TEXT,
    "synced_at" TIMESTAMP(3) NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "gcal_pulled_blocks_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "payments" (
    "id" TEXT NOT NULL,
    "booking_id" TEXT NOT NULL,
    "pg" "Pg" NOT NULL,
    "pg_transaction_id" TEXT,
    "amount_krw" INTEGER NOT NULL,
    "pg_fee_krw" INTEGER NOT NULL DEFAULT 0,
    "display_currency" "DisplayCurrency",
    "display_amount" DECIMAL(14,2),
    "exchange_rate_at_payment" DECIMAL(18,8),
    "status" "PaymentStatus" NOT NULL DEFAULT 'pending',
    "paid_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "payments_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "refunds" (
    "id" TEXT NOT NULL,
    "payment_id" TEXT NOT NULL,
    "reason_category" "RefundReasonCategory" NOT NULL,
    "refund_amount_krw" INTEGER NOT NULL,
    "pg_fee_deducted" BOOLEAN NOT NULL DEFAULT false,
    "admin_user_id" TEXT,
    "admin_memo" TEXT,
    "refunded_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "refunds_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "checkins" (
    "id" TEXT NOT NULL,
    "booking_id" TEXT NOT NULL,
    "checked_in_at" TIMESTAMP(3) NOT NULL,
    "checked_in_by" TEXT,
    "memo" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "checkins_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "dispute_evidences" (
    "id" TEXT NOT NULL,
    "booking_id" TEXT NOT NULL,
    "generated_at" TIMESTAMP(3) NOT NULL,
    "pdf_storage_key" TEXT,
    "generated_by" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "dispute_evidences_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "quotes" (
    "id" TEXT NOT NULL,
    "inquiry_id" TEXT,
    "group_type" "GroupType" NOT NULL,
    "package_id" TEXT NOT NULL,
    "headcount" INTEGER NOT NULL,
    "unit_price" INTEGER NOT NULL,
    "subtotal" INTEGER NOT NULL,
    "discount" INTEGER NOT NULL DEFAULT 0,
    "vat" INTEGER NOT NULL DEFAULT 0,
    "total_krw" INTEGER NOT NULL,
    "currency_display" "DisplayCurrency",
    "valid_until" TIMESTAMP(3),
    "language" "Locale" NOT NULL,
    "status" "QuoteStatus" NOT NULL DEFAULT 'draft',
    "pdf_storage_key" TEXT,
    "issued_by" TEXT,
    "issued_at" TIMESTAMP(3),
    "accepted_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "quotes_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "songs" (
    "id" TEXT NOT NULL,
    "beginner_curation" BOOLEAN NOT NULL DEFAULT false,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "songs_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "song_translations" (
    "id" TEXT NOT NULL,
    "song_id" TEXT NOT NULL,
    "locale" "Locale" NOT NULL,
    "title" TEXT NOT NULL,
    "artist" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "song_translations_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "song_licenses" (
    "id" TEXT NOT NULL,
    "song_id" TEXT NOT NULL,
    "type" "LicenseType" NOT NULL,
    "verified" BOOLEAN NOT NULL DEFAULT false,
    "evidence_storage_key" TEXT,
    "notes" TEXT,
    "verified_at" TIMESTAMP(3),
    "verified_by" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "song_licenses_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "deliverables" (
    "id" TEXT NOT NULL,
    "booking_id" TEXT NOT NULL,
    "type" "DeliverableType" NOT NULL,
    "version" INTEGER NOT NULL DEFAULT 1,
    "status" "DeliverableStatus" NOT NULL DEFAULT 'pending',
    "storage_key" TEXT,
    "file_size_bytes" BIGINT,
    "uploaded_by" TEXT,
    "uploaded_at" TIMESTAMP(3),
    "released_at" TIMESTAMP(3),
    "supersedes_id" TEXT,
    "retention_until" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "deliverables_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "magic_links" (
    "id" TEXT NOT NULL,
    "token_hash" TEXT NOT NULL,
    "booking_id" TEXT NOT NULL,
    "generated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "expires_at" TIMESTAMP(3) NOT NULL,
    "last_accessed_at" TIMESTAMP(3),
    "access_count" INTEGER NOT NULL DEFAULT 0,
    "status" "MagicLinkStatus" NOT NULL DEFAULT 'active',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "magic_links_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "download_logs" (
    "id" TEXT NOT NULL,
    "magic_link_id" TEXT NOT NULL,
    "deliverable_id" TEXT,
    "deliverable_type_snapshot" "DeliverableType",
    "file_name_snapshot" TEXT,
    "downloaded_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "ip" TEXT,
    "user_agent" TEXT,
    "bytes_transferred" BIGINT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "download_logs_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "mv_teams" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "contact_email" TEXT,
    "contact_phone" TEXT,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "notes" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "mv_teams_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "mv_deliveries" (
    "id" TEXT NOT NULL,
    "booking_id" TEXT NOT NULL,
    "mv_team_id" TEXT,
    "status" "MvDeliveryStatus" NOT NULL DEFAULT 'pending',
    "expected_delivery_date" DATE,
    "actual_delivery_date" DATE,
    "spec_check_result" JSONB,
    "spec_passed" BOOLEAN,
    "rejection_count" INTEGER NOT NULL DEFAULT 0,
    "rejection_reasons" JSONB,
    "main_file_storage_key" TEXT,
    "short_file_storage_key" TEXT,
    "uploaded_by" TEXT,
    "uploaded_at" TIMESTAMP(3),
    "sent_to_customer_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "mv_deliveries_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "consents" (
    "id" UUID NOT NULL,
    "booking_id" TEXT,
    "user_id" TEXT,
    "consent_type" "ConsentType" NOT NULL,
    "consent_group_id" UUID NOT NULL,
    "consent_version" TEXT,
    "consented" BOOLEAN NOT NULL,
    "consented_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "ip" TEXT,
    "user_agent" TEXT,
    "language" "Locale" NOT NULL,
    "extra_data" JSONB,
    "revoked_at" TIMESTAMP(3),
    "revocation_reason" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "consents_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "consent_documents" (
    "id" TEXT NOT NULL,
    "type" "LegalDocType" NOT NULL,
    "version" TEXT NOT NULL,
    "language" "Locale" NOT NULL,
    "content_md" TEXT NOT NULL,
    "content_hash" TEXT NOT NULL,
    "effective_from" TIMESTAMP(3) NOT NULL,
    "published_by" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "consent_documents_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "settings" (
    "id" TEXT NOT NULL,
    "key" TEXT NOT NULL,
    "value" JSONB NOT NULL,
    "updated_by" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "settings_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "booking_participants" (
    "id" TEXT NOT NULL,
    "booking_id" TEXT NOT NULL,
    "date_of_birth" DATE NOT NULL,
    "is_minor" BOOLEAN NOT NULL,
    "guardian_consent_id" UUID,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "booking_participants_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "reviews" (
    "id" TEXT NOT NULL,
    "booking_id" TEXT NOT NULL,
    "rating" INTEGER NOT NULL,
    "tags" "ReviewTag"[],
    "body" TEXT,
    "author_display" TEXT NOT NULL,
    "author_name_snapshot" TEXT,
    "package_snapshot" JSONB NOT NULL,
    "language" "Locale" NOT NULL,
    "status" "ReviewStatus" NOT NULL DEFAULT 'published',
    "moderation_reason" TEXT,
    "moderated_by" TEXT,
    "moderated_at" TIMESTAMP(3),
    "ip" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "reviews_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "review_replies" (
    "id" TEXT NOT NULL,
    "review_id" TEXT NOT NULL,
    "body" TEXT NOT NULL,
    "replied_by" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "review_replies_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "nps_responses" (
    "id" TEXT NOT NULL,
    "booking_id" TEXT NOT NULL,
    "score" INTEGER NOT NULL,
    "category" "NpsCategory" NOT NULL,
    "responded_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "language" "Locale" NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "nps_responses_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "referral_codes" (
    "id" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "inviter_user_id" TEXT,
    "inviter_email" TEXT NOT NULL,
    "expires_at" TIMESTAMP(3) NOT NULL,
    "usage_count" INTEGER NOT NULL DEFAULT 0,
    "max_usage" INTEGER NOT NULL DEFAULT 10,
    "status" "ReferralCodeStatus" NOT NULL DEFAULT 'active',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "referral_codes_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "referrals" (
    "id" TEXT NOT NULL,
    "referral_code_id" TEXT NOT NULL,
    "invitee_booking_id" TEXT,
    "invitee_payment_id" TEXT,
    "status" "ReferralStatus" NOT NULL DEFAULT 'pending',
    "invitee_discount_krw" INTEGER,
    "inviter_coupon_id" TEXT,
    "rejection_reason" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "qualified_at" TIMESTAMP(3),
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "referrals_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "promotion_codes" (
    "id" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "type" "DiscountType" NOT NULL,
    "value" INTEGER NOT NULL,
    "usage_mode" "PromotionUsageMode" NOT NULL,
    "status" "PromotionCodeStatus" NOT NULL DEFAULT 'active',
    "expires_at" TIMESTAMP(3) NOT NULL,
    "min_order_krw" INTEGER,
    "total_limit" INTEGER,
    "usage_count" INTEGER NOT NULL DEFAULT 0,
    "applicable_packages" JSONB,
    "applicable_locales" "Locale"[],
    "channel_tag" TEXT NOT NULL,
    "approved_by" TEXT,
    "created_by" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "promotion_codes_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "coupons" (
    "id" TEXT NOT NULL,
    "code" TEXT,
    "user_id" TEXT,
    "type" "DiscountType" NOT NULL,
    "value" INTEGER NOT NULL,
    "cap_krw" INTEGER,
    "source" "CouponSource" NOT NULL,
    "status" "CouponStatus" NOT NULL DEFAULT 'active',
    "expires_at" TIMESTAMP(3) NOT NULL,
    "used_booking_id" TEXT,
    "promotion_code_id" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "coupons_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "notifications_log" (
    "id" TEXT NOT NULL,
    "booking_id" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "channel" "NotificationChannel" NOT NULL,
    "sent_at" TIMESTAMP(3),
    "delivered" BOOLEAN NOT NULL DEFAULT false,
    "provider_message_id" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "notifications_log_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "notification_preferences" (
    "id" TEXT NOT NULL,
    "admin_user_id" TEXT NOT NULL,
    "notification_type" "AdminNotificationType" NOT NULL,
    "channel" "NotificationChannel" NOT NULL,
    "enabled" BOOLEAN NOT NULL DEFAULT true,
    "quiet_hours_start" TIME(0),
    "quiet_hours_end" TIME(0),
    "override_quiet_for_urgent" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "notification_preferences_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "notification_global_policy" (
    "id" TEXT NOT NULL,
    "notification_type" "AdminNotificationType" NOT NULL,
    "default_recipients_role" TEXT,
    "default_channels" "NotificationChannel"[],
    "enabled" BOOLEAN NOT NULL DEFAULT true,
    "disabled_at" TIMESTAMP(3),
    "disabled_by" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "notification_global_policy_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "notification_logs" (
    "id" TEXT NOT NULL,
    "notification_type" "AdminNotificationType" NOT NULL,
    "recipient_admin_user_id" TEXT,
    "channel" "NotificationChannel" NOT NULL,
    "payload" JSONB,
    "sent_at" TIMESTAMP(3),
    "delivered" BOOLEAN NOT NULL DEFAULT false,
    "provider_message_id" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "notification_logs_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "audit_logs" (
    "id" TEXT NOT NULL,
    "actor_admin_user_id" TEXT,
    "action" "AuditAction" NOT NULL,
    "target_type" TEXT,
    "target_id" TEXT,
    "metadata" JSONB,
    "ip" TEXT,
    "user_agent" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "audit_logs_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "page_seo" (
    "id" TEXT NOT NULL,
    "page_path" TEXT NOT NULL,
    "language" "Locale" NOT NULL,
    "title" TEXT,
    "description" TEXT,
    "h1" TEXT,
    "excerpt" TEXT,
    "canonical_url" TEXT,
    "og_image_url" TEXT,
    "noindex" BOOLEAN NOT NULL DEFAULT false,
    "nofollow" BOOLEAN NOT NULL DEFAULT false,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "page_seo_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "page_schemas" (
    "id" TEXT NOT NULL,
    "page_path" TEXT NOT NULL,
    "schema_type" "SchemaType" NOT NULL,
    "schema_template_id" TEXT,
    "custom_json" JSONB,
    "validated" BOOLEAN NOT NULL DEFAULT false,
    "validated_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "page_schemas_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "schema_templates" (
    "id" TEXT NOT NULL,
    "type" "SchemaType" NOT NULL,
    "name" TEXT NOT NULL,
    "json_template" JSONB NOT NULL,
    "required_fields" JSONB NOT NULL,
    "version" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "schema_templates_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "keywords" (
    "id" TEXT NOT NULL,
    "type" "KeywordType" NOT NULL,
    "keyword" TEXT NOT NULL,
    "language" "Locale" NOT NULL,
    "priority" INTEGER NOT NULL DEFAULT 0,
    "target_page_id" TEXT,
    "search_volume" INTEGER,
    "current_rank" INTEGER,
    "target_rank" INTEGER,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "keywords_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "geo_test_results" (
    "id" TEXT NOT NULL,
    "keyword_id" TEXT NOT NULL,
    "engine" TEXT NOT NULL,
    "tested_at" TIMESTAMP(3) NOT NULL,
    "mentioned" BOOLEAN NOT NULL DEFAULT false,
    "rank_position" INTEGER,
    "citation_sources" JSONB,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "geo_test_results_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "seo_code_slots" (
    "id" TEXT NOT NULL,
    "page_path" TEXT,
    "slot_type" "SeoCodeSlotType" NOT NULL,
    "value" TEXT NOT NULL,
    "enabled" BOOLEAN NOT NULL DEFAULT false,
    "requires_reauth" BOOLEAN NOT NULL DEFAULT false,
    "created_by" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "seo_code_slots_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "users_email_key" ON "users"("email");

-- CreateIndex
CREATE INDEX "users_status_idx" ON "users"("status");

-- CreateIndex
CREATE INDEX "users_deleted_at_idx" ON "users"("deleted_at");

-- CreateIndex
CREATE INDEX "Account_userId_idx" ON "Account"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "Account_provider_providerAccountId_key" ON "Account"("provider", "providerAccountId");

-- CreateIndex
CREATE UNIQUE INDEX "VerificationToken_identifier_token_key" ON "VerificationToken"("identifier", "token");

-- CreateIndex
CREATE UNIQUE INDEX "user_sessions_token_hash_key" ON "user_sessions"("token_hash");

-- CreateIndex
CREATE INDEX "user_sessions_user_id_idx" ON "user_sessions"("user_id");

-- CreateIndex
CREATE INDEX "user_sessions_expires_at_idx" ON "user_sessions"("expires_at");

-- CreateIndex
CREATE INDEX "deleted_users_blacklist_email_hash_idx" ON "deleted_users_blacklist"("email_hash");

-- CreateIndex
CREATE INDEX "deleted_users_blacklist_phone_hash_idx" ON "deleted_users_blacklist"("phone_hash");

-- CreateIndex
CREATE UNIQUE INDEX "password_resets_token_hash_key" ON "password_resets"("token_hash");

-- CreateIndex
CREATE INDEX "password_resets_user_id_idx" ON "password_resets"("user_id");

-- CreateIndex
CREATE UNIQUE INDEX "email_verifications_token_hash_key" ON "email_verifications"("token_hash");

-- CreateIndex
CREATE INDEX "email_verifications_user_id_idx" ON "email_verifications"("user_id");

-- CreateIndex
CREATE UNIQUE INDEX "admin_users_email_key" ON "admin_users"("email");

-- CreateIndex
CREATE INDEX "admin_users_status_idx" ON "admin_users"("status");

-- CreateIndex
CREATE UNIQUE INDEX "admin_roles_name_key" ON "admin_roles"("name");

-- CreateIndex
CREATE INDEX "admin_user_roles_admin_role_id_idx" ON "admin_user_roles"("admin_role_id");

-- CreateIndex
CREATE UNIQUE INDEX "admin_sessions_token_hash_key" ON "admin_sessions"("token_hash");

-- CreateIndex
CREATE INDEX "admin_sessions_admin_user_id_idx" ON "admin_sessions"("admin_user_id");

-- CreateIndex
CREATE INDEX "admin_sessions_expires_at_idx" ON "admin_sessions"("expires_at");

-- CreateIndex
CREATE INDEX "reauth_challenges_admin_user_id_idx" ON "reauth_challenges"("admin_user_id");

-- CreateIndex
CREATE INDEX "reauth_challenges_action_type_idx" ON "reauth_challenges"("action_type");

-- CreateIndex
CREATE UNIQUE INDEX "rooms_name_key" ON "rooms"("name");

-- CreateIndex
CREATE UNIQUE INDEX "packages_slug_key" ON "packages"("slug");

-- CreateIndex
CREATE INDEX "packages_category_idx" ON "packages"("category");

-- CreateIndex
CREATE INDEX "packages_is_active_idx" ON "packages"("is_active");

-- CreateIndex
CREATE INDEX "bookings_room_id_date_idx" ON "bookings"("room_id", "date");

-- CreateIndex
CREATE INDEX "bookings_date_idx" ON "bookings"("date");

-- CreateIndex
CREATE INDEX "bookings_status_idx" ON "bookings"("status");

-- CreateIndex
CREATE INDEX "bookings_user_id_idx" ON "bookings"("user_id");

-- CreateIndex
CREATE INDEX "bookings_customer_email_idx" ON "bookings"("customer_email");

-- CreateIndex
CREATE INDEX "bookings_package_id_idx" ON "bookings"("package_id");

-- CreateIndex
CREATE INDEX "bookings_engineer_id_idx" ON "bookings"("engineer_id");

-- CreateIndex
CREATE INDEX "blackouts_room_id_idx" ON "blackouts"("room_id");

-- CreateIndex
CREATE INDEX "blackouts_date_start_date_end_idx" ON "blackouts"("date_start", "date_end");

-- CreateIndex
CREATE INDEX "blackouts_scope_idx" ON "blackouts"("scope");

-- CreateIndex
CREATE UNIQUE INDEX "booking_user_links_booking_id_key" ON "booking_user_links"("booking_id");

-- CreateIndex
CREATE INDEX "booking_user_links_user_id_idx" ON "booking_user_links"("user_id");

-- CreateIndex
CREATE UNIQUE INDEX "booking_automations_booking_id_key" ON "booking_automations"("booking_id");

-- CreateIndex
CREATE UNIQUE INDEX "gcal_pulled_blocks_gcal_event_id_key" ON "gcal_pulled_blocks"("gcal_event_id");

-- CreateIndex
CREATE UNIQUE INDEX "gcal_pulled_blocks_blackout_id_key" ON "gcal_pulled_blocks"("blackout_id");

-- CreateIndex
CREATE INDEX "gcal_pulled_blocks_room_id_idx" ON "gcal_pulled_blocks"("room_id");

-- CreateIndex
CREATE INDEX "payments_booking_id_idx" ON "payments"("booking_id");

-- CreateIndex
CREATE INDEX "payments_status_idx" ON "payments"("status");

-- CreateIndex
CREATE INDEX "payments_pg_transaction_id_idx" ON "payments"("pg_transaction_id");

-- CreateIndex
CREATE INDEX "refunds_payment_id_idx" ON "refunds"("payment_id");

-- CreateIndex
CREATE INDEX "refunds_reason_category_idx" ON "refunds"("reason_category");

-- CreateIndex
CREATE INDEX "refunds_admin_user_id_idx" ON "refunds"("admin_user_id");

-- CreateIndex
CREATE UNIQUE INDEX "checkins_booking_id_key" ON "checkins"("booking_id");

-- CreateIndex
CREATE INDEX "dispute_evidences_booking_id_idx" ON "dispute_evidences"("booking_id");

-- CreateIndex
CREATE INDEX "quotes_package_id_idx" ON "quotes"("package_id");

-- CreateIndex
CREATE INDEX "quotes_status_idx" ON "quotes"("status");

-- CreateIndex
CREATE INDEX "quotes_inquiry_id_idx" ON "quotes"("inquiry_id");

-- CreateIndex
CREATE INDEX "quotes_status_valid_until_idx" ON "quotes"("status", "valid_until");

-- CreateIndex
CREATE INDEX "songs_is_active_idx" ON "songs"("is_active");

-- CreateIndex
CREATE INDEX "songs_beginner_curation_idx" ON "songs"("beginner_curation");

-- CreateIndex
CREATE INDEX "song_translations_song_id_idx" ON "song_translations"("song_id");

-- CreateIndex
CREATE UNIQUE INDEX "song_translations_song_id_locale_key" ON "song_translations"("song_id", "locale");

-- CreateIndex
CREATE INDEX "song_licenses_song_id_idx" ON "song_licenses"("song_id");

-- CreateIndex
CREATE INDEX "song_licenses_type_verified_idx" ON "song_licenses"("type", "verified");

-- CreateIndex
CREATE UNIQUE INDEX "song_licenses_song_id_type_key" ON "song_licenses"("song_id", "type");

-- CreateIndex
CREATE UNIQUE INDEX "deliverables_supersedes_id_key" ON "deliverables"("supersedes_id");

-- CreateIndex
CREATE INDEX "deliverables_booking_id_idx" ON "deliverables"("booking_id");

-- CreateIndex
CREATE INDEX "deliverables_status_idx" ON "deliverables"("status");

-- CreateIndex
CREATE INDEX "deliverables_type_idx" ON "deliverables"("type");

-- CreateIndex
CREATE UNIQUE INDEX "magic_links_token_hash_key" ON "magic_links"("token_hash");

-- CreateIndex
CREATE INDEX "magic_links_booking_id_idx" ON "magic_links"("booking_id");

-- CreateIndex
CREATE INDEX "magic_links_status_idx" ON "magic_links"("status");

-- CreateIndex
CREATE INDEX "magic_links_expires_at_idx" ON "magic_links"("expires_at");

-- CreateIndex
CREATE INDEX "download_logs_magic_link_id_idx" ON "download_logs"("magic_link_id");

-- CreateIndex
CREATE INDEX "download_logs_deliverable_id_idx" ON "download_logs"("deliverable_id");

-- CreateIndex
CREATE INDEX "download_logs_ip_idx" ON "download_logs"("ip");

-- CreateIndex
CREATE UNIQUE INDEX "mv_deliveries_booking_id_key" ON "mv_deliveries"("booking_id");

-- CreateIndex
CREATE INDEX "mv_deliveries_mv_team_id_idx" ON "mv_deliveries"("mv_team_id");

-- CreateIndex
CREATE INDEX "mv_deliveries_status_idx" ON "mv_deliveries"("status");

-- CreateIndex
CREATE INDEX "consents_booking_id_idx" ON "consents"("booking_id");

-- CreateIndex
CREATE INDEX "consents_user_id_idx" ON "consents"("user_id");

-- CreateIndex
CREATE INDEX "consents_consent_type_idx" ON "consents"("consent_type");

-- CreateIndex
CREATE INDEX "consents_consent_group_id_idx" ON "consents"("consent_group_id");

-- CreateIndex
CREATE INDEX "consents_consent_version_idx" ON "consents"("consent_version");

-- CreateIndex
CREATE INDEX "consent_documents_type_language_idx" ON "consent_documents"("type", "language");

-- CreateIndex
CREATE UNIQUE INDEX "consent_documents_type_version_language_key" ON "consent_documents"("type", "version", "language");

-- CreateIndex
CREATE UNIQUE INDEX "settings_key_key" ON "settings"("key");

-- CreateIndex
CREATE INDEX "booking_participants_booking_id_idx" ON "booking_participants"("booking_id");

-- CreateIndex
CREATE INDEX "booking_participants_guardian_consent_id_idx" ON "booking_participants"("guardian_consent_id");

-- CreateIndex
CREATE UNIQUE INDEX "reviews_booking_id_key" ON "reviews"("booking_id");

-- CreateIndex
CREATE INDEX "reviews_status_idx" ON "reviews"("status");

-- CreateIndex
CREATE INDEX "reviews_rating_idx" ON "reviews"("rating");

-- CreateIndex
CREATE INDEX "review_replies_review_id_idx" ON "review_replies"("review_id");

-- CreateIndex
CREATE UNIQUE INDEX "nps_responses_booking_id_key" ON "nps_responses"("booking_id");

-- CreateIndex
CREATE INDEX "nps_responses_category_idx" ON "nps_responses"("category");

-- CreateIndex
CREATE UNIQUE INDEX "referral_codes_code_key" ON "referral_codes"("code");

-- CreateIndex
CREATE INDEX "referral_codes_inviter_user_id_idx" ON "referral_codes"("inviter_user_id");

-- CreateIndex
CREATE INDEX "referral_codes_status_idx" ON "referral_codes"("status");

-- CreateIndex
CREATE UNIQUE INDEX "referrals_invitee_booking_id_key" ON "referrals"("invitee_booking_id");

-- CreateIndex
CREATE UNIQUE INDEX "referrals_invitee_payment_id_key" ON "referrals"("invitee_payment_id");

-- CreateIndex
CREATE UNIQUE INDEX "referrals_inviter_coupon_id_key" ON "referrals"("inviter_coupon_id");

-- CreateIndex
CREATE INDEX "referrals_referral_code_id_idx" ON "referrals"("referral_code_id");

-- CreateIndex
CREATE INDEX "referrals_status_idx" ON "referrals"("status");

-- CreateIndex
CREATE UNIQUE INDEX "promotion_codes_code_key" ON "promotion_codes"("code");

-- CreateIndex
CREATE INDEX "promotion_codes_status_idx" ON "promotion_codes"("status");

-- CreateIndex
CREATE UNIQUE INDEX "coupons_code_key" ON "coupons"("code");

-- CreateIndex
CREATE UNIQUE INDEX "coupons_used_booking_id_key" ON "coupons"("used_booking_id");

-- CreateIndex
CREATE INDEX "coupons_user_id_idx" ON "coupons"("user_id");

-- CreateIndex
CREATE INDEX "coupons_status_idx" ON "coupons"("status");

-- CreateIndex
CREATE INDEX "notifications_log_booking_id_idx" ON "notifications_log"("booking_id");

-- CreateIndex
CREATE INDEX "notifications_log_type_idx" ON "notifications_log"("type");

-- CreateIndex
CREATE INDEX "notification_preferences_admin_user_id_idx" ON "notification_preferences"("admin_user_id");

-- CreateIndex
CREATE UNIQUE INDEX "notification_preferences_admin_user_id_notification_type_ch_key" ON "notification_preferences"("admin_user_id", "notification_type", "channel");

-- CreateIndex
CREATE UNIQUE INDEX "notification_global_policy_notification_type_key" ON "notification_global_policy"("notification_type");

-- CreateIndex
CREATE INDEX "notification_logs_notification_type_idx" ON "notification_logs"("notification_type");

-- CreateIndex
CREATE INDEX "notification_logs_recipient_admin_user_id_idx" ON "notification_logs"("recipient_admin_user_id");

-- CreateIndex
CREATE INDEX "audit_logs_actor_admin_user_id_idx" ON "audit_logs"("actor_admin_user_id");

-- CreateIndex
CREATE INDEX "audit_logs_action_idx" ON "audit_logs"("action");

-- CreateIndex
CREATE INDEX "audit_logs_target_type_target_id_idx" ON "audit_logs"("target_type", "target_id");

-- CreateIndex
CREATE INDEX "audit_logs_created_at_idx" ON "audit_logs"("created_at");

-- CreateIndex
CREATE INDEX "page_seo_page_path_idx" ON "page_seo"("page_path");

-- CreateIndex
CREATE UNIQUE INDEX "page_seo_page_path_language_key" ON "page_seo"("page_path", "language");

-- CreateIndex
CREATE INDEX "page_schemas_page_path_idx" ON "page_schemas"("page_path");

-- CreateIndex
CREATE INDEX "page_schemas_schema_type_idx" ON "page_schemas"("schema_type");

-- CreateIndex
CREATE INDEX "keywords_type_idx" ON "keywords"("type");

-- CreateIndex
CREATE INDEX "keywords_language_idx" ON "keywords"("language");

-- CreateIndex
CREATE INDEX "geo_test_results_keyword_id_idx" ON "geo_test_results"("keyword_id");

-- CreateIndex
CREATE INDEX "seo_code_slots_slot_type_idx" ON "seo_code_slots"("slot_type");

-- AddForeignKey
ALTER TABLE "Account" ADD CONSTRAINT "Account_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "user_sessions" ADD CONSTRAINT "user_sessions_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "password_resets" ADD CONSTRAINT "password_resets_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "email_verifications" ADD CONSTRAINT "email_verifications_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "admin_user_roles" ADD CONSTRAINT "admin_user_roles_admin_user_id_fkey" FOREIGN KEY ("admin_user_id") REFERENCES "admin_users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "admin_user_roles" ADD CONSTRAINT "admin_user_roles_admin_role_id_fkey" FOREIGN KEY ("admin_role_id") REFERENCES "admin_roles"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "admin_sessions" ADD CONSTRAINT "admin_sessions_admin_user_id_fkey" FOREIGN KEY ("admin_user_id") REFERENCES "admin_users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "reauth_challenges" ADD CONSTRAINT "reauth_challenges_admin_user_id_fkey" FOREIGN KEY ("admin_user_id") REFERENCES "admin_users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "bookings" ADD CONSTRAINT "bookings_package_id_fkey" FOREIGN KEY ("package_id") REFERENCES "packages"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "bookings" ADD CONSTRAINT "bookings_room_id_fkey" FOREIGN KEY ("room_id") REFERENCES "rooms"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "bookings" ADD CONSTRAINT "bookings_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "bookings" ADD CONSTRAINT "bookings_song_id_fkey" FOREIGN KEY ("song_id") REFERENCES "songs"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "blackouts" ADD CONSTRAINT "blackouts_room_id_fkey" FOREIGN KEY ("room_id") REFERENCES "rooms"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "booking_user_links" ADD CONSTRAINT "booking_user_links_booking_id_fkey" FOREIGN KEY ("booking_id") REFERENCES "bookings"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "booking_user_links" ADD CONSTRAINT "booking_user_links_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "booking_automations" ADD CONSTRAINT "booking_automations_booking_id_fkey" FOREIGN KEY ("booking_id") REFERENCES "bookings"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "gcal_pulled_blocks" ADD CONSTRAINT "gcal_pulled_blocks_room_id_fkey" FOREIGN KEY ("room_id") REFERENCES "rooms"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "gcal_pulled_blocks" ADD CONSTRAINT "gcal_pulled_blocks_blackout_id_fkey" FOREIGN KEY ("blackout_id") REFERENCES "blackouts"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "payments" ADD CONSTRAINT "payments_booking_id_fkey" FOREIGN KEY ("booking_id") REFERENCES "bookings"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "refunds" ADD CONSTRAINT "refunds_payment_id_fkey" FOREIGN KEY ("payment_id") REFERENCES "payments"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "refunds" ADD CONSTRAINT "refunds_admin_user_id_fkey" FOREIGN KEY ("admin_user_id") REFERENCES "admin_users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "checkins" ADD CONSTRAINT "checkins_booking_id_fkey" FOREIGN KEY ("booking_id") REFERENCES "bookings"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "dispute_evidences" ADD CONSTRAINT "dispute_evidences_booking_id_fkey" FOREIGN KEY ("booking_id") REFERENCES "bookings"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "quotes" ADD CONSTRAINT "quotes_package_id_fkey" FOREIGN KEY ("package_id") REFERENCES "packages"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "song_translations" ADD CONSTRAINT "song_translations_song_id_fkey" FOREIGN KEY ("song_id") REFERENCES "songs"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "song_licenses" ADD CONSTRAINT "song_licenses_song_id_fkey" FOREIGN KEY ("song_id") REFERENCES "songs"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "deliverables" ADD CONSTRAINT "deliverables_booking_id_fkey" FOREIGN KEY ("booking_id") REFERENCES "bookings"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "deliverables" ADD CONSTRAINT "deliverables_supersedes_id_fkey" FOREIGN KEY ("supersedes_id") REFERENCES "deliverables"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "magic_links" ADD CONSTRAINT "magic_links_booking_id_fkey" FOREIGN KEY ("booking_id") REFERENCES "bookings"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "download_logs" ADD CONSTRAINT "download_logs_magic_link_id_fkey" FOREIGN KEY ("magic_link_id") REFERENCES "magic_links"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "download_logs" ADD CONSTRAINT "download_logs_deliverable_id_fkey" FOREIGN KEY ("deliverable_id") REFERENCES "deliverables"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "mv_deliveries" ADD CONSTRAINT "mv_deliveries_booking_id_fkey" FOREIGN KEY ("booking_id") REFERENCES "bookings"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "mv_deliveries" ADD CONSTRAINT "mv_deliveries_mv_team_id_fkey" FOREIGN KEY ("mv_team_id") REFERENCES "mv_teams"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "consents" ADD CONSTRAINT "consents_booking_id_fkey" FOREIGN KEY ("booking_id") REFERENCES "bookings"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "consents" ADD CONSTRAINT "consents_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "booking_participants" ADD CONSTRAINT "booking_participants_booking_id_fkey" FOREIGN KEY ("booking_id") REFERENCES "bookings"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "booking_participants" ADD CONSTRAINT "booking_participants_guardian_consent_id_fkey" FOREIGN KEY ("guardian_consent_id") REFERENCES "consents"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "reviews" ADD CONSTRAINT "reviews_booking_id_fkey" FOREIGN KEY ("booking_id") REFERENCES "bookings"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "review_replies" ADD CONSTRAINT "review_replies_review_id_fkey" FOREIGN KEY ("review_id") REFERENCES "reviews"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "nps_responses" ADD CONSTRAINT "nps_responses_booking_id_fkey" FOREIGN KEY ("booking_id") REFERENCES "bookings"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "referral_codes" ADD CONSTRAINT "referral_codes_inviter_user_id_fkey" FOREIGN KEY ("inviter_user_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "referrals" ADD CONSTRAINT "referrals_referral_code_id_fkey" FOREIGN KEY ("referral_code_id") REFERENCES "referral_codes"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "referrals" ADD CONSTRAINT "referrals_invitee_booking_id_fkey" FOREIGN KEY ("invitee_booking_id") REFERENCES "bookings"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "referrals" ADD CONSTRAINT "referrals_invitee_payment_id_fkey" FOREIGN KEY ("invitee_payment_id") REFERENCES "payments"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "referrals" ADD CONSTRAINT "referrals_inviter_coupon_id_fkey" FOREIGN KEY ("inviter_coupon_id") REFERENCES "coupons"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "coupons" ADD CONSTRAINT "coupons_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "coupons" ADD CONSTRAINT "coupons_used_booking_id_fkey" FOREIGN KEY ("used_booking_id") REFERENCES "bookings"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "coupons" ADD CONSTRAINT "coupons_promotion_code_id_fkey" FOREIGN KEY ("promotion_code_id") REFERENCES "promotion_codes"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "notifications_log" ADD CONSTRAINT "notifications_log_booking_id_fkey" FOREIGN KEY ("booking_id") REFERENCES "bookings"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "notification_preferences" ADD CONSTRAINT "notification_preferences_admin_user_id_fkey" FOREIGN KEY ("admin_user_id") REFERENCES "admin_users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "notification_logs" ADD CONSTRAINT "notification_logs_recipient_admin_user_id_fkey" FOREIGN KEY ("recipient_admin_user_id") REFERENCES "admin_users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "page_schemas" ADD CONSTRAINT "page_schemas_schema_template_id_fkey" FOREIGN KEY ("schema_template_id") REFERENCES "schema_templates"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "geo_test_results" ADD CONSTRAINT "geo_test_results_keyword_id_fkey" FOREIGN KEY ("keyword_id") REFERENCES "keywords"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- =============================================================================
-- HARD CONSTRAINTS (from prisma/sql/hard_constraints.sql) — §3.1/§5.8/§3.3/§4
-- Appended to the init migration so the schema + DB-level guarantees apply together.
-- =============================================================================
CREATE EXTENSION IF NOT EXISTS btree_gist;


-- ── §3.1  consents APPEND-ONLY  (block UPDATE + DELETE) ───────────────────────
-- Consent records are immutable. Withdrawal = INSERT a new row (consented=false),
-- never an UPDATE. Admin/root cannot mutate or delete. Test: UPDATE and DELETE on
-- consents must both raise.
CREATE OR REPLACE FUNCTION consents_block_mutation() RETURNS trigger
  LANGUAGE plpgsql AS $$
BEGIN
  RAISE EXCEPTION 'consents is append-only: % is not allowed (CLAUDE.md §3.1)', TG_OP;
END $$;

DROP TRIGGER IF EXISTS consents_no_update ON consents;
CREATE TRIGGER consents_no_update BEFORE UPDATE ON consents
  FOR EACH ROW EXECUTE FUNCTION consents_block_mutation();

DROP TRIGGER IF EXISTS consents_no_delete ON consents;
CREATE TRIGGER consents_no_delete BEFORE DELETE ON consents
  FOR EACH ROW EXECUTE FUNCTION consents_block_mutation();


-- ── §5.8  audit_logs APPEND-ONLY  (block UPDATE + DELETE) ─────────────────────
-- Super Admin is read-only; no one mutates the audit trail. Test as above.
CREATE OR REPLACE FUNCTION audit_logs_block_mutation() RETURNS trigger
  LANGUAGE plpgsql AS $$
BEGIN
  RAISE EXCEPTION 'audit_logs is append-only: % is not allowed (CLAUDE.md §3 / §5.8)', TG_OP;
END $$;

DROP TRIGGER IF EXISTS audit_logs_no_update ON audit_logs;
CREATE TRIGGER audit_logs_no_update BEFORE UPDATE ON audit_logs
  FOR EACH ROW EXECUTE FUNCTION audit_logs_block_mutation();

DROP TRIGGER IF EXISTS audit_logs_no_delete ON audit_logs;
CREATE TRIGGER audit_logs_no_delete BEFORE DELETE ON audit_logs
  FOR EACH ROW EXECUTE FUNCTION audit_logs_block_mutation();


-- ── §3.3 / §4 / R3  double-booking backstop (defense-in-depth) ────────────────
-- The PRIMARY guard is the Redis distributed lock + the app-level overlap query
-- (CLAUDE.md §3.3). This EXCLUDE constraint is a DB-level SECOND line of defense:
-- two ACTIVE bookings can never overlap in the same room+time interval. pending
-- bookings are excluded (held by the Redis lock, not yet committed); cancelled is
-- excluded too. Interval = (date + start_time, date + end_time], half-open so back-
-- to-back slots (…-12:00 and 12:00-…) do NOT collide.
-- ⚠ TEST the reschedule/refund flows: moving a booking must not trip this; verify a
--    concurrent double-book of the same paid slot is rejected (Playwright concurrency).
ALTER TABLE bookings DROP CONSTRAINT IF EXISTS bookings_no_overlap;
ALTER TABLE bookings ADD CONSTRAINT bookings_no_overlap
  EXCLUDE USING gist (
    room_id WITH =,
    tsrange(("date" + start_time)::timestamp, ("date" + end_time)::timestamp, '[)') WITH &&
  ) WHERE (status IN ('paid', 'confirmed', 'completed'));


-- ── Data-quality CHECKs (cheap insurance; feed schema.org AggregateRating) ────
ALTER TABLE reviews DROP CONSTRAINT IF EXISTS reviews_rating_range;
ALTER TABLE reviews ADD CONSTRAINT reviews_rating_range CHECK (rating BETWEEN 1 AND 5);

ALTER TABLE nps_responses DROP CONSTRAINT IF EXISTS nps_score_range;
ALTER TABLE nps_responses ADD CONSTRAINT nps_score_range CHECK (score BETWEEN 0 AND 10);


-- =============================================================================
-- DEFERRED (not in this file — scale/ops, revisit before high volume):
--   • audit_logs MONTHLY PARTITIONING (§5.8). Postgres cannot ALTER a normal table
--     into a partitioned one; it must be created as `PARTITION BY RANGE (created_at)`
--     up front. That conflicts with Prisma's plain CREATE TABLE, so it needs either a
--     manual table recreate or a dedicated partition-management migration. Plain table
--     is fine for MVP volume; partition when audit_logs growth warrants it. Pair with
--     the monthly GCS (Bucket Lock) archive job.
--   • S3/GCS Object-Lock / Bucket-Lock retention for consent PDFs & audit archives is
--     configured on the BUCKET (infra), not in SQL.
-- =============================================================================
