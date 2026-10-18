import { useState, useEffect, useCallback, useRef } from 'react';
import { supabase, isSupabaseConfigured } from '../services/supabase';
import { getStorageItem, setStorageItem } from '../services/dbStorage';

const QUEUE_STORAGE_KEY = 'reminder_offline_mutations_queue';

export function useOfflineQueue({ onSyncSuccess }) {
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
      };
      const updated = [...queueRef.current, item];
      saveQueue(updated);
      return item;
    },
    [saveQueue]
  );

  // Process all queued mutations in sequence
  const processQueue = useCallback(async () => {
    if (isSyncingRef.current || !navigator.onLine || !isSupabaseConfigured() || !supabase) {
      return;
    }

    const queue = [...queueRef.current];
    if (queue.length === 0) return;

    isSyncingRef.current = true;
    const remaining = [];

    for (const item of queue) {
      try {
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
        remaining.push(item);
      }
    }

    saveQueue(remaining);
    isSyncingRef.current = false;

    if (remaining.length < queue.length && onSyncSuccess) {
      onSyncSuccess();
    }
  }, [saveQueue, onSyncSuccess]);

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
