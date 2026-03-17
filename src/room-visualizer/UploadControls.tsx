import { Download, Upload } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Slider } from "@/components/ui/slider";

type UploadControlsProps = {
  fileRef: React.RefObject<HTMLInputElement | null>;
  onFileChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
  onUploadClick: () => void;
  onDownloadPng: () => void;
  sessionsLength: number;
  room: string;
  rooms: string[];
  setRoom: (value: string) => void;
  minHour: number;
  maxHour: number;
  setMinHour: (value: number) => void;
  setMaxHour: (value: number) => void;
  autoMinHour: number;
  autoMaxHour: number;
};

export default function UploadControls({
  fileRef,
  onFileChange,
  onUploadClick,
  onDownloadPng,
  sessionsLength,
  room,
  rooms,
  setRoom,
  minHour,
  maxHour,
  setMinHour,
  setMaxHour,
  autoMinHour,
  autoMaxHour,
}: UploadControlsProps) {
  return (
    <Card>
      <CardContent className="p-4 flex flex-col gap-3">
        <div className="flex flex-wrap items-center gap-3">
          <Input
            type="file"
            accept=".xlsx"
            ref={fileRef}
            onChange={onFileChange}
            className="max-w-sm"
          />

          <Button variant="secondary" size="sm" onClick={onUploadClick} className="gap-2">
            <Upload className="w-4 h-4" /> Upload .xlsx
          </Button>

          <a
            href={`${import.meta.env.BASE_URL}sample-room-visualizer.xlsx`}
            download
            className="inline-flex items-center rounded-md border px-3 py-2 text-sm hover:bg-muted"
          >
            <Download className="w-4 h-4 mr-2" />
            Download Sample File
          </a>

          <div className="ml-auto flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={onDownloadPng}
              disabled={!sessionsLength}
              className="gap-2"
            >
              <Download className="w-4 h-4" /> Export PNG
            </Button>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-4">
          <div className="w-64">
            <label className="text-sm text-muted-foreground">Room</label>
            <Select value={room} onValueChange={setRoom}>
              <SelectTrigger>
                <SelectValue placeholder={rooms.length ? "Select a room" : "Upload a file first"} />
              </SelectTrigger>
              <SelectContent>
                {rooms.map((r) => (
                  <SelectItem key={r} value={r}>
                    {r}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="flex items-center gap-3">
            <div className="w-48">
              <label className="text-sm text-muted-foreground">Visible time: start (hour)</label>
              <Slider
                min={0}
                max={23}
                step={1}
                value={[minHour]}
                onValueChange={(v) => setMinHour(v[0])}
              />
              <div className="text-xs">Auto min: {autoMinHour}:00</div>
            </div>

            <div className="w-48">
              <label className="text-sm text-muted-foreground">Visible time: end (hour)</label>
              <Slider
                min={1}
                max={24}
                step={1}
                value={[maxHour]}
                onValueChange={(v) => setMaxHour(v[0])}
              />
              <div className="text-xs">Auto max: {autoMaxHour}:00</div>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}