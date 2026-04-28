/**
 * Helpers for admin forms: resolve attribute options and tags from config.
 * Use these so Frames, Collections, etc. stay in sync with Attributes config.
 */
import type { AppConfig, AppAttribute, AppTag } from '@/types/app-config';

export function getAttributes(config: AppConfig | null | undefined): AppAttribute[] {
  return config?.attributes ?? [];
}

export function getTags(config: AppConfig | null | undefined): AppTag[] {
  return config?.tags ?? [];
}

/** Get options for a select-type attribute (e.g. category, shape). Use in Frames form dropdowns. */
export function getAttributeOptions(
  config: AppConfig | null | undefined,
  attributeKey: string
): { id: string; label: string }[] {
  const attr = getAttributes(config).find((a) => a.key === attributeKey);
  return attr?.options ?? [];
}

/** Get label for an attribute value (e.g. category "eyeglasses" -> "Eyeglasses"). */
export function getAttributeOptionLabel(
  config: AppConfig | null | undefined,
  attributeKey: string,
  value: string
): string {
  const options = getAttributeOptions(config, attributeKey);
  const opt = options.find((o) => o.id === value);
  return opt?.label ?? value;
}

/** Get tag label by id. */
export function getTagLabel(config: AppConfig | null | undefined, tagId: string): string {
  const tag = getTags(config).find((t) => t.id === tagId);
  return tag?.label ?? tagId;
}
