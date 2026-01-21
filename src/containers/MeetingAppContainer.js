"use client";
import React, { useEffect, useRef, useState } from "react";
import { JoiningScreen } from "../components/JoiningScreen";
import { MeetingContainer } from "../components/MeetingContainer/MeetingContainer";
import { SnackbarProvider } from "notistack";
import { LeaveScreen } from "../components/LeaveScreen";
import { useMediaQuery, useTheme } from "@material-ui/core";
import { MeetingProvider } from "@videosdk.live/react-sdk";

function MeetingAppContainer() {
  const [token, setToken] = useState("");
  const [tokenLoading, setTokenLoading] = useState(false);
  const [tokenError, setTokenError] = useState("");

  const [meetingId, setMeetingId] = useState("");
  const [participantName, setParticipantName] = useState("");
  const [micOn, setMicOn] = useState(true);
  const [webcamOn, setWebcamOn] = useState(true);
  const [selectedMic, setSelectedMic] = useState({ id: null });
  const [selectedWebcam, setSelectedWebcam] = useState({ id: null });
  const [selectWebcamDeviceId, setSelectWebcamDeviceId] = useState(selectedWebcam.id);
  const [selectMicDeviceId, setSelectMicDeviceId] = useState(selectedMic.id);
  const [isMeetingStarted, setMeetingStarted] = useState(false);
  const [isMeetingLeft, setIsMeetingLeft] = useState(false);
  const [raisedHandsParticipants, setRaisedHandsParticipants] = useState([]);

  const useRaisedHandParticipants = () => {
    const raisedHandsParticipantsRef = useRef();

    const participantRaisedHand = (participantId) => {
      const raisedHandsParticipants = [...raisedHandsParticipantsRef.current];
      const newItem = { participantId, raisedHandOn: new Date().getTime() };

      const participantFound = raisedHandsParticipants.findIndex(
        ({ participantId: pID }) => pID === participantId
      );

      if (participantFound === -1) {
        raisedHandsParticipants.push(newItem);
      } else {
        raisedHandsParticipants[participantFound] = newItem;
      }

      setRaisedHandsParticipants(raisedHandsParticipants);
    };

    useEffect(() => {
      raisedHandsParticipantsRef.current = raisedHandsParticipants;
    }, [raisedHandsParticipants]);

    const _handleRemoveOld = () => {
      const raisedHandsParticipants = [...raisedHandsParticipantsRef.current];
      const now = new Date().getTime();

      const persisted = raisedHandsParticipants.filter(({ raisedHandOn }) => {
        return parseInt(raisedHandOn) + 15000 > parseInt(now);
      });

      if (raisedHandsParticipants.length !== persisted.length) {
        setRaisedHandsParticipants(persisted);
      }
    };

    useEffect(() => {
      const interval = setInterval(_handleRemoveOld, 1000);
      return () => clearInterval(interval);
    }, []);

    return { participantRaisedHand };
  };

  const theme = useTheme();
  const isXStoSM = useMediaQuery(theme.breakpoints.only("xs"));

  useEffect(() => {
    if (isXStoSM) {
      window.onbeforeunload = () => "Are you sure you want to exit?";
    }
  }, [isXStoSM]);

  // ✅ Busca token do servidor (VPS) e preenche no state
  async function fetchServerToken() {
    setTokenError("");
    setTokenLoading(true);

    try {
      const r = await fetch("/api/videosdk/token");
      const out = await r.json().catch(() => ({}));

      if (!r.ok || !out?.token) {
        throw new Error(out?.error || "Não foi possível obter token do servidor.");
      }

      setToken(out.token);
      return out.token;
    } catch (e) {
      setToken("");
      setTokenError(String(e?.message || e));
      return "";
    } finally {
      setTokenLoading(false);
    }
  }

  // Pega token ao carregar
  useEffect(() => {
    if (!token) fetchServerToken();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const canRenderMeetingProvider = !!token && !!meetingId;

  return (
    <>
      {isMeetingStarted ? (
        <SnackbarProvider
          anchorOrigin={{ vertical: "bottom", horizontal: "left" }}
          autoHideDuration={5000}
          maxSnack={3}
        >
          {/* ✅ Bloqueia se token OU meetingId estiverem vazios */}
          {!canRenderMeetingProvider ? (
            <div style={{ color: "white", padding: 16 }}>
              {!token ? (
                <div>{tokenLoading ? "Carregando token..." : "Token vazio."}</div>
              ) : null}

              {!meetingId ? (
                <div style={{ marginTop: 8, color: "#ff8080" }}>
                  Meeting ID vazio. Volte e crie/cole um Meeting ID antes de iniciar.
                </div>
              ) : null}

              {tokenError ? (
                <div style={{ marginTop: 8, color: "#ff8080" }}>{tokenError}</div>
              ) : null}

              <div style={{ display: "flex", gap: 8, marginTop: 12 }}>
                <button
                  style={{ padding: "8px 12px", cursor: "pointer" }}
                  onClick={() => fetchServerToken()}
                  disabled={tokenLoading}
                >
                  Recarregar token
                </button>

                <button
                  style={{ padding: "8px 12px", cursor: "pointer" }}
                  onClick={() => {
                    // volta para tela de entrada
                    setMeetingStarted(false);
                  }}
                >
                  Voltar
                </button>
              </div>
            </div>
          ) : (
            <MeetingProvider
              config={{
                meetingId,
                micEnabled: micOn,
                webcamEnabled: webcamOn,
                name: participantName ? participantName : "TestUser",
              }}
              token={token}
              reinitialiseMeetingOnConfigChange={true}
              joinWithoutUserInteraction={true}
            >
              <MeetingContainer
                onMeetingLeave={() => {
                  setToken("");
                  setMeetingId("");
                  setWebcamOn(false);
                  setMicOn(false);
                  setMeetingStarted(false);
                }}
                setIsMeetingLeft={setIsMeetingLeft}
                selectedMic={selectedMic}
                selectedWebcam={selectedWebcam}
                selectWebcamDeviceId={selectWebcamDeviceId}
                setSelectWebcamDeviceId={setSelectWebcamDeviceId}
                selectMicDeviceId={selectMicDeviceId}
                setSelectMicDeviceId={setSelectMicDeviceId}
                useRaisedHandParticipants={useRaisedHandParticipants}
                raisedHandsParticipants={raisedHandsParticipants}
                micEnabled={micOn}
                webcamEnabled={webcamOn}
              />
            </MeetingProvider>
          )}
        </SnackbarProvider>
      ) : isMeetingLeft ? (
        <LeaveScreen setIsMeetingLeft={setIsMeetingLeft} />
      ) : (
        <JoiningScreen
          participantName={participantName}
          setParticipantName={setParticipantName}
          setMeetingId={setMeetingId}
          setToken={setToken}
          setMicOn={setMicOn}
          micEnabled={micOn}
          webcamEnabled={webcamOn}
          setSelectedMic={setSelectedMic}
          setSelectedWebcam={setSelectedWebcam}
          setWebcamOn={setWebcamOn}
          onClickStartMeeting={async () => {
            // 1) precisa ter meetingId
            if (!meetingId) {
              setTokenError("Crie ou informe um Meeting ID antes de iniciar.");
              return;
            }

            // 2) garante token antes de iniciar
            if (!token) {
              const t = await fetchServerToken();
              if (!t) return;
            }

            setMeetingStarted(true);
          }}
          startMeeting={isMeetingStarted}
          setIsMeetingLeft={setIsMeetingLeft}
          tokenLoading={tokenLoading}
          tokenError={tokenError}
        />
      )}
    </>
  );
}

export default MeetingAppContainer;
