import React, { useCallback, useEffect, useRef, useState } from 'react';

export interface RtcSignalMessage {
  type: 'rtc:offer' | 'rtc:answer' | 'rtc:ice' | 'rtc:mediaMeta';
  fromUserId: string;
  roomId?: string;
  sdp?: RTCSessionDescriptionInit;
  candidate?: RTCIceCandidateInit;
  cameraStreamId?: string | null;
  screenStreamId?: string | null;
}

interface PeerConnectionEntry {
  pc: RTCPeerConnection;
  polite: boolean;
  makingOffer: boolean;
  ignoreOffer: boolean;
  isSettingRemoteAnswerPending: boolean;
  pendingIce: RTCIceCandidateInit[];
  audioSender: RTCRtpSender | null;
  cameraSender: RTCRtpSender | null;
  screenSenders: RTCRtpSender[];
  remoteVideoStreams: Map<string, MediaStream>;
  remoteCameraStreamId: string | null;
  remoteScreenStreamId: string | null;
}

const RTC_CONFIG: RTCConfiguration = {
  iceServers: [
    { urls: 'stun:stun.l.google.com:19302' },
    { urls: 'stun:stun1.l.google.com:19302' },
    { urls: 'stun:stun2.l.google.com:19302' },
  ],
};

interface UseVoiceRtcOptions {
  currentUserId: string;
  roomId: string | null;
  peerUserIds: string[];
  localMicStream: MediaStream | null;
  localCameraStream: MediaStream | null;
  localScreenStream: MediaStream | null;
  isMuted: boolean;
  isDeafened: boolean;
  canSpeak: boolean;
  sendWs: (type: string, payload: Record<string, unknown>) => void;
}

export function useVoiceRtc({
  currentUserId,
  roomId,
  peerUserIds,
  localMicStream,
  localCameraStream,
  localScreenStream,
  isMuted,
  isDeafened,
  canSpeak,
  sendWs,
}: UseVoiceRtcOptions) {
  const [remoteAudioStreams, setRemoteAudioStreams] = useState<Record<string, MediaStream>>({});
  const [remoteCameraStreams, setRemoteCameraStreams] = useState<Record<string, MediaStream>>({});
  const [remoteScreenStreams, setRemoteScreenStreams] = useState<Record<string, MediaStream>>({});
  const [peerConnectionStates, setPeerConnectionStates] = useState<
    Record<string, RTCPeerConnectionState>
  >({});
  const [remoteSpeakingIds, setRemoteSpeakingIds] = useState<string[]>([]);
  const [audioPlayBlocked, setAudioPlayBlocked] = useState(false);

  const peersRef = useRef<Map<string, PeerConnectionEntry>>(new Map());
  const localMicRef = useRef<MediaStream | null>(localMicStream);
  const localCameraRef = useRef<MediaStream | null>(localCameraStream);
  const localScreenRef = useRef<MediaStream | null>(localScreenStream);
  const roomIdRef = useRef<string | null>(roomId);
  const sendWsRef = useRef(sendWs);
  const currentUserIdRef = useRef(currentUserId);
  const audioElsRef = useRef<Map<string, HTMLAudioElement>>(new Map());

  localMicRef.current = localMicStream;
  localCameraRef.current = localCameraStream;
  localScreenRef.current = localScreenStream;
  roomIdRef.current = roomId;
  sendWsRef.current = sendWs;
  currentUserIdRef.current = currentUserId;

  // Enforce local mic track enabled state according to mute / deafen / speak permission
  useEffect(() => {
    if (!localMicStream) return;
    const allowTransmit = !isMuted && !isDeafened && canSpeak;
    for (const track of localMicStream.getAudioTracks()) {
      track.enabled = allowTransmit;
    }
  }, [localMicStream, isMuted, isDeafened, canSpeak]);

  // Enforce deafen on all remote audio elements
  useEffect(() => {
    for (const audioEl of audioElsRef.current.values()) {
      audioEl.muted = isDeafened;
      audioEl.volume = isDeafened ? 0 : 1;
    }
  }, [isDeafened, remoteAudioStreams]);

  const syncPeerVideoClassification = useCallback((peerId: string, entry: PeerConnectionEntry) => {
    let cameraStream: MediaStream | undefined;
    let screenStream: MediaStream | undefined;

    for (const [sid, stream] of entry.remoteVideoStreams.entries()) {
      const hasLiveVideo = stream.getVideoTracks().some((tr) => tr.readyState === 'live');
      if (!hasLiveVideo) continue;
      if (entry.remoteScreenStreamId && sid === entry.remoteScreenStreamId) {
        screenStream = stream;
      } else if (entry.remoteCameraStreamId && sid === entry.remoteCameraStreamId) {
        cameraStream = stream;
      } else if (!entry.remoteCameraStreamId && !entry.remoteScreenStreamId) {
        // Fallback when metadata hasn't arrived yet
        if (!cameraStream) cameraStream = stream;
        else screenStream = stream;
      } else if (entry.remoteScreenStreamId && !entry.remoteCameraStreamId) {
        screenStream = stream;
      } else {
        cameraStream = stream;
      }
    }

    setRemoteCameraStreams((prev) => {
      if (cameraStream) {
        if (prev[peerId] === cameraStream) return prev;
        return { ...prev, [peerId]: cameraStream };
      }
      if (!(peerId in prev)) return prev;
      const next = { ...prev };
      delete next[peerId];
      return next;
    });

    setRemoteScreenStreams((prev) => {
      if (screenStream) {
        if (prev[peerId] === screenStream) return prev;
        return { ...prev, [peerId]: screenStream };
      }
      if (!(peerId in prev)) return prev;
      const next = { ...prev };
      delete next[peerId];
      return next;
    });
  }, []);

  const cleanupPeer = useCallback((peerId: string) => {
    const entry = peersRef.current.get(peerId);
    if (entry) {
      try {
        entry.pc.onicecandidate = null;
        entry.pc.onnegotiationneeded = null;
        entry.pc.ontrack = null;
        entry.pc.onconnectionstatechange = null;
        entry.pc.close();
      } catch {
        // Ignore close error
      }
      peersRef.current.delete(peerId);
    }
    setRemoteAudioStreams((prev) => {
      if (!(peerId in prev)) return prev;
      const next = { ...prev };
      delete next[peerId];
      return next;
    });
    setRemoteCameraStreams((prev) => {
      if (!(peerId in prev)) return prev;
      const next = { ...prev };
      delete next[peerId];
      return next;
    });
    setRemoteScreenStreams((prev) => {
      if (!(peerId in prev)) return prev;
      const next = { ...prev };
      delete next[peerId];
      return next;
    });
    setPeerConnectionStates((prev) => {
      if (!(peerId in prev)) return prev;
      const next = { ...prev };
      delete next[peerId];
      return next;
    });
  }, []);

  const createPeerEntry = useCallback(
    (peerId: string, activeRoomId: string): PeerConnectionEntry => {
      const existing = peersRef.current.get(peerId);
      if (existing) return existing;

      const pc = new RTCPeerConnection(RTC_CONFIG);
      const polite = currentUserIdRef.current > peerId;

      const entry: PeerConnectionEntry = {
        pc,
        polite,
        makingOffer: false,
        ignoreOffer: false,
        isSettingRemoteAnswerPending: false,
        pendingIce: [],
        audioSender: null,
        cameraSender: null,
        screenSenders: [],
        remoteVideoStreams: new Map(),
        remoteCameraStreamId: null,
        remoteScreenStreamId: null,
      };
      peersRef.current.set(peerId, entry);

      // Attach microphone track or reserve a sendrecv audio transceiver so audio always negotiates
      const micTrack = localMicRef.current?.getAudioTracks()[0] || null;
      if (micTrack && localMicRef.current) {
        entry.audioSender = pc.addTrack(micTrack, localMicRef.current);
      } else {
        const transceiver = pc.addTransceiver('audio', { direction: 'sendrecv' });
        entry.audioSender = transceiver.sender;
      }

      // Attach camera track if enabled
      const camTrack = localCameraRef.current?.getVideoTracks()[0] || null;
      if (camTrack && localCameraRef.current) {
        entry.cameraSender = pc.addTrack(camTrack, localCameraRef.current);
      }

      // Attach screen share if active
      if (localScreenRef.current) {
        for (const tr of localScreenRef.current.getTracks()) {
          const sender = pc.addTrack(tr, localScreenRef.current);
          entry.screenSenders.push(sender);
        }
      }

      // Share stream IDs so peer accurately separates camera vs screen video
      sendWsRef.current('rtc:mediaMeta', {
        toUserId: peerId,
        roomId: activeRoomId,
        cameraStreamId: localCameraRef.current?.id || null,
        screenStreamId: localScreenRef.current?.id || null,
      });

      pc.onicecandidate = ({ candidate }) => {
        if (!candidate) return;
        sendWsRef.current('rtc:ice', {
          toUserId: peerId,
          roomId: activeRoomId,
          candidate: candidate.toJSON(),
        });
      };

      pc.onconnectionstatechange = () => {
        setPeerConnectionStates((prev) => ({
          ...prev,
          [peerId]: pc.connectionState,
        }));
      };

      pc.onnegotiationneeded = async () => {
        try {
          entry.makingOffer = true;
          await pc.setLocalDescription();
          if (pc.localDescription) {
            sendWsRef.current('rtc:offer', {
              toUserId: peerId,
              roomId: activeRoomId,
              sdp: pc.localDescription.toJSON(),
            });
          }
        } catch {
          // Ignore negotiation transient error
        } finally {
          entry.makingOffer = false;
        }
      };

      pc.ontrack = (event) => {
        const track = event.track;
        const incomingStream =
          event.streams && event.streams[0]
            ? event.streams[0]
            : new MediaStream([track]);

        if (track.kind === 'audio') {
          const audioStream = new MediaStream(
            incomingStream.getAudioTracks().length > 0
              ? incomingStream.getAudioTracks()
              : [track]
          );
          setRemoteAudioStreams((prev) => ({ ...prev, [peerId]: audioStream }));
          track.onended = () => {
            setRemoteAudioStreams((prev) => {
              const cur = prev[peerId];
              if (!cur) return prev;
              const next = { ...prev };
              delete next[peerId];
              return next;
            });
          };
        } else if (track.kind === 'video') {
          entry.remoteVideoStreams.set(incomingStream.id, incomingStream);
          syncPeerVideoClassification(peerId, entry);
          const clearVideo = () => {
            entry.remoteVideoStreams.delete(incomingStream.id);
            syncPeerVideoClassification(peerId, entry);
          };
          track.onended = clearVideo;
          track.onmute = clearVideo;
          track.onunmute = () => {
            entry.remoteVideoStreams.set(incomingStream.id, incomingStream);
            syncPeerVideoClassification(peerId, entry);
          };
        }
      };

      return entry;
    },
    [syncPeerVideoClassification]
  );

  // Sync peer connections whenever roomId or peerUserIds change
  useEffect(() => {
    if (!roomId || !currentUserId) {
      for (const id of Array.from(peersRef.current.keys())) {
        cleanupPeer(id);
      }
      return;
    }

    const desiredSet = new Set(peerUserIds.filter((id) => id && id !== currentUserId));

    for (const existingPeerId of Array.from(peersRef.current.keys())) {
      if (!desiredSet.has(existingPeerId)) {
        cleanupPeer(existingPeerId);
      }
    }

    for (const targetId of desiredSet) {
      if (!peersRef.current.has(targetId)) {
        createPeerEntry(targetId, roomId);
      }
    }
  }, [roomId, peerUserIds, currentUserId, cleanupPeer, createPeerEntry]);

  // Cleanup everything when roomId becomes null or unmount
  useEffect(() => {
    return () => {
      for (const id of Array.from(peersRef.current.keys())) {
        cleanupPeer(id);
      }
    };
  }, [cleanupPeer]);

  // Attach / replace microphone track dynamically on all active peers without recreating connections
  useEffect(() => {
    const micTrack = localMicStream?.getAudioTracks()[0] || null;
    for (const entry of peersRef.current.values()) {
      if (entry.audioSender) {
        entry.audioSender.replaceTrack(micTrack).catch(() => {});
      } else if (micTrack && localMicStream) {
        entry.audioSender = entry.pc.addTrack(micTrack, localMicStream);
      }
    }
  }, [localMicStream]);

  // Attach / remove camera track cleanly on all active peers
  useEffect(() => {
    const camTrack = localCameraStream?.getVideoTracks()[0] || null;
    for (const [peerId, entry] of peersRef.current.entries()) {
      if (entry.cameraSender) {
        if (!camTrack) {
          try {
            entry.pc.removeTrack(entry.cameraSender);
          } catch {
            // Ignore remove error
          }
          entry.cameraSender = null;
        } else {
          entry.cameraSender.replaceTrack(camTrack).catch(() => {});
        }
      } else if (camTrack && localCameraStream) {
        try {
          entry.cameraSender = entry.pc.addTrack(camTrack, localCameraStream);
        } catch {
          // Ignore addTrack error
        }
      }
      if (roomIdRef.current) {
        sendWsRef.current('rtc:mediaMeta', {
          toUserId: peerId,
          roomId: roomIdRef.current,
          cameraStreamId: localCameraStream?.id || null,
          screenStreamId: localScreenRef.current?.id || null,
        });
      }
    }
  }, [localCameraStream]);

  // Attach / remove screen share tracks on all active peers
  useEffect(() => {
    for (const [peerId, entry] of peersRef.current.entries()) {
      for (const sender of entry.screenSenders) {
        try {
          entry.pc.removeTrack(sender);
        } catch {
          // Ignore remove error
        }
      }
      entry.screenSenders = [];
      if (localScreenStream) {
        for (const tr of localScreenStream.getTracks()) {
          try {
            const sender = entry.pc.addTrack(tr, localScreenStream);
            entry.screenSenders.push(sender);
          } catch {
            // Ignore addTrack error
          }
        }
      }
      if (roomIdRef.current) {
        sendWsRef.current('rtc:mediaMeta', {
          toUserId: peerId,
          roomId: roomIdRef.current,
          cameraStreamId: localCameraRef.current?.id || null,
          screenStreamId: localScreenStream?.id || null,
        });
      }
    }
  }, [localScreenStream]);

  // Monitor remote audio streams with Web Audio AnalyserNode for live speaking rings
  useEffect(() => {
    const entries = Object.entries(remoteAudioStreams);
    if (entries.length === 0) {
      setRemoteSpeakingIds([]);
      return;
    }

    const AudioCtx =
      window.AudioContext ||
      (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
    if (!AudioCtx) return;

    let ctx: AudioContext | null = null;
    try {
      ctx = new AudioCtx();
    } catch {
      return;
    }

    const analysers: Array<{
      peerId: string;
      analyser: AnalyserNode;
      data: Uint8Array<ArrayBuffer>;
    }> = [];

    for (const [peerId, stream] of entries) {
      try {
        if (stream.getAudioTracks().length === 0) continue;
        const src = ctx.createMediaStreamSource(stream);
        const analyser = ctx.createAnalyser();
        analyser.fftSize = 128;
        src.connect(analyser);
        analysers.push({
          peerId,
          analyser,
          data: new Uint8Array(new ArrayBuffer(analyser.frequencyBinCount)),
        });
      } catch {
        // Ignore stream source failures
      }
    }

    let rafId = 0;
    const poll = () => {
      const speaking: string[] = [];
      for (const item of analysers) {
        item.analyser.getByteFrequencyData(item.data);
        let sum = 0;
        for (let i = 0; i < item.data.length; i++) sum += item.data[i];
        const avg = sum / (item.data.length || 1);
        if (avg > 12) speaking.push(item.peerId);
      }
      setRemoteSpeakingIds((prev) => {
        if (
          prev.length === speaking.length &&
          prev.every((v, idx) => v === speaking[idx])
        ) {
          return prev;
        }
        return speaking;
      });
      rafId = requestAnimationFrame(poll);
    };
    rafId = requestAnimationFrame(poll);

    return () => {
      cancelAnimationFrame(rafId);
      ctx?.close().catch(() => {});
    };
  }, [remoteAudioStreams]);

  // Handle incoming WebRTC signaling from WebSocket
  const handleRtcSignal = useCallback(
    async (msg: RtcSignalMessage) => {
      const activeRoom = roomIdRef.current;
      if (!activeRoom || !msg.fromUserId) return;
      if (msg.roomId && msg.roomId !== activeRoom) return;

      const entry =
        peersRef.current.get(msg.fromUserId) || createPeerEntry(msg.fromUserId, activeRoom);
      const { pc } = entry;

      if (msg.type === 'rtc:mediaMeta') {
        entry.remoteCameraStreamId = msg.cameraStreamId ?? null;
        entry.remoteScreenStreamId = msg.screenStreamId ?? null;
        syncPeerVideoClassification(msg.fromUserId, entry);
        return;
      }

      try {
        if (msg.type === 'rtc:ice' && msg.candidate) {
          if (pc.remoteDescription && pc.remoteDescription.type) {
            try {
              await pc.addIceCandidate(msg.candidate);
            } catch {
              // Ignore invalid late ICE
            }
          } else {
            entry.pendingIce.push(msg.candidate);
          }
          return;
        }

        if ((msg.type === 'rtc:offer' || msg.type === 'rtc:answer') && msg.sdp) {
          const description = msg.sdp;
          const isOffer = description.type === 'offer';
          const readyForOffer =
            !entry.makingOffer &&
            (pc.signalingState === 'stable' || entry.isSettingRemoteAnswerPending);
          const offerCollision = isOffer && !readyForOffer;

          entry.ignoreOffer = !entry.polite && offerCollision;
          if (entry.ignoreOffer) return;

          entry.isSettingRemoteAnswerPending = description.type === 'answer';
          await pc.setRemoteDescription(description);
          entry.isSettingRemoteAnswerPending = false;

          while (entry.pendingIce.length > 0) {
            const ice = entry.pendingIce.shift();
            if (ice) {
              try {
                await pc.addIceCandidate(ice);
              } catch {
                // Ignore
              }
            }
          }

          if (isOffer) {
            await pc.setLocalDescription();
            if (pc.localDescription) {
              sendWsRef.current('rtc:answer', {
                toUserId: msg.fromUserId,
                roomId: activeRoom,
                sdp: pc.localDescription.toJSON(),
              });
            }
          }
        }
      } catch {
        // Recover from signaling glitch gracefully
      }
    },
    [createPeerEntry, syncPeerVideoClassification]
  );

  const registerAudioElement = useCallback(
    (peerId: string, el: HTMLAudioElement | null) => {
      if (!el) {
        audioElsRef.current.delete(peerId);
        return;
      }
      audioElsRef.current.set(peerId, el);
      const stream = remoteAudioStreams[peerId];
      if (stream && el.srcObject !== stream) {
        el.srcObject = stream;
      }
      el.muted = isDeafened;
      el.volume = isDeafened ? 0 : 1;
      el.play()
        .then(() => {
          setAudioPlayBlocked(false);
        })
        .catch(() => {
          setAudioPlayBlocked(true);
        });
    },
    [remoteAudioStreams, isDeafened]
  );

  const unlockRemoteAudio = useCallback(() => {
    let anyFailed = false;
    for (const el of audioElsRef.current.values()) {
      el.muted = isDeafened;
      el.volume = isDeafened ? 0 : 1;
      el.play().catch(() => {
        anyFailed = true;
      });
    }
    if (!anyFailed) {
      setAudioPlayBlocked(false);
    }
  }, [isDeafened]);

  return {
    remoteAudioStreams,
    remoteCameraStreams,
    remoteScreenStreams,
    peerConnectionStates,
    remoteSpeakingIds,
    audioPlayBlocked,
    handleRtcSignal,
    registerAudioElement,
    unlockRemoteAudio,
  };
}

export const RemoteAudioMount: React.FC<{
  remoteAudioStreams: Record<string, MediaStream>;
  isDeafened: boolean;
  registerAudioElement: (peerId: string, el: HTMLAudioElement | null) => void;
}> = ({ remoteAudioStreams, isDeafened, registerAudioElement }) => {
  return React.createElement(
    'div',
    { className: 'sr-only', 'aria-hidden': 'true' },
    Object.entries(remoteAudioStreams).map(([peerId, stream]) =>
      React.createElement(RemoteAudioTag, {
        key: peerId,
        peerId,
        stream,
        isDeafened,
        registerAudioElement,
      })
    )
  );
};

const RemoteAudioTag: React.FC<{
  peerId: string;
  stream: MediaStream;
  isDeafened: boolean;
  registerAudioElement: (peerId: string, el: HTMLAudioElement | null) => void;
}> = ({ peerId, stream, isDeafened, registerAudioElement }) => {
  const ref = useRef<HTMLAudioElement>(null);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    if (el.srcObject !== stream) {
      el.srcObject = stream;
    }
    registerAudioElement(peerId, el);
    return () => {
      registerAudioElement(peerId, null);
    };
  }, [peerId, stream, registerAudioElement]);

  return React.createElement('audio', {
    ref,
    autoPlay: true,
    playsInline: true,
    muted: isDeafened,
  });
};
