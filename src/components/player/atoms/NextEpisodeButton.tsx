import classNames from "classnames";
import React, { useCallback, useEffect } from "react";
import { useTranslation } from "react-i18next";

import { Icon, Icons } from "@/components/Icon";
import { usePlayerMeta } from "@/components/player/hooks/usePlayerMeta";
import { Transition } from "@/components/utils/Transition";
import { PlayerMeta } from "@/stores/player/slices/source";
import { usePlayerStore } from "@/stores/player/store";

function shouldShowNextEpisodeButton(
  time: number,
  duration: number,
): "always" | "hover" | "none" {
  const secondsFromEnd = duration - time;
  if (secondsFromEnd <= 5) return "always"; // Show the buttons when the video has 5 seconds or less remaining
  if (secondsFromEnd <= 30) return "always";
  if (time / duration >= 0.9) return "hover";
  return "none";
}

function Button(props: {
  className: string;
  onClick?: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      className={classNames(
        "font-bold rounded h-10 w-40 scale-95 hover:scale-100 transition-all duration-200",
        props.className,
      )}
      type="button"
      onClick={props.onClick}
    >
      {props.children}
    </button>
  );
}

export function NextEpisodeButton(props: {
  controlsShowing: boolean;
  onChange?: (meta: PlayerMeta) => void;
}) {
  const { t } = useTranslation();
  const duration = usePlayerStore((s) => s.progress.duration);
  const isHidden = usePlayerStore((s) => s.interface.hideNextEpisodeBtn);
  const meta = usePlayerStore((s) => s.meta);
  const { setDirectMeta } = usePlayerMeta();
  const metaType = usePlayerStore((s) => s.meta?.type);
  const time = usePlayerStore((s) => s.progress.time);
  const showingState = shouldShowNextEpisodeButton(time, duration);
  const status = usePlayerStore((s) => s.status);
  const setShouldStartFromBeginning = usePlayerStore(
    (s) => s.setShouldStartFromBeginning,
  );
  const [autoplayCountdown, setAutoplayCountdown] = React.useState<
    number | null
  >(null);
  const autoplay = usePlayerStore((s) => s.autoplay);
  const [isAutoplayCancelled, setIsAutoplayCancelled] = React.useState(false);

  const toggleAutoplay = useCallback(() => {
    if (autoplayCountdown !== null) {
      // Don't do anything if the countdown is happening
      return;
    }
    if (isAutoplayCancelled) {
      setIsAutoplayCancelled(false);
      setAutoplayCountdown(5); // Restart the countdown when the cancel button is clicked
    } else {
      usePlayerStore.getState().toggleAutoplay();
    }
  }, [isAutoplayCancelled, autoplayCountdown]);

  const hideNextEpisodeButton = useCallback(() => {
    if (duration - time <= 2) {
      setIsAutoplayCancelled((prevIsAutoplayCancelled) => {
        const newIsAutoplayCancelled = !prevIsAutoplayCancelled;
        if (newIsAutoplayCancelled) {
          setAutoplayCountdown(null); // Stop the countdown when the cancel button is clicked
        } else {
          setAutoplayCountdown(5); // Restart the countdown when the cancel button is clicked
        }
        return newIsAutoplayCancelled;
      });
    } else {
      usePlayerStore.getState().hideNextEpisodeButton(); // Hide the buttons if the video has more than 5 seconds remaining
    }
  }, [duration, time]);

  useEffect(() => {
    if (duration - time <= 2 && !isAutoplayCancelled && autoplay) {
      usePlayerStore.getState().showNextEpisodeButton(); // Show the buttons when there are 5 seconds remaining
    }
  }, [time, duration, isAutoplayCancelled, autoplay]);

  let show = false;
  if (showingState === "always") show = true;
  else if (showingState === "hover" && props.controlsShowing) show = true;
  if (isHidden || status !== "playing" || duration === 0) show = false;

  const animation = showingState === "hover" ? "slide-up" : "fade";
  let bottom = "bottom-[calc(6rem+env(safe-area-inset-bottom))]";
  if (showingState === "always")
    bottom = props.controlsShowing
      ? bottom
      : "bottom-[calc(3rem+env(safe-area-inset-bottom))]";

  const nextEp = meta?.episodes?.find(
    (v) => v.number === (meta?.episode?.number ?? 0) + 1,
  );

  const loadNextEpisode = useCallback(() => {
    if (!meta || !nextEp) return;
    const metaCopy = { ...meta };
    metaCopy.episode = nextEp;
    setShouldStartFromBeginning(true);
    setDirectMeta(metaCopy);
    props.onChange?.(metaCopy);
  }, [setDirectMeta, nextEp, meta, props, setShouldStartFromBeginning]);

  useEffect(() => {
    const hasVideoEnded = time >= duration - 2; // Consider a buffer of 2 seconds
    if (
      hasVideoEnded &&
      showingState === "always" &&
      !isHidden &&
      status === "playing" &&
      duration !== 0 &&
      autoplay // Check if autoplay is enabled
    ) {
      setIsAutoplayCancelled(false); // Reset the isAutoplayCancelled state when the video has 5 seconds or less remaining
      setAutoplayCountdown(5); // Set the countdown duration (in seconds)
    } else if (time < duration - 2) {
      setIsAutoplayCancelled(false); // Reset the isAutoplayCancelled state if the user rewinds the video to before the last 5 seconds
      setAutoplayCountdown(null); // Reset the countdown if the user rewinds the video
    }
  }, [time, duration, showingState, isHidden, status, autoplay]);

  useEffect(() => {
    let countdownInterval: NodeJS.Timeout | null = null;

    if (autoplayCountdown !== null) {
      countdownInterval = setInterval(() => {
        setAutoplayCountdown((prevCountdown) => {
          if (prevCountdown === null) {
            clearInterval(countdownInterval!);
            return null;
          }
          if (prevCountdown === 1) {
            loadNextEpisode();
            return null;
          }
          return prevCountdown - 1;
        });
      }, 1000);
    }

    return () => {
      if (countdownInterval !== null) {
        clearInterval(countdownInterval);
      }
    };
  }, [autoplayCountdown, loadNextEpisode]);

  if (!meta?.episode || !nextEp) return null;
  if (metaType !== "show") return null;

  return (
    <Transition
      animation={animation}
      show={show}
      className="absolute right-[calc(3rem+env(safe-area-inset-right))] bottom-0"
    >
      <div
        className={classNames([
          "absolute bottom-0 right-0 transition-[bottom] duration-200 flex items-center space-x-3",
          bottom,
        ])}
      >
        {!isAutoplayCancelled && (
          <Button
            onClick={hideNextEpisodeButton}
            className="py-px box-content bg-buttons-secondary hover:bg-buttons-secondaryHover bg-opacity-90 text-buttons-secondaryText"
          >
            Cancel
          </Button>
        )}
        <Button
          onClick={toggleAutoplay}
          className="py-px box-content bg-buttons-secondary hover:bg-buttons-secondaryHover bg-opacity-90 text-buttons-secondaryText"
        >
          {autoplayCountdown !== null
            ? `Playing in ${autoplayCountdown} sec`
            : autoplay && !isAutoplayCancelled
              ? "Autoplay On"
              : "Autoplay Off"}
        </Button>
        <Button
          onClick={() => loadNextEpisode()}
          className="bg-buttons-primary hover:bg-buttons-primaryHover text-buttons-primaryText flex justify-center items-center"
        >
          <Icon className="text-xl mr-1" icon={Icons.SKIP_EPISODE} />
          {t("player.nextEpisode.next")}
        </Button>
      </div>
    </Transition>
  );
}
