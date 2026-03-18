import { format } from "date-fns";
import type { MouseEvent } from "react";
import type { SessionInstance } from "./types";
import { WEEKDAY_LABELS, getContrastTextColor, getSessionHoverGroupKey } from "./utils";

type PlacedSession = SessionInstance & {
  lane: number;
  lanes: number;
};

type ScheduleSvgProps = {
  width: number;
  height: number;
  dateColumns: string[];
  hourTicks: number[];
  effectiveMin: number;
  hourHeight: number;
  headerH: number;
  gutter: number;
  labelW: number;
  colWidth: number;
  lanesByDate: Map<string, PlacedSession[]>;
  yFor: (date: Date) => number;
  colorByInstructor: Map<string, string>;
  theme: "light" | "dark";
  hoveredGroupKey: string | null;
  setHoveredGroupKey: (value: string | null) => void;
  toggleTooltip: (
    e: MouseEvent<SVGGElement>,
    session: SessionInstance
  ) => void;
  hideTooltip: () => void;
};

export default function ScheduleSvg({
  width,
  height,
  dateColumns,
  hourTicks,
  effectiveMin,
  hourHeight,
  headerH,
  gutter,
  labelW,
  colWidth,
  lanesByDate,
  yFor,
  colorByInstructor,
  theme,
  hoveredGroupKey,
  setHoveredGroupKey,
  toggleTooltip,
  hideTooltip,
}: ScheduleSvgProps) {
  const svgTheme =
    theme === "dark"
      ? {
          headerText: "#f8fafc",
          axisText: "#cbd5e1",
          mutedText: "#94a3b8",
          colEven: "#1f2937",
          colOdd: "#111827",
          divider: "#334155",
        }
      : {
          headerText: "#111111",
          axisText: "#555555",
          mutedText: "#6b7280",
          colEven: "#f3f4f6",
          colOdd: "#ffffff",
          divider: "#e5e7eb",
        };

  return (
    <svg id="schedule-svg" width={width} height={height} className="block min-w-full">
      {/* Column headers */}
      {dateColumns.map((d, i) => {
        const x = labelW + gutter + i * (colWidth + gutter);
        return (
          <g key={d}>
            <text
              x={x + colWidth / 2}
              y={20}
              textAnchor="middle"
              fontSize={12}
              fontWeight={600}
              fill={svgTheme.headerText}
            >
              {WEEKDAY_LABELS[d] || d}
            </text>
          </g>
        );
      })}

      {/* Hour labels */}
      {hourTicks.map((h, idx) => {
        const y = headerH + gutter + (h - effectiveMin) * hourHeight;
        return (
          <g key={idx}>
            <text
              x={labelW - 8}
              y={y + 4}
              textAnchor="end"
              fontSize={11}
              fill={svgTheme.axisText}
            >
              {format(new Date(2020, 0, 1, h, 0), "h a")}
            </text>
          </g>
        );
      })}

      {/* Column backgrounds and vertical dividers */}
      {dateColumns.map((d, i) => {
        const x = labelW + gutter + i * (colWidth + gutter);
        const bgWidth = i === dateColumns.length - 1 ? colWidth : colWidth + gutter;

        return (
          <g key={`v-${d}`}>
            <rect
              x={x}
              y={headerH + gutter}
              width={bgWidth}
              height={height - headerH - gutter * 2}
              fill={i % 2 === 0 ? svgTheme.colEven : svgTheme.colOdd}
            />
            <line
              x1={x}
              y1={headerH + gutter}
              x2={x}
              y2={height - gutter}
              stroke={svgTheme.divider}
            />
          </g>
        );
      })}

      {/* Session blocks */}
      {dateColumns.map((d, i) => {
        const x = labelW + gutter + i * (colWidth + gutter);
        const list = lanesByDate.get(d) ?? [];

        return (
          <g key={`blocks-${d}`}>
            {list.map((s, idx) => {
              const y1 = yFor(s.start);
              const y2 = yFor(s.end);
              const h = y2 - y1;
              const lanes = s.lanes;
              const lane = s.lane;

              const innerPadding = 6;
              const availableWidth = colWidth - innerPadding * 2;
              const laneWidth = availableWidth / lanes;
              const groupWidth = laneWidth * lanes;
              const groupStartX = x + (colWidth - groupWidth) / 2;
              const bx = groupStartX + lane * laneWidth;

              const blockWidth = laneWidth - 6;
              const textCenterX = bx + blockWidth / 2;

              const blockY = y1 + 2;
              const blockHeight = Math.max(14, h - 4);
              const textBlockCenterY = blockY + blockHeight / 2;
              const courseTextY = textBlockCenterY - 4;
              const timeTextY = textBlockCenterY + 10;

              const showTwoLines = blockHeight >= 36;
              const showOneLine = blockHeight >= 20;

              const blockFill = colorByInstructor.get(s.instructor) || "#94a3b8";
              const blockTextColor = getContrastTextColor(blockFill);
			  
			  const groupKey = getSessionHoverGroupKey(s);
			  const isHighlighted = hoveredGroupKey === null || hoveredGroupKey === groupKey;
			  const isDirectHover = hoveredGroupKey === groupKey;

			  const blockOpacity = hoveredGroupKey === null ? 0.85 : isHighlighted ? 1 : 0.18;
			  const strokeColor =
			    hoveredGroupKey !== null && isDirectHover
				  ? theme === "dark"
			  	    ? "#f8fafc"
			  	    : "#111111"
			  	  : theme === "dark"
					? "#ffffff22"
					: "#00000018";
			  const strokeWidth = hoveredGroupKey !== null && isDirectHover ? 2 : 1;

              return (
                <g
                  key={idx}
                  onMouseEnter={(e) => {
					setHoveredGroupKey(groupKey);
				  }}
				  onMouseLeave={() => {
					setHoveredGroupKey(null);
				  }}
				  onClick={(e) => {
					e.stopPropagation();
					toggleTooltip(e, s);
				  }}
                >
                  <rect
                    x={bx}
                    y={blockY}
                    rx={8}
                    ry={8}
                    width={blockWidth}
                    height={blockHeight}
                    fill={blockFill}
                    opacity={0.85}
					stroke={strokeColor}
					strokeWidth={strokeWidth}
                  />

                  {showTwoLines ? (
                    <>
                      <text
                        x={textCenterX}
                        y={courseTextY}
                        textAnchor="middle"
                        fontSize={11}
                        fill={blockTextColor}
						opacity={hoveredGroupKey === null ? 1 : isHighlighted ? 1 : 0.45}
                        style={{ pointerEvents: "none" }}
                      >
                        {s.baseCourse}
                      </text>
                      <text
                        x={textCenterX}
                        y={timeTextY}
                        textAnchor="middle"
                        fontSize={10}
                        fill={blockTextColor}
						opacity={hoveredGroupKey === null ? 1 : isHighlighted ? 1 : 0.45}
                        style={{ pointerEvents: "none" }}
                      >
                        {format(s.start, "h:mm a")}–{format(s.end, "h:mm a")}
                      </text>
                    </>
                  ) : showOneLine ? (
                    <text
                      x={textCenterX}
                      y={textBlockCenterY + 4}
                      textAnchor="middle"
                      fontSize={10}
                      fill={blockTextColor}
					  opacity={hoveredGroupKey === null ? 1 : isHighlighted ? 1 : 0.45}
                      style={{ pointerEvents: "none" }}
                    >
                      {s.baseCourse}
                    </text>
                  ) : null}
                </g>
              );
            })}
          </g>
        );
      })}

      {/* Axis titles */}
      <text
        x={labelW / 2}
        y={16}
        textAnchor="middle"
        fontSize={12}
        fill={svgTheme.mutedText}
      >
        Time
      </text>
      <text
        x={width - 60}
        y={16}
        textAnchor="end"
        fontSize={12}
        fill={svgTheme.mutedText}
      >
        Days
      </text>
    </svg>
  );
}