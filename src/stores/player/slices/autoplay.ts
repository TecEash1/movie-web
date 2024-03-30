import { MakeSlice } from "@/stores/player/slices/types";

export type AutoplayState = {
  autoplay: boolean;
  toggleAutoplay: () => void;
};

export const createAutoplaySlice: MakeSlice<AutoplayState> = (set) => ({
  autoplay: true,
  toggleAutoplay: () =>
    set((state) => {
      state.autoplay = !state.autoplay;
    }),
});
