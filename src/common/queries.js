// Fetching the static data (TanStack Query caches it; it never changes).
import { useQuery } from "@tanstack/react-query";

import { DATA, getGzipJson, getJson } from "./api.js";
import { shardFile } from "./data.js";

export const useTable = () => useQuery({ queryKey: ["table"], queryFn: () => getJson(`${DATA}table.json`) });

/** { properties, cif } of one entry, or null if there is none of that name; the file (a shard, or the entry's own) is cached */
export const useDetail = (name, shardCount) =>
  useQuery({
    queryKey: ["shard", shardFile(name, shardCount)],
    queryFn: () => getGzipJson(`${DATA}${shardFile(name, shardCount)}`),
    select: (shard) => shard[name] ?? null,
  });
