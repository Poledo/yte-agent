/**
 * Manages sound notifications.
 * Uses Web Audio API to generate simple beep sounds.
 */
export class SoundManager {
    private audioContext: AudioContext | null = null
    private isMuted: boolean = false
    private lastPlayTime: number = 0
    private readonly throttleDuration = 500 // Prevent rapid sounds

    constructor() {
        try {
            const AudioContextClass =
                (window as unknown as Record<string, unknown>).AudioContext ||
                (window as unknown as Record<string, unknown>).webkitAudioContext
            if (AudioContextClass) {
                this.audioContext = new (AudioContextClass as typeof AudioContext)()
            }
        } catch {
            console.warn('[SoundManager] AudioContext not available')
        }
    }

    /**
     * Play warning sound
     */
    playWarning(): void {
        this.playTone(1000, 0.3) // 1000Hz, 0.3s
    }

    /**
     * Play error sound
     */
    playError(): void {
        this.playTone(600, 0.4) // 600Hz, 0.4s
    }

    /**
     * Play success sound
     */
    playSuccess(): void {
        this.playTone(1200, 0.2) // 1200Hz, 0.2s
    }

    /**
     * Mute all sounds
     */
    mute(): void {
        this.isMuted = true
        console.log('[SoundManager] Muted')
    }

    /**
     * Unmute sounds
     */
    unmute(): void {
        this.isMuted = false
        console.log('[SoundManager] Unmuted')
    }

    /**
     * Play a tone with given frequency and duration
     */
    private playTone(frequency: number, duration: number): void {
        if (this.isMuted || !this.audioContext) {
            return
        }

        // Throttle to prevent rapid sounds
        const now = Date.now()
        if (now - this.lastPlayTime < this.throttleDuration) {
            return
        }
        this.lastPlayTime = now

        try {
            const oscillator = this.audioContext.createOscillator()
            const gainNode = this.audioContext.createGain()

            oscillator.connect(gainNode)
            gainNode.connect(this.audioContext.destination)

            oscillator.frequency.value = frequency
            oscillator.type = 'sine'

            // Fade out
            gainNode.gain.setValueAtTime(0.3, this.audioContext.currentTime)
            gainNode.gain.exponentialRampToValueAtTime(0.01, this.audioContext.currentTime + duration)

            oscillator.start(this.audioContext.currentTime)
            oscillator.stop(this.audioContext.currentTime + duration)

            console.log(`[SoundManager] Played tone: ${frequency}Hz`)
        } catch (error) {
            console.warn('[SoundManager] Failed to play tone:', error)
        }
    }
}
