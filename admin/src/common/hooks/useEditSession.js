import {useEffect, useRef, useState} from 'react';
import {Preferences} from '@capacitor/preferences';
import BackendHostURLState from '../stores/BackendHostURLState.js';
import useAuthentication from '../api/useAuthentication.js';

/**
 * Hook for managing WebSocket edit sessions for parallel edit detection
 */
export default function useEditSession(recordType, recordId, contentId = null) {
  const {backendHost} = BackendHostURLState();
  const {user} = useAuthentication();
  const [isConnected, setIsConnected] = useState(false);
  const [parallelEditWarning, setParallelEditWarning] = useState(null);
  const [isWebSocketSupported, setIsWebSocketSupported] = useState(true);
  const wsRef = useRef(null);
  const reconnectTimeoutRef = useRef(null);
  const reconnectAttemptsRef = useRef(0);
  const maxReconnectAttempts = 5;

  const connect = async () => {
    if (!recordType || !recordId || !user) return;

    try {
      // Get auth token
      const tokenResult = await Preferences.get({key: 'token'});
      if (!tokenResult?.value) return;

      // Create WebSocket URL
      const wsHost = backendHost
        .replace('http://', 'ws://')
        .replace('https://', 'wss://');
      const params = new URLSearchParams({
        record_type: recordType,
        record_id: recordId.toString(),
        token: tokenResult.value,
      });

      if (contentId) {
        params.append('content_id', contentId.toString());
      }

      const wsUrl = `${wsHost}/ws/edit-session?${params.toString()}`;

      // Create WebSocket connection
      const ws = new WebSocket(wsUrl);

      ws.onopen = () => {
        setIsConnected(true);
        reconnectAttemptsRef.current = 0;

        // Send heartbeat every 30 seconds
        const heartbeatInterval = setInterval(() => {
          if (ws.readyState === WebSocket.OPEN) {
            ws.send(JSON.stringify({type: 'heartbeat'}));
          } else {
            clearInterval(heartbeatInterval);
          }
        }, 30000);
      };

      ws.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data);

          if (data.type === 'parallel_edit_warning') {
            setParallelEditWarning({
              message: data.message,
              newEditor: data.new_editor,
              existingEditors: data.existing_editors,
              allOtherEditors: data.all_other_editors || data.existing_editors,
              isNewEditor: data.is_new_editor,
              isFirstUser: data.is_first_user,
              totalEditors:
                data.total_editors ||
                (data.existing_editors ? data.existing_editors.length + 1 : 2),
            });
          } else if (data.type === 'user_left') {
            if (data.clear_warning) {
              // No other editors remain, clear the warning completely
              setParallelEditWarning(null);
            }
          }
        } catch (error) {
          console.error('Error parsing WebSocket message:', error);
        }
      };

      ws.onclose = (event) => {
        setIsConnected(false);
        wsRef.current = null;

        // Attempt to reconnect if not a normal closure
        if (
          event.code !== 1000 &&
          reconnectAttemptsRef.current < maxReconnectAttempts
        ) {
          const delay = Math.min(
            1000 * Math.pow(2, reconnectAttemptsRef.current),
            30000
          );

          reconnectTimeoutRef.current = setTimeout(() => {
            reconnectAttemptsRef.current++;
            connect();
          }, delay);
        }
      };

      ws.onerror = (error) => {
        // If we get too many connection errors, disable WebSocket feature
        if (reconnectAttemptsRef.current >= maxReconnectAttempts) {
          setIsWebSocketSupported(false);
        }
      };

      wsRef.current = ws;
    } catch (error) {
      // Failed to create WebSocket connection
    }
  };

  const disconnect = async () => {
    if (reconnectTimeoutRef.current) {
      clearTimeout(reconnectTimeoutRef.current);
      reconnectTimeoutRef.current = null;
    }

    // Send explicit leave message before closing WebSocket
    if (wsRef.current && wsRef.current.readyState === WebSocket.OPEN) {
      try {
        // Send leave message to backend
        wsRef.current.send(
          JSON.stringify({
            type: 'leave_edit_session',
            record_type: recordType,
            record_id: recordId,
            content_id: contentId,
          })
        );

        // Give a moment for the message to be sent
        await new Promise((resolve) => setTimeout(resolve, 100));
      } catch (error) {
        // Failed to send leave message
      }

      // Check if WebSocket still exists after the timeout
      if (wsRef.current && wsRef.current.readyState === WebSocket.OPEN) {
        wsRef.current.close(1000, 'User disconnected');
      }
    }

    wsRef.current = null;
    setIsConnected(false);
    setParallelEditWarning(null);
  };

  const clearParallelEditWarning = () => {
    setParallelEditWarning(null);
  };

  // Connect on mount and when dependencies change
  useEffect(() => {
    if (isWebSocketSupported) {
      connect();
    }

    // Cleanup on unmount
    return () => {
      disconnect();
    };
  }, [
    recordType,
    recordId,
    contentId,
    backendHost,
    user,
    isWebSocketSupported,
  ]);

  // Handle page unload/tab close
  useEffect(() => {
    const handleBeforeUnload = () => {
      // Use sendBeacon for reliable message sending on page unload
      if (recordType && recordId && user) {
        try {
          navigator.sendBeacon(
            `${backendHost}/api/edit-session/leave`,
            JSON.stringify({
              record_type: recordType,
              record_id: recordId,
              content_id: contentId,
              user_id: user.id,
            })
          );
        } catch (error) {
          // Failed to send beacon
        }
      }
    };

    const handlePageHide = () => {
      // Also handle page visibility changes (mobile/tab switching)
      disconnect();
    };

    window.addEventListener('beforeunload', handleBeforeUnload);
    window.addEventListener('pagehide', handlePageHide);

    return () => {
      window.removeEventListener('beforeunload', handleBeforeUnload);
      window.removeEventListener('pagehide', handlePageHide);
    };
  }, [recordType, recordId, contentId, user, backendHost]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      disconnect();
    };
  }, []);

  return {
    isConnected,
    parallelEditWarning,
    clearParallelEditWarning,
    reconnect: connect,
    disconnect,
  };
}
