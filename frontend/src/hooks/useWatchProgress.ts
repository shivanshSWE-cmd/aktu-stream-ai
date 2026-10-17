"use client";

import { useEffect, useRef, useState, useCallback } from "react";
import { apiClient } from "@/lib/api-client";
import { UserProgress } from "@/types";

const SESSION_STORAGE_KEY = "aktu_stream_session_id";

function getOrCreateSessionId(): string {
  if (typeof window === "undefined") return "ssr-session";
  let sessionId = localStorage.getItem(SESSION_STORAGE_KEY);
  if (!sessionId) {
    sessionId = "sess_" + Math.random().toString(36).substring(2, 11) + "_" + Date.now();
    localStorage.setItem(SESSION_STORAGE_KEY, sessionId);
  }
  return sessionId;
}

export function useWatchProgress(videoId: string) {
  const [sessionId, setSessionId] = useState<string>("");
  const [initialPosition, setInitialPosition] = useState<number>(0);
  const [isCompleted, setIsCompleted] = useState<boolean>(false);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const lastSavedPositionRef = useRef<number>(0);
  const saveTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    const sid = getOrCreateSessionId();
    setSessionId(sid);

    async function loadProgress() {
      try {
        setIsLoading(true);
        const progressList = await apiClient.getUserProgress(sid);
        const match = progressList.find((p) => p.video_id === videoId);
        if (match) {
          setInitialPosition(match.last_position_seconds);
          lastSavedPositionRef.current = match.last_position_seconds;
          setIsCompleted(match.is_completed);
        }
      } catch (err) {
        // Silently fail or fallback to local storage
        console.debug("Could not load remote progress, starting from beginning:", err);
      } finally {
        setIsLoading(false);
      }
    }

    if (videoId) {
      loadProgress();
    }
  }, [videoId]);

  // Debounced progress saver
  const updateProgress = useCallback(
    (currentTime: number, duration?: number) => {
      if (!sessionId || !videoId) return;

      const completed = duration ? currentTime >= duration * 0.9 : false;
      if (completed && !isCompleted) {
        setIsCompleted(true);
      }

      // Avoid spamming if position hasn't changed significantly (less than 4 seconds)
      if (Math.abs(currentTime - lastSavedPositionRef.current) < 4 && !completed) {
        return;
      }

      if (saveTimeoutRef.current) {
        clearTimeout(saveTimeoutRef.current);
      }

      saveTimeoutRef.current = setTimeout(async () => {
        try {
          lastSavedPositionRef.current = currentTime;
          await apiClient.saveProgress(videoId, sessionId, Math.floor(currentTime), completed);
        } catch (err) {
          console.debug("Failed to sync progress:", err);
        }
      }, 2000);
    },
    [sessionId, videoId, isCompleted]
  );

  const markCompleted = useCallback(async () => {
    if (!sessionId || !videoId) return;
    setIsCompleted(true);
    try {
      await apiClient.saveProgress(videoId, sessionId, Math.floor(lastSavedPositionRef.current), true);
    } catch (err) {
      console.debug("Failed to mark completed:", err);
    }
  }, [sessionId, videoId]);

  return {
    sessionId,
    initialPosition,
    isCompleted,
    isLoading,
    updateProgress,
    markCompleted,
  };
}
