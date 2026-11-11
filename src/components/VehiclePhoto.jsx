"use client";
import { useId } from 'react';

/**
 * A small display-only sharpening pass, applied after the browser scales the
 * stored photo. The kernel sums to one, keeps flat areas unchanged and never
 * changes the image dimensions, crop or saved file. Each instance owns its SVG
 * definition so cards, carousels and the full-screen gallery can coexist.
 */
export default function VehiclePhoto({ style, ...props }) {
    const filterId = `vehicle-photo-${useId().replaceAll(':', '')}`;

    return (
        <>
            <svg width="0" height="0" aria-hidden="true" focusable="false" style={{ position: 'absolute', pointerEvents: 'none' }}>
                <defs>
                    <filter id={filterId} x="0" y="0" width="100%" height="100%" colorInterpolationFilters="sRGB">
                        <feConvolveMatrix
                            order="3"
                            kernelMatrix="0 -0.04 0 -0.04 1.16 -0.04 0 -0.04 0"
                            divisor="1"
                            bias="0"
                            edgeMode="duplicate"
                            preserveAlpha="true"
                        />
                    </filter>
                </defs>
            </svg>
            <img {...props} style={{ ...style, filter: `url("#${filterId}")` }} />
        </>
    );
}
