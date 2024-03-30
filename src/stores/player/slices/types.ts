import { StateCreator } from "zustand";

import { AutoplayState } from "@/stores/player/slices/autoplay";
import { CastingSlice } from "@/stores/player/slices/casting";
import { DisplaySlice } from "@/stores/player/slices/display";
import { InterfaceSlice } from "@/stores/player/slices/interface";
import { PlayingSlice } from "@/stores/player/slices/playing";
import { ProgressSlice } from "@/stores/player/slices/progress";
import { SourceSlice } from "@/stores/player/slices/source";
import { ThumbnailSlice } from "@/stores/player/slices/thumbnails";

export type AllSlices = InterfaceSlice &
  PlayingSlice &
  ProgressSlice &
  SourceSlice &
  DisplaySlice &
  CastingSlice &
  ThumbnailSlice &
  AutoplayState;
export type MakeSlice<Slice> = StateCreator<
  AllSlices,
  [["zustand/immer", never]],
  [],
  Slice
>;
