import { useCallback } from 'react';

// A simple hook to play audio files from the /public/sounds directory
export const useSound = (soundFile) => {
    const play = useCallback(() => {
        const audio = new Audio(`/sounds/${soundFile}`);
        audio.play().catch(e => console.error("Sound play failed:", e));
    }, [soundFile]);

    return play;
};
