// TODO: code dupe with use-people.tsx
import { useEffect, useState } from "react";
import { webapp_client } from "@cocalc/frontend/webapp-client";
import { useQueryCache } from "./use-query-cache";

export interface OrganizationType {
  id: number;
  name?: string;
  domain?: string;
}

export function useOrganization(id: number): OrganizationType | undefined {
  const cache = useQueryCache<number, OrganizationType>("organizations");

  const [organization, setOrganization] = useState<
    OrganizationType | undefined
  >(cache.get(id));

  useEffect(() => {
    if (organization != null) return;
    (async () => {
      // todo: what happens when id is invalid?
      const x = await webapp_client.query_client.query({
        query: { crm_organizations: { id, name: null, domain: null } },
      });
      cache.set(id, x.query.crm_organizations);
      setOrganization(x.query.crm_organizations);
    })();
  }, []);

  return organization;
}

async function organizationsSearch(
  query: string
): Promise<OrganizationType[] | null> {
  query = query.trim();
  if (!query) {
    // view this as canceling the search rather than returning everything
    return null;
  }

  const ILIKE = { ILIKE: `%${query}%` };
  let v: OrganizationType[] = [];

  // TODO: hack until we implement or searches.
  const ids = new Set<number>([]);
  for (const pattern of [
    { id: null, name: ILIKE, domain: null },
    { id: null, name: null, domain: ILIKE },
  ]) {
    const x = await webapp_client.query_client.query({
      query: { crm_organizations: [pattern] },
      options: [{ limit: 100 }],
    });
    for (const org of x.query.crm_organizations) {
      if (ids.has(org.id)) continue;
      ids.add(org.id);
      v.push(org);
    }
  }

  return v;
}

export function useOrganizationsSearch(query: string): {
  matches: OrganizationType[] | null;
  loading: boolean;
  error: string;
} {
  const [error, setError] = useState<string>("");
  const [matches, setMatches] = useState<OrganizationType[] | null>(null);
  const [loading, setLoading] = useState<boolean>(false);

  useEffect(() => {
    setError("");
    setMatches(null);
    setLoading(true);
    (async () => {
      try {
        let matches = await organizationsSearch(query);
        setMatches(matches);
      } catch (err) {
        setError(`${err}`);
      } finally {
        setLoading(false);
      }
    })();
  }, [query]);

  return { error, matches, loading };
}
