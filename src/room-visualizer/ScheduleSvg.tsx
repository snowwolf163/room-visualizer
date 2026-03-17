import { format } from "date-fns";
import { WEEKDAY_LABELS } from "./utils";
import type { MouseEvent } from "react";
import type { SessionInstance } from "./types";

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
  showTooltipWithDelay: (
    e: MouseEvent<SVGGElement>,
    session: SessionInstance
  ) => void;
  hideTooltip: () => void;
  moveTooltip: (e: MouseEvent<SVGGElement>) => void;
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
  showTooltipWithDelay,
  hideTooltip,
  moveTooltip,
}: ScheduleSvgProps) {
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
			  fill="#111"
			>
			  {WEEKDAY_LABELS[d] || d}
			</text>
		  </g>
		);
	  })}

      {/* Hour grid lines and labels */}
      {hourTicks.map((h, idx) => {
        const y = headerH + gutter + (h - effectiveMin) * hourHeight;
        return (
          <g key={idx}>
            <text x={labelW - 8} y={y + 4} textAnchor="end" fontSize={11} fill="#555">
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
			  fill={i % 2 === 0 ? "#f3f4f6" : "#ffffff"}
			/>
			<line
			  x1={x}
			  y1={headerH + gutter}
			  x2={x}
			  y2={height - gutter}
			  stroke="#e5e7eb"
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
			  //compute a group width and center that group inside the day column
              const innerPadding = 6;
			  const availableWidth = colWidth - innerPadding * 2;
			  const laneWidth = availableWidth / lanes;
			  const groupWidth = laneWidth * lanes;
			  const groupStartX = x + (colWidth - groupWidth) / 2;
			  const bx = groupStartX + lane * laneWidth;
			  
			  //compute the block center
			  const blockWidth = laneWidth - 6;
			  const textCenterX = bx + blockWidth / 2;
			  
			  //vertical text layout
			  const blockY = y1 + 2;
			  const blockHeight = Math.max(14, h - 4);
			  const textBlockCenterY = blockY + blockHeight / 2;
			  const courseTextY = textBlockCenterY - 4;
			  const timeTextY = textBlockCenterY + 10;
			  
			  const showTwoLines = blockHeight >= 36;
			  const showOneLine = blockHeight >= 20;

              return (
                <g
                  key={idx}
                  onMouseEnter={(e) => showTooltipWithDelay(e, s)}
                  onMouseLeave={hideTooltip}
                  onMouseMove={moveTooltip}
                >
                  <rect
					x={bx}
					y={blockY}
					rx={8}
					ry={8}
					width={blockWidth}
					height={blockHeight}
					fill={colorByInstructor.get(s.instructor) || "#94a3b8"}
					opacity={0.85}
				  />

				  {showTwoLines ? (
					<>
					  <text
						x={textCenterX}
						y={courseTextY}
						textAnchor="middle"
						fontSize={11}
						fill="#111"
						style={{ pointerEvents: "none" }}
					  >
						{s.baseCourse}
					  </text>
					  <text
						x={textCenterX}
						y={timeTextY}
						textAnchor="middle"
						fontSize={10}
						fill="#111"
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
					  fill="#111"
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
      <text x={labelW / 2} y={16} textAnchor="middle" fontSize={12} fill="#6b7280">
        Time
      </text>
      <text x={width - 60} y={16} textAnchor="end" fontSize={12} fill="#6b7280">
        Dates
      </text>
    </svg>
  );
}