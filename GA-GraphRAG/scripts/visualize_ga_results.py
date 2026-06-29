"""
Visualize GA results for GraphRAG parameter optimization.

The script reads result workbooks in long-table format, then creates:
1. Convergence curves by generation.
2. Boxplots and violin plots showing the score distribution by generation.

Example:
    python scripts/visualize_ga_results.py
    python scripts/visualize_ga_results.py --input-files map.xlsx mrr.xlsx ndcg.xlsx
"""

from __future__ import annotations

import argparse
import re
from html import escape
from pathlib import Path

import pandas as pd

try:
    import matplotlib.pyplot as plt
except ImportError:  # pragma: no cover - fallback for minimal environments
    plt = None

try:
    import seaborn as sns  # type: ignore[import-not-found]
except ImportError:  # pragma: no cover - fallback for minimal environments
    sns = None


DEFAULT_PATTERNS = ("*.xlsx",)
SKIP_PREFIXES = ("~$",)
REQUIRED_COLUMNS = {"generation"}
METRIC_COLUMNS = ("fitness", "ndcg", "map", "mrr", "answer_cosine_similarity")


def normalize_name(value: object) -> str:
    return re.sub(r"[^a-z0-9]+", "_", str(value).strip().lower()).strip("_")


def infer_run_label(path: Path) -> str:
    stem = path.stem.lower()
    if stem.startswith("ga_run_"):
        stem = stem.removeprefix("ga_run_")
    return stem


def read_long_result_file(path: Path) -> pd.DataFrame | None:
    """Read one workbook if it contains GA rows with generation and metrics."""
    frames: list[pd.DataFrame] = []

    try:
        workbook = pd.ExcelFile(path)
    except Exception as exc:
        print(f"[WARN] Skip {path.name}: cannot open workbook ({exc})")
        return None

    for sheet_name in workbook.sheet_names:
        try:
            df = pd.read_excel(workbook, sheet_name=sheet_name)
        except Exception as exc:
            print(f"[WARN] Skip sheet {path.name}/{sheet_name}: {exc}")
            continue

        df = df.rename(columns={col: normalize_name(col) for col in df.columns})
        if not REQUIRED_COLUMNS.issubset(df.columns):
            continue

        metric_cols = [col for col in METRIC_COLUMNS if col in df.columns]
        if not metric_cols:
            continue

        keep_cols = [
            col
            for col in (
                "rank",
                "generation",
                "individual_id",
                "threshold",
                "max_edges_per_node",
                "top_k",
                *metric_cols,
                "avg_retrieval_time_ms",
                "total_nodes",
                "total_edges",
                "total_communities",
                "chromosome",
            )
            if col in df.columns
        ]

        clean = df[keep_cols].copy()
        clean["source_file"] = path.name
        clean["run"] = infer_run_label(path)
        clean["sheet"] = sheet_name
        frames.append(clean)

    if not frames:
        print(f"[WARN] Skip {path.name}: no long-format GA result sheet found")
        return None

    return pd.concat(frames, ignore_index=True)


def discover_input_files(input_dir: Path, patterns: tuple[str, ...]) -> list[Path]:
    files: list[Path] = []
    for pattern in patterns:
        files.extend(input_dir.glob(pattern))

    result = []
    for path in sorted(set(files)):
        if path.is_file() and not path.name.startswith(SKIP_PREFIXES):
            result.append(path)
    return result


def load_results(input_files: list[Path]) -> pd.DataFrame:
    frames = []
    for path in input_files:
        frame = read_long_result_file(path)
        if frame is not None and not frame.empty:
            frames.append(frame)

    if not frames:
        raise SystemExit("No valid GA result tables were found.")

    df = pd.concat(frames, ignore_index=True)
    df["generation"] = pd.to_numeric(df["generation"], errors="coerce")

    for column in METRIC_COLUMNS:
        if column in df.columns:
            df[column] = pd.to_numeric(df[column], errors="coerce")

    df = df.dropna(subset=["generation"])
    df["generation"] = df["generation"].astype(int)
    return df


def available_metrics(df: pd.DataFrame, requested: list[str]) -> list[str]:
    metrics = []
    for metric in requested:
        normalized = normalize_name(metric)
        if normalized in df.columns and df[normalized].notna().any():
            metrics.append(normalized)

    if not metrics:
        raise SystemExit(
            "None of the requested metrics are available. "
            f"Requested: {', '.join(requested)}"
        )
    return metrics


def configure_style() -> None:
    if plt is None:
        return
    if sns is not None:
        sns.set_theme(style="whitegrid", context="notebook")
    else:
        plt.style.use("seaborn-v0_8-whitegrid")


def plot_convergence(df: pd.DataFrame, metric: str, output_dir: Path) -> Path:
    stats = (
        df.dropna(subset=[metric])
        .groupby(["run", "generation"], as_index=False)
        .agg(best=(metric, "max"), mean=(metric, "mean"), median=(metric, "median"))
        .sort_values(["run", "generation"])
    )

    fig, ax = plt.subplots(figsize=(11, 6), dpi=140)

    if sns is not None:
        sns.lineplot(
            data=stats,
            x="generation",
            y="best",
            hue="run",
            marker="o",
            linewidth=2.2,
            ax=ax,
        )
        sns.lineplot(
            data=stats,
            x="generation",
            y="mean",
            hue="run",
            marker="s",
            linewidth=1.5,
            linestyle="--",
            alpha=0.65,
            legend=False,
            ax=ax,
        )
    else:
        for run, group in stats.groupby("run"):
            ax.plot(group["generation"], group["best"], marker="o", label=f"{run} best")
            ax.plot(
                group["generation"],
                group["mean"],
                marker="s",
                linestyle="--",
                alpha=0.65,
                label=f"{run} mean",
            )

    ax.set_title(f"Convergence Curve - {metric.upper()}")
    ax.set_xlabel("Generation")
    ax.set_ylabel(metric.upper())
    ax.grid(True, alpha=0.25)
    ax.legend(title="Run", bbox_to_anchor=(1.02, 1), loc="upper left", borderaxespad=0)
    fig.tight_layout()

    path = output_dir / f"convergence_{metric}.png"
    fig.savefig(path, bbox_inches="tight")
    plt.close(fig)

    stats.to_csv(output_dir / f"convergence_{metric}.csv", index=False)
    return path


def quantile(values: pd.Series, q: float) -> float:
    return float(values.quantile(q))


def svg_header(width: int, height: int) -> list[str]:
    return [
        f'<svg xmlns="http://www.w3.org/2000/svg" width="{width}" height="{height}" viewBox="0 0 {width} {height}">',
        "<style>",
        "text{font-family:Arial,sans-serif;font-size:12px;fill:#202020}",
        ".title{font-size:20px;font-weight:700}.subtitle{font-size:14px;font-weight:700}",
        ".axis{stroke:#333;stroke-width:1}.grid{stroke:#d9d9d9;stroke-width:1}",
        "</style>",
        '<rect width="100%" height="100%" fill="#ffffff"/>',
    ]


def svg_footer() -> str:
    return "</svg>\n"


def palette(index: int) -> str:
    colors = ["#377eb8", "#4daf4a", "#984ea3", "#ff7f00", "#a65628", "#f781bf"]
    return colors[index % len(colors)]


def save_svg(path: Path, parts: list[str]) -> Path:
    path.write_text("\n".join(parts) + "\n", encoding="utf-8")
    return path


def plot_convergence_svg(df: pd.DataFrame, metric: str, output_dir: Path) -> Path:
    stats = (
        df.dropna(subset=[metric])
        .groupby(["run", "generation"], as_index=False)
        .agg(best=(metric, "max"), mean=(metric, "mean"))
        .sort_values(["run", "generation"])
    )
    stats.to_csv(output_dir / f"convergence_{metric}.csv", index=False)

    width, height = 1100, 640
    left, right, top, bottom = 80, 230, 70, 80
    plot_w, plot_h = width - left - right, height - top - bottom
    min_gen, max_gen = int(stats["generation"].min()), int(stats["generation"].max())
    min_y = float(stats[["best", "mean"]].min().min())
    max_y = float(stats[["best", "mean"]].max().max())
    pad = max((max_y - min_y) * 0.08, 0.01)
    min_y -= pad
    max_y += pad

    def x_scale(gen: float) -> float:
        if max_gen == min_gen:
            return left + plot_w / 2
        return left + (gen - min_gen) / (max_gen - min_gen) * plot_w

    def y_scale(value: float) -> float:
        return top + (max_y - value) / (max_y - min_y) * plot_h

    parts = svg_header(width, height)
    parts.append(f'<text class="title" x="{width / 2}" y="34" text-anchor="middle">Convergence Curve - {escape(metric.upper())}</text>')

    for i in range(6):
        y = top + i * plot_h / 5
        value = max_y - i * (max_y - min_y) / 5
        parts.append(f'<line class="grid" x1="{left}" y1="{y:.1f}" x2="{left + plot_w}" y2="{y:.1f}"/>')
        parts.append(f'<text x="{left - 12}" y="{y + 4:.1f}" text-anchor="end">{value:.4f}</text>')

    for gen in range(min_gen, max_gen + 1):
        x = x_scale(gen)
        parts.append(f'<text x="{x:.1f}" y="{top + plot_h + 28}" text-anchor="middle">{gen}</text>')

    parts.append(f'<line class="axis" x1="{left}" y1="{top + plot_h}" x2="{left + plot_w}" y2="{top + plot_h}"/>')
    parts.append(f'<line class="axis" x1="{left}" y1="{top}" x2="{left}" y2="{top + plot_h}"/>')
    parts.append(f'<text x="{left + plot_w / 2}" y="{height - 28}" text-anchor="middle">Generation</text>')
    parts.append(f'<text x="22" y="{top + plot_h / 2}" text-anchor="middle" transform="rotate(-90 22 {top + plot_h / 2})">{escape(metric.upper())}</text>')

    for idx, (run, group) in enumerate(stats.groupby("run")):
        color = palette(idx)
        for series_name, dash in (("best", ""), ("mean", ' stroke-dasharray="6 5" opacity="0.68"')):
            points = " ".join(
                f'{x_scale(row.generation):.1f},{y_scale(getattr(row, series_name)):.1f}'
                for row in group.itertuples(index=False)
            )
            parts.append(f'<polyline fill="none" stroke="{color}" stroke-width="2.5"{dash} points="{points}"/>')
        lx, ly = left + plot_w + 35, top + idx * 28
        parts.append(f'<line x1="{lx}" y1="{ly}" x2="{lx + 24}" y2="{ly}" stroke="{color}" stroke-width="3"/>')
        parts.append(f'<text x="{lx + 32}" y="{ly + 4}">{escape(str(run))} best</text>')
        parts.append(f'<line x1="{lx}" y1="{ly + 16}" x2="{lx + 24}" y2="{ly + 16}" stroke="{color}" stroke-width="3" stroke-dasharray="6 5" opacity="0.68"/>')
        parts.append(f'<text x="{lx + 32}" y="{ly + 20}">{escape(str(run))} mean</text>')

    parts.append(svg_footer())
    return save_svg(output_dir / f"convergence_{metric}.svg", parts)


def grouped_layout(df: pd.DataFrame, metric: str) -> tuple[list[str], list[int], float, float]:
    runs = sorted(df["run"].dropna().unique())
    generations = sorted(int(gen) for gen in df["generation"].dropna().unique())
    values = df[metric].dropna()
    min_y, max_y = float(values.min()), float(values.max())
    pad = max((max_y - min_y) * 0.08, 0.01)
    return runs, generations, min_y - pad, max_y + pad


def plot_distribution_svg(df: pd.DataFrame, metric: str, output_dir: Path, kind: str) -> Path:
    data = df.dropna(subset=[metric]).copy()
    runs, generations, min_y, max_y = grouped_layout(data, metric)
    width = 1100
    panel_h = 310
    height = 80 + panel_h * len(runs) + 45
    left, right, top = 80, 60, 70
    plot_w = width - left - right
    plot_h = 220

    def y_scale(value: float, panel_top: float) -> float:
        return panel_top + (max_y - value) / (max_y - min_y) * plot_h

    parts = svg_header(width, height)
    parts.append(f'<text class="title" x="{width / 2}" y="34" text-anchor="middle">{escape(kind.title())} Plot - {escape(metric.upper())}</text>')

    for r_idx, run in enumerate(runs):
        panel_top = top + r_idx * panel_h
        base_y = panel_top + plot_h
        subset_run = data[data["run"] == run]
        parts.append(f'<text class="subtitle" x="{left}" y="{panel_top - 14}">{escape(str(run))}</text>')
        parts.append(f'<line class="axis" x1="{left}" y1="{base_y}" x2="{left + plot_w}" y2="{base_y}"/>')
        parts.append(f'<line class="axis" x1="{left}" y1="{panel_top}" x2="{left}" y2="{base_y}"/>')

        for i in range(5):
            y = panel_top + i * plot_h / 4
            value = max_y - i * (max_y - min_y) / 4
            parts.append(f'<line class="grid" x1="{left}" y1="{y:.1f}" x2="{left + plot_w}" y2="{y:.1f}"/>')
            parts.append(f'<text x="{left - 12}" y="{y + 4:.1f}" text-anchor="end">{value:.4f}</text>')

        slot = plot_w / max(len(generations), 1)
        for g_idx, gen in enumerate(generations):
            values = subset_run[subset_run["generation"] == gen][metric].dropna()
            if values.empty:
                continue
            cx = left + slot * g_idx + slot / 2
            parts.append(f'<text x="{cx:.1f}" y="{base_y + 24}" text-anchor="middle">{gen}</text>')

            if kind == "boxplot":
                q1, med, q3 = quantile(values, 0.25), quantile(values, 0.5), quantile(values, 0.75)
                low, high = float(values.min()), float(values.max())
                box_w = min(52, slot * 0.55)
                y_q1, y_med, y_q3 = y_scale(q1, panel_top), y_scale(med, panel_top), y_scale(q3, panel_top)
                y_low, y_high = y_scale(low, panel_top), y_scale(high, panel_top)
                parts.append(f'<line x1="{cx:.1f}" y1="{y_high:.1f}" x2="{cx:.1f}" y2="{y_low:.1f}" stroke="#333" stroke-width="1.4"/>')
                parts.append(f'<line x1="{cx - box_w / 3:.1f}" y1="{y_high:.1f}" x2="{cx + box_w / 3:.1f}" y2="{y_high:.1f}" stroke="#333" stroke-width="1.4"/>')
                parts.append(f'<line x1="{cx - box_w / 3:.1f}" y1="{y_low:.1f}" x2="{cx + box_w / 3:.1f}" y2="{y_low:.1f}" stroke="#333" stroke-width="1.4"/>')
                parts.append(f'<rect x="{cx - box_w / 2:.1f}" y="{y_q3:.1f}" width="{box_w:.1f}" height="{max(y_q1 - y_q3, 1):.1f}" fill="#79a7d3" stroke="#333" opacity="0.78"/>')
                parts.append(f'<line x1="{cx - box_w / 2:.1f}" y1="{y_med:.1f}" x2="{cx + box_w / 2:.1f}" y2="{y_med:.1f}" stroke="#d95f02" stroke-width="2"/>')
            else:
                bins = 12
                counts = [0] * bins
                for value in values:
                    idx = int((float(value) - min_y) / (max_y - min_y) * (bins - 1))
                    counts[max(0, min(bins - 1, idx))] += 1
                max_count = max(counts) or 1
                points_left = []
                points_right = []
                for b_idx, count in enumerate(counts):
                    value = min_y + b_idx * (max_y - min_y) / (bins - 1)
                    y = y_scale(value, panel_top)
                    half_w = (count / max_count) * min(48, slot * 0.42)
                    points_left.append(f"{cx - half_w:.1f},{y:.1f}")
                    points_right.insert(0, f"{cx + half_w:.1f},{y:.1f}")
                parts.append(f'<polygon points="{" ".join(points_left + points_right)}" fill="#79a7d3" stroke="#333" opacity="0.74"/>')
                med = quantile(values, 0.5)
                y_med = y_scale(med, panel_top)
                parts.append(f'<line x1="{cx - 24:.1f}" y1="{y_med:.1f}" x2="{cx + 24:.1f}" y2="{y_med:.1f}" stroke="#d95f02" stroke-width="2"/>')

    parts.append(f'<text x="{width / 2}" y="{height - 20}" text-anchor="middle">Generation</text>')
    parts.append(svg_footer())
    return save_svg(output_dir / f"{kind}_{metric}_by_generation.svg", parts)


def plot_metric_comparison_svg(df: pd.DataFrame, metrics: list[str], output_dir: Path) -> Path:
    long_df = df.melt(
        id_vars=["run", "generation", "source_file"],
        value_vars=[metric for metric in metrics if metric in df.columns],
        var_name="metric",
        value_name="score",
    ).dropna(subset=["score"])
    width, height = 1100, 620
    left, right, top, bottom = 90, 230, 70, 90
    plot_w, plot_h = width - left - right, height - top - bottom
    min_y, max_y = float(long_df["score"].min()), float(long_df["score"].max())
    pad = max((max_y - min_y) * 0.08, 0.01)
    min_y -= pad
    max_y += pad

    def y_scale(value: float) -> float:
        return top + (max_y - value) / (max_y - min_y) * plot_h

    runs = sorted(long_df["run"].unique())
    parts = svg_header(width, height)
    parts.append(f'<text class="title" x="{width / 2}" y="34" text-anchor="middle">Metric Distribution by Run</text>')
    parts.append(f'<line class="axis" x1="{left}" y1="{top + plot_h}" x2="{left + plot_w}" y2="{top + plot_h}"/>')
    parts.append(f'<line class="axis" x1="{left}" y1="{top}" x2="{left}" y2="{top + plot_h}"/>')

    group_w = plot_w / len(metrics)
    box_w = min(28, group_w / max(len(runs), 1) * 0.55)
    for m_idx, metric_name in enumerate(metrics):
        metric_data = long_df[long_df["metric"] == metric_name]
        group_x = left + m_idx * group_w
        parts.append(f'<text x="{group_x + group_w / 2:.1f}" y="{top + plot_h + 28}" text-anchor="middle">{escape(metric_name.upper())}</text>')
        for r_idx, run in enumerate(runs):
            values = metric_data[metric_data["run"] == run]["score"].dropna()
            if values.empty:
                continue
            cx = group_x + (r_idx + 0.5) * group_w / len(runs)
            q1, med, q3 = quantile(values, 0.25), quantile(values, 0.5), quantile(values, 0.75)
            low, high = float(values.min()), float(values.max())
            color = palette(r_idx)
            parts.append(f'<line x1="{cx:.1f}" y1="{y_scale(high):.1f}" x2="{cx:.1f}" y2="{y_scale(low):.1f}" stroke="#333" stroke-width="1.2"/>')
            parts.append(f'<rect x="{cx - box_w / 2:.1f}" y="{y_scale(q3):.1f}" width="{box_w:.1f}" height="{max(y_scale(q1) - y_scale(q3), 1):.1f}" fill="{color}" stroke="#333" opacity="0.72"/>')
            parts.append(f'<line x1="{cx - box_w / 2:.1f}" y1="{y_scale(med):.1f}" x2="{cx + box_w / 2:.1f}" y2="{y_scale(med):.1f}" stroke="#d95f02" stroke-width="2"/>')

    for i in range(6):
        y = top + i * plot_h / 5
        value = max_y - i * (max_y - min_y) / 5
        parts.append(f'<line class="grid" x1="{left}" y1="{y:.1f}" x2="{left + plot_w}" y2="{y:.1f}"/>')
        parts.append(f'<text x="{left - 12}" y="{y + 4:.1f}" text-anchor="end">{value:.4f}</text>')

    for idx, run in enumerate(runs):
        lx, ly = left + plot_w + 35, top + idx * 24
        parts.append(f'<rect x="{lx}" y="{ly - 10}" width="16" height="16" fill="{palette(idx)}" opacity="0.72" stroke="#333"/>')
        parts.append(f'<text x="{lx + 24}" y="{ly + 3}">{escape(str(run))}</text>')

    parts.append(svg_footer())
    return save_svg(output_dir / "metric_distribution_by_run.svg", parts)


def plot_distribution(
    df: pd.DataFrame,
    metric: str,
    output_dir: Path,
    kind: str,
) -> Path:
    data = df.dropna(subset=[metric]).copy()
    runs = sorted(data["run"].unique())

    fig_height = max(4.5, 3.4 * len(runs))
    fig, axes = plt.subplots(
        len(runs),
        1,
        figsize=(11, fig_height),
        dpi=140,
        sharex=True,
        squeeze=False,
    )

    for ax, run in zip(axes.flatten(), runs):
        subset = data[data["run"] == run]
        if sns is not None and kind == "violin":
            sns.violinplot(
                data=subset,
                x="generation",
                y=metric,
                inner="quartile",
                cut=0,
                color="#79a7d3",
                ax=ax,
            )
        elif sns is not None:
            sns.boxplot(
                data=subset,
                x="generation",
                y=metric,
                color="#79a7d3",
                showmeans=True,
                meanprops={
                    "marker": "D",
                    "markerfacecolor": "#d95f02",
                    "markeredgecolor": "#d95f02",
                    "markersize": 4,
                },
                ax=ax,
            )
        else:
            grouped = [
                group[metric].dropna().to_numpy()
                for _, group in subset.groupby("generation")
            ]
            labels = [str(gen) for gen in sorted(subset["generation"].unique())]
            if kind == "violin":
                ax.violinplot(grouped, showmeans=True, showmedians=True)
                ax.set_xticks(range(1, len(labels) + 1), labels)
            else:
                # Matplotlib API changed from labels -> tick_labels in newer versions.
                try:
                    ax.boxplot(grouped, tick_labels=labels, showmeans=True)
                except TypeError:
                    ax.boxplot(grouped, labels=labels, showmeans=True)

        ax.set_title(run)
        ax.set_xlabel("Generation")
        ax.set_ylabel(metric.upper())
        ax.grid(True, axis="y", alpha=0.25)

    fig.suptitle(f"{kind.title()} Plot - {metric.upper()}", y=1.0)
    fig.tight_layout()

    path = output_dir / f"{kind}_{metric}_by_generation.png"
    fig.savefig(path, bbox_inches="tight")
    plt.close(fig)
    return path


def plot_metric_comparison(df: pd.DataFrame, metrics: list[str], output_dir: Path) -> Path:
    value_vars = [metric for metric in metrics if metric in df.columns]
    long_df = df.melt(
        id_vars=["run", "generation", "source_file"],
        value_vars=value_vars,
        var_name="metric",
        value_name="score",
    ).dropna(subset=["score"])

    fig, ax = plt.subplots(figsize=(11, 6), dpi=140)
    if sns is not None:
        sns.boxplot(data=long_df, x="metric", y="score", hue="run", ax=ax)
    else:
        labels = []
        values = []
        for label, group in long_df.groupby(["metric", "run"]):
            labels.append("/".join(label))
            values.append(group["score"].to_numpy())
        # Matplotlib API changed from labels -> tick_labels in newer versions.
        try:
            ax.boxplot(values, tick_labels=labels)
        except TypeError:
            ax.boxplot(values, labels=labels)
        ax.tick_params(axis="x", rotation=30)

    ax.set_title("Metric Distribution by Run")
    ax.set_xlabel("Metric")
    ax.set_ylabel("Score")
    ax.grid(True, axis="y", alpha=0.25)
    handles, labels = ax.get_legend_handles_labels()
    if handles and labels:
        ax.legend(title="Run", bbox_to_anchor=(1.02, 1), loc="upper left", borderaxespad=0)
    fig.tight_layout()

    path = output_dir / "metric_distribution_by_run.png"
    fig.savefig(path, bbox_inches="tight")
    plt.close(fig)
    return path


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(
        description="Create convergence, boxplot, and violin plots from GA result Excel files."
    )
    parser.add_argument(
        "--input-dir",
        type=Path,
        default=Path("."),
        help="Directory containing GA result .xlsx files.",
    )
    parser.add_argument(
        "--input-files",
        type=Path,
        nargs="*",
        help="Specific workbook files to read. Defaults to all .xlsx files in --input-dir.",
    )
    parser.add_argument(
        "--output-dir",
        type=Path,
        default=Path("outputs") / "ga_visualizations",
        help="Directory where charts and CSV summaries are saved.",
    )
    parser.add_argument(
        "--metrics",
        nargs="+",
        default=["fitness", "ndcg", "map", "mrr"],
        help="Metric columns to visualize.",
    )
    return parser.parse_args()


def main() -> None:
    args = parse_args()
    configure_style()

    input_files = args.input_files
    if input_files:
        input_files = [path if path.is_absolute() else args.input_dir / path for path in input_files]
    else:
        input_files = discover_input_files(args.input_dir, DEFAULT_PATTERNS)

    args.output_dir.mkdir(parents=True, exist_ok=True)

    df = load_results(input_files)
    metrics = available_metrics(df, args.metrics)
    df.to_csv(args.output_dir / "ga_results_long.csv", index=False)

    created: list[Path] = []
    for metric in metrics:
        created.append(plot_convergence(df, metric, args.output_dir))
        created.append(plot_distribution(df, metric, args.output_dir, kind="boxplot"))
        created.append(plot_distribution(df, metric, args.output_dir, kind="violin"))

    if len(metrics) > 1:
        created.append(plot_metric_comparison(df, metrics, args.output_dir))

    print("Created files:")
    for path in created:
        print(f"- {path}")
    print(f"- {args.output_dir / 'ga_results_long.csv'}")


if __name__ == "__main__":
    main()
