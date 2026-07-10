import { BRAND_PALETTE, type BrandColorKey } from "@/lib/brand-palette";

const CSS = `
.bcs-row{display:flex;flex-wrap:wrap;gap:8px;align-items:center;}
.bcs-sw{width:28px;height:28px;border-radius:999px;border:1px solid rgba(20,20,20,0.15);cursor:pointer;padding:0;position:relative;transition:transform 0.08s ease, box-shadow 0.08s ease;}
.bcs-sw:hover{transform:scale(1.06);}
.bcs-sw[aria-pressed="true"]{box-shadow:0 0 0 2px #FBF8ED, 0 0 0 4px #181A4D;transform:scale(1.06);}
.bcs-sw.none{background:repeating-linear-gradient(45deg, #fff, #fff 4px, rgba(20,20,20,0.12) 4px, rgba(20,20,20,0.12) 6px);}
.bcs-caption{font-size:11.5px;color:#8a8678;margin-left:6px;}
`;

export function ColorSwatches({
  value,
  onChange,
  allowNone = true,
}: {
  value: BrandColorKey | null;
  onChange: (v: BrandColorKey | null) => void;
  allowNone?: boolean;
}) {
  const selected = BRAND_PALETTE.find((c) => c.key === value) ?? null;
  return (
    <div>
      <style dangerouslySetInnerHTML={{ __html: CSS }} />
      <div className="bcs-row" role="radiogroup" aria-label="Brand color">
        {allowNone && (
          <button
            type="button"
            role="radio"
            aria-checked={value === null}
            aria-pressed={value === null}
            aria-label="No color"
            title="No color"
            className="bcs-sw none"
            onClick={() => onChange(null)}
          />
        )}
        {BRAND_PALETTE.map((c) => {
          const isSel = value === c.key;
          return (
            <button
              key={c.key}
              type="button"
              role="radio"
              aria-checked={isSel}
              aria-pressed={isSel}
              aria-label={c.label}
              title={c.label}
              className="bcs-sw"
              style={{ background: c.hex }}
              onClick={() => onChange(c.key)}
            />
          );
        })}
        <span className="bcs-caption">{selected ? selected.label : "No color"}</span>
      </div>
    </div>
  );
}
