import type { RecordedFrame } from "./types";

/**
 * Export simulation data as a downloadable CSV file.
 */
export function exportCSV(frames: RecordedFrame[], filename?: string): void {
    if (frames.length === 0) return;

    const header =
        "time,positionX,positionY,displacement,height,velocity,velocityX,velocityY,acceleration,ke,pe,totalEnergy";

    const rows = frames.map((f) =>
        [
            f.time.toFixed(4),
            f.positionX.toFixed(4),
            f.positionY.toFixed(4),
            f.displacement.toFixed(4),
            f.height.toFixed(4),
            f.velocity.toFixed(4),
            f.velocityX.toFixed(4),
            f.velocityY.toFixed(4),
            f.acceleration.toFixed(4),
            f.ke.toFixed(4),
            f.pe.toFixed(4),
            f.totalEnergy.toFixed(4),
        ].join(",")
    );

    const csv = [header, ...rows].join("\n");
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);

    const a = document.createElement("a");
    a.href = url;
    a.download = filename || `simulation_data_${Date.now()}.csv`;
    a.style.display = "none";
    document.body.appendChild(a);
    a.click();

    // Cleanup
    setTimeout(() => {
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
    }, 100);
}
