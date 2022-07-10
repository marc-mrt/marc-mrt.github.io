import { useEffect, useState } from "react";

const cache: Record<string, unknown> = {};

async function fetchJSONAsset<T>(name: string, cb: (data: T) => void) {
  fetch(`/${name}.json`)
    .then((src) => src.json())
    .then(cb);
}

export function useJSONAsset<T>(name: string, defaultValue: T) {
  const [value, setValue] = useState<T>((cache[name] as T) || defaultValue);
  const cached = value !== defaultValue;

  useEffect(() => {
    if (!cached) {
      fetchJSONAsset(name, (v: T) => {
        setValue(v);
        cache[name] = v;
      });
    }
  }, [cached, name, setValue]);

  return value;
}
