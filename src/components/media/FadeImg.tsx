"use client";
import { useEffect, useRef, useState } from "react";

/** <img> con aparición suave al cargar. Si JS tarda, un respaldo CSS la revela igualmente. */
export function FadeImg({ src, alt }: { src: string; alt: string }) {
  const ref = useRef<HTMLImageElement>(null);
  const [loaded, setLoaded] = useState(false);
  useEffect(() => {
    const el = ref.current;
    if (el && el.complete && el.naturalWidth > 0) setLoaded(true);
  }, []);
  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img
      ref={ref}
      src={src}
      alt={alt}
      loading="lazy"
      decoding="async"
      className={`media-fade${loaded ? " is-loaded" : ""}`}
      onLoad={() => setLoaded(true)}
      onError={() => setLoaded(true)}
    />
  );
}
