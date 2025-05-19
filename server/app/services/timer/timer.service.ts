import { Timer } from '@app/interfaces/timer.interface';
import { Injectable } from '@nestjs/common';

@Injectable()
export class TimerService {
    private timers: Map<string, Timer> = new Map();

    /**
     * @brief Start a timer with a unique timerId
     * @param timerId Unique identifier for the timer
     * @param duration Duration of the timer in milliseconds
     * @param callback Function to call when the timer expires
     */
    startTimer(timerId: string, duration: number, callback: () => void): void {
        // Check if the timer already exists, and clear it
        this.clearTimer(timerId);

        // Create a new timeout
        const timeout = setTimeout(() => {
            callback();
        }, duration);

        // Store the timer details in the map
        this.timers.set(timerId, {
            timeout,
            duration,
            startTime: Date.now(),
        });
    }

    /**
     * @brief stops and resets the timer to 0
     * @param timerId
     */
    clearTimer(timerId: string): void {
        if (this.timers.has(timerId)) {
            this.stopTimer(timerId);
            this.timers.set(timerId, { timeout: null, duration: 0, startTime: 0 });
        }
    }

    /**
     * Stop the timer with the specified ID
     * @param timerId The ID of the timer to stop
     */
    stopTimer(timerId: string): void {
        if (this.timers.has(timerId)) {
            const timer = this.timers.get(timerId);
            clearTimeout(timer.timeout); // Clear the timeout
        }
    }

    /**
     * Get the remaining time of a running timer
     * @param timerId The ID of the timer
     * @returns The remaining time in milliseconds
     */
    getRemainingTime(timerId: string): number | null {
        if (this.timers.has(timerId)) {
            const timer = this.timers.get(timerId);
            const elapsedTime = Date.now() - timer.startTime;
            return Math.max(0, timer.duration - elapsedTime); // Prevent negative values
        }
        return null;
    }

    /**
     * Delete the timer from the map
     * @param timerId The ID of the timer to delete
     */
    deleteTimer(timerId: string): void {
        this.clearTimer(timerId);
        this.timers.delete(timerId);
    }
}
