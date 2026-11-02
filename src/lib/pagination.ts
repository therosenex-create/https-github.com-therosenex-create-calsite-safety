export const PAGE_SIZE = 20;

export function pageArgs(raw: number | string | undefined) {
  const parsed = typeof raw === "string" ? Number(raw) : raw;
  const page = parsed && Number.isFinite(parsed) && parsed > 0 ? Math.floor(parsed) : 1;
  return { page, pageSize: PAGE_SIZE, skip: (page - 1) * PAGE_SIZE, take: PAGE_SIZE };
}

export type Page<T> = {
  items: T[];
  total: number;
  page: number;
  pageSize: number;
};
