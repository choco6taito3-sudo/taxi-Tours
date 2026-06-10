import areasData from "../../data/areas.json";
import type { Area } from "./types";

export const AREAS: Area[] = areasData as Area[];

/** 札幌市内のみ（狙い目・乗車記録の対象） */
export const SAPPORO_CITY_AREAS: Area[] = AREAS.filter((a) => a.inSapporoCity);

export function getAreaById(id: string): Area | undefined {
  return AREAS.find((a) => a.id === id);
}

export function getAreaName(id: string | null | undefined): string {
  if (!id) return "未設定";
  return getAreaById(id)?.name ?? id;
}

/** 乗車記録のショートカット（札幌市内・よく使うエリア） */
export const POPULAR_AREA_IDS = [
  "sapporo-station",
  "susukino",
  "odori",
  "tanukikoji",
  "makomanai",
  "toyohira",
  "fushimi",
  "nango",
  "shiroishi",
  "kikusui",
];

export function getPopularAreas(): Area[] {
  return POPULAR_AREA_IDS.map((id) => getAreaById(id)).filter(
    (a): a is Area => a !== undefined && a.inSapporoCity,
  );
}

export function getSapporoCityAreas(): Area[] {
  return SAPPORO_CITY_AREAS;
}

export function isSapporoCityArea(id: string | null | undefined): boolean {
  if (!id) return false;
  return getAreaById(id)?.inSapporoCity ?? false;
}

export function distanceKm(
  lat1: number,
  lng1: number,
  lat2: number,
  lng2: number,
): number {
  const R = 6371;
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLng = ((lng2 - lng1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLng / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}
