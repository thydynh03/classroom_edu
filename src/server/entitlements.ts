import "server-only";
import { and, eq, gt, isNull, or } from "drizzle-orm";
import { cache } from "react";
import { db } from "@/server/db/client";
import { featureGrants } from "@/server/db/schema";
import type { Actor } from "@/server/auth/session";
import { featureByKey, type FeatureKey } from "@/lib/premium-features";
import { UserError } from "@/server/services/errors";

/** Các tính năng nâng cao GV đang được dùng (còn hạn, chưa thu hồi). Cache theo request. */
export const activeGrants = cache(async (userId: string) => {
  const now = new Date();
  return db
    .select({ featureKey: featureGrants.featureKey, expiresAt: featureGrants.expiresAt })
    .from(featureGrants)
    .where(and(eq(featureGrants.userId, userId), isNull(featureGrants.revokedAt), or(isNull(featureGrants.expiresAt), gt(featureGrants.expiresAt, now))));
});

export async function hasFeature(actor: Actor, key: FeatureKey) {
  if (actor.role !== "TEACHER") return false;
  return (await activeGrants(actor.id)).some((g) => g.featureKey === key);
}

/** Chặn ở SERVER (không chỉ ẩn nút): GV chưa mở khóa gọi thẳng action cũng bị từ chối. */
export async function requireFeature(actor: Actor, key: FeatureKey) {
  if (!(await hasFeature(actor, key))) {
    throw new UserError(`"${featureByKey(key)?.title ?? key}" là tính năng nâng cao. Vào mục Nâng cao để gửi yêu cầu mở khóa.`);
  }
}
