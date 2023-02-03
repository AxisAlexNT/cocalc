/*
Hook that is like useState but for one record of the syncdb
identified by a primary key.
*/

import { useCallback, useEffect, useRef, useState } from "react";
import { useSyncdbContext } from "./syncdb-context";
import { debounce, isEqual } from "lodash";

export default function useSyncdbRecord<T>({
  key,
  debounceMs = 1000,
  defaultValue,
}: {
  key: T;
  debounceMs?: number;
  defaultValue: T;
}): [value: T, setValue: (obj: T) => void] {
  // comparing key as object does NOT work and completely broken debounce,
  // wasting huge amounts of space and blowing up the syncdb!
  const jkey = JSON.stringify(key);

  const { syncdb } = useSyncdbContext();
  if (syncdb == null) {
    throw Error(
      "useSyncdbRecord hook MUST be used inside SyncdbContext.Provider"
    );
  }

  const [value, setValue0] = useState<T>(
    syncdb?.get_one(key)?.toJS() ?? { ...defaultValue, ...key }
  );

  const lastCommitRef = useRef<T | null>(null);

  const save = useCallback(
    debounce((value: T) => {
      if (syncdb != null) {
        const x = { ...value, ...key };
        lastCommitRef.current = x;
        syncdb.set(x);
        syncdb.commit();
      }
    }, debounceMs),
    [syncdb, jkey]
  );

  const setValue = useCallback(
    (value: T) => {
      setValue0(value);
      save(value);
    },
    [setValue0, save]
  );

  useEffect(() => {
    if (syncdb == null) {
      setValue({ ...defaultValue, ...key });
      return;
    }
    const update = () => {
      const val = syncdb?.get_one(key)?.toJS() ?? { ...defaultValue, ...key };
      if (isEqual(val, lastCommitRef.current)) return;
      lastCommitRef.current = null;
      setValue0(val);
    };
    const handleChange = (keys) => {
      for (const change of keys) {
        if (isEqual(change.toJS(), key)) {
          update();
          return;
        }
      }
    };

    syncdb.on("change", handleChange);

    return () => {
      syncdb.removeListener("change", handleChange);
    };
  }, [syncdb, jkey]);

  return [value, setValue];
}
