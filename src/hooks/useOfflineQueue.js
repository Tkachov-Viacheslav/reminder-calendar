import { useState, useEffect, useCallback, useRef } from 'react';
import { supabase, isSupabaseConfigured } from '../services/supabase';
import { getStorageItem, setStorageItem } from '../services/dbStorage';
import { captureClientError } from '../services/sentry';

const QUEUE_STORAGE_KEY = 'reminder_offline_mutations_queue';
const MAX_MUTATION_RETRIES = 3;

export function useOfflineQueue({ activeUserId, hasSession, onSyncSuccess }) {
  const [isOnline, setIsOnline] = useState(() => navigator.onLine);
  const [pendingCount, setPendingCount] = useState(0);
  const queueRef = useRef([]);
  const isSyncingRef = useRef(false);

  // Initialize queue from IndexedDB / localStorage
  useEffect(() => {
    getStorageItem(QUEUE_STORAGE_KEY).then((data) => {
      const initial = Array.isArray(data) ? data : [];
      queueRef.current = initial;
      setPendingCount(initial.length);
    });
  }, []);

  const saveQueue = useCallback((queue) => {
    queueRef.current = queue;
    setPendingCount(queue.length);
    setStorageItem(QUEUE_STORAGE_KEY, queue);
  }, []);

  // Enqueue a mutation if network fails
  const enqueueMutation = useCallback(
    (action, payload) => {
      const item = {
        id: `mut-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
        action, // 'insert' | 'update' | 'delete'
        payload,
        createdAt: new Date().toISOString(),
        retryCount: 0,
      };
      const updated = [...queueRef.current, item];
      saveQueue(updated);
      return item;
    },
    [saveQueue]
  );

  // Process all queued mutations in sequence
  const processQueue = useCallback(async () => {
    if (
      isSyncingRef.current ||
      !navigator.onLine ||
      !isSupabaseConfigured() ||
      !supabase ||
      !hasSession
    ) {
      return;
    }

    const queue = [...queueRef.current];
    if (queue.length === 0) return;

    isSyncingRef.current = true;
    const remaining = [];

    for (const item of queue) {
      try {
        // Оновлюємо user_id до актуального авторизованого користувача
        if (activeUserId && item.payload?.user_id && item.payload.user_id !== activeUserId) {
          item.payload.user_id = activeUserId;
        }

        if (item.action === 'insert') {
          const { error } = await supabase.from('reminders').upsert([item.payload]);
          if (error) throw error;
        } else if (item.action === 'update') {
          const { id, updates } = item.payload;
          const { error } = await supabase.from('reminders').update(updates).eq('id', id);
          if (error) throw error;
        } else if (item.action === 'delete') {
          const { error } = await supabase.from('reminders').delete().eq('id', item.payload.id);
          if (error) throw error;
        }
      } catch (err) {
        console.warn('Failed to sync offline mutation, keeping in queue:', item, err);
        // Фіксуємо помилку у Sentry Issues
        captureClientError(err, { item, context: 'offline_queue_sync' });

        const retries = (item.retryCount || 0) + 1;
        // Якщо помилка перманентна (403 заборонено RLS) або перевищено ліміт спроб — видаляємо зі списку
        if (retries < MAX_MUTATION_RETRIES && err?.status !== 403 && err?.code !== '42501') {
          remaining.push({ ...item, retryCount: retries });
        }
      }
    }

    saveQueue(remaining);
    isSyncingRef.current = false;

    if (remaining.length < queue.length && onSyncSuccess) {
      onSyncSuccess();
    }
  }, [saveQueue, onSyncSuccess, hasSession, activeUserId]);

  // Network listeners
  useEffect(() => {
    const handleOnline = () => {
      setIsOnline(true);
      processQueue();
    };

    const handleOffline = () => {
      setIsOnline(false);
    };

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    // Initial check on mount if online
    if (navigator.onLine) {
      processQueue();
    }

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, [processQueue]);

  return {
    isOnline,
    pendingCount,
    enqueueMutation,
    processQueue,
  };
}
