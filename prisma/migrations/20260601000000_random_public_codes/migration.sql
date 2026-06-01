CREATE EXTENSION IF NOT EXISTS pgcrypto;

CREATE OR REPLACE FUNCTION public.generate_public_code(table_name text, column_name text DEFAULT 'code')
RETURNS integer
LANGUAGE plpgsql
VOLATILE
AS $$
DECLARE
    candidate integer;
    code_exists boolean;
    attempts integer := 0;
    random_bytes bytea;
BEGIN
    LOOP
        random_bytes := gen_random_bytes(4);
        candidate := 100000000 + (
            (
                get_byte(random_bytes, 0)::bigint * 16777216 +
                get_byte(random_bytes, 1)::bigint * 65536 +
                get_byte(random_bytes, 2)::bigint * 256 +
                get_byte(random_bytes, 3)::bigint
            ) % 900000000
        )::integer;

        EXECUTE format('SELECT EXISTS (SELECT 1 FROM %I WHERE %I = $1)', table_name, column_name)
        INTO code_exists
        USING candidate;

        IF NOT code_exists THEN
            RETURN candidate;
        END IF;

        attempts := attempts + 1;

        IF attempts >= 25 THEN
            RAISE EXCEPTION 'Could not generate unique public code for %.%', table_name, column_name
                USING ERRCODE = 'unique_violation';
        END IF;
    END LOOP;
END;
$$;

ALTER TABLE "Vehicle" ALTER COLUMN "code" SET DEFAULT public.generate_public_code('Vehicle', 'code');
ALTER TABLE "ServiceOrder" ALTER COLUMN "code" SET DEFAULT public.generate_public_code('ServiceOrder', 'code');
ALTER TABLE "Estimate" ALTER COLUMN "code" SET DEFAULT public.generate_public_code('Estimate', 'code');
ALTER TABLE "CatalogItem" ALTER COLUMN "code" SET DEFAULT public.generate_public_code('CatalogItem', 'code');
ALTER TABLE "Sector" ALTER COLUMN "code" SET DEFAULT public.generate_public_code('Sector', 'code');
ALTER TABLE "Mechanic" ALTER COLUMN "code" SET DEFAULT public.generate_public_code('Mechanic', 'code');
ALTER TABLE "Supplier" ALTER COLUMN "code" SET DEFAULT public.generate_public_code('Supplier', 'code');
ALTER TABLE "SupplierOrder" ALTER COLUMN "code" SET DEFAULT public.generate_public_code('SupplierOrder', 'code');
ALTER TABLE "Sale" ALTER COLUMN "code" SET DEFAULT public.generate_public_code('Sale', 'code');
ALTER TABLE "FinancialAccount" ALTER COLUMN "code" SET DEFAULT public.generate_public_code('FinancialAccount', 'code');
ALTER TABLE "FinancialCategory" ALTER COLUMN "code" SET DEFAULT public.generate_public_code('FinancialCategory', 'code');
ALTER TABLE "CashMovement" ALTER COLUMN "code" SET DEFAULT public.generate_public_code('CashMovement', 'code');
