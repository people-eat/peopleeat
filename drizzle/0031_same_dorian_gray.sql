ALTER TABLE "Cooks" ADD COLUMN "pathName" varchar;--> statement-breakpoint
ALTER TABLE "Cooks" ADD COLUMN "previousPathNames" text[] DEFAULT '{}' NOT NULL;--> statement-breakpoint
CREATE OR REPLACE FUNCTION cook_path_name_from_names(first_name text, last_name text)
RETURNS text
LANGUAGE plpgsql
IMMUTABLE
AS $$
DECLARE
  s text;
BEGIN
  s := coalesce(first_name, '') || '-' || coalesce(last_name, '');
  s := replace(s, 'ß', 'ss');
  s := replace(s, 'ä', 'ae');
  s := replace(s, 'ö', 'oe');
  s := replace(s, 'ü', 'ue');
  s := replace(s, 'Ä', 'ae');
  s := replace(s, 'Ö', 'oe');
  s := replace(s, 'Ü', 'ue');
  s := translate(
    s,
    'àáâãåèéêëìíîïòóôõùúûýÿñçÀÁÂÃÅÈÉÊËÌÍÎÏÒÓÔÕÙÚÛÝŸÑÇ',
    'aaaaaeeeeiiiioooouuuyyncAAAAAEEEEIIIIOOOOUUUYYNC'
  );
  s := lower(s);
  s := regexp_replace(s, '[^a-z0-9]+', '-', 'g');
  s := regexp_replace(s, '^-+|-+$', '', 'g');
  IF s IS NULL OR s = '' THEN
    RETURN 'chef';
  END IF;
  RETURN s;
END;
$$;--> statement-breakpoint
WITH sourced AS (
    SELECT
        c."cookId",
        c."createdAt",
        cook_path_name_from_names(u."firstName", u."lastName") AS base_slug
    FROM "Cooks" c
    INNER JOIN "Users" u ON u."userId" = c."cookId"
), ranked AS (
    SELECT
        "cookId",
        base_slug,
        ROW_NUMBER() OVER (PARTITION BY base_slug ORDER BY "createdAt" ASC, "cookId" ASC) AS rn
    FROM sourced
)
UPDATE "Cooks" AS c
SET "pathName" = CASE WHEN ranked.rn = 1 THEN ranked.base_slug ELSE ranked.base_slug || '-' || ranked.rn::text END
FROM ranked
WHERE c."cookId" = ranked."cookId";--> statement-breakpoint
DROP FUNCTION cook_path_name_from_names(text, text);--> statement-breakpoint
ALTER TABLE "Cooks" ALTER COLUMN "pathName" SET NOT NULL;--> statement-breakpoint
CREATE UNIQUE INDEX "Cooks_pathName_uidx" ON "Cooks" USING btree ("pathName");
