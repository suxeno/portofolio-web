export function orderedWriting<T extends { publishedAt: string | null }>(records: T[]): T[];
export function latestWriting<T extends { publishedAt: string | null }>(records: T[]): T[];
