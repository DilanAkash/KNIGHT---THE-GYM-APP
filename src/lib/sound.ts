import { createAudioPlayer, setAudioModeAsync, type AudioPlayer } from 'expo-audio';

let enabled = true;
let restOver: AudioPlayer | null = null;
let tick: AudioPlayer | null = null;
let configured = false;

export function setSoundEnabled(value: boolean): void {
  enabled = value;
}

/**
 * Players are created once and rewound rather than recreated per play — a
 * fresh player has a load delay that would put the chime a beat behind the
 * timer hitting zero.
 */
async function ensurePlayers(): Promise<void> {
  if (configured) return;
  configured = true;

  try {
    await setAudioModeAsync({
      playsInSilentMode: false,
      // Ducks the user's music for the chime instead of stopping it. Nobody
      // wants their playlist killed between sets.
      interruptionMode: 'duckOthers',
      shouldPlayInBackground: false,
    });
    restOver = createAudioPlayer(require('../../assets/sounds/rest-over.wav'));
    tick = createAudioPlayer(require('../../assets/sounds/tick.wav'));
  } catch {
    // Audio is a nicety. If the device refuses, haptics still fire.
    restOver = null;
    tick = null;
  }
}

function play(player: AudioPlayer | null): void {
  if (!enabled || !player) return;
  try {
    player.seekTo(0);
    player.play();
  } catch {
    // Ignore — a failed chime must never interrupt a set.
  }
}

export const sounds = {
  prepare: () => {
    void ensurePlayers();
  },
  restOver: () => {
    void ensurePlayers().then(() => play(restOver));
  },
  tick: () => {
    void ensurePlayers().then(() => play(tick));
  },
};
