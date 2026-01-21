import {
  Box,
  Button,
  useTheme,
  Grid,
  makeStyles,
  Tooltip,
  Typography,
  useMediaQuery,
  IconButton,
} from "@material-ui/core";
import React, { useEffect, useMemo, useRef, useState } from "react";
import { VideocamOff, MicOff, Mic, Videocam } from "@material-ui/icons";
import useResponsiveSize from "../utils/useResponsiveSize";
import { red } from "@material-ui/core/colors";
import { MeetingDetailsScreen } from "./MeetingDetailsScreen";
import { createMeeting, validateMeeting } from "../api";
import { CheckCircleIcon } from "@heroicons/react/outline";
import SettingDialogueBox from "./SettingDialogueBox";
import ConfirmBox from "./ConfirmBox";
import { collectEvidence } from "../utils/collectEvidence";

const useStyles = makeStyles((theme) => ({
  video: {
    borderRadius: "10px",
    backgroundColor: "#1c1c1c",
    height: "100%",
    width: "100%",
    objectFit: "cover",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
  },
  toggleButton: {
    borderRadius: "100%",
    minWidth: "auto",
    width: "44px",
    height: "44px",
  },
  previewBox: {
    width: "100%",
    height: "45vh",
    position: "relative",
  },
}));

export function JoiningScreen({
  participantName,
  setParticipantName,
  setMeetingId,
  setToken,
  setSelectedMic,
  setSelectedWebcam,
  onClickStartMeeting,
  micEnabled,
  webcamEnabled,
  setWebcamOn,
  setMicOn,
}) {
  const theme = useTheme();
  const classes = useStyles();

  const [setting, setSetting] = useState("video");
  const [{ webcams, mics }, setDevices] = useState({
    devices: [],
    webcams: [],
    mics: [],
  });

  const [videoTrack, setVideoTrack] = useState(null);
  const [dlgMuted, setDlgMuted] = useState(false);
  const [dlgDevices, setDlgDevices] = useState(false);

  const videoPlayerRef = useRef();
  const popupVideoPlayerRef = useRef();
  const popupAudioPlayerRef = useRef();

  const videoTrackRef = useRef();
  const audioTrackRef = useRef();
  const audioAnalyserIntervalRef = useRef();

  const [settingDialogueOpen, setSettingDialogueOpen] = useState(false);
  const [audioTrack, setAudioTrack] = useState(null);

  // ✅ controle de evidência
  const [evidenceOk, setEvidenceOk] = useState(false);
  const [evidenceLoading, setEvidenceLoading] = useState(false);
  const [evidenceError, setEvidenceError] = useState("");

  const handleClickOpen = () => setSettingDialogueOpen(true);

  const isXStoSM = useMediaQuery(theme.breakpoints.between("xs", "sm"));
  const gtThenMD = useMediaQuery(theme.breakpoints.up("md"));
  const gtThenXL = useMediaQuery(theme.breakpoints.only("xl"));
  const isXSOnly = useMediaQuery(theme.breakpoints.only("xs"));
  const isSMOnly = useMediaQuery(theme.breakpoints.only("sm"));
  const isXLOnly = useMediaQuery(theme.breakpoints.only("xl"));

  const webcamOn = useMemo(() => !!videoTrack, [videoTrack]);
  const micOn = useMemo(() => !!audioTrack, [audioTrack]);

  // ✅ Token server-side
  async function fetchServerToken() {
    const r = await fetch("/api/videosdk/token");
    const out = await r.json().catch(() => ({}));
    if (!r.ok || !out?.token) {
      throw new Error(out?.error || "Não foi possível obter token do servidor.");
    }
    return out.token;
  }

  // ✅ Case start
  async function startCase({ meetingId, participantName, role, mode }) {
    const r = await fetch("/api/case/start", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ meetingId, participantName, role, mode }),
    });
    const out = await r.json().catch(() => ({}));
    if (!r.ok || !out?.caseId) {
      throw new Error(out?.error || "Falha ao iniciar CASE.");
    }
    return out.caseId;
  }

  // ✅ Send evidence
  async function sendEvidence({ caseId, evidence }) {
    const r = await fetch("/api/case/evidence", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ caseId, evidence }),
    });
    const out = await r.json().catch(() => ({}));
    if (!r.ok || !out?.ok) {
      throw new Error(out?.error || "Falha ao enviar evidência.");
    }
    return true;
  }

  // ✅ Orquestra evidências (não zera meeting!)
  async function ensureEvidence({ meetingId, role }) {
    setEvidenceError("");
    setEvidenceLoading(true);
    setEvidenceOk(false);

    try {
      const caseId = await startCase({
        meetingId,
        participantName,
        role,
        mode: role === "creator" ? "create" : "join",
      });

      const evidence = await collectEvidence(); // <-- aqui pode falhar se geo for negado (dependendo do seu collectEvidence)
      await sendEvidence({ caseId, evidence });

      setEvidenceOk(true);
      return true;
    } catch (e) {
      setEvidenceOk(false);
      setEvidenceError(String(e?.message || e));
      return false;
    } finally {
      setEvidenceLoading(false);
    }
  }

  const _handleTurnOffWebcam = () => {
    const vt = videoTrackRef.current;
    if (vt) {
      vt.stop();
      setVideoTrack(null);
      setWebcamOn(false);
    }
  };

  const _handleTurnOnWebcam = () => {
    const vt = videoTrackRef.current;
    if (!vt) {
      getDefaultMediaTracks({ mic: false, webcam: true });
      setWebcamOn(true);
    }
  };

  const _toggleWebcam = () => {
    const vt = videoTrackRef.current;
    if (vt) _handleTurnOffWebcam();
    else _handleTurnOnWebcam();
  };

  const _handleTurnOffMic = () => {
    const at = audioTrackRef.current;
    if (at) {
      at.stop();
      setAudioTrack(null);
      setMicOn(false);
    }
  };

  const _handleTurnOnMic = () => {
    const at = audioTrackRef.current;
    if (!at) {
      getDefaultMediaTracks({ mic: true, webcam: false });
      setMicOn(true);
    }
  };

  const _handleToggleMic = () => {
    const at = audioTrackRef.current;
    if (at) _handleTurnOffMic();
    else _handleTurnOnMic();
  };

  const changeWebcam = async (deviceId) => {
    const current = videoTrackRef.current;
    if (current) current.stop();

    const stream = await navigator.mediaDevices.getUserMedia({
      video: { deviceId },
    });
    const tracks = stream.getVideoTracks();
    setVideoTrack(tracks.length ? tracks[0] : null);
  };

  const changeMic = async (deviceId) => {
    const current = audioTrackRef.current;
    current && current.stop();

    const stream = await navigator.mediaDevices.getUserMedia({
      audio: { deviceId },
    });
    const tracks = stream.getAudioTracks();
    clearInterval(audioAnalyserIntervalRef.current);
    setAudioTrack(tracks.length ? tracks[0] : null);
  };

  const getDefaultMediaTracks = async ({ mic, webcam, firstTime }) => {
    if (mic) {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const tracks = stream.getAudioTracks();
      const at = tracks.length ? tracks[0] : null;

      setAudioTrack(at);
      if (firstTime) setSelectedMic({ id: at?.getSettings()?.deviceId });
    }

    if (webcam) {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { width: 1280, height: 720 },
      });
      const tracks = stream.getVideoTracks();
      const vt = tracks.length ? tracks[0] : null;

      setVideoTrack(vt);
      if (firstTime) setSelectedWebcam({ id: vt?.getSettings()?.deviceId });
    }
  };

  async function startMuteListener() {
    const current = audioTrackRef.current;
    if (current) {
      if (current.muted) setDlgMuted(true);
      current.addEventListener("mute", () => setDlgMuted(true));
    }
  }

  const getDevices = async ({ micEnabled, webcamEnabled }) => {
    try {
      const devices = await navigator.mediaDevices.enumerateDevices();
      const webcams = devices.filter((d) => d.kind === "videoinput");
      const mics = devices.filter((d) => d.kind === "audioinput");

      setDevices({ webcams, mics, devices });

      if (mics.length > 0) startMuteListener();

      getDefaultMediaTracks({
        mic: mics.length > 0 && micEnabled,
        webcam: webcams.length > 0 && webcamEnabled,
        firstTime: true,
      });
    } catch (err) {
      console.log(err);
    }
  };

  const internalPadding = useResponsiveSize({
    xl: 3,
    lg: 3,
    md: 2,
    sm: 2,
    xs: 1.5,
  });

  const spacingHorizontalTopics = useResponsiveSize({
    xl: 60,
    lg: 40,
    md: 40,
    sm: 40,
    xs: 32,
  });

  useEffect(() => {
    audioTrackRef.current = audioTrack;
    startMuteListener();
  }, [audioTrack]);

  useEffect(() => {
    videoTrackRef.current = videoTrack;

    if (videoTrack) {
      const src = new MediaStream([videoTrack]);
      if (videoPlayerRef.current) {
        videoPlayerRef.current.srcObject = src;
        videoPlayerRef.current.play();
      }
      setTimeout(() => {
        if (popupVideoPlayerRef.current) {
          popupVideoPlayerRef.current.srcObject = src;
          popupVideoPlayerRef.current.play();
        }
      }, 1000);
    } else {
      if (videoPlayerRef.current) videoPlayerRef.current.srcObject = null;
      if (popupVideoPlayerRef.current) popupVideoPlayerRef.current.srcObject = null;
    }
  }, [videoTrack, setting, settingDialogueOpen]);

  useEffect(() => {
    getDevices({ micEnabled, webcamEnabled });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <Box
      className="overflow-y-auto"
      style={{
        display: "flex",
        flex: 1,
        flexDirection: "column",
        height: "100vh",
        backgroundColor: "#050A0E",
      }}
    >
      <Box
        m={isXSOnly ? 8 : gtThenMD ? 9 : 0}
        style={{
          display: "flex",
          flex: 1,
          flexDirection: isXStoSM ? "column" : "row",
          justifyContent: "center",
          alignItems: "center",
        }}
      >
        <Grid
          container
          spacing={gtThenMD ? 0 : isXStoSM ? 0 : 9}
          style={{
            display: "flex",
            flex: isSMOnly ? 0 : 1,
            flexDirection: isXStoSM ? "column" : "row",
            alignItems: "center",
            justifyContent: "center",
          }}
        >
          <Grid item xs={12} md={gtThenXL ? 6 : 7} style={{ display: "flex", flex: 1 }}>
            <Box
              style={{
                width: isXSOnly ? "100%" : "100vw",
                display: "flex",
                flexDirection: "column",
                alignItems: "center",
                justifyContent: "center",
              }}
              p={internalPadding}
            >
              <Box
                style={{
                  paddingLeft:
                    spacingHorizontalTopics -
                    (gtThenMD ? theme.spacing(10) : theme.spacing(2)),
                  paddingRight:
                    spacingHorizontalTopics -
                    (gtThenMD ? theme.spacing(10) : theme.spacing(2)),
                  position: "relative",
                  width: "100%",
                }}
              >
                <Box className={classes.previewBox}>
                  <video
                    autoPlay
                    playsInline
                    muted
                    ref={videoPlayerRef}
                    controls={false}
                    className={classes.video + " flip"}
                  />

                  {!isXSOnly ? (
                    <Box
                      style={{
                        position: "absolute",
                        top: 0,
                        bottom: 0,
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        right: 0,
                        left: 0,
                      }}
                    >
                      {!webcamOn ? (
                        <Typography variant={isXLOnly ? "h4" : "h6"}>
                          The camera is off
                        </Typography>
                      ) : null}
                    </Box>
                  ) : null}

                  {settingDialogueOpen ? (
                    <SettingDialogueBox
                      open={settingDialogueOpen}
                      onClose={() => setSettingDialogueOpen(false)}
                      popupVideoPlayerRef={popupVideoPlayerRef}
                      popupAudioPlayerRef={popupAudioPlayerRef}
                      changeWebcam={changeWebcam}
                      changeMic={changeMic}
                      setting={setting}
                      setSetting={setSetting}
                      webcams={webcams}
                      mics={mics}
                      setSelectedMic={setSelectedMic}
                      setSelectedWebcam={setSelectedWebcam}
                      videoTrack={videoTrack}
                      audioTrack={audioTrack}
                    />
                  ) : null}

                  <Box position="absolute" bottom={theme.spacing(2)} left="0" right="0">
                    <Grid container alignItems="center" justify="center" spacing={2}>
                      <Grid item>
                        <Tooltip title={micOn ? "Turn off mic" : "Turn on mic"} arrow placement="top">
                          <Button
                            onClick={_handleToggleMic}
                            variant="contained"
                            style={micOn ? {} : { backgroundColor: red[500], color: "white" }}
                            className={classes.toggleButton}
                          >
                            {micOn ? <Mic /> : <MicOff />}
                          </Button>
                        </Tooltip>
                      </Grid>

                      <Grid item>
                        <Tooltip title={webcamOn ? "Turn off camera" : "Turn on camera"} arrow placement="top">
                          <Button
                            onClick={_toggleWebcam}
                            variant="contained"
                            style={webcamOn ? {} : { backgroundColor: red[500], color: "white" }}
                            className={classes.toggleButton}
                          >
                            {webcamOn ? <Videocam /> : <VideocamOff />}
                          </Button>
                        </Tooltip>
                      </Grid>
                    </Grid>
                  </Box>
                </Box>

                {!isXSOnly && (
                  <Box
                    className="absolute md:left-52 lg:left-24 xl:left-44 md:right-52 lg:right-24 xl:right-44 rounded cursor-pointer bg-gray-700"
                    m={2}
                    onClick={handleClickOpen}
                  >
                    <Box
                      style={{
                        display: "flex",
                        flexDirection: "row",
                        alignItems: "center",
                        justifyContent: "center",
                      }}
                      m={0.5}
                    >
                      <IconButton style={{ margin: 0, padding: 0 }}>
                        <CheckCircleIcon className="h-5 w-5" />
                      </IconButton>
                      <Typography variant="subtitle1" style={{ marginLeft: 4 }}>
                        Check your audio and video
                      </Typography>
                    </Box>
                  </Box>
                )}
              </Box>
            </Box>
          </Grid>

          <Grid
            item
            xs={12}
            md={isXStoSM ? 5 : gtThenXL ? 6 : 5}
            style={{
              width: "100%",
              display: "flex",
              flex: 1,
              height: "100%",
              alignItems: "center",
              justifyContent: "center",
            }}
          >
            <div className="w-full flex flex-1 flex-col items-center justify-center xl:m-16 lg:m-6 md:mx-44 md:mt-11 lg:mt-4">
              <MeetingDetailsScreen
                participantName={participantName}
                setParticipantName={setParticipantName}
                videoTrack={videoTrack}
                setVideoTrack={setVideoTrack}
                onClickStartMeeting={onClickStartMeeting}
                evidenceOk={evidenceOk}
                evidenceLoading={evidenceLoading}
                evidenceError={evidenceError}
                onClickJoin={async (id) => {
                  try {
                    setEvidenceOk(false);
                    setEvidenceError("");

                    const token = await fetchServerToken();
                    const valid = await validateMeeting({ roomId: id, token });
                    if (!valid) return alert("Invalid Meeting Id");

                    // ✅ mantém meetingId/token na tela antes de validar evidência
                    setToken(token);
                    setMeetingId(id);

                    const ok = await ensureEvidence({ meetingId: id, role: "joiner" });
                    if (!ok) return; // fica na tela e mostra evidenceError

                    if (videoTrack) {
                      videoTrack.stop();
                      setVideoTrack(null);
                    }

                    onClickStartMeeting();
                  } catch (e) {
                    alert(String(e?.message || e));
                  }
                }}
                onClickCreateMeeting={async () => {
                  try {
                    setEvidenceOk(false);
                    setEvidenceError("");

                    const token = await fetchServerToken();
                    const id = await createMeeting({ token });

                    // ✅ salva meetingId/token IMEDIATO (não depende da evidência)
                    setToken(token);
                    setMeetingId(id);

                    if (videoTrack) {
                      videoTrack.stop();
                      setVideoTrack(null);
                    }

                    const ok = await ensureEvidence({ meetingId: id, role: "creator" });
                    if (ok) {
                      onClickStartMeeting();
                    }

                    // ✅ sempre retorna id (mesmo se evidência falhar)
                    return id;
                  } catch (e) {
                    setEvidenceOk(false);
                    setEvidenceError(String(e?.message || e));
                    return "";
                  }
                }}
              />
            </div>
          </Grid>
        </Grid>

        <ConfirmBox
          open={dlgMuted}
          successText="OKAY"
          onSuccess={() => setDlgMuted(false)}
          title="System mic is muted"
          subTitle="You're default microphone is muted, please unmute it or increase audio
          input volume from system settings."
        />

        <ConfirmBox
          open={dlgDevices}
          successText="DISMISS"
          onSuccess={() => setDlgDevices(false)}
          title="Mic or webcam not available"
          subTitle="Please connect a mic and webcam to speak and share your video in the meeting. You can also join without them."
        />
      </Box>
    </Box>
  );
}
